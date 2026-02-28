import React, { createContext, useState, useContext } from 'react';
import api from '../services/api';

const TripContext = createContext({});

export const useTrip = () => useContext(TripContext);

export const TripProvider = ({ children }) => {
  const [activeTrip, setActiveTrip] = useState(null);
  const [tripHistory, setTripHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadTripHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get('/driver/trips/history');
      setTripHistory(response.data);
    } catch (error) {
      console.error('Error loading trip history:', error);
    } finally {
      setLoading(false);
    }
  };

  const boardStudent = async (tripId, studentId, method = 'qr') => {
    try {
      const response = await api.post(`/driver/trip/${tripId}/board/${studentId}`, {
        method,
        timestamp: new Date().toISOString(),
      });
      
      // Update active trip if needed
      if (activeTrip && activeTrip.id === tripId) {
        setActiveTrip(prev => ({
          ...prev,
          boardedStudents: [...(prev.boardedStudents || []), studentId]
        }));
      }
      
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to board student',
      };
    }
  };

  const reportIncident = async (tripId, reportData) => {
    try {
      const response = await api.post(`/driver/trip/${tripId}/incident`, reportData);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to report incident',
      };
    }
  };

  const updateLocation = async (tripId, location) => {
    try {
      await api.post('/driver/gps/update', {
        tripId,
        lat: location.latitude,
        lon: location.longitude,
        speed: location.speed || 0,
        heading: location.heading || 0,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  return (
    <TripContext.Provider value={{
      activeTrip,
      tripHistory,
      loading,
      setActiveTrip,
      loadTripHistory,
      boardStudent,
      reportIncident,
      updateLocation,
    }}>
      {children}
    </TripContext.Provider>
  );
};