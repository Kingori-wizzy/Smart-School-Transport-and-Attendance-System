/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Layout/Sidebar';
import AttendanceScanner from '../../components/Attendance/AttendanceScanner';
// Change this import - use TransportStudents instead
import TransportStudents from '../../pages/Students/TransportStudents';
import { attendanceService } from '../../services/attendance';
import { format, subDays, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import toast from 'react-hot-toast';

export default function AttendancePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('scanner');
  const [dateRange, setDateRange] = useState('week');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [attendanceData, setAttendanceData] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const tabs = [
    { id: 'scanner', name: 'Scanner', icon: '📷' },
    { id: 'records', name: 'Records', icon: '📋' },
    { id: 'students', name: 'Students', icon: '👥' },
    { id: 'reports', name: 'Reports', icon: '📊' }
  ];

  const COLORS = ['#4CAF50', '#FF9800', '#2196F3', '#f44336', '#9C27B0'];

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchStats();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'records' && attendanceData.length === 0) {
      fetchAttendanceData();
    }
  }, [activeTab]);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const data = await attendanceService.getAttendanceByDateRange(startDate, endDate);
      setAttendanceData(data.records || []);
    } catch (error) {
      toast.error('Failed to fetch attendance data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await attendanceService.getAttendanceStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    const today = new Date();
    let start;
    
    switch(range) {
      case 'today':
        start = today;
        break;
      case 'week':
        start = startOfWeek(today);
        break;
      case 'month':
        start = subMonths(today, 1);
        break;
      case 'custom':
        return;
      default:
        start = subDays(today, 7);
    }
    
    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(today, 'yyyy-MM-dd'));
    fetchAttendanceData();
  };

  const exportToCSV = () => {
    if (!attendanceData || attendanceData.length === 0) {
      toast.error('No data to export');
      return;
    }

    try {
      setExportLoading(true);
      const headers = ['Date', 'Student ID', 'Student Name', 'Class', 'Event Type', 'Bus', 'Time', 'Location'];
      const csvData = attendanceData.map(record => [
        format(new Date(record.createdAt || record.date || new Date()), 'yyyy-MM-dd'),
        record.studentId?._id || record.studentId || record.student?.id || 'N/A',
        record.studentId?.name || record.studentName || record.student?.name || 'Unknown',
        record.studentId?.classLevel || record.className || 'N/A',
        record.eventType || record.type || 'unknown',
        record.tripId?.busNumber || record.busNumber || record.bus?.busNumber || 'N/A',
        format(new Date(record.createdAt || record.date || new Date()), 'HH:mm:ss'),
        record.location ? `${record.location.lat?.toFixed(4)}, ${record.location.lng?.toFixed(4)}` : 'N/A'
      ]);

      const csv = [headers, ...csvData].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Export completed');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setExportLoading(false);
    }
  };

  const exportToPDF = async () => {
    toast.success('PDF export feature coming soon');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getEventTypeCounts = () => {
    const counts = { board: 0, alight: 0, late: 0, absent: 0 };
    attendanceData.forEach(record => {
      const type = record.eventType || record.type;
      if (type === 'board') counts.board++;
      else if (type === 'alight') counts.alight++;
      else if (type === 'late') counts.late++;
      else counts.absent++;
    });
    return [
      { name: 'Boarding', value: counts.board },
      { name: 'Alighting', value: counts.alight },
      { name: 'Late', value: counts.late },
      { name: 'Absent', value: counts.absent }
    ].filter(item => item.value > 0);
  };

  const getHourlyDistribution = () => {
    const hours = Array(24).fill(0);
    attendanceData.forEach(record => {
      const date = new Date(record.createdAt || record.date);
      const hour = date.getHours();
      hours[hour]++;
    });
    return hours.map((count, hour) => ({ hour: `${hour}:00`, count }));
  };

  return (
    <div className="dashboard">
      <Sidebar />

      {/* Main Content */}
      <div className="main-content">
        <div className="top-bar">
          <h2>Attendance Management</h2>
          <div className="user-info">
            <span className="welcome-text">
              Welcome, {user?.name || user?.email || 'Admin'}
            </span>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>

        <div className="content-area">
          {/* Tab Navigation */}
          <div style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '20px',
            background: 'white',
            padding: '10px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            overflowX: 'auto'
          }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '10px 20px',
                  background: activeTab === tab.id ? '#2196F3' : '#f5f5f5',
                  color: activeTab === tab.id ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'scanner' && <AttendanceScanner />}
          
          {activeTab === 'students' && <TransportStudents />}
          
          {activeTab === 'records' && (
            <div style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                flexWrap: 'wrap',
                gap: '15px'
              }}>
                <h3 style={{ margin: 0 }}>Attendance Records</h3>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <select
                    value={dateRange}
                    onChange={(e) => handleDateRangeChange(e.target.value)}
                    style={{
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      background: 'white'
                    }}
                  >
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">Last 30 Days</option>
                    <option value="custom">Custom Range</option>
                  </select>
                  
                  {dateRange === 'custom' && (
                    <>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                      <span style={{ alignSelf: 'center' }}>to</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                    </>
                  )}
                  
                  <button
                    onClick={fetchAttendanceData}
                    style={{
                      padding: '8px 16px',
                      background: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Load Records
                  </button>
                  
                  <button
                    onClick={exportToCSV}
                    disabled={exportLoading || attendanceData.length === 0}
                    style={{
                      padding: '8px 16px',
                      background: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: exportLoading ? 'not-allowed' : 'pointer',
                      opacity: exportLoading || attendanceData.length === 0 ? 0.6 : 1
                    }}
                  >
                    {exportLoading ? 'Exporting...' : 'Export CSV'}
                  </button>
                </div>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div className="loading-spinner" style={{ margin: '0 auto' }} />
                </div>
              ) : attendanceData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  No attendance records found for the selected date range.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f5f5f5' }}>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Time</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Student</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Class</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Event</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Bus/Route</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Driver</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Location</th>
                       </tr>
                    </thead>
                    <tbody>
                      {attendanceData.map((record, index) => (
                        <tr key={record.id || record._id || index} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '10px' }}>
                            {format(new Date(record.createdAt || record.date || new Date()), 'MMM dd, HH:mm:ss')}
                          </td>
                          <td style={{ padding: '10px' }}>
                            <div style={{ fontWeight: '500' }}>
                              {record.studentId?.name || record.studentName || record.student?.name || 'Unknown'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#666' }}>
                              ID: {record.studentId?.admissionNumber || record.studentId?._id || record.studentId || 'N/A'}
                            </div>
                          </td>
                          <td style={{ padding: '10px' }}>
                            {record.studentId?.classLevel || record.className || 'N/A'}
                          </td>
                          <td style={{ padding: '10px' }}>
                            <span style={{
                              background: (record.eventType === 'board' || record.type === 'board') ? '#4CAF50' : 
                                        (record.eventType === 'alight' || record.type === 'alight') ? '#FF9800' : 
                                        (record.eventType === 'late' || record.type === 'late') ? '#f44336' : '#999',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '12px'
                            }}>
                              {record.eventType || record.type || 'unknown'}
                            </span>
                          </td>
                          <td style={{ padding: '10px' }}>
                            {record.tripId?.busNumber || record.busNumber || record.bus?.busNumber || 'N/A'}
                          </td>
                          <td style={{ padding: '10px' }}>
                            {record.driverName || record.tripId?.driverName || 'N/A'}
                          </td>
                          <td style={{ padding: '10px', fontSize: '12px', color: '#666' }}>
                            {record.location ? 
                              `${record.location.lat?.toFixed(4)}, ${record.location.lng?.toFixed(4)}` : 
                              record.gpsSnapshot ? 
                              `${record.gpsSnapshot.lat?.toFixed(4)}, ${record.gpsSnapshot.lon?.toFixed(4)}` : 
                              'N/A'
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reports' && (
            <div style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: '0 0 20px 0' }}>Attendance Analytics</h3>
              
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div className="loading-spinner" style={{ margin: '0 auto' }} />
                </div>
              ) : (
                <>
                  {/* Stats Cards */}
                  {stats && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '15px',
                      marginBottom: '30px'
                    }}>
                      <div style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        padding: '20px',
                        borderRadius: '10px',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
                          {stats.today || 0}
                        </div>
                        <div>Today's Attendance</div>
                      </div>
                      <div style={{
                        background: 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)',
                        color: 'white',
                        padding: '20px',
                        borderRadius: '10px',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
                          {stats.attendanceRate || 0}%
                        </div>
                        <div>Attendance Rate</div>
                      </div>
                      <div style={{
                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        color: 'white',
                        padding: '20px',
                        borderRadius: '10px',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
                          {stats.totalStudents || 0}
                        </div>
                        <div>Total Students</div>
                      </div>
                      <div style={{
                        background: 'linear-gradient(135deg, #5f2c82 0%, #49a09d 100%)',
                        color: 'white',
                        padding: '20px',
                        borderRadius: '10px',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
                          {stats.uniqueStudents || 0}
                        </div>
                        <div>Unique Today</div>
                      </div>
                    </div>
                  )}

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '20px',
                    marginBottom: '20px'
                  }}>
                    {/* Weekly Trend */}
                    <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
                      <h4 style={{ margin: '0 0 15px 0' }}>Weekly Trend</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={stats?.weekly || attendanceData.slice(0, 7)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="_id" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="count" stroke="#2196F3" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Event Type Distribution */}
                    <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
                      <h4 style={{ margin: '0 0 15px 0' }}>Event Distribution</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={getEventTypeCounts()}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {getEventTypeCounts().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 15px 0' }}>Peak Hours Distribution</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={getHourlyDistribution()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#4CAF50" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* By Class Distribution */}
                  {stats?.byClass && stats.byClass.length > 0 && (
                    <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
                      <h4 style={{ margin: '0 0 15px 0' }}>Attendance by Class</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={stats.byClass}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="_id" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#FF9800" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Export Buttons */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button
                      onClick={() => window.print()}
                      style={{
                        padding: '10px 20px',
                        background: '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      🖨️ Print Report
                    </button>
                    <button
                      onClick={exportToCSV}
                      disabled={exportLoading || attendanceData.length === 0}
                      style={{
                        padding: '10px 20px',
                        background: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: exportLoading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        opacity: exportLoading || attendanceData.length === 0 ? 0.6 : 1
                      }}
                    >
                      📥 {exportLoading ? 'Exporting...' : 'Download CSV'}
                    </button>
                    <button
                      onClick={exportToPDF}
                      style={{
                        padding: '10px 20px',
                        background: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      📄 Export PDF
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}