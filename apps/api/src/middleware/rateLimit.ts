import { Request, Response, NextFunction } from 'express';
import { TenantRequest } from './tenant';
import Redis from 'ioredis';

// In-memory fallback if Redis is not available
const memoryStore = new Map<string, { count: number; resetTime: number }>();

// Redis client (optional)
let redisClient: Redis | null = null;

if (process.env.REDIS_URL) {
  redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  });

  redisClient.on('error', (err: Error) => {
    console.error('Redis error:', err);
    redisClient = null; // Fallback to memory store
  });
}

/**
 * Rate limit configuration per subscription tier
 */
const RATE_LIMITS: Record<string, { requests: number; windowMs: number }> = {
  basic: { requests: 100, windowMs: 60 * 1000 }, // 100 requests per minute
  pro: { requests: 500, windowMs: 60 * 1000 }, // 500 requests per minute
  enterprise: { requests: 2000, windowMs: 60 * 1000 }, // 2000 requests per minute
};

/**
 * Per-tenant rate limiting middleware
 * Uses Redis if available, falls back to in-memory store
 */
export async function rateLimit(
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.tenant) {
    return next();
  }

  const organizationId = req.tenant.orgId || req.tenant.tenantId;
  // Default to basic tier - subscription info not in tenant context
  const tier = 'basic';
  const limit = RATE_LIMITS[tier] || RATE_LIMITS.basic;

  const key = `rate_limit:${organizationId}`;
  const now = Date.now();

  try {
    let count: number;
    let resetTime: number;

    if (redisClient) {
      // Use Redis
      const current = await redisClient.get(key);
      if (current) {
        const data = JSON.parse(current);
        if (data.resetTime > now) {
          count = data.count;
          resetTime = data.resetTime;
        } else {
          // Window expired, reset
          count = 0;
          resetTime = now + limit.windowMs;
        }
      } else {
        count = 0;
        resetTime = now + limit.windowMs;
      }

      count++;
      await redisClient.setex(
        key,
        Math.ceil((resetTime - now) / 1000),
        JSON.stringify({ count, resetTime })
      );
    } else {
      // Use memory store
      const stored = memoryStore.get(key);
      if (stored && stored.resetTime > now) {
        count = stored.count + 1;
        resetTime = stored.resetTime;
      } else {
        count = 1;
        resetTime = now + limit.windowMs;
      }
      memoryStore.set(key, { count, resetTime });
    }

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', limit.requests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit.requests - count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(resetTime).toISOString());

    if (count > limit.requests) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Limit: ${limit.requests} requests per ${limit.windowMs / 1000} seconds`,
        retryAfter: Math.ceil((resetTime - now) / 1000),
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Rate limit error:', error);
    // On error, allow request to proceed (fail open)
    next();
  }
}

