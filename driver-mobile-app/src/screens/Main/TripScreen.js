import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import { COLORS } from '../../constants/config';
import { format } from 'date-fns';
import * as Location from 'expo-location';

export default function TripScreen({ route, navigation }) {
  const { trip: initialTrip } = route.params;
  const { endTrip: authEndTrip } = useAuth();
  const { colors } = useTheme();
  
  const [trip, setTrip] = useState(initialTrip);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    boarded: 0,
    remaining: 0,
    progress: 0,
  });
  const locationWatcher = useRef(null);

  useEffect(() => {
    loadTripData();
    startLocationTracking();

    return () => {
      if (locationWatcher.current) {
        locationWatcher.current.remove();
      }
    };
  }, []);

  const loadTripData = async () => {
    try {
      setLoading(true);
      
      // Ensure we have a valid trip ID
      if (!trip || !trip.id) {
        throw new Error('No trip ID available');
      }

      const [tripRes, studentsRes] = await Promise.all([
        api.driver.getTripDetails(trip.id),
        api.driver.getTripStudents(trip.id)
      ]);
      
      // Handle both response formats (with or without .data wrapper)
      const tripData = tripRes.data || tripRes;
      const studentsData = studentsRes.data || studentsRes;
      
      setTrip(tripData);
      setStudents(studentsData);
      
      calculateStats(studentsData);
    } catch (error) {
      console.error('Error loading trip data:', error);
      Alert.alert('Error', 'Failed to load trip data');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (studentsList) => {
    const boarded = studentsList.filter(s => s.boarded).length;
    setStats({
      totalStudents: studentsList.length,
      boarded,
      remaining: studentsList.length - boarded,
      progress: studentsList.length > 0 ? (boarded / studentsList.length) * 100 : 0,
    });
  };

  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      locationWatcher.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000,
          distanceInterval: 20,
        },
        (newLocation) => {
          setLocation(newLocation);
          sendLocationUpdate(newLocation);
        }
      );
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  };

  const sendLocationUpdate = async (locationData) => {
    try {
      if (!trip || !trip.id) return;
      
      await api.trip.updateLocation(
        trip.id,
        locationData.coords.latitude,
        locationData.coords.longitude,
        locationData.coords.speed || 0,
        locationData.coords.heading || 0
      );
    } catch (error) {
      console.error('Error sending location:', error);
    }
  };

  const handleBoardStudent = async (student) => {
    Alert.alert(
      'Board Student',
      `Confirm ${student.firstName} ${student.lastName} has boarded?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Boarding',
          onPress: async () => {
            try {
              // Use the correct trip.boardStudent method from api
              const result = await api.trip.boardStudent(
                trip.id, 
                student.id, 
                'manual'
              );
              
              if (result.success || result.data?.success) {
                const updatedStudents = students.map(s =>
                  s.id === student.id ? { ...s, boarded: true } : s
                );
                setStudents(updatedStudents);
                calculateStats(updatedStudents);
                
                Alert.alert('✅ Success', `${student.firstName} boarded`);
              } else {
                Alert.alert('Error', result.message || 'Failed to record boarding');
              }
            } catch (error) {
              console.error('Error boarding student:', error);
              Alert.alert('Error', 'Failed to record boarding');
            }
          }
        },
      ]
    );
  };

  const handleEndTrip = () => {
    if (!trip || !trip.id) {
      Alert.alert('Error', 'No active trip found');
      return;
    }

    Alert.alert(
      'End Trip',
      'Are you sure you want to end this trip?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Trip',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await api.trip.end(trip.id);
              if (result.success || result.data?.success) {
                Alert.alert('Success', 'Trip ended successfully');
                navigation.goBack();
              } else {
                Alert.alert('Error', result.message || 'Failed to end trip');
              }
            } catch (error) {
              console.error('Error ending trip:', error);
              Alert.alert('Error', 'Failed to end trip');
            }
          }
        },
      ]
    );
  };

  const handleEmergency = () => {
    navigation.navigate('SOS', { trip });
  };

  // ✅ Updated to navigate to OSMNavigation screen
  const handleStartNavigation = () => {
    if (!trip || !trip.id) {
      Alert.alert('Error', 'No active trip found');
      return;
    }
    
    if (students.length === 0) {
      Alert.alert('Info', 'No students to navigate to');
      return;
    }

    navigation.navigate('OSMNavigation', { 
      trip: {
        id: trip.id,
        routeName: trip.routeName,
        busNumber: trip.busNumber,
      }, 
      students: students.filter(s => !s.boarded) // Only send unboarded students
    });
  };

  const StudentItem = ({ student }) => (
    <View style={[styles.studentItem, { borderBottomColor: colors.border }]}>
      <View style={styles.studentInfo}>
        <Text style={[styles.studentName, { color: colors.text }]}>
          {student.firstName} {student.lastName}
        </Text>
        <Text style={[styles.studentDetails, { color: colors.textSecondary }]}>
          Class: {student.classLevel}
        </Text>
        <Text style={[styles.studentDetails, { color: colors.textSecondary }]}>
          Pickup: {student.pickupPoint || 'Not set'}
        </Text>
      </View>
      
      {student.boarded ? (
        <View style={[styles.boardedBadge, { backgroundColor: colors.success }]}>
          <Text style={styles.boardedText}>✅ Boarded</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.boardButton, { backgroundColor: colors.primary }]}
          onPress={() => handleBoardStudent(student)}
        >
          <Text style={styles.boardButtonText}>Board</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading trip details...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{trip?.routeName || 'Trip'}</Text>
          <TouchableOpacity onPress={handleEmergency} style={styles.emergencyButton}>
            <Text style={styles.emergencyIcon}>🚨</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadTripData} />}
      >
        {/* Trip Progress */}
        <View style={[styles.progressCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.progressTitle, { color: colors.text }]}>Trip Progress</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${stats.progress}%`, backgroundColor: colors.primary }]} />
          </View>
          <View style={styles.progressStats}>
            <Text style={[styles.progressStat, { color: colors.textSecondary }]}>
              📊 {stats.boarded}/{stats.totalStudents}
            </Text>
            <Text style={[styles.progressStat, { color: colors.textSecondary }]}>
              ⏱️ {format(new Date(), 'HH:mm')}
            </Text>
          </View>
        </View>

        {/* Trip Details */}
        <View style={[styles.detailsCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.detailsTitle, { color: colors.text }]}>Trip Details</Text>
          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Bus:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{trip?.busNumber || 'N/A'}</Text>
          </View>
          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Route:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{trip?.routeName || 'N/A'}</Text>
          </View>
          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Start Time:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{trip?.startTime || 'N/A'}</Text>
          </View>
          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>End Time:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{trip?.endTime || 'N/A'}</Text>
          </View>
        </View>

        {/* Navigation Button - Updated to OSM Navigation */}
        <TouchableOpacity
          style={styles.navigationButton}
          onPress={handleStartNavigation}
        >
          <LinearGradient colors={[colors.success, '#45a049']} style={styles.navigationGradient}>
            <Text style={styles.navigationIcon}>🗺️</Text>
            <Text style={styles.navigationText}>Start Navigation</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Students List */}
        <View style={[styles.studentsCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.studentsTitle, { color: colors.text }]}>
            Student List ({stats.totalStudents})
          </Text>
          {students.length > 0 ? (
            students.map(student => (
              <StudentItem key={student.id} student={student} />
            ))
          ) : (
            <Text style={[styles.noStudentsText, { color: colors.textSecondary }]}>
              No students assigned to this trip
            </Text>
          )}
        </View>

        {/* End Trip Button */}
        <TouchableOpacity 
          style={[styles.endTripButton, { backgroundColor: colors.danger }]} 
          onPress={handleEndTrip}
        >
          <Text style={styles.endTripText}>End Trip</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16 },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 24, color: '#fff' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', flex: 1, textAlign: 'center' },
  emergencyButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(244,67,54,0.3)', justifyContent: 'center', alignItems: 'center' },
  emergencyIcon: { fontSize: 20 },
  progressCard: { margin: 15, padding: 15, borderRadius: 10, elevation: 2 },
  progressTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  progressBar: { height: 10, backgroundColor: '#f0f0f0', borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%' },
  progressStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  progressStat: { fontSize: 13 },
  detailsCard: { margin: 15, marginTop: 0, padding: 15, borderRadius: 10, elevation: 2 },
  detailsTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1 },
  detailLabel: { fontSize: 14 },
  detailValue: { fontSize: 14, fontWeight: '500' },
  navigationButton: { margin: 15, marginTop: 0, borderRadius: 10, overflow: 'hidden' },
  navigationGradient: { flexDirection: 'row', padding: 15, alignItems: 'center', justifyContent: 'center' },
  navigationIcon: { fontSize: 20, marginRight: 8 },
  navigationText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  studentsCard: { margin: 15, marginTop: 0, padding: 15, borderRadius: 10, elevation: 2 },
  studentsTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  studentItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '500', marginBottom: 2 },
  studentDetails: { fontSize: 12, marginBottom: 2 },
  boardedBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  boardedText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  boardButton: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 6 },
  boardButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  noStudentsText: { textAlign: 'center', paddingVertical: 20 },
  endTripButton: { margin: 15, padding: 15, borderRadius: 10, alignItems: 'center' },
  endTripText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});