import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
  FlatList,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import locationService from '../../services/location';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// Helper function to get coordinates from student object
const getStudentCoordinates = (student) => {
  if (student.pickupCoordinates) {
    return {
      latitude: student.pickupCoordinates.lat,
      longitude: student.pickupCoordinates.lng,
    };
  }
  if (student.coordinates) {
    return {
      latitude: student.coordinates.lat,
      longitude: student.coordinates.lng,
    };
  }
  if (student.location) {
    return {
      latitude: student.location.lat,
      longitude: student.location.lng,
    };
  }
  if (student.latitude !== undefined && student.longitude !== undefined) {
    return {
      latitude: student.latitude,
      longitude: student.longitude,
    };
  }
  return null;
};

export default function NavigationScreen({ route, navigation }) {
  const { colors, isDarkMode } = useTheme();
  const { driver } = useAuth();
  const { tripId, trip: initialTrip, students: initialStudents } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [students, setStudents] = useState(initialStudents || []);
  const [trip, setTrip] = useState(initialTrip);
  const [remainingStudents, setRemainingStudents] = useState([]);
  const [nextStudent, setNextStudent] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [directions, setDirections] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  
  const locationUnsubscribeRef = useRef(null);
  const intervalRef = useRef(null);
  const isMounted = useRef(true);
  const mapRef = useRef(null);

  // Fetch students if not passed from TripScreen
  const fetchStudents = useCallback(async () => {
    if (!tripId) return;
    
    try {
      const response = await api.get(`/driver/trips/${tripId}/students`);
      
      if (response.data?.success && isMounted.current) {
        const studentsData = response.data.data || [];
        setStudents(studentsData);
        
        const tripResponse = await api.get(`/driver/trips/${tripId}`);
        if (tripResponse.data?.success && isMounted.current) {
          setTrip(tripResponse.data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  }, [tripId]);

  // Calculate route using OSRM
  const calculateRoute = useCallback(async (start, end) => {
    if (!start || !end) return;
    
    setIsCalculating(true);
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson&steps=true`
      );
      
      const data = await response.json();
      
      if (data.code === 'Ok' && data.routes && data.routes.length > 0 && isMounted.current) {
        const route = data.routes[0];
        
        // Convert coordinates for map
        const coordinates = route.geometry.coordinates.map(coord => ({
          latitude: coord[1],
          longitude: coord[0]
        }));
        setRouteCoordinates(coordinates);
        
        // Extract turn-by-turn directions
        const steps = route.legs[0].steps.map(step => ({
          instruction: step.maneuver.instruction,
          distance: step.distance,
          duration: step.duration,
          name: step.name
        }));
        setDirections(steps);
        
        // Fit map to show route
        if (mapRef.current && coordinates.length > 0) {
          mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true
          });
        }
      } else {
        setRouteCoordinates([]);
        setDirections([]);
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      setRouteCoordinates([]);
    } finally {
      setIsCalculating(false);
    }
  }, []);

  const openExternalNavigation = (destination) => {
    if (!destination) {
      Alert.alert('Error', 'No destination location available');
      return;
    }
    
    const url = Platform.select({
      ios: `http://maps.apple.com/?daddr=${destination.latitude},${destination.longitude}`,
      android: `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}&travelmode=driving`
    });
    
    Linking.openURL(url).catch(err => {
      console.error('Error opening maps:', err);
      Alert.alert('Error', 'Could not open maps application');
    });
  };

  // Start location tracking using locationService
  const startLocationTracking = useCallback(async () => {
    try {
      const hasPermission = await locationService.requestPermissions();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Location permission is required for navigation');
        return;
      }

      // Get initial location
      const initialLocation = await locationService.getCurrentLocation();
      if (initialLocation && isMounted.current) {
        setCurrentLocation({
          latitude: initialLocation.latitude,
          longitude: initialLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
      
      // Subscribe to location updates
      const unsubscribe = locationService.addListener((location) => {
        if (isMounted.current) {
          setCurrentLocation(prev => ({
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: prev?.latitudeDelta || 0.01,
            longitudeDelta: prev?.longitudeDelta || 0.01,
          }));
          
          // Update location on server
          if (tripId) {
            api.post('/driver/gps/update', {
              tripId,
              lat: location.latitude,
              lon: location.longitude,
              speed: location.speed,
              heading: location.heading,
            }).catch(err => console.error('Error updating location:', err));
          }
        }
      });
      
      locationUnsubscribeRef.current = unsubscribe;
      
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  }, [tripId]);

  // Update remaining students based on boarded status
  const updateRemainingStudents = useCallback(() => {
    if (!Array.isArray(students) || !isMounted.current) {
      setRemainingStudents([]);
      setNextStudent(null);
      return;
    }

    const unboarded = students.filter(s => !s.boarded && !s.alighted);
    setRemainingStudents(unboarded);
    
    if (unboarded.length > 0 && getStudentCoordinates(unboarded[0])) {
      setNextStudent(unboarded[0]);
    } else {
      setNextStudent(null);
    }
  }, [students]);

  // Initial data load
  useEffect(() => {
    isMounted.current = true;
    
    const loadData = async () => {
      setLoading(true);
      
      await startLocationTracking();
      
      if (initialStudents && initialStudents.length > 0 && isMounted.current) {
        setStudents(initialStudents);
        if (initialTrip) setTrip(initialTrip);
      } else {
        await fetchStudents();
      }
      
      if (isMounted.current) {
        setLoading(false);
      }
    };
    
    loadData();
    
    // Refresh data every 30 seconds
    intervalRef.current = setInterval(() => {
      if (isMounted.current) {
        fetchStudents();
      }
    }, 30000);
    
    return () => {
      isMounted.current = false;
      
      if (locationUnsubscribeRef.current) {
        locationUnsubscribeRef.current();
        locationUnsubscribeRef.current = null;
      }
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchStudents, startLocationTracking, initialStudents, initialTrip]);

  // Update remaining students when students change
  useEffect(() => {
    updateRemainingStudents();
  }, [students, updateRemainingStudents]);

  // Calculate route to next student when current location or next student changes
  useEffect(() => {
    if (currentLocation && nextStudent && isMounted.current) {
      const coords = getStudentCoordinates(nextStudent);
      if (coords) {
        calculateRoute(currentLocation, coords);
      }
    }
  }, [currentLocation, nextStudent, calculateRoute]);

  const handleStudentPress = (student) => {
    const coords = getStudentCoordinates(student);
    
    Alert.alert(
      `${student.firstName || ''} ${student.lastName || ''}`,
      `Class: ${student.classLevel || 'N/A'}\nPickup: ${student.pickupPoint || 'Not set'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Get Directions',
          onPress: () => {
            if (currentLocation && coords) {
              calculateRoute(currentLocation, coords);
            } else if (!coords) {
              Alert.alert('Error', 'No pickup location set for this student');
            }
          }
        },
        {
          text: 'Open Maps',
          onPress: () => {
            if (coords) {
              openExternalNavigation(coords);
            } else {
              Alert.alert('Error', 'No pickup location set for this student');
            }
          }
        },
        { text: 'Mark Boarded', onPress: () => markAsBoarded(student) }
      ]
    );
  };

  const markAsBoarded = async (student) => {
    try {
      if (!tripId && !trip?.id && !trip?._id) {
        Alert.alert('Error', 'No active trip found');
        return;
      }

      const activeTripId = tripId || trip?.id || trip?._id;
      const studentId = student._id || student.id;
      
      const response = await api.post(`/driver/trips/${activeTripId}/board/${studentId}`, {
        method: 'manual',
        location: currentLocation ? {
          lat: currentLocation.latitude,
          lng: currentLocation.longitude
        } : null,
        timestamp: new Date().toISOString()
      });
      
      if (response.data?.success && isMounted.current) {
        const updatedStudents = students.map(s => 
          (s._id === studentId || s.id === studentId) 
            ? { ...s, boarded: true, status: 'boarded' } 
            : s
        );
        setStudents(updatedStudents);
        
        Alert.alert('Success', `${student.firstName} ${student.lastName} boarded. Parent notified.`);
        
        setRouteCoordinates([]);
        setDirections([]);
      } else {
        Alert.alert('Error', response.data?.message || 'Failed to mark student as boarded');
      }
    } catch (error) {
      console.error('Error boarding student:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to mark student as boarded');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStudents();
    if (currentLocation && nextStudent && isMounted.current) {
      const coords = getStudentCoordinates(nextStudent);
      if (coords) {
        calculateRoute(currentLocation, coords);
      }
    }
    setRefreshing(false);
  };

  const centerOnLocation = () => {
    if (mapRef.current && currentLocation) {
      mapRef.current.animateToRegion({
        ...currentLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  const StudentListItem = ({ student }) => {
    const coords = getStudentCoordinates(student);
    
    return (
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
            {student.classLevel || 'N/A'} • {student.pickupPoint || 'Pickup not set'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.navigateButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            if (currentLocation && coords) {
              calculateRoute(currentLocation, coords);
            } else if (!coords) {
              Alert.alert('Error', 'No pickup location set');
            }
          }}
        >
          <Ionicons name="navigate" size={20} color="#fff" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading navigation data...
        </Text>
      </View>
    );
  }

  const totalRemaining = remainingStudents.length;
  const hasValidPickup = nextStudent && getStudentCoordinates(nextStudent);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Navigation</Text>
        <TouchableOpacity onPress={centerOnLocation} style={styles.fitButton}>
          <Ionicons name="locate" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={currentLocation || { latitude: -1.2864, longitude: 36.8172, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsTraffic={true}
        >
          {/* Student Markers */}
          {remainingStudents.map((student, index) => {
            const coords = getStudentCoordinates(student);
            if (!coords) return null;
            return (
              <Marker
                key={student._id || student.id || index}
                coordinate={coords}
                title={`${student.firstName} ${student.lastName}`}
                description={student.pickupPoint || 'Pickup location'}
                pinColor="#FF9800"
              >
                <View style={styles.studentMarker}>
                  <Text style={styles.studentMarkerText}>
                    {student.firstName?.charAt(0)}{student.lastName?.charAt(0)}
                  </Text>
                </View>
              </Marker>
            );
          })}

          {/* Route Polyline */}
          {routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor={colors.primary}
              strokeWidth={4}
              lineDashPattern={[0]}
            />
          )}
        </MapView>

        {/* Center Button */}
        <TouchableOpacity
          style={[styles.centerButton, { backgroundColor: colors.card }]}
          onPress={centerOnLocation}
        >
          <Ionicons name="locate" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {nextStudent && hasValidPickup && (
        <TouchableOpacity
          style={[styles.nextStudentBanner, { backgroundColor: colors.primary }]}
          onPress={() => {
            if (currentLocation && nextStudent) {
              const coords = getStudentCoordinates(nextStudent);
              if (coords) {
                calculateRoute(currentLocation, coords);
              }
            }
          }}
        >
          <View>
            <Text style={styles.nextStudentLabel}>Next Pickup</Text>
            <Text style={styles.nextStudentText}>
              {nextStudent.firstName || ''} {nextStudent.lastName || ''}
            </Text>
            <Text style={styles.nextStudentAddress}>
              {nextStudent.pickupPoint || 'Pickup location'}
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {isCalculating && (
        <View style={styles.calculatingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.calculatingText}>Calculating route...</Text>
        </View>
      )}

      <View style={[styles.studentList, { backgroundColor: colors.card }]}>
        <View style={styles.studentListHeader}>
          <Text style={[styles.studentListTitle, { color: colors.text }]}>
            Remaining Students
          </Text>
          <Text style={[styles.studentListCount, { color: colors.primary }]}>
            {totalRemaining}
          </Text>
        </View>
        <FlatList
          data={remainingStudents}
          keyExtractor={(item, index) => item._id || item.id || index.toString()}
          renderItem={({ item }) => <StudentListItem student={item} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.studentListContent}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle" size={50} color={colors.primary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                All students have been boarded!
              </Text>
              <TouchableOpacity
                style={[styles.backToTripButton, { backgroundColor: colors.primary }]}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.backToTripText}>Back to Trip</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 14 },
  header: {
    paddingTop: 50,
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
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  fitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: { height: 350, position: 'relative' },
  map: { flex: 1 },
  centerButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  studentMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  studentMarkerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  nextStudentBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    margin: 15,
    borderRadius: 12,
  },
  nextStudentLabel: { color: '#fff', fontSize: 12, opacity: 0.9, marginBottom: 4 },
  nextStudentText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  nextStudentAddress: { color: '#fff', fontSize: 12, opacity: 0.8, marginTop: 2 },
  calculatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  calculatingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  studentList: {
    flex: 1,
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
  },
  studentListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  studentListTitle: { fontSize: 16, fontWeight: '600' },
  studentListCount: { fontSize: 18, fontWeight: 'bold' },
  studentListContent: { paddingBottom: 10 },
  studentListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 10,
    marginVertical: 4,
    borderRadius: 10,
  },
  studentListAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  studentListAvatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  studentListInfo: { flex: 1 },
  studentListName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  studentListClass: { fontSize: 12, marginBottom: 2 },
  navigateButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: { alignItems: 'center', padding: 30 },
  emptyText: { fontSize: 16, textAlign: 'center', marginBottom: 15 },
  backToTripButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  backToTripText: { color: '#fff', fontWeight: '600' },
});