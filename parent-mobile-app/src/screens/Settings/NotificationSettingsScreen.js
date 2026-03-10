import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import notificationService from '../../services/notifications';
import { COLORS } from '../../constants/config';

export default function NotificationSettingsScreen({ navigation }) {
  const { user } = useAuth();
  const { colors, isDarkMode } = useTheme();
  
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    pushEnabled: true,
    emailEnabled: true,
    smsEnabled: false,
    boardingAlerts: true,
    alightingAlerts: true,
    delayAlerts: true,
    routeDeviationAlerts: true,
    emergencyAlerts: true,
    messageAlerts: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    soundEnabled: true,
    vibrationEnabled: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(`@notification_settings_${user?.id}`);
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem(`@notification_settings_${user?.id}`, JSON.stringify(newSettings));
      setSettings(newSettings);
      
      // Sync with backend if needed
      await api.user.updateNotificationSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const toggleSetting = (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    saveSettings(newSettings);
  };

  const sendTestNotification = async () => {
    try {
      // Get the push token
      const token = notificationService.getToken();
      
      if (!token) {
        Alert.alert('Error', 'No push token available. Please check notification permissions.');
        return;
      }

      // Send test notification via your service
      await notificationService.sendLocalNotification(
        '🔔 Test Notification',
        'This is a test notification from your settings!',
        { type: 'test', timestamp: new Date().toISOString() }
      );

      Alert.alert('Success', 'Test notification sent!');
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', 'Failed to send test notification');
    }
  };

  const SettingItem = ({ icon, title, description, value, onToggle, type = 'switch' }) => (
    <TouchableOpacity 
      style={[styles.settingItem, { borderBottomColor: colors.border }]}
      onPress={type === 'button' ? onToggle : null}
      disabled={type !== 'button'}
      activeOpacity={type === 'button' ? 0.7 : 1}
    >
      <View style={styles.settingIcon}>
        <Text style={[styles.iconText, { color: colors.text }]}>{icon}</Text>
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
        {description && <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>{description}</Text>}
      </View>
      {type === 'switch' && (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={value ? '#fff' : '#f4f3f4'}
        />
      )}
      {type === 'button' && (
        <View style={[styles.buttonArrow, { backgroundColor: colors.primary }]}>
          <Text style={styles.buttonArrowText}>→</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }) => (
    <View style={[styles.sectionHeader, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f0f0f0' }]}>
      <Text style={[styles.sectionHeaderText, { color: colors.text }]}>{title}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView>
        <SectionHeader title="Notification Channels" />
        
        <SettingItem
          icon="📱"
          title="Push Notifications"
          description="Receive notifications on your device"
          value={settings.pushEnabled}
          onToggle={() => toggleSetting('pushEnabled')}
        />

        <SettingItem
          icon="📧"
          title="Email Notifications"
          description="Receive notifications via email"
          value={settings.emailEnabled}
          onToggle={() => toggleSetting('emailEnabled')}
        />

        <SettingItem
          icon="📨"
          title="SMS Notifications"
          description="Receive notifications via SMS"
          value={settings.smsEnabled}
          onToggle={() => toggleSetting('smsEnabled')}
        />

        <SectionHeader title="Alert Types" />

        <SettingItem
          icon="🚌"
          title="Boarding Alerts"
          description="When your child boards the bus"
          value={settings.boardingAlerts}
          onToggle={() => toggleSetting('boardingAlerts')}
        />

        <SettingItem
          icon="🏁"
          title="Alighting Alerts"
          description="When your child leaves the bus"
          value={settings.alightingAlerts}
          onToggle={() => toggleSetting('alightingAlerts')}
        />

        <SettingItem
          icon="⏰"
          title="Delay Alerts"
          description="When the bus is running late"
          value={settings.delayAlerts}
          onToggle={() => toggleSetting('delayAlerts')}
        />

        <SettingItem
          icon="🔄"
          title="Route Deviation"
          description="When the bus changes route"
          value={settings.routeDeviationAlerts}
          onToggle={() => toggleSetting('routeDeviationAlerts')}
        />

        <SettingItem
          icon="🚨"
          title="Emergency Alerts"
          description="Critical safety notifications"
          value={settings.emergencyAlerts}
          onToggle={() => toggleSetting('emergencyAlerts')}
        />

        <SettingItem
          icon="💬"
          title="Message Alerts"
          description="New messages from school/drivers"
          value={settings.messageAlerts}
          onToggle={() => toggleSetting('messageAlerts')}
        />

        <SectionHeader title="Quiet Hours" />

        <SettingItem
          icon="🌙"
          title="Quiet Hours"
          description="Mute notifications during specific times"
          value={settings.quietHoursEnabled}
          onToggle={() => toggleSetting('quietHoursEnabled')}
        />

        {settings.quietHoursEnabled && (
          <View style={[styles.quietHoursContainer, { backgroundColor: colors.card }]}>
            <TouchableOpacity style={styles.timeButton} onPress={() => Alert.alert('Coming Soon', 'Time picker coming soon')}>
              <Text style={[styles.timeLabel, { color: colors.text }]}>Start Time</Text>
              <Text style={[styles.timeValue, { color: colors.primary }]}>{settings.quietHoursStart}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.timeButton} onPress={() => Alert.alert('Coming Soon', 'Time picker coming soon')}>
              <Text style={[styles.timeLabel, { color: colors.text }]}>End Time</Text>
              <Text style={[styles.timeValue, { color: colors.primary }]}>{settings.quietHoursEnd}</Text>
            </TouchableOpacity>
          </View>
        )}

        <SectionHeader title="Alert Style" />

        <SettingItem
          icon="🔊"
          title="Sound"
          description="Play sound for notifications"
          value={settings.soundEnabled}
          onToggle={() => toggleSetting('soundEnabled')}
        />

        <SettingItem
          icon="📳"
          title="Vibration"
          description="Vibrate for notifications"
          value={settings.vibrationEnabled}
          onToggle={() => toggleSetting('vibrationEnabled')}
        />

        <SectionHeader title="Testing" />

        <SettingItem
          icon="🧪"
          title="Test Notification"
          description="Send a test notification to verify settings"
          type="button"
          onToggle={sendTestNotification}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    paddingTop: 50, 
    paddingBottom: 20, 
    paddingHorizontal: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  backButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.3)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  backIcon: { fontSize: 24, color: '#fff' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  sectionHeader: { padding: 15, paddingHorizontal: 20 },
  sectionHeaderText: { fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  settingItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 15, 
    borderBottomWidth: 1 
  },
  settingIcon: { width: 40, alignItems: 'center' },
  iconText: { fontSize: 20 },
  settingContent: { flex: 1, marginLeft: 10 },
  settingTitle: { fontSize: 16, fontWeight: '500', marginBottom: 2 },
  settingDescription: { fontSize: 12 },
  buttonArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonArrowText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quietHoursContainer: { 
    flexDirection: 'row', 
    padding: 15, 
    justifyContent: 'space-around' 
  },
  timeButton: { 
    alignItems: 'center', 
    padding: 10 
  },
  timeLabel: { 
    fontSize: 12, 
    marginBottom: 5 
  },
  timeValue: { 
    fontSize: 16, 
    fontWeight: '600' 
  },
});