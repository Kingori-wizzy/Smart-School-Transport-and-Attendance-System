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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar } from 'react-native-calendars';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { COLORS } from '../../constants/config';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const { width } = Dimensions.get('window');

const StatCard = ({ title, value, icon, color }) => (
  <View style={[styles.statCard, { backgroundColor: color }]}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statTitle}>{title}</Text>
  </View>
);

const AttendanceDetail = ({ record, onClose }) => {
  if (!record) return null;

  return (
    <View style={styles.detailCard}>
      <View style={styles.detailHeader}>
        <Text style={styles.detailDate}>{format(new Date(record.date), 'MMMM dd, yyyy')}</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.detailClose}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Status:</Text>
        <Text style={[styles.detailStatus, { color: record.status === 'present' ? '#4CAF50' : record.status === 'late' ? '#FF9800' : '#f44336' }]}>
          {record.status === 'present' ? '✅ Present' : record.status === 'late' ? '⚠️ Late' : '❌ Absent'}
        </Text>
      </View>

      {record.checkIn && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Check In:</Text>
          <Text style={styles.detailValue}>{record.checkIn}</Text>
        </View>
      )}

      {record.checkOut && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Check Out:</Text>
          <Text style={styles.detailValue}>{record.checkOut}</Text>
        </View>
      )}

      {record.busNumber && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Bus:</Text>
          <Text style={styles.detailValue}>{record.busNumber}</Text>
        </View>
      )}
    </View>
  );
};

