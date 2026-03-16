import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const QUEUE_KEYS = {
  ATTENDANCE: '@offline_attendance',
  INCIDENTS: '@offline_incidents',
  TRIP_UPDATES: '@offline_trips',
  GPS: '@offline_gps'
};

export const useOffline = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  const addToQueue = async (key, item) => {
    try {
      const existingQueue = await AsyncStorage.getItem(key);
      const queue = existingQueue ? JSON.parse(existingQueue) : [];
      const newItem = { ...item, id: Date.now(), timestamp: new Date().toISOString() };
      queue.push(newItem);
      await AsyncStorage.setItem(key, JSON.stringify(queue));
      setPendingCount(prev => prev + 1);
    } catch (e) {
      console.error("Queue Error:", e);
    }
  };

  const syncQueue = async (key, processItemFn) => {
    const existingQueue = await AsyncStorage.getItem(key);
    if (!existingQueue) return;

    let queue = JSON.parse(existingQueue);
    const remainingItems = [];

    for (const item of queue) {
      try {
        await processItemFn(item);
      } catch (e) {
        remainingItems.push(item); // Keep in queue if it fails
      }
    }

    await AsyncStorage.setItem(key, JSON.stringify(remainingItems));
    setPendingCount(remainingItems.length);
  };

  return { isOnline, addToQueue, syncQueue, pendingCount, QUEUE_KEYS };
};