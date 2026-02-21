import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useSocket } from '../context/SocketContext';

export const useOffline = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [connectionType, setConnectionType] = useState(null);
  const { isConnected: socketConnected } = useSocket();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
      setIsOffline(!state.isConnected);
      setConnectionType(state.type);
      
      if (state.isConnected) {
        console.log('📶 Device is online via', state.type);
      } else {
        console.log('📶 Device is offline');
      }
    });

    // Check initial connection
    NetInfo.fetch().then(state => {
      setIsConnected(state.isConnected);
      setIsOffline(!state.isConnected);
      setConnectionType(state.type);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    isOffline,
    isConnected,
    connectionType,
    socketConnected,
    isFullyOnline: isConnected && socketConnected,
  };
};

export const useOfflineData = (fetchFunction, cacheKey, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const { isConnected } = useOffline();
  const cache = require('../services/cache').default;

  useEffect(() => {
    loadData();
  }, [...dependencies, isConnected]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to get from cache first
      const cachedData = await cache.get(cacheKey);
      
      if (cachedData) {
        setData(cachedData);
        setIsFromCache(true);
      }

      // If online, fetch fresh data
      if (isConnected) {
        try {
          const freshData = await fetchFunction();
          
          // Save to cache
          await cache.set(cacheKey, freshData);
          
          setData(freshData);
          setIsFromCache(false);
        } catch (fetchError) {
          console.error('Fetch error:', fetchError);
          if (!cachedData) {
            setError(fetchError.message);
          }
        }
      } else if (!cachedData) {
        setError('No internet connection and no cached data available');
      }
    } catch (err) {
      console.error('Offline data error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    if (!isConnected) {
      setError('Cannot refresh while offline');
      return;
    }
    await loadData();
  };

  return {
    data,
    loading,
    error,
    isFromCache,
    refresh,
  };
};