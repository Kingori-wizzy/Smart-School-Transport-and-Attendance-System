import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/config';

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

  // ==================== USER/PROFILE ====================
user: {
  savePushToken: (token) => 
    api.request('/user/push-token', { 
      method: 'POST', 
      body: JSON.stringify({ token }) 
    }),
  
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
},

  // ==================== AUTH ====================
  auth: {
    login: (email, password) => 
      api.request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    
    register: (userData) => 
      api.request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
    
    forgotPassword: (email) => 
      api.request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
    
    resetPassword: (token, newPassword) => 
      api.request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword }) }),
    
    verify: () => 
      api.request('/auth/verify'),
    
    logout: () => 
      api.request('/auth/logout', { method: 'POST' }),
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

  // ==================== PROFILE ====================
  profile: {
    update: (userData) => 
      api.request('/user/profile', { method: 'PUT', body: JSON.stringify(userData) }),
    
    changePassword: (passwordData) => 
      api.request('/user/change-password', { method: 'POST', body: JSON.stringify(passwordData) }),
    
    uploadPhoto: (formData) => {
      // Special handler for file upload
      return fetch(`${API_URL}/user/profile/photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AsyncStorage.getItem('@auth_token')}`,
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
};

export default api;