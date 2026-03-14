// File: frontend/src/services/analytics.js

import api from './api';

export const analyticsService = {
  // Get dashboard analytics data
  getDashboardData: async () => {
    try {
      const response = await api.get('/analytics/dashboard');
      return response.data;
    } catch (error) {
      console.error('Error fetching analytics dashboard:', error);
      return { 
        summary: {
          totalStudents: 0,
          totalRoutes: 0,
          totalBuses: 0,
          activeTrips: 0
        },
        attendanceTrends: [],
        riskDistribution: {
          critical: 0, high: 0, medium: 0, low: 0, unknown: 0
        },
        routeEfficiency: [],
        recentAnomalies: []
      };
    }
  },

  // Get attendance analytics
  getAttendanceAnalytics: async (params = {}) => {
    try {
      const response = await api.get('/analytics/trends/attendance', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching attendance analytics:', error);
      return { data: { chartData: [], summary: {} } };
    }
  },

  // Get transport analytics
  getTransportAnalytics: async (params = {}) => {
    try {
      const response = await api.get('/analytics/transport', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching transport analytics:', error);
      return { data: {} };
    }
  },

  // Get driver performance
  getDriverPerformance: async (params = {}) => {
    try {
      const response = await api.get('/analytics/performance/buses', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching driver performance:', error);
      return { data: [] };
    }
  },

  // Get cost analytics
  getCostAnalytics: async (params = {}) => {
    try {
      const response = await api.get('/analytics/costs', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching cost analytics:', error);
      return { data: {} };
    }
  },

  // Get student risk predictions
  getStudentRisk: async (studentId) => {
    try {
      const response = await api.get(`/analytics/student/${studentId}/predict`);
      return response.data;
    } catch (error) {
      console.error('Error fetching student risk:', error);
      return null;
    }
  },

  // Get all students risk summary
  getAllStudentsRisk: async (params = {}) => {
    try {
      const response = await api.get('/analytics/student/risk/all', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching students risk:', error);
      return { data: [], summary: {} };
    }
  },

  // Get route optimization
  optimizeRoute: async (routeId, stops) => {
    try {
      const response = await api.post(`/analytics/route/${routeId}/optimize`, { stops });
      return response.data;
    } catch (error) {
      console.error('Error optimizing route:', error);
      throw error;
    }
  },

  // Predict travel time
  predictTravelTime: async (routeId, conditions) => {
    try {
      const response = await api.post(`/analytics/route/${routeId}/predict-time`, conditions);
      return response.data;
    } catch (error) {
      console.error('Error predicting travel time:', error);
      throw error;
    }
  },

  // Get recent anomalies
  getRecentAnomalies: async (limit = 20) => {
    try {
      const response = await api.get('/analytics/anomalies/recent', { params: { limit } });
      return response.data;
    } catch (error) {
      console.error('Error fetching anomalies:', error);
      return { data: { anomalies: [], summary: {} } };
    }
  },

  // Export analytics report
  exportReport: async (type, format = 'csv') => {
    try {
      const response = await api.get(`/analytics/export`, {
        params: { type, format },
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting report:', error);
      throw error;
    }
  }
};