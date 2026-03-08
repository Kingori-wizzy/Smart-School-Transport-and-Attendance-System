import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Vibration,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Dimensions,
  ScrollView
} from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useTrip } from '../../context/TripContext';
import api from '../../services/api';
import { COLORS } from '../../constants/config';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const QRScanScreen = ({ navigation, route }) => {
  const { currentTrip } = useTrip();
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [lastScan, setLastScan] = useState(null);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [showMap, setShowMap] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [scanMode, setScanMode] = useState('boarding');
  const [isOnline, setIsOnline] = useState(true);
  const [studentInfo, setStudentInfo] = useState(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  
  const mapRef = useRef(null);
  const scanTimeout = useRef(null);
  const locationSubscription = useRef(null);

  const tripId = route.params?.tripId || currentTrip?._id;

  useEffect(() => {
    (async () => {
      const cameraStatus = await BarCodeScanner.requestPermissionsAsync();
      const locationStatus = await Location.requestForegroundPermissionsAsync();
      
      setHasPermission(cameraStatus.status === 'granted' && locationStatus.status === 'granted');
      
      startLocationTracking();
      loadOfflineQueue();
      checkNetworkStatus();
      
      // Listen for network changes
      const unsubscribe = NetInfo.addEventListener(state => {
        setIsOnline(state.isConnected);
        if (state.isConnected && offlineQueue.length > 0) {
          syncOfflineQueue();
        }
      });
      
      return () => unsubscribe();
    })();

    return () => {
      if (scanTimeout.current) clearTimeout(scanTimeout.current);
      if (locationSubscription.current) locationSubscription.current.remove();
    };
  }, []);

  const checkNetworkStatus = async () => {
    const state = await NetInfo.fetch();
    setIsOnline(state.isConnected);
  };

  const startLocationTracking = async () => {
    try {
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10,
          timeInterval: 5000
        },
        (location) => {
          setCurrentLocation({
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            accuracy: location.coords.accuracy,
            heading: location.coords.heading
          });
        }
      );
    } catch (error) {
      console.error('Location tracking error:', error);
    }
  };

  const loadOfflineQueue = async () => {
    try {
      const queue = await AsyncStorage.getItem('@offline_scans');
      if (queue) {
        setOfflineQueue(JSON.parse(queue));
      }
    } catch (error) {
      console.error('Error loading offline queue:', error);
    }
  };

  const saveToOfflineQueue = async (scanData) => {
    try {
      const updatedQueue = [...offlineQueue, { 
        ...scanData, 
        queuedAt: new Date().toISOString(),
        retryCount: 0 
      }];
      await AsyncStorage.setItem('@offline_scans', JSON.stringify(updatedQueue));
      setOfflineQueue(updatedQueue);
    } catch (error) {
      console.error('Error saving to offline queue:', error);
    }
  };

  const syncOfflineQueue = async () => {
    if (offlineQueue.length === 0 || !isOnline) return;

    Alert.alert(
      'Sync Offline Data',
      `You have ${offlineQueue.length} scans to sync.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sync Now',
          onPress: async () => {
            try {
              const response = await api.post('/attendance/driver/sync-offline', {
                scans: offlineQueue,
                deviceId: await getDeviceId()
              });
              
              if (response.data.success) {
                await AsyncStorage.removeItem('@offline_scans');
                setOfflineQueue([]);
                Alert.alert('✅ Success', `${offlineQueue.length} scans synced successfully`);
              }
            } catch (error) {
              Alert.alert('❌ Error', 'Failed to sync scans. Will retry automatically.');
            }
          }
        }
      ]
    );
  };

  const getDeviceId = async () => {
    let deviceId = await AsyncStorage.getItem('@device_id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem('@device_id', deviceId);
    }
    return deviceId;
  };

  const fetchStudentInfo = async (studentId) => {
    try {
      const response = await api.get(`/students/${studentId}`);
      setStudentInfo(response.data);
      setShowStudentModal(true);
    } catch (error) {
      console.error('Error fetching student info:', error);
    }
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    if (!scanning || scanned || !tripId) return;
    
    setScanned(true);
    setScanning(false);
    
    Vibration.vibrate(100);

    try {
      // Parse QR data
      let studentId = data;
      let qrData = {};
      
      try {
        qrData = JSON.parse(data);
        studentId = qrData.studentId || qrData.id || data;
      } catch (e) {
        // Not JSON, use raw data
      }

      // Get current location
      let location = null;
      if (currentLocation) {
        location = {
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          accuracy: currentLocation.accuracy
        };
      }

      const scanData = {
        studentId,
        tripId: tripId,
        method: 'qr',
        timestamp: new Date().toISOString(),
        location,
        deviceId: await getDeviceId(),
        metadata: {
          scanMode,
          qrData
        }
      };

      // Try online first
      if (isOnline) {
        try {
          const endpoint = scanMode === 'boarding' 
            ? `/attendance/driver/trip/${tripId}/board/${studentId}`
            : `/attendance/driver/trip/${tripId}/alight/${studentId}`;
          
          const response = await api.post(endpoint, scanData);
          
          setLastScan({
            studentId,
            studentName: response.data.data?.studentName || studentId,
            time: new Date().toLocaleTimeString(),
            mode: scanMode,
            success: true,
            online: true
          });

          // Fetch student info for display
          await fetchStudentInfo(studentId);

          Alert.alert(
            '✅ Scan Successful',
            `${scanMode === 'boarding' ? 'Boarding' : 'Alighting'} recorded for student`,
            [{ text: 'OK' }]
          );
        } catch (error) {
          if (error.response?.status === 409) {
            // Duplicate scan
            Alert.alert(
              '⚠️ Duplicate Scan',
              'This student has already been scanned recently',
              [{ text: 'OK' }]
            );
          } else {
            // Other error - save offline
            await saveToOfflineQueue(scanData);
            
            setLastScan({
              studentId,
              time: new Date().toLocaleTimeString(),
              mode: scanMode,
              success: true,
              offline: true
            });

            Alert.alert(
              '📱 Offline Mode',
              `Scan saved locally. ${offlineQueue.length + 1} scans waiting to sync.`,
              [{ text: 'OK' }]
            );
          }
        }
      } else {
        // Offline - save to queue
        await saveToOfflineQueue(scanData);
        
        setLastScan({
          studentId,
          time: new Date().toLocaleTimeString(),
          mode: scanMode,
          success: true,
          offline: true
        });

        Alert.alert(
          '📱 Offline Mode',
          `Scan saved locally. ${offlineQueue.length + 1} scans waiting to sync.`,
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      Alert.alert('❌ Scan Failed', error.message);
    }

    // Allow next scan after 2 seconds
    scanTimeout.current = setTimeout(() => {
      setScanned(false);
      setScanning(true);
    }, 2000);
  };

  const handleManualEntry = () => {
    Alert.prompt(
      'Manual Entry',
      'Enter Student ID:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async (studentId) => {
            if (!studentId) return;
            
            // Simulate a scan with manual ID
            await handleBarCodeScanned({ 
              type: 'manual', 
              data: studentId 
            });
          }
        }
      ],
      'plain-text'
    );
  };

  if (hasPermission === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.centered}>
        <Ionicons name="camera-off" size={50} color="#999" />
        <Text style={styles.errorText}>No access to camera</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => BarCodeScanner.requestPermissionsAsync()}
        >
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />
        
        <View style={styles.overlay}>
          <View style={styles.scanArea} />
          <Text style={styles.scanHint}>
            Position QR code within the square
          </Text>
        </View>

        {/* Network Status Indicator */}
        {!isOnline && (
          <View style={styles.networkStatus}>
            <Ionicons name="cloud-offline" size={20} color="#fff" />
            <Text style={styles.networkStatusText}>Offline Mode</Text>
          </View>
        )}

        <View style={styles.headerControls}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.manualButton}
              onPress={handleManualEntry}
            >
              <Ionicons name="keypad" size={24} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.mapToggleButton}
              onPress={() => setShowMap(true)}
            >
              <Ionicons name="map" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.modeToggle}>
          <TouchableOpacity 
            style={[
              styles.modeButton,
              scanMode === 'boarding' && styles.modeButtonActive
            ]}
            onPress={() => setScanMode('boarding')}
          >
            <Ionicons name="bus" size={20} color="#fff" />
            <Text style={styles.modeText}>Board</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.modeButton,
              scanMode === 'alighting' && styles.modeButtonActive
            ]}
            onPress={() => setScanMode('alighting')}
          >
            <Ionicons name="flag" size={20} color="#fff" />
            <Text style={styles.modeText}>Alight</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Ionicons 
            name={isOnline ? "wifi" : "cloud-offline"} 
            size={20} 
            color={isOnline ? COLORS.primary : "#f44336"} 
          />
          <Text style={[styles.infoText, !isOnline && styles.offlineText]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>

        <View style={styles.infoItem}>
          <Ionicons name="location" size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            {currentLocation ? 'GPS Active' : 'Getting GPS...'}
          </Text>
        </View>
        
        {offlineQueue.length > 0 && (
          <TouchableOpacity 
            style={[styles.infoItem, styles.offlineBadge]}
            onPress={syncOfflineQueue}
          >
            <Ionicons name="sync" size={20} color="#856404" />
            <Text style={styles.offlineText}>
              {offlineQueue.length} pending
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {lastScan && (
        <TouchableOpacity 
          style={styles.lastScanCard}
          onPress={() => lastScan.studentId && fetchStudentInfo(lastScan.studentId)}
          activeOpacity={0.7}
        >
          <Text style={styles.lastScanTitle}>Last Scan:</Text>
          <View style={styles.lastScanRow}>
            <Ionicons 
              name={lastScan.success ? "checkmark-circle" : "close-circle"} 
              size={24} 
              color={lastScan.success ? "#4CAF50" : "#f44336"} 
            />
            <View style={styles.lastScanDetails}>
              <Text style={styles.studentName}>
                {lastScan.studentName || `ID: ${lastScan.studentId.substring(0, 8)}...`}
              </Text>
              <Text style={styles.scanTime}>Time: {lastScan.time}</Text>
              <Text style={styles.scanMode}>Mode: {lastScan.mode}</Text>
            </View>
          </View>
          {lastScan.offline && (
            <View style={styles.offlineIndicator}>
              <Ionicons name="cloud-outline" size={16} color="#856404" />
              <Text style={styles.offlineIndicatorText}>Saved offline</Text>
            </View>
          )}
          <Text style={styles.tapHint}>Tap card for student details</Text>
        </TouchableOpacity>
      )}

      {/* Student Info Modal */}
      <Modal
        visible={showStudentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStudentModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Student Information</Text>
              <TouchableOpacity onPress={() => setShowStudentModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {studentInfo && (
              <ScrollView style={styles.studentInfoContent}>
                <View style={styles.studentInfoRow}>
                  <Text style={styles.studentInfoLabel}>Name:</Text>
                  <Text style={styles.studentInfoValue}>
                    {studentInfo.firstName} {studentInfo.lastName}
                  </Text>
                </View>
                
                <View style={styles.studentInfoRow}>
                  <Text style={styles.studentInfoLabel}>Grade:</Text>
                  <Text style={styles.studentInfoValue}>{studentInfo.grade}</Text>
                </View>
                
                <View style={styles.studentInfoRow}>
                  <Text style={styles.studentInfoLabel}>Class:</Text>
                  <Text style={styles.studentInfoValue}>{studentInfo.classLevel}</Text>
                </View>
                
                {studentInfo.parentId && (
                  <>
                    <Text style={styles.studentInfoSection}>Parent/Guardian</Text>
                    <View style={styles.studentInfoRow}>
                      <Text style={styles.studentInfoLabel}>Name:</Text>
                      <Text style={styles.studentInfoValue}>
                        {studentInfo.parentId.name}
                      </Text>
                    </View>
                    <View style={styles.studentInfoRow}>
                      <Text style={styles.studentInfoLabel}>Phone:</Text>
                      <Text style={styles.studentInfoValue}>
                        {studentInfo.parentId.phone}
                      </Text>
                    </View>
                  </>
                )}
              </ScrollView>
            )}
            
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowStudentModal(false)}
            >
              <Text style={styles.closeModalText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Location Map Modal */}
      <Modal
        visible={showMap}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMap(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Current Location</Text>
              <TouchableOpacity onPress={() => setShowMap(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {currentLocation && (
              <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                  latitude: currentLocation.lat,
                  longitude: currentLocation.lng,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
              >
                <Marker
                  coordinate={{
                    latitude: currentLocation.lat,
                    longitude: currentLocation.lng
                  }}
                  title="Your Location"
                  pinColor={COLORS.primary}
                />
              </MapView>
            )}
            
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowMap(false)}
            >
              <Text style={styles.closeModalText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  loadingText: {
    marginTop: 10,
    color: '#666'
  },
  errorText: {
    marginTop: 10,
    color: '#f44336',
    fontSize: 16
  },
  cameraContainer: {
    height: '60%',
    overflow: 'hidden',
    position: 'relative'
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center'
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'transparent',
    borderRadius: 20
  },
  scanHint: {
    color: '#fff',
    fontSize: 14,
    marginTop: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20
  },
  networkStatus: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: '#f44336',
    padding: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    zIndex: 10
  },
  networkStatusText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  headerControls: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerRight: {
    flexDirection: 'row',
    gap: 10
  },
  manualButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  mapToggleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modeToggle: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 8
  },
  modeButtonActive: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.3)'
  },
  modeText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  infoBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    backgroundColor: '#fff',
    elevation: 2,
    flexWrap: 'wrap',
    gap: 10
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f0f0f0'
  },
  infoText: {
    fontSize: 14,
    color: '#666'
  },
  offlineBadge: {
    backgroundColor: '#fff3cd'
  },
  offlineText: {
    color: '#856404',
    fontWeight: 'bold'
  },
  lastScanCard: {
    margin: 15,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 2
  },
  lastScanTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10
  },
  lastScanRow: {
    flexDirection: 'row',
    gap: 15
  },
  lastScanDetails: {
    flex: 1
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  scanTime: {
    fontSize: 14,
    color: '#666'
  },
  scanMode: {
    fontSize: 14,
    color: '#666'
  },
  tapHint: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 8,
    textAlign: 'center'
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 5
  },
  offlineIndicatorText: {
    color: '#856404',
    fontSize: 12
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 20
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    height: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  studentInfoContent: {
    flex: 1,
    marginBottom: 15
  },
  studentInfoRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  studentInfoLabel: {
    width: 100,
    fontSize: 16,
    color: '#666',
    fontWeight: '500'
  },
  studentInfoValue: {
    flex: 1,
    fontSize: 16,
    color: '#333'
  },
  studentInfoSection: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 20,
    marginBottom: 10
  },
  map: {
    flex: 1,
    borderRadius: 10,
    marginBottom: 15
  },
  closeModalButton: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center'
  },
  closeModalText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  }
});

export default QRScanScreen;