import React, { useState, useEffect, useCallback } from 'react';
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
import { useChildren } from '../../context/ChildrenContext'; // Use the specific hook
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import { format } from 'date-fns';
import { useOffline } from '../../hooks/useOffline';
import OfflineBanner from '../../components/common/OfflineBanner';
import CacheIndicator from '../../components/common/CacheIndicator';
import cache from '../../services/cache';

export default function DashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { childrenList, loading: childrenLoading, refreshChildren } = useChildren();
  const { isConnected: socketConnected, alerts } = useSocket();
  const { isOffline, isConnected } = useOffline();
  const { colors } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [childStatus, setChildStatus] = useState({});
  const [isFromCache, setIsFromCache] = useState(false);

  // Load supplemental data (Attendance/Location)
  const loadDashboardDetails = useCallback(async () => {
    if (!childrenList || childrenList.length === 0) return;

    try {
      const statusPromises = childrenList.map(async (child) => {
        const childId = child._id || child.id;
        try {
          const [attendanceRes, locationRes] = await Promise.all([
            api.get(`/api/attendance/today/${childId}`).catch(() => null),
            api.get(`/api/tracking/location/${childId}`).catch(() => null)
          ]);
          
          return {
            childId,
            attendance: attendanceRes?.data?.data || null,
            location: locationRes?.data?.data || null,
          };
        } catch (e) {
          return { childId, attendance: null, location: null };
        }
      });

      const statuses = await Promise.all(statusPromises);
      const statusMap = {};
      statuses.forEach(s => { if(s.childId) statusMap[s.childId] = s; });
      setChildStatus(statusMap);
    } catch (error) {
      console.error('Error fetching dashboard details:', error);
    }
  }, [childrenList]);

  useEffect(() => {
    if (!childrenLoading) {
      loadDashboardDetails();
      setLoading(false);
    }
  }, [childrenLoading, loadDashboardDetails]);

  // Greeting Logic
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshChildren();
    await loadDashboardDetails();
    setRefreshing(false);
  };

  const ChildCard = ({ child }) => {
    const status = childStatus[child._id || child.id];
    const isMoving = status?.location?.speed > 0;

    return (
      <View style={[styles.childCard, { backgroundColor: colors.card }]}>
        <View style={styles.childHeader}>
          <View style={[styles.childAvatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.childAvatarText}>{child.firstName?.charAt(0)}</Text>
          </View>
          <View style={styles.childInfo}>
            <Text style={[styles.childName, { color: colors.text }]}>{child.fullName}</Text>
            <Text style={[styles.childClass, { color: colors.textSecondary }]}>{child.classLevel} | {child.admissionNumber}</Text>
          </View>
        </View>

        <View style={[styles.statusRow, { borderColor: colors.border }]}>
          <View style={styles.statusItem}>
            <Text style={styles.statusIcon}>{status?.attendance?.present ? '✅' : '⏳'}</Text>
            <View>
              <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Attendance</Text>
              <Text style={[styles.statusValue, { color: status?.attendance?.present ? colors.success : colors.warning }]}>
                {status?.attendance?.present ? 'Present' : 'Pending'}
              </Text>
            </View>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusIcon}>🚌</Text>
            <View>
              <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Bus Status</Text>
              <Text style={[styles.statusValue, { color: isMoving ? colors.success : colors.textSecondary }]}>
                {isMoving ? `${status.location.speed} km/h` : 'Stationary'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Tracking', { child })}>
            <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.actionGradient}>
              <Text style={styles.actionText}>Track</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Attendance', { child })}>
            <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.actionGradient}>
              <Text style={styles.actionText}>History</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading && !childrenList?.length) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{user?.firstName || 'Parent'}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
            <Text style={styles.notificationIcon}>🔔</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <OfflineBanner onRetry={onRefresh} />

      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Children</Text>

        {!childrenList || childrenList.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
            <Text style={styles.emptyIcon}>👶</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Children Linked</Text>
            
            <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('LinkChild')}>
              <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.linkButtonGradient}>
                <Text style={styles.linkButtonText}>Link with Admission No.</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.orDivider}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.orText, { color: colors.textSecondary }]}>OR</Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddChild')}>
              <Text style={[styles.addButtonText, { color: colors.primary }]}>Manual Registration</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {childrenList.map((child) => (
              <ChildCard key={child.id} child={child} />
            ))}
            
            <TouchableOpacity 
              style={[styles.addChildButton, { borderColor: colors.border }]} 
              onPress={() => navigation.navigate('LinkChild')}
            >
              <Text style={{ color: colors.primary }}>+ Add Another Child</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={[styles.logoutButton, { borderColor: colors.danger }]} onPress={logout}>
          <Text style={{ color: colors.danger }}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  userName: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  notificationIcon: { fontSize: 24 },
  scrollContent: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  childCard: { borderRadius: 15, padding: 15, marginBottom: 15, elevation: 4 },
  childHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  childAvatar: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  childAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  childName: { fontSize: 16, fontWeight: 'bold' },
  childClass: { fontSize: 12 },
  statusRow: { flexDirection: 'row', paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, marginVertical: 10 },
  statusItem: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  statusIcon: { fontSize: 18, marginRight: 8 },
  statusLabel: { fontSize: 10 },
  statusValue: { fontSize: 12, fontWeight: '600' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionButton: { flex: 0.48, borderRadius: 8, overflow: 'hidden' },
  actionGradient: { paddingVertical: 10, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  emptyState: { padding: 30, borderRadius: 15, alignItems: 'center' },
  emptyIcon: { fontSize: 50, marginBottom: 10 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  linkButton: { width: '100%', borderRadius: 10, overflow: 'hidden' },
  linkButtonGradient: { padding: 15, alignItems: 'center' },
  linkButtonText: { color: '#fff', fontWeight: 'bold' },
  orDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 15 },
  dividerLine: { flex: 1, height: 1 },
  orText: { marginHorizontal: 10, fontSize: 12 },
  addButton: { padding: 10 },
  addButtonText: { fontWeight: '600' },
  addChildButton: { padding: 15, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', marginTop: 10 },
  logoutButton: { marginTop: 40, padding: 15, borderRadius: 10, borderWidth: 1, alignItems: 'center' }
});