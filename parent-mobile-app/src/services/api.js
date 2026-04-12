import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/config';

// Store token in memory for faster access
let cachedToken = null;

const api = {
  // Set auth token (call after login or token refresh)
  setAuthToken: (token) => {
    cachedToken = token;
    console.log(`Auth token ${token ? 'set' : 'cleared'} in memory`);
  },

  // Clear auth token
  clearAuthToken: () => {
    cachedToken = null;
    console.log('Auth token cleared from memory');
  },

  // Get current token (from memory or storage)
  getAuthToken: async () => {
    if (cachedToken) {
      return cachedToken;
    }
    const token = await AsyncStorage.getItem('@auth_token');
    return token;
  },

  async request(endpoint, options = {}) {
    try {
      const token = await this.getAuthToken();
      
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`;
        let errorData = null;
        
        try {
          if (responseText) {
            errorData = JSON.parse(responseText);
            errorMessage = errorData.message || errorData.error || errorMessage;
          }
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        
        // Handle 401 Unauthorized - token expired or invalid
        if (response.status === 401) {
          this.clearAuthToken();
          await AsyncStorage.multiRemove(['@auth_token', '@user', '@user_role']);
          
          if (global.eventEmitter) {
            global.eventEmitter.emit('auth:unauthorized');
          }
        }
        
        const error = new Error(errorMessage);
        error.status = response.status;
        error.data = errorData;
        throw error;
      }

      if (!responseText || responseText.trim() === '') {
        return { success: true, data: [] };
      }

      try {
        const data = JSON.parse(responseText);
        return data;
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError.message);
        return { success: true, data: [] };
      }
      
    } catch (error) {
      console.error('API Error:', {
        endpoint,
        method: options.method,
        message: error.message,
        status: error.status
      });
      throw error;
    }
  },

  // ==================== USER/PROFILE ====================
  user: {
    savePushToken: async (token) => {
      try {
        const authToken = await api.getAuthToken();
        if (!authToken) {
          return { success: false, message: 'Not authenticated' };
        }
        
        return await api.request('/user/push-token', { 
          method: 'POST', 
          body: JSON.stringify({ token }) 
        });
      } catch (error) {
        console.error('Error saving push token:', error);
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
        
        if (response.token) {
          await AsyncStorage.setItem('@auth_token', response.token);
          api.setAuthToken(response.token);
          
          if (response.user) {
            await AsyncStorage.setItem('@user', JSON.stringify(response.user));
            await AsyncStorage.setItem('@user_role', response.user.role);
          }
        }
        
        return response;
      } catch (error) {
        console.error('Login error:', error.message);
        throw error;
      }
    },
    
    register: (userData) => 
      api.request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
    
    forgotPassword: (email) => 
      api.request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
    
    verifyResetCode: (email, code) => 
      api.request('/auth/verify-reset-code', { method: 'POST', body: JSON.stringify({ email, code }) }),
    
    resetPassword: (email, code, newPassword) => 
      api.request('/auth/reset-password', { 
        method: 'POST', 
        body: JSON.stringify({ email, code, newPassword }) 
      }),
    
    resetPasswordWithToken: (token, newPassword) => 
      api.request('/auth/reset-password', { 
        method: 'POST', 
        body: JSON.stringify({ token, newPassword }) 
      }),
    
    verify: async () => {
      try {
        return await api.request('/auth/verify');
      } catch (error) {
        await AsyncStorage.multiRemove(['@auth_token', '@user', '@user_role']);
        api.clearAuthToken();
        throw error;
      }
    },
    
    logout: async () => {
      try {
        await api.request('/auth/logout', { method: 'POST' });
      } finally {
        await AsyncStorage.multiRemove(['@auth_token', '@user', '@user_role']);
        api.clearAuthToken();
      }
    },
    
    isAuthenticated: async () => {
      const token = await api.getAuthToken();
      return !!token;
    },
    
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

  // ==================== PARENT CONVERSATIONS ====================
  parentConversations: {
    getConversations: async () => {
      try {
        const response = await api.request('/messaging/parent/conversations');
        return response;
      } catch (error) {
        console.error('Error fetching conversations:', error);
        return { success: true, data: [] };
      }
    },
    
    getMessages: async (conversationId) => {
      try {
        const response = await api.request(`/messaging/parent/conversations/${conversationId}/messages`);
        return response;
      } catch (error) {
        console.error('Error fetching messages:', error);
        return { success: true, data: [] };
      }
    },
    
    sendMessage: async (conversationId, text) => {
      return await api.request(`/messaging/parent/conversations/${conversationId}/messages`, { 
        method: 'POST', 
        body: JSON.stringify({ text }) 
      });
    },
    
    markAsRead: async (conversationId) => {
      return await api.request(`/messaging/parent/conversations/${conversationId}/read`, { method: 'POST' });
    },
    
    getUnreadCount: async () => {
      try {
        const response = await api.request('/messaging/parent/conversations/unread/count');
        return response;
      } catch (error) {
        return { success: true, data: { unreadCount: 0 } };
      }
    },
  },

  // ==================== ATTENDANCE (FIXED) ====================
  attendance: {
    getToday: async (childId) => {
      try {
        const response = await api.request(`/attendance/child/${childId}/today`);
        // Handle different response formats
        if (response && response.data) return response.data;
        if (response && (response.present !== undefined || response.checkIn)) return response;
        return { present: false, checkIn: null, checkOut: null };
      } catch (error) {
        console.error('Error fetching today attendance:', error);
        return { present: false, checkIn: null, checkOut: null };
      }
    },
    
    getHistory: async (childId, startDate, endDate) => {
      try {
        let url = `/attendance/child/${childId}`;
        const params = [];
        if (startDate) params.push(`startDate=${startDate}`);
        if (endDate) params.push(`endDate=${endDate}`);
        if (params.length) url += `?${params.join('&')}`;
        
        const response = await api.request(url);
        
        // Handle different response formats
        if (Array.isArray(response)) return response;
        if (response && response.data && Array.isArray(response.data)) return response.data;
        if (response && response.attendance && Array.isArray(response.attendance)) return response.attendance;
        if (response && response.records && Array.isArray(response.records)) return response.records;
        
        return [];
      } catch (error) {
        console.error('Error fetching attendance history:', error);
        return [];
      }
    },
    
    getStats: async (childId) => {
      try {
        const response = await api.request(`/attendance/child/${childId}/stats`);
        
        if (response && response.data) return response.data;
        if (response && (response.totalDays !== undefined || response.presentDays !== undefined)) return response;
        
        return {
          totalDays: 0,
          presentDays: 0,
          absentDays: 0,
          lateDays: 0,
          attendanceRate: 0
        };
      } catch (error) {
        console.error('Error fetching attendance stats:', error);
        return {
          totalDays: 0,
          presentDays: 0,
          absentDays: 0,
          lateDays: 0,
          attendanceRate: 0
        };
      }
    },
    
    exportReport: async (childId, month) => {
      try {
        const response = await api.request(`/attendance/child/${childId}/export?month=${month}`);
        return response;
      } catch (error) {
        console.error('Error exporting attendance report:', error);
        throw error;
      }
    },
  },

  // ==================== NOTIFICATIONS ====================
  notifications: {
    getAll: async (page = 1, limit = 20) => {
      return await api.request(`/notifications?page=${page}&limit=${limit}`);
    },
    
    getUnreadCount: async () => {
      return await api.request('/notifications/unread/count');
    },
    
    markAsRead: async (notificationId) => {
      return await api.request(`/notifications/${notificationId}/read`, { method: 'PATCH' });
    },
    
    markAllAsRead: async () => {
      return await api.request('/notifications/read-all', { method: 'POST' });
    },
    
    delete: async (notificationId) => {
      return await api.request(`/notifications/${notificationId}`, { method: 'DELETE' });
    },
    
    deleteAll: async () => {
      return await api.request('/notifications/all', { method: 'DELETE' });
    },
  },

  // ==================== MESSAGES (Legacy) ====================
  messages: {
    getConversations: () => 
      api.parentConversations.getConversations(),
    
    getMessages: (conversationId) => 
      api.parentConversations.getMessages(conversationId),
    
    sendMessage: (conversationId, text) => 
      api.parentConversations.sendMessage(conversationId, text),
    
    markAsRead: (conversationId) => 
      api.parentConversations.markAsRead(conversationId),
    
    getUnreadCount: () => 
      api.parentConversations.getUnreadCount(),
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
    
    uploadPhoto: async (formData) => {
      const token = await api.getAuthToken();
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
  setAuthToken: async (token) => {
    if (token) {
      await AsyncStorage.setItem('@auth_token', token);
      cachedToken = token;
    }
  },
  
  clearAuthToken: async () => {
    await AsyncStorage.removeItem('@auth_token');
    cachedToken = null;
  },
  
  getAuthToken: async () => {
    if (cachedToken) return cachedToken;
    return await AsyncStorage.getItem('@auth_token');
  },
  
  checkToken: async () => {
    const token = await api.getAuthToken();
    return !!token;
  },
};

export default api;