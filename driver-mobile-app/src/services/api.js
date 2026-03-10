import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../utils/constants';

const api = {
  async request(endpoint, options = {}) {
    // TEMPORARY FIX: Intercept any calls to old driver-specific endpoint
    if (endpoint.includes('/auth/driver/login')) {
      console.log('⚠️ Intercepted old driver login endpoint, redirecting to /auth/login');
      endpoint = '/auth/login';
    }
    
    try {
      const token = await AsyncStorage.getItem('@auth_token');
      
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log(`🔑 Token attached to request: ${endpoint}`);
      } else {
        console.log(`⚠️ No auth token for request: ${endpoint}`);
      }

      console.log(`🌐 API Request: ${options.method || 'GET'} ${API_URL}${endpoint}`);

      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      console.log(`📥 Response status: ${response.status} for ${endpoint}`);

      const responseText = await response.text();
      
      if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`;
        try {
          if (responseText) {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.message || errorData.error || errorMessage;
          }
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        
        // Handle 401 Unauthorized - token expired or invalid
        if (response.status === 401) {
          console.log('🔑 Token expired or invalid, clearing storage');
          await AsyncStorage.multiRemove(['@auth_token', '@user']);
        }
        
        throw new Error(errorMessage);
      }

      if (!responseText) {
        console.log('⚠️ Empty response from server');
        return {};
      }

      try {
        const data = JSON.parse(responseText);
        console.log(`✅ Response parsed successfully for ${endpoint}`);
        console.log(`📦 Response data structure:`, Object.keys(data));
        return data;
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError.message);
        throw new Error('Invalid JSON response from server');
      }
      
    } catch (error) {
      console.error('❌ API Error:', {
        endpoint,
        method: options.method,
        message: error.message,
      });
      throw error;
    }
  },

  // Auth endpoints with comprehensive debugging
  auth: {
    login: async (email, password) => {
      console.log('🔐 LOGIN FUNCTION CALLED - using endpoint: /auth/login');
      console.log(`📧 Email: ${email}`);
      
      try {
        const response = await api.request('/auth/login', { 
          method: 'POST', 
          body: JSON.stringify({ email, password }) 
        });
        
        console.log('✅ Login response received:');
        console.log('📦 Response type:', typeof response);
        console.log('🔑 Response keys:', Object.keys(response));
        console.log('📄 Full response:', JSON.stringify(response, null, 2));
        
        // Check for token in various possible locations
        const token = response.token || 
                     response.data?.token || 
                     response.accessToken || 
                     response.access_token ||
                     response.Token;
        
        // Check for user data in various possible locations
        const user = response.user || 
                    response.data?.user || 
                    response.profile ||
                    response.userData;
        
        console.log('🔍 Extracted token:', token ? '✅ Found' : '❌ Not found');
        console.log('🔍 Extracted user:', user ? '✅ Found' : '❌ Not found');
        
        if (token) {
          console.log('✅ Token found in response, storing...');
          console.log('📝 Token value (first 20 chars):', token.substring(0, 20) + '...');
          
          await AsyncStorage.setItem('@auth_token', token);
          console.log('✅ Token stored successfully');
          
          if (user) {
            console.log('✅ User data found, storing...');
            await AsyncStorage.setItem('@user', JSON.stringify(user));
            console.log('✅ User data stored successfully');
          } else {
            console.log('⚠️ No user data in response, storing token only');
          }
          
          return { 
            success: true, 
            token, 
            user,
            message: response.message || 'Login successful'
          };
        } else {
          console.log('❌ No token found in response!');
          console.log('📄 Response structure:', JSON.stringify(response, null, 2));
          
          // Check if response has any auth-related fields
          const possibleAuthFields = Object.keys(response).filter(key => 
            key.toLowerCase().includes('token') || 
            key.toLowerCase().includes('auth') || 
            key.toLowerCase().includes('key')
          );
          
          if (possibleAuthFields.length > 0) {
            console.log('🔍 Possible auth fields found:', possibleAuthFields);
          }
          
          return { 
            success: false, 
            message: 'Invalid server response: no token received',
            response 
          };
        }
      } catch (error) {
        console.error('❌ Login error:', error.message);
        return { 
          success: false, 
          message: error.message 
        };
      }
    },
    
    verifyPin: (pin) => 
      api.request('/auth/driver/verify-pin', { method: 'POST', body: JSON.stringify({ pin }) }),
    
    setPin: (pin) => 
      api.request('/auth/driver/set-pin', { method: 'POST', body: JSON.stringify({ pin }) }),
  },

  // Driver endpoints
  driver: {
    getTodayTrips: () => 
      api.request('/driver/trips/today'),
    
    getTripDetails: (tripId) => 
      api.request(`/driver/trip/${tripId}`),
    
    getTripStudents: (tripId) => 
      api.request(`/driver/trip/${tripId}/students`),
    
    getRouteCoordinates: (routeId) => 
      api.request(`/driver/route/${routeId}/coordinates`),
    
    getStats: () => 
      api.request('/driver/stats'),
    
    getCurrentTrip: () => 
      api.request('/driver/current-trip'),
  },

  // Trip actions
  trip: {
    start: (tripId) => 
      api.request(`/driver/trip/${tripId}/start`, { method: 'POST' }),
    
    end: (tripId) => 
      api.request(`/driver/trip/${tripId}/end`, { method: 'POST' }),
    
    boardStudent: (tripId, studentId, method) => 
      api.request(`/driver/trip/${tripId}/board/${studentId}`, { 
        method: 'POST', 
        body: JSON.stringify({ 
          method, 
          timestamp: new Date().toISOString() 
        }) 
      }),
    
    updateLocation: (tripId, lat, lon, speed, heading) => 
      api.request('/driver/gps/update', { 
        method: 'POST', 
        body: JSON.stringify({ 
          tripId, 
          lat, 
          lon, 
          speed, 
          heading, 
          timestamp: new Date().toISOString() 
        }) 
      }),
  },

  // Incident reporting
  report: {
    create: (tripId, type, description, photos) => {
      const formData = new FormData();
      formData.append('tripId', tripId);
      formData.append('type', type);
      formData.append('description', description);
      
      if (photos && photos.length > 0) {
        photos.forEach((photo, index) => {
          formData.append('photos', {
            uri: photo,
            type: 'image/jpeg',
            name: `photo_${index}.jpg`,
          });
        });
      }

      return fetch(`${API_URL}/driver/report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AsyncStorage.getItem('@auth_token')}`,
        },
        body: formData,
      });
    },
  },

  // Emergency
  emergency: {
    sendSOS: (tripId, location) => 
      api.request('/driver/emergency', { 
        method: 'POST', 
        body: JSON.stringify({ 
          tripId, 
          location, 
          timestamp: new Date().toISOString() 
        }) 
      }),
  },

  // HTTP method shortcuts - FIXED to return data in expected format
  get: async (endpoint) => {
    const result = await api.request(endpoint, { method: 'GET' });
    return { data: result };
  },

  post: async (endpoint, body) => {
    const result = await api.request(endpoint, { method: 'POST', body: JSON.stringify(body) });
    return { data: result };
  },

  put: async (endpoint, body) => {
    const result = await api.request(endpoint, { method: 'PUT', body: JSON.stringify(body) });
    return { data: result };
  },

  delete: async (endpoint) => {
    const result = await api.request(endpoint, { method: 'DELETE' });
    return { data: result };
  },
};

export default api;