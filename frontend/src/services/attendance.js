/* eslint-disable no-unused-vars */
// File: frontend/src/services/attendance.js

import api from './api';

export const attendanceService = {
  // ==========================================
  // BASIC ATTENDANCE METHODS
  // ==========================================

  // Get today's attendance
  getTodayAttendance: async () => {
    try {
      const response = await api.get('/attendance/today');
      return response.data;
    } catch (error) {
      console.error('Error fetching today\'s attendance:', error);
      return { 
        success: false, 
        data: { 
          total: 0, 
          present: 0, 
          attendanceRate: 0,
          recentScans: [] 
        } 
      };
    }
  },

  // Get attendance by date range
  getAttendanceByDateRange: async (startDate, endDate) => {
    try {
      const response = await api.get('/attendance/range', {
        params: { startDate, endDate }
      });
      
      // Handle different response formats
      if (response.data?.success) {
        return response.data.data || { records: [], chartData: {} };
      } else if (response.data?.data) {
        return response.data.data;
      } else {
        return { records: response.data || [], chartData: {} };
      }
    } catch (error) {
      console.error('Error fetching attendance by date range:', error);
      return { records: [], chartData: {} };
    }
  },

  // Get attendance stats
  getAttendanceStats: async () => {
    try {
      const response = await api.get('/attendance/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching attendance stats:', error);
      return { 
        success: false, 
        data: { 
          today: 0, 
          totalStudents: 0, 
          attendanceRate: 0,
          weekly: [],
          byClass: [] 
        } 
      };
    }
  },

  // Get attendance stats summary (detailed)
  getAttendanceStatsSummary: async () => {
    try {
      const response = await api.get('/attendance/stats/summary');
      return response.data;
    } catch (error) {
      console.error('Error fetching attendance stats summary:', error);
      return { 
        success: false, 
        data: { 
          today: 0, 
          totalStudents: 0, 
          attendanceRate: 0,
          uniqueStudents: 0,
          weekly: [],
          monthly: [],
          byClass: [],
          peakHours: []
        } 
      };
    }
  },

  // Get attendance by student
  getStudentAttendance: async (studentId) => {
    try {
      const response = await api.get(`/attendance/student/${studentId}`);
      
      if (response.data?.success) {
        return response.data.data;
      }
      return response.data || { records: [], stats: {} };
    } catch (error) {
      console.error('Error fetching student attendance:', error);
      return { records: [], stats: {} };
    }
  },

  // Get attendance by trip
  getTripAttendance: async (tripId) => {
    try {
      const response = await api.get(`/attendance/trip/${tripId}`);
      
      if (response.data?.success) {
        return response.data.data;
      }
      return response.data || { records: [], summary: {} };
    } catch (error) {
      console.error('Error fetching trip attendance:', error);
      return { records: [], summary: {} };
    }
  },

  // ==========================================
  // ATTENDANCE RECORDING
  // ==========================================

  // Record new attendance
  recordAttendance: async (attendanceData) => {
    try {
      const response = await api.post('/attendance', attendanceData);
      return response.data;
    } catch (error) {
      console.error('Error recording attendance:', error);
      throw error;
    }
  },

  // ==========================================
  // CHILD/PARENT ENDPOINTS
  // ==========================================

  // Get child's today attendance
  getChildTodayAttendance: async (childId) => {
    try {
      const response = await api.get(`/attendance/child/${childId}/today`);
      
      if (response.data?.success) {
        return response.data.data;
      }
      return response.data || { present: false, status: 'not recorded' };
    } catch (error) {
      console.error('Error fetching child today attendance:', error);
      return { present: false, status: 'not recorded' };
    }
  },

  // Get child attendance history
  getChildAttendanceHistory: async (childId, params = {}) => {
    try {
      const response = await api.get(`/attendance/child/${childId}`, { params });
      return response.data || [];
    } catch (error) {
      console.error('Error fetching child attendance history:', error);
      return [];
    }
  },

  // Get child attendance stats
  getChildAttendanceStats: async (childId, params = {}) => {
    try {
      const response = await api.get(`/attendance/child/${childId}/stats`, { params });
      
      if (response.data?.success) {
        return response.data.data;
      }
      return response.data || {
        attendanceRate: 0,
        totalTrips: 0,
        lateArrivals: 0,
        present: 0,
        absent: 0,
        late: 0
      };
    } catch (error) {
      console.error('Error fetching child attendance stats:', error);
      return {
        attendanceRate: 0,
        totalTrips: 0,
        lateArrivals: 0,
        present: 0,
        absent: 0,
        late: 0
      };
    }
  },

  // Export child attendance report
  exportChildAttendance: async (childId, month) => {
    try {
      const response = await api.get(`/attendance/child/${childId}/export`, {
        params: { month },
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting child attendance:', error);
      throw error;
    }
  },

  // ==========================================
  // DRIVER ENDPOINTS
  // ==========================================

  // Board student
  boardStudent: async (tripId, studentId, data = {}) => {
    try {
      const response = await api.post(`/attendance/driver/trip/${tripId}/board/${studentId}`, {
        ...data,
        method: data.method || 'qr',
        timestamp: data.timestamp || new Date().toISOString()
      });
      return response.data;
    } catch (error) {
      console.error('Error boarding student:', error);
      throw error;
    }
  },

  // Alight student
  alightStudent: async (tripId, studentId, data = {}) => {
    try {
      const response = await api.post(`/attendance/driver/trip/${tripId}/alight/${studentId}`, {
        ...data,
        method: data.method || 'qr',
        timestamp: data.timestamp || new Date().toISOString()
      });
      return response.data;
    } catch (error) {
      console.error('Error alighting student:', error);
      throw error;
    }
  },

  // Sync offline scans
  syncOfflineScans: async (scans) => {
    try {
      const response = await api.post('/attendance/driver/sync-offline', { 
        scans,
        deviceId: await getDeviceId()
      });
      return response.data;
    } catch (error) {
      console.error('Error syncing offline scans:', error);
      throw error;
    }
  },

  // Get trip students
  getTripStudents: async (tripId) => {
    try {
      const response = await api.get(`/attendance/driver/trip/${tripId}/students`);
      
      if (response.data?.success) {
        return response.data;
      }
      return { data: [] };
    } catch (error) {
      console.error('Error fetching trip students:', error);
      return { data: [] };
    }
  },

  // ==========================================
  // ANALYTICS ENDPOINTS
  // ==========================================

  // Get daily summary
  getDailySummary: async (date) => {
    try {
      const response = await api.get('/attendance/daily-summary', {
        params: { date: date || new Date().toISOString().split('T')[0] }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching daily summary:', error);
      return { data: {} };
    }
  },

  // Get weekly trends
  getWeeklyTrends: async () => {
    try {
      const response = await api.get('/attendance/weekly-trends');
      return response.data;
    } catch (error) {
      console.error('Error fetching weekly trends:', error);
      return { data: [] };
    }
  },

  // Get monthly report
  getMonthlyReport: async (month, year) => {
    try {
      const response = await api.get('/attendance/monthly-report', {
        params: { month, year }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching monthly report:', error);
      return { data: {} };
    }
  }
};

// Helper function to get device ID (for driver app)
async function getDeviceId() {
  try {
    let deviceId = localStorage.getItem('@device_id');
    if (!deviceId) {
      deviceId = `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('@device_id', deviceId);
    }
    return deviceId;
  } catch (error) {
    return `web_${Date.now()}`;
  }
}