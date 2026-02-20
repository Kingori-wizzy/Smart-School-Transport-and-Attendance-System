import { Platform } from 'react-native';

// Get IP address from environment or use fallback
const getApiUrl = () => {
  // For development, use your computer's IP
  // For production, use your domain
  return 'http://192.168.100.3:5000/api'; // ✅ UPDATED with your actual IP
};

const getSocketUrl = () => {
  return 'http://192.168.100.3:5000'; // ✅ UPDATED with your actual IP
};

export const API_URL = getApiUrl();
export const SOCKET_URL = getSocketUrl();

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

export const FONTS = {
  regular: Platform.OS === 'ios' ? 'System' : 'Roboto',
  medium: Platform.OS === 'ios' ? 'System' : 'Roboto-Medium',
  bold: Platform.OS === 'ios' ? 'System' : 'Roboto-Bold',
};

export const SIZES = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: '@auth_token',
  REFRESH_TOKEN: '@refresh_token',
  USER: '@user',
  CHILDREN: '@children',
  SETTINGS: '@settings',
};

export const NOTIFICATION_CHANNELS = {
  DEFAULT: 'default',
  ALERTS: 'alerts',
  ATTENDANCE: 'attendance',
  MESSAGES: 'messages',
};