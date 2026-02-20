import api from './api';

export const attendanceService = {
  // Get today's attendance
  getTodayAttendance: async () => {
    try {
      const response = await api.get('/attendance/today');
      return response.data;
    } catch (error) {
      console.error('Error fetching today\'s attendance:', error);
      return [];
    }
  },

  // Add to attendanceService in src/services/attendance.js

getAttendanceByDateRange: async (startDate, endDate) => {
  try {
    const response = await api.get('/attendance/range', {
      params: { startDate, endDate }
    });
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching attendance by date range:', error);
    return [];
  }
},

  // Get attendance stats
  getAttendanceStats: async () => {
    try {
      const response = await api.get('/attendance/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching attendance stats:', error);
      return { total: 0, boardings: 0, alightings: 0, uniqueStudents: 0 };
    }
  },

  // Get attendance by student
  getStudentAttendance: async (studentId) => {
    try {
      const response = await api.get(`/attendance/student/${studentId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching student attendance:', error);
      return [];
    }
  },

  // Get attendance by trip
  getTripAttendance: async (tripId) => {
    try {
      const response = await api.get(`/attendance/trip/${tripId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching trip attendance:', error);
      return [];
    }
  },

  // Record new attendance
  recordAttendance: async (attendanceData) => {
    try {
      const response = await api.post('/attendance', attendanceData);
      return response.data;
    } catch (error) {
      console.error('Error recording attendance:', error);
      throw error;
    }
  }
};