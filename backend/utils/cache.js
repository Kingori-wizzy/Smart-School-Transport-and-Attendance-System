// File: backend/utils/cache.js

const redis = require('redis');
const { promisify } = require('util');

/**
 * Production-ready cache utility with Redis support
 * Falls back to in-memory cache if Redis is unavailable
 */
class CacheService {
  constructor() {
    this.redisClient = null;
    this.memoryCache = new Map();
    this.useRedis = false;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
    
    // Try to connect to Redis if URL is provided
    this.initRedis();
    
    // Log cache mode
    console.log(`📦 Cache service initialized: ${this.useRedis ? 'REDIS' : 'MEMORY'} mode`);
  }

  /**
   * Initialize Redis connection
   */
  initRedis() {
    const redisUrl = process.env.REDIS_URL || process.env.REDIS_TLS_URL;
    
    if (!redisUrl) {
      console.log('⚠️ No Redis URL provided, using in-memory cache');
      return;
    }

    try {
      const redisOptions = {
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.log('❌ Redis max retries reached, falling back to memory cache');
              this.useRedis = false;
              return false;
            }
            return Math.min(retries * 100, 3000);
          },
          connectTimeout: 10000,
          keepAlive: 5000
        },
        maxRetriesPerRequest: 3
      };

      // Enable TLS for Heroku/Cloud Redis
      if (redisUrl.includes('rediss://') || process.env.REDIS_TLS) {
        redisOptions.socket.tls = true;
        redisOptions.socket.rejectUnauthorized = false;
      }

      this.redisClient = redis.createClient(redisOptions);

      // Redis event handlers
      this.redisClient.on('connect', () => {
        console.log('✅ Redis connected successfully');
        this.useRedis = true;
      });

      this.redisClient.on('error', (err) => {
        console.error('❌ Redis error:', err.message);
        if (this.useRedis) {
          console.log('⚠️ Falling back to memory cache');
          this.useRedis = false;
        }
      });

      this.redisClient.on('end', () => {
        console.log('🔴 Redis connection closed');
        this.useRedis = false;
      });

      // Connect to Redis
      this.redisClient.connect().catch(err => {
        console.error('❌ Redis connection failed:', err.message);
        this.useRedis = false;
      });

      // Promisify Redis commands
      this.redisGet = promisify(this.redisClient.get).bind(this.redisClient);
      this.redisSet = promisify(this.redisClient.set).bind(this.redisClient);
      this.redisDel = promisify(this.redisClient.del).bind(this.redisClient);
      this.redisExpire = promisify(this.redisClient.expire).bind(this.redisClient);

    } catch (error) {
      console.error('❌ Redis initialization error:', error.message);
      this.useRedis = false;
    }
  }

  /**
   * Generate cache key with prefix
   * @param {string} key - Base key
   * @returns {string} - Prefixed key
   */
  getKey(key) {
    const prefix = process.env.CACHE_PREFIX || 'smart_school:';
    return `${prefix}${key}`;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to store
   * @param {number} ttl - Time to live in seconds (default: 300)
   * @returns {Promise<boolean>} - Success status
   */
  async set(key, value, ttl = 300) {
    try {
      const cacheKey = this.getKey(key);
      const serializedValue = JSON.stringify({
        data: value,
        timestamp: Date.now(),
        expiresAt: Date.now() + (ttl * 1000)
      });

      if (this.useRedis && this.redisClient?.isReady) {
        await this.redisClient.set(cacheKey, serializedValue, {
          EX: ttl
        });
      } else {
        // Memory cache with TTL
        this.memoryCache.set(cacheKey, {
          value: serializedValue,
          expiresAt: Date.now() + (ttl * 1000)
        });

        // Auto cleanup
        setTimeout(() => {
          this.memoryCache.delete(cacheKey);
        }, ttl * 1000);
      }

      this.stats.sets++;
      return true;
    } catch (error) {
      console.error('❌ Cache set error:', error);
      return false;
    }
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} - Cached value or null
   */
  async get(key) {
    try {
      const cacheKey = this.getKey(key);
      let value = null;

      if (this.useRedis && this.redisClient?.isReady) {
        value = await this.redisClient.get(cacheKey);
      } else {
        const memoryItem = this.memoryCache.get(cacheKey);
        if (memoryItem) {
          if (Date.now() <= memoryItem.expiresAt) {
            value = memoryItem.value;
          } else {
            this.memoryCache.delete(cacheKey);
          }
        }
      }

      if (!value) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      
      try {
        const parsed = JSON.parse(value);
        return parsed.data;
      } catch {
        return value;
      }

    } catch (error) {
      console.error('❌ Cache get error:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Success status
   */
  async del(key) {
    try {
      const cacheKey = this.getKey(key);

      if (this.useRedis && this.redisClient?.isReady) {
        await this.redisClient.del(cacheKey);
      } else {
        this.memoryCache.delete(cacheKey);
      }

      this.stats.deletes++;
      return true;
    } catch (error) {
      console.error('❌ Cache delete error:', error);
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   * @param {string} pattern - Key pattern (e.g., 'students:*')
   * @returns {Promise<number>} - Number of keys deleted
   */
  async delByPattern(pattern) {
    try {
      const cachePattern = this.getKey(pattern);
      let deletedCount = 0;

      if (this.useRedis && this.redisClient?.isReady) {
        const keys = await this.redisClient.keys(cachePattern);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
          deletedCount = keys.length;
        }
      } else {
        // Memory cache pattern deletion
        const regex = new RegExp('^' + cachePattern.replace('*', '.*') + '$');
        for (const key of this.memoryCache.keys()) {
          if (regex.test(key)) {
            this.memoryCache.delete(key);
            deletedCount++;
          }
        }
      }

      this.stats.deletes += deletedCount;
      return deletedCount;
    } catch (error) {
      console.error('❌ Cache pattern delete error:', error);
      return 0;
    }
  }

  /**
   * Clear all cache
   * @returns {Promise<boolean>} - Success status
   */
  async clear() {
    try {
      if (this.useRedis && this.redisClient?.isReady) {
        await this.redisClient.flushDb();
      }
      this.memoryCache.clear();
      this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
      return true;
    } catch (error) {
      console.error('❌ Cache clear error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache stats
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
      : 0;

    return {
      mode: this.useRedis ? 'redis' : 'memory',
      redisConnected: this.useRedis && this.redisClient?.isReady || false,
      stats: {
        ...this.stats,
        hitRate: Math.round(hitRate * 100) / 100,
        memorySize: this.memoryCache.size
      },
      memoryKeys: Array.from(this.memoryCache.keys())
    };
  }

  /**
   * Check if key exists
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - True if exists
   */
  async exists(key) {
    try {
      const cacheKey = this.getKey(key);

      if (this.useRedis && this.redisClient?.isReady) {
        return await this.redisClient.exists(cacheKey) > 0;
      } else {
        const item = this.memoryCache.get(cacheKey);
        return !!(item && Date.now() <= item.expiresAt);
      }
    } catch (error) {
      console.error('❌ Cache exists error:', error);
      return false;
    }
  }

  /**
   * Get TTL of a key
   * @param {string} key - Cache key
   * @returns {Promise<number|null>} - TTL in seconds or null
   */
  async ttl(key) {
    try {
      const cacheKey = this.getKey(key);

      if (this.useRedis && this.redisClient?.isReady) {
        return await this.redisClient.ttl(cacheKey);
      } else {
        const item = this.memoryCache.get(cacheKey);
        if (item) {
          return Math.max(0, Math.floor((item.expiresAt - Date.now()) / 1000));
        }
        return -2; // Key does not exist
      }
    } catch (error) {
      console.error('❌ Cache ttl error:', error);
      return null;
    }
  }

  /**
   * Set with tags for group invalidation
   * @param {string} key - Cache key
   * @param {any} value - Value to store
   * @param {string[]} tags - Tags for grouping
   * @param {number} ttl - TTL in seconds
   */
  async setWithTags(key, value, tags = [], ttl = 300) {
    await this.set(key, value, ttl);
    
    // Store tags for later invalidation
    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      const tagKeys = await this.get(tagKey) || [];
      if (!tagKeys.includes(key)) {
        tagKeys.push(key);
        await this.set(tagKey, tagKeys, ttl * 2); // Tags last twice as long
      }
    }
  }

  /**
   * Invalidate cache by tags
   * @param {string[]} tags - Tags to invalidate
   * @returns {Promise<number>} - Number of keys invalidated
   */
  async invalidateTags(tags) {
    let invalidatedCount = 0;
    
    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      const keys = await this.get(tagKey) || [];
      
      for (const key of keys) {
        await this.del(key);
        invalidatedCount++;
      }
      
      await this.del(tagKey);
    }
    
    return invalidatedCount;
  }

  /**
   * Get or set cache (memoize pattern)
   * @param {string} key - Cache key
   * @param {Function} fn - Function to call if cache miss
   * @param {number} ttl - TTL in seconds
   * @returns {Promise<any>} - Cached or computed value
   */
  async remember(key, fn, ttl = 300) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fn();
    await this.set(key, value, ttl);
    return value;
  }
}

// Create singleton instance
const cache = new CacheService();

module.exports = cache;