import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Swipeable } from 'react-native-gesture-handler';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { COLORS } from '../../constants/config';
import { format, isToday, isYesterday } from 'date-fns';
import Ionicons from '@expo/vector-icons/Ionicons';

const NotificationIcon = ({ type, priority }) => {
  const getIconName = () => {
    switch(type) {
      case 'boarding_alert':
      case 'student_boarded':
      case 'boarding':
        return 'bus-outline';
      case 'alighting_alert':
      case 'student_alighted':
      case 'alighting':
      case 'attendance':
        return 'home-outline';
      case 'trip_start':
      case 'trip_started':
        return 'play-outline';
      case 'trip_complete':
      case 'trip_completed':
        return 'checkmark-circle-outline';
      case 'trip_cancelled':
        return 'close-circle-outline';
      case 'trip_delayed':
        return 'time-outline';
      case 'driver_message':
      case 'driver_broadcast':
      case 'message':
        return 'chatbubble-outline';
      case 'delay_report':
        return 'alert-circle-outline';
      case 'geofence':
        return 'location-outline';
      case 'speed':
        return 'speedometer-outline';
      case 'emergency':
        return 'warning-outline';
      case 'admin_broadcast':
        return 'megaphone-outline';
      case 'system':
        return 'settings-outline';
      default:
        return 'notifications-outline';
    }
  };

  const getColor = () => {
    if (priority === 'high' || type === 'emergency') return '#f44336';
    if (type === 'trip_cancelled') return '#f44336';
    if (type === 'trip_delayed') return '#FF9800';
    if (type === 'trip_started' || type === 'trip_start') return '#4CAF50';
    if (type === 'trip_completed' || type === 'trip_complete') return '#4CAF50';
    if (type === 'boarding_alert' || type === 'student_boarded') return '#4CAF50';
    if (type === 'alighting_alert' || type === 'student_alighted') return '#2196F3';
    if (type === 'driver_message') return '#9C27B0';
    if (type === 'delay_report') return '#FF9800';
    if (type === 'admin_broadcast') return '#607D8B';
    return '#757575';
  };

  return (
    <View style={[styles.notificationIcon, { backgroundColor: getColor() }]}>
      <Ionicons name={getIconName()} size={24} color="#fff" />
    </View>
  );
};

const FilterTab = ({ label, active, onPress, count }) => (
  <TouchableOpacity
    style={[styles.filterTab, active && styles.activeFilterTab]}
    onPress={onPress}
  >
    <Text style={[styles.filterText, active && styles.activeFilterText]}>
      {label}
    </Text>
    {count > 0 && (
      <View style={[styles.filterBadge, active && styles.activeFilterBadge]}>
        <Text style={[styles.filterBadgeText, active && styles.activeFilterBadgeText]}>
          {count}
        </Text>
      </View>
    )}
  </TouchableOpacity>
);

const EmptyState = ({ filter }) => (
  <View style={styles.emptyContainer}>
    <Ionicons name="notifications-off-outline" size={60} color="#ccc" />
    <Text style={styles.emptyTitle}>No Notifications</Text>
    <Text style={styles.emptyText}>
      {filter !== 'all' 
        ? `No ${filter} notifications found.` 
        : "You're all caught up! Check back later for updates about your children."}
    </Text>
  </View>
);

