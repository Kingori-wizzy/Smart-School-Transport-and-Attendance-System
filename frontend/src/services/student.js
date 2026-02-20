import api from './api';

export const studentService = {
  // Get all students
  getStudents: async () => {
    try {
      const response = await api.get('/students');
      return response.data;
    } catch (error) {
      console.error('Error fetching students:', error);
      return [];
    }
  },

  // Get single student
  getStudent: async (id) => {
    try {
      const response = await api.get(`/students/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching student:', error);
      return null;
    }
  },

  // Create student
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

  // Delete student
  deleteStudent: async (id) => {
    try {
      const response = await api.delete(`/students/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting student:', error);
      throw error;
    }
  },

  // Get students by class
  getStudentsByClass: async (className) => {
    try {
      const response = await api.get('/students', {
        params: { class: className }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching students by class:', error);
      return [];
    }
  },

  // Get students by bus
  getStudentsByBus: async (busId) => {
    try {
      const response = await api.get('/students', {
        params: { busId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching students by bus:', error);
      return [];
    }
  }
};