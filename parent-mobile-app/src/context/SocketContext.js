import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { Alert, Vibration, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { SOCKET_URL } from '../constants/config';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const SocketContext = createContext({});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [liveLocations, setLiveLocations] = useState({});
  const [alerts, setAlerts] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const socketInstance = io(SOCKET_URL, {
      auth: { token: user.token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    // Bus location updates
    socketInstance.on('bus-location-update', (data) => {
      setLiveLocations(prev => ({
        ...prev,
        [data.vehicleId || data.busId]: {
          ...data,
          timestamp: new Date(),
        },
      }));
    });

    // Student boarded notification
    socketInstance.on('student-boarded', (data) => {
      handleAlert('student_boarded', data);
      showNotification(
        `${data.childName || 'Student'} Boarded`,
        `${data.childName || 'Student'} has boarded the bus at ${new Date(data.timestamp).toLocaleTimeString()}`
      );
    });

    // Student alighted notification
    socketInstance.on('student-alighted', (data) => {
      handleAlert('student_alighted', data);
      showNotification(
        `${data.childName || 'Student'} Alighted`,
        `${data.childName || 'Student'} has alighted from the bus at ${new Date(data.timestamp).toLocaleTimeString()}`
      );
    });

    // Trip started notification
    socketInstance.on('trip-started', (data) => {
      handleAlert('trip_started', data);
      showNotification(
        'Trip Started',
        `The bus has started its journey. Route: ${data.routeName || 'School Bus'}`
      );
    });

    // Trip completed notification
    socketInstance.on('trip-completed', (data) => {
      handleAlert('trip_completed', data);
      showNotification(
        'Trip Completed',
        `The bus trip has been completed. All students have arrived safely.`
      );
    });

    // Trip delayed notification
    socketInstance.on('trip-delayed', (data) => {
      handleAlert('trip_delayed', data);
      showNotification(
        'Trip Delayed',
        data.message || `The bus is delayed by approximately ${data.minutes} minutes.`
      );
    });

    // Driver message notification
    socketInstance.on('driver-message', (data) => {
      handleAlert('driver_message', data);
      showNotification(
        `Message from Driver`,
        data.message
      );
    });

    // Emergency alert
    socketInstance.on('emergency-alert', (data) => {
      handleAlert('emergency', data);
      Vibration.vibrate([0, 500, 200, 500]);
      showNotification(
        '🚨 EMERGENCY ALERT',
        data.message || 'Emergency situation reported. Please check the app for updates.'
      );
    });

    // Geofence alert
    socketInstance.on('geofence-alert', (data) => {
      handleAlert('geofence', data);
      showNotification(
        'Geofence Alert',
        `${data.childName || 'Student'} has ${data.action || 'entered/left'} the designated area.`
      );
    });

    // Speed alert
    socketInstance.on('speed-alert', (data) => {
      handleAlert('speed', data);
      showNotification(
        'Speed Alert',
        `Bus is traveling at ${data.speed} km/h. Please be cautious.`
      );
    });

    // New message (from driver or admin)
    socketInstance.on('new-message', (data) => {
      handleAlert('driver_message', data);
      showNotification(
        `New Message from ${data.senderName || 'Driver'}`,
        data.message
      );
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user]);

  const handleAlert = (type, data) => {
    Vibration.vibrate(100);
    
    setAlerts(prev => [{
      id: Date.now(),
      type,
      ...data,
      timestamp: new Date(),
    }, ...prev].slice(0, 50));
  };

  const showNotification = async (title, body) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: { type: 'alert' },
        },
        trigger: null,
      });
    } catch (error) {
      console.log('Notification error:', error);
    }
  };

  const getBusLocation = (busId) => {
    return liveLocations[busId] || null;
  };

  const clearAlerts = () => {
    setAlerts([]);
  };

  return (
    <SocketContext.Provider value={{
      socket,
      isConnected,
      liveLocations,
      alerts,
      getBusLocation,
      clearAlerts,
    }}>
      {children}
    </SocketContext.Provider>
  );
};