import { Platform, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { API_URL } from '../constants/config';

// Base URL without the '/api' suffix
const BASE_URL = API_URL.replace('/api', '');

// Supported image formats
const SUPPORTED_FORMATS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

// Maximum file size (5MB)
const MAX_FILE_SIZE_MB = 5;

/**
 * Get full image URL from path
 * @param {string} path - Image path
 * @returns {string|null}
 */
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
  if (path.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    return `${BASE_URL}/uploads/${path}`;
  }
  
  // Default case
  return path;
};

/**
 * Request camera permissions
 * @returns {Promise<boolean>}
 */
export const requestCameraPermission = async () => {
  if (Platform.OS !== 'web') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to take photos');
      return false;
    }
    return true;
  }
  return false;
};

/**
 * Request media library permissions
 * @returns {Promise<boolean>}
 */
export const requestMediaLibraryPermission = async () => {
  if (Platform.OS !== 'web') {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library access is needed to select images');
      return false;
    }
    return true;
  }
  return false;
};

/**
 * Pick image from library with built-in compression
 * @param {Object} options - Image picker options
 * @returns {Promise<{uri: string, width: number, height: number, type: string} | null>}
 */
export const pickImage = async (options = {}) => {
  const hasPermission = await requestMediaLibraryPermission();
  if (!hasPermission) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.7, // Built-in compression
    base64: false,
    exif: false,
    ...options,
  });

  if (!result.canceled && result.assets && result.assets[0]) {
    return result.assets[0];
  }
  return null;
};

/**
 * Take photo with camera with built-in compression
 * @param {Object} options - Camera options
 * @returns {Promise<{uri: string, width: number, height: number, type: string} | null>}
 */
export const takePhoto = async (options = {}) => {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) return null;

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    quality: 0.7, // Built-in compression
    base64: false,
    exif: false,
    ...options,
  });

  if (!result.canceled && result.assets && result.assets[0]) {
    return result.assets[0];
  }
  return null;
};

/**
 * Simple image compression using FileSystem (fallback when manipulateAsync not available)
 * @param {string} uri - Image URI
 * @param {number} maxSizeMB - Maximum file size in MB
 * @returns {Promise<string>}
 */
export const compressImage = async (uri, maxSizeMB = 1) => {
  try {
    // Get file info
    const fileInfo = await FileSystem.getInfoAsync(uri);
    const fileSizeMB = fileInfo.size / (1024 * 1024);
    
    // If file is already under max size, return original
    if (fileSizeMB <= maxSizeMB) {
      return uri;
    }
    
    // Try to re-pick with lower quality (this is a workaround)
    // For now, return the original as we don't have manipulator
    console.log(`Image size ${fileSizeMB.toFixed(2)}MB exceeds limit. Consider using lower quality.`);
    return uri;
  } catch (error) {
    console.error('Error checking image size:', error);
    return uri;
  }
};

/**
 * Convert image to base64
 * @param {string} uri - Image URI
 * @returns {Promise<string>}
 */
export const imageToBase64 = async (uri) => {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return null;
  }
};

/**
 * Get image dimensions
 * @param {string} uri - Image URI
 * @returns {Promise<{width: number, height: number}>}
 */
export const getImageDimensions = (uri) => {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error)
    );
  });
};

/**
 * Create FormData for image upload
 * @param {string} uri - Image URI
 * @param {string} fieldName - Form field name
 * @param {string} fileName - File name
 * @returns {Promise<FormData>}
 */
export const createImageFormData = async (uri, fieldName = 'image', fileName = 'photo.jpg') => {
  const formData = new FormData();
  
  // Get file info
  const fileInfo = await FileSystem.getInfoAsync(uri);
  const fileType = uri.split('.').pop().toLowerCase();
  const mimeType = fileType === 'png' ? 'image/png' : 'image/jpeg';
  
  formData.append(fieldName, {
    uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
    type: mimeType,
    name: fileName,
  });
  
  return formData;
};

/**
 * Validate image file
 * @param {string} uri - Image URI
 * @param {number} maxSizeMB - Max file size in MB
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
export const validateImage = async (uri, maxSizeMB = MAX_FILE_SIZE_MB) => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      return { valid: false, error: 'File does not exist' };
    }
    
    const fileSizeMB = fileInfo.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      return { valid: false, error: `Image size exceeds ${maxSizeMB}MB limit` };
    }
    
    const fileExtension = uri.split('.').pop().toLowerCase();
    if (!SUPPORTED_FORMATS.includes(fileExtension)) {
      return { valid: false, error: `Unsupported file format. Supported: ${SUPPORTED_FORMATS.join(', ')}` };
    }
    
    try {
      const dimensions = await getImageDimensions(uri);
      if (dimensions.width < 100 || dimensions.height < 100) {
        return { valid: false, error: 'Image resolution is too low (minimum 100x100px)' };
      }
    } catch (dimError) {
      // If can't get dimensions, still consider valid
      console.log('Could not get image dimensions:', dimError);
    }
    
    return { valid: true };
  } catch (error) {
    console.error('Error validating image:', error);
    return { valid: false, error: 'Invalid image file' };
  }
};

/**
 * Get file size in MB
 * @param {string} uri - Image URI
 * @returns {Promise<number>}
 */
export const getFileSizeMB = async (uri) => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    return fileInfo.size / (1024 * 1024);
  } catch (error) {
    console.error('Error getting file size:', error);
    return 0;
  }
};

/**
 * Save image to device
 * @param {string} uri - Image URI
 * @param {string} fileName - File name
 * @returns {Promise<string>}
 */
export const saveImageToDevice = async (uri, fileName = `photo_${Date.now()}.jpg`) => {
  try {
    const downloadDest = FileSystem.documentDirectory + fileName;
    await FileSystem.copyAsync({
      from: uri,
      to: downloadDest,
    });
    return downloadDest;
  } catch (error) {
    console.error('Error saving image:', error);
    return null;
  }
};

/**
 * Pick or take image with options
 * @param {string} source - 'camera' or 'library'
 * @param {Object} options - Options
 * @returns {Promise<{uri: string, width: number, height: number} | null>}
 */
export const selectImage = async (source = 'library', options = {}) => {
  if (source === 'camera') {
    return await takePhoto(options);
  }
  return await pickImage(options);
};

/**
 * Get image thumbnail URI (using FileSystem)
 * @param {string} uri - Original image URI
 * @returns {Promise<string>}
 */
export const getThumbnailUri = async (uri) => {
  // For now, return original URI since we don't have manipulator
  // This can be enhanced with expo-image-manipulator if installed later
  return uri;
};

export default {
  getImageUrl,
  requestCameraPermission,
  requestMediaLibraryPermission,
  pickImage,
  takePhoto,
  compressImage,
  imageToBase64,
  getImageDimensions,
  createImageFormData,
  validateImage,
  getFileSizeMB,
  saveImageToDevice,
  selectImage,
  getThumbnailUri,
};