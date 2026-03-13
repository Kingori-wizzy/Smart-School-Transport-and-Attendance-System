/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
  Divider,
  Chip,
  Alert,
  AlertTitle
} from '@mui/material';
import {
  DirectionsBus as BusIcon,
  School as StudentIcon,
  Warning as AlertIcon,
  Speed as SpeedIcon,
  LocationOn as LocationIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  PeopleAlt as PeopleIcon,
  LinkOff as UnlinkedIcon,
  EmojiTransportation as TripIcon
} from '@mui/icons-material';
import { useTheme } from '../../context/ThemeContext';
import { studentService } from '../../services/student';
import { transportService } from '../../services/transport';
import { attendanceService } from '../../services/attendance';
import { formatNumber, formatPercentage } from '../../utils/formatters';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement
);

// Default colors in case theme is not available
const defaultColors = {
  primary: '#1976d2',
  secondary: '#9c27b0',
  success: '#2e7d32',
  error: '#d32f2f',
  warning: '#ed6c02',
  info: '#0288d1',
  light: '#f5f5f5',
  dark: '#333',
  text: '#333',
  textSecondary: '#666',
  border: '#ddd',
  background: '#fafafa',
  card: '#fff'
};

const StatCard = ({ title, value, icon, color, trend, subtitle, loading }) => {
  const { colors } = useTheme();
  const themeColors = colors || defaultColors;
  
  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          boxShadow: 4
        }
      }}
    >
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(255,255,255,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1
          }}
        >
          <CircularProgress size={30} />
        </Box>
      )}
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box
          sx={{
            bgcolor: `${color}.light`,
            borderRadius: 2,
            p: 1,
            display: 'inline-flex'
          }}
        >
          {icon}
        </Box>
        {trend && (
          <Chip
            size="small"
            icon={trend > 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
            label={`${Math.abs(trend)}%`}
            color={trend > 0 ? 'success' : 'error'}
            variant="outlined"
          />
        )}
      </Box>
      
      <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 0.5 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      
      {subtitle && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Paper>
  );
};

