// Add this as the very first line
globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

import 'react-native-gesture-handler';
import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationContainer } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Alert, Platform, Vibration } from 'react-native';

// Add this import to satisfy Native requirements
import firebase from '@react-native-firebase/app';

// Context Providers
import { AuthProvider } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { ChildrenProvider } from './src/context/ChildrenContext';

// Navigation and Services
import AppNavigator from './src/navigation/AppNavigator';
import notificationService from './src/services/notifications';
import { COLORS } from './src/constants/config';

// Keep splash screen visible
SplashScreen.preventAutoHideAsync().catch(() => {});

// Configure notification handler for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const { data } = notification.request.content;
    
    // Determine priority based on notification type
    let priority = Notifications.AndroidNotificationPriority.DEFAULT;
    
    if (data?.type === 'boarding_alert' || data?.type === 'alighting_alert') {
      priority = Notifications.AndroidNotificationPriority.HIGH;
    } else if (data?.type === 'emergency') {
      priority = Notifications.AndroidNotificationPriority.MAX;
    }
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      priority: priority,
    };
  },
});

export const navigationRef = React.createRef();

// Event emitter for in-app notifications
export const eventEmitter = {
  listeners: {},
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  },
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  },
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }
};

// Make event emitter globally available
global.eventEmitter = eventEmitter;

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    async function prepare() {
      try {
        // 1. Initialize Firebase JS side if not already
        if (!firebase.apps.length) {
          await firebase.initializeApp();
        }

        // 2. Initialize notification service with timeout
        await Promise.race([
          notificationService.initialize(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Notification init timeout')), 5000)
          )
        ]).catch(e => console.log('Notification init warning:', e.message));
        
        // 3. Request notification permissions
        await requestNotificationPermissions();
        
      } catch (e) {
        console.warn('Initialization warning:', e);
      } finally {
        setIsReady(true);
      }
    }

    prepare();
    setupNotificationListeners();

    return () => cleanupNotificationListeners();
  }, []);

  // Request notification permissions
  const requestNotificationPermissions = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      
      // Configure Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
        
        await Notifications.setNotificationChannelAsync('boarding', {
          name: 'Boarding Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4CAF50',
        });
        
        await Notifications.setNotificationChannelAsync('emergency', {
          name: 'Emergency Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#f44336',
        });
      }
      
      console.log('Notification permissions granted');
    } catch (error) {
      console.log('Error requesting notification permissions:', error);
    }
  };

  useEffect(() => {
    if (isReady && navigationRef.current) {
      notificationService.setNavigationRef(navigationRef.current);
    }
  }, [isReady]);

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isReady]);

  const setupNotificationListeners = () => {
    // Handle notifications received while app is foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
      
      const { title, body, data } = notification.request.content;
      
      // Vibrate for important notifications
      if (data?.type === 'boarding_alert' || data?.type === 'alighting_alert') {
        Vibration.vibrate(Platform.OS === 'ios' ? [0, 300] : 300);
      } else if (data?.type === 'emergency') {
        Vibration.vibrate(Platform.OS === 'ios' ? [0, 500, 200, 500] : [0, 500, 200, 500]);
      }
      
      // Show in-app alert for important notifications
      if (data?.type === 'boarding_alert') {
        Alert.alert(
          'Child Boarded',
          body || `${data?.studentName || 'Student'} has boarded the bus`,
          [
            { 
              text: 'View', 
              onPress: () => {
                if (navigationRef.current) {
                  navigationRef.current.navigate('Tracking');
                }
              } 
            },
            { text: 'OK', style: 'cancel' }
          ]
        );
      } else if (data?.type === 'alighting_alert') {
        Alert.alert(
          'Child Dropped Off',
          body || `${data?.studentName || 'Student'} has been dropped off`,
          [
            { 
              text: 'View', 
              onPress: () => {
                if (navigationRef.current) {
                  navigationRef.current.navigate('Tracking');
                }
              } 
            },
            { text: 'OK', style: 'cancel' }
          ]
        );
      } else if (data?.type === 'emergency') {
        Alert.alert(
          'EMERGENCY ALERT',
          body || 'Emergency situation reported',
          [
            { 
              text: 'View Details', 
              onPress: () => {
                if (navigationRef.current) {
                  navigationRef.current.navigate('Notifications');
                }
              } 
            },
            { text: 'OK', style: 'cancel' }
          ]
        );
      }
      
      // Emit event for other components
      eventEmitter.emit('notification', { title, body, data });
    });

    // Handle notification response when user taps notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      handleNotificationResponse(response);
    });
  };

  const cleanupNotificationListeners = () => {
    if (notificationListener.current) {
      notificationListener.current.remove();
    }
    if (responseListener.current) {
      responseListener.current.remove();
    }
  };

  const handleNotificationResponse = (response) => {
    const { data } = response.notification.request.content;
    
    if (!navigationRef.current) return;
    
    console.log('Handling notification response with data:', data);
    
    // Navigate based on notification type
    if (data?.type === 'boarding_alert' || data?.type === 'alighting_alert') {
      navigationRef.current.navigate('Tracking');
    } else if (data?.type === 'trip_start' || data?.type === 'trip_complete') {
      navigationRef.current.navigate('Tracking');
    } else if (data?.type === 'attendance' && data?.childId) {
      navigationRef.current.navigate('Attendance', { childId: data.childId });
    } else if (data?.type === 'tracking' && data?.childId) {
      navigationRef.current.navigate('Tracking', { childId: data.childId });
    } else if (data?.type === 'message' && data?.conversationId) {
      navigationRef.current.navigate('Messages', { conversationId: data.conversationId });
    } else if (data?.type === 'alert' || data?.type === 'admin_broadcast') {
      navigationRef.current.navigate('Notifications');
    } else if (data?.type === 'emergency') {
      navigationRef.current.navigate('Emergency', { alert: data });
    } else {
      // Default - go to notifications
      navigationRef.current.navigate('Notifications');
    }
  };

  if (!isReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <SocketProvider>
              <ChildrenProvider>
                <NavigationContainer ref={navigationRef}>
                  <StatusBar style="auto" />
                  <AppNavigator />
                </NavigationContainer>
              </ChildrenProvider>
            </SocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}