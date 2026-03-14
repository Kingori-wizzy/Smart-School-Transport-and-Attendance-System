// File: frontend/src/services/route.js

import api from './api';

export const routeService = {
  // Get all routes with enhanced error handling
  getRoutes: async (params = {}) => {
    try {
      const response = await api.get('/routes', { params });
      
      // Handle different response formats
      if (response.data && response.data.success) {
        return {
          success: true,
          data: response.data.data || [],
          pagination: response.data.pagination || {
            total: response.data.data?.length || 0,
            page: 1,
            limit: 50,
            pages: 1
          }
        };
      } else if (Array.isArray(response.data)) {
        // Direct array response
        return {
          success: true,
          data: response.data,
          pagination: {
            total: response.data.length,
            page: 1,
            limit: response.data.length,
            pages: 1
          }
        };
      } else {
        console.warn('Unexpected response format:', response.data);
        return { 
          success: false, 
          data: [], 
          message: 'Unexpected response format',
          pagination: { total: 0, page: 1, limit: 50, pages: 1 }
        };
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
      return { 
        success: false, 
        data: [], 
        error: error.message,
        pagination: { total: 0, page: 1, limit: 50, pages: 1 }
      };
    }
  },

  // Get single route with enhanced error handling
  getRoute: async (id) => {
    try {
      if (!id) {
        throw new Error('Route ID is required');
      }
      
      const response = await api.get(`/routes/${id}`);
      
      if (response.data && response.data.success) {
        return {
          success: true,
          data: response.data.data
        };
      } else if (response.data && !response.data.success) {
        return {
          success: false,
          message: response.data.message || 'Failed to fetch route',
          data: null
        };
      } else {
        return {
          success: true,
          data: response.data
        };
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      return { 
        success: false, 
        data: null, 
        error: error.message 
      };
    }
  },

  // Create route with data validation
  createRoute: async (routeData) => {
    try {
      // Validate required fields
      if (!routeData.name) {
        throw new Error('Route name is required');
      }

      // Format the data to match backend expectations
      const formattedData = {
        name: routeData.name,
        description: routeData.description || '',
        distance: parseFloat(routeData.distance) || 0,
        estimatedDuration: parseInt(routeData.duration) || 0,
        active: routeData.status === 'active',
        busId: routeData.busId || null,
        stops: routeData.stops || []
      };

      // If start and end points are provided as separate fields, convert to stops
      if (routeData.startPoint && routeData.stops.length === 0) {
        formattedData.stops.push({
          name: routeData.startPoint,
          order: 0,
          arrivalTime: routeData.startTime || '07:00'
        });
      }
      
      if (routeData.endPoint && routeData.endPoint !== routeData.startPoint) {
        formattedData.stops.push({
          name: routeData.endPoint,
          order: formattedData.stops.length,
          arrivalTime: routeData.endTime || '08:00'
        });
      }

      const response = await api.post('/routes', formattedData);
      
      // Handle different response formats
      if (response.data && response.data.success) {
        return {
          success: true,
          data: response.data.data,
          message: response.data.message || 'Route created successfully'
        };
      } else if (response.data && response.data._id) {
        // Direct object response
        return {
          success: true,
          data: response.data,
          message: 'Route created successfully'
        };
      } else {
        return {
          success: true,
          data: response.data,
          message: 'Route created'
        };
      }
    } catch (error) {
      console.error('Error creating route:', error);
      
      // Enhanced error message extraction
      let errorMessage = 'Failed to create route';
      if (error.response) {
        // Server responded with error
        errorMessage = error.response.data?.message || 
                      error.response.data?.error || 
                      `Server error: ${error.response.status}`;
      } else if (error.request) {
        // Request made but no response
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        // Something else happened
        errorMessage = error.message || errorMessage;
      }
      
      throw new Error(errorMessage);
    }
  },

  // Update route with data validation
  updateRoute: async (id, routeData) => {
    try {
      if (!id) {
        throw new Error('Route ID is required');
      }

      // Format the data to match backend expectations
      const formattedData = {
        name: routeData.name,
        description: routeData.description || '',
        distance: parseFloat(routeData.distance) || 0,
        estimatedDuration: parseInt(routeData.duration) || 0,
        active: routeData.status === 'active',
        busId: routeData.busId || null,
        stops: routeData.stops || []
      };

      // If start and end points are provided as separate fields, update stops
      if (routeData.startPoint || routeData.endPoint) {
        const stops = [];
        
        if (routeData.startPoint) {
          stops.push({
            name: routeData.startPoint,
            order: 0,
            arrivalTime: routeData.startTime || '07:00'
          });
        }
        
        if (routeData.endPoint && routeData.endPoint !== routeData.startPoint) {
          stops.push({
            name: routeData.endPoint,
            order: stops.length,
            arrivalTime: routeData.endTime || '08:00'
          });
        }
        
        formattedData.stops = stops;
      }

      const response = await api.put(`/routes/${id}`, formattedData);
      
      if (response.data && response.data.success) {
        return {
          success: true,
          data: response.data.data,
          message: response.data.message || 'Route updated successfully'
        };
      } else if (response.data && response.data._id) {
        return {
          success: true,
          data: response.data,
          message: 'Route updated successfully'
        };
      } else {
        return {
          success: true,
          data: response.data,
          message: 'Route updated'
        };
      }
    } catch (error) {
      console.error('Error updating route:', error);
      
      let errorMessage = 'Failed to update route';
      if (error.response) {
        errorMessage = error.response.data?.message || 
                      error.response.data?.error || 
                      `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      throw new Error(errorMessage);
    }
  },

  // Delete route with confirmation
  deleteRoute: async (id) => {
    try {
      if (!id) {
        throw new Error('Route ID is required');
      }

      const response = await api.delete(`/routes/${id}`);
      
      if (response.data && response.data.success) {
        return {
          success: true,
          message: response.data.message || 'Route deleted successfully'
        };
      } else {
        return {
          success: true,
          message: 'Route deleted successfully'
        };
      }
    } catch (error) {
      console.error('Error deleting route:', error);
      
      let errorMessage = 'Failed to delete route';
      if (error.response) {
        errorMessage = error.response.data?.message || 
                      error.response.data?.error || 
                      `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      throw new Error(errorMessage);
    }
  },

  // Get route stops with enhanced error handling
  getRouteStops: async (id) => {
    try {
      if (!id) {
        throw new Error('Route ID is required');
      }
      
      const response = await api.get(`/routes/${id}/stops`);
      
      if (response.data && response.data.success) {
        return {
          success: true,
          data: response.data.data || []
        };
      } else if (Array.isArray(response.data)) {
        return {
          success: true,
          data: response.data
        };
      } else {
        return {
          success: false,
          data: [],
          message: 'Unexpected response format'
        };
      }
    } catch (error) {
      console.error('Error fetching route stops:', error);
      return { 
        success: false, 
        data: [], 
        error: error.message 
      };
    }
  },

  // Update route stops
  updateRouteStops: async (id, stops) => {
    try {
      if (!id) {
        throw new Error('Route ID is required');
      }
      
      if (!Array.isArray(stops)) {
        throw new Error('Stops must be an array');
      }

      // Validate each stop
      const validStops = stops.map((stop, index) => ({
        name: stop.name || `Stop ${index + 1}`,
        lat: stop.lat || null,
        lng: stop.lng || null,
        address: stop.address || '',
        arrivalTime: stop.arrivalTime || '',
        departureTime: stop.departureTime || '',
        order: stop.order !== undefined ? stop.order : index
      }));

      const response = await api.put(`/routes/${id}/stops`, { stops: validStops });
      
      if (response.data && response.data.success) {
        return {
          success: true,
          data: response.data.data,
          message: 'Route stops updated successfully'
        };
      } else {
        return {
          success: true,
          data: response.data,
          message: 'Route stops updated'
        };
      }
    } catch (error) {
      console.error('Error updating route stops:', error);
      
      let errorMessage = 'Failed to update route stops';
      if (error.response) {
        errorMessage = error.response.data?.message || 
                      error.response.data?.error || 
                      `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      throw new Error(errorMessage);
    }
  },

  // Get route by bus ID
  getRouteByBus: async (busId) => {
    try {
      if (!busId) {
        throw new Error('Bus ID is required');
      }
      
      const response = await api.get(`/routes/bus/${busId}`);
      
      if (response.data && response.data.success) {
        return {
          success: true,
          data: response.data.data
        };
      } else {
        return {
          success: false,
          data: null,
          message: 'Route not found for this bus'
        };
      }
    } catch (error) {
      console.error('Error fetching route by bus:', error);
      return { 
        success: false, 
        data: null, 
        error: error.message 
      };
    }
  },

  // Get active routes
  getActiveRoutes: async () => {
    try {
      const response = await api.get('/routes', { params: { status: 'active' } });
      
      if (response.data && response.data.success) {
        return {
          success: true,
          data: response.data.data || []
        };
      } else if (Array.isArray(response.data)) {
        return {
          success: true,
          data: response.data
        };
      } else {
        return {
          success: false,
          data: [],
          message: 'Unexpected response format'
        };
      }
    } catch (error) {
      console.error('Error fetching active routes:', error);
      return { 
        success: false, 
        data: [], 
        error: error.message 
      };
    }
  },

  // Bulk update routes (admin only)
  bulkUpdateRoutes: async (routeIds, updateData) => {
    try {
      if (!Array.isArray(routeIds) || routeIds.length === 0) {
        throw new Error('Route IDs array is required');
      }

      const response = await api.post('/routes/bulk-update', {
        routeIds,
        ...updateData
      });
      
      if (response.data && response.data.success) {
        return {
          success: true,
          data: response.data.data,
          message: response.data.message || 'Routes updated successfully'
        };
      } else {
        throw new Error(response.data?.message || 'Bulk update failed');
      }
    } catch (error) {
      console.error('Error in bulk update:', error);
      throw error;
    }
  },

  // Export routes
  exportRoutes: async (format = 'csv', filters = {}) => {
    try {
      const response = await api.get('/routes/export', {
        params: { format, ...filters },
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting routes:', error);
      throw error;
    }
  },

  // Calculate route efficiency
  calculateEfficiency: async (routeId) => {
    try {
      if (!routeId) {
        throw new Error('Route ID is required');
      }
      
      const response = await api.get(`/routes/${routeId}/efficiency`);
      
      if (response.data && response.data.success) {
        return {
          success: true,
          data: response.data.data
        };
      } else {
        return {
          success: false,
          data: null,
          message: 'Failed to calculate efficiency'
        };
      }
    } catch (error) {
      console.error('Error calculating route efficiency:', error);
      return { 
        success: false, 
        data: null, 
        error: error.message 
      };
    }
  }
};