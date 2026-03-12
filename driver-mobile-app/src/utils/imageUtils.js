import { API_URL } from '../constants/config';

// Base URL without the '/api' suffix
const BASE_URL = API_URL.replace('/api', '');

export const getImageUrl = (path) => {
  if (!path) return null;
  
  // If it's already a full URL, return as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // If it's a relative path starting with /uploads
  if (path.startsWith('/uploads/')) {
    return `${BASE_URL}${path}`;
  }
  
  // If it's just a filename, assume it's in uploads
  if (path.match(/\.(jpg|jpeg|png|gif)$/i)) {
    return `${BASE_URL}/uploads/${path}`;
  }
  
  // Default case
  return path;
};