import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '@pawser/database';
import { hashPassword, verifyPassword } from '../utils/password';

/**
 * JWT payload structure
 */
export interface JWTPayload {
  sub: string;      // User ID
  email: string;
  tid?: string;     // Tenant ID context
  rid?: string;     // Active role in tenant
  isSuperAdmin: boolean;
  jti: string;      // JWT ID for revocation
  iat: number;
  exp: number;
}

/**
 * Token response structure
 */
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * User with memberships
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  isSuperAdmin: boolean;
  memberships: Array<{
    orgId: string;
    orgSlug: string;
    orgName: string;
    role: string;
  }>;
}

/**
 * Authentication Service
 * Handles user authentication, token management, and session lifecycle
 */
export class AuthService {
  private accessTokenSecret: string;
  private refreshTokenSecret: string;
  private accessTokenExpiry: string;
  private refreshTokenExpiry: string;

  constructor() {
    this.accessTokenSecret = process.env.JWT_SECRET || '';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || this.accessTokenSecret;
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '30d';

    if (!this.accessTokenSecret) {
      throw new Error('JWT_SECRET is not configured');
    }
  }

  /**
   * Register a new user with optional password
   * Creates user, organization, and membership
   */
  async register(data: {
    email: string;
    password?: string;
    name?: string;
    organizationName: string;
  }): Promise<{ user: AuthUser; tokens: TokenResponse }> {
    const normalizedEmail = data.email.toLowerCase().trim();

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new AuthError('EMAIL_EXISTS', 'An account with this email already exists', 409);
    }

    // Get trial plan
    const trialPlan = await prisma.plan.findUnique({
      where: { code: 'trial' },
    });

