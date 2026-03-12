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
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import { getImageUrl } from '../../utils/imageUtils';

const MenuItem = ({ icon, title, subtitle, onPress, value, type = 'arrow', colors }) => (
  <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={onPress}>
    <Text style={[styles.menuIcon, { color: colors.text }]}>{icon}</Text>
    <View style={styles.menuContent}>
      <Text style={[styles.menuTitle, { color: colors.text }]}>{title}</Text>
      {subtitle && <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
    </View>
    {type === 'arrow' && <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>}
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

export default function ProfileScreen({ navigation }) {
  const { driver, logout } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [settings, setSettings] = useState({
    soundAlerts: true,
    voiceNavigation: true,
    offlineMode: true,
    autoStartTrips: false,
  });

  useEffect(() => {
    loadProfileImage();
    loadSettings();
  }, []);

  const loadProfileImage = async () => {
    try {
      if (driver?.profileImage) {
        setProfileImage(driver.profileImage);
      } else {
        const savedImage = await AsyncStorage.getItem(`@driver_profile_image_${driver?.id}`);
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
      const savedSettings = await AsyncStorage.getItem(`@driver_settings_${driver?.id}`);
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem(`@driver_settings_${driver?.id}`, JSON.stringify(newSettings));
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
        name: `driver_${driver?.id}_${Date.now()}.jpg`,
      });
      
      // Use the correct API endpoint
      const response = await fetch(`${api.baseURL}/user/profile/photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await AsyncStorage.getItem('@auth_token')}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });
      
      if (response.ok) {
        const data = await response.json();
        setProfileImage(data.photoUrl);
        await AsyncStorage.setItem(`@driver_profile_image_${driver?.id}`, data.photoUrl);
        Alert.alert('Success', 'Profile picture updated');
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to upload photo');
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
        {/* Profile Card with Fixed Image Display */}
        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={showImageOptions} style={styles.imageContainer}>
            {profileImage ? (
              <Image 
                source={{ uri: getImageUrl(profileImage) }} 
                style={styles.profileImage} 
              />
            ) : (
              <View style={[styles.profileImagePlaceholder, { backgroundColor: colors.primary }]}>
                <Text style={styles.placeholderText}>
                  {driver?.firstName?.charAt(0)}{driver?.lastName?.charAt(0)}
                </Text>
              </View>
            )}
            <View style={[styles.editBadge, { backgroundColor: colors.secondary }]}>
              <Text style={styles.editIcon}>✏️</Text>
            </View>
          </TouchableOpacity>

          <Text style={[styles.driverName, { color: colors.text }]}>
            {driver?.firstName} {driver?.lastName}
          </Text>
          <Text style={[styles.driverEmail, { color: colors.textSecondary }]}>{driver?.email}</Text>
          <Text style={[styles.driverPhone, { color: colors.textSecondary }]}>{driver?.phone}</Text>

          <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>124</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Trips</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>4.8</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rating</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>0</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Incidents</Text>
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, borderBottomColor: colors.border }]}>
            Trip Settings
          </Text>

          <MenuItem
            icon="🚦"
            title="Auto-start trips"
            type="switch"
            value={settings.autoStartTrips}
            onPress={() => toggleSetting('autoStartTrips')}
            colors={colors}
          />

          <MenuItem
            icon="🔊"
            title="Sound alerts"
            type="switch"
            value={settings.soundAlerts}
            onPress={() => toggleSetting('soundAlerts')}
            colors={colors}
          />

          <MenuItem
            icon="🗣️"
            title="Voice navigation"
            type="switch"
            value={settings.voiceNavigation}
            onPress={() => toggleSetting('voiceNavigation')}
            colors={colors}
          />

          <MenuItem
            icon="📱"
            title="Offline mode"
            type="switch"
            value={settings.offlineMode}
            onPress={() => toggleSetting('offlineMode')}
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
            icon="📞"
            title="Contact Dispatch"
            subtitle="Get immediate assistance"
            onPress={() => navigation.navigate('ContactDispatch')}
            colors={colors}
          />
        </View>

        <TouchableOpacity style={[styles.logoutButton, { borderColor: colors.danger }]} onPress={handleLogout}>
          <Text style={[styles.logoutText, { color: colors.danger }]}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    paddingTop: 45, 
    paddingBottom: 15, 
    paddingHorizontal: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 24, color: '#fff' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  // Fixed margins for profile card
  profileCard: { 
    margin: 20, 
    marginTop: 10, // Changed from -20 to 10
    padding: 20, 
    borderRadius: 15, 
    alignItems: 'center', 
    elevation: 4 
  },
  imageContainer: { 
    position: 'relative', 
    marginTop: 0, // Removed negative margin
    marginBottom: 15 
  },
  profileImage: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#fff' },
  profileImagePlaceholder: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  placeholderText: { fontSize: 48, fontWeight: 'bold', color: '#fff' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  editIcon: { fontSize: 18 },
  driverName: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  driverEmail: { fontSize: 14, marginBottom: 2 },
  driverPhone: { fontSize: 14, marginBottom: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingTop: 15, borderTopWidth: 1, width: '100%' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, height: 30 },
  section: { marginHorizontal: 15, marginBottom: 15, paddingVertical: 10, borderRadius: 10, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '600', paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 1 },
  menuIcon: { fontSize: 20, width: 35 },
  menuContent: { flex: 1 },
  menuTitle: { fontSize: 14, fontWeight: '500' },
  menuSubtitle: { fontSize: 11, marginTop: 2 },
  menuArrow: { fontSize: 18 },
  logoutButton: { marginHorizontal: 15, marginBottom: 30, paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  logoutText: { fontSize: 16, fontWeight: '600' },
});