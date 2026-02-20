import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { COLORS } from '../../constants/config';
import { format } from 'date-fns';

export default function ChildDetailsScreen({ route, navigation }) {
  const { childId } = route.params;
  const { childrenList, fetchChildren } = useAuth();
  const { liveLocations, isConnected } = useSocket();
  
  const [child, setChild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busLocation, setBusLocation] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [stats, setStats] = useState({
    attendanceRate: 95,
    totalTrips: 124,
    lateArrivals: 3,
    avgPickupTime: '07:15',
    avgDropoffTime: '16:30',
  });

  useEffect(() => {
    fetchChildDetails();
  }, [childId]);

  useEffect(() => {
    if (child?.busId && liveLocations[child.busId]) {
      setBusLocation(liveLocations[child.busId]);
    }
  }, [liveLocations, child]);

  const fetchChildDetails = async () => {
    try {
      setLoading(true);
      
      // Find child from context first
      const found = childrenList.find(c => c.id === childId);
      
      if (found) {
        setChild(found);
        // Fetch additional details from API
        await fetchAdditionalData(found.id);
      } else {
        // Fetch from API if not in context
        const response = await api.get(`/children/${childId}`);
        setChild(response.data);
        await fetchAdditionalData(childId);
      }
    } catch (error) {
      console.error('Error fetching child details:', error);
      Alert.alert('Error', 'Failed to load child details');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdditionalData = async (id) => {
    try {
      // Fetch today's attendance
      const attendanceRes = await api.get(`/attendance/child/${id}/today`);
      setTodayAttendance(attendanceRes.data);

      // Fetch recent activity
      const activityRes = await api.get(`/activity/child/${id}?limit=10`);
      setRecentActivity(activityRes.data);
    } catch (error) {
      console.error('Error fetching additional data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchChildDetails();
    setRefreshing(false);
  };

  const handleEdit = () => {
    navigation.navigate('EditChild', { childId: child.id });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Child',
      'Are you sure you want to remove this child? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/children/${childId}`);
              await fetchChildren();
              navigation.goBack();
              Alert.alert('Success', 'Child removed successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to remove child');
            }
          },
        },
      ]
    );
  };

  const handleTrack = () => {
    navigation.navigate('Tracking', { child });
  };

  const handleAttendance = () => {
    navigation.navigate('Attendance', { child });
  };

  const handleContactDriver = () => {
    Alert.alert('Contact Driver', 'Messaging driver...');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading child details...</Text>
      </View>
    );
  }

  if (!child) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>😢</Text>
        <Text style={styles.errorTitle}>Child Not Found</Text>
        <Text style={styles.errorText}>The child you're looking for doesn't exist.</Text>
        <TouchableOpacity
          style={styles.errorButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.secondary]}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Child Details</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleEdit} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Child Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {child.photo ? (
                <Image source={{ uri: child.photo }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {child.name?.charAt(0) || '👤'}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.childName}>{child.name}</Text>
              <Text style={styles.childId}>ID: {child.studentId}</Text>
              <Text style={styles.childClass}>{child.class}</Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickAction} onPress={handleTrack}>
              <Text style={styles.quickActionIcon}>📍</Text>
              <Text style={styles.quickActionText}>Track</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={handleAttendance}>
              <Text style={styles.quickActionIcon}>📊</Text>
              <Text style={styles.quickActionText}>Attendance</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={handleContactDriver}>
              <Text style={styles.quickActionIcon}>💬</Text>
              <Text style={styles.quickActionText}>Contact</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Live Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Live Status</Text>
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Bus Status:</Text>
              <View style={styles.statusValue}>
                <View style={[styles.dot, isConnected ? styles.online : styles.offline]} />
                <Text style={styles.statusText}>
                  {busLocation ? 'On Route' : 'No active trip'}
                </Text>
              </View>
            </View>
            {busLocation && (
              <>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Current Speed:</Text>
                  <Text style={styles.statusValue}>{busLocation.speed} km/h</Text>
                </View>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>ETA to School:</Text>
                  <Text style={styles.statusValue}>12 min</Text>
                </View>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>ETA to Home:</Text>
                  <Text style={styles.statusValue}>25 min</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Today's Attendance */}
        {todayAttendance && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Attendance</Text>
            <View style={styles.attendanceCard}>
              <View style={styles.attendanceRow}>
                <Text style={styles.attendanceLabel}>Morning:</Text>
                <Text style={[
                  styles.attendanceStatus,
                  { color: todayAttendance.morning === 'present' ? '#4CAF50' : '#f44336' }
                ]}>
                  {todayAttendance.morning === 'present' ? '✅ Boarded' : '❌ Not Boarded'}
                </Text>
              </View>
              {todayAttendance.morningTime && (
                <Text style={styles.attendanceTime}>
                  Time: {todayAttendance.morningTime}
                </Text>
              )}
              <View style={styles.attendanceDivider} />
              <View style={styles.attendanceRow}>
                <Text style={styles.attendanceLabel}>Afternoon:</Text>
                <Text style={[
                  styles.attendanceStatus,
                  { color: todayAttendance.afternoon === 'present' ? '#4CAF50' : '#f44336' }
                ]}>
                  {todayAttendance.afternoon === 'present' ? '✅ Boarded' : '❌ Not Boarded'}
                </Text>
              </View>
              {todayAttendance.afternoonTime && (
                <Text style={styles.attendanceTime}>
                  Time: {todayAttendance.afternoonTime}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.attendanceRate}%</Text>
              <Text style={styles.statLabel}>Attendance Rate</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalTrips}</Text>
              <Text style={styles.statLabel}>Total Trips</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#FF9800' }]}>
                {stats.lateArrivals}
              </Text>
              <Text style={styles.statLabel}>Late Arrivals</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.avgPickupTime}</Text>
              <Text style={styles.statLabel}>Avg Pickup</Text>
            </View>
          </View>
        </View>

        {/* Transport Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transport Details</Text>
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Bus Number:</Text>
              <Text style={styles.detailValue}>{child.busNumber || 'Not assigned'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Pickup Point:</Text>
              <Text style={styles.detailValue}>{child.pickupPoint || 'Not set'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Dropoff Point:</Text>
              <Text style={styles.detailValue}>{child.dropoffPoint || 'Not set'}</Text>
            </View>
          </View>
        </View>

        {/* Emergency Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contact</Text>
          <View style={styles.emergencyCard}>
            <View style={styles.emergencyRow}>
              <Text style={styles.emergencyLabel}>Name:</Text>
              <Text style={styles.emergencyValue}>{child.emergencyContact}</Text>
            </View>
            <View style={styles.emergencyRow}>
              <Text style={styles.emergencyLabel}>Phone:</Text>
              <Text style={styles.emergencyValue}>{child.emergencyPhone}</Text>
            </View>
            {child.medicalNotes && (
              <>
                <View style={styles.emergencyDivider} />
                <Text style={styles.medicalLabel}>Medical Notes:</Text>
                <Text style={styles.medicalText}>{child.medicalNotes}</Text>
              </>
            )}
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => Alert.alert('Call', `Calling ${child.emergencyContact}`)}
            >
              <Text style={styles.callButtonText}>📞 Call Emergency Contact</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {recentActivity.map((activity, index) => (
              <View key={index} style={styles.activityItem}>
                <Text style={styles.activityIcon}>
                  {activity.type === 'boarding' ? '🚌' : 
                   activity.type === 'attendance' ? '📝' : '📍'}
                </Text>
                <View style={styles.activityContent}>
                  <Text style={styles.activityText}>{activity.description}</Text>
                  <Text style={styles.activityTime}>
                    {format(new Date(activity.timestamp), 'MMM dd, HH:mm')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
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
  backIcon: {
    fontSize: 24,
    color: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  headerButtonText: {
    fontSize: 16,
  },
  profileCard: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: -30,
    padding: 20,
    borderRadius: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 30,
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  childId: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  childClass: {
    fontSize: 14,
    color: '#666',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 15,
  },
  quickAction: {
    alignItems: 'center',
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  quickActionText: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  statusCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
  },
  statusValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  online: {
    backgroundColor: '#4CAF50',
  },
  offline: {
    backgroundColor: '#f44336',
  },
  attendanceCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
  },
  attendanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  attendanceLabel: {
    fontSize: 14,
    color: '#666',
  },
  attendanceStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  attendanceTime: {
    fontSize: 12,
    color: '#999',
    marginBottom: 10,
  },
  attendanceDivider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    width: '50%',
    padding: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  detailCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  emergencyCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
  },
  emergencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  emergencyLabel: {
    fontSize: 14,
    color: '#666',
  },
  emergencyValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  emergencyDivider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 10,
  },
  medicalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 5,
  },
  medicalText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  callButton: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  callButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  activityItem: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityIcon: {
    fontSize: 20,
    width: 40,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
  },
});