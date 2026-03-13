import api from './api';

export const studentService = {
  // ==================== BASIC CRUD ====================

  // Get all students with optional filters
  getStudents: async (params = {}) => {
    try {
      const response = await api.get('/students', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching students:', error);
      return { data: [], total: 0 };
    }
  },

  // Get single student by ID
  getStudent: async (id) => {
    try {
      const response = await api.get(`/students/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching student:', error);
      return null;
    }
  },

  // Create new student
  createStudent: async (studentData) => {
    try {
      const response = await api.post('/students', studentData);
      return response.data;
    } catch (error) {
      console.error('Error creating student:', error);
      throw error;
    }
  },

  // Update student
  updateStudent: async (id, studentData) => {
    try {
      const response = await api.put(`/students/${id}`, studentData);
      return response.data;
    } catch (error) {
      console.error('Error updating student:', error);
      throw error;
    }
  },

  // Delete student (deactivate)
  deleteStudent: async (id) => {
    try {
      const response = await api.delete(`/students/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting student:', error);
      throw error;
    }
  },

  // ==================== STATISTICS & REPORTS ====================

  /**
   * Get comprehensive student statistics for dashboard
   * @returns {Promise<Object>} Student statistics
   */
  getStats: async () => {
    try {
      const response = await api.get('/students/stats/summary');
      return response.data;
    } catch (error) {
      console.error('Error fetching student stats:', error);
      return { 
        success: false, 
        data: { 
          overview: {
            total: 0,
            active: 0,
            transport: 0,
            linked: 0,
            unlinked: 0,
            recentRegistrations: 0
          },
          distribution: {
            byClass: [],
            byGender: [],
            byBus: []
          }
        }
      };
    }
  },

  // ==================== TRANSPORT STUDENTS ====================

  /**
   * Get all transport students with pagination and filters
   * @param {Object} params - Query parameters (page, limit, status, class, busId)
   * @returns {Promise<Object>} Transport students list
   */
  getTransportStudents: async (params = {}) => {
    try {
      const response = await api.get('/students/transport', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching transport students:', error);
      return { data: [], pagination: { total: 0 } };
    }
  },

  /**
   * Get transport students not linked to parents
   * @returns {Promise<Object>} Unlinked students list
   */
  getUnlinkedStudents: async () => {
    try {
      const response = await api.get('/students/unlinked');
      return response.data;
    } catch (error) {
      console.error('Error fetching unlinked students:', error);
      return { data: [], count: 0 };
    }
  },

  /**
   * Get students assigned to a specific bus
   * @param {string} busId - Bus ID
   * @returns {Promise<Object>} Bus students list
   */
  getStudentsByBus: async (busId) => {
    try {
      const response = await api.get(`/students/by-bus/${busId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching students by bus:', error);
      return { data: [], count: 0 };
    }
  },

  /**
   * Get all students without parent links (including non-transport)
   * @returns {Promise<Object>} Unlinked students list
   */
  getStudentsWithoutParents: async () => {
    try {
      const response = await api.get('/students/without-parents');
      return response.data;
    } catch (error) {
      console.error('Error fetching students without parents:', error);
      return { data: [], count: 0 };
    }
  },

  // ==================== FILTERS ====================

  /**
   * Get students by class
   * @param {string} className - Class name
   * @returns {Promise<Object>} Students list
   */
  getStudentsByClass: async (className) => {
    try {
      const response = await api.get('/students', {
        params: { class: className, limit: 1000 }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching students by class:', error);
      return { data: [] };
    }
  },

  /**
   * Get students by bus ID (legacy method)
   * @param {string} busId - Bus ID
   * @returns {Promise<Object>} Students list
   */
  getStudentsByBusLegacy: async (busId) => {
    try {
      const response = await api.get('/students', {
        params: { busId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching students by bus:', error);
      return { data: [] };
    }
  },

  // ==================== PARENT APP ENDPOINTS ====================

  /**
   * Verify admission number and link student to parent
   * @param {string} admissionNumber - Student admission number
   * @param {string} studentName - Optional student name for verification
   * @returns {Promise<Object>} Verification result
   */
  verifyAdmission: async (admissionNumber, studentName = '') => {
    try {
      const response = await api.post('/students/verify-admission', {
        admissionNumber,
        studentName
      });
      return response.data;
    } catch (error) {
      console.error('Error verifying admission:', error);
      throw error;
    }
  },

  // ==================== QR CODE MANAGEMENT ====================

  /**
   * Generate QR code for student
   * @param {string} id - Student ID
   * @returns {Promise<Object>} QR code data
   */
  generateQR: async (id) => {
    try {
      const response = await api.post(`/students/${id}/generate-qr`);
      return response.data;
    } catch (error) {
      console.error('Error generating QR:', error);
      throw error;
    }
  },

  // ==================== TRANSPORT STATUS MANAGEMENT ====================

  /**
   * Update student transport status
   * @param {string} id - Student ID
   * @param {Object} data - Transport status data
   * @returns {Promise<Object>} Updated student
   */
  updateTransportStatus: async (id, data) => {
    try {
      const response = await api.patch(`/students/${id}/transport`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating transport status:', error);
      throw error;
    }
  },

  // ==================== BULK OPERATIONS ====================

  /**
   * Bulk update students (e.g., assign to bus)
   * @param {Array} studentIds - Array of student IDs
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Update result
   */
  bulkUpdate: async (studentIds, updateData) => {
    try {
      const response = await api.post('/students/bulk-update', {
        studentIds,
        ...updateData
      });
      return response.data;
    } catch (error) {
      console.error('Error in bulk update:', error);
      throw error;
    }
  },

  /**
   * Export students data
   * @param {string} format - 'csv' or 'excel'
   * @param {Object} filters - Filters to apply
   * @returns {Promise<Blob>} File blob
   */
  exportStudents: async (format = 'csv', filters = {}) => {
    try {
      const response = await api.get('/students/export', {
        params: { format, ...filters },
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting students:', error);
      throw error;
    }
  }
};