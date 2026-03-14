// File: frontend/src/services/report.js

import api from './api';

export const reportService = {
  // Generate attendance report
  generateAttendanceReport: async (params) => {
    try {
      const response = await api.post('/reports/attendance', params);
      return response.data;
    } catch (error) {
      console.error('Error generating attendance report:', error);
      throw error;
    }
  },

  // Generate transport report
  generateTransportReport: async (params) => {
    try {
      const response = await api.post('/reports/transport', params);
      return response.data;
    } catch (error) {
      console.error('Error generating transport report:', error);
      throw error;
    }
  },

  // Generate driver report
  generateDriverReport: async (params) => {
    try {
      const response = await api.post('/reports/drivers', params);
      return response.data;
    } catch (error) {
      console.error('Error generating driver report:', error);
      throw error;
    }
  },

  // Generate route report
  generateRouteReport: async (params) => {
    try {
      const response = await api.post('/reports/routes', params);
      return response.data;
    } catch (error) {
      console.error('Error generating route report:', error);
      throw error;
    }
  },

  // Generate incident report
  generateIncidentReport: async (params) => {
    try {
      const response = await api.post('/reports/incident', params);
      return response.data;
    } catch (error) {
      console.error('Error generating incident report:', error);
      throw error;
    }
  },

  // Generate combined report
  generateCombinedReport: async (params) => {
    try {
      const response = await api.post('/reports/combined', params);
      return response.data;
    } catch (error) {
      console.error('Error generating combined report:', error);
      throw error;
    }
  },

  // Save report
  saveReport: async (reportData) => {
    try {
      const response = await api.post('/reports/save', reportData);
      return response.data;
    } catch (error) {
      console.error('Error saving report:', error);
      throw error;
    }
  },

  // Get saved reports
  getSavedReports: async (params = {}) => {
    try {
      const response = await api.get('/reports', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching saved reports:', error);
      return { data: [] };
    }
  },

  // Get single report
  getReport: async (reportId) => {
    try {
      const response = await api.get(`/reports/${reportId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching report:', error);
      return null;
    }
  },

  // Download report
  downloadReport: async (reportId, format = 'pdf') => {
    try {
      const response = await api.get(`/reports/${reportId}/download`, {
        params: { format },
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading report:', error);
      throw error;
    }
  },

  // Delete report
  deleteReport: async (reportId) => {
    try {
      const response = await api.delete(`/reports/${reportId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting report:', error);
      throw error;
    }
  },

  // Schedule report
  scheduleReport: async (scheduleData) => {
    try {
      const response = await api.post('/reports/schedule', scheduleData);
      return response.data;
    } catch (error) {
      console.error('Error scheduling report:', error);
      throw error;
    }
  },

  // Get scheduled reports
  getScheduledReports: async () => {
    try {
      const response = await api.get('/reports/scheduled');
      return response.data;
    } catch (error) {
      console.error('Error fetching scheduled reports:', error);
      return { data: [] };
    }
  },

  // Export report to CSV
  exportToCSV: async (reportId) => {
    try {
      const response = await api.get(`/reports/${reportId}/export/csv`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      throw error;
    }
  },

  // Export report to Excel
  exportToExcel: async (reportId) => {
    try {
      const response = await api.get(`/reports/${reportId}/export/excel`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw error;
    }
  },

  // Get report statistics
  getReportStats: async () => {
    try {
      const response = await api.get('/reports/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching report stats:', error);
      return { data: {} };
    }
  }
};