import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';

export const useLocation = () => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);
      
      if (status !== 'granted') {
        setError('Location permission denied');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const getCurrentLocation = async () => {
    try {
      if (permissionStatus !== 'granted') {
        await requestPermissions();
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        speed: loc.coords.speed || 0,
        heading: loc.coords.heading || 0,
        timestamp: loc.timestamp,
      });
      
      return location;
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  const startTracking = (callback, interval = 5000) => {
    if (isTracking) return;

    setIsTracking(true);
    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: interval,
        distanceInterval: 10,
      },
      (loc) => {
        const locationData = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          speed: loc.coords.speed || 0,
          heading: loc.coords.heading || 0,
          timestamp: loc.timestamp,
        };
        setLocation(locationData);
        callback(locationData);
      }
    );
  };

  const stopTracking = () => {
    setIsTracking(false);
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  return {
    location,
    error,
    permissionStatus,
    isTracking,
    getCurrentLocation,
    startTracking,
    stopTracking,
    calculateDistance,
  };
};