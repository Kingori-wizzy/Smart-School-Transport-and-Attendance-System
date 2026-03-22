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
import { useChildren } from '../../context/ChildrenContext';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import { format } from 'date-fns';
import { useOffline } from '../../hooks/useOffline';
import OfflineBanner from '../../components/common/OfflineBanner';

export default function DashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { childrenList, loading: childrenLoading, refreshChildren, error: childrenError } = useChildren();
  const { isConnected: socketConnected, alerts } = useSocket();
  const { isOffline, isConnected } = useOffline();
  const { colors } = useTheme();
  
  const [refreshing, setRefreshing] = useState(false);
  const [childAttendance, setChildAttendance] = useState({});
  const [dashboardError, setDashboardError] = useState(null);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);

  console.log('🎯 DashboardScreen mounted');
  console.log('👥 ChildrenList:', childrenList?.length);
  console.log('📊 ChildrenLoading:', childrenLoading);

  // Load attendance for each child
  const loadAttendanceData = useCallback(async () => {
    console.log('🔄 loadAttendanceData START, children count:', childrenList?.length);
    
    if (!childrenList || childrenList.length === 0) {
      console.log('⚠️ No children, skipping attendance load');
      return;
    }

    setIsLoadingAttendance(true);
    const attendanceMap = {};
    
    for (const child of childrenList) {
      const childId = child._id || child.id;
      console.log(`📊 Fetching attendance for child: ${child.firstName} (${childId})`);
      
      try {
        // Use the correct API endpoint format
        const response = await api.attendance.getToday(childId);
        console.log(`✅ Attendance response for ${child.firstName}:`, response);
        
        if (response) {
          attendanceMap[childId] = {
            present: response.present || false,
            status: response.status || 'not recorded',
            checkIn: response.checkIn,
            busNumber: response.busNumber
          };
        } else {
          attendanceMap[childId] = { present: false, status: 'not recorded' };
        }
      } catch (err) {
        console.error(`❌ Error fetching attendance for ${child.firstName}:`, err.message);
        attendanceMap[childId] = { present: false, status: 'error', error: err.message };
      }
    }
    
    console.log('✅ loadAttendanceData COMPLETE, map size:', Object.keys(attendanceMap).length);
    setChildAttendance(attendanceMap);
    setIsLoadingAttendance(false);
    setDashboardError(null);
  }, [childrenList]);

  useEffect(() => {
    console.log('📱 Dashboard useEffect - childrenLoading:', childrenLoading, 'childrenCount:', childrenList?.length);
    if (!childrenLoading && childrenList.length > 0) {
      console.log('🚀 Calling loadAttendanceData...');
      loadAttendanceData();
    } else if (!childrenLoading && childrenList.length === 0) {
      console.log('📭 No children, skipping attendance load');
    }
  }, [childrenLoading, childrenList, loadAttendanceData]);

  // Greeting Logic
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const onRefresh = async () => {
    console.log('🔄 Manual refresh triggered');
    setRefreshing(true);
    try {
      await refreshChildren();
      await loadAttendanceData();
    } catch (err) {
      console.error('❌ Refresh error:', err);
      setDashboardError(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const ChildCard = ({ child }) => {
    const childId = child._id || child.id;
    const attendance = childAttendance[childId] || { present: false, status: 'loading' };
    const hasBus = !!(child.busId || child.transportDetails?.busId);
    const busNumber = child.busId?.busNumber || child.transportDetails?.busId?.busNumber || 'N/A';
    
    return (
      <View style={[styles.childCard, { backgroundColor: colors.card }]}>
        <View style={styles.childHeader}>
          <View style={[styles.childAvatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.childAvatarText}>
              {child.firstName?.charAt(0) || child.displayName?.charAt(0) || '?'}
            </Text>
          </View>
          <View style={styles.childInfo}>
            <Text style={[styles.childName, { color: colors.text }]}>
              {child.firstName} {child.lastName}
            </Text>
            <Text style={[styles.childClass, { color: colors.textSecondary }]}>
              {child.classLevel} | {child.admissionNumber}
            </Text>
          </View>
        </View>

        <View style={[styles.statusRow, { borderColor: colors.border }]}>
          <View style={styles.statusItem}>
            <Text style={styles.statusIcon}>
              {attendance.status === 'loading' ? '⏳' : (attendance.present ? '✅' : '⏳')}
            </Text>
            <View>
              <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Attendance</Text>
              <Text style={[styles.statusValue, { 
                color: attendance.present ? colors.success : 
                       attendance.status === 'error' ? colors.danger : 
                       colors.warning 
              }]}>
                {attendance.status === 'loading' ? 'Loading...' :
                 attendance.present ? 'Present' : 
                 attendance.status === 'late' ? 'Late' : 
                 attendance.status === 'error' ? 'Error' : 'Not recorded'}
              </Text>
            </View>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusIcon}>🚌</Text>
            <View>
              <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Bus Status</Text>
              <Text style={[styles.statusValue, { color: hasBus ? colors.success : colors.textSecondary }]}>
                {hasBus ? `Bus ${busNumber}` : 'Not assigned'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => navigation.navigate('Tracking', { child })}
            disabled={!hasBus}
          >
            <LinearGradient 
              colors={hasBus ? [colors.primary, colors.secondary] : ['#999', '#aaa']} 
              style={styles.actionGradient}
            >
              <Text style={styles.actionText}>Track</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => navigation.navigate('Attendance', { child })}
          >
            <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.actionGradient}>
              <Text style={styles.actionText}>History</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Show loading only on initial load
  if (childrenLoading && childrenList.length === 0) {
    console.log('⏳ Showing initial loading spinner');
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading your children...</Text>
      </View>
    );
  }

  // Show loading for attendance data
  if (isLoadingAttendance && childrenList.length > 0 && Object.keys(childAttendance).length === 0) {
    console.log('⏳ Loading attendance data...');
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading attendance data...</Text>
      </View>
    );
  }

  // Show error if any
  if (childrenError || dashboardError) {
    const errorMsg = childrenError || dashboardError;
    console.log('❌ Showing error:', errorMsg);
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorIcon]}>⚠️</Text>
        <Text style={[styles.errorTitle, { color: colors.text }]}>Unable to load data</Text>
        <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>{errorMsg}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  console.log('✅ Rendering dashboard with', childrenList.length, 'children');
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Children</Text>

        {childrenList.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
            <Text style={styles.emptyIcon}>👶</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Children Linked</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Link your child using their admission number
            </Text>
            
            <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('LinkChild')}>
              <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.linkButtonGradient}>
                <Text style={styles.linkButtonText}>Link with Admission No.</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {childrenList.map((child) => (
              <ChildCard key={child._id || child.id} child={child} />
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
  loadingText: { marginTop: 10, fontSize: 14 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  errorMessage: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  retryButton: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#2196F3', borderRadius: 8 },
  retryButtonText: { color: '#fff', fontWeight: '600' },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  userName: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  notificationIcon: { fontSize: 24 },
  scrollContent: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  childCard: { borderRadius: 15, padding: 15, marginBottom: 15, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
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
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  linkButton: { width: '100%', borderRadius: 10, overflow: 'hidden' },
  linkButtonGradient: { padding: 15, alignItems: 'center' },
  linkButtonText: { color: '#fff', fontWeight: 'bold' },
  addChildButton: { padding: 15, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', marginTop: 10 },
  logoutButton: { marginTop: 40, padding: 15, borderRadius: 10, borderWidth: 1, alignItems: 'center' }
});