import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.log('No token found, socket not connecting');
      return;
    }

    const socketInstance = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true
    });

    socketInstance.on('connect', () => {
      console.log('✅ Socket connected successfully');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('🔴 Socket disconnected:', reason);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      setIsConnected(false);
    });

    socketInstance.on('liveGPS', (data) => {
      console.log('📍 GPS Update:', data);
    });

    socketInstance.on('speedAlert', (data) => {
      console.log('🚨 Speed Alert:', data);
    });

    socketInstance.on('geofenceAlert', (data) => {
      console.log('🚨 Geofence Alert:', data);
    });

    socketInstance.on('fuelAlert', (data) => {
      console.log('⛽ Fuel Alert:', data);
    });

    socketInstance.on('new-attendance', (data) => {
      console.log('📝 New Attendance:', data);
    });

    setSocket(socketInstance);

    return () => {
      if (socketInstance) {
        socketInstance.removeAllListeners();
        socketInstance.disconnect();
      }
    };
  }, []);

  const value = {
    socket,
    isConnected
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};