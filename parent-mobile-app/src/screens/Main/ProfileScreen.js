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
import api from '../../services/api';
import notificationService from '../../services/notifications';
import { COLORS } from '../../constants/config';

const MenuItem = ({ icon, title, subtitle, onPress, value, type = 'arrow' }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <Text style={styles.menuIcon}>{icon}</Text>
    <View style={styles.menuContent}>
      <Text style={styles.menuTitle}>{title}</Text>
      {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
    </View>
    {type === 'arrow' && <Text style={styles.menuArrow}>›</Text>}
    {type === 'value' && <Text style={styles.menuValue}>{value}</Text>}
    {type === 'switch' && (
      <Switch
        value={value}
        onValueChange={onPress}
        trackColor={{ false: '#ddd', true: COLORS.primary }}
        thumbColor={value ? '#fff' : '#f4f3f4'}
      />
    )}
  </TouchableOpacity>
);

const EditProfileModal = ({ visible, user, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    await onSave(formData);
    setLoading(false);
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalBody}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>First Name</Text>
                <TextInput
                  style={styles.input}
                  value={formData.firstName}
                  onChangeText={(text) => setFormData({ ...formData, firstName: text })}
                  placeholder="Enter first name"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  value={formData.lastName}
                  onChangeText={(text) => setFormData({ ...formData, lastName: text })}
                  placeholder="Enter last name"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  placeholder="Enter email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
                <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.gradient}>
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

const ChangePasswordModal = ({ visible, onSave, onClose }) => {
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
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalBody}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Current Password</Text>
                <TextInput
                  style={styles.input}
                  value={formData.currentPassword}
                  onChangeText={(text) => setFormData({ ...formData, currentPassword: text })}
                  placeholder="Enter current password"
                  secureTextEntry
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>New Password</Text>
                <TextInput
                  style={styles.input}
                  value={formData.newPassword}
                  onChangeText={(text) => setFormData({ ...formData, newPassword: text })}
                  placeholder="Enter new password"
                  secureTextEntry
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <TextInput
                  style={styles.input}
                  value={formData.confirmPassword}
                  onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                  placeholder="Confirm new password"
                  secureTextEntry
                />
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
                <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.gradient}>
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

  const loadPushToken = async () => {
    const token = notificationService.getToken();
    setPushToken(token);
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('@user_settings', JSON.stringify(newSettings));
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

  const handleUpdateProfile = async (formData) => {
    try {
      await api.user.updateProfile(formData);
      await refreshUser();
      Alert.alert('Success', 'Profile updated successfully');
      setShowEditModal(false);
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
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <TouchableOpacity onPress={showImageOptions} style={styles.imageContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Text style={styles.placeholderText}>
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </Text>
              </View>
            )}
            <View style={styles.editBadge}>
              <Text style={styles.editIcon}>✏️</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <Text style={styles.userPhone}>{user?.phone}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>●</Text>
              <Text style={styles.statLabel}>{isConnected ? 'Online' : 'Offline'}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>✓</Text>
              <Text style={styles.statLabel}>Verified</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          
          <MenuItem
            icon="👤"
            title="Edit Profile"
            subtitle="Update your personal information"
            onPress={() => setShowEditModal(true)}
          />

          <MenuItem
            icon="🔐"
            title="Change Password"
            subtitle="Update your password"
            onPress={() => setShowPasswordModal(true)}
          />

          <MenuItem
            icon="📧"
            title="Email Preferences"
            subtitle="Manage email communications"
            onPress={() => Alert.alert('Coming Soon', 'This feature is coming soon')}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Settings</Text>

          <MenuItem
            icon="🔔"
            title="Push Notifications"
            type="switch"
            value={settings.pushNotifications}
            onPress={() => toggleSetting('pushNotifications')}
          />

          <MenuItem
            icon="📧"
            title="Email Notifications"
            type="switch"
            value={settings.emailNotifications}
            onPress={() => toggleSetting('emailNotifications')}
          />

          <MenuItem
            icon="📱"
            title="SMS Notifications"
            type="switch"
            value={settings.smsNotifications}
            onPress={() => toggleSetting('smsNotifications')}
          />

          <MenuItem
            icon="🔊"
            title="Sound Alerts"
            type="switch"
            value={settings.soundAlerts}
            onPress={() => toggleSetting('soundAlerts')}
          />

          {/* ✅ TEST NOTIFICATION BUTTON - Only show if token exists */}
          {pushToken && (
            <MenuItem
              icon="📱"
              title="Test Notification"
              subtitle="Send a test push notification"
              onPress={handleTestNotification}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>

          <MenuItem
            icon="📍"
            title="Location Sharing"
            subtitle="Allow location for bus tracking"
            type="switch"
            value={settings.locationSharing}
            onPress={() => toggleSetting('locationSharing')}
          />

          <MenuItem
            icon="🌙"
            title="Dark Mode"
            type="switch"
            value={settings.darkMode}
            onPress={() => toggleSetting('darkMode')}
          />

          <MenuItem
            icon="🔄"
            title="Auto Refresh"
            type="switch"
            value={settings.autoRefresh}
            onPress={() => toggleSetting('autoRefresh')}
          />

          <MenuItem
            icon="🗑️"
            title="Clear Cache"
            subtitle="Free up storage space"
            onPress={() => {
              cache.clearAll();
              Alert.alert('Cache Cleared', 'App cache has been cleared');
            }}
            value="128 MB"
            type="value"
          />

          <MenuItem
            icon="ℹ️"
            title="App Version"
            value="1.0.0"
            type="value"
            onPress={() => {}}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>

          <MenuItem
            icon="❓"
            title="Help Center"
            subtitle="Get help with the app"
            onPress={() => Alert.alert('Help Center', 'Coming soon')}
          />

          <MenuItem
            icon="💬"
            title="Contact Support"
            subtitle="Send us a message"
            onPress={() => Alert.alert('Contact Support', 'support@smartschool.com')}
          />

          <MenuItem
            icon="📄"
            title="Terms of Service"
            onPress={() => Alert.alert('Terms of Service', 'Coming soon')}
          />

          <MenuItem
            icon="🔒"
            title="Privacy Policy"
            onPress={() => Alert.alert('Privacy Policy', 'Coming soon')}
          />
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
            <Text style={styles.deleteText}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.copyright}>
          © 2026 Smart School Transport. All rights reserved.
        </Text>
      </ScrollView>

      <EditProfileModal
        visible={showEditModal}
        user={user}
        onSave={handleUpdateProfile}
        onClose={() => setShowEditModal(false)}
      />

      <ChangePasswordModal
        visible={showPasswordModal}
        onSave={handleChangePassword}
        onClose={() => setShowPasswordModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 24, color: '#fff' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  profileCard: { backgroundColor: '#fff', margin: 20, marginTop: -30, padding: 20, borderRadius: 15, alignItems: 'center', elevation: 4 },
  imageContainer: { position: 'relative', marginTop: -40, marginBottom: 10 },
  profileImage: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: '#fff' },
  profileImagePlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  placeholderText: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.secondary, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  editIcon: { fontSize: 14 },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  userEmail: { fontSize: 14, color: '#666', marginBottom: 2 },
  userPhone: { fontSize: 14, color: '#666', marginBottom: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  statItem: { alignItems: 'center', paddingHorizontal: 20 },
  statNumber: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  statLabel: { fontSize: 11, color: '#666', marginTop: 2 },
  statDivider: { width: 1, height: 20, backgroundColor: '#f0f0f0' },
  section: { backgroundColor: '#fff', marginHorizontal: 15, marginBottom: 15, paddingVertical: 10, borderRadius: 10, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  menuIcon: { fontSize: 20, width: 35 },
  menuContent: { flex: 1 },
  menuTitle: { fontSize: 14, fontWeight: '500', color: '#333' },
  menuSubtitle: { fontSize: 11, color: '#999', marginTop: 2 },
  menuArrow: { fontSize: 18, color: '#999' },
  menuValue: { fontSize: 14, color: '#666' },
  actionButtons: { marginHorizontal: 15, marginBottom: 15 },
  logoutButton: { backgroundColor: '#fff', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#f44336' },
  logoutText: { color: '#f44336', fontSize: 16, fontWeight: '600' },
  deleteButton: { backgroundColor: '#fff', paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#999' },
  deleteText: { color: '#666', fontSize: 14, fontWeight: '500' },
  copyright: { textAlign: 'center', color: '#999', fontSize: 11, marginBottom: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  modalClose: { fontSize: 20, color: '#999', padding: 5 },
  modalBody: { padding: 20 },
  inputContainer: { marginBottom: 15 },
  inputLabel: { fontSize: 13, color: '#666', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 14, backgroundColor: '#f9f9f9' },
  saveButton: { height: 48, borderRadius: 8, overflow: 'hidden', marginTop: 10, marginBottom: 20 },
  gradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});