import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { COLORS } from '../../constants/config';
import { format } from 'date-fns';

export default function ChildHistoryScreen({ route, navigation }) {
  const { childId } = route.params;
  const { childrenList } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState([]);
  const [child, setChild] = useState(null);

  useEffect(() => {
    // Find child from list
    const foundChild = childrenList.find(c => c.id === childId);
    setChild(foundChild);
    fetchHistory();
  }, [childId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockHistory = [
        {
          id: '1',
          date: '2024-02-19',
          status: 'present',
          checkIn: '07:15 AM',
          checkOut: '04:30 PM',
          busNumber: 'BUS001',
        },
        {
          id: '2',
          date: '2024-02-18',
          status: 'present',
          checkIn: '07:20 AM',
          checkOut: '04:25 PM',
          busNumber: 'BUS001',
        },
        {
          id: '3',
          date: '2024-02-17',
          status: 'absent',
          checkIn: null,
          checkOut: null,
          busNumber: null,
        },
        {
          id: '4',
          date: '2024-02-16',
          status: 'late',
          checkIn: '08:15 AM',
          checkOut: '04:30 PM',
          busNumber: 'BUS001',
        },
        {
          id: '5',
          date: '2024-02-15',
          status: 'present',
          checkIn: '07:10 AM',
          checkOut: '04:35 PM',
          busNumber: 'BUS001',
        },
      ];
      
      setHistory(mockHistory);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'present': return '#4CAF50';
      case 'absent': return '#f44336';
      case 'late': return '#FF9800';
      default: return '#999';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'present': return '✅';
      case 'absent': return '❌';
      case 'late': return '⚠️';
      default: return '❓';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading history...</Text>
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
        <View style={styles.headerTitle}>
          <Text style={styles.headerText}>{child?.name}'s History</Text>
          <Text style={styles.headerSubtext}>Attendance & Trips</Text>
        </View>
      </LinearGradient>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Summary */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {history.filter(h => h.status === 'present').length}
            </Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {history.filter(h => h.status === 'absent').length}
            </Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {history.filter(h => h.status === 'late').length}
            </Text>
            <Text style={styles.statLabel}>Late</Text>
          </View>
        </View>

        {/* History List */}
        <View style={styles.historyContainer}>
          <Text style={styles.sectionTitle}>Attendance History</Text>
          
          {history.map((item) => (
            <View key={item.id} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyDate}>
                  {format(new Date(item.date), 'MMMM dd, yyyy')}
                </Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(item.status) }
                ]}>
                  <Text style={styles.statusText}>
                    {getStatusIcon(item.status)} {item.status}
                  </Text>
                </View>
              </View>

              {item.status !== 'absent' && (
                <View style={styles.historyDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Check In:</Text>
                    <Text style={styles.detailValue}>{item.checkIn}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Check Out:</Text>
                    <Text style={styles.detailValue}>{item.checkOut}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Bus Number:</Text>
                    <Text style={styles.detailValue}>{item.busNumber}</Text>
                  </View>
                </View>
              )}

              {item.status === 'absent' && (
                <Text style={styles.absentNote}>No attendance recorded for this day</Text>
              )}
            </View>
          ))}
        </View>
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
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  backIcon: {
    fontSize: 24,
    color: '#fff',
  },
  headerTitle: {
    flex: 1,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#fff',
    margin: 20,
    marginBottom: 10,
    borderRadius: 10,
    elevation: 2,
  },
  statCard: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  historyContainer: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
  },
  historyDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
  },
  detailValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  absentNote: {
    fontSize: 12,
    color: '#f44336',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },
});