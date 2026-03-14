// File: frontend/src/services/settings.js

import api from './api';

export const settingsService = {
  // System Configuration
  getSystemConfig: async () => {
    try {
      const response = await api.get('/settings/system');
      return response.data;
    } catch (error) {
      console.error('Error fetching system config:', error);
      return { data: {} };
    }
  },

  updateSystemConfig: async (config) => {
    try {
      const response = await api.put('/settings/system', config);
      return response.data;
    } catch (error) {
      console.error('Error updating system config:', error);
      throw error;
    }
  },

  // User Preferences
  getUserPreferences: async () => {
    try {
      const response = await api.get('/settings/preferences');
      return response.data;
    } catch (error) {
      console.error('Error fetching preferences:', error);
      return { data: {} };
    }
  },

  updateUserPreferences: async (preferences) => {
    try {
      const response = await api.put('/settings/preferences', preferences);
      return response.data;
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  },

  // Notification Settings
  getNotificationSettings: async () => {
    try {
      const response = await api.get('/settings/notifications');
      return response.data;
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      return { data: {} };
    }
  },

  updateNotificationSettings: async (settings) => {
    try {
      const response = await api.put('/settings/notifications', settings);
      return response.data;
    } catch (error) {
      console.error('Error updating notification settings:', error);
      throw error;
    }
  },

  // Backup & Restore
  createBackup: async () => {
    try {
      const response = await api.post('/settings/backup');
      return response.data;
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  },

  restoreBackup: async (backupId) => {
    try {
      const response = await api.post(`/settings/restore/${backupId}`);
      return response.data;
    } catch (error) {
      console.error('Error restoring backup:', error);
      throw error;
    }
  },

  getBackups: async () => {
    try {
      const response = await api.get('/settings/backups');
      return response.data;
    } catch (error) {
      console.error('Error fetching backups:', error);
      return { data: [] };
    }
  },

  // Audit Logs
  getAuditLogs: async (params = {}) => {
    try {
      const response = await api.get('/settings/audit-logs', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return { data: [] };
    }
  }
};