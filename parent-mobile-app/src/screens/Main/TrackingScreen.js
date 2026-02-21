import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import MapView, { Marker, Polyline, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { useSocket } from '../../context/SocketContext';
import * as Location from 'expo-location';
import api from '../../services/api';
import { COLORS } from '../../constants/config';

const { width, height } = Dimensions.get('window');

const BusMarker = ({ busLocation, busNumber, isMoving }) => (
  <Marker
    coordinate={{
      latitude: busLocation.lat,
      longitude: busLocation.lon,
    }}
    title={`Bus ${busNumber}`}
    description={`Speed: ${busLocation.speed} km/h`}
  >
    <View style={[styles.busMarker, isMoving && styles.busMarkerMoving]}>
      <Text style={styles.busIcon}>🚌</Text>
    </View>
  </Marker>
);

const StopMarker = ({ coordinate, stopName, stopNumber }) => (
  <Marker coordinate={coordinate} title={stopName || `Stop ${stopNumber}`}>
    <View style={styles.stopMarker}>
      <Text style={styles.stopIcon}>📍</Text>
    </View>
  </Marker>
);

const InfoPanel = ({ busLocation, eta, isConnected, onCenter, onAlert }) => (
  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.bottomPanel}>
    <View style={styles.infoCard}>
      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Status</Text>
          <Text style={[styles.infoValue, { color: isConnected ? '#4CAF50' : '#f44336' }]}>
            {isConnected ? 'Live' : 'Offline'}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Speed</Text>
          <Text style={styles.infoValue}>
            {busLocation?.speed || 0} <Text style={styles.infoUnit}>km/h</Text>
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>ETA</Text>
          <Text style={styles.infoValue}>
            {eta || '--'} <Text style={styles.infoUnit}>min</Text>
          </Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progress, { width: `${busLocation?.progress || 0}%` }]} />
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.actionButton} onPress={onCenter}>
          <Text style={styles.actionIcon}>🎯</Text>
          <Text style={styles.actionLabel}>Center</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={onAlert}>
          <Text style={styles.actionIcon}>📢</Text>
          <Text style={styles.actionLabel}>Alert</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>📞</Text>
          <Text style={styles.actionLabel}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>📤</Text>
          <Text style={styles.actionLabel}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  </LinearGradient>
);

