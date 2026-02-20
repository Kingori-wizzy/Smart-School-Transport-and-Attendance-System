import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';

export const useRealtimeData = (initialData = [], options = {}) => {
  const {
    eventName = 'dataUpdate',
    onUpdate = null,
    maxHistory = 100,
    enableAlerts = true
  } = options;

  const { socket, isConnected } = useSocket();
  const [data, setData] = useState(initialData);
  const [history, setHistory] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [isLive, setIsLive] = useState(true);
  const dataRef = useRef(data);
  const pendingUpdates = useRef([]);

  // Keep ref updated
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Process incoming updates
  const processUpdate = useCallback((update) => {
    if (!isLive) {
      pendingUpdates.current.push(update);
      return;
    }

    setData(currentData => {
      let newData;
      
      if (Array.isArray(currentData)) {
        // Handle array updates
        if (update.type === 'add') {
          newData = [update.data, ...currentData].slice(0, maxHistory);
        } else if (update.type === 'update') {
          newData = currentData.map(item => 
            item.id === update.data.id ? { ...item, ...update.data } : item
          );
        } else if (update.type === 'remove') {
          newData = currentData.filter(item => item.id !== update.data.id);
        } else if (update.type === 'replace') {
          newData = update.data;
        } else {
          // Default: append
          newData = [update, ...currentData].slice(0, maxHistory);
        }
      } else {
        // Handle object updates
        newData = { ...currentData, ...update };
      }

      // Add to history
      setHistory(prev => {
        const newHistory = [{
          timestamp: new Date(),
          type: update.type || 'update',
          data: update
        }, ...prev].slice(0, 50);
        return newHistory;
      });

      setLastUpdate(new Date());
      setUpdateCount(count => count + 1);

      if (enableAlerts && update.alert) {
        toast[update.alert.type || 'info'](update.alert.message, {
          duration: 4000,
          icon: update.alert.icon
        });
      }

      if (onUpdate) onUpdate(update, newData);
      
      return newData;
    });
  }, [isLive, maxHistory, enableAlerts, onUpdate]);

  // Process pending updates when coming back online
  useEffect(() => {
    if (isLive && pendingUpdates.current.length > 0) {
      pendingUpdates.current.forEach(update => processUpdate(update));
      pendingUpdates.current = [];
    }
  }, [isLive, processUpdate]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (update) => {
      processUpdate(update);
    };

    socket.on(eventName, handleUpdate);

    // Listen for specific real-time events
    socket.on('attendance-update', (update) => {
      processUpdate({ ...update, type: 'attendance' });
    });

    socket.on('gps-update', (update) => {
      processUpdate({ ...update, type: 'gps' });
    });

    socket.on('alert-update', (update) => {
      processUpdate({ 
        ...update, 
        type: 'alert',
        alert: {
          type: update.severity === 'critical' ? 'error' : 'warning',
          message: update.message,
          icon: update.icon
        }
      });
    });

    socket.on('bus-status', (update) => {
      processUpdate({ ...update, type: 'status' });
    });

    return () => {
      socket.off(eventName);
      socket.off('attendance-update');
      socket.off('gps-update');
      socket.off('alert-update');
      socket.off('bus-status');
    };
  }, [socket, processUpdate, eventName]);

  return {
    data,
    history,
    lastUpdate,
    updateCount,
    isConnected,
    isLive,
    setIsLive,
    pendingCount: pendingUpdates.current.length,
    clearHistory: () => setHistory([]),
    resetData: () => setData(initialData)
  };
};