import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
  ActivityIndicator,
} from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { COLORS } from '../../constants/config';

export default function BoardingScreen({ route, navigation }) {
  const { trip } = route.params;
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [student, setStudent] = useState(null);
  const [torchOn, setTorchOn] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const scannerRef = useRef(null);

  // Load offline queue and check network status
  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
      
      // Load offline queue
      await loadOfflineQueue();
      
      // Check network status
      const netInfo = await NetInfo.fetch();
      setIsOnline(netInfo.isConnected);
      
      // Listen for network changes
      const unsubscribe = NetInfo.addEventListener(state => {
        setIsOnline(state.isConnected);
        if (state.isConnected && offlineQueue.length > 0) {
          syncOfflineQueue();
        }
      });
      
      return () => unsubscribe();
    })();
  }, []);

  // Load offline queue from AsyncStorage
  const loadOfflineQueue = async () => {
    try {
      const queue = await AsyncStorage.getItem('@offline_boarding_queue');
      if (queue) {
        setOfflineQueue(JSON.parse(queue));
      }
    } catch (error) {
      console.error('Error loading offline queue:', error);
    }
  };

  // Save to offline queue
  const saveToOfflineQueue = async (studentId, scanData) => {
    try {
      const queueItem = {
        studentId,
        tripId: trip.id,
        timestamp: new Date().toISOString(),
        method: 'qr',
        scanData,
        synced: false,
        retryCount: 0
      };
      
      const updatedQueue = [...offlineQueue, queueItem];
      await AsyncStorage.setItem('@offline_boarding_queue', JSON.stringify(updatedQueue));
      setOfflineQueue(updatedQueue);
      
      Alert.alert(
        '📱 Offline Mode',
        `Student scan saved locally. ${updatedQueue.length} scan(s) waiting to sync.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error saving to offline queue:', error);
    }
  };

  // Sync offline queue
  const syncOfflineQueue = async () => {
    if (offlineQueue.length === 0 || !isOnline) return;
    
    setIsProcessing(true);
    try {
      const queue = [...offlineQueue];
      const syncedItems = [];
      const failedItems = [];

      for (const item of queue) {
        if (item.synced) {
          syncedItems.push(item);
          continue;
        }

        try {
          // ✅ FIXED: Use correct endpoint
          await api.trip.boardStudent(
            item.tripId,
            item.studentId,
            'qr'
          );
          
          item.synced = true;
          syncedItems.push(item);
        } catch (error) {
          item.retryCount = (item.retryCount || 0) + 1;
          if (item.retryCount < 3) {
            failedItems.push(item);
          } else {
            syncedItems.push({ ...item, failed: true });
          }
        }
      }

      const newQueue = [
        ...failedItems,
        ...queue.filter(item => !item.synced && item.retryCount < 3)
      ];
      
      await AsyncStorage.setItem('@offline_boarding_queue', JSON.stringify(newQueue));
      setOfflineQueue(newQueue);

      if (syncedItems.length > 0) {
        Alert.alert(
          '✅ Sync Complete',
          `${syncedItems.length} scan(s) synced successfully.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error syncing offline queue:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned || !scanning || isProcessing || !trip?.id) return;

    setScanned(true);
    Vibration.vibrate();
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      // Parse student ID from QR code
      let studentId = data;
      let scanData = { raw: data };
      
      try {
        const parsed = JSON.parse(data);
        studentId = parsed.studentId || parsed.id || data;
        scanData = parsed;
      } catch (e) {
        studentId = data.replace('STU-', '').replace('STD-', '');
      }

      if (!isOnline) {
        await saveToOfflineQueue(studentId, scanData);
        
        setStudent({
          id: studentId,
          firstName: 'Offline Scan',
          lastName: '',
          classLevel: 'Saved locally'
        });
        
        setTimeout(() => {
          setScanned(false);
          setStudent(null);
        }, 2000);
        
        return;
      }

      setIsProcessing(true);
      
      // ✅ FIXED: Use the correct boardStudent method
      const result = await api.trip.boardStudent(
        trip.id,
        studentId,
        'qr'
      );
      
      if (result.success || result.data?.success) {
        Alert.alert(
          '✅ Success',
          'Student boarded successfully',
          [
            { 
              text: 'OK', 
              onPress: () => {
                setScanned(false);
                setStudent(null);
                setIsProcessing(false);
              }
            }
          ]
        );
      } else {
        throw new Error(result.message || 'Failed to board student');
      }
      
    } catch (error) {
      console.error('Error boarding student:', error);
      
      if (!isOnline) {
        const studentId = data.replace('STU-', '').replace('STD-', '');
        await saveToOfflineQueue(studentId, { raw: data });
        Alert.alert(
          '📱 Offline Mode',
          'Network unavailable. Scan saved for later sync.',
          [{ text: 'OK', onPress: () => setScanned(false) }]
        );
      } else {
        Alert.alert('❌ Error', error.message || 'Failed to record boarding');
        setScanned(false);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualEntry = () => {
    Alert.prompt(
      'Manual Entry',
      'Enter Student ID:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Board Student',
          onPress: async (studentId) => {
            if (!studentId || !trip?.id) return;
            
            try {
              setIsProcessing(true);
              const result = await api.trip.boardStudent(
                trip.id,
                studentId,
                'manual'
              );
              
              if (result.success || result.data?.success) {
                Alert.alert('✅ Success', 'Student boarded successfully');
              } else {
                Alert.alert('Error', result.message || 'Failed to board student');
              }
            } catch (error) {
              Alert.alert('Error', 'Student not found or invalid ID');
            } finally {
              setIsProcessing(false);
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
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera-off" size={50} color="#999" />
        <Text style={styles.errorText}>No access to camera</Text>
        <TouchableOpacity 
          style={styles.permissionButton}
          onPress={() => BarCodeScanner.requestPermissionsAsync()}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BarCodeScanner
        ref={scannerRef}
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
        torchMode={torchOn ? 'on' : 'off'}
      />

      {!isOnline && (
        <View style={styles.offlineBar}>
          <Ionicons name="cloud-offline" size={20} color="#fff" />
          <Text style={styles.offlineBarText}>Offline Mode - Scans saved locally</Text>
        </View>
      )}

      <View style={styles.overlay}>
        <View style={styles.scanArea}>
          <View style={styles.cornerTL} />
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
          <View style={styles.cornerBR} />
        </View>
      </View>

      <LinearGradient colors={['rgba(0,0,0,0.7)', 'transparent']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Student QR</Text>
        <View style={styles.headerRight}>
          {offlineQueue.length > 0 && (
            <TouchableOpacity 
              onPress={syncOfflineQueue} 
              style={styles.syncButton}
              disabled={!isOnline || isProcessing}
            >
              <Ionicons 
                name="sync" 
                size={24} 
                color={isOnline ? COLORS.primary : '#999'} 
              />
              {offlineQueue.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{offlineQueue.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={toggleTorch} style={styles.torchButton}>
            <Ionicons 
              name={torchOn ? "flash" : "flash-off"} 
              size={24} 
              color="#fff" 
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.instructions}>
        <Text style={styles.instructionText}>Position QR code within the frame</Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.manualButton} 
          onPress={handleManualEntry}
          disabled={isProcessing}
        >
          <LinearGradient 
            colors={[COLORS.primary, COLORS.secondary]} 
            style={styles.buttonGradient}
          >
            <Ionicons name="keypad" size={20} color="#fff" />
            <Text style={styles.buttonText}>Enter ID Manually</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.processingText}>Processing...</Text>
        </View>
      )}

      {student && (
        <View style={styles.resultCard}>
          <Ionicons 
            name={student.id ? "checkmark-circle" : "time"} 
            size={24} 
            color={student.id ? "#4CAF50" : "#FF9800"} 
          />
          <View style={styles.resultInfo}>
            <Text style={styles.resultName}>
              {student.firstName} {student.lastName}
            </Text>
            <Text style={styles.resultClass}>{student.classLevel}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    color: '#fff',
    fontSize: 16
  },
  errorText: {
    marginTop: 10,
    color: '#f44336',
    fontSize: 16
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 20
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  offlineBar: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: '#FF9800',
    padding: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    zIndex: 10
  },
  offlineBarText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  scanArea: { 
    width: 250, 
    height: 250, 
    position: 'relative' 
  },
  cornerTL: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    width: 40, 
    height: 40, 
    borderTopWidth: 3, 
    borderLeftWidth: 3, 
    borderColor: '#fff' 
  },
  cornerTR: { 
    position: 'absolute', 
    top: 0, 
    right: 0, 
    width: 40, 
    height: 40, 
    borderTopWidth: 3, 
    borderRightWidth: 3, 
    borderColor: '#fff' 
  },
  cornerBL: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    width: 40, 
    height: 40, 
    borderBottomWidth: 3, 
    borderLeftWidth: 3, 
    borderColor: '#fff' 
  },
  cornerBR: { 
    position: 'absolute', 
    bottom: 0, 
    right: 0, 
    width: 40, 
    height: 40, 
    borderBottomWidth: 3, 
    borderRightWidth: 3, 
    borderColor: '#fff' 
  },
  header: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    paddingTop: 50, 
    paddingHorizontal: 20, 
    paddingBottom: 20, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    zIndex: 10
  },
  backButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.3)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#fff' 
  },
  headerRight: {
    flexDirection: 'row',
    gap: 10
  },
  syncButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#f44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  torchButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.3)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  instructions: { 
    position: 'absolute', 
    top: 120, 
    left: 0, 
    right: 0, 
    alignItems: 'center',
    zIndex: 10
  },
  instructionText: { 
    color: '#fff', 
    fontSize: 14, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    paddingHorizontal: 20, 
    paddingVertical: 8, 
    borderRadius: 20 
  },
  actionButtons: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    gap: 10,
    zIndex: 10
  },
  manualButton: { 
    borderRadius: 10, 
    overflow: 'hidden' 
  },
  buttonGradient: { 
    paddingVertical: 15, 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10
  },
  buttonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20
  },
  processingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10
  },
  resultCard: { 
    position: 'absolute', 
    top: 200, 
    left: 20, 
    right: 20, 
    backgroundColor: '#fff', 
    padding: 15, 
    borderRadius: 10, 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    zIndex: 10
  },
  resultInfo: {
    flex: 1
  },
  resultName: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#333', 
    marginBottom: 2 
  },
  resultClass: { 
    fontSize: 14, 
    color: '#666' 
  },
});