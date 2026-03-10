import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/config';

const api = {
  async request(endpoint, options = {}) {
    try {
      const token = await AsyncStorage.getItem('@auth_token');
      
      // Debug token presence
      console.log(`🔑 Auth token present: ${!!token}`);
      
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
          await AsyncStorage.multiRemove(['@auth_token', '@user', '@user_role']);
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

  // ==================== USER/PROFILE ====================
  user: {
    // Save push token with better error handling
    savePushToken: async (token) => {
      try {
        // Check if user is logged in first
        const authToken = await AsyncStorage.getItem('@auth_token');
        if (!authToken) {
          console.log('⚠️ Cannot save push token: User not authenticated');
          return { success: false, message: 'Not authenticated' };
        }
        
        return await api.request('/user/push-token', { 
          method: 'POST', 
          body: JSON.stringify({ token }) 
        });
      } catch (error) {
        console.error('❌ Error saving push token:', error);
        return { success: false, message: error.message };
      }
    },
    
    removePushToken: () => 
      api.request('/user/push-token', { method: 'DELETE' }),
    
    getProfile: () => 
      api.request('/user/profile'),
    
    updateProfile: (data) => 
      api.request('/user/profile', { 
        method: 'PUT', 
        body: JSON.stringify(data) 
      }),
    
    changePassword: (data) => 
      api.request('/user/change-password', { 
        method: 'POST', 
        body: JSON.stringify(data) 
      }),
    
    deleteAccount: () => 
      api.request('/user/account', { method: 'DELETE' }),
    
    // Get push token status
    getPushTokenStatus: () => 
      api.request('/user/push-token', { method: 'GET' }),
  },

  // ==================== AUTH ====================
  auth: {
    login: async (email, password) => {
      try {
        const response = await api.request('/auth/login', { 
          method: 'POST', 
          body: JSON.stringify({ email, password }) 
        });
        
        // If login successful and token exists, store it
        if (response.token) {
          await AsyncStorage.setItem('@auth_token', response.token);
          if (response.user) {
            await AsyncStorage.setItem('@user', JSON.stringify(response.user));
            await AsyncStorage.setItem('@user_role', response.user.role);
          }
          console.log('✅ Auth token stored after login');
        }
        
        return response;
      } catch (error) {
        throw error;
      }
    },
    
    register: (userData) => 
      api.request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
    
    // Step 1: Send forgot password email
    forgotPassword: (email) => 
      api.request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
    
    // Step 2: Verify the reset code
    verifyResetCode: (email, code) => 
      api.request('/auth/verify-reset-code', { method: 'POST', body: JSON.stringify({ email, code }) }),
    
    // Step 3: Reset password with verified code
    resetPassword: (email, code, newPassword) => 
      api.request('/auth/reset-password', { 
        method: 'POST', 
        body: JSON.stringify({ email, code, newPassword }) 
      }),
    
    // Legacy reset password (kept for compatibility)
    resetPasswordWithToken: (token, newPassword) => 
      api.request('/auth/reset-password', { 
        method: 'POST', 
        body: JSON.stringify({ token, newPassword }) 
      }),
    
    verify: async () => {
      try {
        return await api.request('/auth/verify');
      } catch (error) {
        // If verify fails, clear token
        await AsyncStorage.multiRemove(['@auth_token', '@user', '@user_role']);
        throw error;
      }
    },
    
    logout: async () => {
      try {
        await api.request('/auth/logout', { method: 'POST' });
      } finally {
        // Always clear local storage even if API call fails
        await AsyncStorage.multiRemove(['@auth_token', '@user', '@user_role']);
        console.log('✅ User logged out, tokens cleared');
      }
    },
    
    // Check if user is authenticated
    isAuthenticated: async () => {
      const token = await AsyncStorage.getItem('@auth_token');
      return !!token;
    },
    
    // Get current user
    getCurrentUser: async () => {
      const userStr = await AsyncStorage.getItem('@user');
      return userStr ? JSON.parse(userStr) : null;
    },
  },

  // ==================== PARENT ====================
  parent: {
    getChildren: () => 
      api.request('/parents/children'),
    
    addChild: (childData) => 
      api.request('/parents/children', { method: 'POST', body: JSON.stringify(childData) }),
    
    updateChild: (childId, childData) => 
      api.request(`/parents/children/${childId}`, { method: 'PUT', body: JSON.stringify(childData) }),
    
    deleteChild: (childId) => 
      api.request(`/parents/children/${childId}`, { method: 'DELETE' }),
    
    getChildLocation: (childId) => 
      api.request(`/parents/children/${childId}/location`),
    
    getChildStats: (childId) => 
      api.request(`/parents/children/${childId}/stats`),
    
    getChildTrips: (childId) => 
      api.request(`/parents/children/${childId}/trips/recent`),
  },

  // ==================== ATTENDANCE ====================
  attendance: {
    getToday: (childId) => 
      api.request(`/attendance/child/${childId}/today`),
    
    getHistory: (childId, startDate, endDate) => 
      api.request(`/attendance/child/${childId}?startDate=${startDate}&endDate=${endDate}`),
    
    getStats: (childId) => 
      api.request(`/attendance/child/${childId}/stats`),
    
    exportReport: (childId, month) => 
      api.request(`/attendance/child/${childId}/export?month=${month}`),
  },

  // ==================== NOTIFICATIONS ====================
  notifications: {
    getAll: (page = 1, limit = 20) => 
      api.request(`/notifications?page=${page}&limit=${limit}`),
    
    markAsRead: (notificationId) => 
      api.request(`/notifications/${notificationId}/read`, { method: 'PATCH' }),
    
    markAllAsRead: () => 
      api.request('/notifications/read-all', { method: 'POST' }),
    
    delete: (notificationId) => 
      api.request(`/notifications/${notificationId}`, { method: 'DELETE' }),
    
    deleteAll: () => 
      api.request('/notifications/all', { method: 'DELETE' }),
  },

  // ==================== MESSAGES ====================
  messages: {
    getConversations: () => 
      api.request('/messages/conversations'),
    
    getMessages: (conversationId) => 
      api.request(`/messages/${conversationId}`),
    
    sendMessage: (conversationId, text) => 
      api.request('/messages', { 
        method: 'POST', 
        body: JSON.stringify({ conversationId, text }) 
      }),
    
    markAsRead: (messageId) => 
      api.request(`/messages/${messageId}/read`, { method: 'PATCH' }),
  },

  // ==================== TRANSPORT ====================
  transport: {
    getRoutes: () => 
      api.request('/transport/routes'),
    
    getRouteDetails: (routeId) => 
      api.request(`/transport/routes/${routeId}`),
    
    getSchedule: (date) => 
      api.request(`/transport/schedule?date=${date}`),
    
    reportProblem: (reportData) => 
      api.request('/transport/report', { method: 'POST', body: JSON.stringify(reportData) }),
    
    contactDriver: (busId, message) => 
      api.request(`/transport/driver/${busId}/contact`, { 
        method: 'POST', 
        body: JSON.stringify({ message }) 
      }),
  },

  // ==================== PROFILE (Alias for user endpoints) ====================
  profile: {
    update: (userData) => 
      api.request('/user/profile', { method: 'PUT', body: JSON.stringify(userData) }),
    
    changePassword: (passwordData) => 
      api.request('/user/change-password', { method: 'POST', body: JSON.stringify(passwordData) }),
    
    uploadPhoto: async (formData) => {
      const token = await AsyncStorage.getItem('@auth_token');
      return fetch(`${API_URL}/user/profile/photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
    },
    
    deleteAccount: () => 
      api.request('/user/account', { method: 'DELETE' }),
  },

  // ==================== UTILS ====================
  get: (endpoint) => api.request(endpoint, { method: 'GET' }),
  post: (endpoint, body) => api.request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => api.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint) => api.request(endpoint, { method: 'DELETE' }),
  patch: (endpoint, body) => api.request(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  
  // ==================== AUTH TOKEN MANAGEMENT ====================
  // Helper to manually set token
  setAuthToken: async (token) => {
    if (token) {
      await AsyncStorage.setItem('@auth_token', token);
      console.log('✅ Auth token manually set');
    }
  },
  
  // Helper to clear token
  clearAuthToken: async () => {
    await AsyncStorage.removeItem('@auth_token');
    console.log('✅ Auth token cleared');
  },
  
  // Helper to get current token
  getAuthToken: async () => {
    return await AsyncStorage.getItem('@auth_token');
  },
};

export default api;