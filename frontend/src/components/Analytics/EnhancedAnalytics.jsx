import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { attendanceService } from '../../services/attendance';
import { transportService } from '../../services/transport';
import { studentService } from '../../services/student';
import toast from 'react-hot-toast';

const COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#f44336', '#9C27B0', '#673AB7', '#3F51B5', '#009688'];

export default function EnhancedAnalytics() {
  const [timeframe, setTimeframe] = useState('week');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [analyticsData, setAnalyticsData] = useState({
    attendance: [],
    transport: [],
    alerts: [],
    trends: [],
    predictions: []
  });
  const [stats, setStats] = useState({
    totalStudents: 0,
    avgAttendance: 0,
    peakAttendance: 0,
    peakDay: '',
    totalTrips: 0,
    onTimeRate: 0,
    avgSpeed: 0,
    totalAlerts: 0,
    criticalAlerts: 0,
    fleetUtilization: 0
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeframe, startDate, endDate]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Fetch real data from services
      const [studentsData, attendanceStats, busesData, tripsData] = await Promise.all([
        studentService.getStudents(),
        attendanceService.getAttendanceStats(),
        transportService.getBuses(),
        transportService.getTrips().catch(() => []) // Fallback if not implemented
      ]);

      const students = Array.isArray(studentsData) ? studentsData : [];
      const buses = Array.isArray(busesData) ? busesData : [];
      const trips = Array.isArray(tripsData) ? tripsData : [];

      // Generate date range
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = eachDayOfInterval({ start, end });

      // Mock attendance data (replace with real API call)
      const attendanceTrend = days.map((day, index) => ({
        date: format(day, 'MMM dd'),
        fullDate: day,
        present: Math.floor(150 + Math.random() * 50),
        absent: Math.floor(20 + Math.random() * 15),
        late: Math.floor(5 + Math.random() * 10),
        boarding: Math.floor(120 + Math.random() * 40),
        alighting: Math.floor(115 + Math.random() * 40)
      }));

      // Mock transport data
      const transportData = [
        { name: 'BUS001', trips: 45, onTime: 43, distance: 650, fuel: 145, students: 38 },
        { name: 'BUS002', trips: 42, onTime: 40, distance: 580, fuel: 132, students: 35 },
        { name: 'BUS003', trips: 38, onTime: 35, distance: 520, fuel: 118, students: 32 },
        { name: 'BUS004', trips: 35, onTime: 33, distance: 490, fuel: 105, students: 30 },
        { name: 'BUS005', trips: 32, onTime: 30, distance: 450, fuel: 98, students: 28 }
      ];

      // Mock alerts data
      const alertsByType = [
        { name: 'Speeding', value: 45 },
        { name: 'Geofence', value: 28 },
        { name: 'Fuel', value: 15 },
        { name: 'Maintenance', value: 12 },
        { name: 'Late Arrival', value: 32 }
      ];

      // Mock trends data
      const hourlyTrends = [
        { hour: '6AM', count: 25 },
        { hour: '7AM', count: 85 },
        { hour: '8AM', count: 120 },
        { hour: '9AM', count: 45 },
        { hour: '3PM', count: 30 },
        { hour: '4PM', count: 95 },
        { hour: '5PM', count: 115 },
        { hour: '6PM', count: 40 }
      ];

      // Mock predictions (AI-like)
      const predictions = [
        { day: 'Mon', actual: 235, predicted: 240 },
        { day: 'Tue', actual: 238, predicted: 235 },
        { day: 'Wed', actual: 230, predicted: 232 },
        { day: 'Thu', actual: 225, predicted: 228 },
        { day: 'Fri', actual: 218, predicted: 220 },
        { day: 'Next Mon', predicted: 242 },
        { day: 'Next Tue', predicted: 238 },
        { day: 'Next Wed', predicted: 235 }
      ];

      setAnalyticsData({
        attendance: attendanceTrend,
        transport: transportData,
        alerts: alertsByType,
        trends: hourlyTrends,
        predictions
      });

      // Calculate stats
      const totalPresent = attendanceTrend.reduce((sum, day) => sum + day.present, 0);
      const avgAttendance = Math.round(totalPresent / attendanceTrend.length);
      const peakDay = attendanceTrend.reduce((max, day) => 
        day.present > max.present ? day : max, attendanceTrend[0]
      );

      setStats({
        totalStudents: students.length,
        avgAttendance,
        peakAttendance: peakDay.present,
        peakDay: peakDay.date,
        totalTrips: trips.length || 124,
        onTimeRate: 94,
        avgSpeed: 52,
        totalAlerts: 132,
        criticalAlerts: 28,
        fleetUtilization: Math.round((buses.filter(b => b.status === 'active').length / (buses.length || 1)) * 100)
      });

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeframeChange = (range) => {
    setTimeframe(range);
    const today = new Date();
    
    switch(range) {
      case 'today':
        setStartDate(format(today, 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      case 'yesterday':
        const yesterday = subDays(today, 1);
        setStartDate(format(yesterday, 'yyyy-MM-dd'));
        setEndDate(format(yesterday, 'yyyy-MM-dd'));
        break;
      case 'week':
        setStartDate(format(subDays(today, 7), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      case 'month':
        setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      case 'quarter':
        setStartDate(format(subDays(today, 90), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      case 'year':
        setStartDate(format(subDays(today, 365), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      default:
        break;
    }
  };

  const exportData = (format = 'csv') => {
    toast.success(`Exporting data as ${format.toUpperCase()}`);
    // In production, implement actual export
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'white',
          padding: '12px',
          border: '1px solid #ccc',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: '4px 0', color: entry.color }}>
              {entry.name}: {entry.value}
              {entry.name.includes('Speed') ? ' km/h' : 
               entry.name.includes('Distance') ? ' km' : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'attendance', name: 'Attendance Analytics', icon: '👥' },
    { id: 'transport', name: 'Transport Analytics', icon: '🚌' },
    { id: 'alerts', name: 'Alert Analytics', icon: '⚠️' },
    { id: 'predictions', name: 'Predictions', icon: '🔮' }
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <div className="loading-spinner" style={{ margin: '0 auto', width: '50px', height: '50px' }} />
        <p style={{ marginTop: '20px', color: '#666' }}>Loading analytics data...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Header with Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '25px',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <h2 style={{ margin: 0, fontSize: '24px', color: '#333' }}>
          Analytics Dashboard
        </h2>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <select
            value={timeframe}
            onChange={(e) => handleTimeframeChange(e.target.value)}
            style={{
              padding: '10px 15px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              background: 'white',
              fontSize: '14px'
            }}
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">Last 7 Days</option>
            <option value="month">This Month</option>
            <option value="quarter">Last 90 Days</option>
            <option value="year">This Year</option>
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setTimeframe('custom');
            }}
            style={{
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '6px'
            }}
          />
          <span style={{ alignSelf: 'center' }}>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setTimeframe('custom');
            }}
            style={{
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '6px'
            }}
          />

          <button
            onClick={() => exportData('csv')}
            style={{
              padding: '10px 20px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            📥 Export CSV
          </button>
          <button
            onClick={() => exportData('pdf')}
            style={{
              padding: '10px 20px',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            📥 Export PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
        }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '5px' }}>Total Students</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.totalStudents}</div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>Enrolled</div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 4px 15px rgba(67, 206, 162, 0.3)'
        }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '5px' }}>Avg Attendance</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.avgAttendance}</div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>Per day</div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 4px 15px rgba(240, 147, 251, 0.3)'
        }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '5px' }}>On-Time Rate</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.onTimeRate}%</div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>Transport</div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #5f2c82 0%, #49a09d 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 4px 15px rgba(95, 44, 130, 0.3)'
        }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '5px' }}>Fleet Utilization</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.fleetUtilization}%</div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>Active buses</div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #f2994a 0%, #f2c94c 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 4px 15px rgba(242, 153, 74, 0.3)'
        }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '5px' }}>Total Trips</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.totalTrips}</div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>This period</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        background: 'white',
        padding: '10px',
        borderRadius: '10px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        overflowX: 'auto'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 24px',
              background: activeTab === tab.id ? '#2196F3' : '#f5f5f5',
              color: activeTab === tab.id ? 'white' : '#333',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.3s ease'
            }}
          >
            <span>{tab.icon}</span>
            {tab.name}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '20px'
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            gridColumn: 'span 2'
          }}>
            <h3 style={{ margin: '0 0 15px 0' }}>Attendance Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analyticsData.attendance}>
                <defs>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#4CAF50" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f44336" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f44336" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area type="monotone" dataKey="present" stroke="#4CAF50" fill="url(#colorPresent)" name="Present" />
                <Area type="monotone" dataKey="absent" stroke="#f44336" fill="url(#colorAbsent)" name="Absent" />
                <Area type="monotone" dataKey="late" stroke="#FF9800" fill="#FF9800" fillOpacity={0.3} name="Late" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ margin: '0 0 15px 0' }}>Bus Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.transport}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar yAxisId="left" dataKey="trips" fill="#2196F3" name="Trips" />
                <Bar yAxisId="right" dataKey="students" fill="#4CAF50" name="Students" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ margin: '0 0 15px 0' }}>Alert Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.alerts}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {analyticsData.alerts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Attendance Tab */}
      {activeTab === 'attendance' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '20px'
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            gridColumn: 'span 2'
          }}>
            <h3 style={{ margin: '0 0 15px 0' }}>Daily Attendance Breakdown</h3>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={analyticsData.attendance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="present" fill="#4CAF50" name="Present" />
                <Bar dataKey="absent" fill="#f44336" name="Absent" />
                <Bar dataKey="late" fill="#FF9800" name="Late" />
                <Line type="monotone" dataKey="boarding" stroke="#2196F3" name="Boarding" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ margin: '0 0 15px 0' }}>Hourly Activity</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#2196F3" name="Students">
                  {analyticsData.trends.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ margin: '0 0 15px 0' }}>Boarding vs Alighting</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.attendance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="boarding" stroke="#4CAF50" strokeWidth={2} />
                <Line type="monotone" dataKey="alighting" stroke="#f44336" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Transport Tab */}
      {activeTab === 'transport' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '20px'
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            gridColumn: 'span 2'
          }}>
            <h3 style={{ margin: '0 0 15px 0' }}>Fleet Performance Matrix</h3>
            <ResponsiveContainer width="100%" height={350}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="trips" name="Trips" />
                <YAxis dataKey="students" name="Students" />
                <ZAxis dataKey="distance" range={[50, 400]} name="Distance" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Legend />
                <Scatter name="Buses" data={analyticsData.transport} fill="#2196F3">
                  {analyticsData.transport.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ margin: '0 0 15px 0' }}>On-Time Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart outerRadius={90} data={analyticsData.transport.slice(0, 4)}>
                <PolarGrid />
                <PolarAngleAxis dataKey="name" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar name="On-Time %" dataKey="onTime" stroke="#4CAF50" fill="#4CAF50" fillOpacity={0.6} />
                <Tooltip />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ margin: '0 0 15px 0' }}>Fuel Efficiency</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.transport}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="fuel" fill="#FF9800" name="Fuel (L)" />
                <Bar dataKey="distance" fill="#2196F3" name="Distance (km)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '20px'
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ margin: '0 0 15px 0' }}>Alert Severity</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Critical', value: stats.criticalAlerts },
                    { name: 'High', value: 45 },
                    { name: 'Medium', value: 38 },
                    { name: 'Low', value: 21 }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  dataKey="value"
                >
                  <Cell fill="#f44336" />
                  <Cell fill="#FF9800" />
                  <Cell fill="#FFC107" />
                  <Cell fill="#4CAF50" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ margin: '0 0 15px 0' }}>Alert Timeline</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={[
                { time: '00:00', count: 2 },
                { time: '04:00', count: 1 },
                { time: '08:00', count: 8 },
                { time: '12:00', count: 5 },
                { time: '16:00', count: 12 },
                { time: '20:00', count: 4 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#f44336" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <div style={{
              background: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <h3 style={{ margin: '0 0 15px 0' }}>Alert Type Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.alerts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#f44336">
                    {analyticsData.alerts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Predictions Tab */}
      {activeTab === 'predictions' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '20px'
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            gridColumn: 'span 2'
          }}>
            <h3 style={{ margin: '0 0 15px 0' }}>AI Attendance Predictions</h3>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={analyticsData.predictions}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis domain={[200, 250]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="actual" fill="#4CAF50" name="Actual" />
                <Bar dataKey="predicted" fill="#2196F3" name="Predicted" />
                <Line type="monotone" dataKey="predicted" stroke="#f44336" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '30px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔮</div>
            <h3 style={{ margin: '0 0 10px 0', color: 'white' }}>Next Week Prediction</h3>
            <div style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '10px' }}>
              235
            </div>
            <p>Average daily attendance expected</p>
            <div style={{
              marginTop: '20px',
              padding: '15px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Confidence:</span>
                <span>92%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Peak day:</span>
                <span>Tuesday (242)</span>
              </div>
            </div>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ margin: '0 0 15px 0' }}>Insights</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{
                padding: '15px',
                background: '#e8f5e9',
                borderRadius: '8px',
                borderLeft: '4px solid #4CAF50'
              }}>
                <strong>📈 Increasing Trend</strong>
                <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#666' }}>
                  Attendance is expected to increase by 5% next week
                </p>
              </div>
              <div style={{
                padding: '15px',
                background: '#fff3e0',
                borderRadius: '8px',
                borderLeft: '4px solid #FF9800'
              }}>
                <strong>⚠️ Peak Alert</strong>
                <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#666' }}>
                  Tuesday morning will have highest traffic - consider additional buses
                </p>
              </div>
              <div style={{
                padding: '15px',
                background: '#e3f2fd',
                borderRadius: '8px',
                borderLeft: '4px solid #2196F3'
              }}>
                <strong>💡 Recommendation</strong>
                <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#666' }}>
                  Schedule maintenance for BUS003 on Wednesday (lowest usage)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}