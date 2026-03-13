/* eslint-disable react-hooks/set-state-in-effect */
import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Start with true
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  // Get token from localStorage
  const getToken = useCallback(() => {
    return localStorage.getItem('token');
  }, []);

  // Check if token is valid (not expired)
  const isTokenValid = useCallback(() => {
    const token = getToken();
    if (!token) return false;
    
    try {
      // Simple JWT expiration check (optional)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // Convert to milliseconds
      return Date.now() < exp;
    } catch {
      // If can't parse, assume it's valid (will be caught by server)
      return true;
    }
  }, [getToken]);

  // Initialize socket connection
  const connectSocket = useCallback(() => {
    const token = getToken();
    
    if (!token) {
      console.log('🔌 No token found, socket not connecting');
      setConnectionError('No authentication token');
      setIsLoading(false);
      return null;
    }

    if (!isTokenValid()) {
      console.log('🔌 Token expired, socket not connecting');
      setConnectionError('Token expired');
      setIsLoading(false);
      return null;
    }

    // Clean up existing socket if any
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
    }

    console.log('🔌 Attempting socket connection...');
    setConnectionError(null);
    
    const socketInstance = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
      forceNew: true
    });

    socketRef.current = socketInstance;
    reconnectAttemptsRef.current = 0;

    // Connection event handlers
    socketInstance.on('connect', () => {
      console.log('✅ Socket connected successfully with ID:', socketInstance.id);
      setIsConnected(true);
      setConnectionError(null);
      setIsLoading(false);
      reconnectAttemptsRef.current = 0;
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('🔴 Socket disconnected. Reason:', reason);
      setIsConnected(false);
      
      if (reason === 'io server disconnect') {
        // Server disconnected - try to reconnect after delay
        setTimeout(() => {
          console.log('🔄 Attempting to reconnect...');
          socketInstance.connect();
        }, 2000);
      }
    });

    socketInstance.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      setIsConnected(false);
      setConnectionError(error.message);
      setIsLoading(false);
      reconnectAttemptsRef.current++;
      
      if (error.message === 'Invalid token' || error.message === 'jwt expired') {
        console.log('⚠️ Authentication error - token may be expired');
        // Don't try to reconnect automatically - let auth flow handle it
        socketInstance.disconnect();
      }
    });

    socketInstance.on('reconnect_attempt', (attempt) => {
      console.log(`🔄 Reconnection attempt #${attempt}`);
      reconnectAttemptsRef.current = attempt;
    });

    socketInstance.on('reconnect', (attempt) => {
      console.log(`✅ Reconnected after ${attempt} attempts`);
      setIsConnected(true);
      setConnectionError(null);
      setIsLoading(false);
    });

    socketInstance.on('reconnect_error', (error) => {
      console.error('❌ Reconnection error:', error.message);
    });

    socketInstance.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed after all attempts');
      setIsLoading(false);
    });

    // Application-specific event handlers
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

    socketInstance.on('bus-location-update', (data) => {
      console.log('🚌 Bus Location Update:', data);
    });

    return socketInstance;
  }, [getToken, isTokenValid]);

  // Connect when token changes - FIXED: removed setIsLoading from effect body
  useEffect(() => {
    const token = getToken();
    
    if (token) {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      
      console.log('🔑 Token found, waiting before socket connection...');
      
      // Increased delay to ensure token is fully loaded
      reconnectTimerRef.current = setTimeout(() => {
        connectSocket();
      }, 1500);
    } else {
      console.log('🔑 No token found, socket will not connect');
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      setIsLoading(false); // ✅ This is fine - conditional setState
    }

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [getToken, connectSocket]);

  // Listen for token changes (login/logout)
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === 'token') {
        console.log('🔑 Token changed in storage');
        
        if (event.newValue) {
          // Token added or changed - reconnect after delay
          setTimeout(() => {
            if (socketRef.current) {
              socketRef.current.removeAllListeners();
              socketRef.current.disconnect();
            }
            connectSocket();
          }, 500);
        } else {
          // Token removed - disconnect
          if (socketRef.current) {
            socketRef.current.removeAllListeners();
            socketRef.current.disconnect();
            socketRef.current = null;
          }
          setIsConnected(false);
          setIsLoading(false);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    const handleAuthChange = () => {
      const token = getToken();
      if (token) {
        // Auth event (login) - connect after delay
        setTimeout(() => {
          connectSocket();
        }, 500);
      } else if (socketRef.current) {
        socketRef.current.disconnect();
        setIsLoading(false);
      }
    };

    window.addEventListener('auth-change', handleAuthChange);

    // Handle page visibility change (tab focus)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('🔍 Page became visible, checking socket connection');
        const token = getToken();
        if (token && !isConnected && socketRef.current) {
          console.log('🔄 Reconnecting socket on page visibility change');
          socketRef.current.connect();
        } else if (token && !socketRef.current) {
          connectSocket();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-change', handleAuthChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      }
    };
  }, [connectSocket, getToken, isConnected]);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    console.log('🔄 Manual reconnect triggered');
    connectSocket();
  }, [connectSocket]);

  // Emit event function
  const emit = useCallback((event, data) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
      return true;
    }
    console.warn('⚠️ Cannot emit - socket not connected');
    return false;
  }, [isConnected]);

  // Create a getter function instead of accessing ref directly
  const getSocket = useCallback(() => socketRef.current, []);

  const value = {
    isConnected,
    connectionError,
    isLoading,
    reconnect,
    emit,
    getSocket,
    socket: null
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};