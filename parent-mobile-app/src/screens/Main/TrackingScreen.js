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
import { LinearGradient } from 'expo-linear-gradient';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-native-leaflet-kit';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';
import * as Location from 'expo-location';
import api from '../../services/api';
import { COLORS } from '../../constants/config';

const { width, height } = Dimensions.get('window');

const BusMarker = ({ busLocation, busNumber, isMoving, colors }) => (
  <Marker
    position={{ lat: busLocation.lat, lng: busLocation.lon }}
    icon={isMoving ? '🚌' : '⏹️'}
    title={`Bus ${busNumber}`}
    description={`Speed: ${busLocation.speed || 0} km/h`}
  />
);

const StopMarker = ({ coordinate, stopName, stopNumber, colors }) => (
  <Marker
    position={{ lat: coordinate.latitude, lng: coordinate.longitude }}
    icon="📍"
    title={stopName || `Stop ${stopNumber}`}
  />
);

const InfoPanel = ({ busLocation, eta, isConnected, onCenter, onAlert, colors }) => (
  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.bottomPanel}>
    <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Status</Text>
          <Text style={[styles.infoValue, { color: isConnected ? colors.success : colors.danger }]}>
            {isConnected ? 'Live' : 'Offline'}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Speed</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {busLocation?.speed || 0} <Text style={styles.infoUnit}>km/h</Text>
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>ETA</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {eta || '--'} <Text style={styles.infoUnit}>min</Text>
          </Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progress, { width: `${busLocation?.progress || 0}%`, backgroundColor: colors.primary }]} />
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.actionButton} onPress={onCenter}>
          <Text style={styles.actionIcon}>🎯</Text>
          <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Center</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={onAlert}>
          <Text style={styles.actionIcon}>📢</Text>
          <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Alert</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>📞</Text>
          <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>📤</Text>
          <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  </LinearGradient>
);