export default function AttendanceScreen({ route, navigation }) {
  if (!route?.params?.child) {
    navigation.goBack();
    return null;
  }

  const { child } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceData, setAttendanceData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    total: 0,
    attendanceRate: 0,
  });
  const [markedDates, setMarkedDates] = useState({});
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    fetchAttendanceData();
  }, [child, currentMonth]);

  useEffect(() => {
    if (selectedDate) {
      const record = attendanceData.find(d => d.date === selectedDate);
      setSelectedRecord(record || null);
    }
  }, [selectedDate, attendanceData]);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      
      const childId = child._id || child.id;
      const start = format(startOfMonth(new Date(currentMonth)), 'yyyy-MM-dd');
      const end = format(endOfMonth(new Date(currentMonth)), 'yyyy-MM-dd');
      
      const data = await api.attendance.getHistory(childId, start, end);
      processAttendanceData(data);
      
    } catch (error) {
      console.error('Error fetching attendance:', error);
      Alert.alert('Error', 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const processAttendanceData = (data) => {
    setAttendanceData(data);

    const present = data.filter(d => d.status === 'present').length;
    const absent = data.filter(d => d.status === 'absent').length;
    const late = data.filter(d => d.status === 'late').length;
    const total = data.length;
    const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

    setStats({ present, absent, late, total, attendanceRate });

    const marked = {};
    data.forEach(day => {
      let color;
      switch(day.status) {
        case 'present': color = '#4CAF50'; break;
        case 'absent': color = '#f44336'; break;
        case 'late': color = '#FF9800'; break;
        default: color = '#999';
      }

      marked[day.date] = {
        selected: day.date === selectedDate,
        selectedColor: COLORS.primary,
        marked: true,
        dotColor: color,
        customStyles: {
          container: { backgroundColor: day.date === selectedDate ? COLORS.primary : 'transparent' },
          text: { color: day.date === selectedDate ? '#fff' : '#000', fontWeight: day.date === selectedDate ? 'bold' : 'normal' },
        },
      };
    });

    setMarkedDates(marked);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAttendanceData();
    setRefreshing(false);
  };

  const onMonthChange = (month) => {
    setCurrentMonth(month.dateString);
  };

  const handleExport = async () => {
    try {
      const childId = child._id || child.id;
      await api.attendance.exportReport(childId, currentMonth);
      Alert.alert('Success', 'Attendance report downloaded');
    } catch (error) {
      Alert.alert('Error', 'Failed to export report');
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
      <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.childName}>{child.firstName}'s Attendance</Text>
          <Text style={styles.childClass}>{child.classLevel}</Text>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.statsContainer}>
          <StatCard title="Present" value={stats.present} icon="✅" color="#4CAF50" />
          <StatCard title="Absent" value={stats.absent} icon="❌" color="#f44336" />
          <StatCard title="Late" value={stats.late} icon="⚠️" color="#FF9800" />
        </View>

        <View style={styles.rateCard}>
          <Text style={styles.rateTitle}>Attendance Rate</Text>
          <View style={styles.rateCircle}>
            <Text style={styles.ratePercentage}>{stats.attendanceRate}%</Text>
          </View>
          <Text style={styles.rateSubtext}>Last {stats.total} school days</Text>
        </View>

        <View style={styles.calendarCard}>
          <Text style={styles.calendarTitle}>Attendance Calendar</Text>
          <Calendar
            current={selectedDate}
            onDayPress={(day) => setSelectedDate(day.dateString)}
            onMonthChange={onMonthChange}
            markedDates={markedDates}
            markingType="custom"
            theme={{
              todayTextColor: COLORS.primary,
              arrowColor: COLORS.primary,
              monthTextColor: COLORS.primary,
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '600',
            }}
            style={styles.calendar}
          />
        </View>

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

        {selectedRecord && (
          <AttendanceDetail record={selectedRecord} onClose={() => setSelectedDate(null)} />
        )}

        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>Recent Attendance</Text>
          {attendanceData.slice(0, 10).map((item, index) => (
            <TouchableOpacity
              key={item.id || index}
              style={styles.listItem}
              onPress={() => setSelectedDate(item.date)}
            >
              <View style={styles.listItemLeft}>
                <Text style={styles.listDate}>{format(new Date(item.date), 'MMM dd, yyyy')}</Text>
                {item.checkIn && item.checkOut && (
                  <Text style={styles.listTime}>🕒 {item.checkIn} - {item.checkOut}</Text>
                )}
              </View>
              <View style={[styles.listStatus, { backgroundColor: item.status === 'present' ? '#4CAF50' : item.status === 'late' ? '#FF9800' : '#f44336' }]}>
                <Text style={styles.listStatusText}>
                  {item.status === 'present' ? '✅' : item.status === 'late' ? '⚠️' : '❌'} {item.status}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
          <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.exportGradient}>
            <Text style={styles.exportButtonText}>📥 Download Report</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  backIcon: { fontSize: 24, color: '#fff' },
  headerTitle: { flex: 1 },
  childName: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  childClass: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', padding: 15 },
  statCard: { flex: 1, marginHorizontal: 4, padding: 12, borderRadius: 10, alignItems: 'center', elevation: 3 },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  statTitle: { fontSize: 11, color: '#fff', opacity: 0.9 },
  rateCard: { backgroundColor: '#fff', margin: 15, marginTop: 0, padding: 20, borderRadius: 10, alignItems: 'center', elevation: 2 },
  rateTitle: { fontSize: 16, color: '#666', marginBottom: 15 },
  rateCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  ratePercentage: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  rateSubtext: { fontSize: 12, color: '#999' },
  calendarCard: { backgroundColor: '#fff', margin: 15, marginTop: 0, padding: 15, borderRadius: 10, elevation: 2 },
  calendarTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 10 },
  calendar: { borderRadius: 10, overflow: 'hidden' },
  legendContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 15 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 10 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 5 },
  legendText: { fontSize: 12, color: '#666' },
  detailCard: { backgroundColor: '#fff', margin: 15, marginTop: 0, padding: 15, borderRadius: 10, elevation: 3 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  detailDate: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  detailClose: { fontSize: 18, color: '#999', padding: 5 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  detailLabel: { fontSize: 14, color: '#666' },
  detailValue: { fontSize: 14, fontWeight: '500', color: '#333' },
  detailStatus: { fontSize: 14, fontWeight: '600' },
  listContainer: { backgroundColor: '#fff', margin: 15, marginTop: 0, padding: 15, borderRadius: 10, elevation: 2 },
  listTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 10 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  listItemLeft: { flex: 1 },
  listDate: { fontSize: 14, fontWeight: '500', color: '#333' },
  listTime: { fontSize: 12, color: '#999', marginTop: 2 },
  listStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  listStatusText: { fontSize: 11, color: '#fff', fontWeight: '500' },
  exportButton: { margin: 15, marginTop: 0, marginBottom: 30, borderRadius: 10, overflow: 'hidden' },
  exportGradient: { paddingVertical: 14, alignItems: 'center' },
  exportButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});