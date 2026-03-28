import { Router, Response, NextFunction } from 'express';
import { TenantService } from '../services/TenantService';
import { encryptWithComponents } from '../utils/encryption';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { resolveTenantFromId, TenantRequest } from '../middleware/tenant';
import { ShelterLuvService } from '../services/ShelterLuvService';
import { prisma } from '@pawser/database';

const router = Router();
const tenantService = new TenantService();

/**
 * Middleware: allow super_admin unconditionally, or owner/admin only for their own org.
 * Prevents cross-tenant data access by non-super-admins.
 */
function requireOwnOrgOrSuperAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  if (req.user.isSuperAdmin) {
    return next();
  }

  // Non-super-admin: must be scoped to their own org
  const orgId = req.params.id;
  if (!orgId) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Organization ID is required' } });
    return;
  }

  if (req.user.tenantId !== orgId) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You can only access your own organization' },
    });
    return;
  }

  // Must have at least admin-level role within their own org
  const role = req.user.tenantRole || req.user.role;
  const allowedRoles = new Set(['owner', 'admin', 'super_admin']);
  if (!allowedRoles.has(role)) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Insufficient permissions within your organization' },
    });
    return;
  }

  next();
}

/**
 * GET /organizations
 * List all organizations (admin only)
 */
router.get('/', authenticate, requireRole('super_admin', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { status, limit, offset } = req.query;
    const result = await tenantService.listOrganizations({
      status: status as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    res.json({
      success: true,
      organizations: result.organizations,
      total: result.total,
    });
  } catch (error) {
    console.error('Error listing organizations:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to list organizations',
    });
  }
});

/**
 * POST /organizations
 * Create new organization (admin only)
 */
router.post('/', authenticate, requireRole('super_admin', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { slug, name, status, timezone, logoUrl, primaryColor } = req.body;

    if (!slug || !name) {
      return res.status(400).json({
        success: false,
        error: 'Bad request',
        message: 'slug and name are required',
      });
    }

    const organization = await tenantService.createOrganization({
      slug,
      name,
      status,
      timezone,
      logoUrl,
      primaryColor,
    });

    res.status(201).json({
      success: true,
      organization,
    });
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to create organization',
    });
  }
});

/**
 * GET /organizations/:id
 * Get organization details
 */
router.get('/:id', authenticate, requireOwnOrgOrSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organization = await tenantService.getOrganization(id);

    if (!organization) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: `Organization with ID ${id} not found`,
      });
    }

    res.json({
      success: true,
      organization,
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to fetch organization',
    });
  }
});

/**
 * PUT /organizations/:id
 * Update organization
 */
router.put('/:id', authenticate, requireOwnOrgOrSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, status, timezone, logoUrl, primaryColor } = req.body;

    const organization = await tenantService.updateOrganization(id, {
      name,
      status,
      timezone,
      logoUrl,
      primaryColor,
    });

    res.json({
      success: true,
      organization,
    });
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to update organization',
    });
  }
});

/**
 * DELETE /organizations/:id
 * Delete organization
 */
router.delete('/:id', authenticate, requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await tenantService.deleteOrganization(id);

    res.json({
      success: true,
      message: 'Organization deleted',
    });
  } catch (error) {
    console.error('Error deleting organization:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to delete organization',
    });
  }
});

/**
 * GET /organizations/:id/credentials
 * Get organization integration credentials status (without revealing the key)
 */
router.get(
  '/:id/credentials',
  authenticate,
  requireOwnOrgOrSuperAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const credentials = await prisma.integrationCredential.findMany({
        where: { orgId: id },
        select: {
          id: true,
          provider: true,
          accountLabel: true,
          externalAccountId: true,
          scope: true,
          status: true,
          lastValidatedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      const dataSources = await prisma.dataSource.findMany({
        where: { orgId: id },
        select: {
          id: true,
          name: true,
          provider: true,
          isActive: true,
          createdAt: true,
        },
      });

      res.json({
        success: true,
        credentials,
        dataSources,
        hasActiveCredentials: credentials.some((c) => c.status === 'active'),
        hasActiveDataSources: dataSources.some((d) => d.isActive),
      });
    } catch (error) {
      console.error('Error fetching credentials:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to fetch credentials',
      });
    }
  }
);

