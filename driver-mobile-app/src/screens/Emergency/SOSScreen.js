import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
  Linking,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import api from '../../services/api';
import { COLORS } from '../../constants/config';

export default function SOSScreen({ route, navigation }) {
  const { trip } = route.params;
  const [countdown, setCountdown] = useState(10);
  const [sending, setSending] = useState(false);
  const [location, setLocation] = useState(null);
  const [emergencyContacts, setEmergencyContacts] = useState([
    { name: 'School Admin', phone: '+254700000001' },
    { name: 'Fleet Manager', phone: '+254700000002' },
    { name: 'Emergency Services', phone: '112' },
  ]);

  useEffect(() => {
    getLocation();
    
    // Start countdown
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          sendEmergencyAlert();
          return 0;
        }
        Vibration.vibrate(100);
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setLocation(location.coords);
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const sendEmergencyAlert = async () => {
    setSending(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    try {
      await api.post('/driver/emergency', {
        tripId: trip.id,
        type: 'SOS',
        location: location ? {
          lat: location.latitude,
          lng: location.longitude,
        } : null,
        timestamp: new Date().toISOString(),
      });

      Alert.alert(
        '🚨 EMERGENCY ALERT SENT',
        'Help is on the way. Stay calm and wait for assistance.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send emergency alert. Call emergency services directly.');
    } finally {
      setSending(false);
    }
  };

  const cancelSOS = () => {
    Alert.alert(
      'Cancel SOS',
      'Are you sure you want to cancel the emergency alert?',
      [
        { text: 'Yes, Cancel', onPress: () => navigation.goBack(), style: 'cancel' },
        { text: 'No, Continue', style: 'destructive' },
      ]
    );
  };

  const callContact = (phone) => {
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#f44336', '#d32f2f']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>🚨 EMERGENCY SOS</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Countdown */}
        <View style={styles.countdownContainer}>
          <Text style={styles.countdownLabel}>Sending alert in</Text>
          <Text style={styles.countdownNumber}>{countdown}</Text>
          <Text style={styles.countdownUnit}>seconds</Text>
        </View>

        {/* Warning Message */}
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>⚠️ Emergency Procedure</Text>
          <Text style={styles.warningText}>
            1. Stay calm and assess the situation{'\n'}
            2. Ensure student safety first{'\n'}
            3. Wait for emergency responders{'\n'}
            4. Do not leave the vehicle
          </Text>
        </View>

        {/* Emergency Contacts */}
        <Text style={styles.contactsTitle}>Emergency Contacts</Text>
        {emergencyContacts.map((contact, index) => (
          <TouchableOpacity
            key={index}
            style={styles.contactButton}
            onPress={() => callContact(contact.phone)}
          >
            <Text style={styles.contactName}>{contact.name}</Text>
            <Text style={styles.contactPhone}>{contact.phone}</Text>
            <Text style={styles.callIcon}>📞</Text>
          </TouchableOpacity>
        ))}

        {/* Cancel Button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={cancelSOS}
          disabled={sending}
        >
          <Text style={styles.cancelText}>CANCEL SOS</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingTop: 50, paddingBottom: 20, alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  content: { flex: 1, padding: 20 },
  countdownContainer: { alignItems: 'center', marginVertical: 30 },
  countdownLabel: { fontSize: 16, color: '#666', marginBottom: 10 },
  countdownNumber: { fontSize: 72, fontWeight: 'bold', color: '#f44336' },
  countdownUnit: { fontSize: 14, color: '#666' },
  warningCard: { backgroundColor: '#fff3e0', padding: 20, borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: '#ffe0b2' },
  warningTitle: { fontSize: 18, fontWeight: 'bold', color: '#f57c00', marginBottom: 10 },
  warningText: { fontSize: 14, color: '#666', lineHeight: 22 },
  contactsTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 10 },
  contactButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', padding: 15, borderRadius: 8, marginBottom: 8 },
  contactName: { flex: 1, fontSize: 14, fontWeight: '500', color: '#333' },
  contactPhone: { fontSize: 14, color: '#666', marginRight: 10 },
  callIcon: { fontSize: 20, color: COLORS.primary },
  cancelButton: { backgroundColor: '#f44336', marginTop: 20, padding: 15, borderRadius: 8, alignItems: 'center' },
  cancelText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});