import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import { COLORS } from '../../constants/config';
import { format } from 'date-fns';

export default function DashboardScreen({ navigation }) {
  const { driver, currentTrip, logout, fetchCurrentTrip } = useAuth();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [todayTrips, setTodayTrips] = useState([]);
  const [stats, setStats] = useState({
    totalTrips: 0,
    completedTrips: 0,
    totalStudents: 0,
    totalDistance: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      console.log('📊 Loading dashboard data...');
      
      // Fetch today's trips
      const tripsResponse = await api.get('/driver/trips/today');
      console.log('✅ Trips response:', tripsResponse);
      
      // Handle both possible response structures
      const tripsData = tripsResponse.data || tripsResponse;
      console.log('📊 Trips data:', tripsData);
      setTodayTrips(Array.isArray(tripsData) ? tripsData : []);

      // Fetch stats
      const statsResponse = await api.get('/driver/stats');
      console.log('✅ Stats response:', statsResponse);
      
      // Handle both possible response structures
      const statsData = statsResponse.data || statsResponse;
      setStats({
        totalTrips: statsData.totalTrips || 0,
        completedTrips: statsData.completedTrips || 0,
        totalStudents: statsData.totalStudents || 0,
        totalDistance: statsData.totalDistance || 0,
      });

    } catch (error) {
      console.error('❌ Error loading dashboard:', error);
      console.error('Error details:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCurrentTrip();
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleStartTrip = async (trip) => {
    Alert.alert(
      'Start Trip',
      `Start trip ${trip.routeName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: async () => {
            const result = await api.trip.start(trip.id);
            if (result.success) {
              navigation.navigate('Trip', { trip: result.trip });
            }
          }
        },
      ]
    );
  };

  const TripCard = ({ trip }) => (
    <TouchableOpacity
      style={styles.tripCard}
      onPress={() => navigation.navigate('Trip', { trip })}
    >
      <View style={styles.tripHeader}>
        <Text style={styles.tripRoute}>{trip.routeName}</Text>
        <View style={[styles.tripStatus, { backgroundColor: trip.status === 'scheduled' ? '#FF9800' : '#4CAF50' }]}>
          <Text style={styles.tripStatusText}>{trip.status}</Text>
        </View>
      </View>

      <View style={styles.tripDetails}>
        <Text style={styles.tripTime}>🕒 {trip.startTime} - {trip.endTime}</Text>
        <Text style={styles.tripBus}>🚌 Bus: {trip.busNumber}</Text>
        <Text style={styles.tripStudents}>👥 Students: {trip.studentCount || 0}</Text>
      </View>

      {trip.status === 'scheduled' && (
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => handleStartTrip(trip)}
        >
          <Text style={styles.startButtonText}>▶ Start Trip</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Welcome,</Text>
            <Text style={styles.driverName}>{driver?.firstName} {driver?.lastName}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>🚪</Text>
          </TouchableOpacity>
        </View>
        {currentTrip && (
          <View style={styles.activeTripBanner}>
            <Text style={styles.activeTripText}>▶ Active Trip: {currentTrip.routeName}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Trip', { trip: currentTrip })}>
              <Text style={styles.viewTripText}>View →</Text>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.totalTrips}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Trips</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.completedTrips}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completed</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.totalStudents}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Students</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Trips</Text>
        {todayTrips.length > 0 ? (
          todayTrips.map(trip => <TripCard key={trip.id} trip={trip} />)
        ) : (
          <Text style={[styles.noTripsText, { color: colors.textSecondary }]}>
            No trips scheduled for today
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    paddingTop: 40, // Reduced from 50
    paddingBottom: 15, // Reduced from 20
    paddingHorizontal: 20 
  },
  headerTop: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 8 // Reduced from 10
  },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  driverName: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  logoutButton: { padding: 8 }, // Reduced padding
  logoutText: { fontSize: 24 },
  activeTripBanner: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    padding: 8, // Reduced padding
    borderRadius: 8, 
    marginTop: 8 // Reduced margin
  },
  activeTripText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  viewTripText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  scrollContent: { 
    paddingBottom: 20,
    paddingTop: 5 // Added small top padding
  },
  statsContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    marginHorizontal: 15,
    marginTop: 10, // Added top margin
    marginBottom: 15 
  },
  statCard: { 
    padding: 15, 
    borderRadius: 10, 
    alignItems: 'center', 
    flex: 1, 
    marginHorizontal: 5, 
    elevation: 2 
  },
  statValue: { fontSize: 24, fontWeight: 'bold' },
  statLabel: { fontSize: 12, marginTop: 4 },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginHorizontal: 15, 
    marginBottom: 10 
  },
  tripCard: { 
    marginHorizontal: 15, 
    marginBottom: 10, 
    padding: 15, 
    borderRadius: 10, 
    elevation: 2,
    backgroundColor: '#fff' 
  },
  tripHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 10 
  },
  tripRoute: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  tripStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  tripStatusText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  tripDetails: { marginBottom: 10 },
  tripTime: { fontSize: 13, color: '#666', marginBottom: 4 },
  tripBus: { fontSize: 13, color: '#666', marginBottom: 4 },
  tripStudents: { fontSize: 13, color: '#666' },
  startButton: { padding: 12, borderRadius: 8, alignItems: 'center' },
  startButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  noTripsText: { textAlign: 'center', marginTop: 20 },
});