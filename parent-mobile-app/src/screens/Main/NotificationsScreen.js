import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { COLORS } from '../../constants/config';
import { format, isToday, isYesterday } from 'date-fns';

export default function NotificationsScreen({ navigation }) {
  const { user } = useAuth();
  const { alerts, isConnected } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, unread, alerts, updates

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    // Merge socket alerts with fetched notifications
    if (alerts.length > 0) {
      const newAlerts = alerts.map(alert => ({
        id: alert.id,
        type: alert.type,
        title: alert.message,
        message: alert.message,
        timestamp: alert.timestamp,
        read: false,
        data: alert.data,
        priority: alert.type === 'speed' || alert.type === 'geofence' ? 'high' : 'normal',
      }));
      
      setNotifications(prev => {
        const merged = [...newAlerts, ...prev];
        // Remove duplicates
        const unique = merged.filter((item, index, self) =>
          index === self.findIndex(t => t.id === item.id)
        );
        return unique;
      });
    }
  }, [alerts]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      // Replace with your actual API endpoint
      const response = await api.get('/notifications');
      
      if (response.data) {
        setNotifications(response.data);
      } else {
        // Mock data
        setNotifications([
          {
            id: '1',
            type: 'boarding',
            title: 'Child Boarded Bus',
            message: 'John has boarded the bus at 07:15 AM',
            timestamp: new Date(Date.now() - 30 * 60000),
            read: false,
            priority: 'normal',
            childId: 'child1',
            childName: 'John',
          },
          {
            id: '2',
            type: 'attendance',
            title: 'Attendance Recorded',
            message: 'John was marked present for today',
            timestamp: new Date(Date.now() - 2 * 3600000),
            read: true,
            priority: 'normal',
          },
          {
            id: '3',
            type: 'geofence',
            title: '📍 Geofence Alert',
            message: 'Bus has entered school zone',
            timestamp: new Date(Date.now() - 3 * 3600000),
            read: false,
            priority: 'high',
          },
          {
            id: '4',
            type: 'speed',
            title: '🚨 Speed Alert',
            message: 'Bus is exceeding speed limit (85 km/h)',
            timestamp: new Date(Date.now() - 5 * 3600000),
            read: false,
            priority: 'high',
          },
          {
            id: '5',
            type: 'system',
            title: 'System Update',
            message: 'App has been updated to version 1.0.0',
            timestamp: new Date(Date.now() - 24 * 3600000),
            read: true,
            priority: 'low',
          },
          {
            id: '6',
            type: 'attendance',
            title: 'Absent Alert',
            message: 'John was marked absent today',
            timestamp: new Date(Date.now() - 2 * 24 * 3600000),
            read: false,
            priority: 'high',
          },
        ]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );
      Alert.alert('Success', 'All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
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
              await api.delete(`/notifications/${id}`);
              setNotifications(prev => prev.filter(n => n.id !== id));
            } catch (error) {
              console.error('Error deleting notification:', error);
            }
          },
        },
      ]
    );
  };

  const clearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/notifications/all');
              setNotifications([]);
            } catch (error) {
              console.error('Error clearing notifications:', error);
            }
          },
        },
      ]
    );
  };

  const handleNotificationPress = (notification) => {
    markAsRead(notification.id);
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'boarding':
      case 'attendance':
        if (notification.childId) {
          navigation.navigate('Attendance', { childId: notification.childId });
        }
        break;
      case 'geofence':
      case 'speed':
        navigation.navigate('Tracking', { busId: notification.data?.busId });
        break;
      default:
        // Just mark as read
        break;
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'boarding': return '🚌';
      case 'attendance': return '📝';
      case 'geofence': return '📍';
      case 'speed': return '🚨';
      case 'fuel': return '⛽';
      case 'system': return '⚙️';
      default: return '🔔';
    }
  };

  const getNotificationColor = (type, priority) => {
    if (priority === 'high') return '#f44336';
    switch (type) {
      case 'boarding': return '#4CAF50';
      case 'attendance': return '#2196F3';
      case 'geofence': return '#FF9800';
      case 'speed': return '#f44336';
      case 'system': return '#9C27B0';
      default: return '#666';
    }
  };

  const filterNotifications = () => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.read);
      case 'alerts':
        return notifications.filter(n => 
          ['geofence', 'speed', 'fuel'].includes(n.type)
        );
      case 'updates':
        return notifications.filter(n => 
          ['attendance', 'boarding', 'system'].includes(n.type)
        );
      default:
        return notifications;
    }
  };

  const groupNotificationsByDate = () => {
    const filtered = filterNotifications();
    const groups = {};

    filtered.forEach(notification => {
      const date = new Date(notification.timestamp);
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

  const unreadCount = notifications.filter(n => !n.read).length;
  const groupedNotifications = groupNotificationsByDate();

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.read && styles.unreadItem,
      ]}
      onPress={() => handleNotificationPress(item)}
      onLongPress={() => deleteNotification(item.id)}
    >
      <View style={[
        styles.notificationIcon,
        { backgroundColor: getNotificationColor(item.type, item.priority) }
      ]}>
        <Text style={styles.iconText}>{getNotificationIcon(item.type)}</Text>
      </View>
      
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationTime}>
            {format(new Date(item.timestamp), 'HH:mm')}
          </Text>
        </View>
        <Text style={styles.notificationMessage}>{item.message}</Text>
        {item.childName && (
          <Text style={styles.childName}>👤 {item.childName}</Text>
        )}
      </View>

      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section: { title } }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

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
        <View style={styles.headerTitle}>
          <Text style={styles.headerText}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllAsRead} style={styles.headerButton}>
              <Text style={styles.headerButtonText}>✓✓</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={clearAll} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {['all', 'unread', 'alerts', 'updates'].map((filterType) => (
          <TouchableOpacity
            key={filterType}
            style={[
              styles.filterTab,
              filter === filterType && styles.activeFilterTab,
            ]}
            onPress={() => setFilter(filterType)}
          >
            <Text style={[
              styles.filterText,
              filter === filterType && styles.activeFilterText,
            ]}>
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Connection Status */}
      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            🔴 You're offline. Notifications may be delayed.
          </Text>
        </View>
      )}

      {/* Notifications List */}
      <FlatList
        data={Object.entries(groupedNotifications).flatMap(([date, items]) =>
          items.map(item => ({ ...item, date }))
        )}
        renderItem={renderNotification}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptyText}>
              You're all caught up! Check back later for updates.
            </Text>
          </View>
        }
        SectionHeaderComponent={renderSectionHeader}
        contentContainerStyle={styles.listContent}
      />

      {/* Real-time Indicator */}
      {isConnected && (
        <View style={styles.realtimeIndicator}>
          <View style={styles.realtimeDot} />
          <Text style={styles.realtimeText}>Live updates</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 10,
  },
  unreadBadge: {
    backgroundColor: '#f44336',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
    color: '#fff',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 20,
    marginHorizontal: 4,
  },
  activeFilterTab: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 12,
    color: '#666',
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: '500',
  },
  offlineBanner: {
    backgroundColor: '#f44336',
    padding: 10,
    alignItems: 'center',
  },
  offlineText: {
    color: '#fff',
    fontSize: 12,
  },
  listContent: {
    padding: 15,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 10,
    marginBottom: 5,
    paddingLeft: 5,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    position: 'relative',
  },
  unreadItem: {
    backgroundColor: '#f0f7ff',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  notificationIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  iconText: {
    fontSize: 24,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  notificationTime: {
    fontSize: 11,
    color: '#999',
  },
  notificationMessage: {
    fontSize: 13,
    color: '#666',
    marginBottom: 5,
  },
  childName: {
    fontSize: 12,
    color: COLORS.primary,
  },
  unreadDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 20,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  realtimeIndicator: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  realtimeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  realtimeText: {
    color: '#fff',
    fontSize: 12,
  },
});