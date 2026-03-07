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
  Dimensions
} from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
    })();

    return () => {
      if (scanTimeout.current) clearTimeout(scanTimeout.current);
      if (locationSubscription.current) locationSubscription.current.remove();
    };
  }, []);

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
      const updatedQueue = [...offlineQueue, { ...scanData, queuedAt: new Date().toISOString() }];
      await AsyncStorage.setItem('@offline_scans', JSON.stringify(updatedQueue));
      setOfflineQueue(updatedQueue);
    } catch (error) {
      console.error('Error saving to offline queue:', error);
    }
  };

  const syncOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;

    Alert.alert(
      'Sync Offline Data',
      `You have ${offlineQueue.length} scans to sync.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sync Now',
          onPress: async () => {
            try {
              for (const scan of offlineQueue) {
                try {
                  await api.trip.boardStudent(scan.tripId, scan.studentId, 'qr');
                } catch (error) {
                  console.error('Failed to sync scan:', error);
                }
              }
              await AsyncStorage.removeItem('@offline_scans');
              setOfflineQueue([]);
              Alert.alert('Success', 'All scans synced successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to sync some scans');
            }
          }
        }
      ]
    );
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    if (!scanning || scanned || !currentTrip) return;
    
    setScanned(true);
    setScanning(false);
    
    Vibration.vibrate(100);

    try {
      let studentId = data;
      try {
        const parsed = JSON.parse(data);
        studentId = parsed.studentId || parsed.id || data;
      } catch (e) {}

      const scanData = {
        studentId,
        tripId: tripId,
        method: 'qr',
        timestamp: new Date().toISOString(),
        location: currentLocation
      };

      try {
        const response = await api.trip.boardStudent(tripId, studentId, 'qr');
        
        setLastScan({
          studentId,
          time: new Date().toLocaleTimeString(),
          mode: scanMode,
          success: true
        });

        Alert.alert(
          '✅ Scan Successful',
          `Student checked ${scanMode}\nTime: ${new Date().toLocaleTimeString()}`,
          [{ text: 'OK' }]
        );
      } catch (error) {
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

    scanTimeout.current = setTimeout(() => {
      setScanned(false);
      setScanning(true);
    }, 2000);
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

        <View style={styles.headerControls}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.mapToggleButton}
            onPress={() => setShowMap(true)}
          >
            <Ionicons name="map" size={24} color="#fff" />
          </TouchableOpacity>
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
            <Ionicons name="cloud-offline" size={20} color="#856404" />
            <Text style={styles.offlineText}>
              {offlineQueue.length} pending
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {lastScan && (
        <View style={styles.lastScanCard}>
          <Text style={styles.lastScanTitle}>Last Scan:</Text>
          <View style={styles.lastScanRow}>
            <Ionicons 
              name={lastScan.success ? "checkmark-circle" : "close-circle"} 
              size={24} 
              color={lastScan.success ? "#4CAF50" : "#f44336"} 
            />
            <View style={styles.lastScanDetails}>
              <Text>Student ID: {lastScan.studentId.substring(0, 8)}...</Text>
              <Text>Time: {lastScan.time}</Text>
              <Text>Mode: {lastScan.mode}</Text>
            </View>
          </View>
          {lastScan.offline && (
            <View style={styles.offlineIndicator}>
              <Ionicons name="cloud-outline" size={16} color="#856404" />
              <Text style={styles.offlineIndicatorText}>Saved offline</Text>
            </View>
          )}
        </View>
      )}

      <Modal
        visible={showMap}
        animationType="slide"
        transparent={true}
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
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#fff',
    elevation: 2
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  infoText: {
    fontSize: 14,
    color: '#666'
  },
  offlineBadge: {
    backgroundColor: '#fff3cd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
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