const TransportStatsWidget = ({ onRefresh, refreshInterval = 30000 }) => {
  const { colors } = useTheme();
  const themeColors = colors || defaultColors;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalBuses: 0,
    activeBuses: 0,
    onTripBuses: 0,
    maintenanceBuses: 0,
    totalStudents: 0,
    transportStudents: 0,
    linkedStudents: 0,
    unlinkedStudents: 0,
    activeTrips: 0,
    todayTrips: 0,
    recentAlerts: 0,
    speedViolations: 0,
    attendanceRate: 0,
    averageLoad: 0,
    byClass: [],
    byGender: []
  });

  const [attendanceTrend, setAttendanceTrend] = useState({
    labels: [],
    datasets: []
  });

  const [busStatusData, setBusStatusData] = useState({
    labels: ['On Trip', 'Active', 'Maintenance', 'Inactive'],
    datasets: [
      {
        data: [0, 0, 0, 0],
        backgroundColor: ['#4CAF50', '#2196F3', '#FF9800', '#9E9E9E'],
        borderWidth: 0
      }
    ]
  });

  const [classDistribution, setClassDistribution] = useState({
    labels: [],
    datasets: []
  });

  const fetchStats = async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      const [studentStats, busStats, attendanceStats, gpsStats, tripsData] = await Promise.allSettled([
        studentService.getStats(),
        transportService.getBusStats(), // ✅ Now this function exists
        attendanceService.getAttendanceStatsSummary(),
        transportService.getGPSStats(),
        transportService.getTodayTrips()
      ]);

      // Process student stats
      if (studentStats.status === 'fulfilled' && studentStats.value?.success) {
        const s = studentStats.value.data;
        setStats(prev => ({
          ...prev,
          totalStudents: s.overview?.total || 0,
          transportStudents: s.overview?.transport || 0,
          linkedStudents: s.overview?.linked || 0,
          unlinkedStudents: s.overview?.unlinkedTransportStudents || 0,
          byClass: s.distribution?.byClass || [],
          byGender: s.distribution?.byGender || []
        }));

        if (s.distribution?.byClass?.length > 0) {
          setClassDistribution({
            labels: s.distribution.byClass.map(c => c._id || 'Unknown'),
            datasets: [{
              label: 'Students by Class',
              data: s.distribution.byClass.map(c => c.count || 0),
              backgroundColor: [
                '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
                '#FF9F40', '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'
              ],
              borderWidth: 0
            }]
          });
        }
      }

      // Process bus stats
      if (busStats.status === 'fulfilled' && busStats.value?.success) {
        const b = busStats.value.data;
        setStats(prev => ({
          ...prev,
          totalBuses: b.total || 0,
          activeBuses: b.active || 0,
          onTripBuses: b.onTrip || 0,
          maintenanceBuses: b.maintenance || 0
        }));
        
        const inactive = (b.total || 0) - (b.active || 0) - (b.onTrip || 0) - (b.maintenance || 0);
        
        setBusStatusData({
          labels: ['On Trip', 'Active', 'Maintenance', 'Inactive'],
          datasets: [{
            data: [
              b.onTrip || 0,
              b.active || 0,
              b.maintenance || 0,
              inactive > 0 ? inactive : 0
            ],
            backgroundColor: ['#4CAF50', '#2196F3', '#FF9800', '#9E9E9E'],
            borderWidth: 0
          }]
        });
      }

      // Process attendance stats
      if (attendanceStats.status === 'fulfilled' && attendanceStats.value?.success) {
        const a = attendanceStats.value.data;
        setStats(prev => ({
          ...prev,
          attendanceRate: a.attendanceRate || 0
        }));
        
        if (a.weekly && a.weekly.length > 0) {
          setAttendanceTrend({
            labels: a.weekly.map(w => w._id || w.date || ''),
            datasets: [{
              label: 'Attendance',
              data: a.weekly.map(w => w.count || 0),
              borderColor: themeColors.primary || '#1976d2',
              backgroundColor: (themeColors.primary || '#1976d2') + '20',
              tension: 0.4,
              fill: true
            }]
          });
        }
      }

      // Process GPS stats
      if (gpsStats.status === 'fulfilled') {
        const g = gpsStats.value;
        setStats(prev => ({
          ...prev,
          speedViolations: g.recentSpeedViolations || 0
        }));
      }

      // Process trips data
      if (tripsData.status === 'fulfilled') {
        const t = tripsData.value;
        setStats(prev => ({
          ...prev,
          todayTrips: t.count || 0,
          activeTrips: t.data?.filter(trip => trip.status === 'ongoing').length || 0
        }));
      }

      // Calculate average bus load
      if (stats.totalBuses > 0 && stats.transportStudents > 0) {
        const avgLoad = Math.round((stats.transportStudents / stats.totalBuses) / 54 * 100);
        setStats(prev => ({ ...prev, averageLoad: Math.min(avgLoad, 100) }));
      }

    } catch (error) {
      console.error('Error fetching transport stats:', error);
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, refreshInterval);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = () => {
    fetchStats();
    if (onRefresh) onRefresh();
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: { beginAtZero: true, grid: { display: false } },
      x: { grid: { display: false } }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10 } }
    },
    cutout: '60%'
  };

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert 
          severity="error"
          action={
            <IconButton color="inherit" size="small" onClick={handleManualRefresh}>
              <RefreshIcon />
            </IconButton>
          }
        >
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2">Transport Overview</Typography>
        <Tooltip title="Refresh">
          <IconButton size="small" onClick={handleManualRefresh} disabled={refreshing}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Stats Grid - UPDATED to Grid v2 syntax */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Buses"
            value={stats.totalBuses}
            icon={<BusIcon sx={{ color: themeColors.primary || '#1976d2' }} />}
            color="primary"
            subtitle={`${stats.onTripBuses} on trip, ${stats.activeBuses} active`}
            loading={loading}
          />
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Transport Students"
            value={stats.transportStudents}
            icon={<StudentIcon sx={{ color: themeColors.success || '#2e7d32' }} />}
            color="success"
            subtitle={`${stats.linkedStudents} linked to parents`}
            loading={loading}
          />
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Unlinked Students"
            value={stats.unlinkedStudents}
            icon={<UnlinkedIcon sx={{ color: themeColors.warning || '#ed6c02' }} />}
            color="warning"
            subtitle="Need parent linking"
            loading={loading}
          />
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Active Trips"
            value={stats.activeTrips}
            icon={<TripIcon sx={{ color: themeColors.info || '#0288d1' }} />}
            color="info"
            subtitle={`${stats.todayTrips} total today`}
            loading={loading}
          />
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="subtitle2" gutterBottom>Attendance Trend (Last 7 Days)</Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ height: 220 }}>
              {attendanceTrend.labels?.length > 0 ? (
                <Line data={attendanceTrend} options={chartOptions} />
              ) : (
                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography color="text.secondary">No attendance data available</Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
        
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="subtitle2" gutterBottom>Bus Status Distribution</Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ height: 220 }}>
              <Doughnut data={busStatusData} options={doughnutOptions} />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Additional Stats Row */}
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <CheckCircleIcon sx={{ color: themeColors.success || '#2e7d32', fontSize: 40 }} />
            <Box>
              <Typography variant="h5">{stats.attendanceRate}%</Typography>
              <Typography variant="caption" color="text.secondary">Attendance Rate</Typography>
            </Box>
          </Paper>
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <SpeedIcon sx={{ color: themeColors.warning || '#ed6c02', fontSize: 40 }} />
            <Box>
              <Typography variant="h5">{stats.speedViolations}</Typography>
              <Typography variant="caption" color="text.secondary">Speed Violations</Typography>
            </Box>
          </Paper>
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <AlertIcon sx={{ color: themeColors.error || '#d32f2f', fontSize: 40 }} />
            <Box>
              <Typography variant="h5">{stats.recentAlerts}</Typography>
              <Typography variant="caption" color="text.secondary">Active Alerts</Typography>
            </Box>
          </Paper>
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <BusIcon sx={{ color: themeColors.info || '#0288d1', fontSize: 40 }} />
            <Box>
              <Typography variant="h5">{stats.averageLoad}%</Typography>
              <Typography variant="caption" color="text.secondary">Avg Bus Load</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Class Distribution */}
      {classDistribution.labels?.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Students by Class</Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ height: 200 }}>
              <Doughnut data={classDistribution} options={doughnutOptions} />
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default TransportStatsWidget;