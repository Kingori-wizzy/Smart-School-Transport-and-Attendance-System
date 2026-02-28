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
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { COLORS } from '../../constants/config';
import { format } from 'date-fns';
import * as Location from 'expo-location';

export default function TripScreen({ route, navigation }) {
  const { trip: initialTrip } = route.params;
  const { endTrip } = useAuth();
  
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

  useEffect(() => {
    loadTripData();
    startLocationTracking();
    setupSocketListeners();

    return () => {
      stopLocationTracking();
    };
  }, []);

  const loadTripData = async () => {
    try {
      setLoading(true);
      const [tripRes, studentsRes] = await Promise.all([
        api.get(`/driver/trip/${trip.id}`),
        api.get(`/driver/trip/${trip.id}/students`)
      ]);
      
      setTrip(tripRes.data);
      setStudents(studentsRes.data);
      
      calculateStats(studentsRes.data);
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
        Alert.alert('Permission denied', 'Location permission is required');
        return;
      }

      await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
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

  const sendLocationUpdate = async (location) => {
    try {
      await api.post('/driver/gps/update', {
        tripId: trip.id,
        lat: location.coords.latitude,
        lon: location.coords.longitude,
        speed: location.coords.speed || 0,
        heading: location.coords.heading || 0,
      });
    } catch (error) {
      console.error('Error sending location:', error);
    }
  };

  const stopLocationTracking = () => {
    // Cleanup will happen automatically
  };

  const setupSocketListeners = () => {
    // Socket listeners would go here
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
              await api.post(`/driver/student/${student.id}/board`, {
                tripId: trip.id,
                timestamp: new Date().toISOString(),
              });
              
              const updatedStudents = students.map(s =>
                s.id === student.id ? { ...s, boarded: true } : s
              );
              setStudents(updatedStudents);
              calculateStats(updatedStudents);
              
              Alert.alert('Success', `${student.firstName} boarded`);
            } catch (error) {
              Alert.alert('Error', 'Failed to record boarding');
            }
          }
        },
      ]
    );
  };

  const handleEndTrip = () => {
    Alert.alert(
      'End Trip',
      'Are you sure you want to end this trip?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Trip',
          style: 'destructive',
          onPress: async () => {
            const result = await endTrip(trip.id);
            if (result.success) {
              navigation.goBack();
            } else {
              Alert.alert('Error', result.message);
            }
          }
        },
      ]
    );
  };

  const handleEmergency = () => {
    navigation.navigate('SOS', { trip });
  };

  const StudentItem = ({ student }) => (
    <View style={styles.studentItem}>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{student.firstName} {student.lastName}</Text>
        <Text style={styles.studentDetails}>Class: {student.classLevel}</Text>
        <Text style={styles.studentDetails}>Pickup: {student.pickupPoint}</Text>
      </View>
      
      {student.boarded ? (
        <View style={styles.boardedBadge}>
          <Text style={styles.boardedText}>✅ Boarded</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.boardButton}
          onPress={() => handleBoardStudent(student)}
        >
          <Text style={styles.boardButtonText}>Board</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading trip details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{trip.routeName}</Text>
          <TouchableOpacity onPress={handleEmergency} style={styles.emergencyButton}>
            <Text style={styles.emergencyIcon}>🚨</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadTripData} />}
      >
        {/* Trip Progress */}
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Trip Progress</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${stats.progress}%` }]} />
          </View>
          <View style={styles.progressStats}>
            <Text style={styles.progressStat}>📊 {stats.boarded}/{stats.totalStudents}</Text>
            <Text style={styles.progressStat}>⏱️ {format(new Date(), 'HH:mm')}</Text>
          </View>
        </View>

        {/* Trip Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Trip Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Bus:</Text>
            <Text style={styles.detailValue}>{trip.busNumber}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Route:</Text>
            <Text style={styles.detailValue}>{trip.routeName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Start Time:</Text>
            <Text style={styles.detailValue}>{trip.startTime}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>End Time:</Text>
            <Text style={styles.detailValue}>{trip.endTime}</Text>
          </View>
        </View>

        {/* Navigation Button */}
        <TouchableOpacity
          style={styles.navigationButton}
          onPress={() => navigation.navigate('Navigation', { trip })}
        >
          <LinearGradient colors={['#4CAF50', '#45a049']} style={styles.navigationGradient}>
            <Text style={styles.navigationIcon}>🗺️</Text>
            <Text style={styles.navigationText}>Start Navigation</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Students List */}
        <View style={styles.studentsCard}>
          <Text style={styles.studentsTitle}>Student List ({stats.totalStudents})</Text>
          {students.map(student => (
            <StudentItem key={student.id} student={student} />
          ))}
        </View>

        {/* End Trip Button */}
        <TouchableOpacity style={styles.endTripButton} onPress={handleEndTrip}>
          <Text style={styles.endTripText}>End Trip</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 24, color: '#fff' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  emergencyButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(244,67,54,0.3)', justifyContent: 'center', alignItems: 'center' },
  emergencyIcon: { fontSize: 20 },
  progressCard: { backgroundColor: '#fff', margin: 15, padding: 15, borderRadius: 10, elevation: 2 },
  progressTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 10 },
  progressBar: { height: 10, backgroundColor: '#f0f0f0', borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary },
  progressStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  progressStat: { fontSize: 13, color: '#666' },
  detailsCard: { backgroundColor: '#fff', margin: 15, marginTop: 0, padding: 15, borderRadius: 10, elevation: 2 },
  detailsTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  detailLabel: { fontSize: 14, color: '#666' },
  detailValue: { fontSize: 14, fontWeight: '500', color: '#333' },
  navigationButton: { margin: 15, marginTop: 0, borderRadius: 10, overflow: 'hidden' },
  navigationGradient: { flexDirection: 'row', padding: 15, alignItems: 'center', justifyContent: 'center' },
  navigationIcon: { fontSize: 20, marginRight: 8 },
  navigationText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  studentsCard: { backgroundColor: '#fff', margin: 15, marginTop: 0, padding: 15, borderRadius: 10, elevation: 2 },
  studentsTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 10 },
  studentItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '500', color: '#333', marginBottom: 2 },
  studentDetails: { fontSize: 12, color: '#666', marginBottom: 2 },
  boardedBadge: { backgroundColor: '#4CAF50', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  boardedText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  boardButton: { backgroundColor: COLORS.primary, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 6 },
  boardButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  endTripButton: { backgroundColor: '#f44336', margin: 15, padding: 15, borderRadius: 10, alignItems: 'center' },
  endTripText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});