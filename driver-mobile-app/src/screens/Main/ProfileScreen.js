import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { COLORS } from '../../constants/config';

export default function ProfileScreen({ navigation }) {
  const { driver, logout } = useAuth();
  const [settings, setSettings] = useState({
    autoStartTrip: true,
    soundAlerts: true,
    voiceNavigation: true,
    offlineMode: false,
  });

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

  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const MenuItem = ({ icon, title, value, type = 'arrow', onPress }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={styles.menuTitle}>{title}</Text>
      {type === 'arrow' && <Text style={styles.menuArrow}>›</Text>}
      {type === 'switch' && (
        <Switch
          value={value}
          onValueChange={onPress}
          trackColor={{ false: '#ddd', true: COLORS.primary }}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Profile</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView>
        {/* Driver Info Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {driver?.firstName?.charAt(0)}{driver?.lastName?.charAt(0)}
            </Text>
          </View>
          <Text style={styles.driverName}>{driver?.firstName} {driver?.lastName}</Text>
          <Text style={styles.driverEmail}>{driver?.email}</Text>
          <Text style={styles.driverPhone}>{driver?.phone}</Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>124</Text>
              <Text style={styles.statLabel}>Trips</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>4.8</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Incidents</Text>
            </View>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trip Settings</Text>
          <MenuItem
            icon="▶️"
            title="Auto-start trips"
            type="switch"
            value={settings.autoStartTrip}
            onPress={() => toggleSetting('autoStartTrip')}
          />
          <MenuItem
            icon="🔊"
            title="Sound alerts"
            type="switch"
            value={settings.soundAlerts}
            onPress={() => toggleSetting('soundAlerts')}
          />
          <MenuItem
            icon="🗣️"
            title="Voice navigation"
            type="switch"
            value={settings.voiceNavigation}
            onPress={() => toggleSetting('voiceNavigation')}
          />
          <MenuItem
            icon="📴"
            title="Offline mode"
            type="switch"
            value={settings.offlineMode}
            onPress={() => toggleSetting('offlineMode')}
          />
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <MenuItem
            icon="❓"
            title="Help Center"
            onPress={() => Alert.alert('Help Center', 'Coming soon')}
          />
          <MenuItem
            icon="📞"
            title="Contact Dispatch"
            onPress={() => Alert.alert('Call', 'Calling dispatch...')}
          />
          <MenuItem
            icon="ℹ️"
            title="App Version"
            value="1.0.0"
            type="value"
            onPress={() => {}}
          />
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
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
  avatarContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginTop: -40, marginBottom: 10, borderWidth: 3, borderColor: '#fff' },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  driverName: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  driverEmail: { fontSize: 14, color: '#666', marginBottom: 2 },
  driverPhone: { fontSize: 14, color: '#666', marginBottom: 15 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', paddingTop: 15, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },
  statLabel: { fontSize: 12, color: '#666', marginTop: 2 },
  statDivider: { width: 1, height: '100%', backgroundColor: '#f0f0f0' },
  section: { backgroundColor: '#fff', marginHorizontal: 15, marginBottom: 15, borderRadius: 10, overflow: 'hidden', elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', padding: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  menuIcon: { fontSize: 20, width: 40 },
  menuTitle: { flex: 1, fontSize: 14, color: '#333' },
  menuArrow: { fontSize: 18, color: '#999' },
  logoutButton: { backgroundColor: '#f44336', margin: 15, padding: 15, borderRadius: 8, alignItems: 'center' },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});