import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { Alert, Vibration, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { API_URL } from '../services/api';

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
  const [notifications, setNotifications] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const socketRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const { user, token } = useAuth();

  // Helper to show in-app alert
  const showAlert = (title, message, type = 'info', onPress = null) => {
    Alert.alert(
      title,
      message,
      onPress ? [{ text: 'View', onPress }, { text: 'OK', style: 'cancel' }] : [{ text: 'OK' }],
      { cancelable: true }
    );
  };

  // Helper to show push notification
  const showPushNotification = async (title, body, data = {}) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: { type: 'alert', ...data },
        },
        trigger: null,
      });
    } catch (error) {
      console.log('Notification error:', error);
    }
  };

  // Helper to handle incoming alerts
  const handleAlert = (type, data) => {
    // Vibrate for important alerts
    if (type === 'boarding_alert' || type === 'alighting_alert' || type === 'emergency') {
      Vibration.vibrate(Platform.OS === 'ios' ? [0, 500] : 500);
    }
    
    const newAlert = {
      id: Date.now(),
      type,
      ...data,
      timestamp: new Date(),
    };
    
    setAlerts(prev => [newAlert, ...prev].slice(0, 100));
    setNotifications(prev => [{
      id: Date.now(),
      title: getNotificationTitle(type, data),
      message: getNotificationMessage(type, data),
      type,
      data,
      createdAt: new Date(),
      isRead: false
    }, ...prev]);
    
    return newAlert;
  };

  // Get notification title based on type
  const getNotificationTitle = (type, data) => {
    switch(type) {
      case 'boarding_alert':
        return `${data.studentName || 'Student'} Boarded`;
      case 'alighting_alert':
        return `${data.studentName || 'Student'} Alighted`;
      case 'trip_start':
      case 'trip_started':
        return 'Trip Started';
      case 'trip_complete':
      case 'trip_completed':
        return 'Trip Completed';
      case 'trip_delayed':
        return 'Trip Delayed';
      case 'new-message':
        return `New Message from ${data.senderName || 'Driver'}`;
      case 'emergency':
        return 'EMERGENCY ALERT';
      default:
        return 'Notification';
    }
  };

  // Get notification message based on type
  const getNotificationMessage = (type, data) => {
    switch(type) {
      case 'boarding_alert':
        return `${data.studentName || 'Student'} has boarded the bus`;
      case 'alighting_alert':
        return `${data.studentName || 'Student'} has been dropped off`;
      case 'trip_start':
      case 'trip_started':
        return `The bus has started its journey`;
      case 'trip_complete':
      case 'trip_completed':
        return `The bus trip has been completed`;
      case 'new-message':
        return data.message;
      case 'emergency':
        return data.message || 'Emergency situation reported';
      default:
        return data.message || 'You have a new notification';
    }
  };

  useEffect(() => {
    if (!token || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // IMPORTANT: Use the same base URL as API but WITHOUT trailing slash
    let baseUrl = 'http://192.168.100.3:5000'; // Use your computer's IP directly
    
    // If API_URL is defined, use its base
    if (API_URL) {
      baseUrl = API_URL.replace(/\/api$/, '').replace(/\/$/, '');
    }
    
    console.log('Connecting to socket at:', baseUrl);
    console.log('With token:', token ? 'Yes' : 'No');
    
    // Create socket connection
    const socketInstance = io(baseUrl, {
      auth: { token },
      transports: ['websocket', 'polling'], // Try polling first then upgrade
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      forceNew: true,
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    // Connection events
    socketInstance.on('connect', () => {
      console.log('Socket connected successfully:', socketInstance.id);
      setIsConnected(true);
      reconnectAttempts.current = 0;
      
      // Join user-specific room after connection
      socketInstance.emit('join-user-room', { userId: user.id, role: user.role });
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      setIsConnected(false);
      reconnectAttempts.current++;
      
      if (reconnectAttempts.current >= 5) {
        console.log('Multiple reconnection attempts failed, will retry later');
      }
    });

    // ==================== TRIP & ATTENDANCE NOTIFICATIONS ====================
    
    socketInstance.on('student-boarded', (data) => {
      console.log('Student boarded event received:', data);
      handleAlert('boarding_alert', data);
      showPushNotification(
        `${data.studentName || 'Student'} Boarded`,
        `${data.studentName || 'Student'} has boarded the bus`,
        { type: 'boarding', studentId: data.studentId }
      );
    });

    socketInstance.on('student-alighted', (data) => {
      console.log('Student alighted event received:', data);
      handleAlert('alighting_alert', data);
      showPushNotification(
        `${data.studentName || 'Student'} Alighted`,
        `${data.studentName || 'Student'} has been dropped off`,
        { type: 'alighting', studentId: data.studentId }
      );
    });

    socketInstance.on('trip-started', (data) => {
      console.log('Trip started event received:', data);
      handleAlert('trip_started', data);
      showPushNotification('Trip Started', `The bus has started its journey`, { type: 'trip_start' });
    });

    socketInstance.on('trip-completed', (data) => {
      console.log('Trip completed event received:', data);
      handleAlert('trip_completed', data);
      showPushNotification('Trip Completed', `The bus trip has been completed`, { type: 'trip_complete' });
    });

    socketInstance.on('new-message', (data) => {
      console.log('New message event received:', data);
      handleAlert('new-message', data);
      showPushNotification(
        `Message from ${data.senderName || 'Driver'}`,
        data.message,
        { type: 'message', conversationId: data.conversationId }
      );
    });

    socketInstance.on('typing', (data) => {
      if (data.isTyping) {
        setTypingUsers(prev => ({ ...prev, [data.conversationId]: data.userName }));
      } else {
        setTypingUsers(prev => {
          const newState = { ...prev };
          delete newState[data.conversationId];
          return newState;
        });
      }
    });

    socketInstance.on('emergency-alert', (data) => {
      console.log('Emergency alert received:', data);
      Vibration.vibrate(Platform.OS === 'ios' ? [0, 1000, 500, 1000] : [0, 1000, 500, 1000]);
      handleAlert('emergency', data);
      showPushNotification('EMERGENCY ALERT', data.message || 'Emergency situation reported', { type: 'emergency' });
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [token, user]);

  // Helper functions for components
  const getBusLocation = (busId) => {
    return liveLocations[busId] || null;
  };

  const clearAlerts = () => {
    setAlerts([]);
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const markNotificationAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
  };

  const getUnreadCount = () => {
    return notifications.filter(n => !n.isRead).length;
  };

  const sendMessage = (messageData) => {
    if (socket && isConnected) {
      socket.emit('send-message', messageData);
    } else {
      console.warn('Socket not connected, message will be queued');
    }
  };

  const joinConversation = (conversationId) => {
    if (socket && isConnected) {
      socket.emit('join-conversation', conversationId);
    }
  };

  const leaveConversation = (conversationId) => {
    if (socket && isConnected) {
      socket.emit('leave-conversation', conversationId);
    }
  };

  const markMessagesRead = (conversationId) => {
    if (socket && isConnected) {
      socket.emit('mark-read', { conversationId });
    }
  };

  const sendTyping = (conversationId, isTyping) => {
    if (socket && isConnected) {
      socket.emit('typing', { conversationId, isTyping, userName: `${user?.firstName} ${user?.lastName}` });
    }
  };

  const isTypingInConversation = (conversationId) => {
    return typingUsers[conversationId] || null;
  };

  return (
    <SocketContext.Provider value={{
      socket,
      isConnected,
      liveLocations,
      alerts,
      notifications,
      typingUsers,
      getBusLocation,
      clearAlerts,
      clearNotifications,
      markNotificationAsRead,
      getUnreadCount,
      sendMessage,
      joinConversation,
      leaveConversation,
      markMessagesRead,
      sendTyping,
      isTypingInConversation,
    }}>
      {children}
    </SocketContext.Provider>
  );
};