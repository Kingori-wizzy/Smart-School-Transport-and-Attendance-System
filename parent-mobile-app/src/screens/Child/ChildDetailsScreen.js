import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { COLORS } from '../../constants/config';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');

const InfoCard = ({ title, children }) => (
  <View style={styles.infoCard}>
    <Text style={styles.infoCardTitle}>{title}</Text>
    <View style={styles.infoCardContent}>{children}</View>
  </View>
);

const InfoRow = ({ icon, label, value, color }) => (
  <View style={styles.infoRow}>
    <Text style={[styles.infoIcon, color && { color }]}>{icon}</Text>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, color && { color }]}>{value || 'Not provided'}</Text>
    </View>
  </View>
);

const StatCard = ({ title, value, icon, color, subtitle }) => (
  <View style={[styles.statCard, { backgroundColor: color }]}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statTitle}>{title}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
  </View>
);

const ActionButton = ({ icon, label, onPress, colors }) => (
  <TouchableOpacity style={styles.actionButton} onPress={onPress}>
    <LinearGradient colors={colors || [COLORS.primary, COLORS.secondary]} style={styles.actionGradient}>
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={styles.actionLabel}>{label}</Text>
    </LinearGradient>
  </TouchableOpacity>
);

const RecentTripItem = ({ trip }) => (
  <View style={styles.tripItem}>
    <View style={styles.tripHeader}>
      <Text style={styles.tripDate}>{format(new Date(trip.date), 'MMM dd, yyyy')}</Text>
      <View style={[styles.tripStatus, { backgroundColor: trip.status === 'completed' ? '#4CAF50' : '#FF9800' }]}>
        <Text style={styles.tripStatusText}>{trip.status}</Text>
      </View>
    </View>
    <View style={styles.tripDetails}>
      <Text style={styles.tripRoute}>{trip.routeName}</Text>
      <Text style={styles.tripTime}>🕒 {trip.startTime} - {trip.endTime}</Text>
    </View>
  </View>
);