export default function TrackingScreen({ route, navigation }) {
  const { child } = route?.params || {};
  const { liveLocations, isConnected, socket } = useSocket();
  const { colors, isDarkMode } = useTheme();
  const mapRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [busLocation, setBusLocation] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [stops, setStops] = useState([]);
  const [eta, setEta] = useState(null);
  const [mapCenter, setMapCenter] = useState({
    lat: -1.2864,
    lng: 36.8172,
  });
  const [mapZoom, setMapZoom] = useState(13);

  // ✅ FIX: Handle missing child in useEffect, not during render
  useEffect(() => {
    if (!child) {
      navigation.goBack();
    }
  }, [child, navigation]);

  useEffect(() => {
    if (child) {
      initializeTracking();
    }
  }, [child]);

  useEffect(() => {
    const childId = child?._id || child?.id;
    if (childId && liveLocations[childId]) {
      const location = liveLocations[childId];
      setBusLocation(location);
      setMapCenter({ lat: location.lat, lng: location.lon });
      calculateETA(location);
    }
  }, [liveLocations, child]);

  const initializeTracking = async () => {
    try {
      setLoading(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        // Optionally set user location
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
      const childId = child?._id || child?.id;
      const response = await api.parent.getChildLocation(childId);
      
      if (response?.route?.coordinates) {
        setRouteCoords(response.route.coordinates.map(c => ({
          lat: c.latitude,
          lng: c.longitude
        })));
      }
      
      if (response?.stops) {
        setStops(response.stops);
      }
      
    } catch (error) {
      console.error('Error fetching route:', error);
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
    if (busLocation) {
      setMapCenter({ lat: busLocation.lat, lng: busLocation.lon });
      setMapZoom(15);
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
      const childId = child?._id || child?.id;
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
      console.error('Error sending alert:', error);
      Alert.alert('Error', 'Failed to send alert');
    }
  };

  // Show loading if no child or still loading
  if (!child && loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
      </View>
    );
  }

  if (!child) {
    return null;
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading tracking data...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Map Container */}
      <View style={styles.mapContainer}>
        <MapContainer
          ref={mapRef}
          center={mapCenter}
          zoom={mapZoom}
          minZoom={5}
          maxZoom={19}
          isDark={isDarkMode}
          style={styles.map}
        >
          {/* OpenStreetMap tiles */}
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          
          {/* Route polyline */}
          {routeCoords.length > 1 && (
            <Polyline
              positions={routeCoords}
              color={colors.primary}
              weight={4}
              opacity={0.8}
            />
          )}

          {/* Stop markers */}
          {stops.map((stop, index) => (
            <StopMarker
              key={stop.id || index}
              coordinate={stop}
              stopName={stop.name}
              stopNumber={index + 1}
              colors={colors}
            />
          ))}

          {/* Bus marker */}
          {busLocation && (
            <BusMarker
              busLocation={busLocation}
              busNumber={child.busNumber}
              isMoving={busLocation.speed > 0}
              colors={colors}
            />
          )}
        </MapContainer>
      </View>

      {/* Top Bar */}
      <LinearGradient colors={['rgba(0,0,0,0.7)', 'transparent']} style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.childName}>{child.firstName}'s Bus</Text>
          <Text style={styles.busNumber}>{child.busNumber}</Text>
        </View>
        <TouchableOpacity 
          onPress={() => setMapZoom(prev => prev === 13 ? 15 : 13)} 
          style={styles.mapTypeButton}
        >
          <Text style={styles.mapTypeIcon}>🔍</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Info Panel */}
      <InfoPanel
        busLocation={busLocation}
        eta={eta}
        isConnected={isConnected}
        onCenter={centerMap}
        onAlert={handleAlertDriver}
        colors={colors}
      />

      {/* Alert Banner */}
      {busLocation?.outsideGeofence && (
        <View style={[styles.alertBanner, { backgroundColor: colors.danger }]}>
          <Text style={styles.alertText}>⚠️ Bus outside designated zone</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapContainer: { flex: 1 },
  map: { width, height: height * 0.7 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16 },
  topBar: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    paddingTop: Platform.OS === 'ios' ? 50 : 40, 
    paddingHorizontal: 20, 
    paddingBottom: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
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
  backIcon: { fontSize: 24, color: '#fff' },
  titleContainer: { alignItems: 'center' },
  childName: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#fff', 
    textShadowColor: 'rgba(0,0,0,0.3)', 
    textShadowOffset: { width: 1, height: 1 }, 
    textShadowRadius: 3 
  },
  busNumber: { 
    fontSize: 14, 
    color: 'rgba(255,255,255,0.9)', 
    textShadowColor: 'rgba(0,0,0,0.3)', 
    textShadowOffset: { width: 1, height: 1 }, 
    textShadowRadius: 2 
  },
  mapTypeButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.3)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  mapTypeIcon: { fontSize: 20 },
  bottomPanel: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    paddingTop: 20,
    zIndex: 10
  },
  infoCard: { 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20, 
    padding: 20, 
    paddingBottom: Platform.OS === 'ios' ? 30 : 20 
  },
  infoRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    marginBottom: 15 
  },
  infoItem: { 
    alignItems: 'center' 
  },
  infoLabel: { 
    fontSize: 12, 
    marginBottom: 4 
  },
  infoValue: { 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  infoUnit: { 
    fontSize: 12, 
    fontWeight: 'normal' 
  },
  progressBar: { 
    height: 6, 
    backgroundColor: '#f0f0f0', 
    borderRadius: 3, 
    marginBottom: 20, 
    overflow: 'hidden' 
  },
  progress: { 
    height: '100%', 
    borderRadius: 3 
  },
  actionButtons: { 
    flexDirection: 'row', 
    justifyContent: 'space-around' 
  },
  actionButton: { 
    alignItems: 'center' 
  },
  actionIcon: { 
    fontSize: 22, 
    marginBottom: 4 
  },
  actionLabel: { 
    fontSize: 11 
  },
  alertBanner: { 
    position: 'absolute', 
    top: 100, 
    left: 20, 
    right: 20, 
    padding: 12, 
    borderRadius: 8, 
    alignItems: 'center', 
    elevation: 5, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 3,
    zIndex: 20
  },
  alertText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 14 
  },
});