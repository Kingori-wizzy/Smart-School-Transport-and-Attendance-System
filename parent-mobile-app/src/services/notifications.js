import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  constructor() {
    this.notificationListener = null;
    this.responseListener = null;
    this.token = null;
    this.navigationRef = null;
  }

  // Set navigation ref for deep linking
  setNavigationRef(ref) {
    this.navigationRef = ref;
  }

  // Initialize notifications
  async initialize() {
    try {
      // Check if we already have a token stored
      const storedToken = await AsyncStorage.getItem('@push_token');
      if (storedToken) {
        this.token = storedToken;
      }

      // Set up listeners
      this.setupListeners();
      
      // Request permissions and register for push notifications
      await this.registerForPushNotificationsAsync();
      
      return true;
    } catch (error) {
      console.error('Notification initialization error:', error);
      return false;
    }
  }

  // Request Android 13+ notification permission
  async requestAndroidPermissions() {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (error) {
        console.error('Android permission error:', error);
        return false;
      }
    }
    return true;
  }

  // Register for push notifications
  async registerForPushNotificationsAsync() {
    try {
      if (!Device.isDevice) {
        console.log('Push notifications only work on physical devices');
        return false;
      }

      // Request Android permission if needed
      await this.requestAndroidPermissions();

      // Check existing permissions for iOS
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return false;
      }

      // Get the project ID from app config
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      
      if (!projectId) {
        console.error('Project ID not found');
        return false;
      }

      // Get Expo push token
      const expoPushToken = (await Notifications.getExpoPushTokenAsync({
        projectId,
      })).data;

      this.token = expoPushToken;
      
      // Save token locally
      await AsyncStorage.setItem('@push_token', this.token);
      
      // Send token to backend
      await this.sendTokenToServer(this.token);
      
      // Set up Android notification channels
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      console.log('✅ Push token registered:', this.token);
      return true;
    } catch (error) {
      console.error('Push registration error:', error);
      return false;
    }
  }

  // Send token to backend
  async sendTokenToServer(token) {
    try {
      await api.user.savePushToken(token);
    } catch (error) {
      console.error('Error sending token to server:', error);
    }
  }

  // Set up Android notification channels
  async setupAndroidChannels() {
    try {
      // Default channel
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF667EEA',
        sound: 'default',
        bypassDnd: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      // Alerts channel (high priority)
      await Notifications.setNotificationChannelAsync('alerts', {
        name: 'Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#f44336',
        sound: 'default',
        bypassDnd: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      // Messages channel
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2196F3',
        sound: 'default',
      });

      // Updates channel (low priority)
      await Notifications.setNotificationChannelAsync('updates', {
        name: 'Updates',
        importance: Notifications.AndroidImportance.LOW,
        lightColor: '#4CAF50',
      });
    } catch (error) {
      console.error('Error setting up channels:', error);
    }
  }

  // Set up notification listeners
  setupListeners() {
    // Listener for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 Notification received in foreground:', notification);
      this.handleForegroundNotification(notification);
    });

    // Listener for when user taps on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response);
      this.handleNotificationResponse(response);
    });
  }

  // Handle foreground notifications
  handleForegroundNotification(notification) {
    const { title, body, data } = notification.request.content;
    
    // Emit event for app to handle
    if (global.eventEmitter) {
      global.eventEmitter.emit('notification', { title, body, data });
    }
  }

  // Handle notification tap
  handleNotificationResponse(response) {
    const { data } = response.notification.request.content;
    
    if (!this.navigationRef) return;
    
    // Navigate based on notification type
    if (data?.type === 'attendance' && data?.childId) {
      this.navigationRef.navigate('Attendance', { childId: data.childId });
    } else if (data?.type === 'tracking' && data?.childId) {
      this.navigationRef.navigate('Tracking', { childId: data.childId });
    } else if (data?.type === 'message' && data?.conversationId) {
      this.navigationRef.navigate('Messages', { conversationId: data.conversationId });
    } else if (data?.type === 'alert') {
      this.navigationRef.navigate('Notifications');
    }
  }

  // Send a local notification (for testing)
  async sendLocalNotification(title, body, data = {}) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Send immediately
      });
      console.log('✅ Local notification sent');
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  }

  // Schedule a notification
  async scheduleNotification(title, body, trigger, data = {}) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger,
      });
      console.log('✅ Notification scheduled');
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }

  // Cancel all scheduled notifications
  async cancelAllScheduled() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('✅ All scheduled notifications cancelled');
    } catch (error) {
      console.error('Error canceling notifications:', error);
    }
  }

  // Get all scheduled notifications
  async getAllScheduled() {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  // Clean up listeners
  cleanup() {
    if (this.notificationListener) {
      this.notificationListener.remove();
    }
    if (this.responseListener) {
      this.responseListener.remove();
    }
  }

  // Get push token
  getToken() {
    return this.token;
  }
}

export default new NotificationService();