/**
 * POST /organizations/:id/credentials/test
 * Test a ShelterLuv API key without saving it
 */
router.post(
  '/:id/credentials/test',
  authenticate,
  requireOwnOrgOrSuperAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { apiKey } = req.body;

      if (!apiKey) {
        return res.status(400).json({
          success: false,
          error: 'Bad request',
          message: 'apiKey is required',
        });
      }

      // Test the API key by fetching animals
      const shelterLuvService = new ShelterLuvService(apiKey);
      
      try {
        const { animals } = await shelterLuvService.getAnimals({ limit: 5 });
        const first = animals[0] as unknown as Record<string, unknown> | undefined;

        res.json({
          success: true,
          message: 'Connection successful',
          animalsFound: animals.length,
          sampleAnimal: first
            ? {
                name: (first.name ?? first.Name) as string,
                species: (first.species ?? first.Type) as string,
                status: (first.status ?? first.Status) as string,
              }
            : null,
        });
      } catch (apiError) {
        res.status(400).json({
          success: false,
          error: 'Connection failed',
          message: apiError instanceof Error ? apiError.message : 'Failed to connect to ShelterLuv API',
        });
      }
    } catch (error) {
      console.error('Error testing credentials:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to test credentials',
      });
    }
  }
);

/**
 * PUT /organizations/:id/credentials
 * Update organization integration credentials (encrypts API key)
 * Also creates a DataSource if one doesn't exist
 */
router.put(
  '/:id/credentials',
  authenticate,
  requireOwnOrgOrSuperAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { apiKey, provider = 'shelterluv', accountLabel, externalAccountId, scope } = req.body;

      if (!apiKey) {
        return res.status(400).json({
          success: false,
          error: 'Bad request',
          message: 'apiKey is required',
        });
      }

      // Verify organization exists
      const org = await prisma.organization.findUnique({
        where: { id },
      });

      if (!org) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Organization not found',
        });
      }

      // Encrypt API key before storing
      const encrypted = encryptWithComponents(apiKey);

      const credential = await tenantService.upsertIntegrationCredential(id, {
        provider,
        secretCiphertext: encrypted.ciphertext,
        secretIv: encrypted.iv,
        secretTag: encrypted.tag,
        accountLabel: accountLabel || org.name,
        externalAccountId,
        scope,
      });

      // Create or update DataSource for this credential
      const existingDataSource = await prisma.dataSource.findFirst({
        where: {
          orgId: id,
          credentialsId: credential.id,
        },
      });

      let dataSource;
      if (existingDataSource) {
        dataSource = await prisma.dataSource.update({
          where: { id: existingDataSource.id },
          data: {
            name: accountLabel || `${org.name} - ShelterLuv`,
            isActive: true,
          },
        });
      } else {
        dataSource = await prisma.dataSource.create({
          data: {
            orgId: id,
            credentialsId: credential.id,
            provider,
            name: accountLabel || `${org.name} - ShelterLuv`,
            externalAccountId,
            isActive: true,
          },
        });
      }

      res.json({
        success: true,
        credential: {
          id: credential.id,
          provider: credential.provider,
          accountLabel: credential.accountLabel,
          status: credential.status,
        },
        dataSource: {
          id: dataSource.id,
          name: dataSource.name,
          isActive: dataSource.isActive,
        },
        message: 'Credentials saved. You can now trigger a sync.',
      });
    } catch (error) {
      console.error('Error updating credentials:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to update credentials',
      });
    }
  }
);

/**
 * GET /organizations/:id/settings
 * Get all settings for organization
 */
router.get('/:id/settings', authenticate, requireOwnOrgOrSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const settings = await tenantService.getSettings(id);

    res.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to fetch settings',
    });
  }
});

/**
 * PUT /organizations/:id/settings
 * Update organization settings
 */
router.put('/:id/settings', authenticate, requireOwnOrgOrSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { key, value } = req.body;

    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Bad request',
        message: 'key is required',
      });
    }

    const setting = await tenantService.setSetting(id, key, value);

    res.json({
      success: true,
      setting,
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to update setting',
    });
  }
});

export default router;