export default function ChildDetailsScreen({ route, navigation }) {
  if (!route?.params?.child) {
    navigation.goBack();
    return null;
  }

  const { child } = route.params;
  const { fetchChildren } = useAuth();
  const { liveLocations, isConnected } = useSocket();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [childData] = useState(child);
  const [busLocation, setBusLocation] = useState(null);
  const [recentTrips, setRecentTrips] = useState([]);
  const [stats, setStats] = useState({
    attendanceRate: 0,
    totalTrips: 0,
    lateArrivals: 0,
    averagePickup: '--:--',
    averageDropoff: '--:--',
    daysEnrolled: 0,
  });

  useEffect(() => {
    loadChildDetails();
  }, []);

  useEffect(() => {
    const childId = childData._id || childData.id;
    if (childId && liveLocations[childId]) {
      setBusLocation(liveLocations[childId]);
    }
  }, [liveLocations, childData]);

  const loadChildDetails = async () => {
    try {
      setLoading(true);
      const childId = childData._id || childData.id;
      
      const [statsRes, tripsRes] = await Promise.all([
        api.parent.getChildStats(childId).catch(() => null),
        api.parent.getChildTrips(childId).catch(() => null)
      ]);

      if (statsRes) setStats(statsRes);
      if (tripsRes) setRecentTrips(tripsRes);
      
    } catch (error) {
      console.error('Error loading child details:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChildDetails();
    setRefreshing(false);
  };

  const handleEdit = () => {
    navigation.navigate('EditChild', { child: childData });
  };

  const handleDelete = () => {
    Alert.alert(
      'Remove Child',
      `Are you sure you want to remove ${childData.firstName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const childId = childData._id || childData.id;
              await api.parent.deleteChild(childId);
              await fetchChildren();
              Alert.alert('Success', 'Child removed successfully');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove child');
            }
          },
        },
      ]
    );
  };

  const handleTrack = () => {
    navigation.navigate('Tracking', { child: childData });
  };

  const handleAttendance = () => {
    navigation.navigate('Attendance', { child: childData });
  };

  const handleMessage = () => {
    navigation.navigate('Messages', { 
      conversationId: `child-${childData._id || childData.id}`,
      title: `${childData.firstName}'s Teacher`,
    });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${childData.firstName} ${childData.lastName} - Student ID: ${childData.admissionNumber}, Class: ${childData.classLevel}, Bus: ${childData.busNumber}`,
        title: 'Child Information',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const getBusStatus = () => {
    if (!busLocation) return { text: 'No active trip', color: '#999' };
    if (busLocation.speed > 0) return { text: `${busLocation.speed} km/h`, color: '#4CAF50' };
    return { text: 'Stopped', color: '#FF9800' };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading child details...</Text>
      </View>
    );
  }

  const busStatus = getBusStatus();

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
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
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {childData.firstName?.charAt(0)}{childData.lastName?.charAt(0)}
            </Text>
          </View>
          <Text style={styles.fullName}>{childData.firstName} {childData.lastName}</Text>
          <Text style={styles.studentId}>ID: {childData.admissionNumber}</Text>
          
          <View style={styles.quickActionsRow}>
            <TouchableOpacity style={styles.quickAction} onPress={handleTrack}>
              <Text style={styles.quickActionIcon}>📍</Text>
              <Text style={styles.quickActionText}>Track</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={handleAttendance}>
              <Text style={styles.quickActionIcon}>📊</Text>
              <Text style={styles.quickActionText}>Attendance</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={handleMessage}>
              <Text style={styles.quickActionIcon}>💬</Text>
              <Text style={styles.quickActionText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={handleShare}>
              <Text style={styles.quickActionIcon}>📤</Text>
              <Text style={styles.quickActionText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        <InfoCard title="Live Status">
          <View style={styles.liveStatusRow}>
            <View style={styles.liveStatusItem}>
              <Text style={styles.liveStatusLabel}>Connection</Text>
              <View style={styles.liveStatusValue}>
                <View style={[styles.statusDot, isConnected ? styles.online : styles.offline]} />
                <Text style={styles.liveStatusText}>{isConnected ? 'Live' : 'Offline'}</Text>
              </View>
            </View>
            <View style={styles.liveStatusItem}>
              <Text style={styles.liveStatusLabel}>Bus Status</Text>
              <Text style={[styles.liveStatusValue, { color: busStatus.color }]}>
                {busStatus.text}
              </Text>
            </View>
            <View style={styles.liveStatusItem}>
              <Text style={styles.liveStatusLabel}>Today</Text>
              <Text style={styles.liveStatusValue}>
                {stats.attendanceRate > 0 ? 'Present' : 'Not recorded'}
              </Text>
            </View>
          </View>
        </InfoCard>

        <View style={styles.statsGrid}>
          <StatCard title="Attendance" value={`${stats.attendanceRate}%`} icon="📊" color="#4CAF50" subtitle="Last 30 days" />
          <StatCard title="Total Trips" value={stats.totalTrips} icon="🚌" color="#2196F3" subtitle="All time" />
          <StatCard title="Late Arrivals" value={stats.lateArrivals} icon="⚠️" color="#FF9800" subtitle="This month" />
          <StatCard title="Days Enrolled" value={stats.daysEnrolled} icon="📅" color="#9C27B0" subtitle="School days" />
        </View>

        <InfoCard title="Academic Information">
          <InfoRow icon="📚" label="Class/Grade" value={childData.classLevel} />
          <InfoRow icon="🏫" label="School" value={childData.school} />
          <InfoRow icon="🎂" label="Age" value={`${childData.age} years`} />
          <InfoRow icon="👤" label="Gender" value={childData.gender} />
        </InfoCard>

        <InfoCard title="Transport Information">
          <InfoRow icon="🚌" label="Bus Number" value={childData.busNumber} />
          <InfoRow icon="🗺️" label="Route" value={childData.routeName} />
          <InfoRow icon="📍" label="Pickup Point" value={childData.pickupPoint} />
          <InfoRow icon="🏠" label="Dropoff Point" value={childData.dropOffPoint} />
          <InfoRow icon="⏱️" label="Avg Pickup" value={stats.averagePickup} />
          <InfoRow icon="⏱️" label="Avg Dropoff" value={stats.averageDropoff} />
        </InfoCard>

        <InfoCard title="Emergency Contact">
          <InfoRow icon="👨‍👩‍👧" label="Guardian" value={childData.guardianName} />
          <InfoRow icon="📞" label="Phone" value={childData.guardianContact} />
          <InfoRow icon="🏥" label="Medical Notes" value={childData.medicalNotes} />
        </InfoCard>

        <InfoCard title="Recent Trips">
          {recentTrips.length > 0 ? (
            recentTrips.map((trip) => <RecentTripItem key={trip.id} trip={trip} />)
          ) : (
            <Text style={styles.noDataText}>No recent trips available</Text>
          )}
        </InfoCard>

        <View style={styles.actionButtons}>
          <ActionButton icon="📍" label="Track Now" onPress={handleTrack} colors={[COLORS.primary, COLORS.secondary]} />
          <ActionButton icon="📊" label="Attendance" onPress={handleAttendance} colors={['#4CAF50', '#45a049']} />
          <ActionButton icon="💬" label="Contact" onPress={handleMessage} colors={['#FF9800', '#F57C00']} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 24, color: '#fff' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerActions: { flexDirection: 'row' },
  headerButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  headerButtonText: { fontSize: 16 },
  profileHeader: { alignItems: 'center', marginTop: -30, marginBottom: 15, backgroundColor: '#fff', marginHorizontal: 15, borderRadius: 15, padding: 20, elevation: 4 },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff', marginTop: -40, marginBottom: 10 },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  fullName: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  studentId: { fontSize: 14, color: '#666', marginBottom: 15 },
  quickActionsRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  quickAction: { alignItems: 'center' },
  quickActionIcon: { fontSize: 20, marginBottom: 2 },
  quickActionText: { fontSize: 11, color: '#666' },
  infoCard: { backgroundColor: '#fff', marginHorizontal: 15, marginBottom: 15, borderRadius: 10, overflow: 'hidden', elevation: 2 },
  infoCardTitle: { fontSize: 16, fontWeight: '600', color: '#333', padding: 15, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  infoCardContent: { padding: 15 },
  infoRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f8f8f8' },
  infoIcon: { fontSize: 16, width: 30 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#999', marginBottom: 2 },
  infoValue: { fontSize: 14, color: '#333', fontWeight: '500' },
  liveStatusRow: { flexDirection: 'row', justifyContent: 'space-around' },
  liveStatusItem: { alignItems: 'center', flex: 1 },
  liveStatusLabel: { fontSize: 11, color: '#999', marginBottom: 4 },
  liveStatusValue: { flexDirection: 'row', alignItems: 'center', fontSize: 14, fontWeight: '600' },
  liveStatusText: { fontSize: 13, marginLeft: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  online: { backgroundColor: '#4CAF50' },
  offline: { backgroundColor: '#f44336' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 12, marginBottom: 15 },
  statCard: { width: (width - 40) / 2, marginHorizontal: 4, marginBottom: 8, padding: 15, borderRadius: 10, alignItems: 'center', elevation: 3 },
  statIcon: { fontSize: 24, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  statTitle: { fontSize: 12, color: '#fff', opacity: 0.9, marginBottom: 2 },
  statSubtitle: { fontSize: 9, color: '#fff', opacity: 0.7 },
  tripItem: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  tripDate: { fontSize: 13, fontWeight: '600', color: '#333' },
  tripStatus: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  tripStatusText: { color: '#fff', fontSize: 10, fontWeight: '500' },
  tripDetails: { marginLeft: 4 },
  tripRoute: { fontSize: 14, color: '#666', marginBottom: 2 },
  tripTime: { fontSize: 12, color: '#999' },
  noDataText: { textAlign: 'center', color: '#999', fontSize: 13, paddingVertical: 15 },
  actionButtons: { flexDirection: 'row', marginHorizontal: 15, marginBottom: 30 },
  actionButton: { flex: 1, marginHorizontal: 4, borderRadius: 8, overflow: 'hidden' },
  actionGradient: { paddingVertical: 12, alignItems: 'center' },
  actionIcon: { fontSize: 18, marginBottom: 2 },
  actionLabel: { fontSize: 11, color: '#fff', fontWeight: '500' },
});