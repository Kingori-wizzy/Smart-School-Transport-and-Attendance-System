import React, { useEffect } from 'react';
import { Alert, Platform, Vibration } from 'react-native';
import { useSocket } from '../context/SocketContext';
import { useNavigation } from '@react-navigation/native';

export default function NotificationListener({ children }) {
  const { alerts, notifications, isConnected } = useSocket();
  const navigation = useNavigation();

  useEffect(() => {
    if (alerts.length > 0) {
      const latestAlert = alerts[alerts.length - 1];
      
      // Vibrate for important alerts
      if (latestAlert.type === 'boarding' || latestAlert.type === 'alighting') {
        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          Vibration.vibrate(500);
        }
      }
      
      // Show alert
      Alert.alert(
        latestAlert.title,
        latestAlert.message,
        [
          {
            text: 'View',
            onPress: () => {
              if (latestAlert.type === 'boarding' || latestAlert.type === 'alighting') {
                navigation.navigate('Tracking');
              } else if (latestAlert.type === 'message') {
                navigation.navigate('Messages');
              }
            }
          },
          { text: 'OK', style: 'cancel' }
        ],
        { cancelable: true }
      );
    }
  }, [alerts]);

  return <>{children}</>;
}