export default function NotificationsScreen({ navigation }) {
  const { user } = useAuth();
  const { alerts, isConnected } = useSocket();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    highPriority: 0,
  });

  const loadNotifications = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      
      const response = await api.get(`/notifications?page=${pageNum}&limit=20`);
      const data = response.data;
      
      if (data.success) {
        const newNotifications = data.data || [];
        const pagination = data.pagination || {};
        
        setNotifications(prev => append ? [...prev, ...newNotifications] : newNotifications);
        setHasMore(pageNum < (pagination.pages || 1));
        setPage(pageNum);
        
        if (pagination.unread !== undefined) {
          setStats(prev => ({
            ...prev,
            unread: pagination.unread,
            total: pagination.total || newNotifications.length,
          }));
        }
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const response = await api.get('/notifications/unread/count');
      if (response.data.success) {
        setStats(prev => ({
          ...prev,
          unread: response.data.data?.unreadCount || 0,
        }));
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    loadStats();
  }, [loadNotifications, loadStats]);

  // Handle real-time socket alerts
  useEffect(() => {
    if (alerts && alerts.length > 0) {
      const newAlerts = alerts.map(alert => ({
        _id: `alert-${Date.now()}-${Math.random()}`,
        type: alert.type || 'general',
        title: getNotificationTitle(alert),
        message: alert.message || getNotificationMessage(alert),
        createdAt: alert.timestamp || new Date().toISOString(),
        isRead: false,
        priority: alert.type === 'emergency' ? 'high' : 'normal',
        metadata: alert.data || {},
        studentId: alert.studentId ? { firstName: alert.childName, lastName: '' } : null,
        tripId: alert.tripId ? { routeName: alert.busNumber ? `Bus ${alert.busNumber}` : 'School Bus' } : null,
        smsSent: alert.smsSent || false,
      }));
      
      setNotifications(prev => {
        const merged = [...newAlerts, ...prev];
        const unique = merged.filter((item, index, self) =>
          index === self.findIndex(t => t._id === item._id)
        );
        return unique.slice(0, 100);
      });
      
      loadStats();
    }
  }, [alerts, loadStats]);

  const getNotificationTitle = (notification) => {
    const type = notification.type;
    const childName = notification.childName || notification.metadata?.studentName || 'Student';
    
    switch(type) {
      case 'boarding_alert':
      case 'student_boarded':
        return `${childName} Boarded`;
      case 'alighting_alert':
      case 'student_alighted':
        return `${childName} Alighted`;
      case 'trip_start':
      case 'trip_started':
        return 'Trip Started';
      case 'trip_complete':
      case 'trip_completed':
        return 'Trip Completed';
      case 'trip_cancelled':
        return 'Trip Cancelled';
      case 'trip_delayed':
        return 'Trip Delayed';
      case 'driver_message':
      case 'driver_broadcast':
        return 'Message from Driver';
      case 'delay_report':
        return 'Delay Report';
      case 'emergency':
        return 'EMERGENCY ALERT';
      case 'admin_broadcast':
        return 'Announcement';
      default:
        return notification.title || 'Notification';
    }
  };

  const getNotificationMessage = (notification) => {
    const type = notification.type;
    const childName = notification.childName || notification.metadata?.studentName || 'Student';
    const busNumber = notification.busNumber || notification.metadata?.busNumber || 'Bus';
    const time = notification.timestamp ? format(new Date(notification.timestamp), 'h:mm a') : '';
    const location = notification.location || notification.metadata?.location || 'pickup point';
    
    switch(type) {
      case 'boarding_alert':
      case 'student_boarded':
        return `${childName} has boarded ${busNumber} at ${location} at ${time}.`;
      case 'alighting_alert':
      case 'student_alighted':
        return `${childName} has alighted from ${busNumber} at ${location} at ${time}.`;
      case 'trip_start':
      case 'trip_started':
        return `The bus has started its journey. Your child is on the way to school.`;
      case 'trip_complete':
      case 'trip_completed':
        return `The bus trip has been completed. Your child has arrived safely.`;
      case 'trip_cancelled':
        return `The scheduled trip has been CANCELLED. Please make alternative arrangements.`;
      case 'trip_delayed':
        return `${notification.message || `The bus is delayed by approximately ${notification.metadata?.minutes || 'some'} minutes.`}`;
      case 'driver_message':
        return notification.message;
      case 'delay_report':
        return `Delay reported: ${notification.metadata?.reason || 'Unknown reason'}.`;
      case 'emergency':
        return `EMERGENCY SITUATION reported. Please check app for updates.`;
      case 'admin_broadcast':
        return notification.message;
      default:
        return notification.message;
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications(1, false);
    await loadStats();
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      loadNotifications(page + 1, true);
    }
  };

  const markAsRead = async (id) => {
    try {
      const response = await api.put(`/notifications/${id}/read`);
      if (response.data.success) {
        setNotifications(prev =>
          prev.map(notif => notif._id === id ? { ...notif, isRead: true } : notif)
        );
        setStats(prev => ({
          ...prev,
          unread: Math.max(0, prev.unread - 1),
        }));
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    Alert.alert(
      'Mark All as Read',
      'Mark all notifications as read?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark All',
          onPress: async () => {
            try {
              const response = await api.put('/notifications/read-all');
              if (response.data.success) {
                setNotifications(prev =>
                  prev.map(notif => ({ ...notif, isRead: true }))
                );
                setStats(prev => ({ ...prev, unread: 0 }));
              }
            } catch (error) {
              console.error('Error marking all as read:', error);
              Alert.alert('Error', 'Failed to mark all as read');
            }
          },
        },
      ]
    );
  };

  const deleteNotification = async (id) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.delete(`/notifications/${id}`);
              if (response.data.success) {
                setNotifications(prev => prev.filter(n => n._id !== id));
                loadStats();
              }
            } catch (error) {
              console.error('Error deleting notification:', error);
              Alert.alert('Error', 'Failed to delete notification');
            }
          },
        },
      ]
    );
  };

  const clearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Delete all notifications? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.delete('/notifications/clear/all');
              if (response.data.success) {
                setNotifications([]);
                setStats(prev => ({ ...prev, total: 0, unread: 0, highPriority: 0 }));
              }
            } catch (error) {
              console.error('Error clearing notifications:', error);
              Alert.alert('Error', 'Failed to clear notifications');
            }
          },
        },
      ]
    );
  };

  const handleNotificationPress = async (notification) => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }
    
    const type = notification.type;
    const metadata = notification.metadata || {};
    
    switch (type) {
      case 'boarding_alert':
      case 'alighting_alert':
      case 'student_boarded':
      case 'student_alighted':
        if (notification.studentId || metadata.studentId) {
          navigation.navigate('ChildTracking', { 
            childId: notification.studentId?._id || metadata.studentId,
            childName: metadata.studentName || 'Student'
          });
        } else {
          navigation.navigate('Tracking');
        }
        break;
      case 'trip_start':
      case 'trip_complete':
      case 'trip_started':
      case 'trip_completed':
      case 'trip_cancelled':
        navigation.navigate('Tracking');
        break;
      case 'driver_message':
        navigation.navigate('Messages');
        break;
      case 'emergency':
        navigation.navigate('Emergency', { alert: notification });
        break;
      default:
        break;
    }
  };

  const renderRightActions = (notification) => (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={() => deleteNotification(notification._id)}
    >
      <Ionicons name="trash-outline" size={24} color="#fff" />
    </TouchableOpacity>
  );

  const filterNotifications = () => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.isRead);
      case 'alerts':
        return notifications.filter(n => 
          ['geofence', 'speed', 'emergency', 'delay_report', 'trip_cancelled'].includes(n.type)
        );
      case 'updates':
        return notifications.filter(n => 
          ['boarding_alert', 'alighting_alert', 'student_boarded', 'student_alighted', 
           'trip_start', 'trip_complete', 'trip_started', 'trip_completed', 'driver_message'].includes(n.type)
        );
      default:
        return notifications;
    }
  };

  const groupNotificationsByDate = () => {
    const filtered = filterNotifications();
    const groups = {};

    filtered.forEach(notification => {
      const date = new Date(notification.createdAt);
      let groupKey;

      if (isToday(date)) {
        groupKey = 'Today';
      } else if (isYesterday(date)) {
        groupKey = 'Yesterday';
      } else {
        groupKey = format(date, 'MMMM dd, yyyy');
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(notification);
    });

    return groups;
  };

  const renderNotification = ({ item }) => (
    <Swipeable renderRightActions={() => renderRightActions(item)}>
      <TouchableOpacity
        style={[styles.notificationItem, !item.isRead && styles.unreadItem]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <NotificationIcon type={item.type} priority={item.priority} />
        
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationTitle} numberOfLines={1}>
              {item.title || getNotificationTitle(item)}
            </Text>
            <Text style={styles.notificationTime}>
              {format(new Date(item.createdAt), 'HH:mm')}
            </Text>
          </View>
          
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {item.message || getNotificationMessage(item)}
          </Text>
          
          <View style={styles.notificationFooter}>
            {item.studentId && (
              <Text style={styles.childName}>
                Student: {item.studentId.firstName} {item.studentId.lastName}
              </Text>
            )}
            {item.tripId?.routeName && (
              <Text style={styles.busNumber}>Trip: {item.tripId.routeName}</Text>
            )}
            {item.smsSent && (
              <Text style={styles.smsBadge}>SMS sent</Text>
            )}
            {item.priority === 'high' && (
              <View style={styles.priorityBadge}>
                <Text style={styles.priorityText}>URGENT</Text>
              </View>
            )}
          </View>
        </View>

        {!item.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    </Swipeable>
  );

  const groupedNotifications = groupNotificationsByDate();
  const sections = Object.keys(groupedNotifications).map(date => ({
    title: date,
    data: groupedNotifications[date],
  }));

  // Calculate high priority count
  const highPriorityCount = notifications.filter(n => 
    n.priority === 'high' || n.type === 'emergency' || n.type === 'trip_cancelled'
  ).length;

  if (loading && notifications.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.headerText}>Notifications</Text>
          {stats.unread > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{stats.unread}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          {stats.unread > 0 && (
            <TouchableOpacity onPress={markAllAsRead} style={styles.headerButton}>
              <Ionicons name="checkmark-done-outline" size={20} color="#fff" />
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity onPress={clearAll} style={styles.headerButton}>
              <Ionicons name="trash-outline" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Ionicons name="wifi-outline" size={16} color="#fff" />
          <Text style={styles.offlineText}>
            Offline mode. Notifications may be delayed.
          </Text>
        </View>
      )}

      <View style={styles.filterContainer}>
        <FilterTab
          label="All"
          active={filter === 'all'}
          onPress={() => setFilter('all')}
          count={notifications.length}
        />
        <FilterTab
          label="Unread"
          active={filter === 'unread'}
          onPress={() => setFilter('unread')}
          count={stats.unread}
        />
        <FilterTab
          label="Alerts"
          active={filter === 'alerts'}
          onPress={() => setFilter('alerts')}
          count={notifications.filter(n => 
            ['geofence', 'speed', 'emergency', 'delay_report', 'trip_cancelled'].includes(n.type)
          ).length}
        />
        <FilterTab
          label="Updates"
          active={filter === 'updates'}
          onPress={() => setFilter('updates')}
          count={notifications.filter(n => 
            ['boarding_alert', 'alighting_alert', 'student_boarded', 'student_alighted', 
             'trip_start', 'trip_complete', 'trip_started', 'trip_completed', 'driver_message'].includes(n.type)
          ).length}
        />
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{highPriorityCount}</Text>
          <Text style={styles.statLabel}>Urgent</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.unread}</Text>
          <Text style={styles.statLabel}>Unread</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{notifications.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      <FlatList
        data={sections}
        keyExtractor={(item) => item.title}
        renderItem={({ item }) => (
          <View>
            <Text style={styles.sectionHeader}>{item.title}</Text>
            {item.data.map(notification => (
              <View key={notification._id}>
                {renderNotification({ item: notification })}
              </View>
            ))}
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={<EmptyState filter={filter} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {isConnected && notifications.length > 0 && (
        <View style={styles.realtimeIndicator}>
          <View style={styles.realtimeDot} />
          <Text style={styles.realtimeText}>Live updates</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  header: { 
    paddingTop: 50, 
    paddingBottom: 15, 
    paddingHorizontal: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  backButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.3)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerTitle: { flexDirection: 'row', alignItems: 'center' },
  headerText: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginRight: 8 },
  headerBadge: { 
    backgroundColor: '#f44336', 
    borderRadius: 12, 
    minWidth: 24, 
    height: 24, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 6 
  },
  headerBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  headerActions: { flexDirection: 'row' },
  headerButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.3)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginLeft: 8 
  },
  offlineBanner: { 
    backgroundColor: '#f44336', 
    padding: 10, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  offlineText: { color: '#fff', fontSize: 12, fontWeight: '500', marginLeft: 8 },
  filterContainer: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    paddingVertical: 10, 
    paddingHorizontal: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0' 
  },
  filterTab: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 6, 
    paddingHorizontal: 12, 
    borderRadius: 20, 
    marginRight: 8 
  },
  activeFilterTab: { backgroundColor: COLORS.primary },
  filterText: { fontSize: 13, color: '#666', marginRight: 4 },
  activeFilterText: { color: '#fff' },
  filterBadge: { 
    backgroundColor: '#e0e0e0', 
    borderRadius: 10, 
    minWidth: 18, 
    height: 18, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 4 
  },
  activeFilterBadge: { backgroundColor: 'rgba(255,255,255,0.3)' },
  filterBadgeText: { fontSize: 10, color: '#666' },
  activeFilterBadgeText: { color: '#fff' },
  statsBar: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    paddingVertical: 12, 
    paddingHorizontal: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0' 
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary },
  statLabel: { fontSize: 11, color: '#999', marginTop: 2 },
  statDivider: { width: 1, height: '100%', backgroundColor: '#f0f0f0' },
  listContent: { paddingBottom: 80 },
  sectionHeader: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#666', 
    backgroundColor: '#f5f5f5', 
    paddingHorizontal: 15, 
    paddingVertical: 8 
  },
  notificationItem: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    padding: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0', 
    position: 'relative' 
  },
  unreadItem: { backgroundColor: '#f0f7ff' },
  notificationIcon: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  notificationContent: { flex: 1 },
  notificationHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 4 
  },
  notificationTitle: { fontSize: 15, fontWeight: '600', color: '#333', flex: 1, marginRight: 8 },
  notificationTime: { fontSize: 11, color: '#999' },
  notificationMessage: { fontSize: 13, color: '#666', marginBottom: 6, lineHeight: 18 },
  notificationFooter: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  childName: { fontSize: 11, color: COLORS.primary },
  busNumber: { fontSize: 11, color: '#FF9800' },
  smsBadge: { fontSize: 10, color: '#4CAF50', fontWeight: '500' },
  priorityBadge: { backgroundColor: '#f44336', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  priorityText: { color: '#fff', fontSize: 8, fontWeight: 'bold' },
  unreadDot: { 
    position: 'absolute', 
    top: 20, 
    right: 15, 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: COLORS.primary 
  },
  deleteAction: { backgroundColor: '#f44336', justifyContent: 'center', alignItems: 'center', width: 70 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
  realtimeIndicator: { 
    position: 'absolute', 
    bottom: 20, 
    right: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 20 
  },
  realtimeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50', marginRight: 6 },
  realtimeText: { color: '#fff', fontSize: 12, fontWeight: '500' },
});