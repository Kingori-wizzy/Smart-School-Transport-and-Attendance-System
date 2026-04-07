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
  Linking,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function OSMNavigationScreen({ route, navigation }) {
  const { colors, isDarkMode } = useTheme();
  const { trip, students = [] } = route.params || {};
  
  const [currentLocation, setCurrentLocation] = useState(null);
  const [remainingStudents, setRemainingStudents] = useState([]);
  const [nextStudent, setNextStudent] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [directions, setDirections] = useState([]);
  
  const mapRef = useRef(null);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (students.length > 0) {
      const unboarded = students.filter(s => !s.boarded && !s.alighted);
      setRemainingStudents(unboarded);
      if (unboarded.length > 0) {
        setNextStudent(unboarded[0]);
      }
    }
  }, [students]);

  useEffect(() => {
    if (currentLocation && nextStudent && nextStudent.pickupCoordinates) {
      calculateRoute(currentLocation, nextStudent.pickupCoordinates);
    }
  }, [currentLocation, nextStudent]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for navigation');
        setIsLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setIsLoading(false);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get current location');
      setIsLoading(false);
    }
  };

  const calculateRoute = async (start, end) => {
    if (!start || !end) return;
    
    setIsCalculating(true);
    try {
      // Using OSRM (Open Source Routing Machine)
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson&steps=true`
      );
      
      const data = await response.json();
      
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        
        // Convert GeoJSON coordinates to format for react-native-maps
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
        
        // Fit map to show entire route
        if (mapRef.current && coordinates.length > 0) {
          mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true
          });
        }
      }
    } catch (error) {
      console.error('Error calculating route:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const openExternalNavigation = (destination) => {
    const url = Platform.select({
      ios: `http://maps.apple.com/?daddr=${destination.latitude},${destination.longitude}`,
      android: `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}&travelmode=driving`
    });
    
    Linking.openURL(url).catch(err => {
      console.error('Error opening maps:', err);
      Alert.alert('Error', 'Could not open maps application');
    });
  };

  const handleStudentPress = (student) => {
    Alert.alert(
      `${student.firstName || ''} ${student.lastName || ''}`,
      `Class: ${student.classLevel || 'N/A'}\nPickup: ${student.pickupPoint || 'Not set'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Get Directions',
          onPress: () => {
            if (student.pickupCoordinates) {
              openExternalNavigation(student.pickupCoordinates);
            } else {
              Alert.alert('Error', 'No pickup location set for this student');
            }
          }
        },
        {
          text: 'Calculate Route',
          onPress: () => {
            if (currentLocation && student.pickupCoordinates) {
              calculateRoute(currentLocation, student.pickupCoordinates);
            }
          }
        },
        { text: 'Mark Boarded', onPress: () => markAsBoarded(student) }
      ]
    );
  };

  const markAsBoarded = async (student) => {
    try {
      if (!trip?._id) return;
      
      const response = await api.post(`/driver/trips/${trip._id}/board/${student._id}`, {
        method: 'manual',
        timestamp: new Date().toISOString()
      });
      
      if (response.data.success) {
        const updated = remainingStudents.filter(s => s._id !== student._id);
        setRemainingStudents(updated);
        setRouteCoordinates([]);
        setDirections([]);
        
        if (updated.length > 0) {
          setNextStudent(updated[0]);
        } else {
          setNextStudent(null);
          Alert.alert('Success', 'All students have been boarded!');
        }
        
        Alert.alert('Success', `${student.firstName} ${student.lastName} boarded. Parent notified.`);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to mark as boarded');
      }
    } catch (error) {
      console.error('Error boarding student:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to mark as boarded');
    }
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
        onPress={() => {
          if (student.pickupCoordinates) {
            openExternalNavigation(student.pickupCoordinates);
          } else {
            Alert.alert('Error', 'No pickup location set');
          }
        }}
      >
        <Ionicons name="navigate" size={20} color="#fff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const DirectionsList = () => (
    <View style={[styles.directionsContainer, { backgroundColor: colors.card }]}>
      <Text style={[styles.directionsTitle, { color: colors.text }]}>
        Turn-by-Turn Directions
      </Text>
      <FlatList
        data={directions}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item, index }) => (
          <View style={[styles.directionItem, { borderBottomColor: colors.border }]}>
            <View style={styles.directionNumber}>
              <Text style={[styles.directionNumberText, { color: colors.primary }]}>
                {index + 1}
              </Text>
            </View>
            <View style={styles.directionContent}>
              <Text style={[styles.directionInstruction, { color: colors.text }]}>
                {item.instruction}
              </Text>
              <Text style={[styles.directionDistance, { color: colors.textSecondary }]}>
                {item.distance < 1000 
                  ? `${Math.round(item.distance)} m` 
                  : `${(item.distance / 1000).toFixed(1)} km`}
              </Text>
            </View>
          </View>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 10 }}
      />
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 10 }}>Getting your location...</Text>
      </View>
    );
  }

  if (!currentLocation) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text, textAlign: 'center', padding: 20 }}>
          Unable to get your location. Please check GPS settings.
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={getCurrentLocation}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
          initialRegion={currentLocation}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsTraffic={true}
        >
          {/* Current Location Marker */}
          <Marker
            coordinate={currentLocation}
            title="Your Location"
            description="You are here"
            pinColor={colors.primary}
          >
            <View style={[styles.currentLocationMarker, { backgroundColor: colors.primary }]}>
              <View style={styles.currentLocationInner} />
            </View>
          </Marker>

          {/* Student Markers */}
          {remainingStudents.map((student) => (
            student.pickupCoordinates && (
              <Marker
                key={student._id}
                coordinate={student.pickupCoordinates}
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
            )
          ))}

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

      {nextStudent && (
        <TouchableOpacity
          style={[styles.nextStudentBanner, { backgroundColor: colors.primary }]}
          onPress={() => {
            if (currentLocation && nextStudent.pickupCoordinates) {
              calculateRoute(currentLocation, nextStudent.pickupCoordinates);
            }
          }}
        >
          <View>
            <Text style={styles.nextStudentText}>
              Next: {nextStudent.firstName || ''} {nextStudent.lastName || ''}
            </Text>
            <Text style={styles.nextStudentLocation}>
              {nextStudent.pickupPoint || 'Pickup location'}
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={24} color="#fff" />
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
            Remaining Students ({remainingStudents.length})
          </Text>
          {routeCoordinates.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setRouteCoordinates([]);
                setDirections([]);
              }}
            >
              <Text style={[styles.clearRouteText, { color: colors.error || '#f44336' }]}>
                Clear Route
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        <FlatList
          data={remainingStudents}
          keyExtractor={(item) => item._id}
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

      {/* Directions Panel */}
      {directions.length > 0 && (
        <View style={styles.directionsPanel}>
          <TouchableOpacity
            style={[styles.closeDirectionsButton, { backgroundColor: colors.card }]}
            onPress={() => setDirections([])}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <DirectionsList />
        </View>
      )}
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
  currentLocationMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentLocationInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
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
    borderRadius: 10,
  },
  nextStudentText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  nextStudentLocation: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  calculatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calculatingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  studentList: {
    flex: 1,
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 10,
    paddingTop: 10,
  },
  studentListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  studentListTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  clearRouteText: {
    fontSize: 12,
    fontWeight: '500',
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
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  directionsPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '50%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  closeDirectionsButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 35,
    height: 35,
    borderRadius: 17.5,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  directionsContainer: {
    padding: 15,
    paddingTop: 40,
    maxHeight: '100%',
  },
  directionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  directionItem: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
  },
  directionNumber: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  directionContent: {
    flex: 1,
    marginLeft: 10,
  },
  directionInstruction: {
    fontSize: 14,
    marginBottom: 4,
  },
  directionDistance: {
    fontSize: 12,
  },
});