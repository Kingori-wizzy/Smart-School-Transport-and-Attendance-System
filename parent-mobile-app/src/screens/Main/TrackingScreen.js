import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline, Circle } from 'react-native-maps';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

export default function TrackingScreen({ route, navigation }) {
  const { child } = route.params;
  const { liveLocations, isConnected } = useSocket();
  const [busLocation, setBusLocation] = useState(null);
  const [region, setRegion] = useState({
    latitude: -1.2864,
    longitude: 36.8172,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [eta, setEta] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [mapType, setMapType] = useState('standard');
  
  const mapRef = useRef(null);

  useEffect(() => {
    getCurrentLocation();
    fetchRouteData();
  }, []);

  useEffect(() => {
    if (child?.busId && liveLocations[child.busId]) {
      const location = liveLocations[child.busId];
      setBusLocation(location);
      
      // Animate to bus location
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: location.lat,
          longitude: location.lon,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      }
      
      calculateETA(location);
    }
  }, [liveLocations, child]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const fetchRouteData = async () => {
    setLoading(true);
    // Mock route data - replace with actual API call
    const mockRoute = [
      { latitude: -1.2864, longitude: 36.8172 },
      { latitude: -1.2964, longitude: 36.8272 },
      { latitude: -1.2764, longitude: 36.8072 },
      { latitude: -1.2664, longitude: 36.7972 },
      { latitude: -1.2564, longitude: 36.7872 },
    ];
    setRouteCoords(mockRoute);
    setLoading(false);
  };

  const calculateETA = (location) => {
    // Mock ETA calculation - replace with actual logic
    const etaMinutes = Math.floor(Math.random() * 15) + 5;
    setEta(etaMinutes);
  };

  const centerMap = () => {
    if (busLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: busLocation.lat,
        longitude: busLocation.lon,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  const toggleMapType = () => {
    setMapType(prev => prev === 'standard' ? 'satellite' : 'standard');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading tracking data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        mapType={mapType}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
      >
        {/* Route Polyline */}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="#2196F3"
            strokeWidth={4}
            lineDashPattern={[1]}
          />
        )}

        {/* Geofence (School Zone) */}
        <Circle
          center={{ latitude: -1.2864, longitude: 36.8172 }}
          radius={500}
          strokeColor="rgba(33, 150, 243, 0.5)"
          fillColor="rgba(33, 150, 243, 0.1)"
        />

        {/* Bus Marker */}
        {busLocation && (
          <Marker
            coordinate={{
              latitude: busLocation.lat,
              longitude: busLocation.lon,
            }}
            title={`Bus ${child.busNumber}`}
            description={`Speed: ${busLocation.speed} km/h`}
          >
            <View style={styles.busMarker}>
              <Text style={styles.busIcon}>🚌</Text>
            </View>
          </Marker>
        )}

        {/* Bus Stop Markers */}
        {routeCoords.map((coord, index) => (
          <Marker
            key={index}
            coordinate={coord}
            title={`Stop ${index + 1}`}
          >
            <View style={styles.stopMarker}>
              <Text style={styles.stopIcon}>📍</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Top Bar */}
      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'transparent']}
        style={styles.topBar}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.childName}>{child.name}'s Bus</Text>
          <Text style={styles.busNumber}>{child.busNumber}</Text>
        </View>
        <TouchableOpacity onPress={toggleMapType} style={styles.mapTypeButton}>
          <Text style={styles.mapTypeIcon}>🗺️</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Bottom Info Panel */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.bottomPanel}
      >
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={[
                styles.infoValue,
                { color: isConnected ? '#4CAF50' : '#f44336' }
              ]}>
                {isConnected ? 'Live' : 'Offline'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Speed</Text>
              <Text style={styles.infoValue}>
                {busLocation?.speed || 0} km/h
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>ETA</Text>
              <Text style={styles.infoValue}>{eta || '--'} min</Text>
            </View>
          </View>

          <View style={styles.progressBar}>
            <View style={[styles.progress, { width: '60%' }]} />
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={centerMap}
            >
              <Text style={styles.actionIcon}>🎯</Text>
              <Text style={styles.actionLabel}>Center</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => Alert.alert('Alert Driver', 'Notification sent to driver')}
            >
              <Text style={styles.actionIcon}>📢</Text>
              <Text style={styles.actionLabel}>Alert</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Attendance', { child })}
            >
              <Text style={styles.actionIcon}>📊</Text>
              <Text style={styles.actionLabel}>History</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => shareLocation()}
            >
              <Text style={styles.actionIcon}>📤</Text>
              <Text style={styles.actionLabel}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Geofence Alert */}
      {busLocation && busLocation.outsideGeofence && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertText}>⚠️ Bus outside designated zone</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: width,
    height: height,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: '#fff',
  },
  titleContainer: {
    alignItems: 'center',
  },
  childName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  busNumber: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  mapTypeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapTypeIcon: {
    fontSize: 20,
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 20,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  actionLabel: {
    fontSize: 12,
    color: '#666',
  },
  busMarker: {
    backgroundColor: '#2196F3',
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  busIcon: {
    fontSize: 20,
  },
  stopMarker: {
    backgroundColor: '#FF9800',
    padding: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
  },
  stopIcon: {
    fontSize: 12,
  },
  alertBanner: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: '#f44336',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  alertText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});