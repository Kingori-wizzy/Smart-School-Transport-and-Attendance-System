import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../utils/constants';

const api = {
  async request(endpoint, options = {}) {
    try {
      const token = await AsyncStorage.getItem('@auth_token');
      
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      console.log(`🌐 API Request: ${options.method || 'GET'} ${API_URL}${endpoint}`);

      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      console.log(`📥 Response status: ${response.status}`);

      const responseText = await response.text();
      
      if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`;
        try {
          if (responseText) {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.message || errorMessage;
          }
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      if (!responseText) {
        return {};
      }

      try {
        const data = JSON.parse(responseText);
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

  // Auth endpoints
  auth: {
    login: (email, password) => 
      api.request('/auth/driver/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    
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
        body: JSON.stringify({ method, timestamp: new Date().toISOString() }) 
      }),
    
    updateLocation: (tripId, lat, lon, speed, heading) => 
      api.request('/driver/gps/update', { 
        method: 'POST', 
        body: JSON.stringify({ tripId, lat, lon, speed, heading, timestamp: new Date().toISOString() }) 
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
        body: JSON.stringify({ tripId, location, timestamp: new Date().toISOString() }) 
      }),
  },

  get: (endpoint) => api.request(endpoint, { method: 'GET' }),
  post: (endpoint, body) => api.request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => api.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint) => api.request(endpoint, { method: 'DELETE' }),
};

export default api;