import Redis from 'ioredis';

/**
 * Cache invalidation patterns
 */
export type CacheInvalidationPattern = 
  | { type: 'tenant'; slug: string }
  | { type: 'animal'; orgId: string; animalId?: string }
  | { type: 'animals_list'; orgId: string }
  | { type: 'sync_state'; orgId: string; dataSourceId: string };

/**
 * Cache invalidation message
 */
interface InvalidationMessage {
  pattern: CacheInvalidationPattern;
  timestamp: number;
  source: string;
}

/**
 * Cache Invalidation Service using Redis Pub/Sub
 * 
 * This service provides distributed cache invalidation across multiple
 * API instances using Redis pub/sub.
 */
export class CacheInvalidationService {
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private readonly channel = 'pawser:cache:invalidate';
  private readonly instanceId: string;
  private listeners: Map<string, Set<(pattern: CacheInvalidationPattern) => void>> = new Map();

  constructor() {
    this.instanceId = `api-${process.pid}-${Date.now()}`;
    this.initializeRedis();
  }

  private initializeRedis(): void {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times: number) => {
        if (times > 3) {
          console.warn('Redis connection failed for cache invalidation');
          return null;
        }
        return Math.min(times * 50, 2000);
      },
    };

    if (process.env.REDIS_HOST) {
      try {
        this.publisher = new Redis(redisConfig);
        this.subscriber = new Redis(redisConfig);

        this.publisher.on('error', (err) => {
          console.error('Cache invalidation publisher error:', err);
        });

        this.subscriber.on('error', (err) => {
          console.error('Cache invalidation subscriber error:', err);
        });

        // Subscribe to invalidation channel
        this.subscriber.subscribe(this.channel, (err) => {
          if (err) {
            console.error('Failed to subscribe to cache invalidation channel:', err);
          } else {
            console.log(`Subscribed to cache invalidation channel: ${this.channel}`);
          }
        });

        // Handle incoming invalidation messages
        this.subscriber.on('message', (channel, message) => {
          if (channel === this.channel) {
            this.handleInvalidationMessage(message);
          }
        });
      } catch (error) {
        console.warn('Failed to initialize Redis for cache invalidation:', error);
      }
    }
  }

  /**
   * Publish a cache invalidation message
   */
  async invalidate(pattern: CacheInvalidationPattern): Promise<void> {
    const message: InvalidationMessage = {
      pattern,
      timestamp: Date.now(),
      source: this.instanceId,
    };

    // Always call local listeners (for single-instance deployments)
    this.notifyLocalListeners(pattern);

    // Publish to Redis if available
    if (this.publisher) {
      try {
        await this.publisher.publish(this.channel, JSON.stringify(message));
      } catch (error) {
        console.error('Failed to publish cache invalidation:', error);
      }
    }
  }

  /**
   * Handle incoming invalidation message
   */
  private handleInvalidationMessage(messageStr: string): void {
    try {
      const message = JSON.parse(messageStr) as InvalidationMessage;

      // Skip messages from self (already handled locally)
      if (message.source === this.instanceId) {
        return;
      }

      this.notifyLocalListeners(message.pattern);
    } catch (error) {
      console.error('Failed to parse cache invalidation message:', error);
    }
  }

  /**
   * Notify local listeners of invalidation
   */
  private notifyLocalListeners(pattern: CacheInvalidationPattern): void {
    const key = this.getPatternKey(pattern);
    const listeners = this.listeners.get(key);

    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(pattern);
        } catch (error) {
          console.error('Cache invalidation listener error:', error);
        }
      }
    }

    // Also notify wildcard listeners
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      for (const listener of wildcardListeners) {
        try {
          listener(pattern);
        } catch (error) {
          console.error('Cache invalidation wildcard listener error:', error);
        }
      }
    }
  }

  /**
   * Get pattern key for listener registration
   */
  private getPatternKey(pattern: CacheInvalidationPattern): string {
    switch (pattern.type) {
      case 'tenant':
        return `tenant:${pattern.slug}`;
      case 'animal':
        return pattern.animalId 
          ? `animal:${pattern.orgId}:${pattern.animalId}`
          : `animal:${pattern.orgId}:*`;
      case 'animals_list':
        return `animals_list:${pattern.orgId}`;
      case 'sync_state':
        return `sync_state:${pattern.orgId}:${pattern.dataSourceId}`;
      default:
        return '*';
    }
  }

  /**
   * Subscribe to cache invalidation events
   */
  subscribe(
    patternKey: string,
    listener: (pattern: CacheInvalidationPattern) => void
  ): () => void {
    if (!this.listeners.has(patternKey)) {
      this.listeners.set(patternKey, new Set());
    }
    this.listeners.get(patternKey)!.add(listener);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(patternKey);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.listeners.delete(patternKey);
        }
      }
    };
  }

  /**
   * Subscribe to all invalidation events
   */
  subscribeAll(listener: (pattern: CacheInvalidationPattern) => void): () => void {
    return this.subscribe('*', listener);
  }

  /**
   * Invalidate tenant cache
   */
  async invalidateTenant(slug: string): Promise<void> {
    await this.invalidate({ type: 'tenant', slug });
  }

  /**
   * Invalidate animal cache
   */
  async invalidateAnimal(orgId: string, animalId?: string): Promise<void> {
    await this.invalidate({ type: 'animal', orgId, animalId });
  }

  /**
   * Invalidate animals list cache for an org
   */
  async invalidateAnimalsList(orgId: string): Promise<void> {
    await this.invalidate({ type: 'animals_list', orgId });
  }

  /**
   * Invalidate sync state cache
   */
  async invalidateSyncState(orgId: string, dataSourceId: string): Promise<void> {
    await this.invalidate({ type: 'sync_state', orgId, dataSourceId });
  }

  /**
   * Close Redis connections
   */
  async close(): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.unsubscribe(this.channel);
      this.subscriber.disconnect();
    }
    if (this.publisher) {
      this.publisher.disconnect();
    }
  }
}

// Singleton instance
let cacheInvalidationService: CacheInvalidationService | null = null;

export function getCacheInvalidationService(): CacheInvalidationService {
  if (!cacheInvalidationService) {
    cacheInvalidationService = new CacheInvalidationService();
  }
  return cacheInvalidationService;
}

// Export default instance
export default getCacheInvalidationService;
