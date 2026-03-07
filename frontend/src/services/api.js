import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH ENDPOINTS ====================
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  verifyToken: () => api.get('/auth/verify'),
};

// ==================== ATTENDANCE ENDPOINTS ====================
export const attendanceAPI = {
  // Parent endpoints
  getChildTodayAttendance: (childId) => api.get(`/attendance/child/${childId}/today`),
  getChildAttendanceHistory: (childId, params) => api.get(`/attendance/child/${childId}`, { params }),
  getChildAttendanceStats: (childId, params) => api.get(`/attendance/child/${childId}/stats`, { params }),
  exportAttendance: (childId, month) => api.get(`/attendance/child/${childId}/export`, { 
    params: { month },
    responseType: 'blob' 
  }),

  // Driver endpoints
  recordBoarding: (tripId, studentId, data) => 
    api.post(`/attendance/driver/trip/${tripId}/board/${studentId}`, data),
  recordAlighting: (tripId, studentId, data) => 
    api.post(`/attendance/driver/trip/${tripId}/alight/${studentId}`, data),
  syncOfflineScans: (scans) => api.post('/attendance/driver/sync-offline', { scans }),
  getTripStudents: (tripId) => api.get(`/attendance/driver/trip/${tripId}/students`),
};

// ==================== NOTIFICATION ENDPOINTS ====================
export const notificationAPI = {
  // Get all notifications for current user
  getNotifications: (params) => api.get('/notifications', { params }),
  
  // Get unread count
  getUnreadCount: () => api.get('/notifications/unread/count'),
  
  // Mark single notification as read
  markAsRead: (notificationId) => api.put(`/notifications/${notificationId}/read`),
  
  // Mark all notifications as read
  markAllAsRead: () => api.put('/notifications/read-all'),
  
  // Delete notification
  deleteNotification: (notificationId) => api.delete(`/notifications/${notificationId}`),
  
  // Get notification settings
  getSettings: () => api.get('/notifications/settings'),
  
  // Update notification settings
  updateSettings: (settings) => api.put('/notifications/settings', settings),
};

// ==================== SMS MANAGEMENT ENDPOINTS (Admin Only) ====================
export const smsAPI = {
  // Get SMS statistics and provider health
  getStats: () => api.get('/sms/stats'),
  
  // Test SMS provider
  testSMS: (data) => api.post('/sms/test', data),
  
  // Get SMS history
  getHistory: (params) => api.get('/sms/history', { params }),
  
  // Get provider balance
  getProviderBalance: (provider) => api.get(`/sms/balance/${provider}`),
  
  // Retry failed SMS
  retrySMS: (notificationId) => api.post(`/sms/retry/${notificationId}`),
  
  // Get cost summary
  getCostSummary: (startDate, endDate) => 
    api.get('/sms/cost-summary', { params: { startDate, endDate } }),
};

// ==================== STUDENT ENDPOINTS ====================
export const studentAPI = {
  // Get all students (for admin/parent)
  getStudents: (params) => api.get('/students', { params }),
  
  // Get single student
  getStudent: (id) => api.get(`/students/${id}`),
  
  // Create student (admin only)
  createStudent: (data) => api.post('/students', data),
  
  // Update student
  updateStudent: (id, data) => api.put(`/students/${id}`, data),
  
  // Delete student (admin only)
  deleteStudent: (id) => api.delete(`/students/${id}`),
  
  // Get student QR code
  getStudentQR: (id) => api.get(`/students/${id}/qr`, { responseType: 'blob' }),
  
  // Get students by bus
  getStudentsByBus: (busId) => api.get(`/students/bus/${busId}`),
};

// ==================== TRIP ENDPOINTS ====================
export const tripAPI = {
  // Get active trips
  getActiveTrips: () => api.get('/trips/active'),
  
  // Get trip by ID
  getTrip: (id) => api.get(`/trips/${id}`),
  
  // Get today's trips (for driver)
  getTodayTrips: () => api.get('/trips/today'),
  
  // Start trip (driver)
  startTrip: (tripId) => api.post(`/trips/${tripId}/start`),
  
  // End trip (driver)
  endTrip: (tripId) => api.post(`/trips/${tripId}/end`),
  
  // Update trip location (driver)
  updateLocation: (tripId, location) => 
    api.post(`/trips/${tripId}/location`, location),
  
  // Get trip history
  getTripHistory: (params) => api.get('/trips/history', { params }),
};

// ==================== BUS ENDPOINTS ====================
export const busAPI = {
  // Get all buses
  getBuses: (params) => api.get('/buses', { params }),
  
  // Get bus by ID
  getBus: (id) => api.get(`/buses/${id}`),
  
  // Create bus (admin)
  createBus: (data) => api.post('/buses', data),
  
  // Update bus
  updateBus: (id, data) => api.put(`/buses/${id}`, data),
  
  // Delete bus (admin)
  deleteBus: (id) => api.delete(`/buses/${id}`),
  
  // Get bus location
  getBusLocation: (id) => api.get(`/buses/${id}/location`),
  
  // Get bus route
  getBusRoute: (id) => api.get(`/buses/${id}/route`),
};

