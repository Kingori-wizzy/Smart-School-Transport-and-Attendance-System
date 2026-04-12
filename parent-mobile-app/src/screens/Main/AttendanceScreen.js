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
  Share,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar } from 'react-native-calendars';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { COLORS, API_URL } from '../../constants/config';
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
          <Text style={styles.detailClose}>x</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Status:</Text>
        <Text style={[styles.detailStatus, { color: record.status === 'present' || record.status === 'boarded' ? '#4CAF50' : record.status === 'late' ? '#FF9800' : '#f44336' }]}>
          {record.status === 'present' || record.status === 'boarded' ? 'Present' : record.status === 'late' ? 'Late' : 'Absent'}
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
  const [exporting, setExporting] = useState(false);

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
      const start = format(startOfMonth(new Date(currentMonth + '-01')), 'yyyy-MM-dd');
      const end = format(endOfMonth(new Date(currentMonth + '-01')), 'yyyy-MM-dd');
      
      console.log(`Fetching attendance for child ${childId} from ${start} to ${end}`);
      
      let data = [];
      try {
        const response = await api.attendance.getHistory(childId, start, end);
        console.log('Attendance response:', response);
        
        if (Array.isArray(response)) {
          data = response;
        } else if (response && response.data && Array.isArray(response.data)) {
          data = response.data;
        } else if (response && response.attendance && Array.isArray(response.attendance)) {
          data = response.attendance;
        } else {
          data = [];
        }
      } catch (apiError) {
        console.error('API Error fetching attendance:', apiError);
        data = [];
      }
      
      processAttendanceData(data);
      
    } catch (error) {
      console.error('Error fetching attendance:', error);
      Alert.alert('Error', 'Failed to load attendance data');
      processAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  const processAttendanceData = (data) => {
    setAttendanceData(data);

    const present = data.filter(d => d.status === 'present' || d.status === 'boarded' || d.eventType === 'board').length;
    const absent = data.filter(d => d.status === 'absent').length;
    const late = data.filter(d => d.status === 'late').length;
    const total = data.length;
    const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

    setStats({ present, absent, late, total, attendanceRate });

    const marked = {};
    data.forEach(day => {
      let color;
      const status = day.status || day.eventType;
      switch(status) {
        case 'present':
        case 'boarded':
        case 'board':
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
    setExporting(true);
    try {
      const childId = child._id || child.id;
      const month = currentMonth;
      const token = await api.getAuthToken();
      
      console.log(`Exporting report for child ${childId}, month: ${month}`);
      
      // IMPORTANT: Add format=json to the URL
      const response = await fetch(`${API_URL}/attendance/child/${childId}/export?month=${month}&format=json`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Export failed with status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Export result:', result);
      
      if (result.success && result.data) {
        const reportData = result.data;
        
        // Format the report as readable text
        let reportText = `Attendance Report\n`;
        reportText += `==================\n\n`;
        reportText += `Student: ${reportData.childName}\n`;
        reportText += `Month: ${reportData.month}\n`;
        reportText += `Generated: ${new Date(reportData.generatedAt).toLocaleString()}\n\n`;
        reportText += `SUMMARY\n`;
        reportText += `-------\n`;
        reportText += `Total Days: ${reportData.summary.totalDays}\n`;
        reportText += `Present: ${reportData.summary.presentDays}\n`;
        reportText += `Late: ${reportData.summary.lateDays}\n`;
        reportText += `Absent: ${reportData.summary.absentDays}\n\n`;
        reportText += `DAILY RECORDS\n`;
        reportText += `-------------\n`;
        
        reportData.records.forEach(record => {
          reportText += `${record.date}: ${record.status.toUpperCase()} at ${record.checkIn} (Bus: ${record.busNumber})\n`;
        });
        
        await Share.share({
          title: `Attendance Report - ${reportData.childName} (${reportData.month})`,
          message: reportText,
        });
      } else {
        Alert.alert('Info', 'No attendance data available for this month');
      }
      
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Info', 'Unable to export report. Please try again later.');
    } finally {
      setExporting(false);
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
          <StatCard title="Present" value={stats.present} icon="✓" color="#4CAF50" />
          <StatCard title="Absent" value={stats.absent} icon="✗" color="#f44336" />
          <StatCard title="Late" value={stats.late} icon="⚠" color="#FF9800" />
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
          {attendanceData.length === 0 ? (
            <View style={styles.emptyList}>
              <Text style={styles.emptyListText}>No attendance records found</Text>
            </View>
          ) : (
            attendanceData.slice(0, 10).map((item, index) => (
              <TouchableOpacity
                key={item.id || index}
                style={styles.listItem}
                onPress={() => setSelectedDate(item.date)}
              >
                <View style={styles.listItemLeft}>
                  <Text style={styles.listDate}>{format(new Date(item.date), 'MMM dd, yyyy')}</Text>
                  {item.checkIn && (
                    <Text style={styles.listTime}>In: {item.checkIn}</Text>
                  )}
                </View>
                <View style={[styles.listStatus, { backgroundColor: item.status === 'present' || item.status === 'boarded' || item.eventType === 'board' ? '#4CAF50' : item.status === 'late' ? '#FF9800' : '#f44336' }]}>
                  <Text style={styles.listStatusText}>
                    {item.status === 'present' || item.status === 'boarded' || item.eventType === 'board' ? 'Present' : item.status === 'late' ? 'Late' : 'Absent'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <TouchableOpacity 
          style={[styles.exportButton, exporting && styles.exportButtonDisabled]} 
          onPress={handleExport}
          disabled={exporting}
        >
          <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.exportGradient}>
            {exporting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.exportButtonText}>Download Report</Text>
            )}
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
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', padding: 15, gap: 10 },
  statCard: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', elevation: 3 },
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
  legendContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 15, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 10, marginVertical: 5 },
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
  emptyList: { alignItems: 'center', paddingVertical: 30 },
  emptyListText: { fontSize: 14, color: '#999' },
  exportButton: { margin: 15, marginTop: 0, marginBottom: 30, borderRadius: 10, overflow: 'hidden' },
  exportButtonDisabled: { opacity: 0.6 },
  exportGradient: { paddingVertical: 14, alignItems: 'center' },
  exportButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});