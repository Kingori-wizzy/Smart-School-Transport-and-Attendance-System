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

// Add this import to satisfy Native requirements
import firebase from '@react-native-firebase/app';

// Context Providers
import { AuthProvider } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { ChildrenProvider } from './src/context/ChildrenContext'; // Added this

// Navigation and Services
import AppNavigator from './src/navigation/AppNavigator';
import notificationService from './src/services/notifications';
import { COLORS } from './src/constants/config';

// Keep splash screen visible
SplashScreen.preventAutoHideAsync().catch(() => {});

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const navigationRef = React.createRef();

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
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📨 Notification received:', notification);
      if (global.eventEmitter) {
        const { title, body, data } = notification.request.content;
        global.eventEmitter.emit('notification', { title, body, data });
      }
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response);
      handleNotificationResponse(response);
    });
  };

  const cleanupNotificationListeners = () => {
    notificationListener.current?.remove();
    responseListener.current?.remove();
  };

  const handleNotificationResponse = (response) => {
    const { data } = response.notification.request.content;
    
    if (!navigationRef.current) return;
    
    if (data?.type === 'attendance' && data?.childId) {
      navigationRef.current.navigate('Attendance', { childId: data.childId });
    } else if (data?.type === 'tracking' && data?.childId) {
      navigationRef.current.navigate('Tracking', { childId: data.childId });
    } else if (data?.type === 'message' && data?.conversationId) {
      navigationRef.current.navigate('Messages', { conversationId: data.conversationId });
    } else if (data?.type === 'alert') {
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