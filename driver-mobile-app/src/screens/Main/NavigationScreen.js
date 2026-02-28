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
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import api from '../../services/api';
import { COLORS } from '../../constants/config';
import { Audio } from 'expo-av';

const { width, height } = Dimensions.get('window');

export default function NavigationScreen({ route, navigation }) {
  const { trip } = route.params;
  const mapRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [routeCoords, setRouteCoords] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [nextStop, setNextStop] = useState(null);
  const [distanceToNext, setDistanceToNext] = useState(null);
  const [eta, setEta] = useState(null);
  const [sound, setSound] = useState();

  useEffect(() => {
    loadRouteData();
    startNavigation();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const loadRouteData = async () => {
    try {
      const response = await api.get(`/driver/route/${trip.routeId}/coordinates`);
      setRouteCoords(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading route:', error);
      Alert.alert('Error', 'Failed to load route');
    }
  };

  const startNavigation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission required');
        return;
      }

      await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 10,
        },
        handleLocationUpdate
      );
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const handleLocationUpdate = (location) => {
    setCurrentLocation(location.coords);
    calculateNextStop(location.coords);
    updateMapRegion(location.coords);
  };

  const calculateNextStop = (coords) => {
    if (!routeCoords.length) return;

    // Find the next stop based on current position
    let minDistance = Infinity;
    let nextStopIndex = -1;

    routeCoords.forEach((stop, index) => {
      const distance = calculateDistance(
        coords.latitude,
        coords.longitude,
        stop.latitude,
        stop.longitude
      );
      
      if (distance < minDistance && distance > 50) { // 50 meters threshold
        minDistance = distance;
        nextStopIndex = index;
      }
    });

    if (nextStopIndex !== -1) {
      setNextStop({
        ...routeCoords[nextStopIndex],
        index: nextStopIndex + 1,
        distance: Math.round(minDistance),
      });
      
      // Calculate ETA (assuming average speed 30 km/h)
      const etaMinutes = Math.round((minDistance / 1000) / 30 * 60);
      setEta(etaMinutes);

      // Speak navigation instruction
      speakInstruction(nextStopIndex);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const speakInstruction = async (stopIndex) => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://your-server.com/audio/approach-stop.mp3' },
        { shouldPlay: true }
      );
      setSound(sound);
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const updateMapRegion = (coords) => {
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  const centerMap = () => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading navigation...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: currentLocation?.latitude || -1.2864,
          longitude: currentLocation?.longitude || 36.8172,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
      >
        {/* Route Polyline */}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={COLORS.primary}
            strokeWidth={4}
          />
        )}

        {/* Stop Markers */}
        {routeCoords.map((stop, index) => (
          <Marker
            key={index}
            coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
            title={`Stop ${index + 1}`}
            description={stop.name}
          >
            <View style={[styles.stopMarker, index === 0 && styles.firstStop]}>
              <Text style={styles.stopMarkerText}>{index + 1}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Navigation Header */}
      <LinearGradient colors={['rgba(0,0,0,0.7)', 'transparent']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Navigation</Text>
        <TouchableOpacity onPress={centerMap} style={styles.centerButton}>
          <Text style={styles.centerIcon}>🎯</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Navigation Instructions */}
      {nextStop && (
        <View style={styles.instructionCard}>
          <Text style={styles.instructionTitle}>Next Stop</Text>
          <Text style={styles.instructionStop}>Stop {nextStop.index}</Text>
          <View style={styles.instructionDetails}>
            <Text style={styles.instructionDistance}>📏 {nextStop.distance}m</Text>
            <Text style={styles.instructionEta}>⏱️ {eta} min</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width, height },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  header: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 50, paddingHorizontal: 20, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 24, color: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  centerButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  centerIcon: { fontSize: 20 },
  instructionCard: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: '#fff', borderRadius: 15, padding: 20, elevation: 5 },
  instructionTitle: { fontSize: 12, color: '#999', marginBottom: 4 },
  instructionStop: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  instructionDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  instructionDistance: { fontSize: 16, color: COLORS.primary, fontWeight: '600' },
  instructionEta: { fontSize: 16, color: '#FF9800', fontWeight: '600' },
  stopMarker: { backgroundColor: COLORS.primary, width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  firstStop: { backgroundColor: '#4CAF50' },
  stopMarkerText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
});