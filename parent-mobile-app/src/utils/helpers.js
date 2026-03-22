import { Platform } from 'react-native';
import { format, formatDistance, formatDistanceToNow, isToday, isYesterday } from 'date-fns';

// Format date
export const formatDate = (date, formatStr = 'MMM dd, yyyy') => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return format(d, formatStr);
};

// Format time
export const formatTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Format datetime
export const formatDateTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return `${formatDate(d)} at ${formatTime(d)}`;
};

// Format relative time (e.g., "2 hours ago")
export const getRelativeTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return formatDistanceToNow(d, { addSuffix: true });
};

// Get smart time format (Today/Yesterday/Date)
export const getSmartTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  if (isToday(d)) return `Today at ${formatTime(d)}`;
  if (isYesterday(d)) return `Yesterday at ${formatTime(d)}`;
  return formatDate(d);
};

// Format duration in minutes
export const formatDuration = (minutes) => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

// Validate email
export const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// Validate phone (Kenyan format)
export const isValidPhone = (phone) => {
  const regex = /^(\+254|0)[17][0-9]{8}$/;
  return regex.test(phone);
};

// Format phone number
export const formatPhone = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  
  // Kenyan format
  if (cleaned.length === 12 && cleaned.startsWith('254')) {
    return `+${cleaned.slice(0,3)} ${cleaned.slice(3,6)} ${cleaned.slice(6,9)} ${cleaned.slice(9)}`;
  }
  if (cleaned.length === 10 && cleaned.startsWith('07')) {
    return `0${cleaned.slice(1,4)} ${cleaned.slice(4,7)} ${cleaned.slice(7)}`;
  }
  return phone;
};

// Calculate distance between two coordinates (km)
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c;
  return Math.round(distance * 10) / 10;
};

const deg2rad = (deg) => {
  return deg * (Math.PI/180);
};

// Generate random ID
export const generateId = (length = 8) => {
  return Math.random().toString(36).substring(2, 2 + length);
};

// Debounce function
export const debounce = (func, wait = 300) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle function
export const throttle = (func, limit = 300) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Platform checks
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

// Get error message from API error
export const getErrorMessage = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

// Capitalize first letter of each word
export const capitalize = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Truncate text with ellipsis
export const truncate = (str, length = 50) => {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
};

// Parse JWT token
export const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error parsing JWT:', error);
    return null;
  }
};

// Get initials from name
export const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Deep clone object
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

// Check if object is empty
export const isEmptyObject = (obj) => {
  return obj && Object.keys(obj).length === 0 && obj.constructor === Object;
};

// Group array by key
export const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const groupKey = item[key];
    if (!result[groupKey]) result[groupKey] = [];
    result[groupKey].push(item);
    return result;
  }, {});
};

// Sort array by key
export const sortBy = (array, key, ascending = true) => {
  return [...array].sort((a, b) => {
    const valA = a[key];
    const valB = b[key];
    if (ascending) return valA < valB ? -1 : valA > valB ? 1 : 0;
    return valA > valB ? -1 : valA < valB ? 1 : 0;
  });
};

// Format number with commas
export const formatNumber = (num) => {
  if (!num && num !== 0) return '';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Format percentage
export const formatPercentage = (value, decimals = 0) => {
  if (value === undefined || value === null) return '0%';
  return `${value.toFixed(decimals)}%`;
};

// Get status color
export const getStatusColor = (status) => {
  const colors = {
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3',
    pending: '#FFC107',
    active: '#4CAF50',
    inactive: '#9E9E9E',
    delayed: '#FF9800',
    completed: '#4CAF50',
    cancelled: '#F44336',
  };
  return colors[status] || colors.info;
};

export default {
  formatDate,
  formatTime,
  formatDateTime,
  getRelativeTime,
  getSmartTime,
  formatDuration,
  isValidEmail,
  isValidPhone,
  formatPhone,
  calculateDistance,
  generateId,
  debounce,
  throttle,
  isIOS,
  isAndroid,
  getErrorMessage,
  capitalize,
  truncate,
  parseJwt,
  getInitials,
  deepClone,
  isEmptyObject,
  groupBy,
  sortBy,
  formatNumber,
  formatPercentage,
  getStatusColor,
};