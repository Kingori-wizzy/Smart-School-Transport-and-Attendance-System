// File: frontend/src/services/trip.js

import api from './api';

export const tripService = {
  // Get all trips
  getTrips: async (params = {}) => {
    try {
      const response = await api.get('/trips', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching trips:', error);
      return { data: [], success: false };
    }
  },

  // Get today's trips
  getTodayTrips: async () => {
    try {
      const response = await api.get('/trips/today/all');
      return response.data;
    } catch (error) {
      console.error('Error fetching today\'s trips:', error);
      return { data: [], count: 0, success: false };
    }
  },

  // Get active trips
  getActiveTrips: async () => {
    try {
      const response = await api.get('/trips/active');
      return response.data;
    } catch (error) {
      console.error('Error fetching active trips:', error);
      return { data: [], success: false };
    }
  },

  // Get single trip
  getTrip: async (id) => {
    try {
      const response = await api.get(`/trips/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching trip:', error);
      return null;
    }
  },

  // Create trip
  createTrip: async (tripData) => {
    try {
      // Format data to match backend model
      const formattedData = {
        routeName: tripData.routeName || 'Unknown Route',
        vehicleId: tripData.busId || tripData.vehicleId || '',
        driverId: tripData.driverId || '',
        tripType: tripData.tripType || 'morning',
        scheduledStartTime: tripData.scheduledStartTime || new Date().toISOString(),
        scheduledEndTime: tripData.scheduledEndTime || new Date().toISOString(),
        status: 'scheduled',
        lateStart: false,
        students: tripData.students || []
      };

      const response = await api.post('/trips', formattedData);
      return response.data;
    } catch (error) {
      console.error('Error creating trip:', error);
      throw error;
    }
  },

  // Update trip
  updateTrip: async (id, tripData) => {
    try {
      const formattedData = {
        routeName: tripData.routeName,
        vehicleId: tripData.busId || tripData.vehicleId,
        driverId: tripData.driverId,
        tripType: tripData.tripType,
        scheduledStartTime: tripData.scheduledStartTime,
        scheduledEndTime: tripData.scheduledEndTime,
        status: tripData.status,
        students: tripData.students
      };

      const response = await api.put(`/trips/${id}`, formattedData);
      return response.data;
    } catch (error) {
      console.error('Error updating trip:', error);
      throw error;
    }
  },

  // Start trip
  startTrip: async (id) => {
    try {
      const response = await api.patch(`/trips/${id}/start`);
      return response.data;
    } catch (error) {
      console.error('Error starting trip:', error);
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

  // Cancel trip
  cancelTrip: async (id) => {
    try {
      const response = await api.patch(`/trips/${id}/cancel`);
      return response.data;
    } catch (error) {
      console.error('Error cancelling trip:', error);
      throw error;
    }
  },

  // Delete trip
  deleteTrip: async (id) => {
    try {
      const response = await api.delete(`/trips/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting trip:', error);
      throw error;
    }
  },

  // Get trips by vehicle
  getTripsByVehicle: async (vehicleId, params = {}) => {
    try {
      const response = await api.get(`/trips/vehicle/${vehicleId}`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching vehicle trips:', error);
      return { data: [] };
    }
  },

  // Get trips by driver
  getTripsByDriver: async (driverId, params = {}) => {
    try {
      const response = await api.get(`/trips/driver/${driverId}`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching driver trips:', error);
      return { data: [] };
    }
  },

  // Get trip statistics
  getTripStats: async (params = {}) => {
    try {
      const response = await api.get('/trips/stats/summary', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching trip stats:', error);
      return { data: {} };
    }
  }
};