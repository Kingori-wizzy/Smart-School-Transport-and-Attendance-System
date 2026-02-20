import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter,
  ZAxis, Cell
} from 'recharts';
import { format, subDays } from 'date-fns';
import { transportService } from '../../services/transport';
import toast from 'react-hot-toast';

const COLORS = {
  critical: '#f44336',
  high: '#FF9800',
  warning: '#FFC107',
  normal: '#4CAF50'
};

export default function SpeedViolations() {
  const [violations, setViolations] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [topOffenders, setTopOffenders] = useState([]);
  const [stats, setStats] = useState({
    totalViolations: 0,
    avgSpeed: 0,
    maxSpeed: 0,
    maxSpeedDriver: '',
    mostDangerousRoute: '',
    safeDrivers: 0,
    criticalViolations: 0
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [timeRange, setTimeRange] = useState(7);
  const [selectedViolation, setSelectedViolation] = useState(null);

  useEffect(() => {
    fetchViolationData();
  }, [timeRange]);

  const fetchViolationData = async () => {
    try {
      setLoading(true);
      
      // Fetch real data from API or use mock for now
      // In production, replace with: const data = await transportService.getSpeedViolations(timeRange);
      
      // Mock data generation
      const mockViolations = [];
      const startDate = subDays(new Date(), timeRange);
      const drivers = ['John Driver', 'Peter Driver', 'James Driver', 'Mike Driver', 'David Driver'];
      const routes = ['Route A - North', 'Route B - East', 'Route C - South', 'Route D - West'];
      const buses = ['BUS001', 'BUS002', 'BUS003', 'BUS004', 'BUS005'];
      
      for (let i = 0; i < 50; i++) {
        const date = new Date(startDate);
        date.setHours(date.getHours() + i * 3);
        date.setMinutes(Math.floor(Math.random() * 60));
        
        const speed = 70 + Math.random() * 45;
        const driverIndex = Math.floor(Math.random() * drivers.length);
        const routeIndex = Math.floor(Math.random() * routes.length);
        
        mockViolations.push({
          id: i,
          busId: buses[Math.floor(Math.random() * buses.length)],
          busNumber: buses[Math.floor(Math.random() * buses.length)],
          driver: drivers[driverIndex],
          route: routes[routeIndex],
          speed: Math.round(speed * 10) / 10,
          limit: 80,
          excess: Math.round((speed - 80) * 10) / 10,
          timestamp: date,
          location: {
            lat: -1.2864 + (Math.random() - 0.5) * 0.2,
            lng: 36.8172 + (Math.random() - 0.5) * 0.2
          },
          severity: speed > 105 ? 'critical' : speed > 95 ? 'high' : 'warning'
        });
      }

      // Sort by date (newest first)
      const sortedViolations = mockViolations.sort((a, b) => b.timestamp - a.timestamp);
      setViolations(sortedViolations);

      // Calculate stats
      const totalViolations = sortedViolations.length;
      const avgSpeed = sortedViolations.reduce((sum, v) => sum + v.speed, 0) / totalViolations;
      const maxSpeedEntry = sortedViolations.reduce((max, v) => v.speed > max.speed ? v : max, sortedViolations[0]);
      const criticalCount = sortedViolations.filter(v => v.severity === 'critical').length;
      
      // Find most dangerous route
      const routeStats = {};
      sortedViolations.forEach(v => {
        if (!routeStats[v.route]) {
          routeStats[v.route] = { count: 0, totalExcess: 0 };
        }
        routeStats[v.route].count++;
        routeStats[v.route].totalExcess += v.excess;
      });
      
      let mostDangerousRoute = '';
      let highestAvgExcess = 0;
      Object.entries(routeStats).forEach(([route, stats]) => {
        const avgExcess = stats.totalExcess / stats.count;
        if (avgExcess > highestAvgExcess) {
          highestAvgExcess = avgExcess;
          mostDangerousRoute = route;
        }
      });

      // Count safe drivers (drivers with no violations)
      const driversWithViolations = new Set(sortedViolations.map(v => v.driver));
      const safeDriversCount = drivers.length - driversWithViolations.size;

      setStats({
        totalViolations,
        avgSpeed: Math.round(avgSpeed * 10) / 10,
        maxSpeed: maxSpeedEntry.speed,
        maxSpeedDriver: maxSpeedEntry.driver,
        mostDangerousRoute,
        safeDrivers: safeDriversCount,
        criticalViolations: criticalCount
      });

      // Process trend data (daily violations)
      const dailyData = {};
      sortedViolations.forEach(v => {
        const day = format(v.timestamp, 'MMM dd');
        if (!dailyData[day]) {
          dailyData[day] = { 
            day, 
            count: 0, 
            avgSpeed: 0, 
            totalSpeed: 0,
            critical: 0,
            high: 0,
            warning: 0
          };
        }
        dailyData[day].count++;
        dailyData[day].totalSpeed += v.speed;
        dailyData[day][v.severity]++;
      });

      const trends = Object.values(dailyData).map(d => ({
        ...d,
        avgSpeed: Math.round(d.totalSpeed / d.count)
      }));

      setTrendData(trends);

      // Top offenders (drivers with most violations)
      const driverStats = {};
      sortedViolations.forEach(v => {
        if (!driverStats[v.driver]) {
          driverStats[v.driver] = {
            driver: v.driver,
            count: 0,
            maxSpeed: 0,
            totalExcess: 0,
            criticalCount: 0
          };
        }
        driverStats[v.driver].count++;
        driverStats[v.driver].totalExcess += v.excess;
        driverStats[v.driver].maxSpeed = Math.max(driverStats[v.driver].maxSpeed, v.speed);
        if (v.severity === 'critical') {
          driverStats[v.driver].criticalCount++;
        }
      });

      const offenders = Object.values(driverStats)
        .map(d => ({
          ...d,
          avgExcess: Math.round((d.totalExcess / d.count) * 10) / 10
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setTopOffenders(offenders);

    } catch (error) {
      console.error('Error fetching violation data:', error);
      toast.error('Failed to load speed violation data');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'critical': return '#f44336';
      case 'high': return '#FF9800';
      case 'warning': return '#FFC107';
      default: return '#4CAF50';
    }
  };

  const filteredViolations = violations.filter(v => {
    if (filter === 'all') return true;
    return v.severity === filter;
  });

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
        <p style={{ marginLeft: '10px' }}>Loading speed violation data...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Header with Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '20px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h4 style={{ margin: '0 0 10px 0', opacity: 0.9 }}>Total Violations</h4>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
            {stats.totalViolations}
          </div>
          <small>in last {timeRange} days</small>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h4 style={{ margin: '0 0 10px 0', opacity: 0.9 }}>Critical</h4>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
            {stats.criticalViolations}
          </div>
          <small>over 105 km/h</small>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h4 style={{ margin: '0 0 10px 0', opacity: 0.9 }}>Max Speed</h4>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
            {stats.maxSpeed} <span style={{ fontSize: '16px' }}>km/h</span>
          </div>
          <small>{stats.maxSpeedDriver}</small>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #5f2c82 0%, #49a09d 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h4 style={{ margin: '0 0 10px 0', opacity: 0.9 }}>Safe Drivers</h4>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
            {stats.safeDrivers}
          </div>
          <small>no violations</small>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        padding: '15px',
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}
        >
          <option value="all">All Violations</option>
          <option value="critical">Critical (100+ km/h)</option>
          <option value="high">High (90-100 km/h)</option>
          <option value="warning">Warning (80-90 km/h)</option>
        </select>

        <select
          value={timeRange}
          onChange={(e) => setTimeRange(Number(e.target.value))}
          style={{
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>

        <button
          onClick={fetchViolationData}
          style={{
            padding: '8px 16px',
            background: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Refresh Data
        </button>
      </div>

      {/* Charts Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '20px',
        marginBottom: '20px'
      }}>
        {/* Violation Trend */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          gridColumn: 'span 2'
        }}>
          <h3 style={{ margin: '0 0 20px 0' }}>Violation Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="count" 
                stroke="#f44336" 
                name="Violations"
                strokeWidth={2}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="avgSpeed" 
                stroke="#2196F3" 
                name="Avg Speed"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Severity Distribution */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 20px 0' }}>Severity Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="critical" stackId="a" fill="#f44336" name="Critical" />
              <Bar dataKey="high" stackId="a" fill="#FF9800" name="High" />
              <Bar dataKey="warning" stackId="a" fill="#FFC107" name="Warning" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Offenders */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 20px 0' }}>Top Offenders</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topOffenders} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="driver" type="category" width={100} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#f44336" name="Violations">
                {topOffenders.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % Object.keys(COLORS).length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Violations Table */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '10px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 20px 0' }}>Recent Violations</h3>
        <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f5f5', position: 'sticky', top: 0 }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Time</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Bus</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Driver</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Route</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Speed</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Excess</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Severity</th>
              </tr>
            </thead>
            <tbody>
              {filteredViolations.slice(0, 20).map((v, index) => (
                <tr 
                  key={index} 
                  style={{ 
                    borderBottom: '1px solid #eee',
                    cursor: 'pointer',
                    background: selectedViolation?.id === v.id ? '#f0f7ff' : 'white'
                  }}
                  onClick={() => setSelectedViolation(v)}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f9f9f9'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 
                    selectedViolation?.id === v.id ? '#f0f7ff' : 'white'
                  }
                >
                  <td style={{ padding: '10px' }}>{format(v.timestamp, 'MMM dd, HH:mm')}</td>
                  <td style={{ padding: '10px' }}>{v.busId}</td>
                  <td style={{ padding: '10px' }}>{v.driver}</td>
                  <td style={{ padding: '10px' }}>{v.route}</td>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{v.speed} km/h</td>
                  <td style={{ padding: '10px', color: v.excess > 0 ? '#f44336' : 'inherit' }}>
                    +{v.excess} km/h
                  </td>
                  <td style={{ padding: '10px' }}>
                    <span style={{
                      background: getSeverityColor(v.severity),
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }}>
                      {v.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Violation Details */}
      {selectedViolation && (
        <div style={{
          marginTop: '20px',
          padding: '20px',
          background: '#f0f7ff',
          borderRadius: '8px',
          border: '1px solid #2196F3'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0 }}>Violation Details - {selectedViolation.busId}</h4>
            <button
              onClick={() => setSelectedViolation(null)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '15px',
            marginTop: '15px'
          }}>
            <div>
              <strong>Driver:</strong> {selectedViolation.driver}
            </div>
            <div>
              <strong>Route:</strong> {selectedViolation.route}
            </div>
            <div>
              <strong>Speed:</strong> {selectedViolation.speed} km/h
            </div>
            <div>
              <strong>Limit:</strong> {selectedViolation.limit} km/h
            </div>
            <div>
              <strong>Excess:</strong> <span style={{ color: '#f44336' }}>+{selectedViolation.excess} km/h</span>
            </div>
            <div>
              <strong>Time:</strong> {format(selectedViolation.timestamp, 'MMM dd, yyyy HH:mm:ss')}
            </div>
            <div>
              <strong>Location:</strong> {selectedViolation.location.lat.toFixed(4)}, {selectedViolation.location.lng.toFixed(4)}
            </div>
            <div>
              <strong>Severity:</strong>
              <span style={{
                marginLeft: '5px',
                background: getSeverityColor(selectedViolation.severity),
                color: 'white',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '12px'
              }}>
                {selectedViolation.severity}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}