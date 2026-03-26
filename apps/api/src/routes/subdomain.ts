import { Router, Request, Response } from 'express';
import { prisma } from '@pawser/database';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { ErrorCodes } from '@pawser/shared';
import { invalidateTenantCache } from '../middleware/tenant';

const router = Router();

/**
 * Subdomain validation rules:
 * - Lowercase only
 * - Alphanumeric + hyphens
 * - 3-63 characters
 * - No leading/trailing hyphens
 * - No consecutive hyphens
 */
const SUBDOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/;
const RESERVED_SUBDOMAINS = [
  'www', 'api', 'admin', 'app', 'portal', 'dashboard',
  'help', 'support', 'docs', 'status', 'blog', 'mail',
  'cdn', 'static', 'assets', 'images', 'media', 'files',
  'test', 'dev', 'staging', 'demo', 'sandbox',
  'auth', 'login', 'logout', 'register', 'signup', 'signin',
  'account', 'billing', 'settings', 'profile',
  'pawser', 'shelter', 'shelterluv', 'adopt', 'rescue',
];

/**
 * Validate subdomain format
 */
function validateSubdomain(slug: string): { valid: boolean; error?: string } {
  if (!slug) {
    return { valid: false, error: 'Subdomain is required' };
  }

  const normalized = slug.toLowerCase().trim();

  if (normalized.length < 3) {
    return { valid: false, error: 'Subdomain must be at least 3 characters' };
  }

  if (normalized.length > 63) {
    return { valid: false, error: 'Subdomain must be 63 characters or less' };
  }

  if (!SUBDOMAIN_REGEX.test(normalized)) {
    return { 
      valid: false, 
      error: 'Subdomain must be lowercase, alphanumeric, and may contain hyphens (not at start/end)' 
    };
  }

  if (normalized.includes('--')) {
    return { valid: false, error: 'Subdomain cannot contain consecutive hyphens' };
  }

  if (RESERVED_SUBDOMAINS.includes(normalized)) {
    return { valid: false, error: 'This subdomain is reserved and not available' };
  }

  return { valid: true };
}

/**
 * GET /v1/subdomain/check
 * Check subdomain availability and validate format
 * 
 * Query params:
 * - slug: The subdomain to check
 * - excludeOrgId: (optional) Exclude this org from the check (for updates)
 */
router.get('/check', async (req: Request, res: Response) => {
  try {
    const { slug, excludeOrgId } = req.query;

    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'slug query parameter is required',
        },
      });
    }

    const normalized = slug.toLowerCase().trim();

    // Validate format
    const validation = validateSubdomain(normalized);
    if (!validation.valid) {
      return res.status(200).json({
        success: true,
        data: {
          slug: normalized,
          available: false,
          reason: validation.error,
          valid: false,
        },
      });
    }

    // Check if slug is already taken
    const existing = await prisma.organization.findUnique({
      where: { slug: normalized },
      select: { id: true },
    });

    const isAvailable = !existing || (excludeOrgId && existing.id === excludeOrgId);

    return res.status(200).json({
      success: true,
      data: {
        slug: normalized,
        available: isAvailable,
        reason: isAvailable ? null : 'Subdomain is already in use',
        valid: true,
        suggestion: isAvailable ? null : await generateSuggestion(normalized),
      },
    });
  } catch (error) {
    console.error('Error checking subdomain:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to check subdomain availability',
      },
    });
  }
});

/**
 * PATCH /v1/organizations/:id/subdomain
 * Update organization subdomain
 * 
 * Body:
 * - slug: New subdomain
 */
router.patch(
  '/organizations/:id/subdomain',
  authenticate,
  requireRole('owner', 'admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { slug } = req.body;

      if (!slug || typeof slug !== 'string') {
        return res.status(400).json({
          success: false,
          error: {
            code: ErrorCodes.VALIDATION_ERROR,
            message: 'slug is required in request body',
          },
        });
      }

      const normalized = slug.toLowerCase().trim();

      // Validate format
      const validation = validateSubdomain(normalized);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: {
            code: ErrorCodes.VALIDATION_ERROR,
            message: validation.error,
          },
        });
      }

      // Verify the organization exists and user has access
      const org = await prisma.organization.findUnique({
        where: { id },
        select: { id: true, slug: true },
      });

      if (!org) {
        return res.status(404).json({
          success: false,
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: 'Organization not found',
          },
        });
      }

      // Check authorization: user must be owner/admin of this org
      if (!req.user?.isSuperAdmin) {
        const membership = await prisma.membership.findUnique({
          where: {
            orgId_userId: {
              orgId: id,
              userId: req.user?.id || '',
            },
          },
        });

        if (!membership || !['owner', 'admin'].includes(membership.role)) {
          return res.status(403).json({
            success: false,
            error: {
              code: ErrorCodes.FORBIDDEN,
              message: 'You do not have permission to update this organization',
            },
          });
        }
      }

      // Check if the new slug is already taken (by another org)
      if (normalized !== org.slug) {
        const existing = await prisma.organization.findUnique({
          where: { slug: normalized },
          select: { id: true },
        });

        if (existing && existing.id !== id) {
          return res.status(409).json({
            success: false,
            error: {
              code: ErrorCodes.CONFLICT,
              message: 'This subdomain is already in use',
            },
          });
        }
      }

      // Store old slug for cache invalidation
      const oldSlug = org.slug;

      // Update the subdomain
      const updated = await prisma.organization.update({
        where: { id },
        data: { slug: normalized },
        select: {
          id: true,
          slug: true,
          name: true,
          updatedAt: true,
        },
      });

      // Invalidate old and new tenant caches
      await invalidateTenantCache(oldSlug);
      if (oldSlug !== normalized) {
        await invalidateTenantCache(normalized);
      }

      // Create audit log entry
      try {
        await prisma.auditLog.create({
          data: {
            orgId: id,
            userId: req.user?.id || null,
            action: 'subdomain_changed',
            resourceType: 'organization',
            resourceId: id,
            oldValue: { slug: oldSlug },
            newValue: { slug: normalized },
          },
        });
      } catch (auditError) {
        console.error('Failed to create audit log:', auditError);
        // Don't fail the request if audit logging fails
      }

      return res.status(200).json({
        success: true,
        data: {
          id: updated.id,
          slug: updated.slug,
          name: updated.name,
          portalUrl: `https://${updated.slug}.pawser.app`,
          updatedAt: updated.updatedAt,
        },
      });
    } catch (error) {
      console.error('Error updating subdomain:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update subdomain',
        },
      });
    }
  }
);

/**
 * Generate a subdomain suggestion based on the requested one
 */
async function generateSuggestion(baseSlug: string): Promise<string | null> {
  // Try adding numbers
  for (let i = 1; i <= 99; i++) {
    const suggestion = `${baseSlug}${i}`;
    if (suggestion.length <= 63) {
      const existing = await prisma.organization.findUnique({
        where: { slug: suggestion },
        select: { id: true },
      });
      if (!existing && !RESERVED_SUBDOMAINS.includes(suggestion)) {
        return suggestion;
      }
    }
  }
  return null;
}

export default router;
