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
      return { data: { total: 0, present: 0, recentScans: [] } };
    }
  },

  // Get attendance by date range
  getAttendanceByDateRange: async (startDate, endDate) => {
    try {
      const response = await api.get('/attendance/range', {
        params: { startDate, endDate }
      });
      return response.data.data || response.data;
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

  // ✅ NEW: Get attendance stats summary (for dashboard)
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
      return response.data;
    } catch (error) {
      console.error('Error fetching student attendance:', error);
      return { records: [], stats: {} };
    }
  },

  // Get attendance by trip
  getTripAttendance: async (tripId) => {
    try {
      const response = await api.get(`/attendance/trip/${tripId}`);
      return response.data;
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
      return response.data;
    } catch (error) {
      console.error('Error fetching child today attendance:', error);
      return { present: false, status: 'not recorded' };
    }
  },

  // Get child attendance history
  getChildAttendanceHistory: async (childId, params = {}) => {
    try {
      const response = await api.get(`/attendance/child/${childId}`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching child attendance history:', error);
      return [];
    }
  },

  // Get child attendance stats
  getChildAttendanceStats: async (childId, params = {}) => {
    try {
      const response = await api.get(`/attendance/child/${childId}/stats`, { params });
      return response.data;
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
      const response = await api.post(`/attendance/driver/trip/${tripId}/board/${studentId}`, data);
      return response.data;
    } catch (error) {
      console.error('Error boarding student:', error);
      throw error;
    }
  },

  // Alight student
  alightStudent: async (tripId, studentId, data = {}) => {
    try {
      const response = await api.post(`/attendance/driver/trip/${tripId}/alight/${studentId}`, data);
      return response.data;
    } catch (error) {
      console.error('Error alighting student:', error);
      throw error;
    }
  },

  // Sync offline scans
  syncOfflineScans: async (scans) => {
    try {
      const response = await api.post('/attendance/driver/sync-offline', { scans });
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
      return response.data;
    } catch (error) {
      console.error('Error fetching trip students:', error);
      return { data: [] };
    }
  }
};