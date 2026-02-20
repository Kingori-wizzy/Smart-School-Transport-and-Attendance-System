import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { attendanceService } from '../../services/attendance';
import { transportService } from '../../services/transport';
import toast from 'react-hot-toast';

const COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#f44336', '#9C27B0'];

export default function AttendanceTrends({ dateRange = 7 }) {
  const [trendData, setTrendData] = useState([]);
  const [distributionData, setDistributionData] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [classDistribution, setClassDistribution] = useState([]);
  const [stats, setStats] = useState({
    averageDaily: 0,
    peakDay: '',
    peakAttendance: 0,
    totalAttendance: 0,
    attendanceRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('week'); // week, month, custom
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  useEffect(() => {
    fetchAttendanceData();
  }, [timeframe, customStart, customEnd]);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range based on timeframe
      let startDate, endDate = new Date();
      
      if (timeframe === 'week') {
        startDate = subDays(new Date(), 7);
      } else if (timeframe === 'month') {
        startDate = subDays(new Date(), 30);
      } else if (timeframe === 'custom' && customStart && customEnd) {
        startDate = new Date(customStart);
        endDate = new Date(customEnd);
      } else {
        startDate = subDays(new Date(), 7);
      }

      // Fetch attendance data
      const attendanceData = await attendanceService.getAttendanceByDateRange(
        format(startDate, 'yyyy-MM-dd'),
        format(endDate, 'yyyy-MM-dd')
      );

      // Process daily trends
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      const trends = days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayData = attendanceData.filter(a => 
          format(new Date(a.createdAt), 'yyyy-MM-dd') === dayStr
        );
        
        return {
          date: format(day, 'MMM dd'),
          fullDate: day,
          total: dayData.length,
          boarding: dayData.filter(a => a.eventType === 'board').length,
          alighting: dayData.filter(a => a.eventType === 'alight').length,
          uniqueStudents: [...new Set(dayData.map(a => a.studentId?._id || a.studentId))].length
        };
      });

      setTrendData(trends);

      // Calculate stats
      const totalAttendance = trends.reduce((sum, day) => sum + day.total, 0);
      const avgDaily = Math.round(totalAttendance / trends.length);
      const peakDay = trends.reduce((max, day) => 
        day.total > max.total ? day : max, trends[0] || { total: 0 }
      );

      setStats({
        averageDaily: avgDaily,
        peakDay: peakDay.date || '',
        peakAttendance: peakDay.total || 0,
        totalAttendance,
        attendanceRate: 85 // This would come from student count comparison
      });

      // Process distribution by type
      const totalBoard = trends.reduce((sum, day) => sum + day.boarding, 0);
      const totalAlight = trends.reduce((sum, day) => sum + day.alighting, 0);
      
      setDistributionData([
        { name: 'Boarding', value: totalBoard },
        { name: 'Alighting', value: totalAlight }
      ]);

      // Process hourly data (mock for now - would come from real data)
      setHourlyData([
        { hour: '6-7 AM', count: 45 },
        { hour: '7-8 AM', count: 120 },
        { hour: '8-9 AM', count: 85 },
        { hour: '3-4 PM', count: 30 },
        { hour: '4-5 PM', count: 95 },
        { hour: '5-6 PM', count: 110 }
      ]);

      // Class distribution (mock - would come from student data)
      setClassDistribution([
        { name: 'Grade 5', value: 45 },
        { name: 'Grade 6', value: 52 },
        { name: 'Grade 7', value: 38 },
        { name: 'Grade 8', value: 41 },
        { name: 'Grade 9', value: 35 }
      ]);

    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast.error('Failed to load attendance trends');
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'white',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: '5px 0', color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div style={{ 
        height: '400px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#f5f5f5',
        borderRadius: '8px'
      }}>
        <div className="loading-spinner" />
        <p style={{ marginLeft: '10px' }}>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Timeframe Selector */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px',
        padding: '15px',
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <button
          onClick={() => setTimeframe('week')}
          style={{
            padding: '8px 16px',
            background: timeframe === 'week' ? '#2196F3' : '#f0f0f0',
            color: timeframe === 'week' ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Last 7 Days
        </button>
        <button
          onClick={() => setTimeframe('month')}
          style={{
            padding: '8px 16px',
            background: timeframe === 'month' ? '#2196F3' : '#f0f0f0',
            color: timeframe === 'month' ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Last 30 Days
        </button>
        <button
          onClick={() => setTimeframe('custom')}
          style={{
            padding: '8px 16px',
            background: timeframe === 'custom' ? '#2196F3' : '#f0f0f0',
            color: timeframe === 'custom' ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Custom Range
        </button>

        {timeframe === 'custom' && (
          <div style={{ display: 'flex', gap: '10px', marginLeft: '10px' }}>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              style={{
                padding: '6px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
            <span>to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              style={{
                padding: '6px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '30px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h4 style={{ margin: '0 0 10px 0', opacity: 0.9 }}>Avg Daily</h4>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
            {stats.averageDaily}
          </div>
          <small>students/day</small>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h4 style={{ margin: '0 0 10px 0', opacity: 0.9 }}>Peak Day</h4>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
            {stats.peakAttendance}
          </div>
          <small>{stats.peakDay}</small>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h4 style={{ margin: '0 0 10px 0', opacity: 0.9 }}>Total</h4>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
            {stats.totalAttendance}
          </div>
          <small>attendance events</small>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #5f2c82 0%, #49a09d 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h4 style={{ margin: '0 0 10px 0', opacity: 0.9 }}>Rate</h4>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
            {stats.attendanceRate}%
          </div>
          <small>attendance rate</small>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '20px'
      }}>
        {/* Daily Trend Chart */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          gridColumn: 'span 2'
        }}>
          <h3 style={{ margin: '0 0 20px 0' }}>Daily Attendance Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="total" 
                stroke="#4CAF50" 
                fill="#4CAF50" 
                fillOpacity={0.3}
                name="Total Events"
              />
              <Area 
                type="monotone" 
                dataKey="uniqueStudents" 
                stroke="#2196F3" 
                fill="#2196F3" 
                fillOpacity={0.3}
                name="Unique Students"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Distribution Pie Chart */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 20px 0' }}>Boarding vs Alighting</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={distributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {distributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly Distribution */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 20px 0' }}>Peak Hours</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#FF9800">
                {hourlyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Class Distribution */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          gridColumn: 'span 2'
        }}>
          <h3 style={{ margin: '0 0 20px 0' }}>Attendance by Class</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={classDistribution} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#2196F3" name="Students">
                {classDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Table */}
      <div style={{
        marginTop: '20px',
        background: 'white',
        padding: '20px',
        borderRadius: '10px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 20px 0' }}>Daily Breakdown</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Total Events</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Boarding</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Alighting</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Unique Students</th>
              </tr>
            </thead>
            <tbody>
              {trendData.map((day, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px' }}>{day.date}</td>
                  <td style={{ padding: '10px' }}>{day.total}</td>
                  <td style={{ padding: '10px' }}>{day.boarding}</td>
                  <td style={{ padding: '10px' }}>{day.alighting}</td>
                  <td style={{ padding: '10px' }}>{day.uniqueStudents}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}