import api from './api';

export const transportService = {
  // ==========================================
  // BUS MANAGEMENT
  // ==========================================
  
  // Get all buses
  getBuses: async () => {
    try {
      const response = await api.get('/buses');
      return response.data;
    } catch (error) {
      console.error('Error fetching buses:', error);
      return [];
    }
  },

  // Get active buses
  getActiveBuses: async () => {
    try {
      const response = await api.get('/buses/active');
      return response.data;
    } catch (error) {
      console.error('Error fetching active buses:', error);
      return [];
    }
  },

  // Get single bus by ID
  getBusById: async (id) => {
    try {
      const response = await api.get(`/buses/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching bus:', error);
      return null;
    }
  },

  // Create new bus
  createBus: async (busData) => {
    try {
      const response = await api.post('/buses', busData);
      return response.data;
    } catch (error) {
      console.error('Error creating bus:', error);
      throw error;
    }
  },

  // Update bus
  updateBus: async (id, busData) => {
    try {
      const response = await api.put(`/buses/${id}`, busData);
      return response.data;
    } catch (error) {
      console.error('Error updating bus:', error);
      throw error;
    }
  },

  // Update bus status
  updateBusStatus: async (id, status) => {
    try {
      const response = await api.patch(`/buses/${id}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('Error updating bus status:', error);
      throw error;
    }
  },

  // Delete bus
  deleteBus: async (id) => {
    try {
      const response = await api.delete(`/buses/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting bus:', error);
      throw error;
    }
  },

  // ==========================================
  // GPS TRACKING
  // ==========================================

  // Get live locations for all active vehicles
  getLiveLocations: async () => {
    try {
      const response = await api.get('/gps/live');
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error fetching live locations:', error);
      return [];
    }
  },

  // Get recent GPS logs for a vehicle
  getRecentLogs: async (vehicleId, limit = 50) => {
    try {
      const response = await api.get(`/gps/recent/${vehicleId}?limit=${limit}`);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error fetching recent logs:', error);
      return [];
    }
  },

  // Get vehicle history with date range
  getVehicleHistory: async (vehicleId, startDate, endDate, limit = 100) => {
    try {
      const params = { limit };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const response = await api.get(`/gps/history/${vehicleId}`, { params });
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error fetching vehicle history:', error);
      return [];
    }
  },

  // Get GPS logs for a specific trip
  getTripGPSLogs: async (tripId, limit = 100) => {
    try {
      const response = await api.get(`/gps/trip/${tripId}?limit=${limit}`);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error fetching trip GPS logs:', error);
      return [];
    }
  },

  // Get GPS statistics summary
  getGPSStats: async () => {
    try {
      const response = await api.get('/gps/stats/summary');
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error fetching GPS stats:', error);
      return {
        totalLogsToday: 0,
        activeVehiclesCount: 0,
        activeVehicles: [],
        recentSpeedViolations: 0
      };
    }
  },

  // Update bus location (for testing/drivers)
  updateLocation: async (busId, lat, lng, speed, heading, fuelLevel) => {
    try {
      const response = await api.post('/gps/update', {
        busId,
        lat,
        lng,
        speed,
        heading,
        fuelLevel
      });
      return response.data;
    } catch (error) {
      console.error('Error updating location:', error);
      throw error;
    }
  },

  // ==========================================
  // GEOFENCE MANAGEMENT
  // ==========================================

  // Get all geofences
  getGeofences: async () => {
    try {
      const response = await api.get('/geofences');
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error fetching geofences:', error);
      return [];
    }
  },

  // Get geofence by route name
  getGeofenceByRoute: async (routeName) => {
    try {
      const response = await api.get(`/geofences/route/${routeName}`);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error fetching geofence:', error);
      return null;
    }
  },

  // Get geofence by ID
  getGeofenceById: async (id) => {
    try {
      const response = await api.get(`/geofences/${id}`);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error fetching geofence:', error);
      return null;
    }
  },

  // Create new geofence
  createGeofence: async (geofenceData) => {
    try {
      const response = await api.post('/geofences', geofenceData);
      return response.data;
    } catch (error) {
      console.error('Error creating geofence:', error);
      throw error;
    }
  },

  // Update geofence
  updateGeofence: async (id, geofenceData) => {
    try {
      const response = await api.put(`/geofences/${id}`, geofenceData);
      return response.data;
    } catch (error) {
      console.error('Error updating geofence:', error);
      throw error;
    }
  },

  // Delete geofence
  deleteGeofence: async (id) => {
    try {
      const response = await api.delete(`/geofences/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting geofence:', error);
      throw error;
    }
  },

  // Check if a point is inside any geofence
  checkGeofence: async (lat, lon, routeName = null) => {
    try {
      const response = await api.post('/geofences/check', { lat, lon, routeName });
      return response.data;
    } catch (error) {
      console.error('Error checking geofence:', error);
      return { results: [] };
    }
  },

  // ==========================================
  // TRIP MANAGEMENT
  // ==========================================

  // Get all trips
  getTrips: async () => {
    try {
      const response = await api.get('/trips');
      return response.data;
    } catch (error) {
      console.error('Error fetching trips:', error);
      return [];
    }
  },

  // Get active trips
  getActiveTrips: async () => {
    try {
      const response = await api.get('/trips/active');
      return response.data;
    } catch (error) {
      console.error('Error fetching active trips:', error);
      return [];
    }
  },

  // Get trip by ID
  getTripById: async (id) => {
    try {
      const response = await api.get(`/trips/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching trip:', error);
      return null;
    }
  },

  // Create new trip
  createTrip: async (tripData) => {
    try {
      const response = await api.post('/trips', tripData);
      return response.data;
    } catch (error) {
      console.error('Error creating trip:', error);
      throw error;
    }
  },

  // End trip
  endTrip: async (id) => {
    try {
      const response = await api.patch(`/trips/${id}/end`);
      return response.data;
    } catch (error) {
      console.error('Error ending trip:', error);
      throw error;
    }
  },

  // ==========================================
  // ANALYTICS & REPORTS
  // ==========================================

  // Get route efficiency metrics
  getRouteEfficiency: async (startDate, endDate) => {
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const response = await api.get('/analytics/route-efficiency', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching route efficiency:', error);
      return [];
    }
  },

  // Get speed violation statistics
  getSpeedViolations: async (startDate, endDate) => {
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const response = await api.get('/analytics/speed-violations', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching speed violations:', error);
      return [];
    }
  },

  // Export route report
  exportRouteReport: async (format = 'csv', startDate, endDate) => {
    try {
      const params = { format };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const response = await api.get('/analytics/export/routes', { 
        params,
        responseType: 'blob' 
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting route report:', error);
      throw error;
    }
  }
};