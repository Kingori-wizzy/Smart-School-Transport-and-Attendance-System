import api from './api';

/**
 * Student service with role-based endpoint handling
 * 
 * Different endpoints for different user roles:
 * - Admin:  /api/students (all students)
 * - Parent: /api/parents/children (their children only)
 * - Driver: /api/students/transport (transport students)
 */

// Helper to determine which endpoint to use based on user role
const getEndpoint = (userRole, options = {}) => {
  const { transportOnly = false, unlinked = false, byBus = null, studentId = null } = options;
  
  // Parent-specific endpoints
  if (userRole === 'parent') {
    if (studentId) {
      return `/parents/children/${studentId}`;
    }
    return '/parents/children';
  }
  
  // Driver-specific endpoints
  if (userRole === 'driver') {
    if (byBus) {
      return `/students/by-bus/${byBus}`;
    }
    return '/students/transport';
  }
  
  // Admin endpoints (with various filters)
  if (unlinked) {
    return '/students/unlinked';
  }
  
  if (transportOnly) {
    return '/students/transport';
  }
  
  // Default admin endpoint
  return '/students';
};

export const studentService = {
  // ==================== BASIC CRUD WITH ROLE SUPPORT ====================

  /**
   * Get all students with optional filters (role-aware)
   * @param {Object} params - Query parameters (page, limit, class, search, etc.)
   * @param {string} userRole - Current user role ('admin', 'parent', 'driver')
   * @param {Object} options - Additional options (transportOnly, unlinked, byBus)
   */
  getStudents: async (params = {}, userRole = 'admin', options = {}) => {
    try {
      const endpoint = getEndpoint(userRole, options);
      
      console.log(`📡 Fetching students from: ${endpoint} (role: ${userRole})`);
      
      const response = await api.get(endpoint, { params });
      
      // Handle different response structures
      let data = [];
      let pagination = null;
      let total = 0;
      
      if (response.data?.data) {
        // Standard response: { success: true, data: [...] }
        data = response.data.data;
        pagination = response.data.pagination;
        total = response.data.total || data.length;
      } else if (Array.isArray(response.data)) {
        // Direct array response
        data = response.data;
        total = data.length;
      } else if (response.data?.students) {
        // Alternative format
        data = response.data.students;
        total = response.data.count || data.length;
      }
      
      return {
        success: true,
        data,
        pagination,
        total,
        count: data.length
      };
    } catch (error) {
      console.error('❌ Error fetching students:', error);
      return { 
        success: false, 
        data: [], 
        total: 0,
        error: error.message 
      };
    }
  },

  /**
   * Get single student by ID (role-aware)
   * @param {string} id - Student ID
   * @param {string} userRole - Current user role
   */
  getStudent: async (id, userRole = 'admin') => {
    try {
      const endpoint = getEndpoint(userRole, { studentId: id });
      
      const response = await api.get(endpoint);
      
      return {
        success: true,
        data: response.data?.data || response.data
      };
    } catch (error) {
      console.error('❌ Error fetching student:', error);
      return { 
        success: false, 
        data: null,
        error: error.message 
      };
    }
  },

  /**
   * Get parent's children (convenience method for parent role)
   */
  getParentChildren: async (params = {}) => {
    return studentService.getStudents(params, 'parent');
  },

  /**
   * Get transport students (for drivers and admins)
   */
  getTransportStudents: async (params = {}, userRole = 'admin') => {
    return studentService.getStudents(params, userRole, { transportOnly: true });
  },

  /**
   * Get unlinked students (admins only)
   */
  getUnlinkedStudents: async (params = {}) => {
    return studentService.getStudents(params, 'admin', { unlinked: true });
  },

  /**
   * Get students by bus (for drivers)
   */
  getStudentsByBus: async (busId, params = {}) => {
    return studentService.getStudents(params, 'driver', { byBus: busId });
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
      console.error('❌ Error fetching student stats:', error);
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

  // ==================== ADMIN-ONLY OPERATIONS ====================

  /**
   * Create new student (admin only)
   */
  createStudent: async (studentData) => {
    try {
      const response = await api.post('/students', studentData);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating student:', error);
      throw error;
    }
  },

  /**
   * Update student (admin only)
   */
  updateStudent: async (id, studentData) => {
    try {
      const response = await api.put(`/students/${id}`, studentData);
      return response.data;
    } catch (error) {
      console.error('❌ Error updating student:', error);
      throw error;
    }
  },

  /**
   * Delete student (deactivate) - admin only
   */
  deleteStudent: async (id) => {
    try {
      const response = await api.delete(`/students/${id}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting student:', error);
      throw error;
    }
  },

  // ==================== TRANSPORT MANAGEMENT ====================

  /**
   * Update student transport status (admin only)
   */
  updateTransportStatus: async (id, data) => {
    try {
      const response = await api.patch(`/students/${id}/transport`, data);
      return response.data;
    } catch (error) {
      console.error('❌ Error updating transport status:', error);
      throw error;
    }
  },

  /**
   * Generate QR code for student (admin only)
   */
  generateQR: async (id) => {
    try {
      const response = await api.post(`/students/${id}/generate-qr`);
      return response.data;
    } catch (error) {
      console.error('❌ Error generating QR:', error);
      throw error;
    }
  },

  // ==================== PARENT APP ENDPOINTS ====================

  /**
   * Verify admission number and link student to parent
   */
  verifyAdmission: async (admissionNumber, studentName = '') => {
    try {
      const response = await api.post('/students/verify-admission', {
        admissionNumber,
        studentName
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error verifying admission:', error);
      throw error;
    }
  },

  // ==================== FILTERS ====================

  /**
   * Get students by class (admin only)
   */
  getStudentsByClass: async (className, params = {}) => {
    try {
      const response = await api.get('/students', {
        params: { class: className, limit: 1000, ...params }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching students by class:', error);
      return { data: [] };
    }
  },

  /**
   * Get students without parent links (admin only)
   */
  getStudentsWithoutParents: async () => {
    try {
      const response = await api.get('/students/without-parents');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching students without parents:', error);
      return { data: [], count: 0 };
    }
  },

  // ==================== BULK OPERATIONS ====================

  /**
   * Bulk update students (admin only)
   */
  bulkUpdate: async (studentIds, updateData) => {
    try {
      const response = await api.post('/students/bulk-update', {
        studentIds,
        ...updateData
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error in bulk update:', error);
      throw error;
    }
  },

  /**
   * Export students data (admin only)
   */
  exportStudents: async (format = 'csv', filters = {}) => {
    try {
      const response = await api.get('/students/export', {
        params: { format, ...filters },
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error exporting students:', error);
      throw error;
    }
  }
};

// Also export as default for convenience
export default studentService;