// File: frontend/src/utils/formatters.js

// ==================== DISTANCE & DURATION ====================

/**
 * Format distance in meters to readable string
 * @param {number} meters - Distance in meters
 * @returns {string} Formatted distance
 */
export const formatDistance = (meters) => {
  if (!meters && meters !== 0) return 'N/A';
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
};

/**
 * Format duration in seconds to readable string
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
export const formatDuration = (seconds) => {
  if (!seconds && seconds !== 0) return 'N/A';
  if (seconds < 60) {
    return `${Math.round(seconds)} sec`;
  }
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins} min ${secs > 0 ? `${secs} sec` : ''}`.trim();
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours} hr ${mins > 0 ? `${mins} min` : ''}`.trim();
};

/**
 * Format speed in km/h
 * @param {number} kmh - Speed in kilometers per hour
 * @returns {string} Formatted speed
 */
export const formatSpeed = (kmh) => {
  if (!kmh && kmh !== 0) return 'N/A';
  return `${Math.round(kmh)} km/h`;
};

// ==================== DATE & TIME ====================

/**
 * Format date and time
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date and time
 */
export const formatDateTime = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid date';
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

/**
 * Format time only
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted time
 */
export const formatTime = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid date';
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

/**
 * Format date only
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date
 */
export const formatDate = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid date';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Get relative time (e.g., "5 minutes ago")
 * @param {Date|string} date - Date to get relative time from
 * @returns {string} Relative time string
 */
export const getRelativeTime = (date) => {
  if (!date) return 'N/A';
  
  const now = new Date();
  const then = new Date(date);
  if (isNaN(then.getTime())) return 'Invalid date';
  
  const diffSeconds = Math.floor((now - then) / 1000);
  
  if (diffSeconds < 60) {
    return 'just now';
  }
  if (diffSeconds < 3600) {
    const mins = Math.floor(diffSeconds / 60);
    return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  }
  if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  const days = Math.floor(diffSeconds / 86400);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

// ==================== NUMBERS & PERCENTAGES ====================

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Format percentage
 * @param {number} value - Value to format as percentage
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage
 */
export const formatPercentage = (value, decimals = 0) => {
  if (value === null || value === undefined) return '0%';
  return `${value.toFixed(decimals)}%`;
};

// ==================== CURRENCY ====================

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: 'KES')
 * @returns {string} Formatted currency
 */
export const formatCurrency = (amount, currency = 'KES') => {
  if (amount === null || amount === undefined) return `${currency} 0`;
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// ==================== PHONE NUMBERS ====================

/**
 * Format phone number
 * @param {string} phone - Phone number to format
 * @returns {string} Formatted phone number
 */
export const formatPhone = (phone) => {
  if (!phone) return 'N/A';
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');
  
  // Format for Kenyan numbers (+254 XXX XXX XXX)
  if (cleaned.length === 12 && cleaned.startsWith('254')) {
    return `+${cleaned.slice(0,3)} ${cleaned.slice(3,6)} ${cleaned.slice(6,9)} ${cleaned.slice(9,12)}`;
  }
  // Format for local numbers (0XXX XXX XXX)
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    return `${cleaned.slice(0,4)} ${cleaned.slice(4,7)} ${cleaned.slice(7,10)}`;
  }
  // Format for international format
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{3})(\d{3})$/);
  if (match) {
    return `+${match[1]} ${match[2]} ${match[3]} ${match[4]}`;
  }
  return phone;
};

// ==================== BUS CAPACITY ====================

/**
 * Format bus capacity
 * @param {number} current - Current number of students
 * @param {number} total - Total capacity
 * @returns {string} Formatted capacity
 */
export const formatCapacity = (current, total) => {
  if (!total) return `${current || 0}/?`;
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  return `${current || 0}/${total} (${percentage}%)`;
};

// ==================== FILE SIZES ====================

/**
 * Format file size
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  if (!bytes) return 'Unknown';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// ==================== TEXT UTILITIES ====================

/**
 * Truncate text
 * @param {string} text - Text to truncate
 * @param {number} length - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, length = 50) => {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
};

/**
 * Capitalize first letter
 * @param {string} text - Text to capitalize
 * @returns {string} Capitalized text
 */
export const capitalizeFirst = (text) => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

/**
 * Format address
 * @param {Object} address - Address object
 * @returns {string} Formatted address
 */
export const formatAddress = (address) => {
  if (!address) return 'N/A';
  const parts = [];
  if (address.street) parts.push(address.street);
  if (address.city) parts.push(address.city);
  if (address.state) parts.push(address.state);
  if (address.zipCode) parts.push(address.zipCode);
  return parts.join(', ') || 'N/A';
};