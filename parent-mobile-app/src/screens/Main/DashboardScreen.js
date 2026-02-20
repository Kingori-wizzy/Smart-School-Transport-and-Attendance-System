import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { LinearGradient } from 'expo-linear-gradient';
import ChildSelector from '../../components/dashboard/ChildSelector';
import StatusCard from '../../components/dashboard/StatusCard';
import { format } from 'date-fns';

export default function DashboardScreen({ navigation }) {
  const { user, childrenList, logout } = useAuth();
  const { isConnected, alerts } = useSocket();
  const [selectedChild, setSelectedChild] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState({});

  useEffect(() => {
    if (childrenList.length > 0 && !selectedChild) {
      setSelectedChild(childrenList[0]);
    }
  }, [childrenList]);

  const onRefresh = async () => {
    setRefreshing(true);
    // Refresh data
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.userName}>{user?.name}</Text>
            </View>
            <View style={styles.headerRight}>
              <View style={[styles.statusDot, isConnected ? styles.online : styles.offline]} />
              <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
                <View style={styles.notificationBadge}>
                  <Text>🔔</Text>
                  {alerts.length > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{alerts.length}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Child Selector */}
          {childrenList.length > 0 && (
            <ChildSelector
              children={childrenList}
              selectedChild={selectedChild}
              onSelectChild={setSelectedChild}
            />
          )}
        </LinearGradient>

        {/* Main Content */}
        <View style={styles.content}>
          {selectedChild ? (
            <>
              {/* Quick Stats */}
              <View style={styles.statsGrid}>
                <StatusCard
                  title="Attendance"
                  value="Present"
                  icon="✅"
                  color="#4CAF50"
                  onPress={() => navigation.navigate('Attendance', { child: selectedChild })}
                />
                <StatusCard
                  title="Bus Status"
                  value="On Time"
                  icon="🚌"
                  color="#2196F3"
                  onPress={() => navigation.navigate('Tracking', { child: selectedChild })}
                />
                <StatusCard
                  title="ETA"
                  value="12 min"
                  icon="⏱️"
                  color="#FF9800"
                />
                <StatusCard
                  title="Messages"
                  value="2"
                  icon="💬"
                  color="#9C27B0"
                  onPress={() => navigation.navigate('Messages')}
                />
              </View>

              {/* Live Tracking Preview */}
              <TouchableOpacity
                style={styles.mapPreview}
                onPress={() => navigation.navigate('Tracking', { child: selectedChild })}
              >
                <LinearGradient
                  colors={['#2196F3', '#1976D2']}
                  style={styles.mapPreviewContent}
                >
                  <Text style={styles.mapPreviewTitle}>Live Tracking</Text>
                  <Text style={styles.mapPreviewSubtitle}>
                    Tap to see {selectedChild.name}'s bus on map
                  </Text>
                  <View style={styles.mapPlaceholder}>
                    <Text style={styles.mapIcon}>🗺️</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* Today's Schedule */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Today's Schedule</Text>
                <View style={styles.scheduleCard}>
                  <View style={styles.scheduleItem}>
                    <Text style={styles.scheduleTime}>07:00 AM</Text>
                    <Text style={styles.scheduleEvent}>Pick up from home</Text>
                  </View>
                  <View style={styles.scheduleItem}>
                    <Text style={styles.scheduleTime}>07:45 AM</Text>
                    <Text style={styles.scheduleEvent}>Arrive at school</Text>
                  </View>
                  <View style={styles.scheduleItem}>
                    <Text style={styles.scheduleTime}>04:00 PM</Text>
                    <Text style={styles.scheduleEvent}>Depart from school</Text>
                  </View>
                  <View style={styles.scheduleItem}>
                    <Text style={styles.scheduleTime}>04:45 PM</Text>
                    <Text style={styles.scheduleEvent}>Drop off at home</Text>
                  </View>
                </View>
              </View>

              {/* Recent Alerts */}
              {alerts.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Recent Alerts</Text>
                  {alerts.slice(0, 3).map((alert, index) => (
                    <TouchableOpacity
                      key={alert.id}
                      style={[
                        styles.alertCard,
                        { borderLeftColor: alert.type === 'geofence' ? '#2196F3' : 
                                         alert.type === 'speed' ? '#f44336' : '#4CAF50' }
                      ]}
                      onPress={() => navigation.navigate('Notifications')}
                    >
                      <Text style={styles.alertMessage}>{alert.message}</Text>
                      <Text style={styles.alertTime}>
                        {format(new Date(alert.timestamp), 'HH:mm')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Quick Actions */}
              <View style={styles.quickActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('Attendance', { child: selectedChild })}
                >
                  <Text style={styles.actionIcon}>📊</Text>
                  <Text style={styles.actionText}>Attendance</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('Tracking', { child: selectedChild })}
                >
                  <Text style={styles.actionIcon}>📍</Text>
                  <Text style={styles.actionText}>Track Bus</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('Messages')}
                >
                  <Text style={styles.actionIcon}>💬</Text>
                  <Text style={styles.actionText}>Messages</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('Profile')}
                >
                  <Text style={styles.actionIcon}>👤</Text>
                  <Text style={styles.actionText}>Profile</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            // No children added yet
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
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.addButtonGradient}
                >
                  <Text style={styles.addButtonText}>Add Child</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  online: {
    backgroundColor: '#4CAF50',
  },
  offline: {
    backgroundColor: '#f44336',
  },
  notificationBadge: {
    position: 'relative',
    padding: 5,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#f44336',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  mapPreview: {
    height: 150,
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 20,
  },
  mapPreviewContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  mapPreviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  mapPreviewSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 10,
  },
  mapPlaceholder: {
    position: 'absolute',
    right: 20,
    top: 20,
  },
  mapIcon: {
    fontSize: 50,
    opacity: 0.3,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  scheduleCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scheduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  scheduleTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  scheduleEvent: {
    fontSize: 14,
    color: '#666',
  },
  alertCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  alertMessage: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  alertTime: {
    fontSize: 12,
    color: '#999',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginTop: 10,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  actionText: {
    fontSize: 12,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  addButton: {
    width: '100%',
    height: 50,
    borderRadius: 10,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});