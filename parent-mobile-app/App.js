import React, { useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationContainer } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import AppNavigator from './src/navigation/AppNavigator';
import notificationService from './src/services/notifications';
import { COLORS } from './src/constants/config';

// Keep splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Create navigation ref for notification navigation
export const navigationRef = React.createRef();

export default function App() {
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    initializeApp();
    
    // Set up notification listeners
    setupNotificationListeners();

    return () => {
      cleanupNotificationListeners();
    };
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize notifications
      await notificationService.initialize();
      
      // ✅ Set navigation ref in notification service for deep linking
      notificationService.setNavigationRef(navigationRef.current);
      
      // Hide splash screen after everything is ready
      await new Promise(resolve => setTimeout(resolve, 2000));
      await SplashScreen.hideAsync();
    } catch (error) {
      console.error('Error initializing app:', error);
      await SplashScreen.hideAsync();
    }
  };

  const setupNotificationListeners = () => {
    // Listener for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 Notification received in foreground:', notification);
      
      // Emit event for app to handle
      if (global.eventEmitter) {
        const { title, body, data } = notification.request.content;
        global.eventEmitter.emit('notification', { title, body, data });
      }
    });

    // Listener for when user taps on notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response);
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
    
    // Navigate based on notification type
    if (data?.type === 'attendance' && data?.childId) {
      navigationRef.current?.navigate('Attendance', { childId: data.childId });
    } else if (data?.type === 'tracking' && data?.childId) {
      navigationRef.current?.navigate('Tracking', { childId: data.childId });
    } else if (data?.type === 'message' && data?.conversationId) {
      navigationRef.current?.navigate('Messages', { conversationId: data.conversationId });
    } else if (data?.type === 'alert') {
      navigationRef.current?.navigate('Notifications');
    }
  };

  const navigate = (name, params) => {
    navigationRef.current?.navigate(name, params);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={COLORS.primary} />
        <AuthProvider>
          <SocketProvider>
            <NavigationContainer ref={navigationRef}>
              <AppNavigator />
            </NavigationContainer>
          </SocketProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}