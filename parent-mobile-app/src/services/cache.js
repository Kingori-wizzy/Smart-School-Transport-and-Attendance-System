import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEYS = {
  CHILDREN: '@cache_children',
  ATTENDANCE: (childId) => `@cache_attendance_${childId}`,
  LOCATION: (childId) => `@cache_location_${childId}`,
  NOTIFICATIONS: '@cache_notifications',
  RECENT_ALERTS: '@cache_recent_alerts',
  CHILD_STATUS: '@cache_child_status',
  MESSAGES: (conversationId) => `@cache_messages_${conversationId}`,
  TRANSPORT: '@cache_transport',
  PROFILE: '@cache_profile',
};

const CACHE_DURATION = {
  SHORT: 5 * 60 * 1000,      // 5 minutes
  MEDIUM: 30 * 60 * 1000,     // 30 minutes
  LONG: 24 * 60 * 60 * 1000,  // 24 hours
};

const cache = {
  // Save data to cache - ensure key is string
  async set(key, data, duration = CACHE_DURATION.MEDIUM) {
    try {
      // Ensure key is a string
      const stringKey = typeof key === 'string' ? key : String(key);
      
      const cacheItem = {
        data,
        timestamp: Date.now(),
        expiry: duration,
      };
      await AsyncStorage.setItem(stringKey, JSON.stringify(cacheItem));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  },

  // Get data from cache - ensure key is string
  async get(key) {
    try {
      // Ensure key is a string
      const stringKey = typeof key === 'string' ? key : String(key);
      
      const cached = await AsyncStorage.getItem(stringKey);
      if (!cached) return null;

      const { data, timestamp, expiry } = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is still valid
      if (now - timestamp < expiry) {
        return data;
      }

      // Cache expired - remove it
      await AsyncStorage.removeItem(stringKey);
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  },

  // Remove specific cache - ensure key is string
  async remove(key) {
    try {
      const stringKey = typeof key === 'string' ? key : String(key);
      await AsyncStorage.removeItem(stringKey);
      return true;
    } catch (error) {
      console.error('Cache remove error:', error);
      return false;
    }
  },

  // Clear all cache
  async clearAll() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('@cache_'));
      await AsyncStorage.multiRemove(cacheKeys);
      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  },

  // Clear expired cache
  async clearExpired() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('@cache_'));
      
      for (const key of cacheKeys) {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          const { timestamp, expiry } = JSON.parse(cached);
          if (Date.now() - timestamp >= expiry) {
            await AsyncStorage.removeItem(key);
          }
        }
      }
      return true;
    } catch (error) {
      console.error('Clear expired error:', error);
      return false;
    }
  },

  // Helper methods for specific data types - all return string keys
  keys: {
    children: () => CACHE_KEYS.CHILDREN,
    attendance: (childId) => CACHE_KEYS.ATTENDANCE(childId),
    location: (childId) => CACHE_KEYS.LOCATION(childId),
    notifications: () => CACHE_KEYS.NOTIFICATIONS,
    recentAlerts: () => CACHE_KEYS.RECENT_ALERTS,
    childStatus: () => CACHE_KEYS.CHILD_STATUS,
    messages: (conversationId) => CACHE_KEYS.MESSAGES(conversationId),
    transport: () => CACHE_KEYS.TRANSPORT,
    profile: () => CACHE_KEYS.PROFILE,
  },

  children: {
    async save(data) {
      return cache.set(CACHE_KEYS.CHILDREN, data, CACHE_DURATION.SHORT);
    },
    async get() {
      return cache.get(CACHE_KEYS.CHILDREN);
    },
    async clear() {
      return cache.remove(CACHE_KEYS.CHILDREN);
    },
  },

  attendance: {
    async save(childId, data) {
      return cache.set(CACHE_KEYS.ATTENDANCE(childId), data, CACHE_DURATION.SHORT);
    },
    async get(childId) {
      return cache.get(CACHE_KEYS.ATTENDANCE(childId));
    },
    async clear(childId) {
      return cache.remove(CACHE_KEYS.ATTENDANCE(childId));
    },
  },

  location: {
    async save(childId, data) {
      return cache.set(CACHE_KEYS.LOCATION(childId), data, CACHE_DURATION.SHORT);
    },
    async get(childId) {
      return cache.get(CACHE_KEYS.LOCATION(childId));
    },
    async clear(childId) {
      return cache.remove(CACHE_KEYS.LOCATION(childId));
    },
  },

  notifications: {
    async save(data) {
      return cache.set(CACHE_KEYS.NOTIFICATIONS, data, CACHE_DURATION.SHORT);
    },
    async get() {
      return cache.get(CACHE_KEYS.NOTIFICATIONS);
    },
    async clear() {
      return cache.remove(CACHE_KEYS.NOTIFICATIONS);
    },
  },

  recentAlerts: {
    async save(data) {
      return cache.set(CACHE_KEYS.RECENT_ALERTS, data, CACHE_DURATION.SHORT);
    },
    async get() {
      return cache.get(CACHE_KEYS.RECENT_ALERTS);
    },
    async clear() {
      return cache.remove(CACHE_KEYS.RECENT_ALERTS);
    },
  },

  childStatus: {
    async save(data) {
      return cache.set(CACHE_KEYS.CHILD_STATUS, data, CACHE_DURATION.SHORT);
    },
    async get() {
      return cache.get(CACHE_KEYS.CHILD_STATUS);
    },
    async clear() {
      return cache.remove(CACHE_KEYS.CHILD_STATUS);
    },
  },

  transport: {
    async save(data) {
      return cache.set(CACHE_KEYS.TRANSPORT, data, CACHE_DURATION.MEDIUM);
    },
    async get() {
      return cache.get(CACHE_KEYS.TRANSPORT);
    },
    async clear() {
      return cache.remove(CACHE_KEYS.TRANSPORT);
    },
  },

  profile: {
    async save(data) {
      return cache.set(CACHE_KEYS.PROFILE, data, CACHE_DURATION.LONG);
    },
    async get() {
      return cache.get(CACHE_KEYS.PROFILE);
    },
    async clear() {
      return cache.remove(CACHE_KEYS.PROFILE);
    },
  },
};

export default cache;
export { CACHE_KEYS, CACHE_DURATION };