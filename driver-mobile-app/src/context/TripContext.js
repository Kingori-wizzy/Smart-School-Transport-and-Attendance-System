import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useOffline, QUEUE_KEYS } from '../hooks/useOffline';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TripContext = createContext({});

export const useTrip = () => useContext(TripContext);

export const TripProvider = ({ children }) => {
  const [activeTrip, setActiveTrip] = useState(null);
  const [tripHistory, setTripHistory] = useState([]);
  const [todayTrips, setTodayTrips] = useState([]);
  const [tripStudents, setTripStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [scannedStudents, setScannedStudents] = useState({});
  
  const { isOnline, addToQueue, syncQueue, pendingCount } = useOffline();

  // Load cached data on mount
  useEffect(() => {
    loadCachedData();
    
    const syncInterval = setInterval(() => {
      if (isOnline) {
        syncAttendanceQueue();
        syncIncidentQueue();
        syncTripUpdatesQueue();
      }
    }, 30000);

    return () => clearInterval(syncInterval);
  }, [isOnline]);

  useEffect(() => {
    if (isOnline) {
      syncAttendanceQueue();
      syncIncidentQueue();
      syncTripUpdatesQueue();
    }
  }, [isOnline]);

  const loadCachedData = async () => {
    try {
      const cached = await AsyncStorage.getItem('@driver_trips');
      if (cached) {
        setTodayTrips(JSON.parse(cached));
      }
      
      const cachedScans = await AsyncStorage.getItem('@driver_scans');
      if (cachedScans) {
        setScannedStudents(JSON.parse(cachedScans));
      }
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
  };

  const syncAttendanceQueue = async () => {
    await syncQueue(QUEUE_KEYS.ATTENDANCE, async (item) => {
      const { method, url, data } = item;
      
      if (method === 'POST') {
        if (url.includes('/board/')) {
          await api.post(url, data);
        } else if (url.includes('/alight/')) {
          await api.post(url, data);
        }
      }
      console.log(`✅ Synced attendance: ${item.id}`);
    });
  };

  const syncIncidentQueue = async () => {
    await syncQueue(QUEUE_KEYS.INCIDENTS, async (item) => {
      const { method, url, data } = item;
      if (method === 'POST') {
        await api.post(url, data);
      }
      console.log(`✅ Synced incident: ${item.id}`);
    });
  };

  const syncTripUpdatesQueue = async () => {
    await syncQueue(QUEUE_KEYS.TRIP_UPDATES, async (item) => {
      const { method, url, data } = item;
      if (method === 'POST') {
        await api.post(url, data);
      }
      console.log(`✅ Synced trip update: ${item.id}`);
    });
  };

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

  const fetchTodayTrips = async () => {
    try {
      setLoading(true);
      
      if (!isOnline) {
        const cached = await AsyncStorage.getItem('@driver_trips');
        if (cached) {
          setTodayTrips(JSON.parse(cached));
        }
        setLoading(false);
        return;
      }

      const response = await api.get('/driver/trips/today');
      
      if (response.data.success) {
        const trips = response.data.trips || [];
        setTodayTrips(trips);
        await AsyncStorage.setItem('@driver_trips', JSON.stringify(trips));
        
        const active = trips.find(t => t.status === 'ongoing' || t.status === 'in-progress');
        if (active) {
          setActiveTrip(active);
          await fetchTripStudents(active._id);
        }
      }
    } catch (error) {
      console.error('Error fetching today\'s trips:', error);
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Correct API endpoint for fetching trip students
  const fetchTripStudents = async (tripId) => {
    try {
      if (!isOnline) {
        const cached = await AsyncStorage.getItem(`@trip_students_${tripId}`);
        if (cached) {
          setTripStudents(JSON.parse(cached));
        }
        return;
      }

      // CORRECT ENDPOINT: /driver/trips/:tripId/students
      const response = await api.get(`/driver/trips/${tripId}/students`);
      
      if (response.data.success) {
        const students = response.data.data || [];
        setTripStudents(students);
        await AsyncStorage.setItem(`@trip_students_${tripId}`, JSON.stringify(students));
        
        // Load scanned status from cache
        const scans = await AsyncStorage.getItem('@driver_scans');
        if (scans) {
          const scanMap = JSON.parse(scans);
          setScannedStudents(scanMap[tripId] || {});
        }
      }
    } catch (error) {
      console.error('Error fetching trip students:', error);
    }
  };

  const boardStudent = async (tripId, studentId, method = 'qr') => {
    try {
      const scanData = {
        method,
        timestamp: new Date().toISOString(),
        syncedFromOffline: !isOnline,
        deviceId: await getDeviceId()
      };

      if (!isOnline) {
        await addToQueue(QUEUE_KEYS.ATTENDANCE, {
          type: 'board_student',
          method: 'POST',
          url: `/driver/trips/${tripId}/board/${studentId}`,
          data: scanData
        });
        
        const key = `${tripId}_${studentId}`;
        const updatedScans = {
          ...scannedStudents,
          [key]: {
            scanned: true,
            type: 'boarding',
            timestamp: new Date(),
            offline: true
          }
        };
        
        setScannedStudents(updatedScans);
        
        const scanMap = {};
        scanMap[tripId] = updatedScans;
        await AsyncStorage.setItem('@driver_scans', JSON.stringify(scanMap));
        
        setTripStudents(prev => prev.map(s => 
          s._id === studentId ? { ...s, status: 'boarded', boarded: true } : s
        ));
        
        return { success: true, offline: true, queued: true };
      }

      // CORRECT ENDPOINT: /driver/trips/:tripId/board/:studentId
      const response = await api.post(`/driver/trips/${tripId}/board/${studentId}`, scanData);
      
      if (activeTrip && activeTrip._id === tripId) {
        setActiveTrip(prev => ({
          ...prev,
          boardedStudents: [...(prev.boardedStudents || []), studentId]
        }));
      }
      
      const key = `${tripId}_${studentId}`;
      const updatedScans = {
        ...scannedStudents,
        [key]: {
          scanned: true,
          type: 'boarding',
          timestamp: new Date()
        }
      };
      
      setScannedStudents(updatedScans);
      
      const scanMap = {};
      scanMap[tripId] = updatedScans;
      await AsyncStorage.setItem('@driver_scans', JSON.stringify(scanMap));
      
      setTripStudents(prev => prev.map(s => 
        s._id === studentId ? { ...s, status: 'boarded', boarded: true, boardedAt: new Date() } : s
      ));
      
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error boarding student:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to board student',
      };
    }
  };

  const alightStudent = async (tripId, studentId, method = 'qr') => {
    try {
      const scanData = {
        method,
        timestamp: new Date().toISOString(),
        syncedFromOffline: !isOnline,
        deviceId: await getDeviceId()
      };

      if (!isOnline) {
        await addToQueue(QUEUE_KEYS.ATTENDANCE, {
          type: 'alight_student',
          method: 'POST',
          url: `/driver/trips/${tripId}/alight/${studentId}`,
          data: scanData
        });
        
        const key = `${tripId}_${studentId}`;
        const updatedScans = {
          ...scannedStudents,
          [key]: {
            scanned: true,
            type: 'alighting',
            timestamp: new Date(),
            offline: true
          }
        };
        
        setScannedStudents(updatedScans);
        
        const scanMap = {};
        scanMap[tripId] = updatedScans;
        await AsyncStorage.setItem('@driver_scans', JSON.stringify(scanMap));
        
        setTripStudents(prev => prev.map(s => 
          s._id === studentId ? { ...s, status: 'alighted', alighted: true } : s
        ));
        
        return { success: true, offline: true, queued: true };
      }

      const response = await api.post(`/driver/trips/${tripId}/alight/${studentId}`, scanData);
      
      const key = `${tripId}_${studentId}`;
      const updatedScans = {
        ...scannedStudents,
        [key]: {
          scanned: true,
          type: 'alighting',
          timestamp: new Date()
        }
      };
      
      setScannedStudents(updatedScans);
      
      const scanMap = {};
      scanMap[tripId] = updatedScans;
      await AsyncStorage.setItem('@driver_scans', JSON.stringify(scanMap));
      
      setTripStudents(prev => prev.map(s => 
        s._id === studentId ? { ...s, status: 'alighted', alighted: true, alightedAt: new Date() } : s
      ));
      
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error alighting student:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to alight student',
      };
    }
  };

  const startTrip = async (tripId) => {
    try {
      if (!isOnline) {
        await addToQueue(QUEUE_KEYS.TRIP_UPDATES, {
          type: 'start_trip',
          method: 'POST',
          url: `/driver/trips/${tripId}/start`,
          data: { timestamp: new Date().toISOString() }
        });
        
        const updatedTrips = todayTrips.map(t => 
          t._id === tripId ? { ...t, status: 'in-progress' } : t
        );
        setTodayTrips(updatedTrips);
        setActiveTrip(updatedTrips.find(t => t._id === tripId));
        await AsyncStorage.setItem('@driver_trips', JSON.stringify(updatedTrips));
        
        return { success: true, offline: true, queued: true };
      }

      const response = await api.post(`/driver/trips/${tripId}/start`);
      
      if (response.data.success) {
        await fetchTodayTrips();
        return { success: true };
      }
    } catch (error) {
      console.error('Error starting trip:', error);
      return { success: false, error: error.message };
    }
  };

  const endTrip = async (tripId) => {
    try {
      if (!isOnline) {
        await addToQueue(QUEUE_KEYS.TRIP_UPDATES, {
          type: 'end_trip',
          method: 'POST',
          url: `/driver/trips/${tripId}/end`,
          data: { timestamp: new Date().toISOString() }
        });
        
        const updatedTrips = todayTrips.map(t => 
          t._id === tripId ? { ...t, status: 'completed' } : t
        );
        setTodayTrips(updatedTrips);
        setActiveTrip(null);
        await AsyncStorage.setItem('@driver_trips', JSON.stringify(updatedTrips));
        
        return { success: true, offline: true, queued: true };
      }

      const response = await api.post(`/driver/trips/${tripId}/end`);
      
      if (response.data.success) {
        await fetchTodayTrips();
        setActiveTrip(null);
        return { success: true };
      }
    } catch (error) {
      console.error('Error ending trip:', error);
      return { success: false, error: error.message };
    }
  };

  const reportIncident = async (tripId, reportData) => {
    try {
      if (!isOnline) {
        await addToQueue(QUEUE_KEYS.INCIDENTS, {
          type: 'report_incident',
          method: 'POST',
          url: `/driver/incident/report`,
          data: { ...reportData, tripId }
        });
        return { success: true, offline: true, queued: true };
      }

      const response = await api.post(`/driver/incident/report`, { ...reportData, tripId });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error reporting incident:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to report incident',
      };
    }
  };

  const updateLocation = async (tripId, location) => {
    try {
      if (!isOnline) {
        await addToQueue(QUEUE_KEYS.GPS, {
          type: 'update_location',
          method: 'POST',
          url: '/driver/gps/update',
          data: {
            tripId,
            lat: location.latitude,
            lon: location.longitude,
            speed: location.speed || 0,
            heading: location.heading || 0,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

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

  const getDeviceId = async () => {
    let deviceId = await AsyncStorage.getItem('@device_id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem('@device_id', deviceId);
    }
    return deviceId;
  };

  const getStudentScanStatus = (tripId, studentId) => {
    const key = `${tripId}_${studentId}`;
    return scannedStudents[key] || null;
  };

  const refreshTrips = async () => {
    setRefreshing(true);
    await fetchTodayTrips();
    setRefreshing(false);
  };

  const selectActiveTrip = (trip) => {
    setActiveTrip(trip);
    if (trip) {
      fetchTripStudents(trip._id);
    }
  };

  return (
    <TripContext.Provider value={{
      activeTrip,
      tripHistory,
      todayTrips,
      tripStudents,
      loading,
      refreshing,
      scannedStudents,
      pendingCount,
      isOnline,
      setActiveTrip,
      loadTripHistory,
      fetchTodayTrips,
      fetchTripStudents,
      boardStudent,
      alightStudent,
      startTrip,
      endTrip,
      reportIncident,
      updateLocation,
      getStudentScanStatus,
      refreshTrips,
      selectActiveTrip
    }}>
      {children}
    </TripContext.Provider>
  );
};