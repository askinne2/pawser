import crypto from 'crypto';
import { prisma } from '@pawser/database';
import { hashPassword } from '../utils/password';
import { getEmailService } from './EmailService';

// Custom error classes
export class RateLimitError extends Error {
  constructor(message: string = 'Too many requests') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class InvalidTokenError extends Error {
  constructor(public reason: 'invalid' | 'expired' | 'used', message?: string) {
    super(message || `Token is ${reason}`);
    this.name = 'InvalidTokenError';
  }
}

export class InvalidPasswordError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPasswordError';
  }
}

/**
 * Password Reset Service
 * Handles secure password reset flow with rate limiting and token management
 */
class PasswordResetService {
  private readonly TOKEN_EXPIRY_HOURS = 1;
  private readonly MAX_REQUESTS_PER_EMAIL = 3;
  private readonly MAX_REQUESTS_PER_IP = 10;

  /**
   * Generate a cryptographically secure token
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Hash a token using SHA-256
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Request a password reset for an email
   * Always returns void to prevent email enumeration
   */
  async requestReset(
    email: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();

    // Check rate limits by email
    const recentEmailRequests = await prisma.passwordResetToken.count({
      where: {
        user: { email: normalizedEmail },
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
      },
    });

    if (recentEmailRequests >= this.MAX_REQUESTS_PER_EMAIL) {
      throw new RateLimitError('Too many reset requests for this email');
    }

    // Check rate limits by IP (if provided)
    if (ipAddress) {
      const recentIpRequests = await prisma.passwordResetToken.count({
        where: {
          ipAddress,
          createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        },
      });

      if (recentIpRequests >= this.MAX_REQUESTS_PER_IP) {
        throw new RateLimitError('Too many reset requests from this IP');
      }
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { passwordCredential: true },
    });

    // Only proceed if user exists and has password auth
    // We silently succeed if user doesn't exist (no email enumeration)
    if (user && user.passwordCredential && !user.disabled) {
      // Generate token
      const token = this.generateToken();
      const tokenHash = this.hashToken(token);

      // Store hashed token with expiry
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + this.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000),
          ipAddress,
          userAgent,
        },
      });

      // Send password reset email
      const emailService = getEmailService();
      await emailService.sendPasswordReset(user.email, user.name || 'there', token);

      console.log(`[PasswordReset] Reset email queued for ${normalizedEmail}`);
    } else {
      console.log(`[PasswordReset] No action for ${normalizedEmail} (user not found or no password)`);
    }

    // Log the request attempt (for monitoring)
    await prisma.auditLog.create({
      data: {
        action: 'password_reset_requested',
        entityType: 'user',
        entityId: user?.id,
        ipAddress,
        metadata: {
          email: normalizedEmail,
          userExists: !!user,
        },
      },
    });
  }

  /**
   * Validate a password reset token
   */
  async validateToken(token: string): Promise<{
    valid: boolean;
    email?: string;
    expiresAt?: Date;
    reason?: 'invalid' | 'expired' | 'used';
  }> {
    const tokenHash = this.hashToken(token);

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { email: true } } },
    });

    if (!resetToken) {
      return { valid: false, reason: 'invalid' };
    }

    if (resetToken.consumedAt) {
      return { valid: false, reason: 'used' };
    }

    if (resetToken.expiresAt < new Date()) {
      return { valid: false, reason: 'expired' };
    }

    // Mask the email for security
    const email = resetToken.user.email;
    const [local, domain] = email.split('@');
    const maskedEmail = local.length > 2
      ? `${local[0]}${'*'.repeat(Math.min(local.length - 2, 5))}${local[local.length - 1]}@${domain}`
      : `${local[0]}***@${domain}`;

    return {
      valid: true,
      email: maskedEmail,
      expiresAt: resetToken.expiresAt,
    };
  }

  /**
   * Reset password using a valid token
   */
  async resetPassword(token: string, newPassword: string, ipAddress?: string): Promise<void> {
    const tokenHash = this.hashToken(token);

    // Find token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetToken) {
      throw new InvalidTokenError('invalid');
    }

    if (resetToken.consumedAt) {
      throw new InvalidTokenError('used');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new InvalidTokenError('expired');
    }

    // Validate new password
    this.validatePassword(newPassword);

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Use transaction to ensure atomic updates
    await prisma.$transaction(async (tx) => {
      // Update password
      await tx.passwordCredential.update({
        where: { userId: resetToken.userId },
        data: {
          passwordHash,
          passwordUpdatedAt: new Date(),
        },
      });

      // Mark token as consumed
      await tx.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { consumedAt: new Date() },
      });

      // Revoke all refresh tokens for this user (security best practice)
      await tx.refreshToken.updateMany({
        where: {
          userId: resetToken.userId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });

      // Create audit log entry
      await tx.auditLog.create({
        data: {
          actorUserId: resetToken.userId,
          action: 'password_reset',
          entityType: 'user',
          entityId: resetToken.userId,
          ipAddress,
          metadata: {
            tokenId: resetToken.id,
          },
        },
      });
    });

    console.log(`[PasswordReset] Password reset completed for user ${resetToken.userId}`);
  }

  /**
   * Validate password meets requirements
   */
  private validatePassword(password: string): void {
    if (!password || password.length < 10) {
      throw new InvalidPasswordError('Password must be at least 10 characters');
    }

    // Check for common patterns (optional stricter validation)
    const commonPasswords = [
      'password123',
      '1234567890',
      'qwertyuiop',
      'letmein123',
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
      throw new InvalidPasswordError('Password is too common');
    }
  }

  /**
   * Clean up expired and consumed tokens (for scheduled job)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await prisma.passwordResetToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { consumedAt: { not: null } },
        ],
        createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Older than 7 days
      },
    });

    console.log(`[PasswordReset] Cleaned up ${result.count} expired/consumed tokens`);
    return result.count;
  }
}

// Singleton instance
let passwordResetServiceInstance: PasswordResetService | null = null;

export function getPasswordResetService(): PasswordResetService {
  if (!passwordResetServiceInstance) {
    passwordResetServiceInstance = new PasswordResetService();
  }
  return passwordResetServiceInstance;
}

export default PasswordResetService;
