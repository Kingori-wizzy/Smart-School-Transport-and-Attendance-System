import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Sidebar from '../../components/Layout/Sidebar';
import LiveGPSMap from '../../components/Maps/LiveGPSMap';
import { transportService } from '../../services/transport';
import { attendanceService } from '../../services/attendance';
import { studentService } from '../../services/student';
import { formatTime, getRelativeTime } from '../../utils/formatters';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isConnected, socket } = useSocket();
  const [buses, setBuses] = useState([]);
  const [students, setStudents] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [stats, setStats] = useState({
    activeBuses: 0,
    movingBuses: 0,
    stoppedBuses: 0,
    totalStudents: 0,
    presentToday: 0,
    attendanceRate: 0,
    alerts: 0,
    avgSpeed: 0,
    onTimeRate: 98
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [showMap, setShowMap] = useState(true);
  const [mapHeight, setMapHeight] = useState('500px');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    
    // Listen for real-time updates
    if (socket) {
      socket.on('liveGPS', handleLiveGPSUpdate);
      socket.on('speedAlert', handleSpeedAlert);
      socket.on('geofenceAlert', handleGeofenceAlert);
      socket.on('fuelAlert', handleFuelAlert);
      socket.on('new-attendance', handleNewAttendance);
      socket.on('busStatusChange', handleBusStatusChange);
    }

    // Refresh data every 30 seconds if auto-refresh is enabled
    const interval = setInterval(() => {
      if (autoRefresh) {
        fetchDashboardData(true); // silent refresh
      }
    }, 30000);

    return () => {
      if (socket) {
        socket.off('liveGPS');
        socket.off('speedAlert');
        socket.off('geofenceAlert');
        socket.off('fuelAlert');
        socket.off('new-attendance');
        socket.off('busStatusChange');
      }
      clearInterval(interval);
    };
  }, [socket, autoRefresh]);

  const handleLiveGPSUpdate = (data) => {
    setBuses(prev => {
      const index = prev.findIndex(b => 
        b._id === data.vehicleId || b.busNumber === data.vehicleId
      );
      
      if (index >= 0) {
        const updated = [...prev];
        const wasMoving = (updated[index].currentLocation?.speed || 0) > 0;
        const isMoving = data.speed > 0;
        
        updated[index] = {
          ...updated[index],
          currentLocation: {
            lat: data.lat,
            lng: data.lon,
            speed: data.speed,
            heading: data.heading || 0,
            timestamp: data.timestamp || new Date()
          },
          fuelLevel: data.fuelLevel !== undefined ? data.fuelLevel : updated[index].fuelLevel
        };
        
        // Update stats if movement status changed
        if (wasMoving !== isMoving) {
          setStats(prevStats => ({
            ...prevStats,
            movingBuses: prevStats.movingBuses + (isMoving ? 1 : -1),
            stoppedBuses: prevStats.stoppedBuses + (isMoving ? -1 : 1)
          }));
        }
        
        return updated;
      }
      return prev;
    });

    // Update average speed stat
    setStats(prev => {
      const currentBuses = buses.length > 0 ? buses : [];
      const speeds = currentBuses
        .map(b => b.currentLocation?.speed || 0)
        .filter(s => s > 0);
      const avgSpeed = speeds.length > 0 
        ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length) 
        : 0;
      return { ...prev, avgSpeed };
    });
  };

  const handleBusStatusChange = (data) => {
    setBuses(prev => {
      const index = prev.findIndex(b => b._id === data.busId);
      if (index >= 0) {
        const updated = [...prev];
        updated[index].status = data.status;
        return updated;
      }
      return prev;
    });
    
    // Update active buses count
    setStats(prev => {
      const activeCount = buses.filter(b => b.status === 'active' || b.status === 'online').length;
      return { ...prev, activeBuses: activeCount };
    });
  };

  const handleSpeedAlert = (alert) => {
    setStats(prev => ({ ...prev, alerts: prev.alerts + 1 }));
    setRecentAlerts(prev => [{
      id: Date.now(),
      type: 'speed',
      message: `🚨 Speed alert: ${alert.message}`,
      timestamp: new Date(),
      data: alert,
      busId: alert.vehicleId
    }, ...prev].slice(0, 10));
    
    toast.error(`🚨 Speed alert: ${alert.message}`, {
      duration: 5000,
      icon: '🚨',
      position: 'top-right'
    });
  };

  const handleGeofenceAlert = (alert) => {
    setStats(prev => ({ ...prev, alerts: prev.alerts + 1 }));
    setRecentAlerts(prev => [{
      id: Date.now(),
      type: 'geofence',
      message: `📍 Geofence alert: ${alert.message}`,
      timestamp: new Date(),
      data: alert,
      busId: alert.vehicleId
    }, ...prev].slice(0, 10));
    
    toast.warning(`📍 Geofence alert: ${alert.message}`, {
      duration: 5000,
      icon: '📍',
      position: 'top-right'
    });
  };

  const handleFuelAlert = (alert) => {
    setStats(prev => ({ ...prev, alerts: prev.alerts + 1 }));
    setRecentAlerts(prev => [{
      id: Date.now(),
      type: 'fuel',
      message: `⛽ Fuel alert: ${alert.message}`,
      timestamp: new Date(),
      data: alert,
      busId: alert.vehicleId
    }, ...prev].slice(0, 10));
    
    toast.error(`⛽ Fuel alert: ${alert.message}`, {
      duration: 5000,
      icon: '⛽',
      position: 'top-right'
    });
  };

  const handleNewAttendance = (data) => {
    fetchDashboardData(true);
    toast.success(`📝 New attendance recorded`, {
      duration: 3000,
      icon: '📝',
      position: 'top-right'
    });
  };

  const fetchDashboardData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      
      console.log('Fetching dashboard data...');
      
      // Fetch buses
      const busesData = await transportService.getBuses();
      const busesArray = Array.isArray(busesData) ? busesData : [];
      setBuses(busesArray);
      
      // Fetch students
      const studentsData = await studentService.getStudents();
      const studentsArray = Array.isArray(studentsData) ? studentsData : [];
      setStudents(studentsArray);
      
      // Fetch attendance stats
      const attendanceStats = await attendanceService.getAttendanceStats();
      
      // Fetch GPS stats
      const gpsStats = await transportService.getGPSStats();
      
      // Calculate moving/stopped stats
      const movingCount = busesArray.filter(b => (b.currentLocation?.speed || 0) > 0).length;
      const stoppedCount = busesArray.length - movingCount;
      
      // Calculate average speed
      const speeds = busesArray
        .map(b => b.currentLocation?.speed || 0)
        .filter(s => s > 0);
      const avgSpeed = speeds.length > 0 
        ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length) 
        : 0;
      
      // Update stats
      setStats({
        activeBuses: busesArray.filter(b => b.status === 'active' || b.status === 'online').length,
        movingBuses: movingCount,
        stoppedBuses: stoppedCount,
        totalStudents: studentsArray.length,
        presentToday: attendanceStats?.uniqueStudents || 0,
        attendanceRate: studentsArray.length > 0 
          ? Math.round((attendanceStats?.uniqueStudents || 0) / studentsArray.length * 100) 
          : 0,
        alerts: gpsStats?.recentSpeedViolations || 0,
        avgSpeed: avgSpeed,
        onTimeRate: 98
      });
      
      setLastUpdated(new Date());
      
      if (!silent) {
        toast.success('Dashboard data refreshed', { duration: 2000 });
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
      if (!silent) {
        toast.error('Failed to load dashboard data');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboardData();
  };

  const clearAlerts = () => {
    setRecentAlerts([]);
    setStats(prev => ({ ...prev, alerts: 0 }));
    toast.success('Alerts cleared');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleBusSelect = (bus) => {
    setSelectedBus(bus);
  };

  const handleViewAllBuses = () => {
    setSelectedBus(null);
    toast.success('Viewing all buses');
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(prev => !prev);
    toast.success(autoRefresh ? 'Auto-refresh disabled' : 'Auto-refresh enabled');
  };

  if (loading) {
    return (
      <div className="dashboard">
        <Sidebar />
        <div className="main-content">
          <div className="content-area" style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh',
            flexDirection: 'column'
          }}>
            <div className="loading-spinner" style={{ width: '50px', height: '50px' }}></div>
            <p style={{ marginTop: '20px', fontSize: '18px', color: '#666' }}>
              Loading dashboard data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Sidebar />

      {/* Main Content */}
      <div className="main-content">
        <div className="top-bar">
          <h2>Dashboard</h2>
          <div className="user-info">
            <span className="welcome-text">
              Welcome, {user?.name || user?.email || 'Admin'}
            </span>
            <span className={`connection-status ${isConnected ? 'live' : 'offline'}`}>
              {isConnected ? '🟢 Live' : '🔴 Offline'}
            </span>
            <button 
              onClick={toggleAutoRefresh}
              className="refresh-btn"
              title={autoRefresh ? 'Auto-refresh on' : 'Auto-refresh off'}
              style={{
                background: autoRefresh ? '#4CAF50' : '#f0f0f0',
                color: autoRefresh ? 'white' : '#333',
                borderRadius: '20px',
                padding: '5px 15px'
              }}
            >
              {autoRefresh ? '🔄 Auto' : '⏸️ Manual'}
            </button>
            <button 
              onClick={handleRefresh} 
              className="refresh-btn"
              title="Refresh data"
            >
              🔄
            </button>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>

        <div className="content-area">
          {error && (
            <div className="error-message" style={{ 
              marginBottom: '20px',
              padding: '15px',
              background: '#ffebee',
              color: '#c62828',
              borderRadius: '8px',
              border: '1px solid #ffcdd2'
            }}>
              <strong>Error:</strong> {error}
              <button 
                onClick={handleRefresh}
                style={{
                  marginLeft: '15px',
                  padding: '5px 10px',
                  background: '#c62828',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card" style={{ borderLeft: '4px solid #2196F3' }}>
              <h3>Active Buses</h3>
              <div className="value">{stats.activeBuses}</div>
              <small>{buses.length} total buses</small>
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                <span style={{ color: '#4CAF50' }}>🚗 {stats.movingBuses} moving</span> • 
                <span style={{ color: '#FF9800' }}> ⏱️ {stats.stoppedBuses} stopped</span>
              </div>
            </div>
            
            <div className="stat-card" style={{ borderLeft: '4px solid #4CAF50' }}>
              <h3>Total Students</h3>
              <div className="value">{stats.totalStudents}</div>
              <small>Enrolled</small>
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                Avg Speed: {stats.avgSpeed} km/h
              </div>
            </div>
            
            <div className="stat-card" style={{ borderLeft: '4px solid #FF9800' }}>
              <h3>Present Today</h3>
              <div className="value">{stats.presentToday}</div>
              <small>{stats.attendanceRate}% attendance</small>
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                {stats.presentToday} / {stats.totalStudents} students
              </div>
            </div>
            
            <div className="stat-card" style={{ borderLeft: '4px solid #f44336' }}>
              <h3>Active Alerts</h3>
              <div className="value">{stats.alerts}</div>
              <small>Last 24 hours</small>
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                On-time rate: {stats.onTimeRate}%
              </div>
            </div>
          </div>

          {/* Map Controls */}
          <div style={{ 
            marginBottom: '15px', 
            display: 'flex', 
            gap: '10px',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowMap(!showMap)}
                style={{
                  padding: '8px 16px',
                  background: showMap ? '#2196F3' : '#f5f5f5',
                  color: showMap ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                {showMap ? '🗺️ Hide Map' : '🗺️ Show Map'}
              </button>
              
              {showMap && (
                <>
                  <button
                    onClick={handleViewAllBuses}
                    style={{
                      padding: '8px 16px',
                      background: selectedBus ? '#FF9800' : '#f5f5f5',
                      color: selectedBus ? 'white' : '#333',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {selectedBus ? '📍 View All' : '📍 All Buses'}
                  </button>
                  <select
                    value={mapHeight}
                    onChange={(e) => setMapHeight(e.target.value)}
                    style={{
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  >
                    <option value="400px">Small Map</option>
                    <option value="500px">Medium Map</option>
                    <option value="600px">Large Map</option>
                    <option value="700px">Extra Large</option>
                  </select>
                </>
              )}
            </div>
            
            {recentAlerts.length > 0 && (
              <button
                onClick={clearAlerts}
                style={{
                  padding: '8px 16px',
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                🗑️ Clear Alerts ({recentAlerts.length})
              </button>
            )}
          </div>

          {/* Live GPS Map */}
          {showMap && (
            <div className="map-container" style={{ marginBottom: '20px' }}>
              <LiveGPSMap 
                height={mapHeight}
                showGeofences={true}
                showStops={true}
                showRoutes={true}
                onBusSelect={handleBusSelect}
                selectedBusId={selectedBus?._id}
              />
              
              {/* Map Legend */}
              <div style={{
                display: 'flex',
                gap: '20px',
                marginTop: '10px',
                padding: '10px',
                background: '#f8f9fa',
                borderRadius: '6px',
                fontSize: '12px',
                flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ color: '#4CAF50', fontSize: '16px' }}>🚌</span> Active Bus
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ color: '#FF9800', fontSize: '16px' }}>🚌</span> Stopped Bus
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ color: '#2196F3', fontSize: '16px' }}>🔵</span> Geofence
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ color: '#FF9800', fontSize: '16px' }}>🟠</span> Bus Stop
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ color: '#4CAF50', fontSize: '16px' }}>🟢</span> Route
                </div>
              </div>
            </div>
          )}

          {/* Two Column Layout */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '20px',
            marginTop: '20px'
          }}>
            {/* Active Buses List */}
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
                marginBottom: '15px'
              }}>
                <h3 style={{ margin: 0 }}>🚌 Active Buses</h3>
                <span style={{
                  background: '#2196F3',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '12px'
                }}>
                  {buses.filter(b => b.status === 'active').length} online
                </span>
              </div>
              
              {buses.filter(b => b.status === 'active').length > 0 ? (
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {buses.filter(b => b.status === 'active').map(bus => (
                    <div 
                      key={bus._id || bus.busNumber} 
                      onClick={() => handleBusSelect(bus)}
                      style={{
                        padding: '12px',
                        marginBottom: '8px',
                        background: selectedBus?._id === bus._id ? '#e3f2fd' : '#f8f9fa',
                        borderRadius: '8px',
                        borderLeft: selectedBus?._id === bus._id ? '4px solid #2196F3' : '4px solid #4CAF50',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(5px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                    >
                      <div>
                        <strong style={{ fontSize: '16px' }}>{bus.busNumber}</strong>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {bus.driverName || 'No driver'} • {bus.route || 'No route'}
                        </div>
                        {bus.currentLocation && (
                          <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                            Updated: {getRelativeTime(bus.currentLocation.timestamp)}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ 
                          background: (bus.currentLocation?.speed || 0) > 0 ? '#4CAF50' : '#FF9800',
                          color: 'white',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          {bus.currentLocation?.speed || 0} km/h
                        </div>
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                          Fuel: {bus.fuelLevel || 100}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '30px',
                  background: '#f8f9fa',
                  borderRadius: '8px'
                }}>
                  <p style={{ color: '#666', margin: 0 }}>No active buses at the moment</p>
                </div>
              )}
            </div>

            {/* Recent Alerts */}
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
                marginBottom: '15px'
              }}>
                <h3 style={{ margin: 0 }}>⚠️ Recent Alerts</h3>
                {recentAlerts.length > 0 && (
                  <span style={{
                    background: '#f44336',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}>
                    {recentAlerts.length} new
                  </span>
                )}
              </div>
              
              {recentAlerts.length > 0 ? (
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {recentAlerts.map(alert => {
                    const bus = buses.find(b => b._id === alert.busId || b.busNumber === alert.busId);
                    return (
                      <div 
                        key={alert.id} 
                        style={{
                          padding: '12px',
                          marginBottom: '8px',
                          background: alert.type === 'speed' ? '#ffebee' : 
                                      alert.type === 'geofence' ? '#fff3e0' : '#e8f5e8',
                          borderRadius: '8px',
                          fontSize: '13px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                        onClick={() => bus && handleBusSelect(bus)}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(5px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 'bold' }}>{alert.message}</span>
                          <span style={{ color: '#666', fontSize: '11px' }}>
                            {formatTime(alert.timestamp)}
                          </span>
                        </div>
                        {bus && (
                          <div style={{ 
                            fontSize: '11px', 
                            color: '#666', 
                            marginTop: '5px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}>
                            <span>🚌 {bus.busNumber}</span>
                            <span>•</span>
                            <span>{bus.driverName || 'Unknown driver'}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '30px',
                  background: '#f8f9fa',
                  borderRadius: '8px'
                }}>
                  <p style={{ color: '#666', margin: 0 }}>No recent alerts</p>
                  <p style={{ color: '#999', fontSize: '12px', marginTop: '5px' }}>
                    All systems operating normally
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* System Status */}
          <div style={{
            marginTop: '20px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px',
            borderRadius: '10px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            color: 'white'
          }}>
            <div>
              <div style={{ fontSize: '13px', opacity: 0.8 }}>System Status</div>
              <div style={{ 
                fontSize: '16px', 
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                {isConnected ? '✅ Online' : '❌ Offline'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '13px', opacity: 0.8 }}>Last Updated</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                {formatTime(lastUpdated)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '13px', opacity: 0.8 }}>Data Freshness</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                {getRelativeTime(lastUpdated)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '13px', opacity: 0.8 }}>Socket Connection</div>
              <div style={{ 
                fontSize: '16px', 
                fontWeight: 'bold',
                color: isConnected ? '#4CAF50' : '#f44336'
              }}>
                {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{
            marginTop: '20px',
            display: 'flex',
            gap: '10px',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={() => navigate('/transport')}
              style={{
                padding: '10px 20px',
                background: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              🚌 Manage Transport
            </button>
            <button
              onClick={() => navigate('/attendance')}
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
              📝 Take Attendance
            </button>
            <button
              onClick={() => navigate('/reports')}
              style={{
                padding: '10px 20px',
                background: '#FF9800',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              📊 View Reports
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;