import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { Alert, Vibration } from 'react-native';
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

    socketInstance.on('bus-location-update', (data) => {
      setLiveLocations(prev => ({
        ...prev,
        [data.busId]: {
          ...data,
          timestamp: new Date(),
        },
      }));
    });

    socketInstance.on('geofence-alert', (data) => {
      handleAlert('geofence', data);
    });

    socketInstance.on('speed-alert', (data) => {
      handleAlert('speed', data);
    });

    socketInstance.on('boarding-alert', (data) => {
      handleAlert('boarding', data);
      showNotification('Child Boarded', `${data.childName} has boarded the bus`);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user]);

  const handleAlert = (type, data) => {
    Vibration.vibrate();
    
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