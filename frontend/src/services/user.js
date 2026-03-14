// File: frontend/src/services/user.js

import api from './api';

export const userService = {
  // Get users by role
  getUsersByRole: async (role, params = {}) => {
    try {
      const response = await api.get('/users', { params: { ...params, role } });
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${role}s:`, error);
      return { data: [] };
    }
  },

  // Get all drivers
  getDrivers: async (params = {}) => {
    return userService.getUsersByRole('driver', params);
  },

  // Get single user
  getUser: async (id) => {
    try {
      const response = await api.get(`/users/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  },

  // Create user (driver)
  createUser: async (userData) => {
    try {
      // Format driver data properly for backend
      const formattedData = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password || 'password123',
        phone: userData.phone,
        role: 'driver',
        isActive: userData.status === 'active',
        driverDetails: {
          licenseNumber: userData.licenseNumber,
          licenseExpiry: userData.licenseExpiry,
          experience: parseInt(userData.experience) || 0,
          assignedBus: userData.assignedBus || null
        }
      };

      const response = await api.post('/users', formattedData);
      return response.data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  // Update user
  updateUser: async (id, userData) => {
    try {
      // Format update data
      const formattedData = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phone: userData.phone,
        isActive: userData.isActive !== undefined ? userData.isActive : (userData.status === 'active'),
        driverDetails: {
          licenseNumber: userData.licenseNumber,
          licenseExpiry: userData.licenseExpiry,
          experience: parseInt(userData.experience) || 0,
          assignedBus: userData.assignedBus || null
        }
      };

      const response = await api.put(`/users/${id}`, formattedData);
      return response.data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },

  // Delete user (soft delete)
  deleteUser: async (id) => {
    try {
      const response = await api.delete(`/users/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },

  // Toggle user status
  toggleUserStatus: async (id, isActive) => {
    try {
      const response = await api.patch(`/users/${id}/status`, { isActive });
      return response.data;
    } catch (error) {
      console.error('Error toggling user status:', error);
      throw error;
    }
  },

  // Get user profile
  getProfile: async () => {
    try {
      const response = await api.get('/users/profile');
      return response.data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  },

  // Update profile
  updateProfile: async (profileData) => {
    try {
      const response = await api.put('/users/profile', profileData);
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },

  // Change password
  changePassword: async (currentPassword, newPassword) => {
    try {
      const response = await api.post('/users/change-password', {
        currentPassword,
        newPassword
      });
      return response.data;
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  },

  // Upload profile photo
  uploadPhoto: async (photoFile) => {
    try {
      const formData = new FormData();
      formData.append('photo', photoFile);
      
      const response = await api.post('/users/profile/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw error;
    }
  }
};