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

  // Auth endpoints with comprehensive debugging and role verification
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
        console.log('📦 Response keys:', Object.keys(response));
        
        // Check for token in response
        const token = response.token || response.data?.token;
        const user = response.user || response.data?.user;
        
        console.log('🔍 Extracted token:', token ? '✅ Found' : '❌ Not found');
        console.log('🔍 Extracted user:', user ? '✅ Found' : '❌ Not found');
        
        if (token) {
          // Verify user role is driver
          if (user && user.role !== 'driver') {
            console.log('❌ User role is not driver. Actual role:', user.role);
            return { 
              success: false, 
              message: 'Access denied. This app is for drivers only.' 
            };
          }
          
          console.log('✅ Token found, storing...');
          await AsyncStorage.setItem('@auth_token', token);
          
          if (user) {
            console.log('✅ User data found, storing...');
            await AsyncStorage.setItem('@user', JSON.stringify(user));
          }
          
          // Verify token was stored
          const storedToken = await AsyncStorage.getItem('@auth_token');
          console.log('🔑 Verified stored token exists:', !!storedToken);
          
          return { 
            success: true, 
            token, 
            user,
            message: response.message || 'Login successful'
          };
        } else {
          console.log('❌ No token in response!');
          return { 
            success: false, 
            message: 'Invalid server response: no token received' 
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
    
    // Helper to check if current user is authenticated and has correct role
    checkAuth: async () => {
      const token = await AsyncStorage.getItem('@auth_token');
      const userStr = await AsyncStorage.getItem('@user');
      
      if (!token || !userStr) {
        return { authenticated: false };
      }
      
      try {
        const user = JSON.parse(userStr);
        return {
          authenticated: true,
          user,
          isDriver: user.role === 'driver'
        };
      } catch (error) {
        return { authenticated: false };
      }
    },
    
    logout: async () => {
      await AsyncStorage.multiRemove(['@auth_token', '@user']);
      console.log('✅ User logged out');
    },
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

  // Trip actions - FIXED: Correct endpoints for SMS notifications
  trip: {
    start: (tripId) => 
      api.request(`/trips/${tripId}/start`, { method: 'PATCH' }),
    
    end: (tripId) => 
      api.request(`/trips/${tripId}/complete`, { method: 'PATCH' }),
    
    // FIXED: Board student - triggers SMS to parent
    boardStudent: async (tripId, studentId, location = null) => {
      console.log(`🚌 Boarding student ${studentId} on trip ${tripId}`);
      const body = {
        boardingTime: new Date().toISOString(),
        pickupPoint: 'School Gate',
        location: location
      };
      return await api.request(`/trips/${tripId}/students/${studentId}/board`, { 
        method: 'PATCH', 
        body: JSON.stringify(body) 
      });
    },
    
    // FIXED: Alight student - triggers SMS to parent
    alightStudent: async (tripId, studentId, location = null) => {
      console.log(`🏠 Alighting student ${studentId} on trip ${tripId}`);
      const body = {
        alightingTime: new Date().toISOString(),
        dropoffPoint: 'Home',
        location: location
      };
      return await api.request(`/trips/${tripId}/students/${studentId}/alight`, { 
        method: 'PATCH', 
        body: JSON.stringify(body) 
      });
    },
    
    // Get current active trip
    getCurrentTrip: async () => {
      return await api.request('/trips/current');
    },
    
    // Get trip with students
    getTripWithStudents: (tripId) => 
      api.request(`/trips/${tripId}/with-students`),
    
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

  // HTTP method shortcuts
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
  
  // Helper to get auth status (useful for debugging)
  getAuthStatus: async () => {
    const token = await AsyncStorage.getItem('@auth_token');
    const userStr = await AsyncStorage.getItem('@user');
    return {
      hasToken: !!token,
      hasUser: !!userStr,
      user: userStr ? JSON.parse(userStr) : null
    };
  },
};

export default api;