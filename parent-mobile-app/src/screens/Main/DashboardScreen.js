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
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { COLORS } from '../../constants/config';
import { format } from 'date-fns';
import { useOffline, useOfflineData } from '../../hooks/useOffline';
import OfflineBanner from '../../components/common/OfflineBanner';
import CacheIndicator from '../../components/common/CacheIndicator';
import cache from '../../services/cache';

export default function DashboardScreen({ navigation }) {
  const { user, childrenList, fetchChildren, logout } = useAuth();
  const { isConnected: socketConnected, alerts } = useSocket();
  const { isOffline, isConnected } = useOffline();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [childStatus, setChildStatus] = useState({});
  const [isFromCache, setIsFromCache] = useState(false);

  // Use offline data hook for children
  const { 
    data: cachedChildren, 
    isFromCache: childrenFromCache,
    refresh: refreshChildren 
  } = useOfflineData(
    fetchChildren,
    cache.keys.children(), // ✅ Use cache.keys helper
    []
  );

  useEffect(() => {
    loadDashboardData();
  }, [childrenList.length]);

  useEffect(() => {
    if (alerts.length > 0) {
      const recent = alerts.slice(0, 3);
      setRecentAlerts(recent);
      // Save alerts to cache using cache.recentAlerts helper
      cache.recentAlerts.save(recent);
    }
  }, [alerts]);

  // Load cached alerts on mount
  useEffect(() => {
    loadCachedAlerts();
  }, []);

  const loadCachedAlerts = async () => {
    // Use cache.recentAlerts helper
    const cached = await cache.recentAlerts.get();
    if (cached && recentAlerts.length === 0) {
      setRecentAlerts(cached);
      setIsFromCache(true);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Try to get from cache first using cache.childStatus helper
      const cachedStatus = await cache.childStatus.get();
      if (cachedStatus && !isConnected) {
        setChildStatus(cachedStatus);
        setIsFromCache(true);
      }

      await fetchChildren();
      
      if (childrenList.length === 0) {
        setLoading(false);
        return;
      }

      const statusPromises = childrenList.map(async (child) => {
        const childId = child._id || child.id;
        
        if (!childId) return { childId: null, attendance: null, location: null };
        
        try {
          // Try cache first for each child using cache.attendance and cache.location helpers
          const cachedAttendance = await cache.attendance.get(childId);
          const cachedLocation = await cache.location.get(childId);

          // If offline and we have cache, use it
          if (isOffline && cachedAttendance && cachedLocation) {
            return {
              childId,
              attendance: cachedAttendance,
              location: cachedLocation,
            };
          }

          // Otherwise fetch fresh data
          const [attendanceRes, locationRes] = await Promise.all([
            api.attendance.getToday(childId).catch(async (err) => {
              console.log(`Attendance fetch failed for child ${childId}:`, err.message);
              return cachedAttendance || null;
            }),
            api.parent.getChildLocation(childId).catch(async (err) => {
              console.log(`Location fetch failed for child ${childId}:`, err.message);
              return cachedLocation || null;
            })
          ]);
          
          // Save to cache using helpers
          if (attendanceRes) {
            await cache.attendance.save(childId, attendanceRes);
          }
          if (locationRes) {
            await cache.location.save(childId, locationRes);
          }
          
          return {
            childId,
            attendance: attendanceRes || null,
            location: locationRes || null,
          };
        } catch (error) {
          // Fallback to cache
          const cachedAttendance = await cache.attendance.get(childId);
          const cachedLocation = await cache.location.get(childId);
          
          return {
            childId,
            attendance: cachedAttendance || null,
            location: cachedLocation || null,
          };
        }
      });

      const statuses = await Promise.all(statusPromises);
      const statusMap = {};
      let fromCache = false;
      
      statuses.forEach(status => {
        if (status.childId) statusMap[status.childId] = status;
      });

      // Check if any data came from cache
      const anyFromCache = statuses.some(s => !s.attendance && !s.location);
      setIsFromCache(anyFromCache || childrenFromCache);
      
      setChildStatus(statusMap);
      
      // Save to cache using cache.childStatus helper
      await cache.childStatus.save(statusMap);
      
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    await refreshChildren();
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getAttendanceStatus = (child) => {
    const childId = child._id || child.id;
    const status = childStatus[childId];
    
    if (!status?.attendance) {
      return { text: 'Not recorded', color: '#999', icon: '⏳' };
    }
    
    if (status.attendance.present) {
      return { text: 'Present', color: '#4CAF50', icon: '✅' };
    } else if (status.attendance.absent) {
      return { text: 'Absent', color: '#f44336', icon: '❌' };
    } else if (status.attendance.late) {
      return { text: 'Late', color: '#FF9800', icon: '⚠️' };
    }
    return { text: 'Unknown', color: '#999', icon: '❓' };
  };

  const getBusStatus = (child) => {
    const childId = child._id || child.id;
    const status = childStatus[childId];
    
    if (!status?.location?.location) {
      return { text: 'No active bus', color: '#999', icon: '🚌' };
    }
    
    const speed = status.location.location.speed;
    if (speed > 0) {
      return { text: `${speed} km/h`, color: '#4CAF50', icon: '🚌' };
    } else {
      return { text: 'Stopped', color: '#FF9800', icon: '🚌' };
    }
  };

  const ChildCard = ({ child }) => {
    const attendance = getAttendanceStatus(child);
    const bus = getBusStatus(child);

    return (
      <View style={styles.childCard}>
        <View style={styles.childHeader}>
          <View style={styles.childAvatar}>
            <Text style={styles.childAvatarText}>
              {child.firstName?.charAt(0)}{child.lastName?.charAt(0)}
            </Text>
          </View>
          <View style={styles.childInfo}>
            <Text style={styles.childName}>{child.firstName} {child.lastName}</Text>
            <Text style={styles.childClass}>Class: {child.classLevel}</Text>
            <Text style={styles.childId}>ID: {child.admissionNumber}</Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <Text style={styles.statusIcon}>{attendance.icon}</Text>
            <View>
              <Text style={styles.statusLabel}>Attendance</Text>
              <Text style={[styles.statusValue, { color: attendance.color }]}>
                {attendance.text}
              </Text>
            </View>
          </View>

          <View style={styles.statusDivider} />

          <View style={styles.statusItem}>
            <Text style={styles.statusIcon}>{bus.icon}</Text>
            <View>
              <Text style={styles.statusLabel}>Bus Status</Text>
              <Text style={[styles.statusValue, { color: bus.color }]}>
                {bus.text}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Tracking', { child })}
          >
            <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.actionGradient}>
              <Text style={styles.actionIcon}>📍</Text>
              <Text style={styles.actionText}>Track</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Attendance', { child })}
          >
            <LinearGradient colors={['#4CAF50', '#45a049']} style={styles.actionGradient}>
              <Text style={styles.actionIcon}>📊</Text>
              <Text style={styles.actionText}>Attendance</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('ChildDetails', { child })}
          >
            <LinearGradient colors={['#FF9800', '#F57C00']} style={styles.actionGradient}>
              <Text style={styles.actionIcon}>👤</Text>
              <Text style={styles.actionText}>Details</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const RecentAlert = ({ alert }) => (
    <TouchableOpacity
      style={styles.alertItem}
      onPress={() => navigation.navigate('Notifications')}
    >
      <View style={[styles.alertIcon, { backgroundColor: alert.type === 'geofence' ? '#2196F3' : '#f44336' }]}>
        <Text style={styles.alertIconText}>{alert.type === 'geofence' ? '📍' : '🚨'}</Text>
      </View>
      <View style={styles.alertContent}>
        <Text style={styles.alertMessage} numberOfLines={1}>{alert.message}</Text>
        <Text style={styles.alertTime}>{format(new Date(alert.timestamp), 'HH:mm')}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading your children...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Text style={styles.notificationIcon}>🔔</Text>
              {recentAlerts.length > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{recentAlerts.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.profileIcon}>👤</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.connectionStatus}>
          <View style={[styles.statusDot, isConnected ? styles.online : styles.offline]} />
          <Text style={styles.statusText}>
            {isConnected ? (socketConnected ? 'Live' : 'Connected') : 'Offline'}
          </Text>
        </View>
      </LinearGradient>

      {/* Offline Banner */}
      <OfflineBanner onRetry={onRefresh} />
      
      {/* Cache Indicator */}
      <CacheIndicator isFromCache={isFromCache} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Your Children</Text>
          {childrenList.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>👶</Text>
              <Text style={styles.emptyTitle}>No Children Added</Text>
              <Text style={styles.emptyText}>
                Add your children to start tracking their school transport
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('AddChild')}
              >
                <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.addButtonGradient}>
                  <Text style={styles.addButtonText}>+ Add Child</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {childrenList.map((child) => {
                const childId = child._id || child.id;
                return <ChildCard key={childId} child={child} />;
              })}
              
              <TouchableOpacity
                style={styles.addChildButton}
                onPress={() => navigation.navigate('AddChild')}
              >
                <Text style={styles.addChildIcon}>+</Text>
                <Text style={styles.addChildText}>Add Another Child</Text>
              </TouchableOpacity>
            </>
          )}

          {recentAlerts.length > 0 && (
            <View style={styles.alertsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Alerts</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>
              {recentAlerts.map((alert, index) => (
                <RecentAlert key={index} alert={alert} />
              ))}
            </View>
          )}

          <View style={styles.quickStats}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{childrenList.length}</Text>
              <Text style={styles.statLabel}>Children</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {Object.values(childStatus).filter(s => s?.location?.location?.speed > 0).length}
              </Text>
              <Text style={styles.statLabel}>Buses Moving</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{recentAlerts.length}</Text>
              <Text style={styles.statLabel}>Alerts</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  notificationButton: { position: 'relative', marginRight: 15, padding: 5 },
  notificationIcon: { fontSize: 24 },
  notificationBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#f44336', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  notificationBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  profileButton: { padding: 5 },
  profileIcon: { fontSize: 24 },
  connectionStatus: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  online: { backgroundColor: '#4CAF50' },
  offline: { backgroundColor: '#f44336' },
  statusText: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  content: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  childCard: { backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 15, elevation: 3 },
  childHeader: { flexDirection: 'row', marginBottom: 15 },
  childAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  childAvatarText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  childInfo: { flex: 1 },
  childName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  childClass: { fontSize: 13, color: '#666', marginTop: 2 },
  childId: { fontSize: 12, color: '#999', marginTop: 2 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', marginBottom: 12 },
  statusItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  statusIcon: { fontSize: 20, marginRight: 8 },
  statusLabel: { fontSize: 11, color: '#999' },
  statusValue: { fontSize: 13, fontWeight: '600' },
  statusDivider: { width: 1, height: '100%', backgroundColor: '#f0f0f0' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionButton: { flex: 1, marginHorizontal: 4, borderRadius: 8, overflow: 'hidden' },
  actionGradient: { paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  actionIcon: { fontSize: 16, marginBottom: 2 },
  actionText: { fontSize: 11, color: '#fff', fontWeight: '500' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, backgroundColor: '#fff', borderRadius: 15 },
  emptyIcon: { fontSize: 50, marginBottom: 15 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20, paddingHorizontal: 30 },
  addButton: { width: '80%', height: 45, borderRadius: 10, overflow: 'hidden' },
  addButtonGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  addChildButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: COLORS.primary, borderStyle: 'dashed', marginBottom: 20 },
  addChildIcon: { fontSize: 20, color: COLORS.primary, marginRight: 8, fontWeight: 'bold' },
  addChildText: { fontSize: 14, color: COLORS.primary, fontWeight: '500' },
  alertsSection: { marginTop: 10, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  seeAllText: { color: COLORS.primary, fontSize: 14, fontWeight: '500' },
  alertItem: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 8, elevation: 2 },
  alertIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  alertIconText: { fontSize: 20 },
  alertContent: { flex: 1, justifyContent: 'center' },
  alertMessage: { fontSize: 14, color: '#333', marginBottom: 2 },
  alertTime: { fontSize: 11, color: '#999' },
  quickStats: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 15 },
  statBox: { alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  logoutButton: { padding: 15, alignItems: 'center', marginBottom: 20 },
  logoutText: { color: '#f44336', fontSize: 16, fontWeight: '500' },
});