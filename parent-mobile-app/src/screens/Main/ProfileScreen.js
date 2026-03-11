import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import notificationService from '../../services/notifications';
import cache from '../../services/cache';

const MenuItem = ({ icon, title, subtitle, onPress, value, type = 'arrow', colors }) => (
  <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={onPress}>
    <Text style={[styles.menuIcon, { color: colors.text }]}>{icon}</Text>
    <View style={styles.menuContent}>
      <Text style={[styles.menuTitle, { color: colors.text }]}>{title}</Text>
      {subtitle && <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
    </View>
    {type === 'arrow' && <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>}
    {type === 'value' && <Text style={[styles.menuValue, { color: colors.textSecondary }]}>{value}</Text>}
    {type === 'switch' && (
      <Switch
        value={value}
        onValueChange={onPress}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={value ? '#fff' : '#f4f3f4'}
      />
    )}
  </TouchableOpacity>
);

const EditProfileModal = ({ visible, user, onSave, onClose, colors }) => {
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    await onSave(formData);
    setLoading(false);
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.modalClose, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalBody}>
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>First Name</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text
                  }]}
                  value={formData.firstName}
                  onChangeText={(text) => setFormData({ ...formData, firstName: text })}
                  placeholder="Enter first name"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Last Name</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text
                  }]}
                  value={formData.lastName}
                  onChangeText={(text) => setFormData({ ...formData, lastName: text })}
                  placeholder="Enter last name"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Email</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text
                  }]}
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  placeholder="Enter email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={false}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Phone Number</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text
                  }]}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
                <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.gradient}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const ChangePasswordModal = ({ visible, onSave, onClose, colors }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (formData.newPassword !== formData.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    if (formData.newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    await onSave(formData);
    setLoading(false);
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Change Password</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.modalClose, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalBody}>
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Current Password</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text
                  }]}
                  value={formData.currentPassword}
                  onChangeText={(text) => setFormData({ ...formData, currentPassword: text })}
                  placeholder="Enter current password"
                  secureTextEntry
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>New Password</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text
                  }]}
                  value={formData.newPassword}
                  onChangeText={(text) => setFormData({ ...formData, newPassword: text })}
                  placeholder="Enter new password"
                  secureTextEntry
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Confirm New Password</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text
                  }]}
                  value={formData.confirmPassword}
                  onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                  placeholder="Confirm new password"
                  secureTextEntry
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
                <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.gradient}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Update Password</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default function ProfileScreen({ navigation }) {
  const { user, logout, refreshUser } = useAuth();
  const { isConnected } = useSocket();
  const { colors, isDarkMode, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pushToken, setPushToken] = useState(null);
  const [settings, setSettings] = useState({
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    locationSharing: true,
    soundAlerts: true,
    darkMode: false,
    autoRefresh: true,
  });

  useEffect(() => {
    loadProfileImage();
    loadSettings();
    loadPushToken();
  }, []);

  const loadProfileImage = async () => {
    try {
      if (user?.profileImage) {
        setProfileImage(user.profileImage);
      } else {
        const savedImage = await AsyncStorage.getItem(`@profile_image_${user?.id}`);
        if (savedImage) {
          setProfileImage(savedImage);
        }
      }
    } catch (error) {
      console.error('Error loading profile image:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem(`@user_settings_${user?.id}`);
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadPushToken = async () => {
    const token = notificationService.getToken();
    setPushToken(token);
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem(`@user_settings_${user?.id}`, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
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
      uploadProfileImage(result.assets[0].uri);
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
      uploadProfileImage(result.assets[0].uri);
    }
  };

  const uploadProfileImage = async (imageUri) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('photo', {
        uri: imageUri,
        type: 'image/jpeg',
        name: `profile_${user?.id}_${Date.now()}.jpg`,
      });
      
      const response = await api.profile.uploadPhoto(formData);
      
      if (response.ok) {
        const data = await response.json();
        setProfileImage(data.photoUrl);
        await AsyncStorage.setItem(`@profile_image_${user?.id}`, data.photoUrl);
        Alert.alert('Success', 'Profile picture updated');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setLoading(false);
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

  const handleUpdateProfile = async (formData) => {
    try {
      const response = await api.user.updateProfile(formData);
      if (response.success) {
        await refreshUser();
        Alert.alert('Success', 'Profile updated successfully');
        setShowEditModal(false);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    }
  };

  const handleChangePassword = async (formData) => {
    try {
      await api.user.changePassword(formData);
      Alert.alert('Success', 'Password changed successfully');
      setShowPasswordModal(false);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to change password');
    }
  };

  const handleTestNotification = async () => {
    await notificationService.sendLocalNotification(
      '🔔 Test Notification',
      'This is a test notification from your profile!',
      { type: 'test', timestamp: new Date().toISOString() }
    );
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data. You may need to reload the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          onPress: async () => {
            try {
              await cache.clearAll();
              Alert.alert('Success', 'Cache cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache');
            }
          }
        }
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
          },
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
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.user.deleteAccount();
              await logout();
              navigation.replace('Login');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={showImageOptions} style={styles.imageContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={[styles.profileImagePlaceholder, { backgroundColor: colors.primary }]}>
                <Text style={styles.placeholderText}>
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </Text>
              </View>
            )}
            <View style={[styles.editBadge, { backgroundColor: colors.secondary }]}>
              <Text style={styles.editIcon}>✏️</Text>
            </View>
          </TouchableOpacity>

          <Text style={[styles.userName, { color: colors.text }]}>{user?.firstName} {user?.lastName}</Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
          <Text style={[styles.userPhone, { color: colors.textSecondary }]}>{user?.phone}</Text>

          <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>●</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{isConnected ? 'Online' : 'Offline'}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>✓</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Verified</Text>
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, borderBottomColor: colors.border }]}>
            Account Settings
          </Text>
          
          <MenuItem
            icon="👤"
            title="Edit Profile"
            subtitle="Update your personal information"
            onPress={() => setShowEditModal(true)}
            colors={colors}
          />

          <MenuItem
            icon="🔐"
            title="Change Password"
            subtitle="Update your password"
            onPress={() => setShowPasswordModal(true)}
            colors={colors}
          />

          <MenuItem
            icon="📧"
            title="Email Preferences"
            subtitle="Manage email communications"
            onPress={() => Alert.alert('Coming Soon', 'This feature is coming soon')}
            colors={colors}
          />
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, borderBottomColor: colors.border }]}>
            Notification Settings
          </Text>

          <MenuItem
            icon="🔔"
            title="Push Notifications"
            type="switch"
            value={settings.pushNotifications}
            onPress={() => toggleSetting('pushNotifications')}
            colors={colors}
          />

          <MenuItem
            icon="📧"
            title="Email Notifications"
            type="switch"
            value={settings.emailNotifications}
            onPress={() => toggleSetting('emailNotifications')}
            colors={colors}
          />

          <MenuItem
            icon="📱"
            title="SMS Notifications"
            type="switch"
            value={settings.smsNotifications}
            onPress={() => toggleSetting('smsNotifications')}
            colors={colors}
          />

          <MenuItem
            icon="🔊"
            title="Sound Alerts"
            type="switch"
            value={settings.soundAlerts}
            onPress={() => toggleSetting('soundAlerts')}
            colors={colors}
          />

          <MenuItem
            icon="📍"
            title="Geofence Alerts"
            subtitle="Manage location-based notifications"
            onPress={() => navigation.navigate('GeofenceSettings')}
            colors={colors}
          />

          <MenuItem
            icon="📋"
            title="Geofence History"
            subtitle="View past geofence events"
            onPress={() => navigation.navigate('GeofenceHistory')}
            colors={colors}
          />

          <MenuItem
            icon="⚙️"
            title="Advanced Settings"
            subtitle="Configure notification types"
            onPress={() => navigation.navigate('NotificationSettings')}
            colors={colors}
          />

          {pushToken && (
            <MenuItem
              icon="📱"
              title="Test Notification"
              subtitle="Send a test push notification"
              onPress={handleTestNotification}
              colors={colors}
            />
          )}
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, borderBottomColor: colors.border }]}>
            App Settings
          </Text>

          <MenuItem
            icon="📍"
            title="Location Sharing"
            subtitle="Allow location for bus tracking"
            type="switch"
            value={settings.locationSharing}
            onPress={() => toggleSetting('locationSharing')}
            colors={colors}
          />

          <MenuItem
            icon="🌙"
            title="Dark Mode"
            type="switch"
            value={isDarkMode}
            onPress={toggleTheme}
            colors={colors}
          />

          <MenuItem
            icon="🔄"
            title="Auto Refresh"
            type="switch"
            value={settings.autoRefresh}
            onPress={() => toggleSetting('autoRefresh')}
            colors={colors}
          />

          <MenuItem
            icon="🗑️"
            title="Clear Cache"
            subtitle="Free up storage space"
            onPress={handleClearCache}
            colors={colors}
          />

          <MenuItem
            icon="🗺️"
            title="Route History"
            subtitle="View past trips and routes"
            onPress={() => navigation.navigate('RouteHistory')}
            colors={colors}
          />

          <MenuItem
            icon="ℹ️"
            title="App Version"
            value="1.0.0"
            type="value"
            onPress={() => {}}
            colors={colors}
          />
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, borderBottomColor: colors.border }]}>
            Support
          </Text>

          <MenuItem
            icon="❓"
            title="Help Center"
            subtitle="Get help with the app"
            onPress={() => navigation.navigate('HelpCenter')}
            colors={colors}
          />

          <MenuItem
            icon="💬"
            title="Contact Support"
            subtitle="Send us a message"
            onPress={() => navigation.navigate('ContactSupport')}
            colors={colors}
          />

          <MenuItem
            icon="📄"
            title="Terms of Service"
            onPress={() => navigation.navigate('TermsOfService')}
            colors={colors}
          />

          <MenuItem
            icon="🔒"
            title="Privacy Policy"
            onPress={() => navigation.navigate('PrivacyPolicy')}
            colors={colors}
          />
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={[styles.logoutButton, { borderColor: colors.danger }]} onPress={handleLogout}>
            <Text style={[styles.logoutText, { color: colors.danger }]}>Logout</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.deleteButton, { borderColor: colors.textSecondary }]} onPress={handleDeleteAccount}>
            <Text style={[styles.deleteText, { color: colors.textSecondary }]}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.copyright, { color: colors.textSecondary }]}>
          © 2026 Smart School Transport. All rights reserved.
        </Text>
      </ScrollView>

      <EditProfileModal
        visible={showEditModal}
        user={user}
        onSave={handleUpdateProfile}
        onClose={() => setShowEditModal(false)}
        colors={colors}
      />

      <ChangePasswordModal
        visible={showPasswordModal}
        onSave={handleChangePassword}
        onClose={() => setShowPasswordModal(false)}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 24, color: '#fff' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  profileCard: { margin: 20, marginTop: -30, padding: 20, borderRadius: 15, alignItems: 'center', elevation: 4 },
  imageContainer: { position: 'relative', marginTop: -40, marginBottom: 10 },
  profileImage: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: '#fff' },
  profileImagePlaceholder: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  placeholderText: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  editIcon: { fontSize: 14 },
  userName: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  userEmail: { fontSize: 14, marginBottom: 2 },
  userPhone: { fontSize: 14, marginBottom: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: 10, borderTopWidth: 1 },
  statItem: { alignItems: 'center', paddingHorizontal: 20 },
  statNumber: { fontSize: 16, fontWeight: 'bold' },
  statLabel: { fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: 20 },
  section: { marginHorizontal: 15, marginBottom: 15, paddingVertical: 10, borderRadius: 10, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '600', paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 1 },
  menuIcon: { fontSize: 20, width: 35 },
  menuContent: { flex: 1 },
  menuTitle: { fontSize: 14, fontWeight: '500' },
  menuSubtitle: { fontSize: 11, marginTop: 2 },
  menuArrow: { fontSize: 18 },
  menuValue: { fontSize: 14 },
  actionButtons: { marginHorizontal: 15, marginBottom: 15 },
  logoutButton: { backgroundColor: '#fff', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginBottom: 10, borderWidth: 1 },
  logoutText: { fontSize: 16, fontWeight: '600' },
  deleteButton: { backgroundColor: '#fff', paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  deleteText: { fontSize: 14, fontWeight: '500' },
  copyright: { textAlign: 'center', fontSize: 11, marginBottom: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalClose: { fontSize: 20, padding: 5 },
  modalBody: { padding: 20 },
  inputContainer: { marginBottom: 15 },
  inputLabel: { fontSize: 13, marginBottom: 5 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14 },
  saveButton: { height: 48, borderRadius: 8, overflow: 'hidden', marginTop: 10, marginBottom: 20 },
  gradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});