    if (!trialPlan) {
      throw new AuthError('NO_TRIAL_PLAN', 'Trial plan not configured', 500);
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: data.name,
        isSuperAdmin: false,
      },
    });

    // Create password credential if password provided
    if (data.password) {
      const passwordHash = await hashPassword(data.password);
      await prisma.passwordCredential.create({
        data: {
          userId: user.id,
          passwordHash,
        },
      });
    }

    // Create organization
    const slug = this.generateSlug(data.organizationName);
    const org = await prisma.organization.create({
      data: {
        name: data.organizationName,
        slug,
        status: 'trial',
      },
    });

    // Create domain mapping
    await prisma.domainMapping.create({
      data: {
        orgId: org.id,
        domain: `${slug}.pawser.app`,
        isPrimary: true,
        verificationStatus: 'verified',
        sslStatus: 'active',
        verifiedAt: new Date(),
      },
    });

    // Create membership as owner
    await prisma.membership.create({
      data: {
        orgId: org.id,
        userId: user.id,
        role: 'owner',
        acceptedAt: new Date(),
      },
    });

    // Create subscription on trial
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);
    await prisma.subscription.create({
      data: {
        orgId: org.id,
        planId: trialPlan.id,
        status: 'trialing',
        trialEnd,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, org.id, 'owner');

    // Return user with memberships
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      isSuperAdmin: user.isSuperAdmin,
      memberships: [
        {
          orgId: org.id,
          orgSlug: org.slug,
          orgName: org.name,
          role: 'owner',
        },
      ],
    };

    return { user: authUser, tokens };
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<{ user: AuthUser; tokens: TokenResponse }> {
    const normalizedEmail = email.toLowerCase().trim();

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        passwordCredential: true,
        memberships: {
          include: {
            organization: true,
          },
          where: {
            acceptedAt: { not: null },
          },
        },
      },
    });

    if (!user) {
      throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    if (user.disabled) {
      throw new AuthError('ACCOUNT_DISABLED', 'This account has been disabled', 403);
    }

    if (!user.passwordCredential) {
      throw new AuthError('NO_PASSWORD', 'This account does not have a password. Use magic link to login.', 401);
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordCredential.passwordHash);
    if (!isValid) {
      throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Get primary membership for token context
    const primaryMembership = user.memberships[0];
    const tid = primaryMembership?.orgId;
    const rid = primaryMembership?.role;

    // Generate tokens
    const tokens = await this.generateTokens(user.id, tid, rid);

    // Build auth user response
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      isSuperAdmin: user.isSuperAdmin,
      memberships: user.memberships.map((m) => ({
        orgId: m.orgId,
        orgSlug: m.organization.slug,
        orgName: m.organization.name,
        role: m.role,
      })),
    };

    return { user: authUser, tokens };
  }

  /**
   * Generate magic link token
   */
  async createMagicLink(email: string, orgId?: string): Promise<string> {
    const normalizedEmail = email.toLowerCase().trim();

    // Find user
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // For login magic links, user must exist
    if (!user) {
      throw new AuthError('USER_NOT_FOUND', 'No account found with this email', 404);
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Set expiry (15 minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Create magic link
    await prisma.magicLink.create({
      data: {
        userId: user.id,
        orgId,
        tokenHash,
        expiresAt,
      },
    });

    return token;
  }

  /**
   * Verify and consume magic link
   */
  async verifyMagicLink(token: string): Promise<{ user: AuthUser; tokens: TokenResponse }> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find magic link
    const magicLink = await prisma.magicLink.findFirst({
      where: {
        tokenHash,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          include: {
            memberships: {
              include: {
                organization: true,
              },
              where: {
                acceptedAt: { not: null },
              },
            },
          },
        },
      },
    });

    if (!magicLink) {
      throw new AuthError('INVALID_MAGIC_LINK', 'Invalid or expired magic link', 400);
    }

    // Consume the token
    await prisma.magicLink.update({
      where: { id: magicLink.id },
      data: { consumedAt: new Date() },
    });

    const user = magicLink.user;

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const primaryMembership = user.memberships[0];
    const tid = magicLink.orgId || primaryMembership?.orgId;
    const rid = primaryMembership?.role;
    const tokens = await this.generateTokens(user.id, tid, rid);

    // Build auth user response
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      isSuperAdmin: user.isSuperAdmin,
      memberships: user.memberships.map((m) => ({
        orgId: m.orgId,
        orgSlug: m.organization.slug,
        orgName: m.organization.name,
        role: m.role,
      })),
    };

    return { user: authUser, tokens };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(refreshToken: string): Promise<TokenResponse> {
    try {
      const payload = jwt.verify(refreshToken, this.refreshTokenSecret) as JWTPayload;

      // Verify user still exists and is active
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.disabled) {
        throw new AuthError('INVALID_REFRESH_TOKEN', 'Invalid refresh token', 401);
      }

      // Generate new tokens (rotate refresh token)
      return this.generateTokens(payload.sub, payload.tid, payload.rid);
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError('INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token', 401);
    }
  }

  /**
   * Get current user information
   */
  async getCurrentUser(userId: string): Promise<AuthUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            organization: true,
          },
          where: {
            acceptedAt: { not: null },
          },
        },
      },
    });

    if (!user) {
      throw new AuthError('USER_NOT_FOUND', 'User not found', 404);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isSuperAdmin: user.isSuperAdmin,
      memberships: user.memberships.map((m) => ({
        orgId: m.orgId,
        orgSlug: m.organization.slug,
        orgName: m.organization.name,
        role: m.role,
      })),
    };
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(
    userId: string,
    tenantId?: string,
    role?: string
  ): Promise<TokenResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AuthError('USER_NOT_FOUND', 'User not found', 404);
    }

    const jti = crypto.randomBytes(16).toString('hex');
    const now = Math.floor(Date.now() / 1000);

    // Access token payload
    const accessPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
      sub: userId,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      jti,
      ...(tenantId && { tid: tenantId }),
      ...(role && { rid: role }),
    };

    // Generate access token
    const accessToken = jwt.sign(accessPayload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry,
    });

    // Generate refresh token
    const refreshToken = jwt.sign(
      { ...accessPayload, jti: `${jti}-refresh` },
      this.refreshTokenSecret,
      { expiresIn: this.refreshTokenExpiry }
    );

    // Calculate expiry in seconds
    const decoded = jwt.decode(accessToken) as JWTPayload;
    const expiresIn = decoded.exp - now;

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Generate URL-safe slug from organization name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 63);
  }
}

/**
 * Custom authentication error
 */
export class AuthError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// Lazy singleton - initialized on first access to allow dotenv to load first
let _authServiceInstance: AuthService | null = null;

export function getAuthService(): AuthService {
  if (!_authServiceInstance) {
    _authServiceInstance = new AuthService();
  }
  return _authServiceInstance;
}
