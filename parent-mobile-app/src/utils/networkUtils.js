import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';

/**
 * Check current network status
 * @returns {Promise<{isConnected: boolean, isInternetReachable: boolean, type: string}>}
 */
export const checkNetwork = async () => {
  try {
    const state = await NetInfo.fetch();
    return {
      isConnected: state.isConnected,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
      details: state.details,
    };
  } catch (error) {
    console.error('Error checking network:', error);
    return {
      isConnected: false,
      isInternetReachable: false,
      type: 'unknown',
    };
  }
};

/**
 * Check if device has internet connection
 * @returns {Promise<boolean>}
 */
export const isConnected = async () => {
  const { isConnected } = await checkNetwork();
  return isConnected === true;
};

/**
 * Wait for network to become available
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<boolean>}
 */
export const waitForNetwork = async (timeout = 30000) => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const { isConnected } = await checkNetwork();
    if (isConnected) return true;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return false;
};

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise<any>}
 */
export const withRetry = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.log(`Retry attempt ${i + 1}/${maxRetries} failed:`, error.message);
      
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

/**
 * Retry network requests with network check
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise<any>}
 */
export const withNetworkRetry = async (fn, maxRetries = 3) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    // Check network before retry
    const networkAvailable = await isConnected();
    if (!networkAvailable) {
      console.log(`Waiting for network... (attempt ${i + 1}/${maxRetries})`);
      await waitForNetwork(5000);
      continue;
    }
    
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.log(`Network retry ${i + 1}/${maxRetries} failed:`, error.message);
      
      // Don't retry on 401 or 403
      if (error.status === 401 || error.status === 403) {
        throw error;
      }
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
      }
    }
  }
  
  throw lastError;
};

/**
 * Create headers for API request with auth token
 * @param {string} token - Auth token
 * @param {Object} customHeaders - Additional headers
 * @returns {Object}
 */
export const createHeaders = (token, customHeaders = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Platform': Platform.OS,
    ...customHeaders,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

/**
 * Create FormData headers for file upload
 * @param {string} token - Auth token
 * @returns {Object}
 */
export const getUploadHeaders = (token) => {
  const headers = {
    'Accept': 'application/json',
    'Platform': Platform.OS,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

/**
 * Check if network type is cellular
 * @returns {Promise<boolean>}
 */
export const isCellular = async () => {
  const { type } = await checkNetwork();
  return type === 'cellular';
};

/**
 * Check if network type is WiFi
 * @returns {Promise<boolean>}
 */
export const isWifi = async () => {
  const { type } = await checkNetwork();
  return type === 'wifi';
};

/**
 * Get network quality (for cellular connections)
 * @returns {Promise<string>}
 */
export const getNetworkQuality = async () => {
  const { details, type } = await checkNetwork();
  
  if (type !== 'cellular') return 'good';
  
  // Check cellular generation
  const cellularGeneration = details?.cellularGeneration;
  if (cellularGeneration === '4g' || cellularGeneration === '5g') {
    return 'good';
  }
  if (cellularGeneration === '3g') {
    return 'fair';
  }
  return 'poor';
};

/**
 * Add network status listener
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export const addNetworkListener = (callback) => {
  return NetInfo.addEventListener(state => {
    callback({
      isConnected: state.isConnected,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
    });
  });
};

export default {
  checkNetwork,
  isConnected,
  waitForNetwork,
  withRetry,
  withNetworkRetry,
  createHeaders,
  getUploadHeaders,
  isCellular,
  isWifi,
  getNetworkQuality,
  addNetworkListener,
};