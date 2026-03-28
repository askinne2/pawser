import { Router, Response } from 'express';
import { prisma } from '@pawser/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router({ mergeParams: true }); // Get :orgId from parent router

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/organizations/:orgId/settings
 * Get organization settings (including branding)
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { orgId } = req.params;

    // Check access
    if (!req.user?.isSuperAdmin) {
      const membership = await prisma.membership.findUnique({
        where: {
          orgId_userId: {
            orgId,
            userId: req.user!.id,
          },
        },
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this organization',
          },
        });
      }
    }

    // Get organization with settings
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        settingsV2: true,
        domainMappings: {
          orderBy: { isPrimary: 'desc' },
        },
      },
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Organization not found',
        },
      });
    }

    // Return organization details with settings
    res.json({
      success: true,
      data: {
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          status: organization.status,
          timezone: organization.timezone,
          logoUrl: organization.logoUrl,
          primaryColor: organization.primaryColor,
          createdAt: organization.createdAt,
        },
        settings: organization.settingsV2 || {
          // Default settings if none exist
          contactEmail: null,
          phone: null,
          address: null,
          timezone: 'America/New_York',
          locale: 'en-US',
          websiteUrl: null,
          facebookUrl: null,
          instagramUrl: null,
          twitterUrl: null,
          logoUrl: null,
          faviconUrl: null,
          primaryColor: '#3B82F6',
          secondaryColor: '#64748B',
          backgroundColor: '#F9FAFB',
          textPrimary: '#111827',
          textSecondary: '#6B7280',
          headingFont: 'system',
          bodyFont: 'system',
          showLogo: true,
          showOrgName: true,
          navLinks: [],
          showContactInfo: true,
          showSocialLinks: true,
          footerText: null,
          copyrightText: null,
          ctaButtonText: 'Apply to Adopt',
          ctaButtonUrl: null,
          ctaButtonStyle: 'primary',
        },
        domains: organization.domainMappings,
      },
    });
  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get settings',
      },
    });
  }
});

/**
 * PUT /api/v1/organizations/:orgId/settings
 * Update organization settings
 */
router.put('/', async (req: AuthRequest, res: Response) => {
  try {
    const { orgId } = req.params;
    const settingsData = req.body;

    // Check access - must be owner/admin or super admin
    if (!req.user?.isSuperAdmin) {
      const membership = await prisma.membership.findUnique({
        where: {
          orgId_userId: {
            orgId,
            userId: req.user!.id,
          },
        },
      });

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to update settings',
          },
        });
      }

      // Admins can only update certain fields
      if (membership.role === 'admin') {
        const adminAllowedFields = [
          'primaryColor',
          'secondaryColor',
          'backgroundColor',
          'textPrimary',
          'textSecondary',
          'headingFont',
          'bodyFont',
          'showLogo',
          'showOrgName',
          'navLinks',
          'showContactInfo',
          'showSocialLinks',
          'footerText',
          'copyrightText',
          'ctaButtonText',
          'ctaButtonUrl',
          'ctaButtonStyle',
        ];

        // Filter out fields admins can't edit
        const restrictedFields = Object.keys(settingsData).filter(
          (key) => !adminAllowedFields.includes(key)
        );

        if (restrictedFields.length > 0) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: `Admins cannot update: ${restrictedFields.join(', ')}`,
            },
          });
        }
      }
    }

    // Validate hex colors
    const colorFields = [
      'primaryColor',
      'secondaryColor',
      'backgroundColor',
      'textPrimary',
      'textSecondary',
    ];
    for (const field of colorFields) {
      if (settingsData[field] && !/^#[0-9A-Fa-f]{6}$/.test(settingsData[field])) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid hex color for ${field}`,
          },
        });
      }
    }

    // Upsert settings
    const settings = await prisma.organizationSettings.upsert({
      where: { orgId },
      update: {
        ...settingsData,
        updatedAt: new Date(),
      },
      create: {
        orgId,
        ...settingsData,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user!.id,
        orgId,
        action: 'settings_updated',
        entityType: 'organization_settings',
        entityId: settings.id,
        metadata: {
          updatedFields: Object.keys(settingsData),
        },
        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip,
      },
    });

    res.json({
      success: true,
      data: { settings },
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update settings',
      },
    });
  }
});

/**
 * PUT /api/v1/organizations/:orgId/settings/slug
 * Update organization slug (subdomain)
 */
