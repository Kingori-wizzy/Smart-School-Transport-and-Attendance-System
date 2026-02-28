import 'react-native-gesture-handler';
import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationContainer } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './src/context/AuthContext';
import { TripProvider } from './src/context/TripContext';
import AppNavigator from './src/navigation/AppNavigator';
import { COLORS } from './src/constants/config';

// Add this right after your imports
if (__DEV__) {
  try {
    const DevMenu = require('expo-dev-menu');
    if (DevMenu) {
      if (typeof DevMenu.setEnabled === 'function') {
        DevMenu.setEnabled(false);
        console.log('Dev menu disabled');
      }
    }
  } catch (e) {
    console.log('Dev menu not found');
  }
}

// Keep splash screen visible
SplashScreen.preventAutoHideAsync().catch(() => {});

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
        // Simulate a short loading time
        await new Promise(resolve => setTimeout(resolve, 2000));
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
    if (isReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isReady]);

  const setupNotificationListeners = () => {
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📨 Notification received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      handleNotificationResponse(response);
    });
  };

  const cleanupNotificationListeners = () => {
    notificationListener.current?.remove();
    responseListener.current?.remove();
  };

  const handleNotificationResponse = (response) => {
    const { data } = response.notification.request.content;
    if (data?.screen === 'Trip') {
      navigationRef.current?.navigate('Trip', { tripId: data.tripId });
    }
  };

  if (!isReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={COLORS.primary} />
        <AuthProvider>
          <TripProvider>
            <NavigationContainer ref={navigationRef}>
              <AppNavigator />
            </NavigationContainer>
          </TripProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}