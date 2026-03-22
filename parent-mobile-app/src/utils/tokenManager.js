import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Storage keys
const STORAGE_KEYS = {
  AUTH_TOKEN: '@auth_token',
  REFRESH_TOKEN: '@refresh_token',
  USER: '@user',
  USER_ROLE: '@user_role',
  TOKEN_EXPIRY: '@token_expiry',
};

// In-memory cache for faster access
let cachedToken = null;
let cachedUser = null;
let tokenExpiryTimer = null;

class TokenManager {
  /**
   * Set auth token
   * @param {string} token - JWT token
   * @param {number} expiresIn - Expiry time in seconds (optional)
   */
  static async setToken(token, expiresIn = null) {
    try {
      if (!token) {
        await this.clearToken();
        return false;
      }
      
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      cachedToken = token;
      
      // Calculate and store expiry time if provided
      if (expiresIn) {
        const expiryTime = Date.now() + (expiresIn * 1000);
        await AsyncStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());
        
        // Set timer to auto-clear token when expired
        if (tokenExpiryTimer) clearTimeout(tokenExpiryTimer);
        tokenExpiryTimer = setTimeout(() => {
          this.clearToken();
        }, expiresIn * 1000);
      }
      
      console.log('✅ Auth token stored');
      return true;
    } catch (error) {
      console.error('Error setting token:', error);
      return false;
    }
  }

  /**
   * Get auth token
   * @returns {Promise<string|null>}
   */
  static async getToken() {
    try {
      // Return cached token if available
      if (cachedToken) return cachedToken;
      
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (token) {
        cachedToken = token;
      }
      return token;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  /**
   * Check if token is valid (exists and not expired)
   * @returns {Promise<boolean>}
   */
  static async isTokenValid() {
    try {
      const token = await this.getToken();
      if (!token) return false;
      
      const expiryStr = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
      if (expiryStr) {
        const expiryTime = parseInt(expiryStr, 10);
        if (Date.now() >= expiryTime) {
          await this.clearToken();
          return false;
        }
      }
      
      // Optional: Decode token to check expiry
      try {
        const payload = this.decodeToken(token);
        if (payload && payload.exp) {
          const expiryDate = new Date(payload.exp * 1000);
          if (expiryDate <= new Date()) {
            await this.clearToken();
            return false;
          }
        }
      } catch (e) {
        // If can't decode, assume valid
      }
      
      return true;
    } catch (error) {
      console.error('Error checking token validity:', error);
      return false;
    }
  }

  /**
   * Decode JWT token without verification
   * @param {string} token - JWT token
   * @returns {Object|null}
   */
  static decodeToken(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = parts[1];
      return JSON.parse(atob(payload));
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Clear auth token
   */
  static async clearToken() {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.TOKEN_EXPIRY
      ]);
      cachedToken = null;
      if (tokenExpiryTimer) {
        clearTimeout(tokenExpiryTimer);
        tokenExpiryTimer = null;
      }
      console.log('✅ Auth token cleared');
      return true;
    } catch (error) {
      console.error('Error clearing token:', error);
      return false;
    }
  }

  /**
   * Set refresh token
   * @param {string} token - Refresh token
   */
  static async setRefreshToken(token) {
    try {
      if (token) {
        await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      }
    } catch (error) {
      console.error('Error setting refresh token:', error);
    }
  }

  /**
   * Get refresh token
   * @returns {Promise<string|null>}
   */
  static async getRefreshToken() {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  /**
   * Set user data
   * @param {Object} user - User object
   */
  static async setUser(user) {
    try {
      if (user) {
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        if (user.role) {
          await AsyncStorage.setItem(STORAGE_KEYS.USER_ROLE, user.role);
        }
        cachedUser = user;
      } else {
        await AsyncStorage.multiRemove([STORAGE_KEYS.USER, STORAGE_KEYS.USER_ROLE]);
        cachedUser = null;
      }
    } catch (error) {
      console.error('Error setting user:', error);
    }
  }

  /**
   * Get user data
   * @returns {Promise<Object|null>}
   */
  static async getUser() {
    try {
      if (cachedUser) return cachedUser;
      
      const userStr = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      if (userStr) {
        cachedUser = JSON.parse(userStr);
        return cachedUser;
      }
      return null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  /**
   * Get user role
   * @returns {Promise<string|null>}
   */
  static async getUserRole() {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.USER_ROLE);
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  }

  /**
   * Clear all auth data (logout)
   */
  static async clearAll() {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER,
        STORAGE_KEYS.USER_ROLE,
        STORAGE_KEYS.TOKEN_EXPIRY
      ]);
      cachedToken = null;
      cachedUser = null;
      if (tokenExpiryTimer) {
        clearTimeout(tokenExpiryTimer);
        tokenExpiryTimer = null;
      }
      console.log('✅ All auth data cleared');
      return true;
    } catch (error) {
      console.error('Error clearing auth data:', error);
      return false;
    }
  }

  /**
   * Get auth headers for API requests
   * @returns {Promise<Object>}
   */
  static async getAuthHeaders() {
    const token = await this.getToken();
    if (token) {
      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
    }
    return {
      'Content-Type': 'application/json',
    };
  }
}

export default TokenManager;