import { Response, NextFunction } from 'express';
import { TenantRequest } from './tenant';

/**
 * Tenant guard middleware
 * Ensures tenant context exists and validates tenant isolation
 * Must be used after resolveTenant middleware
 */
export function requireTenant(
  req: TenantRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.tenant) {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Tenant context is required',
      },
    });
    return;
  }

  // Check for valid org ID (supports both old and new field names)
  const orgId = req.tenant.orgId || (req.tenant as any).organizationId;
  if (!orgId) {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Invalid tenant context',
      },
    });
    return;
  }

  // Validate tenant status
  const status = req.tenant.status || (req.tenant as any).organization?.status;
  if (status && status !== 'active' && status !== 'trial') {
    res.status(403).json({
      success: false,
      error: {
        code: 'ORG_SUSPENDED',
        message: 'Organization is not active',
      },
    });
    return;
  }

  next();
}

/**
 * Helper function to ensure organizationId is included in queries
 * Throws error if organizationId is missing or doesn't match tenant
 */
export function validateTenantScope(
  organizationId: string | undefined,
  tenantOrganizationId: string
): void {
  if (!organizationId) {
    throw new Error('Organization ID is required for tenant-scoped operations');
  }

  if (organizationId !== tenantOrganizationId) {
    throw new Error('Organization ID does not match tenant context');
  }
}

/**
 * Get organization ID from tenant context (supports both field names)
 */
export function getOrgIdFromTenant(tenant: TenantRequest['tenant']): string {
  if (!tenant) {
    throw new Error('Tenant context is required');
  }
  return tenant.orgId || tenant.tenantId || (tenant as any).organizationId;
}