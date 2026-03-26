# Password Reset Flow

> **Type:** Backend PRD  
> **Feature:** Password Reset & Recovery  
> **Priority:** P1 (Important)  
> **Status:** 🟡 Scaffolded  
> **Depends On:** PRD-12 (Email System), PRD-05 (Auth & RBAC)
>
> **Implementation Notes:**
> - ✅ PasswordResetService created at `apps/api/src/services/PasswordResetService.ts`
> - ✅ API routes added to `apps/api/src/routes/auth.ts`
> - ✅ Forgot password page at `apps/admin/app/(auth)/forgot-password/page.tsx`
> - ✅ Reset password page at `apps/admin/app/(auth)/reset-password/page.tsx`
> - ✅ Token generation and validation
> - 🟡 End-to-end flow needs testing
> - 🟡 Depends on Email System (PRD-12) for delivery

---

## Feature Overview

Implement secure password reset functionality allowing users to recover account access via email. Includes forgot password request, secure token generation, email delivery, token verification, and password update with session invalidation.

## Requirements

### Security Requirements

- Reset tokens: cryptographically random, 32 bytes, URL-safe base64
- Token storage: hashed (SHA-256), never stored plain
- Token TTL: 1 hour, single-use
- Rate limiting: 3 requests per email per hour, 10 per IP per hour
- Password validation: min 10 chars, block compromised passwords
- Session invalidation: revoke all refresh tokens on password change

### User Flow

```
1. User clicks "Forgot Password" on login page
2. User enters email address
3. System always responds "Check your email" (no user enumeration)
4. If email exists: send reset email with token
5. User clicks link in email
6. System validates token
7. User enters new password (+ confirm)
8. System updates password, invalidates sessions
9. User redirected to login with success message
```

### API Endpoints

#### POST /api/v1/auth/password/forgot

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (always 202):**
```json
{
  "success": true,
  "message": "If an account exists with this email, you will receive a password reset link."
}
```

**Backend logic:**
1. Validate email format
2. Check rate limits (return 429 if exceeded)
3. Look up user by email
4. If user exists AND has password credential:
   - Generate secure token
   - Hash token and store with expiry
   - Queue password reset email
5. Return 202 regardless of user existence

#### POST /api/v1/auth/password/reset

**Request:**
```json
{
  "token": "base64-encoded-token",
  "newPassword": "new-secure-password"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password has been reset. Please log in with your new password."
}
```

**Error responses:**
- 400: `INVALID_PASSWORD` - Password doesn't meet requirements
- 400: `COMPROMISED_PASSWORD` - Password found in breach database
- 410: `TOKEN_EXPIRED` - Token has expired
- 410: `TOKEN_USED` - Token already consumed
- 404: `TOKEN_INVALID` - Token not found

**Backend logic:**
1. Validate token format
2. Hash token, look up in database
3. Verify not expired and not consumed
4. Validate new password (length, complexity, breach check)
5. Update password credential (hash with scrypt)
6. Mark token as consumed
7. Revoke all user's refresh tokens
8. Log password reset to audit trail
9. Return success

#### GET /api/v1/auth/password/validate-token

**Query:** `?token=xxx`

**Response:**
```json
{
  "valid": true,
  "email": "u***@example.com",  // Masked
  "expiresAt": "2026-01-14T12:00:00Z"
}
```

Or:
```json
{
  "valid": false,
  "reason": "expired" | "used" | "invalid"
}
```

### Database Schema

```prisma
model PasswordResetToken {
  id          String   @id @default(uuid())
  userId      String
  tokenHash   String   @unique  // SHA-256 of token
  expiresAt   DateTime
  consumedAt  DateTime?
  createdAt   DateTime @default(now())
  ipAddress   String?
  userAgent   String?
  
  user        User     @relation(fields: [userId], references: [id])
  
  @@index([userId])
  @@index([expiresAt])
}
```

### Frontend Pages

#### Forgot Password Page (`/auth/forgot-password`)

**Layout:**
- Centered card
- Pawser logo
- Heading: "Reset your password"
- Email input field
- Submit button: "Send Reset Link"
- Back to login link

**States:**
- Default: form visible
- Loading: button disabled, spinner
- Success: "Check your email" message, hide form
- Error (rate limit): "Too many requests. Try again later."

#### Reset Password Page (`/auth/reset-password`)

**URL:** `/auth/reset-password?token=xxx`

**Layout:**
- Centered card
- Pawser logo
- Heading: "Create new password"
- New password input (with show/hide toggle)
- Confirm password input
- Password requirements hint
- Submit button: "Reset Password"

**States:**
- Loading: validating token
- Invalid token: error message + link to request new reset
- Form: password inputs
- Success: "Password reset!" + redirect to login

