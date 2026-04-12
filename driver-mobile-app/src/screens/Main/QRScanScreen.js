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
  ScrollView,
  FlatList
} from 'react-native';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useTrip } from '../../context/TripContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { COLORS } from '../../constants/config';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const QRScanScreen = ({ navigation, route }) => {
  const { activeTrip, tripStudents, boardStudent, alightStudent, getStudentScanStatus, refreshTrip } = useTrip();
  const { user } = useAuth();
  
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [scanResult, setScanResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [showMap, setShowMap] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [scanMode, setScanMode] = useState('boarding');
  const [isOnline, setIsOnline] = useState(true);
  const [studentInfo, setStudentInfo] = useState(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [scanHistory, setScanHistory] = useState([]);
  
  const mapRef = useRef(null);
  const scanTimeout = useRef(null);
  const locationSubscription = useRef(null);

  const tripId = route.params?.tripId || activeTrip?._id;

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      
      const locationStatus = await Location.requestForegroundPermissionsAsync();
      
      startLocationTracking();
      loadOfflineQueue();
      checkNetworkStatus();
      loadScanHistory();
      
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

  const loadScanHistory = () => {
    if (activeTrip) {
      const history = tripStudents
        .filter(s => getStudentScanStatus(activeTrip._id, s._id))
        .map(s => ({
          studentId: s._id,
          studentName: `${s.firstName} ${s.lastName}`,
          ...getStudentScanStatus(activeTrip._id, s._id)
        }));
      setScanHistory(history);
    }
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
            heading: location.coords.heading,
            speed: location.coords.speed
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
              
              if (response.data?.success) {
                await AsyncStorage.removeItem('@offline_scans');
                setOfflineQueue([]);
                Alert.alert('Success', `${offlineQueue.length} scans synced successfully`);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to sync scans. Will retry automatically.');
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

  // FIXED: Use the updated api.trip methods that trigger SMS
  const recordAttendance = async (studentId, type, location) => {
    try {
      console.log(`Recording ${type} for student ${studentId} on trip ${tripId}`);
      
      let result;
      if (type === 'boarding') {
        result = await api.trip.boardStudent(tripId, studentId, location);
      } else {
        result = await api.trip.alightStudent(tripId, studentId, location);
      }
      
      console.log('Attendance response:', result);
      return result;
    } catch (error) {
      console.error('API error:', error);
      throw error;
    }
  };

  // Check if trip can accept scans
  const canScan = () => {
    if (!activeTrip) {
      Alert.alert('No Active Trip', 'Please select and start a trip first.');
      return false;
    }
    
    if (activeTrip.status !== 'running') {
      Alert.alert(
        'Trip Not Started',
        'The trip must be started before scanning students.',
        [
          { 
            text: 'Go to Trip', 
            onPress: () => navigation.navigate('TripManagement') 
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return false;
    }
    
    return true;
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    if (!scanning || scanned || !tripId) return;
    
    // Check if trip is running before scanning
    if (!canScan()) {
      setScanned(false);
      setScanning(true);
      return;
    }
    
    setScanned(true);
    setScanning(false);
    
    Vibration.vibrate(100);

    try {
      let studentId = data;
      let qrData = {};
      
      try {
        qrData = JSON.parse(data);
        studentId = qrData.studentId || qrData.id || data;
      } catch (e) {
        // Not JSON, use raw data
      }

      const student = tripStudents.find(s => 
        s._id === studentId || s.qrCode === data || s.admissionNumber === data
      );

      if (!student) {
        throw new Error('Student not found in this trip');
      }

      const existingScan = getStudentScanStatus(tripId, student._id);
      if (existingScan && existingScan.type === scanMode) {
        throw new Error(`Already recorded as ${scanMode === 'boarding' ? 'boarded' : 'alighted'}`);
      }

      let location = null;
      if (currentLocation) {
        location = {
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          accuracy: currentLocation.accuracy
        };
      }

      let result;
      
      if (isOnline) {
        // Online mode - call API directly (triggers SMS)
        result = await recordAttendance(student._id, scanMode, location);
        
        if (result.success) {
          // Update local context
          if (scanMode === 'boarding') {
            await boardStudent(tripId, student._id, 'qr');
          } else {
            await alightStudent(tripId, student._id, 'qr');
          }
          
          setScanResult({
            success: true,
            student,
            type: scanMode,
            offline: false,
            parentNotified: result.data?.parentNotified === true || result.parentNotified === true,
            smsSent: result.data?.parentNotified === true || result.parentNotified === true
          });
          
          // Refresh trip data to update attendance
          await refreshTrip();
        } else {
          throw new Error(result.message || 'Failed to record attendance');
        }
      } else {
        // Offline mode - save to queue
        const scanData = {
          studentId: student._id,
          tripId,
          type: scanMode,
          method: 'qr',
          timestamp: new Date().toISOString(),
          location,
          deviceId: await getDeviceId()
        };
        
        await saveToOfflineQueue(scanData);
        
        // Update local context for offline
        if (scanMode === 'boarding') {
          await boardStudent(tripId, student._id, 'qr', true);
        } else {
          await alightStudent(tripId, student._id, 'qr', true);
        }
        
        setScanResult({
          success: true,
          student,
          type: scanMode,
          offline: true,
          parentNotified: false,
          smsSent: false
        });
      }

      setShowResult(true);
      await fetchStudentInfo(student._id);
      loadScanHistory();

      scanTimeout.current = setTimeout(() => {
        setShowResult(false);
        setScanned(false);
        setScanning(true);
        setScanResult(null);
      }, 3000);
      
    } catch (error) {
      console.error('Scan error:', error);
      
      setScanResult({
        success: false,
        message: error.message
      });
      setShowResult(true);

      scanTimeout.current = setTimeout(() => {
        setShowResult(false);
        setScanned(false);
        setScanning(true);
        setScanResult(null);
      }, 3000);
    }
  };

  const handleManualEntry = () => {
    if (!canScan()) return;
    
    Alert.prompt(
      'Manual Entry',
      'Enter Student ID or Admission Number:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async (studentId) => {
            if (!studentId) return;
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

  const resetScanner = () => {
    setScanned(false);
    setScanning(true);
    setShowResult(false);
    setScanResult(null);
    if (scanTimeout.current) {
      clearTimeout(scanTimeout.current);
    }
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
          onPress={async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
          }}
        >
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!tripId) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={50} color="#f44336" />
        <Text style={styles.errorText}>No active trip</Text>
        <Text style={styles.loadingText}>Please start a trip first</Text>
        <TouchableOpacity 
          style={[styles.button, { marginTop: 20 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show warning if trip is not running
  const isTripRunning = activeTrip?.status === 'running';

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Scan QR Code</Text>
          <Text style={styles.headerSubtitle}>
            {activeTrip?.routeName || 'Trip'} - {scanMode === 'boarding' ? 'Boarding' : 'Alighting'}
          </Text>
        </View>
        <View style={styles.onlineStatus}>
          <View style={[styles.statusDot, isOnline ? styles.online : styles.offline]} />
          <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
        </View>
      </LinearGradient>

      {/* Trip Status Warning */}
      {!isTripRunning && (
        <View style={styles.warningBanner}>
          <Ionicons name="warning-outline" size={16} color="#fff" />
          <Text style={styles.warningText}>
            Trip is not started. Please start the trip before scanning.
          </Text>
        </View>
      )}

      <View style={styles.cameraContainer}>
        <Camera
          style={styles.camera}
          type={Camera.Constants.Type.back}
          onBarCodeScanned={scanned || !isTripRunning ? undefined : handleBarCodeScanned}
          barCodeScannerSettings={{
            barCodeTypes: ['qr'],
          }}
        />
        
        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            <View style={styles.cornerTL} />
            <View style={styles.cornerTR} />
            <View style={styles.cornerBL} />
            <View style={styles.cornerBR} />
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
            <Ionicons name="log-in-outline" size={20} color="#fff" />
            <Text style={styles.modeText}>Board</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.modeButton,
              scanMode === 'alighting' && styles.modeButtonActive
            ]}
            onPress={() => setScanMode('alighting')}
          >
            <Ionicons name="log-out-outline" size={20} color="#fff" />
            <Text style={styles.modeText}>Alight</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerControls}>
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
        
        <View style={[styles.infoItem, isTripRunning ? styles.activeTripBadge : styles.inactiveTripBadge]}>
          <Ionicons name="bus" size={20} color={isTripRunning ? "#4CAF50" : "#f44336"} />
          <Text style={[styles.infoText, { color: isTripRunning ? "#4CAF50" : "#f44336", fontWeight: 'bold' }]}>
            {isTripRunning ? 'Trip Running' : 'Trip Not Started'}
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

      {/* Scan Result Modal */}
      <Modal
        visible={showResult}
        transparent
        animationType="fade"
        onRequestClose={resetScanner}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent,
            scanResult?.success ? styles.modalSuccess : styles.modalError
          ]}>
            {scanResult?.success ? (
              <>
                <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />
                <Text style={styles.modalTitle}>Success</Text>
                <Text style={styles.modalText}>
                  {scanResult.student?.firstName} {scanResult.student?.lastName}
                </Text>
                <Text style={styles.modalSubtext}>
                  {scanResult.type === 'boarding' ? 'Boarded' : 'Alighted'} successfully
                </Text>
                {scanResult.parentNotified && (
                  <View style={styles.notificationBadge}>
                    <Ionicons name="notifications" size={14} color="#4CAF50" />
                    <Text style={styles.notificationBadgeText}>
                      Parent notified via SMS
                    </Text>
                  </View>
                )}
                {scanResult.offline && (
                  <View style={styles.offlineBadgeSmall}>
                    <Ionicons name="cloud-offline-outline" size={16} color="#ff9800" />
                    <Text style={styles.offlineBadgeText}>Saved offline</Text>
                  </View>
                )}
              </>
            ) : (
              <>
                <Ionicons name="alert-circle" size={60} color="#f44336" />
                <Text style={styles.modalTitle}>Error</Text>
                <Text style={styles.modalText}>
                  {scanResult?.message || 'Failed to scan'}
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Student Info Modal */}
      <Modal
        visible={showStudentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStudentModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContentLarge}>
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
                  <Text style={styles.studentInfoLabel}>Class:</Text>
                  <Text style={styles.studentInfoValue}>{studentInfo.classLevel}</Text>
                </View>
                
                <View style={styles.studentInfoRow}>
                  <Text style={styles.studentInfoLabel}>Admission:</Text>
                  <Text style={styles.studentInfoValue}>{studentInfo.admissionNumber}</Text>
                </View>
                
                <View style={styles.studentInfoRow}>
                  <Text style={styles.studentInfoLabel}>Parent Phone:</Text>
                  <Text style={styles.studentInfoValue}>
                    {studentInfo.parentPhone || 'Not registered'}
                  </Text>
                </View>
                
                {studentInfo.transportDetails?.pickupPoint && (
                  <View style={styles.studentInfoRow}>
                    <Text style={styles.studentInfoLabel}>Pickup:</Text>
                    <Text style={styles.studentInfoValue}>
                      {typeof studentInfo.transportDetails.pickupPoint === 'string' 
                        ? studentInfo.transportDetails.pickupPoint 
                        : studentInfo.transportDetails.pickupPoint.name}
                    </Text>
                  </View>
                )}
                
                {studentInfo.transportDetails?.dropoffPoint && (
                  <View style={styles.studentInfoRow}>
                    <Text style={styles.studentInfoLabel}>Dropoff:</Text>
                    <Text style={styles.studentInfoValue}>
                      {typeof studentInfo.transportDetails.dropoffPoint === 'string' 
                        ? studentInfo.transportDetails.dropoffPoint 
                        : studentInfo.transportDetails.dropoffPoint.name}
                    </Text>
                  </View>
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
          <View style={styles.modalContentLarge}>
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

      {/* Scan History */}
      {scanHistory.length > 0 && (
        <View style={styles.historyContainer}>
          <Text style={styles.historyTitle}>Recent Scans</Text>
          <FlatList
            data={scanHistory.slice(-5).reverse()}
            keyExtractor={(item, index) => index.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.historyItem}
                onPress={() => fetchStudentInfo(item.studentId)}
              >
                <Ionicons
                  name={item.type === 'boarding' ? 'log-in' : 'log-out'}
                  size={16}
                  color={item.type === 'boarding' ? '#4CAF50' : '#f44336'}
                />
                <Text style={styles.historyName}>{item.studentName}</Text>
                <Text style={styles.historyTime}>
                  {new Date(item.timestamp).toLocaleTimeString()}
                </Text>
                {item.smsSent && (
                  <View style={styles.smsIndicator}>
                    <Ionicons name="chatbubble" size={10} color="#4CAF50" />
                  </View>
                )}
                {item.offline && (
                  <View style={styles.offlineIndicator}>
                    <Ionicons name="cloud-offline" size={12} color="#999" />
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Reset Button */}
      {scanned && !showResult && (
        <TouchableOpacity style={styles.resetButton} onPress={resetScanner}>
          <Text style={styles.resetButtonText}>Scan Again</Text>
        </TouchableOpacity>
      )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingTop: 40,
  },
  backButton: {
    padding: 5,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  online: {
    backgroundColor: '#4CAF50',
  },
  offline: {
    backgroundColor: '#f44336',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
  },
  warningBanner: {
    backgroundColor: '#f44336',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 8,
  },
  cameraContainer: {
    height: '45%',
    overflow: 'hidden',
    position: 'relative'
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center'
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#fff',
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#fff',
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#fff',
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#fff',
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
  headerControls: {
    position: 'absolute',
    top: 10,
    right: 20,
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
  infoBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    backgroundColor: '#fff',
    elevation: 2,
    flexWrap: 'wrap',
    gap: 8
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
  activeTripBadge: {
    backgroundColor: '#e8f5e9',
  },
  inactiveTripBadge: {
    backgroundColor: '#ffebee',
  },
  offlineBadge: {
    backgroundColor: '#fff3cd'
  },
  offlineText: {
    color: '#856404',
    fontWeight: 'bold'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    minWidth: 250,
  },
  modalContentLarge: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    height: '80%'
  },
  modalSuccess: {
    borderTopWidth: 5,
    borderTopColor: '#4CAF50',
  },
  modalError: {
    borderTopWidth: 5,
    borderTopColor: '#f44336',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 5,
  },
  modalSubtext: {
    fontSize: 14,
    color: '#666',
  },
  notificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginTop: 10,
    gap: 6,
  },
  notificationBadgeText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '500',
  },
  offlineBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 10,
  },
  offlineBadgeText: {
    color: '#ff9800',
    fontSize: 12,
    marginLeft: 5,
  },
  resetButton: {
    backgroundColor: '#667eea',
    padding: 15,
    margin: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
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
  },
  historyContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    color: '#666',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  historyName: {
    marginLeft: 5,
    marginRight: 8,
    fontSize: 13,
    fontWeight: '500',
  },
  historyTime: {
    fontSize: 11,
    color: '#999',
  },
  smsIndicator: {
    marginLeft: 4,
  },
  offlineIndicator: {
    marginLeft: 5,
  },
});

export default QRScanScreen;