// frontend/src/services/notificationService.js
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/notifications';

const getAuthHeaders = () => ({
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});

export const notificationService = {
  // Get all notifications for current parent
  getNotifications: async (page = 1, limit = 20, type = 'all') => {
    try {
      const response = await axios.get(
        `${API_URL}?page=${page}&limit=${limit}&type=${type}`,
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },

  // Get unread count
  getUnreadCount: async () => {
    try {
      const response = await axios.get(`${API_URL}/unread/count`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return { success: true, data: { unreadCount: 0 } };
    }
  },

  // Mark single notification as read
  markAsRead: async (notificationId) => {
    try {
      const response = await axios.put(`${API_URL}/${notificationId}/read`, {}, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Error marking as read:', error);
      throw error;
    }
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    try {
      const response = await axios.put(`${API_URL}/read-all`, {}, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Error marking all as read:', error);
      throw error;
    }
  },

  // Delete single notification
  deleteNotification: async (notificationId) => {
    try {
      const response = await axios.delete(`${API_URL}/${notificationId}`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  },

  // Clear all notifications
  clearAll: async () => {
    try {
      const response = await axios.delete(`${API_URL}/clear/all`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Error clearing notifications:', error);
      throw error;
    }
  },

  // Get notifications by type
  getByType: async (type, limit = 20) => {
    try {
      const response = await axios.get(`${API_URL}/type/${type}?limit=${limit}`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications by type:', error);
      throw error;
    }
  },

  // Get recent notifications (last 7 days)
  getRecent: async () => {
    try {
      const response = await axios.get(`${API_URL}/recent`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Error fetching recent notifications:', error);
      throw error;
    }
  }
};

export default notificationService;