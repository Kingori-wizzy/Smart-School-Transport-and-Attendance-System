import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { COLORS, STORAGE_KEYS } from '../../constants/config';

export default function ProfileScreen({ navigation }) {
  const { user, logout, childrenList } = useAuth();
  const { isConnected } = useSocket();
  const [loading, setLoading] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [settings, setSettings] = useState({
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    locationSharing: true,
    darkMode: false,
    autoRefresh: true,
    soundAlerts: true,
  });

  useEffect(() => {
    loadProfileImage();
    loadSettings();
  }, []);

  const loadProfileImage = async () => {
    try {
      const savedImage = await AsyncStorage.getItem('@profile_image');
      if (savedImage) {
        setProfileImage(savedImage);
      }
    } catch (error) {
      console.error('Error loading profile image:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('@user_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('@user_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const toggleSetting = (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    saveSettings(newSettings);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
      await AsyncStorage.setItem('@profile_image', result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant access to your camera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
      await AsyncStorage.setItem('@profile_image', result.assets[0].uri);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Profile Picture',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Gallery', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.replace('Login');
          }
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/user/account');
              await logout();
              navigation.replace('Login');
              Alert.alert('Account deleted', 'Your account has been deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete account');
            }
          }
        },
      ]
    );
  };

  const SettingItem = ({ icon, title, description, value, onToggle, type = 'switch' }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <Text style={styles.settingIcon}>{icon}</Text>
        <View style={styles.settingTextContainer}>
          <Text style={styles.settingTitle}>{title}</Text>
          {description && <Text style={styles.settingDescription}>{description}</Text>}
        </View>
      </View>
      {type === 'switch' ? (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#ddd', true: COLORS.primary }}
          thumbColor={value ? '#fff' : '#f4f3f4'}
        />
      ) : (
        <TouchableOpacity onPress={onToggle}>
          <Text style={styles.settingValue}>{value}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.secondary]}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <TouchableOpacity onPress={showImageOptions} style={styles.imageContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Text style={styles.placeholderText}>
                  {user?.name?.charAt(0) || 'U'}
                </Text>
              </View>
            )}
            <View style={styles.editBadge}>
              <Text style={styles.editIcon}>✏️</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.userName}>{user?.name || 'Parent Name'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'parent@email.com'}</Text>
          <Text style={styles.userPhone}>{user?.phone || '+254 700 000 000'}</Text>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{childrenList.length}</Text>
              <Text style={styles.statLabel}>Children</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: isConnected ? '#4CAF50' : '#f44336' }]}>
                {isConnected ? '●' : '○'}
              </Text>
              <Text style={styles.statLabel}>
                {isConnected ? 'Online' : 'Offline'}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>5</Text>
              <Text style={styles.statLabel}>Devices</Text>
            </View>
          </View>
        </View>

        {/* Account Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuIcon}>👤</Text>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Edit Profile</Text>
              <Text style={styles.menuSubtitle}>Update your personal information</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuIcon}>🔐</Text>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Change Password</Text>
              <Text style={styles.menuSubtitle}>Update your password</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuIcon}>📧</Text>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Email Preferences</Text>
              <Text style={styles.menuSubtitle}>Manage email communications</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Settings</Text>
          
          <SettingItem
            icon="🔔"
            title="Push Notifications"
            description="Receive alerts on your device"
            value={settings.pushNotifications}
            onToggle={() => toggleSetting('pushNotifications')}
          />

          <SettingItem
            icon="📧"
            title="Email Notifications"
            description="Receive updates via email"
            value={settings.emailNotifications}
            onToggle={() => toggleSetting('emailNotifications')}
          />

          <SettingItem
            icon="📱"
            title="SMS Notifications"
            description="Receive text messages"
            value={settings.smsNotifications}
            onToggle={() => toggleSetting('smsNotifications')}
          />

          <SettingItem
            icon="🔊"
            title="Sound Alerts"
            description="Play sound for notifications"
            value={settings.soundAlerts}
            onToggle={() => toggleSetting('soundAlerts')}
          />
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>

          <SettingItem
            icon="📍"
            title="Location Sharing"
            description="Share your location for tracking"
            value={settings.locationSharing}
            onToggle={() => toggleSetting('locationSharing')}
          />

          <SettingItem
            icon="🌙"
            title="Dark Mode"
            description="Switch to dark theme"
            value={settings.darkMode}
            onToggle={() => toggleSetting('darkMode')}
          />

          <SettingItem
            icon="🔄"
            title="Auto Refresh"
            description="Automatically refresh data"
            value={settings.autoRefresh}
            onToggle={() => toggleSetting('autoRefresh')}
          />

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuIcon}>🗑️</Text>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Clear Cache</Text>
              <Text style={styles.menuSubtitle}>Free up storage space</Text>
            </View>
            <Text style={styles.menuValue}>128 MB</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuIcon}>ℹ️</Text>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>App Version</Text>
              <Text style={styles.menuSubtitle}>Check for updates</Text>
            </View>
            <Text style={styles.menuValue}>1.0.0</Text>
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuIcon}>❓</Text>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Help Center</Text>
              <Text style={styles.menuSubtitle}>Get help with the app</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuIcon}>💬</Text>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Contact Support</Text>
              <Text style={styles.menuSubtitle}>Send us a message</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuIcon}>📄</Text>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Terms of Service</Text>
              <Text style={styles.menuSubtitle}>Read our terms</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuIcon}>🔒</Text>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Privacy Policy</Text>
              <Text style={styles.menuSubtitle}>Read our privacy policy</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.logoutButton]}
            onPress={handleLogout}
          >
            <Text style={styles.actionButtonText}>Logout</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDeleteAccount}
          >
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
              Delete Account
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.copyright}>
          © 2026 Smart School Transport. All rights reserved.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  profileCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imageContainer: {
    position: 'relative',
    marginTop: -40,
    marginBottom: 15,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  placeholderText: {
    fontSize: 40,
    color: '#fff',
    fontWeight: 'bold',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.secondary,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  editIcon: {
    fontSize: 14,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  userPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuIcon: {
    fontSize: 20,
    width: 40,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  menuArrow: {
    fontSize: 20,
    color: '#999',
  },
  menuValue: {
    fontSize: 14,
    color: '#666',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 20,
    width: 40,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  settingDescription: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  actionButtons: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  actionButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  logoutButton: {
    backgroundColor: COLORS.primary,
  },
  deleteButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f44336',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  deleteButtonText: {
    color: '#f44336',
  },
  copyright: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginBottom: 20,
  },
});