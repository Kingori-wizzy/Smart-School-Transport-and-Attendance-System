import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-native-leaflet-kit';
import * as Location from 'expo-location';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import { WebView } from 'react-native-webview';

const { width, height } = Dimensions.get('window');

export default function OSMNavigationScreen({ route, navigation }) {
  const { colors, isDarkMode } = useTheme();
  const { trip, students = [] } = route.params || {};
  
  const [currentLocation, setCurrentLocation] = useState(null);
  const [remainingStudents, setRemainingStudents] = useState([]);
  const [nextStudent, setNextStudent] = useState(null);
  const [routeGeometry, setRouteGeometry] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mapKey, setMapKey] = useState(Date.now());
  
  const mapRef = useRef(null);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (students.length > 0) {
      const unboarded = students.filter(s => !s.boarded);
      setRemainingStudents(unboarded);
      if (unboarded.length > 0) {
        setNextStudent(unboarded[0]);
      }
    }
  }, [students]);

  useEffect(() => {
    if (currentLocation && nextStudent) {
      calculateRoute(currentLocation, {
        lat: nextStudent.latitude || -1.2864,
        lng: nextStudent.longitude || 36.8172,
      });
    }
  }, [currentLocation, nextStudent]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for navigation');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setCurrentLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
      setIsLoading(false);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get current location');
      setIsLoading(false);
    }
  };

  const calculateRoute = async (start, end) => {
    try {
      // Using OSRM (Open Source Routing Machine) - completely free
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`
      );
      
      const data = await response.json();
      
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        // Convert GeoJSON coordinates to [lat, lng] format for leaflet-kit
        const coordinates = data.routes[0].geometry.coordinates.map(coord => ({
          lat: coord[1],
          lng: coord[0]
        }));
        
        setRouteGeometry(coordinates);
        
        // Force map to re-render with new route
        setMapKey(Date.now());
      }
    } catch (error) {
      console.error('Error calculating route:', error);
    }
  };

  const handleStudentPress = (student) => {
    Alert.alert(
      `${student.firstName || ''} ${student.lastName || ''}`,
      `Class: ${student.classLevel || 'N/A'}\nPickup: ${student.pickupPoint || 'Not set'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Get Directions',
          onPress: async () => {
            if (currentLocation) {
              await calculateRoute(currentLocation, {
                lat: student.latitude || -1.2864,
                lng: student.longitude || 36.8172,
              });
            }
          }
        },
        { text: 'Mark Boarded', onPress: () => markAsBoarded(student) }
      ]
    );
  };

  const markAsBoarded = async (student) => {
    try {
      if (!trip?.id) return;
      
      const result = await api.trip.boardStudent(trip.id, student.id, 'manual');
      
      if (result.success || result.data?.success) {
        const updated = remainingStudents.filter(s => s.id !== student.id);
        setRemainingStudents(updated);
        setRouteGeometry([]); // Clear route
        if (updated.length > 0) {
          setNextStudent(updated[0]);
        } else {
          setNextStudent(null);
        }
        Alert.alert('✅ Success', `${student.firstName} boarded`);
      }
    } catch (error) {
      console.error('Error boarding student:', error);
      Alert.alert('Error', 'Failed to mark as boarded');
    }
  };

  // Prepare markers for the map
  const markers = [
    // Current location marker
    currentLocation && {
      id: 'current-location',
      position: { lat: currentLocation.lat, lng: currentLocation.lng },
      title: 'Your Location',
      description: 'You are here',
      icon: '📍',
    },
    // Student markers
    ...remainingStudents.map((student, index) => ({
      id: student.id,
      position: { 
        lat: student.latitude || -1.2864 + (Math.random() * 0.01), 
        lng: student.longitude || 36.8172 + (Math.random() * 0.01) 
      },
      title: `${student.firstName} ${student.lastName}`,
      description: `${student.classLevel || 'N/A'} • ${student.pickupPoint || 'Pickup'}`,
      icon: '👤',
    })),
  ].filter(Boolean);

  const StudentListItem = ({ student }) => (
    <TouchableOpacity
      style={[styles.studentListItem, { backgroundColor: colors.card }]}
      onPress={() => handleStudentPress(student)}
    >
      <View style={[styles.studentListAvatar, { backgroundColor: colors.primary }]}>
        <Text style={styles.studentListAvatarText}>
          {student.firstName?.charAt(0)}{student.lastName?.charAt(0)}
        </Text>
      </View>
      <View style={styles.studentListInfo}>
        <Text style={[styles.studentListName, { color: colors.text }]}>
          {student.firstName || ''} {student.lastName || ''}
        </Text>
        <Text style={[styles.studentListClass, { color: colors.textSecondary }]}>
          {student.pickupPoint || 'Pickup not set'}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.navigateButton, { backgroundColor: colors.primary }]}
        onPress={() => handleStudentPress(student)}
      >
        <Text style={styles.navigateButtonText}>🚗</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (isLoading || !currentLocation) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 10 }}>Getting your location...</Text>
      </View>
    );
  }

  // Map configuration
  const mapOptions = {
    center: { lat: currentLocation.lat, lng: currentLocation.lng },
    zoom: 13,
    minZoom: 5,
    maxZoom: 19,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Navigation</Text>
        <TouchableOpacity 
          onPress={() => setMapKey(Date.now())} 
          style={styles.fitButton}
        >
          <Text style={styles.fitButtonIcon}>🔄</Text>
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.mapContainer}>
        <MapContainer
          key={mapKey}
          ref={mapRef}
          center={mapOptions.center}
          zoom={mapOptions.zoom}
          minZoom={mapOptions.minZoom}
          maxZoom={mapOptions.maxZoom}
          isDark={isDarkMode}
          style={styles.map}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {/* Current Location Marker */}
          {currentLocation && (
            <Marker
              position={{ lat: currentLocation.lat, lng: currentLocation.lng }}
              icon="📍"
              title="Your Location"
              description="You are here"
            >
              <Popup>
                <Text>Current Location</Text>
              </Popup>
            </Marker>
          )}

          {/* Student Markers */}
          {remainingStudents.map((student) => (
            <Marker
              key={student.id}
              position={{ 
                lat: student.latitude || -1.2864 + (Math.random() * 0.01), 
                lng: student.longitude || 36.8172 + (Math.random() * 0.01) 
              }}
              icon="👤"
              title={`${student.firstName} ${student.lastName}`}
              description={`${student.classLevel || ''}`}
            >
              <Popup>
                <Text>{student.firstName} {student.lastName}</Text>
                <Text>{student.pickupPoint || 'No pickup point'}</Text>
              </Popup>
            </Marker>
          ))}

          {/* Route Polyline */}
          {routeGeometry.length > 0 && (
            <Polyline
              positions={routeGeometry}
              color={colors.primary}
              weight={4}
              opacity={0.8}
            />
          )}
        </MapContainer>
      </View>

      {nextStudent && (
        <TouchableOpacity
          style={[styles.nextStudentBanner, { backgroundColor: colors.primary }]}
          onPress={() => {
            if (currentLocation && nextStudent) {
              calculateRoute(currentLocation, {
                lat: nextStudent.latitude || -1.2864,
                lng: nextStudent.longitude || 36.8172,
              });
            }
          }}
        >
          <Text style={styles.nextStudentText}>
            Next: {nextStudent.firstName || ''} {nextStudent.lastName || ''}
          </Text>
          <Text style={styles.nextStudentArrow}>→</Text>
        </TouchableOpacity>
      )}

      <View style={[styles.studentList, { backgroundColor: colors.card }]}>
        <Text style={[styles.studentListTitle, { color: colors.text }]}>
          Remaining Students ({remainingStudents.length})
        </Text>
        <FlatList
          data={remainingStudents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <StudentListItem student={item} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.studentListContent}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', padding: 20, color: colors.textSecondary }}>
              All students boarded! Trip complete.
            </Text>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 40,
    paddingBottom: 15,
    paddingHorizontal: 20,
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
  backIcon: { fontSize: 24, color: '#fff' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  fitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fitButtonIcon: { fontSize: 18, color: '#fff' },
  mapContainer: { height: 350 },
  map: { flex: 1 },
  nextStudentBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    margin: 15,
    borderRadius: 10,
  },
  nextStudentText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  nextStudentArrow: { color: '#fff', fontSize: 20 },
  studentList: {
    flex: 1,
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 10,
    paddingTop: 10,
  },
  studentListTitle: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  studentListContent: { paddingBottom: 10 },
  studentListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginHorizontal: 10,
    marginBottom: 8,
    borderRadius: 8,
  },
  studentListAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  studentListAvatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  studentListInfo: { flex: 1 },
  studentListName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  studentListClass: { fontSize: 11 },
  navigateButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navigateButtonText: { color: '#fff', fontSize: 18 },
});