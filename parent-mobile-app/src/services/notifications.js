import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, PermissionsAndroid, Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

// Configure notification handler for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const { data } = notification.request.content;
    
    // Determine priority based on notification type
    let priority = Notifications.AndroidNotificationPriority.DEFAULT;
    let shouldPlaySound = true;
    let shouldSetBadge = true;
    
    if (data?.type === 'boarding_alert' || data?.type === 'alighting_alert') {
      priority = Notifications.AndroidNotificationPriority.HIGH;
      shouldPlaySound = true;
    } else if (data?.type === 'emergency') {
      priority = Notifications.AndroidNotificationPriority.MAX;
      shouldPlaySound = true;
    } else if (data?.type === 'trip_start' || data?.type === 'trip_complete') {
      priority = Notifications.AndroidNotificationPriority.DEFAULT;
      shouldPlaySound = true;
    }
    
    return {
      shouldShowAlert: true,
      shouldPlaySound,
      shouldSetBadge,
      priority: priority,
    };
  },
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
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Notification Permission',
            message: 'This app needs permission to send you notifications about your child\'s transport status.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
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
        console.log('Failed to get push token for push notification');
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

      console.log('Push token registered:', this.token.substring(0, 20) + '...');
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
      console.log('Push token sent to server');
    } catch (error) {
      console.error('Error sending token to server:', error);
    }
  }

  // Set up Android notification channels
  async setupAndroidChannels() {
    try {
      // Boarding Alerts channel - High priority
      await Notifications.setNotificationChannelAsync('boarding_alerts', {
        name: 'Boarding Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4CAF50',
        sound: 'default',
        bypassDnd: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        description: 'Notifications when your child boards or alights from the bus',
      });

      // Emergency Alerts channel - Highest priority
      await Notifications.setNotificationChannelAsync('emergency', {
        name: 'Emergency Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500, 200, 500],
        lightColor: '#f44336',
        sound: 'default',
        bypassDnd: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        description: 'Critical emergency notifications',
      });

      // Trip Updates channel
      await Notifications.setNotificationChannelAsync('trip_updates', {
        name: 'Trip Updates',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2196F3',
        sound: 'default',
        description: 'Trip start, completion, and delay updates',
      });

      // Messages channel
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF9800',
        sound: 'default',
        description: 'Messages from drivers and school staff',
      });

      // General channel
      await Notifications.setNotificationChannelAsync('general', {
        name: 'General',
        importance: Notifications.AndroidImportance.LOW,
        lightColor: '#9C27B0',
        description: 'General app notifications',
      });
      
      console.log('Android notification channels configured');
    } catch (error) {
      console.error('Error setting up channels:', error);
    }
  }

  // Set up notification listeners
  setupListeners() {
    // Listener for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification.request.content.title);
      this.handleForegroundNotification(notification);
    });

    // Listener for when user taps on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response.notification.request.content.title);
      this.handleNotificationResponse(response);
    });
  }

  // Handle foreground notifications with vibration
  handleForegroundNotification(notification) {
    const { title, body, data } = notification.request.content;
    
    // Vibrate for important notifications
    if (data?.type === 'boarding_alert' || data?.type === 'alighting_alert') {
      Vibration.vibrate(Platform.OS === 'ios' ? [0, 300] : 300);
    } else if (data?.type === 'emergency') {
      Vibration.vibrate(Platform.OS === 'ios' ? [0, 500, 200, 500] : [0, 500, 200, 500]);
    }
    
    // Emit event for app to handle
    if (global.eventEmitter) {
      global.eventEmitter.emit('notification', { title, body, data });
    }
  }

  // Handle notification tap with proper navigation
  handleNotificationResponse(response) {
    const { data } = response.notification.request.content;
    
    if (!this.navigationRef) {
      console.log('Navigation ref not set, notification response queued');
      // Store for later
      this.pendingNotification = data;
      return;
    }
    
    this.navigateToScreen(data);
  }

  // Navigate based on notification type
  navigateToScreen(data) {
    if (!data) return;
    
    console.log('Navigating from notification:', data.type);
    
    switch (data.type) {
      case 'boarding_alert':
      case 'alighting_alert':
        this.navigationRef.navigate('Tracking');
        break;
      case 'trip_start':
      case 'trip_complete':
        this.navigationRef.navigate('Tracking');
        break;
      case 'attendance':
        if (data.childId) {
          this.navigationRef.navigate('Attendance', { childId: data.childId });
        } else {
          this.navigationRef.navigate('Attendance');
        }
        break;
      case 'tracking':
        if (data.childId) {
          this.navigationRef.navigate('Tracking', { childId: data.childId });
        } else {
          this.navigationRef.navigate('Tracking');
        }
        break;
      case 'message':
        if (data.conversationId) {
          this.navigationRef.navigate('Messages', { conversationId: data.conversationId });
        } else {
          this.navigationRef.navigate('Messages');
        }
        break;
      case 'emergency':
        this.navigationRef.navigate('Emergency', { alert: data });
        break;
      case 'admin_broadcast':
      case 'alert':
        this.navigationRef.navigate('Notifications');
        break;
      default:
        this.navigationRef.navigate('Notifications');
        break;
    }
  }

  // Check for pending notification on app start
  async checkPendingNotification() {
    // Get last notification response from AsyncStorage
    const lastResponse = await AsyncStorage.getItem('@last_notification_response');
    if (lastResponse) {
      try {
        const data = JSON.parse(lastResponse);
        this.navigateToScreen(data);
        await AsyncStorage.removeItem('@last_notification_response');
      } catch (e) {
        console.error('Error parsing pending notification:', e);
      }
    }
  }

  // Send a local notification (for testing)
  async sendLocalNotification(title, body, data = {}, channelId = 'general') {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          channelId: channelId,
        },
        trigger: null, // Send immediately
      });
      console.log('Local notification sent:', title);
      return true;
    } catch (error) {
      console.error('Error sending local notification:', error);
      return false;
    }
  }

  // Send boarding notification locally (for testing)
  async sendBoardingNotification(studentName, busNumber, location) {
    return this.sendLocalNotification(
      `${studentName} Boarded`,
      `${studentName} has boarded the bus at ${location}`,
      {
        type: 'boarding_alert',
        studentName,
        busNumber,
        location,
        timestamp: new Date().toISOString()
      },
      'boarding_alerts'
    );
  }

  // Send alighting notification locally (for testing)
  async sendAlightingNotification(studentName, busNumber, location) {
    return this.sendLocalNotification(
      `${studentName} Alighted`,
      `${studentName} has been dropped off at ${location}`,
      {
        type: 'alighting_alert',
        studentName,
        busNumber,
        location,
        timestamp: new Date().toISOString()
      },
      'boarding_alerts'
    );
  }

  // Schedule a notification for later
  async scheduleNotification(title, body, trigger, data = {}, channelId = 'general') {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
          channelId: channelId,
        },
        trigger,
      });
      console.log('Notification scheduled:', title);
      return true;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return false;
    }
  }

  // Cancel all scheduled notifications
  async cancelAllScheduled() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All scheduled notifications cancelled');
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

  // Get notification badge count
  async getBadgeCount() {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  // Set notification badge count
  async setBadgeCount(count) {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
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