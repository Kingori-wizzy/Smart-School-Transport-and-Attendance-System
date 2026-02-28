import { Platform } from 'react-native';

// API URLs - replace with your actual backend URL
export const API_URL = 'http://192.168.100.3:5000/api';
export const SOCKET_URL = 'http://192.168.100.3:5000';

export const COLORS = {
  primary: '#667eea',
  secondary: '#764ba2',
  success: '#4CAF50',
  warning: '#FF9800',
  danger: '#f44336',
  info: '#2196F3',
  light: '#f5f5f5',
  dark: '#333333',
  white: '#ffffff',
  gray: '#999999',
  lightGray: '#dddddd',
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: '@auth_token',
  DRIVER: '@driver',
  DRIVER_CREDENTIALS: '@driver_credentials',
  CURRENT_TRIP: '@current_trip',
  SETTINGS: '@driver_settings',
};

export const TRIP_STATUS = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const REPORT_TYPES = [
  { id: 'accident', label: 'Accident', icon: '🚗' },
  { id: 'mechanical', label: 'Mechanical Issue', icon: '🔧' },
  { id: 'student', label: 'Student Issue', icon: '👤' },
  { id: 'traffic', label: 'Traffic Delay', icon: '🚦' },
  { id: 'weather', label: 'Weather Delay', icon: '☔' },
  { id: 'other', label: 'Other', icon: '📋' },
];

export const NOTIFICATION_TYPES = {
  TRIP_START: 'trip_start',
  TRIP_END: 'trip_end',
  STUDENT_BOARDED: 'student_boarded',
  INCIDENT_REPORTED: 'incident_reported',
  EMERGENCY: 'emergency',
};

export const ERROR_MESSAGES = {
  NETWORK: 'Network connection error. Please check your internet.',
  SERVER: 'Server error. Please try again later.',
  UNAUTHORIZED: 'Session expired. Please login again.',
  NOT_FOUND: 'Resource not found.',
  VALIDATION: 'Please check your input and try again.',
};

export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  DISPLAY_TIME: 'MMM dd, yyyy HH:mm',
  API: 'yyyy-MM-dd',
  API_TIME: 'yyyy-MM-dd HH:mm:ss',
  TIME: 'HH:mm',
};

export const VEHICLE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  MAINTENANCE: 'maintenance',
  ON_TRIP: 'on-trip',
};

export const DRIVER_STATUS = {
  AVAILABLE: 'available',
  ON_TRIP: 'on-trip',
  OFF_DUTY: 'off-duty',
  BREAK: 'break',
};

export const PAGE_SIZES = {
  DEFAULT: 20,
  MAX: 100,
};

export const CACHE_DURATION = {
  SHORT: 5 * 60 * 1000,      // 5 minutes
  MEDIUM: 30 * 60 * 1000,     // 30 minutes
  LONG: 24 * 60 * 60 * 1000,  // 24 hours
};

export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';