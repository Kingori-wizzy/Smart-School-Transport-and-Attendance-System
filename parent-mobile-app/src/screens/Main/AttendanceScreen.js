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
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { COLORS } from '../../constants/config';
import { Calendar, CalendarList } from 'react-native-calendars';

export default function AttendanceScreen({ route, navigation }) {
  const { child } = route.params;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceData, setAttendanceData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    total: 0,
    attendanceRate: 0,
  });
  const [calendarData, setCalendarData] = useState({});

  useEffect(() => {
    fetchAttendanceData();
  }, [child]);

  useEffect(() => {
    if (selectedDate) {
      viewDateDetails(selectedDate);
    }
  }, [selectedDate]);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      // Replace with your actual API endpoint
      const response = await api.get(`/attendance/child/${child.id}?months=3`);
      
      if (response.data) {
        processAttendanceData(response.data);
      } else {
        // Mock data for demonstration
        const mockData = generateMockAttendance();
        processAttendanceData(mockData);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      // Fallback to mock data
      const mockData = generateMockAttendance();
      processAttendanceData(mockData);
    } finally {
      setLoading(false);
    }
  };

  const generateMockAttendance = () => {
    const data = [];
    const endDate = new Date();
    const startDate = subDays(endDate, 90);
    
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    days.forEach(day => {
      const random = Math.random();
      let status = 'present';
      if (random < 0.1) status = 'absent';
      else if (random < 0.15) status = 'late';
      
      data.push({
        date: format(day, 'yyyy-MM-dd'),
        status,
        checkIn: status !== 'absent' ? '07:45 AM' : null,
        checkOut: status !== 'absent' ? '04:30 PM' : null,
      });
    });
    
    return data;
  };

  const processAttendanceData = (data) => {
    setAttendanceData(data);
    
    // Calculate stats
    const present = data.filter(d => d.status === 'present').length;
    const absent = data.filter(d => d.status === 'absent').length;
    const late = data.filter(d => d.status === 'late').length;
    const total = data.length;
    const attendanceRate = Math.round((present / total) * 100);
    
    setStats({ present, absent, late, total, attendanceRate });
    
    // Prepare calendar data
    const marked = {};
    data.forEach(day => {
      let color;
      switch(day.status) {
        case 'present':
          color = '#4CAF50';
          break;
        case 'absent':
          color = '#f44336';
          break;
        case 'late':
          color = '#FF9800';
          break;
        default:
          color = '#999';
      }
      
      marked[day.date] = {
        selected: day.date === selectedDate,
        selectedColor: COLORS.primary,
        marked: true,
        dotColor: color,
        customStyles: {
          container: {
            backgroundColor: day.date === selectedDate ? COLORS.primary : 'transparent',
          },
          text: {
            color: day.date === selectedDate ? '#fff' : '#000',
          },
        },
      };
    });
    
    setCalendarData(marked);
  };

  const viewDateDetails = (date) => {
    const dayData = attendanceData.find(d => d.date === date);
    // You can show details in a modal or navigate to details screen
    console.log('Selected date:', date, dayData);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAttendanceData();
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
        <Text style={styles.loadingText}>Loading attendance history...</Text>
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
          <Text style={styles.childName}>{child.name}'s Attendance</Text>
          <Text style={styles.childClass}>{child.class}</Text>
        </View>
      </LinearGradient>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: '#4CAF50' }]}>
            <Text style={styles.statNumber}>{stats.present}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#f44336' }]}>
            <Text style={styles.statNumber}>{stats.absent}</Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FF9800' }]}>
            <Text style={styles.statNumber}>{stats.late}</Text>
            <Text style={styles.statLabel}>Late</Text>
          </View>
        </View>

        {/* Attendance Rate */}
        <View style={styles.rateCard}>
          <Text style={styles.rateTitle}>Attendance Rate</Text>
          <View style={styles.rateCircle}>
            <Text style={styles.ratePercentage}>{stats.attendanceRate}%</Text>
          </View>
          <Text style={styles.rateSubtext}>Last {stats.total} days</Text>
        </View>

        {/* Calendar */}
        <View style={styles.calendarCard}>
          <Text style={styles.calendarTitle}>Attendance Calendar</Text>
          <Calendar
            current={selectedDate}
            onDayPress={(day) => setSelectedDate(day.dateString)}
            markedDates={calendarData}
            markingType={'custom'}
            theme={{
              todayTextColor: COLORS.primary,
              arrowColor: COLORS.primary,
              monthTextColor: COLORS.primary,
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '600',
            }}
          />
        </View>

        {/* Legend */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>Present</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#f44336' }]} />
            <Text style={styles.legendText}>Absent</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
            <Text style={styles.legendText}>Late</Text>
          </View>
        </View>

        {/* Recent Attendance List */}
        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>Recent Attendance</Text>
          {attendanceData.slice(0, 10).map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.listItem}
              onPress={() => setSelectedDate(item.date)}
            >
              <View style={styles.listItemLeft}>
                <Text style={styles.listDate}>
                  {format(new Date(item.date), 'MMM dd, yyyy')}
                </Text>
                {item.checkIn && (
                  <Text style={styles.listTime}>
                    🕒 {item.checkIn} - {item.checkOut}
                  </Text>
                )}
              </View>
              <View style={[
                styles.listStatus,
                { backgroundColor: getStatusColor(item.status) }
              ]}>
                <Text style={styles.listStatusText}>
                  {getStatusIcon(item.status)} {item.status}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Export Button */}
        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => Alert.alert('Export', 'Download attendance report?')}
        >
          <Text style={styles.exportButtonText}>📥 Export Report</Text>
        </TouchableOpacity>
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
  childName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  childClass: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 5,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },
  rateCard: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 2,
  },
  rateTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  rateCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  ratePercentage: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  rateSubtext: {
    fontSize: 14,
    color: '#999',
  },
  calendarCard: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  listContainer: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  listItemLeft: {
    flex: 1,
  },
  listDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  listTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  listStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  listStatusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  exportButton: {
    backgroundColor: COLORS.primary,
    margin: 20,
    marginTop: 0,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});