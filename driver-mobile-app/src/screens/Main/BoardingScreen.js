import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
} from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import api from '../../services/api';
import { COLORS } from '../../constants/config';

export default function BoardingScreen({ route, navigation }) {
  const { trip } = route.params;
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [student, setStudent] = useState(null);
  const [torchOn, setTorchOn] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned || !scanning) return;

    setScanned(true);
    Vibration.vibrate();
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      // Parse student ID from QR code
      const studentId = data.replace('STU-', '');
      
      const response = await api.get(`/driver/student/${studentId}`);
      setStudent(response.data);

      // Show confirmation dialog
      Alert.alert(
        'Student Found',
        `${response.data.firstName} ${response.data.lastName}\nClass: ${response.data.classLevel}`,
        [
          {
            text: 'Cancel',
            onPress: () => {
              setScanned(false);
              setStudent(null);
            },
            style: 'cancel',
          },
          {
            text: 'Confirm Boarding',
            onPress: async () => {
              await confirmBoarding(response.data.id);
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Student not found or invalid QR code');
      setScanned(false);
    }
  };

  const confirmBoarding = async (studentId) => {
    try {
      await api.post(`/driver/student/${studentId}/board`, {
        tripId: trip.id,
        timestamp: new Date().toISOString(),
        method: 'qr',
      });

      Alert.alert('Success', 'Student boarded successfully');
      setScanned(false);
      setStudent(null);
      
      // Optional: Go back to trip screen
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to record boarding');
      setScanned(false);
    }
  };

  const handleManualEntry = () => {
    Alert.prompt(
      'Manual Entry',
      'Enter Student ID:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Find Student',
          onPress: async (studentId) => {
            try {
              const response = await api.get(`/driver/student/${studentId}`);
              setStudent(response.data);
              // Proceed with boarding confirmation
            } catch (error) {
              Alert.alert('Error', 'Student not found');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const toggleTorch = () => {
    setTorchOn(!torchOn);
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text>Requesting camera permission...</Text></View>;
  }

  if (hasPermission === false) {
    return <View style={styles.container}><Text>No access to camera</Text></View>;
  }

  return (
    <View style={styles.container}>
      <BarCodeScanner
        ref={scannerRef}
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
        torchMode={torchOn ? 'on' : 'off'}
      />

      {/* Scanner Overlay */}
      <View style={styles.overlay}>
        <View style={styles.scanArea}>
          <View style={styles.cornerTL} />
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
          <View style={styles.cornerBR} />
        </View>
      </View>

      {/* Header */}
      <LinearGradient colors={['rgba(0,0,0,0.7)', 'transparent']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Student QR</Text>
        <TouchableOpacity onPress={toggleTorch} style={styles.torchButton}>
          <Text style={styles.torchIcon}>{torchOn ? '🔦' : '⚪'}</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>Position QR code within the frame</Text>
      </View>

      {/* Manual Entry Button */}
      <TouchableOpacity style={styles.manualButton} onPress={handleManualEntry}>
        <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.manualGradient}>
          <Text style={styles.manualText}>Enter ID Manually</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Recent Scan Result */}
      {student && (
        <View style={styles.resultCard}>
          <Text style={styles.resultName}>{student.firstName} {student.lastName}</Text>
          <Text style={styles.resultClass}>{student.classLevel}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  scanArea: { width: 250, height: 250, position: 'relative' },
  cornerTL: { position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderTopWidth: 3, borderLeftWidth: 3, borderColor: '#fff' },
  cornerTR: { position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderTopWidth: 3, borderRightWidth: 3, borderColor: '#fff' },
  cornerBL: { position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: '#fff' },
  cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderBottomWidth: 3, borderRightWidth: 3, borderColor: '#fff' },
  header: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 50, paddingHorizontal: 20, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 24, color: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  torchButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  torchIcon: { fontSize: 20 },
  instructions: { position: 'absolute', top: 120, left: 0, right: 0, alignItems: 'center' },
  instructionText: { color: '#fff', fontSize: 14, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  manualButton: { position: 'absolute', bottom: 50, left: 20, right: 20, borderRadius: 10, overflow: 'hidden' },
  manualGradient: { paddingVertical: 15, alignItems: 'center' },
  manualText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  resultCard: { position: 'absolute', top: 200, left: 20, right: 20, backgroundColor: '#fff', padding: 15, borderRadius: 10, alignItems: 'center' },
  resultName: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  resultClass: { fontSize: 14, color: '#666' },
});