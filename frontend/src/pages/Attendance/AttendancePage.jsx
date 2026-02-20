import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Layout/Sidebar';
import AttendanceScanner from '../../components/Attendance/AttendanceScanner';
import { attendanceService } from '../../services/attendance';
import { format, subDays } from 'date-fns';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts';
import toast from 'react-hot-toast';
import StudentManagement from '../../components/Students/StudentManagement';

export default function AttendancePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('scanner');
  const [dateRange, setDateRange] = useState('week');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);

const tabs = [
  { id: 'scanner', name: 'Scanner', icon: '📷' },
  { id: 'records', name: 'Records', icon: '📋' },
  { id: 'students', name: 'Students', icon: '👥' }, // Add this
  { id: 'reports', name: 'Reports', icon: '📊' }
];

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const data = await attendanceService.getAttendanceByDateRange(startDate, endDate);
      setAttendanceData(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to fetch attendance data');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Student ID', 'Student Name', 'Event Type', 'Bus', 'Time'];
    const csvData = attendanceData.map(record => [
      format(new Date(record.createdAt), 'yyyy-MM-dd'),
      record.studentId?._id || record.studentId,
      record.studentId?.name || 'Unknown',
      record.eventType,
      record.tripId?.route || 'N/A',
      format(new Date(record.createdAt), 'HH:mm:ss')
    ]);

    const csv = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard">
      {/* Use the Sidebar component with proper routing */}
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
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
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
                  gap: '8px'
                }}
              >
                <span>{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'scanner' && <AttendanceScanner />}
          {activeTab === 'students' && (
            <StudentManagement />
  )}
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
                marginBottom: '20px'
              }}>
                <h3 style={{ margin: 0 }}>Attendance Records</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
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
                    style={{
                      padding: '8px 16px',
                      background: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Export CSV
                  </button>
                </div>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div className="loading-spinner" style={{ margin: '0 auto' }} />
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f5f5f5' }}>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Time</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Student</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Event</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Bus/Route</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceData.map((record, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '10px' }}>
                            {format(new Date(record.createdAt), 'MMM dd, HH:mm:ss')}
                          </td>
                          <td style={{ padding: '10px' }}>
                            {record.studentId?.name || 'Unknown'}
                          </td>
                          <td style={{ padding: '10px' }}>
                            <span style={{
                              background: record.eventType === 'board' ? '#4CAF50' : '#FF9800',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '12px'
                            }}>
                              {record.eventType === 'board' ? 'Boarding' : 'Alighting'}
                            </span>
                          </td>
                          <td style={{ padding: '10px' }}>
                            {record.tripId?.route || 'N/A'}
                          </td>
                          <td style={{ padding: '10px' }}>
                            {record.gpsSnapshot ? 
                              `${record.gpsSnapshot.lat?.toFixed(4)}, ${record.gpsSnapshot.lon?.toFixed(4)}` 
                              : 'N/A'
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
              <h3 style={{ margin: '0 0 20px 0' }}>Attendance Reports</h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '20px'
              }}>
                <div>
                  <h4>Daily Summary</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={attendanceData.slice(0, 7)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="createdAt" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="eventType" stroke="#2196F3" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div>
                  <h4>Peak Hours</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[
                      { hour: '6-8', count: 45 },
                      { hour: '8-10', count: 120 },
                      { hour: '10-12', count: 30 },
                      { hour: '12-14', count: 25 },
                      { hour: '14-16', count: 85 },
                      { hour: '16-18', count: 110 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#4CAF50" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{ marginTop: '20px' }}>
                <button
                  onClick={() => window.print()}
                  style={{
                    padding: '10px 20px',
                    background: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginRight: '10px'
                  }}
                >
                  🖨️ Print Report
                </button>
                <button
                  onClick={exportToCSV}
                  style={{
                    padding: '10px 20px',
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  📥 Download CSV
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}