import { Router, Response, Request } from 'express';
import { getAuthService, AuthError } from '../services/AuthService';
import { validatePasswordStrength } from '../utils/password';
import { authenticate, AuthRequest } from '../middleware/auth';
import {
  getPasswordResetService,
  RateLimitError,
  InvalidTokenError,
  InvalidPasswordError,
} from '../services/PasswordResetService';

const router = Router();

/**
 * POST /v1/auth/register
 * Create new user, organization, and membership
 */
router.post('/register', async (req, res: Response) => {
  try {
    const { email, password, name, organizationName } = req.body;

    // Validate required fields
    if (!email || !organizationName) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and organization name are required',
        },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email format',
        },
      });
    }

    // Validate password if provided
    if (password) {
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'WEAK_PASSWORD',
            message: passwordValidation.errors[0],
            details: passwordValidation.errors,
          },
        });
      }
    }

    const result = await getAuthService().register({
      email,
      password,
      name,
      organizationName,
    });

    res.status(201).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        expiresIn: result.tokens.expiresIn,
      },
    });
  } catch (error) {
    handleAuthError(error, res);
  }
});

/**
 * POST /v1/auth/login
 * Authenticate with email and password
 */
router.post('/login', async (req, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required',
        },
      });
    }

    const result = await getAuthService().login(email, password);

    res.json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        expiresIn: result.tokens.expiresIn,
      },
    });
  } catch (error) {
    handleAuthError(error, res);
  }
});

/**
 * POST /v1/auth/magic-link
 * Request a magic link for login
 */
router.post('/magic-link', async (req, res: Response) => {
  try {
    const { email, orgId } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email is required',
        },
      });
    }

    // Always return 202 to prevent email enumeration
    try {
      const token = await getAuthService().createMagicLink(email, orgId);
      
      // In production, send email with the magic link
      // For now, log the token in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`Magic link token for ${email}: ${token}`);
        console.log(`Full URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/verify?token=${token}`);
      }
      
      // TODO: Send email with magic link
      // await emailService.sendMagicLink(email, token);
    } catch {
      // Silently ignore errors to prevent email enumeration
    }

    res.status(202).json({
      success: true,
      message: 'If an account exists with this email, a magic link has been sent.',
    });
  } catch (error) {
    // Always return 202
    res.status(202).json({
      success: true,
      message: 'If an account exists with this email, a magic link has been sent.',
    });
  }
});

/**
 * POST /v1/auth/magic-link/verify
 * Verify a magic link token and return tokens
 */
router.post('/magic-link/verify', async (req, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Token is required',
        },
      });
    }

    const result = await getAuthService().verifyMagicLink(token);

    res.json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        expiresIn: result.tokens.expiresIn,
      },
    });
  } catch (error) {
    handleAuthError(error, res);
  }
});

/**
 * POST /v1/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Refresh token is required',
        },
      });
    }

    const tokens = await getAuthService().refreshTokens(refreshToken);

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      },
    });
  } catch (error) {
    handleAuthError(error, res);
  }
});

/**
 * POST /v1/auth/logout
 * Logout and invalidate session
 */
router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // In a full implementation, we would:
    // 1. Get the refresh token from request
    // 2. Add it to a blacklist in Redis
    // 3. Remove the session from the database
    
    // For now, just return success
    // The client should remove tokens from storage
    
    res.status(204).send();
  } catch (error) {
    handleAuthError(error, res);
  }
});

/**
 * GET /v1/auth/me
 * Get current authenticated user
 */
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    const user = await getAuthService().getCurrentUser(req.user.id);

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    handleAuthError(error, res);
  }
});

// ==============================================
// Password Reset Routes
// ==============================================

/**
 * POST /v1/auth/password/forgot
 * Request a password reset link
 * Always returns 202 to prevent email enumeration
 */
router.post('/password/forgot', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email is required',
        },
      });
    }

    // Get IP address and user agent for rate limiting
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip;
    const userAgent = req.headers['user-agent'];

    try {
      await getPasswordResetService().requestReset(email, ipAddress, userAgent);
    } catch (error) {
      if (error instanceof RateLimitError) {
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many reset requests. Please try again later.',
          },
        });
      }
      // Silently handle other errors to prevent enumeration
      console.error('Password reset request error:', error);
    }

    // Always return 202 regardless of whether user exists
    res.status(202).json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
    });
  } catch (error) {
    // Even on unexpected errors, return generic success message
    res.status(202).json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
    });
  }
});

/**
 * GET /v1/auth/password/validate-token
 * Validate a password reset token
 */
router.get('/password/validate-token', async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Token is required',
        },
      });
    }

    const result = await getPasswordResetService().validateToken(token);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to validate token',
      },
    });
  }
});

/**
 * POST /v1/auth/password/reset
 * Reset password using a valid token
 */
router.post('/password/reset', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Token is required',
        },
      });
    }

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'New password is required',
        },
      });
    }

    // Get IP address for audit logging
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip;

    await getPasswordResetService().resetPassword(token, newPassword, ipAddress);

    res.json({
      success: true,
      message: 'Password has been reset. Please log in with your new password.',
    });
  } catch (error) {
    if (error instanceof InvalidTokenError) {
      const statusCode = error.reason === 'invalid' ? 404 : 410;
      const errorCode = {
        'invalid': 'TOKEN_INVALID',
        'expired': 'TOKEN_EXPIRED',
        'used': 'TOKEN_USED',
      }[error.reason];

      return res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message: error.message,
        },
      });
    }

    if (error instanceof InvalidPasswordError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PASSWORD',
          message: error.message,
        },
      });
    }

    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to reset password',
      },
    });
  }
});

/**
 * Handle auth errors with appropriate status codes
 */
function handleAuthError(error: unknown, res: Response): void {
  console.error('Auth error:', error);

  if (error instanceof AuthError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}

export default router;
