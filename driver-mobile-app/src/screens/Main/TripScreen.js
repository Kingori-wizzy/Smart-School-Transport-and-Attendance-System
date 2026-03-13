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
  FlatList
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useTrip } from '../../context/TripContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import { COLORS } from '../../constants/config';
import { format } from 'date-fns';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

export default function TripScreen({ route, navigation }) {
  const { trip: initialTrip } = route.params;
  const { user } = useAuth();
  const { colors } = useTheme();
  const {
    activeTrip,
    tripStudents,
    loading,
    refreshing,
    fetchTripStudents,
    boardStudent,
    alightStudent,
    startTrip,
    endTrip,
    updateLocation,
    getStudentScanStatus,
    selectActiveTrip,
    refreshTrips
  } = useTrip();
  
  const [trip, setTrip] = useState(initialTrip);
  const [students, setStudents] = useState([]);
  const [location, setLocation] = useState(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    boarded: 0,
    alighted: 0,
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

  // Update when tripStudents changes from context
  useEffect(() => {
    if (tripStudents.length > 0) {
      setStudents(tripStudents);
      calculateStats(tripStudents);
    }
  }, [tripStudents]);

  const loadTripData = async () => {
    try {
      // Ensure we have a valid trip ID
      if (!trip || !trip._id) {
        throw new Error('No trip ID available');
      }

      // Select this trip as active
      selectActiveTrip(trip);
      
      // Fetch students for this trip
      await fetchTripStudents(trip._id);
      
      // Calculate stats based on students
      if (tripStudents.length > 0) {
        calculateStats(tripStudents);
      }
    } catch (error) {
      console.error('Error loading trip data:', error);
      Alert.alert('Error', 'Failed to load trip data');
    }
  };

  const calculateStats = (studentsList) => {
    const boarded = studentsList.filter(s => 
      s.status === 'boarded' || getStudentScanStatus(trip._id, s._id)?.type === 'boarding'
    ).length;
    
    const alighted = studentsList.filter(s => 
      s.status === 'alighted' || getStudentScanStatus(trip._id, s._id)?.type === 'alighting'
    ).length;
    
    setStats({
      totalStudents: studentsList.length,
      boarded,
      alighted,
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
          if (trip && trip._id) {
            updateLocation(trip._id, newLocation.coords);
          }
        }
      );
    } catch (error) {
      console.error('Error starting location tracking:', error);
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
              const result = await boardStudent(trip._id, student._id, 'manual');
              
              if (result.success) {
                const updatedStudents = students.map(s =>
                  s._id === student._id ? { ...s, status: 'boarded' } : s
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

  const handleAlightStudent = async (student) => {
    Alert.alert(
      'Alight Student',
      `Confirm ${student.firstName} ${student.lastName} has alighted?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Alighting',
          onPress: async () => {
            try {
              const result = await alightStudent(trip._id, student._id, 'manual');
              
              if (result.success) {
                const updatedStudents = students.map(s =>
                  s._id === student._id ? { ...s, status: 'alighted' } : s
                );
                setStudents(updatedStudents);
                calculateStats(updatedStudents);
                
                Alert.alert('✅ Success', `${student.firstName} alighted`);
              } else {
                Alert.alert('Error', result.message || 'Failed to record alighting');
              }
            } catch (error) {
              console.error('Error alighting student:', error);
              Alert.alert('Error', 'Failed to record alighting');
            }
          }
        },
      ]
    );
  };

  const handleStartTrip = () => {
    Alert.alert(
      'Start Trip',
      'Are you sure you want to start this trip?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Trip',
          onPress: async () => {
            const result = await startTrip(trip._id);
            if (result.success) {
              if (result.offline) {
                Alert.alert('Offline Mode', 'Trip will start when you\'re back online');
              } else {
                Alert.alert('Success', 'Trip started successfully');
                // Update local trip status
                setTrip({ ...trip, status: 'ongoing' });
              }
            }
          }
        },
      ]
    );
  };

  const handleEndTrip = () => {
    if (!trip || !trip._id) {
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
              const result = await endTrip(trip._id);
              if (result.success) {
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

  const handleScanQR = () => {
    if (!trip || !trip._id) {
      Alert.alert('Error', 'No active trip found');
      return;
    }
    
    navigation.navigate('QRScan', { tripId: trip._id });
  };

  const getStudentStatus = (student) => {
    const scanStatus = getStudentScanStatus(trip._id, student._id);
    if (scanStatus) {
      return scanStatus.type === 'boarding' ? 'boarded' : 'alighted';
    }
    return student.status || 'pending';
  };

  const StudentItem = ({ student }) => {
    const status = getStudentStatus(student);
    
    return (
      <View style={[styles.studentItem, { borderBottomColor: colors.border }]}>
        <View style={styles.studentInfo}>
          <Text style={[styles.studentName, { color: colors.text }]}>
            {student.firstName} {student.lastName}
          </Text>
          <Text style={[styles.studentDetails, { color: colors.textSecondary }]}>
            Class: {student.classLevel} | ID: {student.admissionNumber}
          </Text>
          {student.transportDetails?.pickupPoint?.name && (
            <Text style={[styles.studentDetails, { color: colors.textSecondary }]}>
              Pickup: {student.transportDetails.pickupPoint.name}
            </Text>
          )}
        </View>
        
        <View style={styles.studentActions}>
          {status === 'boarded' ? (
            <View style={[styles.statusBadge, { backgroundColor: colors.success }]}>
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={styles.statusBadgeText}>Boarded</Text>
            </View>
          ) : status === 'alighted' ? (
            <View style={[styles.statusBadge, { backgroundColor: colors.warning }]}>
              <Ionicons name="flag" size={16} color="#fff" />
              <Text style={styles.statusBadgeText}>Alighted</Text>
            </View>
          ) : (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={() => handleBoardStudent(student)}
              >
                <Ionicons name="log-in-outline" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Board</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.warning }]}
                onPress={() => handleAlightStudent(student)}
              >
                <Ionicons name="log-out-outline" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Alight</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

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
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{trip?.route?.name || trip?.routeName || 'Trip'}</Text>
          <TouchableOpacity onPress={handleEmergency} style={styles.emergencyButton}>
            <Ionicons name="alert-circle" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.tripMeta}>
          <Text style={styles.tripMetaText}>
            {trip?.type === 'morning_pickup' ? '🌅 Morning' : '🌆 Evening'} Trip
          </Text>
          <Text style={styles.tripMetaText}>
            Bus: {trip?.bus?.busNumber || trip?.busNumber || 'N/A'}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshTrips} />}
      >
        {/* Trip Progress */}
        <View style={[styles.progressCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.progressTitle, { color: colors.text }]}>Trip Progress</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${stats.progress}%`, backgroundColor: colors.primary }]} />
          </View>
          <View style={styles.progressStats}>
            <Text style={[styles.progressStat, { color: colors.textSecondary }]}>
              📊 Boarded: {stats.boarded}/{stats.totalStudents}
            </Text>
            <Text style={[styles.progressStat, { color: colors.textSecondary }]}>
              🚩 Alighted: {stats.alighted}
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
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Start Time:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {trip?.scheduledStartTime ? format(new Date(trip.scheduledStartTime), 'HH:mm') : 'N/A'}
            </Text>
          </View>
          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>End Time:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {trip?.scheduledEndTime ? format(new Date(trip.scheduledEndTime), 'HH:mm') : 'N/A'}
            </Text>
          </View>
          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Status:</Text>
            <View style={[styles.statusChip, { 
              backgroundColor: trip?.status === 'ongoing' ? colors.success : 
                             trip?.status === 'scheduled' ? colors.warning : 
                             colors.textSecondary 
            }]}>
              <Text style={styles.statusChipText}>{trip?.status || 'scheduled'}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.mainActionButton, { backgroundColor: colors.primary }]}
            onPress={handleScanQR}
          >
            <Ionicons name="qr-code-outline" size={24} color="#fff" />
            <Text style={styles.mainActionText}>Scan QR</Text>
          </TouchableOpacity>

          {trip?.status === 'scheduled' && (
            <TouchableOpacity
              style={[styles.mainActionButton, { backgroundColor: colors.success }]}
              onPress={handleStartTrip}
            >
              <Ionicons name="play" size={24} color="#fff" />
              <Text style={styles.mainActionText}>Start Trip</Text>
            </TouchableOpacity>
          )}

          {trip?.status === 'ongoing' && (
            <TouchableOpacity
              style={[styles.mainActionButton, { backgroundColor: colors.danger }]}
              onPress={handleEndTrip}
            >
              <Ionicons name="stop" size={24} color="#fff" />
              <Text style={styles.mainActionText}>End Trip</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Students List */}
        <View style={[styles.studentsCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.studentsTitle, { color: colors.text }]}>
            Students ({stats.totalStudents})
          </Text>
          
          {students.length > 0 ? (
            students.map(student => (
              <StudentItem key={student._id} student={student} />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={50} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No students assigned to this trip
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16 },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', flex: 1, textAlign: 'center' },
  emergencyButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(244,67,54,0.3)', justifyContent: 'center', alignItems: 'center' },
  tripMeta: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 5 },
  tripMetaText: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  progressCard: { margin: 15, padding: 15, borderRadius: 10, elevation: 2 },
  progressTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  progressBar: { height: 10, backgroundColor: '#f0f0f0', borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%' },
  progressStats: { marginTop: 10, gap: 5 },
  progressStat: { fontSize: 13 },
  detailsCard: { margin: 15, marginTop: 0, padding: 15, borderRadius: 10, elevation: 2 },
  detailsTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
  detailLabel: { fontSize: 14 },
  detailValue: { fontSize: 14, fontWeight: '500' },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusChipText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-around', marginHorizontal: 15, marginBottom: 15 },
  mainActionButton: { flex: 1, marginHorizontal: 5, padding: 15, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  mainActionText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  studentsCard: { margin: 15, marginTop: 0, padding: 15, borderRadius: 10, elevation: 2 },
  studentsTitle: { fontSize: 16, fontWeight: '600', marginBottom: 15 },
  studentItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '500', marginBottom: 2 },
  studentDetails: { fontSize: 12, marginBottom: 2 },
  studentActions: { marginLeft: 10 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, gap: 4 },
  statusBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  actionButtons: { flexDirection: 'row', gap: 5 },
  actionButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, gap: 4 },
  actionButtonText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30 },
  emptyText: { marginTop: 10, fontSize: 14, textAlign: 'center' },
});