/* eslint-disable no-unused-vars */
// File: frontend/src/services/attendance.js

import api from './api';

// ✅ FIXED: Remove '/api' prefix since api.js already has baseURL '/api'
const API_BASE = '/attendance';

export const attendanceService = {
  // ==========================================
  // BASIC ATTENDANCE METHODS
  // ==========================================

  // Get all attendance records with pagination
  getAttendance: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value);
        }
      });
      const url = `${API_BASE}?${queryParams.toString()}`;
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      return { 
        success: false, 
        data: [], 
        total: 0,
        page: 1,
        pages: 0,
        summary: { totalRecords: 0, boardings: 0, alightings: 0, late: 0 }
      };
    }
  },

  // Get today's attendance summary for dashboard scanner
  getTodayAttendance: async () => {
    try {
      const response = await api.get(`${API_BASE}/today`);
      return response.data?.data || { 
        total: 0, 
        present: 0, 
        attendanceRate: 0, 
        recentScans: [] 
      };
    } catch (error) {
      console.error('Error fetching today\'s attendance:', error);
      return { 
        total: 0, 
        present: 0, 
        attendanceRate: 0,
        recentScans: [] 
      };
    }
  },

  // Get attendance by date range
  getAttendanceByDateRange: async (startDate, endDate) => {
    try {
      const response = await api.get(`${API_BASE}/range`, {
        params: { startDate, endDate }
      });
      
      // Handle different response formats
      if (response.data?.success) {
        return response.data.data || { records: [], chartData: {} };
      } else if (response.data?.data) {
        return response.data.data;
      }
      return { records: response.data || [], chartData: {} };
    } catch (error) {
      console.error('Error fetching attendance by date range:', error);
      return { records: [], chartData: {} };
    }
  },

  // Get attendance statistics for dashboard
  getAttendanceStats: async () => {
    try {
      const response = await api.get(`${API_BASE}/stats`);
      return response.data?.data || { 
        today: 0, 
        totalStudents: 0, 
        attendanceRate: 0,
        weekly: [],
        byClass: [],
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error fetching attendance stats:', error);
      return { 
        today: 0, 
        totalStudents: 0, 
        attendanceRate: 0,
        weekly: [],
        byClass: [],
        timestamp: new Date()
      };
    }
  },

  // Get detailed attendance stats summary
  getAttendanceStatsSummary: async () => {
    try {
      const response = await api.get(`${API_BASE}/stats/summary`);
      return response.data?.data || { 
        today: 0, 
        totalStudents: 0, 
        attendanceRate: 0,
        uniqueStudents: 0,
        weekly: [],
        monthly: [],
        byClass: [],
        peakHours: []
      };
    } catch (error) {
      console.error('Error fetching attendance stats summary:', error);
      return { 
        today: 0, 
        totalStudents: 0, 
        attendanceRate: 0,
        uniqueStudents: 0,
        weekly: [],
        monthly: [],
        byClass: [],
        peakHours: []
      };
    }
  },

  // Get attendance by student ID
  getStudentAttendance: async (studentId, params = {}) => {
    try {
      return await attendanceService.getAttendance({ studentId, ...params });
    } catch (error) {
      console.error('Error fetching student attendance:', error);
      return { records: [], stats: {} };
    }
  },

  // Get attendance by trip ID
  getTripAttendance: async (tripId, params = {}) => {
    try {
      return await attendanceService.getAttendance({ tripId, ...params });
    } catch (error) {
      console.error('Error fetching trip attendance:', error);
      return { records: [], summary: {} };
    }
  },

  // Get attendance by event type
  getAttendanceByType: async (eventType, params = {}) => {
    try {
      return await attendanceService.getAttendance({ eventType, ...params });
    } catch (error) {
      console.error('Error fetching attendance by type:', error);
      return { records: [] };
    }
  },

  // ==========================================
  // ATTENDANCE RECORDING (Admin)
  // ==========================================

  // Record new attendance (generic)
  recordAttendance: async (attendanceData) => {
    try {
      const response = await api.post(API_BASE, attendanceData);
      return response.data;
    } catch (error) {
      console.error('Error recording attendance:', error);
      throw error;
    }
  },

  // Record boarding (admin/driver)
  recordBoarding: async (tripId, studentId, data = {}) => {
    try {
      const response = await api.post(`${API_BASE}/driver/trip/${tripId}/board/${studentId}`, {
        method: data.method || 'qr',
        timestamp: data.timestamp || new Date().toISOString(),
        location: data.location,
        deviceId: data.deviceId
      });
      return response.data;
    } catch (error) {
      console.error('Error recording boarding:', error);
      throw error;
    }
  },

  // Record alighting (admin/driver)
  recordAlighting: async (tripId, studentId, data = {}) => {
    try {
      const response = await api.post(`${API_BASE}/driver/trip/${tripId}/alight/${studentId}`, {
        method: data.method || 'qr',
        timestamp: data.timestamp || new Date().toISOString(),
        location: data.location,
        deviceId: data.deviceId
      });
      return response.data;
    } catch (error) {
      console.error('Error recording alighting:', error);
      throw error;
    }
  },

  // ==========================================
  // DRIVER APP ENDPOINTS
  // ==========================================

  // Sync offline attendance scans
  syncOfflineAttendance: async (scans, deviceId) => {
    try {
      const response = await api.post(`${API_BASE}/driver/sync-offline`, { scans, deviceId });
      return response.data;
    } catch (error) {
      console.error('Error syncing offline attendance:', error);
      throw error;
    }
  },

  // Get students on a specific trip
  getTripStudents: async (tripId) => {
    try {
      const response = await api.get(`${API_BASE}/driver/trip/${tripId}/students`);
      return response.data?.data || [];
    } catch (error) {
      console.error('Error fetching trip students:', error);
      return [];
    }
  },

  // Get current active trip for driver
  getCurrentTrip: async () => {
    try {
      // ✅ FIXED: Remove duplicate /api
      const response = await api.get('/trips/current');
      return response.data?.data || null;
    } catch (error) {
      console.error('Error fetching current trip:', error);
      return null;
    }
  },

  // ==========================================
  // PARENT/CHILD APP ENDPOINTS
  // ==========================================

  // Get child's today attendance
  getChildTodayAttendance: async (childId) => {
    try {
      const response = await api.get(`${API_BASE}/child/${childId}/today`);
      return response.data || { present: false, status: 'not recorded' };
    } catch (error) {
      console.error('Error fetching child today attendance:', error);
      return { present: false, status: 'not recorded' };
    }
  },

  // Get child's attendance history
  getChildAttendanceHistory: async (childId, params = {}) => {
    try {
      const response = await api.get(`${API_BASE}/child/${childId}`, { params });
      return response.data || [];
    } catch (error) {
      console.error('Error fetching child attendance history:', error);
      return [];
    }
  },

  // Get child's attendance statistics
  getChildAttendanceStats: async (childId, months = 3) => {
    try {
      const response = await api.get(`${API_BASE}/child/${childId}/stats`, {
        params: { months }
      });
      return response.data || {
        attendanceRate: 0,
        totalTrips: 0,
        lateArrivals: 0,
        present: 0,
        absent: 0,
        late: 0,
        averagePickup: '--:--',
        averageDropoff: '--:--'
      };
    } catch (error) {
      console.error('Error fetching child attendance stats:', error);
      return {
        attendanceRate: 0,
        totalTrips: 0,
        lateArrivals: 0,
        present: 0,
        absent: 0,
        late: 0,
        averagePickup: '--:--',
        averageDropoff: '--:--'
      };
    }
  },

  // Export child's attendance report
  exportChildAttendance: async (childId, month) => {
    try {
      const response = await api.get(`${API_BASE}/child/${childId}/export`, {
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
  // ANALYTICS & REPORTS
  // ==========================================

  // Get daily summary for a specific date
  getDailySummary: async (date) => {
    try {
      const response = await api.get(`${API_BASE}/daily-summary`, {
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
      const response = await api.get(`${API_BASE}/weekly-trends`);
      return response.data;
    } catch (error) {
      console.error('Error fetching weekly trends:', error);
      return { data: [] };
    }
  },

  // Get monthly report
  getMonthlyReport: async (month, year) => {
    try {
      const response = await api.get(`${API_BASE}/monthly-report`, {
        params: { month, year }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching monthly report:', error);
      return { data: {} };
    }
  },

  // Get attendance summary for date range (admin)
  getAttendanceSummary: async (startDate, endDate) => {
    try {
      return await attendanceService.getAttendanceByDateRange(startDate, endDate);
    } catch (error) {
      console.error('Error fetching attendance summary:', error);
      return { records: [], chartData: {} };
    }
  },

  // Export attendance report (admin)
  exportAttendanceReport: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value);
        }
      });
      const url = `${API_BASE}/export?${queryParams.toString()}`;
      const response = await api.get(url, { responseType: 'blob' });
      return response.data;
    } catch (error) {
      console.error('Error exporting attendance report:', error);
      throw error;
    }
  }
};

// Helper function to get device ID (for driver app offline sync)
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

export default attendanceService;