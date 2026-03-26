import { Request, Response, NextFunction } from 'express';
import { prisma } from '@pawser/database';
import Redis from 'ioredis';

/**
 * Tenant context interface
 */
export interface TenantContext {
  tenantId: string;
  orgId: string;
  slug: string;
  status: string;
  name: string;
  primaryColor?: string | null;
  logoUrl?: string | null;
}

/**
 * Extended Express Request with tenant context
 */
export interface TenantRequest extends Request {
  tenant?: TenantContext;
}

// Redis client for caching (optional)
let redis: Redis | null = null;

if (process.env.REDIS_HOST) {
  try {
    redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn('Redis connection failed, falling back to no cache');
          return null;
        }
        return Math.min(times * 50, 2000);
      },
    });

    redis.on('error', (err) => {
      console.error('Redis error:', err);
    });
  } catch {
    console.warn('Redis initialization failed');
  }
}

// Base domain for tenant subdomains
const BASE_DOMAIN = process.env.PAWSER_BASE_DOMAIN || 'pawser.app';

// Cache TTLs
const CACHE_TTL = 300; // 5 minutes for valid tenants
const NEGATIVE_CACHE_TTL = 60; // 1 minute for not-found

/**
 * Extract slug from host header
 */
function extractSlugFromHost(host: string): string | null {
  // Remove port if present
  const hostname = host.split(':')[0].toLowerCase();

  // Check if it's a subdomain of our base domain
  if (hostname.endsWith(`.${BASE_DOMAIN}`)) {
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      return parts[0];
    }
  }

  // Handle localhost for development
  if (hostname.includes('.localhost') || hostname.match(/\.127\.\d+\.\d+\.\d+$/)) {
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return parts[0];
    }
  }

  return null;
}

/**
 * Get tenant from cache
 */
async function getCachedTenant(cacheKey: string): Promise<TenantContext | null | 'not_found'> {
  if (!redis) return null;

  try {
    const cached = await redis.get(cacheKey);
    if (cached === 'NOT_FOUND') return 'not_found';
    if (cached) return JSON.parse(cached) as TenantContext;
  } catch (error) {
    console.error('Cache get error:', error);
  }
  return null;
}

/**
 * Set tenant in cache
 */
async function setCachedTenant(cacheKey: string, tenant: TenantContext | null): Promise<void> {
  if (!redis) return;

  try {
    if (tenant === null) {
      // Negative cache for not found
      await redis.setex(cacheKey, NEGATIVE_CACHE_TTL, 'NOT_FOUND');
    } else {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(tenant));
    }
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

/**
 * Invalidate tenant cache
 */
export async function invalidateTenantCache(slug: string): Promise<void> {
  if (!redis) return;

  try {
    const cacheKey = `tenant:${slug}`;
    await redis.del(cacheKey);
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
}

/**
 * Tenant resolution middleware
 * Resolves tenant from subdomain with Redis caching
 */
export async function resolveTenant(
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const host = req.headers.host || '';

    if (!host) {
      res.status(400).json({
        success: false,
        error: {
          code: 'HOST_REQUIRED',
          message: 'Host header is required',
        },
      });
      return;
    }

    // Extract slug from host
    const slug = extractSlugFromHost(host);

    if (!slug) {
      res.status(404).json({
        success: false,
        error: {
          code: 'TENANT_NOT_FOUND',
          message: 'No tenant found for this domain',
        },
      });
      return;
    }

    // Check cache first
    const cacheKey = `tenant:${slug}`;
    const cached = await getCachedTenant(cacheKey);

    if (cached === 'not_found') {
      res.status(404).json({
        success: false,
        error: {
          code: 'TENANT_NOT_FOUND',
          message: 'Organization not found',
        },
      });
      return;
    }

    if (cached) {
      // Check tenant status from cache
      if (cached.status === 'suspended') {
        res.status(403).json({
          success: false,
          error: {
            code: 'ORG_SUSPENDED',
            message: 'This organization has been suspended',
          },
        });
        return;
      }

      if (cached.status === 'disabled' || cached.status === 'deleted') {
        res.status(410).json({
          success: false,
          error: {
            code: 'ORG_DISABLED',
            message: 'This organization is no longer available',
          },
        });
        return;
      }

      req.tenant = cached;
      
      // Add response headers for observability
      res.setHeader('X-Tenant-Id', cached.tenantId);
      res.setHeader('X-Tenant-Slug', cached.slug);
      res.setHeader('Vary', 'Host');
      
      return next();
    }

    // Lookup from database via domain mapping
    let org = await prisma.organization.findFirst({
      where: {
        domainMappings: {
          some: {
            domain: {
              startsWith: slug,
            },
            verificationStatus: 'verified',
          },
        },
      },
    });

    // Fallback to slug lookup
    if (!org) {
      org = await prisma.organization.findUnique({
        where: { slug },
      });
    }

    if (!org) {
      // Cache negative result
      await setCachedTenant(cacheKey, null);
      
      res.status(404).json({
        success: false,
        error: {
          code: 'TENANT_NOT_FOUND',
          message: 'Organization not found',
        },
      });
      return;
    }

    // Check organization status
    if (org.status === 'suspended') {
      res.status(403).json({
        success: false,
        error: {
          code: 'ORG_SUSPENDED',
          message: 'This organization has been suspended',
        },
      });
      return;
    }

    if (org.status === 'disabled' || org.deletedAt) {
      res.status(410).json({
        success: false,
        error: {
          code: 'ORG_DISABLED',
          message: 'This organization is no longer available',
        },
      });
      return;
    }

    // Build tenant context
    const tenant: TenantContext = {
      tenantId: org.id,
      orgId: org.id,
      slug: org.slug,
      status: org.status,
      name: org.name,
      primaryColor: org.primaryColor,
      logoUrl: org.logoUrl,
    };

    // Cache the result
    await setCachedTenant(cacheKey, tenant);

    // Attach to request
    req.tenant = tenant;

    // Add response headers for observability
    res.setHeader('X-Tenant-Id', tenant.tenantId);
    res.setHeader('X-Tenant-Slug', tenant.slug);
    res.setHeader('Vary', 'Host');

    next();
  } catch (error) {
    console.error('Error resolving tenant:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to resolve tenant',
      },
    });
  }
}

/**
 * Optional tenant resolution from organization ID in request params
 * Used for admin routes where organization ID is explicitly provided
 */
export async function resolveTenantFromId(
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = req.params.organizationId || req.body.organizationId;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Organization ID is required',
        },
      });
      return;
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      res.status(404).json({
        success: false,
        error: {
          code: 'TENANT_NOT_FOUND',
          message: 'Organization not found',
        },
      });
      return;
    }

    if (org.status === 'suspended') {
      res.status(403).json({
        success: false,
        error: {
          code: 'ORG_SUSPENDED',
          message: 'This organization has been suspended',
        },
      });
      return;
    }

    if (org.status === 'disabled' || org.deletedAt) {
      res.status(410).json({
        success: false,
        error: {
          code: 'ORG_DISABLED',
          message: 'This organization is no longer available',
        },
      });
      return;
    }

    req.tenant = {
      tenantId: org.id,
      orgId: org.id,
      slug: org.slug,
      status: org.status,
      name: org.name,
      primaryColor: org.primaryColor,
      logoUrl: org.logoUrl,
    };

    next();
  } catch (error) {
    console.error('Error resolving tenant from ID:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to resolve tenant',
      },
    });
  }
}

// Legacy export for backwards compatibility
export { TenantContext as Organization };