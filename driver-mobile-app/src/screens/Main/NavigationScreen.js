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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-native-leaflet-kit';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import locationService from '../../services/location';

const { width, height } = Dimensions.get('window');

// Helper function to get coordinates from student object
const getStudentCoordinates = (student) => {
  if (student.coordinates) {
    return {
      lat: student.coordinates.lat,
      lng: student.coordinates.lng,
    };
  }
  if (student.location) {
    return {
      lat: student.location.lat,
      lng: student.location.lng,
    };
  }
  if (student.latitude !== undefined && student.longitude !== undefined) {
    return {
      lat: student.latitude,
      lng: student.longitude,
    };
  }
  return { lat: -1.2864, lng: 36.8172 };
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
  const [routeGeometry, setRouteGeometry] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [mapKey, setMapKey] = useState(Date.now());
  
  const locationUnsubscribeRef = useRef(null);
  const intervalRef = useRef(null);
  const isMounted = useRef(true);

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
    
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`
      );
      
      const data = await response.json();
      
      if (data.code === 'Ok' && data.routes && data.routes.length > 0 && isMounted.current) {
        const coordinates = data.routes[0].geometry.coordinates.map(coord => ({
          lat: coord[1],
          lng: coord[0]
        }));
        setRouteGeometry(coordinates);
      } else {
        setRouteGeometry([]);
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      setRouteGeometry([]);
    }
  }, []);

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
          lat: initialLocation.latitude,
          lng: initialLocation.longitude,
        });
      }
      
      // Subscribe to location updates
      const unsubscribe = locationService.addListener((location) => {
        if (isMounted.current) {
          setCurrentLocation({
            lat: location.latitude,
            lng: location.longitude,
          });
          
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

    const unboarded = students.filter(s => !s.boarded);
    setRemainingStudents(unboarded);
    
    if (unboarded.length > 0) {
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
      
      // Clean up location listener
      if (locationUnsubscribeRef.current) {
        locationUnsubscribeRef.current();
        locationUnsubscribeRef.current = null;
      }
      
      // Clear interval
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
      calculateRoute(currentLocation, coords);
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
            if (currentLocation) {
              calculateRoute(currentLocation, coords);
              setMapKey(Date.now());
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
          lat: currentLocation.lat,
          lng: currentLocation.lng
        } : null,
        timestamp: new Date().toISOString()
      });
      
      if (response.data?.success && isMounted.current) {
        // Update local state
        const updatedStudents = students.map(s => 
          (s._id === studentId || s.id === studentId) 
            ? { ...s, boarded: true, status: 'boarded' } 
            : s
        );
        setStudents(updatedStudents);
        
        Alert.alert('✅ Success', `${student.firstName} marked as boarded`);
        
        // Clear route and refresh
        setRouteGeometry([]);
        setMapKey(Date.now());
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
      calculateRoute(currentLocation, coords);
    }
    setMapKey(Date.now());
    setRefreshing(false);
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
            if (currentLocation) {
              calculateRoute(currentLocation, coords);
              setMapKey(Date.now());
            }
          }}
        >
          <Text style={styles.navigateButtonText}>🚗</Text>
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

  const mapOptions = {
    center: currentLocation ? { lat: currentLocation.lat, lng: currentLocation.lng } : { lat: -1.2864, lng: 36.8172 },
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
          onPress={() => {
            setMapKey(Date.now());
            if (nextStudent && currentLocation) {
              const coords = getStudentCoordinates(nextStudent);
              calculateRoute(currentLocation, coords);
            }
          }} 
          style={styles.fitButton}
        >
          <Text style={styles.fitButtonIcon}>🔄</Text>
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.mapContainer}>
        <MapContainer
          key={mapKey}
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

          {remainingStudents.map((student, index) => {
            const coords = getStudentCoordinates(student);
            return (
              <Marker
                key={student._id || student.id || index}
                position={{ lat: coords.lat, lng: coords.lng }}
                icon="👤"
                title={`${student.firstName} ${student.lastName}`}
                description={`Pickup: ${student.pickupPoint || 'Not set'}`}
              >
                <Popup>
                  <Text style={{ fontWeight: 'bold' }}>{student.firstName} {student.lastName}</Text>
                  <Text>Class: {student.classLevel || 'N/A'}</Text>
                  <Text>Pickup: {student.pickupPoint || 'Not set'}</Text>
                </Popup>
              </Marker>
            );
          })}

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
              const coords = getStudentCoordinates(nextStudent);
              calculateRoute(currentLocation, coords);
              setMapKey(Date.now());
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
          <Text style={styles.nextStudentArrow}>→</Text>
        </TouchableOpacity>
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
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                🎉 All students have been boarded!
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
    borderRadius: 12,
  },
  nextStudentLabel: { color: '#fff', fontSize: 12, opacity: 0.9, marginBottom: 4 },
  nextStudentText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  nextStudentAddress: { color: '#fff', fontSize: 12, opacity: 0.8, marginTop: 2 },
  nextStudentArrow: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
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
  navigateButtonText: { color: '#fff', fontSize: 20 },
  emptyContainer: { alignItems: 'center', padding: 30 },
  emptyText: { fontSize: 16, textAlign: 'center', marginBottom: 15 },
  backToTripButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  backToTripText: { color: '#fff', fontWeight: '600' },
});