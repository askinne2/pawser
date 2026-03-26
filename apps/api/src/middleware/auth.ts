import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * JWT payload structure matching AuthService
 */
interface JWTPayload {
  sub: string;      // User ID
  email: string;
  tid?: string;     // Tenant ID context
  rid?: string;     // Active role in tenant
  isSuperAdmin: boolean;
  jti: string;
  iat: number;
  exp: number;
}

/**
 * Extended Express Request with user authentication
 */
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    isSuperAdmin: boolean;
    tenantId?: string;
    tenantRole?: string;
  };
}

/**
 * Role hierarchy for authorization checks
 */
const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 100,
  owner: 80,
  admin: 60,
  viewer: 40,
};

/**
 * JWT authentication middleware
 * Validates JWT token from Authorization header
 * Dev mode: Can bypass auth if DEV_AUTH_BYPASS=true
 */
export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  // Dev mode auth bypass (for local development only)
  if (process.env.NODE_ENV === 'development' && process.env.DEV_AUTH_BYPASS === 'true') {
    console.warn('⚠️  DEV MODE: Authentication bypass is enabled');
    req.user = {
      id: 'dev-user-id',
      email: 'dev@localhost',
      role: 'super_admin',
      isSuperAdmin: true,
    };
    return next();
  }

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header',
        },
      });
      return;
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error('JWT_SECRET is not configured');
      res.status(500).json({
        success: false,
        error: {
          code: 'CONFIG_ERROR',
          message: 'Authentication configuration error',
        },
      });
      return;
    }

    try {
      const decoded = jwt.verify(token, secret) as JWTPayload;

      // Build user object from JWT payload
      req.user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.isSuperAdmin ? 'super_admin' : (decoded.rid || 'viewer'),
        isSuperAdmin: decoded.isSuperAdmin,
        tenantId: decoded.tid,
        tenantRole: decoded.rid,
      };

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Access token has expired',
          },
        });
        return;
      }

      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid access token',
        },
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication failed',
      },
    });
  }
}

/**
 * Optional authentication middleware
 * Allows unauthenticated requests but extracts user if token present
 */
export function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  // Try to authenticate, but don't fail if invalid
  authenticate(req, res, (err) => {
    if (err) {
      // Clear any partial user data
      req.user = undefined;
    }
    next();
  });
}

/**
 * Role-based authorization middleware
 * Requires user to have one of the specified roles
 * Uses role hierarchy: super_admin > owner > admin > viewer
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const userRole = req.user.role;
    const userRoleLevel = ROLE_HIERARCHY[userRole] || 0;

    // Check if user's role level meets any allowed role
    const hasAccess = allowedRoles.some((role) => {
      const requiredLevel = ROLE_HIERARCHY[role] || 0;
      return userRoleLevel >= requiredLevel;
    });

    if (!hasAccess) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Insufficient permissions. Required role: ${allowedRoles.join(' or ')}`,
        },
      });
      return;
    }

    next();
  };
}

/**
 * Require super admin role
 */
export function requireSuperAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
    return;
  }

  if (!req.user.isSuperAdmin) {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Super admin access required',
      },
    });
    return;
  }

  next();
}

/**
 * Require tenant context
 * Ensures request has tenant ID either from JWT or header
 */
export function requireTenantContext(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
    return;
  }

  // Super admins can access any tenant via X-Tenant-Id header
  if (req.user.isSuperAdmin) {
    const headerTenantId = req.headers['x-tenant-id'] as string;
    if (headerTenantId) {
      req.user.tenantId = headerTenantId;
    }
  }

  if (!req.user.tenantId) {
    res.status(400).json({
      success: false,
      error: {
        code: 'TENANT_REQUIRED',
        message: 'Tenant context is required for this operation',
      },
    });
    return;
  }

  next();
}

/**
 * Generate JWT token for user (legacy function for backwards compatibility)
 */
export function generateToken(user: { id: string; email: string; role: string }): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      isSuperAdmin: user.role === 'super_admin',
      rid: user.role,
    },
    secret,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    }
  );
}