**Validation (client-side):**
- Min 10 characters
- Passwords match
- Real-time strength indicator (optional)

### Service Implementation

```typescript
// apps/api/src/services/PasswordResetService.ts

import crypto from 'crypto';
import { prisma } from '@pawser/database';
import { hashPassword } from '../utils/password';
import { emailService } from './EmailService';

export class PasswordResetService {
  private readonly TOKEN_EXPIRY_HOURS = 1;
  private readonly MAX_REQUESTS_PER_EMAIL = 3;
  private readonly MAX_REQUESTS_PER_IP = 10;

  async requestReset(email: string, ipAddress?: string): Promise<void> {
    // Rate limit check
    const recentRequests = await prisma.passwordResetToken.count({
      where: {
        user: { email: email.toLowerCase() },
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });

    if (recentRequests >= this.MAX_REQUESTS_PER_EMAIL) {
      throw new RateLimitError('Too many reset requests');
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { passwordCredential: true },
    });

    // Only proceed if user exists and has password auth
    if (user && user.passwordCredential) {
      // Generate token
      const token = crypto.randomBytes(32).toString('base64url');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Store hashed token
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + this.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000),
          ipAddress,
        },
      });

      // Send email
      await emailService.sendPasswordReset(user.email, user.name || '', token);
    }

    // Always succeed (no user enumeration)
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetToken) {
      throw new InvalidTokenError('Invalid reset token');
    }

    if (resetToken.consumedAt) {
      throw new InvalidTokenError('Token already used');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new InvalidTokenError('Token expired');
    }

    // Validate password
    await this.validatePassword(newPassword);

    // Update password
    const passwordHash = await hashPassword(newPassword);
    
    await prisma.$transaction([
      // Update password
      prisma.passwordCredential.update({
        where: { userId: resetToken.userId },
        data: {
          passwordHash,
          passwordUpdatedAt: new Date(),
        },
      }),
      // Mark token consumed
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { consumedAt: new Date() },
      }),
      // Revoke all refresh tokens
      prisma.refreshToken.deleteMany({
        where: { userId: resetToken.userId },
      }),
      // Audit log
      prisma.auditLog.create({
        data: {
          userId: resetToken.userId,
          action: 'password_reset',
          entityType: 'user',
          entityId: resetToken.userId,
          ipAddress: resetToken.ipAddress,
        },
      }),
    ]);
  }

  async validateToken(token: string): Promise<{
    valid: boolean;
    email?: string;
    expiresAt?: Date;
    reason?: string;
  }> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

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

    // Mask email
    const email = resetToken.user.email;
    const [local, domain] = email.split('@');
    const maskedEmail = `${local[0]}***@${domain}`;

    return {
      valid: true,
      email: maskedEmail,
      expiresAt: resetToken.expiresAt,
    };
  }

  private async validatePassword(password: string): Promise<void> {
    if (password.length < 10) {
      throw new InvalidPasswordError('Password must be at least 10 characters');
    }

    // Optional: Check against breach database (HaveIBeenPwned API)
    // const isCompromised = await checkPwnedPassword(password);
    // if (isCompromised) {
    //   throw new CompromisedPasswordError();
    // }
  }
}
```

### Cleanup Job

```typescript
// apps/api/src/jobs/cleanup-tokens.ts

// Run daily to clean up expired tokens
const cleanupExpiredTokens = async () => {
  const deleted = await prisma.passwordResetToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { consumedAt: { not: null } },
      ],
      createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
  });
  
  console.log(`Cleaned up ${deleted.count} password reset tokens`);
};
```

## User Stories

1. As a user, I can reset my password if I forget it.
2. As a user, I receive a clear email with reset instructions.
3. As a user, I cannot use a reset link more than once.
4. As a user, my other sessions are logged out when I reset my password.
5. As a malicious actor, I cannot enumerate valid email addresses.
6. As a malicious actor, I am rate-limited from brute-forcing reset requests.

## Technical Considerations

- **Token security:** 256 bits of entropy, base64url encoded
- **Timing attacks:** Constant-time comparison for token validation
- **Session handling:** All refresh tokens revoked, not just current session
- **Email delivery:** High priority queue, < 30 second delivery
- **Audit trail:** Log all reset attempts (success and failure)
- **Monitoring:** Alert on unusual reset volume per email/IP

## Success Criteria

| Metric | Target |
|--------|--------|
| Reset email delivery | < 30 seconds |
| Token validation time | < 100ms |
| User enumeration | Zero information leakage |
| Rate limit enforcement | 100% |
| Session invalidation | 100% of tokens revoked |
| Reset completion rate | ≥ 80% of initiated resets |
