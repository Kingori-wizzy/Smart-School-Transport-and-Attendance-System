import { useState } from 'react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import toast from 'react-hot-toast';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';

const COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#f44336', '#9C27B0', '#673AB7'];

export default function ReportGenerator() {
  const [reportType, setReportType] = useState('attendance');
  const [dateRange, setDateRange] = useState('week');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [exportFormat, setExportFormat] = useState('pdf');
  const [generating, setGenerating] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [savedReports, setSavedReports] = useState([]);

  const reportTypes = [
    { id: 'attendance', name: 'Attendance Report', icon: '📊', description: 'Daily attendance trends, class distribution, and student statistics' },
    { id: 'transport', name: 'Transport Report', icon: '🚌', description: 'Bus utilization, trip logs, and fuel consumption' },
    { id: 'drivers', name: 'Driver Performance', icon: '👤', description: 'Driver ratings, safety scores, and trip history' },
    { id: 'routes', name: 'Route Efficiency', icon: '🗺️', description: 'Route optimization, on-time performance, and stop analysis' },
    { id: 'alerts', name: 'Alerts & Incidents', icon: '⚠️', description: 'Speed violations, geofence breaches, and system alerts' },
    { id: 'combined', name: 'Combined Summary', icon: '📑', description: 'Executive summary of all key metrics' }
  ];

  const dateRanges = [
    { id: 'today', name: 'Today' },
    { id: 'yesterday', name: 'Yesterday' },
    { id: 'week', name: 'This Week' },
    { id: 'lastweek', name: 'Last Week' },
    { id: 'month', name: 'This Month' },
    { id: 'lastmonth', name: 'Last Month' },
    { id: 'custom', name: 'Custom Range' }
  ];

  const handleDateRangeChange = (range) => {
    setDateRange(range);
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
        setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      case 'lastweek':
        const lastWeekStart = subDays(today, 7);
        const lastWeekEnd = subDays(today, 1);
        setStartDate(format(lastWeekStart, 'yyyy-MM-dd'));
        setEndDate(format(lastWeekEnd, 'yyyy-MM-dd'));
        break;
      case 'month':
        setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      case 'lastmonth':
        const lastMonth = subDays(startOfMonth(today), 1);
        const lastMonthStart = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
        const lastMonthEnd = format(endOfMonth(lastMonth), 'yyyy-MM-dd');
        setStartDate(lastMonthStart);
        setEndDate(lastMonthEnd);
        break;
      default:
        break;
    }
  };

  const generatePreview = () => {
    setGenerating(true);
    
    // Simulate API call delay
    setTimeout(() => {
      // Mock data based on report type
      let data = {};
      
      switch(reportType) {
        case 'attendance':
          data = {
            title: 'Attendance Report',
            period: `${startDate} to ${endDate}`,
            summary: {
              totalStudents: 245,
              presentToday: 218,
              attendanceRate: 89,
              averageDaily: 225,
              peakDay: 'Monday',
              peakAttendance: 238
            },
            dailyTrend: [
              { date: 'Mon', present: 235, absent: 10, late: 5 },
              { date: 'Tue', present: 238, absent: 7, late: 3 },
              { date: 'Wed', present: 230, absent: 15, late: 8 },
              { date: 'Thu', present: 225, absent: 20, late: 6 },
              { date: 'Fri', present: 218, absent: 27, late: 9 }
            ],
            byClass: [
              { name: 'Grade 5', value: 45 },
              { name: 'Grade 6', value: 52 },
              { name: 'Grade 7', value: 38 },
              { name: 'Grade 8', value: 41 },
              { name: 'Grade 9', value: 35 }
            ]
          };
          break;
          
        case 'transport':
          data = {
            title: 'Transport Report',
            period: `${startDate} to ${endDate}`,
            summary: {
              totalBuses: 8,
              activeBuses: 6,
              totalTrips: 124,
              onTimeRate: 94,
              totalDistance: 1850,
              fuelUsed: 425
            },
            busPerformance: [
              { name: 'BUS001', trips: 45, onTime: 43, distance: 650 },
              { name: 'BUS002', trips: 42, onTime: 40, distance: 580 },
              { name: 'BUS003', trips: 38, onTime: 35, distance: 520 }
            ]
          };
          break;
          
        case 'drivers':
          data = {
            title: 'Driver Performance Report',
            period: `${startDate} to ${endDate}`,
            summary: {
              totalDrivers: 12,
              activeDrivers: 10,
              avgRating: 4.7,
              totalTrips: 1240,
              safetyScore: 98
            },
            topDrivers: [
              { name: 'John Driver', trips: 245, rating: 4.9, safety: 100 },
              { name: 'Peter Driver', trips: 232, rating: 4.8, safety: 99 },
              { name: 'James Driver', trips: 218, rating: 4.9, safety: 100 }
            ]
          };
          break;
          
        case 'routes':
          data = {
            title: 'Route Efficiency Report',
            period: `${startDate} to ${endDate}`,
            summary: {
              totalRoutes: 6,
              activeRoutes: 5,
              avgDuration: 45,
              avgDistance: 12.5,
              mostEfficient: 'Route A'
            },
            routeEfficiency: [
              { name: 'Route A', onTime: 98, fuelEff: 8.7, load: 85 },
              { name: 'Route B', onTime: 95, fuelEff: 8.2, load: 92 },
              { name: 'Route C', onTime: 92, fuelEff: 7.9, load: 78 }
            ]
          };
          break;
          
        case 'alerts':
          data = {
            title: 'Alerts & Incidents Report',
            period: `${startDate} to ${endDate}`,
            summary: {
              totalAlerts: 15,
              criticalAlerts: 3,
              resolvedAlerts: 12,
              avgResponseTime: 12
            },
            alertsByType: [
              { name: 'Speeding', value: 8 },
              { name: 'Geofence', value: 4 },
              { name: 'Fuel', value: 2 },
              { name: 'Maintenance', value: 1 }
            ]
          };
          break;
          
        case 'combined':
          data = {
            title: 'Combined Executive Summary',
            period: `${startDate} to ${endDate}`,
            attendance: { rate: 92, total: 245 },
            transport: { trips: 124, onTime: 94 },
            drivers: { active: 10, rating: 4.7 },
            alerts: { total: 15, critical: 3 }
          };
          break;
      }
      
      setPreviewData(data);
      setGenerating(false);
      toast.success('Report preview generated');
    }, 1500);
  };

  const generateReport = () => {
    toast.success(`Report generated in ${exportFormat.toUpperCase()} format`);
    // In production, this would trigger actual report generation/download
  };

  const saveReport = () => {
    const report = {
      id: Date.now(),
      type: reportType,
      name: `${reportTypes.find(r => r.id === reportType)?.name} - ${startDate} to ${endDate}`,
      date: new Date().toISOString(),
      format: exportFormat
    };
    setSavedReports(prev => [report, ...prev].slice(0, 10));
    toast.success('Report saved successfully');
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
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: '3px 0', color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* Report Configuration */}
      <div style={{
        background: 'white',
        padding: '25px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>Generate New Report</h3>
        
        {/* Report Type Selection */}
        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: '#555' }}>
            Select Report Type
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '10px'
          }}>
            {reportTypes.map(type => (
              <div
                key={type.id}
                onClick={() => setReportType(type.id)}
                style={{
                  padding: '15px',
                  background: reportType === type.id ? '#e3f2fd' : '#f8f9fa',
                  border: reportType === type.id ? '2px solid #2196F3' : '1px solid #ddd',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '5px' }}>{type.icon}</div>
                <div style={{ fontWeight: '600', marginBottom: '5px' }}>{type.name}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{type.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Date Range Selection */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: '#555' }}>
            Date Range
          </label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
            {dateRanges.map(range => (
              <button
                key={range.id}
                onClick={() => handleDateRangeChange(range.id)}
                style={{
                  padding: '8px 16px',
                  background: dateRange === range.id ? '#2196F3' : '#f0f0f0',
                  color: dateRange === range.id ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {range.name}
              </button>
            ))}
          </div>

          {dateRange === 'custom' && (
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#666' }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <span>to</span>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#666' }}>
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Export Format */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: '#555' }}>
            Export Format
          </label>
          <div style={{ display: 'flex', gap: '15px' }}>
            {['pdf', 'excel', 'csv'].map(format => (
              <label key={format} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input
                  type="radio"
                  name="format"
                  value={format}
                  checked={exportFormat === format}
                  onChange={(e) => setExportFormat(e.target.value)}
                />
                {format.toUpperCase()}
              </label>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '15px' }}>
          <button
            onClick={generatePreview}
            disabled={generating}
            style={{
              padding: '12px 24px',
              background: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: generating ? 'not-allowed' : 'pointer',
              opacity: generating ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {generating ? '⏳ Generating...' : '👁️ Preview Report'}
          </button>
          
          <button
            onClick={generateReport}
            disabled={!previewData}
            style={{
              padding: '12px 24px',
              background: !previewData ? '#ccc' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: !previewData ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            📥 Generate {exportFormat.toUpperCase()}
          </button>
          
          <button
            onClick={saveReport}
            disabled={!previewData}
            style={{
              padding: '12px 24px',
              background: !previewData ? '#ccc' : '#FF9800',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: !previewData ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            💾 Save Report
          </button>
        </div>
      </div>

      {/* Report Preview */}
      {previewData && (
        <div style={{
          background: 'white',
          padding: '30px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          {/* Report Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '25px',
            paddingBottom: '20px',
            borderBottom: '2px solid #f0f0f0'
          }}>
            <div>
              <h2 style={{ margin: '0 0 5px 0', color: '#333' }}>{previewData.title}</h2>
              <p style={{ color: '#666', margin: 0 }}>Period: {previewData.period}</p>
            </div>
            <div style={{
              background: '#e3f2fd',
              padding: '8px 16px',
              borderRadius: '20px',
              color: '#2196F3',
              fontWeight: '600',
              fontSize: '14px'
            }}>
              PREVIEW MODE
            </div>
          </div>

          {/* Summary Cards */}
          {previewData.summary && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '15px',
              marginBottom: '30px'
            }}>
              {Object.entries(previewData.summary).map(([key, value]) => (
                <div key={key} style={{
                  background: '#f8f9fa',
                  padding: '20px',
                  borderRadius: '10px',
                  textAlign: 'center'
                }}>
                  <div style={{
                    fontSize: '13px',
                    color: '#666',
                    textTransform: 'capitalize',
                    marginBottom: '8px'
                  }}>
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    color: '#2196F3'
                  }}>
                    {value}
                    {key.includes('rate') && '%'}
                    {key.includes('Distance') && ' km'}
                    {key.includes('Fuel') && ' L'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Charts */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '25px',
            marginBottom: '30px'
          }}>
            {previewData.dailyTrend && (
              <div style={{ gridColumn: 'span 2' }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#555' }}>Daily Trend</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={previewData.dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="present" stroke="#4CAF50" name="Present" />
                    <Line type="monotone" dataKey="absent" stroke="#f44336" name="Absent" />
                    <Line type="monotone" dataKey="late" stroke="#FF9800" name="Late" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {previewData.byClass && (
              <div>
                <h4 style={{ margin: '0 0 15px 0', color: '#555' }}>Class Distribution</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={previewData.byClass}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {previewData.byClass.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {previewData.busPerformance && (
              <div>
                <h4 style={{ margin: '0 0 15px 0', color: '#555' }}>Bus Performance</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={previewData.busPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="trips" fill="#2196F3" />
                    <Bar dataKey="onTime" fill="#4CAF50" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {previewData.alertsByType && (
              <div style={{ gridColumn: 'span 2' }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#555' }}>Alerts by Type</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={previewData.alertsByType}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#f44336" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Report Footer */}
          <div style={{
            marginTop: '20px',
            paddingTop: '20px',
            borderTop: '1px solid #eee',
            fontSize: '12px',
            color: '#999',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>Generated on: {format(new Date(), 'MMMM dd, yyyy HH:mm:ss')}</span>
            <span>Smart School Transport System • Confidential</span>
          </div>
        </div>
      )}

      {/* Saved Reports */}
      {savedReports.length > 0 && (
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>Recently Saved Reports</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {savedReports.map(report => (
              <div key={report.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '15px',
                background: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #eee'
              }}>
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '5px' }}>{report.name}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {format(new Date(report.date), 'MMM dd, yyyy HH:mm')} • {report.format.toUpperCase()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => toast.success(`Viewing ${report.name}`)}
                    style={{
                      padding: '6px 12px',
                      background: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    View
                  </button>
                  <button
                    onClick={() => toast.success(`Downloading ${report.name}`)}
                    style={{
                      padding: '6px 12px',
                      background: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}