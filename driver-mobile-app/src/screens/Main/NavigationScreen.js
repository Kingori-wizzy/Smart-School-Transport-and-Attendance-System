import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
  FlatList,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const { width } = Dimensions.get('window');

const StudentMarker = ({ student, onPress, colors }) => (
  <Marker
    coordinate={{
      latitude: student.latitude || -1.2864,
      longitude: student.longitude || 36.8172,
    }}
    onPress={() => onPress(student)}
  >
    <View style={[styles.studentMarker, { backgroundColor: student.boarded ? '#4CAF50' : colors.primary }]}>
      <Text style={styles.studentMarkerText}>
        {student.firstName?.charAt(0)}{student.lastName?.charAt(0)}
      </Text>
    </View>
  </Marker>
);

export default function NavigationScreen({ route, navigation }) {
  // 🛡️ CRITICAL FIX: Provide default values to prevent 'undefined' errors
  const { colors } = useTheme();
  const { driver } = useAuth();
  const { trip, students = [] } = route.params || {};

  const mapRef = useRef(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [remainingStudents, setRemainingStudents] = useState([]);
  const [nextStudent, setNextStudent] = useState(null);

  // Log received data for debugging
  useEffect(() => {
    console.log('🚀 NavigationScreen mounted');
    console.log('📦 Received trip:', trip?.id);
    console.log('📦 Received students count:', students?.length);
  }, []);

  useEffect(() => {
    startLocationTracking();
  }, []);

  // Update remaining students whenever the student list changes
  useEffect(() => {
    updateRemainingStudents();
  }, [students]);

  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required for navigation');
        return;
      }

      await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (location) => {
          setCurrentLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      );
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  };

  const updateRemainingStudents = () => {
    // ✅ FIX: Safely handle the students array
    if (!Array.isArray(students)) {
      console.log('⚠️ Students is not an array:', students);
      setRemainingStudents([]);
      setNextStudent(null);
      return;
    }

    const unboarded = students.filter(s => !s.boarded);
    console.log(`📊 Unboarded students: ${unboarded.length}`);
    setRemainingStudents(unboarded);
    
    if (unboarded.length > 0) {
      setNextStudent(unboarded[0]);
    } else {
      setNextStudent(null);
    }
  };

  const handleStudentPress = (student) => {
    Alert.alert(
      `${student.firstName || ''} ${student.lastName || ''}`,
      `Class: ${student.classLevel || 'N/A'}\nPickup: ${student.pickupPoint || 'Not set'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Navigate',
          onPress: () => {
            // Launch Google Maps for actual turn-by-turn directions
            const url = `https://www.google.com/maps/dir/?api=1&destination=${student.latitude || -1.2864},${student.longitude || 36.8172}`;
            Linking.openURL(url);
          }
        },
        { text: 'Mark as Boarded', onPress: () => markAsBoarded(student) }
      ]
    );
  };

  const markAsBoarded = async (student) => {
    try {
      if (!trip?.id) {
        Alert.alert('Error', 'No active trip found');
        return;
      }

      const result = await api.trip.boardStudent(trip.id, student.id, 'manual');
      
      if (result.success || result.data?.success) {
        // Update local state to reflect boarding
        const updatedRemaining = remainingStudents.filter(s => s.id !== student.id);
        setRemainingStudents(updatedRemaining);
        
        if (updatedRemaining.length > 0) {
          setNextStudent(updatedRemaining[0]);
        } else {
          setNextStudent(null);
        }

        Alert.alert('✅ Success', `${student.firstName} marked as boarded`);
      } else {
        Alert.alert('Error', result.message || 'Failed to mark student as boarded');
      }
    } catch (error) {
      console.error('Error boarding student:', error);
      Alert.alert('Error', 'Failed to mark student as boarded');
    }
  };

  const navigateToNext = () => {
    if (nextStudent) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${nextStudent.latitude || -1.2864},${nextStudent.longitude || 36.8172}`;
      Linking.openURL(url);
    } else {
      Alert.alert('All Done!', 'All students have been boarded.');
    }
  };

  const fitToMarkers = () => {
    if (mapRef.current && remainingStudents.length > 0) {
      const coordinates = remainingStudents.map(s => ({
        latitude: s.latitude || -1.2864,
        longitude: s.longitude || 36.8172,
      }));

      if (currentLocation) {
        coordinates.unshift(currentLocation);
      }

      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
        animated: true,
      });
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
          {student.classLevel || 'N/A'} • {student.pickupPoint || 'Pickup not set'}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.navigateButton, { backgroundColor: colors.primary }]}
        onPress={() => {
          const url = `https://www.google.com/maps/dir/?api=1&destination=${student.latitude || -1.2864},${student.longitude || 36.8172}`;
          Linking.openURL(url);
        }}
      >
        <Text style={styles.navigateButtonText}>🚗</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // If no trip data, show an error
  if (!trip) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text }}>No trip data available</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Navigation</Text>
        <TouchableOpacity onPress={fitToMarkers} style={styles.fitButton}>
          <Text style={styles.fitButtonIcon}>📍</Text>
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.mapContainer}>
        {currentLocation && (
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            {remainingStudents.map((student) => (
              <StudentMarker
                key={student.id}
                student={student}
                onPress={handleStudentPress}
                colors={colors}
              />
            ))}
          </MapView>
        )}
      </View>

      {nextStudent && (
        <TouchableOpacity
          style={[styles.nextStudentBanner, { backgroundColor: colors.primary }]}
          onPress={navigateToNext}
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
  mapContainer: { height: 300 },
  map: { flex: 1 },
  studentMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  studentMarkerText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
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