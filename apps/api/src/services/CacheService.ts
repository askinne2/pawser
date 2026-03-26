import Redis from 'ioredis';
import { Animal } from '@pawser/shared';

// In-memory fallback if Redis is not available
const memoryCache = new Map<string, { data: unknown; expiresAt: number }>();

// Redis client (optional)
let redisClient: Redis | null = null;

if (process.env.REDIS_URL || process.env.REDIS_HOST) {
  redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times: number) => {
      if (times > 3) {
        console.warn('Redis connection failed, falling back to memory cache');
        redisClient = null;
        return null;
      }
      return Math.min(times * 50, 2000);
    },
  });

  redisClient.on('error', (err: Error) => {
    console.error('Redis error:', err);
    redisClient = null; // Fallback to memory store
  });
}

/**
 * Cache service with tenant-scoped keys
 * Uses Redis if available, falls back to in-memory cache
 */
export class CacheService {
  /**
   * Generate tenant-scoped cache key
   */
  private getKey(organizationId: string, key: string): string {
    return `tenant:${organizationId}:${key}`;
  }

  /**
   * Get cached animals for organization
   */
  async getAnimals(organizationId: string): Promise<Animal[] | null> {
    const key = this.getKey(organizationId, 'animals');

    try {
      if (redisClient) {
        const cached = await redisClient.get(key);
        if (cached) {
          return JSON.parse(cached) as Animal[];
        }
      } else {
        const cached = memoryCache.get(key);
        if (cached && cached.expiresAt > Date.now()) {
          return cached.data as Animal[];
        }
        memoryCache.delete(key);
      }
    } catch (error) {
      console.error('Cache get error:', error);
    }

    return null;
  }

  /**
   * Set cached animals for organization
   */
  async setAnimals(organizationId: string, animals: Animal[], ttlSeconds = 300): Promise<void> {
    const key = this.getKey(organizationId, 'animals');

    try {
      if (redisClient) {
        await redisClient.setex(key, ttlSeconds, JSON.stringify(animals));
      } else {
        memoryCache.set(key, {
          data: animals,
          expiresAt: Date.now() + ttlSeconds * 1000,
        });
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Get cached animal by ID
   */
  async getAnimal(organizationId: string, animalId: string): Promise<Animal | null> {
    const key = this.getKey(organizationId, `animal:${animalId}`);

    try {
      if (redisClient) {
        const cached = await redisClient.get(key);
        if (cached) {
          return JSON.parse(cached) as Animal;
        }
      } else {
        const cached = memoryCache.get(key);
        if (cached && cached.expiresAt > Date.now()) {
          return cached.data as Animal;
        }
        memoryCache.delete(key);
      }
    } catch (error) {
      console.error('Cache get error:', error);
    }

    return null;
  }

  /**
   * Set cached animal
   */
  async setAnimal(
    organizationId: string,
    animalId: string,
    animal: Animal,
    ttlSeconds = 300
  ): Promise<void> {
    const key = this.getKey(organizationId, `animal:${animalId}`);

    try {
      if (redisClient) {
        await redisClient.setex(key, ttlSeconds, JSON.stringify(animal));
      } else {
        memoryCache.set(key, {
          data: animal,
          expiresAt: Date.now() + ttlSeconds * 1000,
        });
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Clear cache for organization
   */
  async clear(organizationId: string): Promise<void> {
    const pattern = this.getKey(organizationId, '*');

    try {
      if (redisClient) {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          await redisClient.del(...keys);
        }
      } else {
        // Clear from memory cache
        for (const key of memoryCache.keys()) {
          if (key.startsWith(`tenant:${organizationId}:`)) {
            memoryCache.delete(key);
          }
        }
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async clearAll(): Promise<void> {
    try {
      if (redisClient) {
        await redisClient.flushdb();
      } else {
        memoryCache.clear();
      }
    } catch (error) {
      console.error('Cache clear all error:', error);
    }
  }
}

export const cacheService = new CacheService();

