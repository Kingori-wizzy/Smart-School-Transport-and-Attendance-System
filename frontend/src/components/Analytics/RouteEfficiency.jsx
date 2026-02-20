import { useState, useEffect } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { transportService } from '../../services/transport';
import toast from 'react-hot-toast';

export default function RouteEfficiency() {
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [performanceData, setPerformanceData] = useState([]);
  const [comparisonData, setComparisonData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('week');

  useEffect(() => {
    fetchRouteData();
  }, [timeframe]);

  const fetchRouteData = async () => {
    try {
      setLoading(true);
      
      // Fetch routes from trips or buses
      const busesData = await transportService.getBuses();
      const uniqueRoutes = [...new Set(busesData.map(b => b.route).filter(Boolean))];
      
      const routeStats = uniqueRoutes.map(route => {
        const routeBuses = busesData.filter(b => b.route === route);
        const avgSpeed = routeBuses.reduce((sum, b) => 
          sum + (b.currentLocation?.speed || 0), 0) / (routeBuses.length || 1);
        
        return {
          name: route,
          buses: routeBuses.length,
          avgSpeed: Math.round(avgSpeed),
          onTime: Math.floor(85 + Math.random() * 15), // Mock data - replace with real
          fuelEfficiency: Math.floor(70 + Math.random() * 20),
          studentLoad: Math.floor(60 + Math.random() * 30),
          incidents: Math.floor(Math.random() * 5)
        };
      });

      setRoutes(routeStats);

      // Performance metrics for radar chart
      setPerformanceData([
        { metric: 'Speed', value: 85 },
        { metric: 'On-Time', value: 92 },
        { metric: 'Fuel Eff', value: 78 },
        { metric: 'Safety', value: 95 },
        { metric: 'Load', value: 82 },
        { metric: 'Reliability', value: 88 }
      ]);

      // Comparison data for line chart
      setComparisonData([
        { day: 'Mon', routeA: 85, routeB: 78, routeC: 82 },
        { day: 'Tue', routeA: 88, routeB: 82, routeC: 85 },
        { day: 'Wed', routeA: 92, routeB: 85, routeC: 88 },
        { day: 'Thu', routeA: 87, routeB: 80, routeC: 84 },
        { day: 'Fri', routeA: 90, routeB: 83, routeC: 86 }
      ]);

    } catch (error) {
      console.error('Error fetching route data:', error);
      toast.error('Failed to load route efficiency data');
    } finally {
      setLoading(false);
    }
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
        <p style={{ marginLeft: '10px' }}>Loading route efficiency...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{ margin: 0 }}>Route Efficiency Dashboard</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
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
            Week
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
            Month
          </button>
        </div>
      </div>

      {/* Route Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        {routes.map((route, index) => (
          <div
            key={index}
            onClick={() => setSelectedRoute(route)}
            style={{
              background: 'white',
              padding: '20px',
              borderRadius: '10px',
              boxShadow: selectedRoute?.name === route.name 
                ? '0 4px 15px rgba(33, 150, 243, 0.3)' 
                : '0 2px 4px rgba(0,0,0,0.1)',
              border: selectedRoute?.name === route.name 
                ? '2px solid #2196F3' 
                : 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '15px'
            }}>
              <h3 style={{ margin: 0, color: '#2196F3' }}>{route.name}</h3>
              <span style={{
                background: route.incidents === 0 ? '#4CAF50' : '#f44336',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '12px'
              }}>
                {route.incidents} incidents
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '15px'
            }}>
              <div>
                <div style={{ fontSize: '12px', color: '#666' }}>Buses</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                  {route.buses}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666' }}>Avg Speed</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                  {route.avgSpeed} <span style={{ fontSize: '14px' }}>km/h</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666' }}>On-Time</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#4CAF50' }}>
                  {route.onTime}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666' }}>Fuel Eff</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#FF9800' }}>
                  {route.fuelEfficiency}%
                </div>
              </div>
            </div>

            {/* Progress bars */}
            <div style={{ marginTop: '15px' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
                Student Load: {route.studentLoad}%
              </div>
              <div style={{
                width: '100%',
                height: '6px',
                background: '#f0f0f0',
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${route.studentLoad}%`,
                  height: '100%',
                  background: route.studentLoad > 80 ? '#f44336' : '#4CAF50',
                  borderRadius: '3px'
                }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '20px'
      }}>
        {/* Performance Radar */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 20px 0' }}>Overall Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={performanceData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis angle={30} domain={[0, 100]} />
              <Radar
                name="Performance"
                dataKey="value"
                stroke="#2196F3"
                fill="#2196F3"
                fillOpacity={0.6}
              />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Route Comparison */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 20px 0' }}>Route Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis domain={[60, 100]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="routeA" stroke="#4CAF50" name="Route A" />
              <Line type="monotone" dataKey="routeB" stroke="#2196F3" name="Route B" />
              <Line type="monotone" dataKey="routeC" stroke="#FF9800" name="Route C" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Fuel Efficiency */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          gridColumn: 'span 2'
        }}>
          <h3 style={{ margin: '0 0 20px 0' }}>Fuel Efficiency by Route</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={routes}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="fuelEfficiency" fill="#4CAF50" name="Fuel Efficiency %" />
              <Bar dataKey="onTime" fill="#2196F3" name="On-Time %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Selected Route Details */}
      {selectedRoute && (
        <div style={{
          marginTop: '20px',
          background: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 20px 0' }}>
            {selectedRoute.name} - Detailed Analysis
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '15px'
          }}>
            <div>
              <h4>Buses Assigned</h4>
              <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{selectedRoute.buses}</p>
            </div>
            <div>
              <h4>Avg Speed</h4>
              <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{selectedRoute.avgSpeed} km/h</p>
            </div>
            <div>
              <h4>On-Time Rate</h4>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#4CAF50' }}>
                {selectedRoute.onTime}%
              </p>
            </div>
            <div>
              <h4>Fuel Efficiency</h4>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#FF9800' }}>
                {selectedRoute.fuelEfficiency}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}