router.put('/slug', async (req: AuthRequest, res: Response) => {
  try {
    const { orgId } = req.params;
    const { slug } = req.body;

    if (!slug) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Slug is required',
        },
      });
    }

    // Validate slug format
    if (!/^[a-z0-9-]{3,63}$/.test(slug)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Slug must be 3-63 characters, lowercase alphanumeric and hyphens only',
        },
      });
    }

    // Check access - must be owner or super admin
    if (!req.user?.isSuperAdmin) {
      const membership = await prisma.membership.findUnique({
        where: {
          orgId_userId: {
            orgId,
            userId: req.user!.id,
          },
        },
      });

      if (!membership || membership.role !== 'owner') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only owners can change the subdomain',
          },
        });
      }
    }

    // Check if slug is already taken
    const existing = await prisma.organization.findFirst({
      where: {
        slug,
        id: { not: orgId },
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'SLUG_TAKEN',
          message: 'This subdomain is already taken',
        },
      });
    }

    // Update slug
    const organization = await prisma.organization.update({
      where: { id: orgId },
      data: { slug },
      select: { id: true, slug: true },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user!.id,
        orgId,
        action: 'slug_changed',
        entityType: 'organization',
        entityId: orgId,
        metadata: { newSlug: slug },
        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip,
      },
    });

    res.json({
      success: true,
      data: { organization },
    });
  } catch (error) {
    console.error('Error updating slug:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update slug',
      },
    });
  }
});

/**
 * GET /api/v1/organizations/:orgId/settings/widget
 * Get widget-specific settings (primaryColor, adoptUrlBase, animalsPerPage, defaultSpecies)
 */
router.get('/widget', async (req: AuthRequest, res: Response) => {
  try {
    const { orgId } = req.params;

    if (!req.user?.isSuperAdmin) {
      const membership = await prisma.membership.findUnique({
        where: { orgId_userId: { orgId, userId: req.user!.id } },
      });
      if (!membership) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
      }
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { slug: true, primaryColor: true },
    });

    if (!org) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Organization not found' } });
    }

    // Load widget-specific settings from key-value store
    const kvRow = await prisma.organizationSetting.findUnique({
      where: { organizationId_key: { organizationId: orgId, key: 'widget_settings' } },
    });

    const stored = (kvRow?.value as Record<string, unknown>) ?? {};

    res.json({
      success: true,
      data: {
        orgSlug: org.slug,
        primaryColor: (stored.primaryColor as string) ?? org.primaryColor ?? '#00113f',
        adoptUrlBase: (stored.adoptUrlBase as string) ?? '',
        animalsPerPage: (stored.animalsPerPage as number) ?? 24,
        defaultSpecies: (stored.defaultSpecies as string) ?? 'all',
      },
    });
  } catch (error) {
    console.error('Error getting widget settings:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get widget settings' } });
  }
});

/**
 * PUT /api/v1/organizations/:orgId/settings/widget
 * Save widget-specific settings
 */
router.put('/widget', async (req: AuthRequest, res: Response) => {
  try {
    const { orgId } = req.params;
    const { primaryColor, adoptUrlBase, animalsPerPage, defaultSpecies } = req.body;

    if (!req.user?.isSuperAdmin) {
      const membership = await prisma.membership.findUnique({
        where: { orgId_userId: { orgId, userId: req.user!.id } },
      });
      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
      }
    }

    // Validate color format
    if (primaryColor && !/^#[0-9A-Fa-f]{6}$/.test(primaryColor)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid hex color' } });
    }

    const value: Record<string, unknown> = {};
    if (primaryColor !== undefined) value.primaryColor = primaryColor;
    if (adoptUrlBase !== undefined) value.adoptUrlBase = adoptUrlBase;
    if (animalsPerPage !== undefined) value.animalsPerPage = Number(animalsPerPage);
    if (defaultSpecies !== undefined) value.defaultSpecies = defaultSpecies;

    // Upsert into key-value store
    await prisma.organizationSetting.upsert({
      where: { organizationId_key: { organizationId: orgId, key: 'widget_settings' } },
      update: { value: value as object },
      create: { organizationId: orgId, key: 'widget_settings', value: value as object },
    });

    // Mirror primaryColor onto Organization row for public API consumers
    if (primaryColor) {
      await prisma.organization.update({
        where: { id: orgId },
        data: { primaryColor },
      });
    }

    await prisma.auditLog.create({
      data: {
        actorUserId: req.user!.id,
        orgId,
        action: 'widget_settings_updated',
        entityType: 'organization_setting',
        entityId: orgId,
        metadata: { updatedFields: Object.keys(value) },
        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip,
      },
    });

    res.json({ success: true, data: { widgetSettings: value } });
  } catch (error) {
    console.error('Error saving widget settings:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to save widget settings' } });
  }
});

export default router;