// ==================== DRIVER ENDPOINTS ====================
export const driverAPI = {
  // Get driver profile
  getProfile: () => api.get('/driver/profile'),
  
  // Update driver profile
  updateProfile: (data) => api.put('/driver/profile', data),
  
  // Get driver stats
  getStats: () => api.get('/driver/stats'),
  
  // Get driver trips
  getTrips: (params) => api.get('/driver/trips', { params }),
  
  // Update driver availability
  updateAvailability: (status) => api.put('/driver/availability', { status }),
  
  // Get driver current trip
  getCurrentTrip: () => api.get('/driver/current-trip'),
};

// ==================== PARENT ENDPOINTS ====================
export const parentAPI = {
  // Get parent profile
  getProfile: () => api.get('/parent/profile'),
  
  // Update parent profile
  updateProfile: (data) => api.put('/parent/profile', data),
  
  // Get parent children
  getChildren: () => api.get('/parent/children'),
  
  // Get child location
  getChildLocation: (childId) => api.get(`/parent/child/${childId}/location`),
  
  // Get child trips
  getChildTrips: (childId, params) => api.get(`/parent/child/${childId}/trips`, { params }),
};

// ==================== GEOFENCE ENDPOINTS ====================
export const geofenceAPI = {
  // Get all geofences
  getGeofences: () => api.get('/geofences'),
  
  // Create geofence (admin)
  createGeofence: (data) => api.post('/geofences', data),
  
  // Update geofence
  updateGeofence: (id, data) => api.put(`/geofences/${id}`, data),
  
  // Delete geofence
  deleteGeofence: (id) => api.delete(`/geofences/${id}`),
  
  // Validate location
  validateLocation: (location, geofenceId) => 
    api.post('/geofences/validate', { location, geofenceId }),
};

// ==================== ANALYTICS ENDPOINTS ====================
export const analyticsAPI = {
  // Get attendance analytics
  getAttendanceAnalytics: (params) => api.get('/analytics/attendance', { params }),
  
  // Get route analytics
  getRouteAnalytics: (params) => api.get('/analytics/routes', { params }),
  
  // Get bus utilization
  getBusUtilization: (params) => api.get('/analytics/bus-utilization', { params }),
  
  // Get driver performance
  getDriverPerformance: (params) => api.get('/analytics/driver-performance', { params }),
  
  // Get cost analytics
  getCostAnalytics: (params) => api.get('/analytics/costs', { params }),
  
  // Export analytics report
  exportReport: (type, params) => api.get(`/analytics/export/${type}`, { 
    params,
    responseType: 'blob' 
  }),
};

// ==================== REPORT ENDPOINTS ====================
export const reportAPI = {
  // Generate attendance report
  generateAttendanceReport: (params) => api.post('/reports/attendance', params),
  
  // Generate transport report
  generateTransportReport: (params) => api.post('/reports/transport', params),
  
  // Get generated reports
  getReports: (params) => api.get('/reports', { params }),
  
  // Download report
  downloadReport: (reportId) => api.get(`/reports/${reportId}/download`, {
    responseType: 'blob'
  }),
  
  // Delete report
  deleteReport: (reportId) => api.delete(`/reports/${reportId}`),
};

// ==================== EMERGENCY ENDPOINTS ====================
export const emergencyAPI = {
  // Send SOS alert
  sendSOS: (data) => api.post('/emergency/sos', data),
  
  // Get emergency contacts
  getContacts: () => api.get('/emergency/contacts'),
  
  // Add emergency contact
  addContact: (data) => api.post('/emergency/contacts', data),
  
  // Update emergency contact
  updateContact: (id, data) => api.put(`/emergency/contacts/${id}`, data),
  
  // Delete emergency contact
  deleteContact: (id) => api.delete(`/emergency/contacts/${id}`),
  
  // Get emergency history
  getHistory: (params) => api.get('/emergency/history', { params }),
};

// ==================== SYSTEM ENDPOINTS ====================
export const systemAPI = {
  // Get system health
  getHealth: () => api.get('/system/health'),
  
  // Get system stats
  getStats: () => api.get('/system/stats'),
  
  // Get system logs (admin only)
  getLogs: (params) => api.get('/system/logs', { params }),
  
  // Clear cache (admin only)
  clearCache: () => api.post('/system/clear-cache'),
};

// Default export for backward compatibility
export default {
  ...api,
  auth: authAPI,
  attendance: attendanceAPI,
  notifications: notificationAPI,
  sms: smsAPI,
  students: studentAPI,
  trips: tripAPI,
  buses: busAPI,
  drivers: driverAPI,
  parents: parentAPI,
  geofence: geofenceAPI,
  analytics: analyticsAPI,
  reports: reportAPI,
  emergency: emergencyAPI,
  system: systemAPI,
};