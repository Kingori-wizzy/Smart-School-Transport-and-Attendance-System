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
import { useTheme } from '../../context/ThemeContext';
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
  const { colors } = useTheme();
  
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
    cache.keys.children(),
    []
  );

  useEffect(() => {
    loadDashboardData();
  }, [childrenList.length]);

  useEffect(() => {
    if (alerts.length > 0) {
      const recent = alerts.slice(0, 3);
      setRecentAlerts(recent);
      cache.recentAlerts.save(recent);
    }
  }, [alerts]);

  useEffect(() => {
    loadCachedAlerts();
  }, []);

  const loadCachedAlerts = async () => {
    const cached = await cache.recentAlerts.get();
    if (cached && recentAlerts.length === 0) {
      setRecentAlerts(cached);
      setIsFromCache(true);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
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
          const cachedAttendance = await cache.attendance.get(childId);
          const cachedLocation = await cache.location.get(childId);

          if (isOffline && cachedAttendance && cachedLocation) {
            return {
              childId,
              attendance: cachedAttendance,
              location: cachedLocation,
            };
          }

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

      const anyFromCache = statuses.some(s => !s.attendance && !s.location);
      setIsFromCache(anyFromCache || childrenFromCache);
      
      setChildStatus(statusMap);
      
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

  // ✅ FIXED: Proper greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    if (hour < 20) return 'Good Evening';
    return 'Good Night';
  };

  const getAttendanceStatus = (child) => {
    const childId = child._id || child.id;
    const status = childStatus[childId];
    
    if (!status?.attendance) {
      return { text: 'Not recorded', color: colors.textSecondary, icon: '⏳' };
    }
    
    if (status.attendance.present) {
      return { text: 'Present', color: colors.success, icon: '✅' };
    } else if (status.attendance.absent) {
      return { text: 'Absent', color: colors.danger, icon: '❌' };
    } else if (status.attendance.late) {
      return { text: 'Late', color: colors.warning, icon: '⚠️' };
    }
    return { text: 'Unknown', color: colors.textSecondary, icon: '❓' };
  };

  const getBusStatus = (child) => {
    const childId = child._id || child.id;
    const status = childStatus[childId];
    
    if (!status?.location?.location) {
      return { text: 'No active bus', color: colors.textSecondary, icon: '🚌' };
    }
    
    const speed = status.location.location.speed;
    if (speed > 0) {
      return { text: `${speed} km/h`, color: colors.success, icon: '🚌' };
    } else {
      return { text: 'Stopped', color: colors.warning, icon: '🚌' };
    }
  };

  const ChildCard = ({ child }) => {
    const attendance = getAttendanceStatus(child);
    const bus = getBusStatus(child);

    return (
      <View style={[styles.childCard, { backgroundColor: colors.card }]}>
        <View style={styles.childHeader}>
          <View style={[styles.childAvatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.childAvatarText}>
              {child.firstName?.charAt(0)}{child.lastName?.charAt(0)}
            </Text>
          </View>
          <View style={styles.childInfo}>
            <Text style={[styles.childName, { color: colors.text }]}>{child.firstName} {child.lastName}</Text>
            <Text style={[styles.childClass, { color: colors.textSecondary }]}>Class: {child.classLevel}</Text>
            <Text style={[styles.childId, { color: colors.textSecondary }]}>ID: {child.admissionNumber}</Text>
          </View>
        </View>

        <View style={[styles.statusRow, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          <View style={styles.statusItem}>
            <Text style={styles.statusIcon}>{attendance.icon}</Text>
            <View>
              <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Attendance</Text>
              <Text style={[styles.statusValue, { color: attendance.color }]}>
                {attendance.text}
              </Text>
            </View>
          </View>

          <View style={[styles.statusDivider, { backgroundColor: colors.border }]} />

          <View style={styles.statusItem}>
            <Text style={styles.statusIcon}>{bus.icon}</Text>
            <View>
              <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Bus Status</Text>
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
            <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.actionGradient}>
              <Text style={styles.actionIcon}>📍</Text>
              <Text style={[styles.actionText, { color: '#fff' }]}>Track</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Attendance', { child })}
          >
            <LinearGradient colors={[colors.success, '#45a049']} style={styles.actionGradient}>
              <Text style={styles.actionIcon}>📊</Text>
              <Text style={[styles.actionText, { color: '#fff' }]}>Attendance</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('ChildDetails', { child })}
          >
            <LinearGradient colors={[colors.warning, '#F57C00']} style={styles.actionGradient}>
              <Text style={styles.actionIcon}>👤</Text>
              <Text style={[styles.actionText, { color: '#fff' }]}>Details</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const RecentAlert = ({ alert }) => (
    <TouchableOpacity
      style={[styles.alertItem, { backgroundColor: colors.card }]}
      onPress={() => navigation.navigate('Notifications')}
    >
      <View style={[styles.alertIcon, { backgroundColor: alert.type === 'geofence' ? colors.info : colors.danger }]}>
        <Text style={styles.alertIconText}>{alert.type === 'geofence' ? '📍' : '🚨'}</Text>
      </View>
      <View style={styles.alertContent}>
        <Text style={[styles.alertMessage, { color: colors.text }]} numberOfLines={1}>{alert.message}</Text>
        <Text style={[styles.alertTime, { color: colors.textSecondary }]}>{format(new Date(alert.timestamp), 'HH:mm')}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading your children...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ✅ FIXED: Reduced header height and adjusted padding */}
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.greeting, { color: 'rgba(255,255,255,0.9)' }]}>{getGreeting()},</Text>
            <Text style={[styles.userName, { color: '#fff' }]}>{user?.firstName} {user?.lastName}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Text style={styles.notificationIcon}>🔔</Text>
              {recentAlerts.length > 0 && (
                <View style={[styles.notificationBadge, { backgroundColor: colors.danger }]}>
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
          <Text style={[styles.statusText, { color: 'rgba(255,255,255,0.9)' }]}>
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
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Children</Text>
          {childrenList.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
              <Text style={[styles.emptyIcon, { color: colors.textSecondary }]}>👶</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Children Added</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Add your children to start tracking their school transport
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('AddChild')}
              >
                <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.addButtonGradient}>
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
                style={[styles.addChildButton, { borderColor: colors.primary }]}
                onPress={() => navigation.navigate('AddChild')}
              >
                <Text style={[styles.addChildIcon, { color: colors.primary }]}>+</Text>
                <Text style={[styles.addChildText, { color: colors.primary }]}>Add Another Child</Text>
              </TouchableOpacity>
            </>
          )}

          {recentAlerts.length > 0 && (
            <View style={styles.alertsSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Alerts</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
                  <Text style={[styles.seeAllText, { color: colors.primary }]}>See All</Text>
                </TouchableOpacity>
              </View>
              {recentAlerts.map((alert, index) => (
                <RecentAlert key={index} alert={alert} />
              ))}
            </View>
          )}

          <View style={[styles.quickStats, { backgroundColor: colors.card }]}>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{childrenList.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Children</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>
                {Object.values(childStatus).filter(s => s?.location?.location?.speed > 0).length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Buses Moving</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{recentAlerts.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Alerts</Text>
            </View>
          </View>

          <TouchableOpacity style={[styles.logoutButton, { borderColor: colors.danger }]} onPress={logout}>
            <Text style={[styles.logoutText, { color: colors.danger }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ✅ FIXED: Updated styles with reduced header height
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16 },
  // ✅ FIXED: Reduced header padding
  header: { 
    paddingTop: 40, 
    paddingBottom: 15, 
    paddingHorizontal: 20 
  },
  headerTop: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  greeting: { fontSize: 14 },
  userName: { fontSize: 20, fontWeight: 'bold' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  notificationButton: { position: 'relative', marginRight: 15, padding: 5 },
  notificationIcon: { fontSize: 24 },
  notificationBadge: { 
    position: 'absolute', 
    top: 0, 
    right: 0, 
    borderRadius: 10, 
    minWidth: 18, 
    height: 18, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  notificationBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  profileButton: { padding: 5 },
  profileIcon: { fontSize: 24 },
  connectionStatus: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  online: { backgroundColor: '#4CAF50' },
  offline: { backgroundColor: '#f44336' },
  statusText: { fontSize: 12 },
  scrollContent: { 
    paddingBottom: 20,
    paddingTop: 5 
  },
  content: { padding: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  childCard: { 
    borderRadius: 15, 
    padding: 15, 
    marginBottom: 15, 
    elevation: 3 
  },
  childHeader: { flexDirection: 'row', marginBottom: 15 },
  childAvatar: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  childAvatarText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  childInfo: { flex: 1 },
  childName: { fontSize: 16, fontWeight: 'bold' },
  childClass: { fontSize: 13, marginTop: 2 },
  childId: { fontSize: 12, marginTop: 2 },
  statusRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    paddingVertical: 12, 
    borderTopWidth: 1, 
    borderBottomWidth: 1, 
    marginBottom: 12 
  },
  statusItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  statusIcon: { fontSize: 20, marginRight: 8 },
  statusLabel: { fontSize: 11 },
  statusValue: { fontSize: 13, fontWeight: '600' },
  statusDivider: { width: 1, height: '100%' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionButton: { flex: 1, marginHorizontal: 4, borderRadius: 8, overflow: 'hidden' },
  actionGradient: { paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  actionIcon: { fontSize: 16, marginBottom: 2 },
  actionText: { fontSize: 11, fontWeight: '500' },
  emptyState: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 40, 
    borderRadius: 15 
  },
  emptyIcon: { fontSize: 50, marginBottom: 15 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', marginBottom: 20, paddingHorizontal: 30 },
  addButton: { width: '80%', height: 45, borderRadius: 10, overflow: 'hidden' },
  addButtonGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  addChildButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#fff', 
    padding: 15, 
    borderRadius: 10, 
    borderWidth: 1, 
    borderStyle: 'dashed', 
    marginBottom: 20 
  },
  addChildIcon: { fontSize: 20, marginRight: 8, fontWeight: 'bold' },
  addChildText: { fontSize: 14, fontWeight: '500' },
  alertsSection: { marginTop: 10, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  seeAllText: { fontSize: 14, fontWeight: '500' },
  alertItem: { 
    flexDirection: 'row', 
    padding: 12, 
    borderRadius: 10, 
    marginBottom: 8, 
    elevation: 2 
  },
  alertIcon: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  alertIconText: { fontSize: 20 },
  alertContent: { flex: 1, justifyContent: 'center' },
  alertMessage: { fontSize: 14, marginBottom: 2 },
  alertTime: { fontSize: 11 },
  quickStats: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    padding: 15, 
    borderRadius: 10, 
    marginBottom: 15 
  },
  statBox: { alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: 'bold' },
  statLabel: { fontSize: 12, marginTop: 4 },
  statDivider: { width: 1, height: 30 },
  logoutButton: { 
    padding: 15, 
    alignItems: 'center', 
    marginBottom: 20,
    borderWidth: 1,
    borderRadius: 10
  },
  logoutText: { fontSize: 16, fontWeight: '500' },
});