export default function TrackingScreen({ route, navigation }) {
  if (!route?.params?.child) {
    navigation.goBack();
    return null;
  }

  const { child } = route.params;
  const { liveLocations, isConnected, socket } = useSocket();
  const mapRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [busLocation, setBusLocation] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [stops, setStops] = useState([]);
  const [eta, setEta] = useState(null);
  const [mapType, setMapType] = useState('standard');
  const [userLocation, setUserLocation] = useState(null);
  const [region, setRegion] = useState({
    latitude: -1.2864,
    longitude: 36.8172,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  useEffect(() => {
    initializeTracking();
  }, []);

  useEffect(() => {
    const childId = child._id || child.id;
    if (childId && liveLocations[childId]) {
      const location = liveLocations[childId];
      setBusLocation(location);
      updateMapLocation(location);
      calculateETA(location);
    }
  }, [liveLocations, child]);

  const initializeTracking = async () => {
    try {
      setLoading(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }

      await fetchRouteData();
      
    } catch (error) {
      console.error('Error initializing tracking:', error);
      Alert.alert('Error', 'Failed to load tracking data');
    } finally {
      setLoading(false);
    }
  };

  const fetchRouteData = async () => {
    try {
      const childId = child._id || child.id;
      const response = await api.parent.getChildLocation(childId);
      
      if (response?.route?.coordinates) {
        setRouteCoords(response.route.coordinates);
      }
      
      if (response?.stops) {
        setStops(response.stops);
      }
      
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  };

  const updateMapLocation = (location) => {
    if (mapRef.current && location) {
      mapRef.current.animateToRegion({
        latitude: location.lat,
        longitude: location.lon,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  const calculateETA = (location) => {
    if (location && stops.length > 0) {
      const lastStop = stops[stops.length - 1];
      const distance = Math.abs(location.lat - lastStop.latitude) * 100;
      const etaMinutes = Math.floor(distance * 10);
      setEta(etaMinutes);
    }
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

  const handleAlertDriver = () => {
    Alert.alert(
      'Alert Driver',
      'What would you like to notify the driver about?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Running Late', onPress: () => sendAlert('late') },
        { text: 'Emergency', onPress: () => sendAlert('emergency'), style: 'destructive' },
        { text: 'Wrong Route', onPress: () => sendAlert('route') },
      ]
    );
  };

  const sendAlert = async (type) => {
    try {
      const childId = child._id || child.id;
      await api.transport.reportProblem({
        type,
        childId,
        message: `Parent alert: ${type}`,
      });
      
      if (socket) {
        socket.emit('driver-alert', {
          childId,
          type,
          message: `Parent alert: ${type}`,
        });
      }
      
      Alert.alert('Success', 'Alert sent to driver');
    } catch (error) {
      Alert.alert('Error', 'Failed to send alert');
    }
  };

  const toggleMapType = () => {
    setMapType(prev => prev === 'standard' ? 'satellite' : 'standard');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading tracking data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        mapType={mapType}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
        showsTraffic={true}
      >
        {routeCoords.length > 1 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="#2196F3"
            strokeWidth={4}
            lineDashPattern={[0]}
          />
        )}

        <Circle
          center={{ latitude: -1.2864, longitude: 36.8172 }}
          radius={500}
          strokeColor="rgba(33, 150, 243, 0.5)"
          fillColor="rgba(33, 150, 243, 0.1)"
        />

        {stops.map((stop, index) => (
          <StopMarker
            key={stop.id}
            coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
            stopName={stop.name}
            stopNumber={index + 1}
          />
        ))}

        {busLocation && (
          <BusMarker
            busLocation={busLocation}
            busNumber={child.busNumber}
            isMoving={busLocation.speed > 0}
          />
        )}
      </MapView>

      <LinearGradient colors={['rgba(0,0,0,0.7)', 'transparent']} style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.childName}>{child.firstName}'s Bus</Text>
          <Text style={styles.busNumber}>{child.busNumber}</Text>
        </View>
        <TouchableOpacity onPress={toggleMapType} style={styles.mapTypeButton}>
          <Text style={styles.mapTypeIcon}>🗺️</Text>
        </TouchableOpacity>
      </LinearGradient>

      <InfoPanel
        busLocation={busLocation}
        eta={eta}
        isConnected={isConnected}
        onCenter={centerMap}
        onAlert={handleAlertDriver}
      />

      {busLocation?.outsideGeofence && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertText}>⚠️ Bus outside designated zone</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width, height },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: Platform.OS === 'ios' ? 50 : 40, paddingHorizontal: 20, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 24, color: '#fff' },
  titleContainer: { alignItems: 'center' },
  childName: { fontSize: 18, fontWeight: 'bold', color: '#fff', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  busNumber: { fontSize: 14, color: 'rgba(255,255,255,0.9)', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  mapTypeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  mapTypeIcon: { fontSize: 20 },
  bottomPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 20 },
  infoCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: Platform.OS === 'ios' ? 30 : 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 15 },
  infoItem: { alignItems: 'center' },
  infoLabel: { fontSize: 12, color: '#999', marginBottom: 4 },
  infoValue: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  infoUnit: { fontSize: 12, color: '#999', fontWeight: 'normal' },
  progressBar: { height: 6, backgroundColor: '#f0f0f0', borderRadius: 3, marginBottom: 20, overflow: 'hidden' },
  progress: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 3 },
  actionButtons: { flexDirection: 'row', justifyContent: 'space-around' },
  actionButton: { alignItems: 'center' },
  actionIcon: { fontSize: 22, marginBottom: 4 },
  actionLabel: { fontSize: 11, color: '#666' },
  busMarker: { backgroundColor: '#2196F3', padding: 8, borderRadius: 20, borderWidth: 2, borderColor: '#fff', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
  busMarkerMoving: { backgroundColor: '#4CAF50', transform: [{ scale: 1.1 }] },
  busIcon: { fontSize: 20 },
  stopMarker: { backgroundColor: '#FF9800', padding: 6, borderRadius: 15, borderWidth: 2, borderColor: '#fff' },
  stopIcon: { fontSize: 14 },
  alertBanner: { position: 'absolute', top: 100, left: 20, right: 20, backgroundColor: '#f44336', padding: 12, borderRadius: 8, alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
  alertText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});