import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import { format } from 'date-fns';

export default function DashboardScreen({ navigation }) {
  const { driver, currentTrip, logout, fetchCurrentTrip } = useAuth();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayTrips, setTodayTrips] = useState([]);
  const [stats, setStats] = useState({
    totalTrips: 0,
    completedTrips: 0,
    totalStudents: 0,
    totalDistance: 0,
  });

  useEffect(() => {
    console.log('DashboardScreen mounted');
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('Loading dashboard data...');
      
      // Fetch today's trips
      const tripsResponse = await api.get('/driver/trips/today');
      console.log('Trips response:', tripsResponse.data);
      
      // Handle response structure
      const tripsData = tripsResponse.data?.trips || tripsResponse.data?.data || [];
      console.log('Parsed trips data:', tripsData);
      setTodayTrips(Array.isArray(tripsData) ? tripsData : []);

      // Fetch stats
      const statsResponse = await api.get('/driver/stats');
      console.log('Stats response:', statsResponse.data);
      
      const statsData = statsResponse.data?.data || statsResponse.data;
      setStats({
        totalTrips: statsData.totalTrips || 0,
        completedTrips: statsData.completedTrips || 0,
        totalStudents: statsData.totalStudents || 0,
        totalDistance: statsData.totalDistance || 0,
      });

    } catch (error) {
      console.error('Error loading dashboard:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    console.log('Refreshing...');
    setRefreshing(true);
    if (fetchCurrentTrip) await fetchCurrentTrip();
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleStartTrip = async (trip) => {
    console.log('handleStartTrip called for trip:', trip);
    Alert.alert(
      'Start Trip',
      `Start trip ${trip.routeName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: async () => {
            console.log('Starting trip:', trip._id);
            try {
              const response = await api.post(`/driver/trips/${trip._id}/start`);
              console.log('Start trip response:', response.data);
              if (response.data.success) {
                Alert.alert('Success', 'Trip started successfully');
                // Use parent navigation to navigate to Trip screen
                navigation.getParent()?.navigate('Trip', { trip: response.data.data || trip });
              } else {
                Alert.alert('Error', response.data.message || 'Failed to start trip');
              }
            } catch (error) {
              console.error('Error starting trip:', error);
              Alert.alert('Error', error.response?.data?.message || 'Failed to start trip');
            }
          }
        },
      ]
    );
  };

  const handleTripPress = (trip) => {
    console.log('Trip pressed:', trip.routeName);
    console.log('Navigation object:', navigation);
    // CRITICAL FIX: Use getParent() to access the stack navigator
    navigation.getParent()?.navigate('Trip', { trip });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '--:--';
    try {
      return format(new Date(dateString), 'HH:mm');
    } catch {
      return '--:--';
    }
  };

  const TripCard = ({ trip }) => {
    const isScheduled = trip.status === 'scheduled';
    const startTime = formatTime(trip.scheduledStartTime || trip.startTime);
    const endTime = formatTime(trip.scheduledEndTime || trip.endTime);
    const busNumber = trip.busNumber || trip.vehicleId || 'Not Assigned';
    const studentCount = trip.studentCount || trip.students?.length || 0;

    console.log('Rendering TripCard:', trip.routeName);

    return (
      <TouchableOpacity
        style={[styles.tripCard, { backgroundColor: colors.card || '#fff' }]}
        onPress={() => handleTripPress(trip)}
        activeOpacity={0.7}
      >
        <View style={styles.tripHeader}>
          <Text style={[styles.tripRoute, { color: colors.text || '#333' }]}>
            {trip.routeName || 'Unknown Route'}
          </Text>
          <View style={[styles.tripStatus, { backgroundColor: isScheduled ? '#FF9800' : '#4CAF50' }]}>
            <Text style={styles.tripStatusText}>{trip.status || 'scheduled'}</Text>
          </View>
        </View>

        <View style={styles.tripDetails}>
          <Text style={[styles.tripTime, { color: colors.textSecondary || '#666' }]}>
            Time: {startTime} - {endTime}
          </Text>
          <Text style={[styles.tripBus, { color: colors.textSecondary || '#666' }]}>
            Bus: {busNumber}
          </Text>
          <Text style={[styles.tripStudents, { color: colors.textSecondary || '#666' }]}>
            Students: {studentCount}
          </Text>
        </View>

        {isScheduled && (
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: colors.success || '#4CAF50' }]}
            onPress={() => handleStartTrip(trip)}
          >
            <Text style={styles.startButtonText}>Start Trip</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background || '#f5f5f5' }]}>
        <ActivityIndicator size="large" color={colors.primary || '#2196F3'} />
        <Text style={[styles.loadingText, { color: colors.textSecondary || '#666' }]}>
          Loading dashboard...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background || '#f5f5f5' }]}>
      <LinearGradient colors={[colors.primary || '#2196F3', colors.secondary || '#1976D2']} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Welcome,</Text>
            <Text style={styles.driverName}>{driver?.firstName} {driver?.lastName}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
        {currentTrip && (
          <TouchableOpacity 
            style={styles.activeTripBanner}
            onPress={() => handleTripPress(currentTrip)}
          >
            <Text style={styles.activeTripText}>Active Trip: {currentTrip.routeName}</Text>
            <Text style={styles.viewTripText}>View →</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary || '#2196F3']} />}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.card || '#fff' }]}>
            <Text style={[styles.statValue, { color: colors.primary || '#2196F3' }]}>{stats.totalTrips}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary || '#666' }]}>Total Trips</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card || '#fff' }]}>
            <Text style={[styles.statValue, { color: colors.primary || '#2196F3' }]}>{stats.completedTrips}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary || '#666' }]}>Completed</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card || '#fff' }]}>
            <Text style={[styles.statValue, { color: colors.primary || '#2196F3' }]}>{stats.totalStudents}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary || '#666' }]}>Students</Text>
          </View>
        </View>

        {/* Today's Trips Section */}
        <Text style={[styles.sectionTitle, { color: colors.text || '#333' }]}>Today's Trips</Text>
        {todayTrips.length > 0 ? (
          todayTrips.map(trip => <TripCard key={trip._id || trip.id} trip={trip} />)
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.noTripsText, { color: colors.textSecondary || '#666' }]}>
              No trips scheduled for today
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16 },
  header: { 
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTop: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 15
  },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  driverName: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginTop: 2 },
  logoutButton: { 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    borderRadius: 20 
  },
  logoutText: { fontSize: 14, color: '#fff', fontWeight: '500' },
  activeTripBanner: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    padding: 12,
    borderRadius: 12,
    marginTop: 10
  },
  activeTripText: { color: '#fff', fontSize: 14, fontWeight: '500', flex: 1 },
  viewTripText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  scrollContent: { 
    paddingBottom: 30,
    paddingTop: 10
  },
  statsContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginHorizontal: 15,
    marginBottom: 20,
    gap: 10
  },
  statCard: { 
    padding: 15, 
    borderRadius: 12, 
    alignItems: 'center', 
    flex: 1, 
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statValue: { fontSize: 24, fontWeight: 'bold' },
  statLabel: { fontSize: 12, marginTop: 4 },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginHorizontal: 15, 
    marginBottom: 12,
    marginTop: 5
  },
  tripCard: { 
    marginHorizontal: 15, 
    marginBottom: 12, 
    padding: 16, 
    borderRadius: 12, 
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tripHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  tripRoute: { fontSize: 16, fontWeight: 'bold' },
  tripStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tripStatusText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  tripDetails: { gap: 6, marginBottom: 12 },
  tripTime: { fontSize: 13 },
  tripBus: { fontSize: 13 },
  tripStudents: { fontSize: 13 },
  startButton: { 
    paddingVertical: 10, 
    borderRadius: 8, 
    alignItems: 'center',
    marginTop: 5
  },
  startButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    marginHorizontal: 15,
  },
  noTripsText: { textAlign: 'center', fontSize: 14 },
});