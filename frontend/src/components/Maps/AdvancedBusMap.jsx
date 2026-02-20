import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import { useSocket } from '../../context/SocketContext';
import { transportService } from '../../services/transport';
import { formatDistance, formatDuration } from '../../utils/formatters';

// Custom bus icons
const createBusIcon = (status, speed) => {
  const color = status === 'active' ? '#4CAF50' : '#FF9800';
  const size = speed > 0 ? 40 : 32;
  
  return L.divIcon({
    className: 'custom-bus-icon',
    html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${speed > 0 ? '12px' : '10px'};
        transition: all 0.3s ease;
      ">
        🚌
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
    popupAnchor: [0, -size/2]
  });
};

// Component to auto-fit map bounds
function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

// Geofence visualization component
function GeofenceLayer({ geofences }) {
  return (
    <>
      {geofences.map((geofence) => {
        if (geofence.type === 'circle') {
          return (
            <Circle
              key={geofence._id}
              center={[geofence.centerLat, geofence.centerLon]}
              radius={geofence.radiusMeters}
              pathOptions={{
                color: '#2196F3',
                fillColor: '#2196F3',
                fillOpacity: 0.1,
                weight: 2
              }}
            >
              <Popup>
                <div style={{ padding: '10px' }}>
                  <h4 style={{ margin: '0 0 5px 0' }}>{geofence.routeName}</h4>
                  <p style={{ margin: '5px 0' }}>📍 Circle Geofence</p>
                  <p style={{ margin: '5px 0' }}>Radius: {geofence.radiusMeters}m</p>
                </div>
              </Popup>
            </Circle>
          );
        } else if (geofence.type === 'polygon' && geofence.polygonPoints) {
          const positions = geofence.polygonPoints.map(p => [p.lat, p.lon]);
          return (
            <Polyline
              key={geofence._id}
              positions={[...positions, positions[0]]}
              pathOptions={{
                color: '#2196F3',
                weight: 3,
                fillColor: '#2196F3',
                fillOpacity: 0.1
              }}
            >
              <Popup>
                <div style={{ padding: '10px' }}>
                  <h4 style={{ margin: '0 0 5px 0' }}>{geofence.routeName}</h4>
                  <p style={{ margin: '5px 0' }}>📍 Polygon Geofence</p>
                  <p style={{ margin: '5px 0' }}>{geofence.polygonPoints.length} points</p>
                </div>
              </Popup>
            </Polyline>
          );
        }
        return null;
      })}
    </>
  );
}

// Bus marker component with animation
function BusMarker({ bus, isSelected, onClick }) {
  const [bounce, setBounce] = useState(false);
  
  useEffect(() => {
    // Bounce animation when bus updates
    setBounce(true);
    const timer = setTimeout(() => setBounce(false), 500);
    return () => clearTimeout(timer);
  }, [bus.currentLocation?.timestamp]);

  if (!bus.currentLocation?.lat || !bus.currentLocation?.lng) return null;

  const position = [bus.currentLocation.lat, bus.currentLocation.lng];
  const icon = createBusIcon(bus.status, bus.currentLocation.speed);

  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={{ click: () => onClick(bus) }}
    >
      <Popup>
        <div style={{ 
          minWidth: '200px',
          fontFamily: 'Arial, sans-serif'
        }}>
          <div style={{
            background: bus.status === 'active' ? '#4CAF50' : '#FF9800',
            color: 'white',
            padding: '8px',
            margin: '-12px -12px 10px -12px',
            borderRadius: '8px 8px 0 0'
          }}>
            <h3 style={{ margin: 0 }}>Bus {bus.busNumber}</h3>
          </div>
          
          <div style={{ padding: '5px 0' }}>
            <p style={{ margin: '5px 0' }}>
              <strong>Driver:</strong> {bus.driverName || 'N/A'}
            </p>
            <p style={{ margin: '5px 0' }}>
              <strong>Route:</strong> {bus.route || 'N/A'}
            </p>
            <p style={{ margin: '5px 0' }}>
              <strong>Speed:</strong> {bus.currentLocation.speed || 0} km/h
            </p>
            <p style={{ margin: '5px 0' }}>
              <strong>Status:</strong> 
              <span style={{ 
                color: bus.status === 'active' ? '#4CAF50' : '#FF9800',
                fontWeight: 'bold',
                marginLeft: '5px'
              }}>
                {bus.status}
              </span>
            </p>
            <p style={{ margin: '5px 0' }}>
              <strong>Last Update:</strong><br/>
              {new Date(bus.currentLocation.timestamp).toLocaleTimeString()}
            </p>
            {bus.fuelLevel && (
              <p style={{ margin: '5px 0' }}>
                <strong>Fuel:</strong> {bus.fuelLevel}%
                <div style={{
                  width: '100%',
                  height: '5px',
                  background: '#eee',
                  borderRadius: '3px',
                  marginTop: '2px'
                }}>
                  <div style={{
                    width: `${bus.fuelLevel}%`,
                    height: '100%',
                    background: bus.fuelLevel > 20 ? '#4CAF50' : '#f44336',
                    borderRadius: '3px'
                  }} />
                </div>
              </p>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

// Main component
export default function AdvancedBusMap({ height = '600px', showGeofences = true }) {
  const [buses, setBuses] = useState([]);
  const [geofences, setGeofences] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [mapBounds, setMapBounds] = useState(L.latLngBounds());
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBuses: 0,
    activeBuses: 0,
    averageSpeed: 0,
    outsideGeofence: 0
  });
  
  const { socket, isConnected } = useSocket();
  const mapRef = useRef();

  // Fetch initial data
  useEffect(() => {
    fetchBuses();
    if (showGeofences) {
      fetchGeofences();
    }
  }, []);

  // Socket listeners for real-time updates
  useEffect(() => {
    if (socket) {
      socket.on('liveGPS', (data) => {
        updateBusLocation(data);
      });

      socket.on('geofenceAlert', (alert) => {
        handleGeofenceAlert(alert);
      });

      socket.on('speedAlert', (alert) => {
        handleSpeedAlert(alert);
      });
    }

    return () => {
      if (socket) {
        socket.off('liveGPS');
        socket.off('geofenceAlert');
        socket.off('speedAlert');
      }
    };
  }, [socket]);

  const fetchBuses = async () => {
    try {
      const data = await transportService.getBuses();
      setBuses(Array.isArray(data) ? data : []);
      
      // Update bounds
      const bounds = L.latLngBounds();
      data.forEach(bus => {
        if (bus.currentLocation?.lat && bus.currentLocation?.lng) {
          bounds.extend([bus.currentLocation.lat, bus.currentLocation.lng]);
        }
      });
      
      if (bounds.isValid()) {
        setMapBounds(bounds);
      }
      
      // Calculate stats
      const active = data.filter(b => b.status === 'active').length;
      const speeds = data
        .map(b => b.currentLocation?.speed || 0)
        .filter(s => s > 0);
      const avgSpeed = speeds.length > 0 
        ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length) 
        : 0;
      
      setStats({
        totalBuses: data.length,
        activeBuses: active,
        averageSpeed: avgSpeed,
        outsideGeofence: 0 // Will be updated by alerts
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching buses:', error);
      setLoading(false);
    }
  };

  const fetchGeofences = async () => {
    try {
      const response = await transportService.getGeofences();
      setGeofences(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Error fetching geofences:', error);
    }
  };

  const updateBusLocation = (data) => {
    setBuses(prev => {
      const index = prev.findIndex(b => 
        b._id === data.vehicleId || b.busNumber === data.vehicleId
      );
      
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          currentLocation: {
            ...updated[index].currentLocation,
            lat: data.lat,
            lng: data.lon,
            speed: data.speed,
            timestamp: data.timestamp
          }
        };
        
        // Update bounds to include new location
        if (mapBounds.isValid()) {
          mapBounds.extend([data.lat, data.lon]);
          setMapBounds(mapBounds);
        }
        
        return updated;
      }
      return prev;
    });
  };

  const handleGeofenceAlert = (alert) => {
    setStats(prev => ({
      ...prev,
      outsideGeofence: prev.outsideGeofence + 1
    }));
    
    // Show toast notification
    if (window.toast) {
      window.toast.warning(`🚨 Bus outside geofence: ${alert.message}`);
    }
  };

  const handleSpeedAlert = (alert) => {
    if (window.toast) {
      window.toast.error(`🚨 Speed alert: ${alert.message}`);
    }
  };

  const handleBusSelect = (bus) => {
    setSelectedBus(bus);
    
    // Center map on selected bus
    if (bus.currentLocation?.lat && bus.currentLocation?.lng) {
      mapRef.current?.flyTo(
        [bus.currentLocation.lat, bus.currentLocation.lng],
        15,
        { duration: 1.5 }
      );
    }
  };

  const centerMapOnAll = () => {
    if (mapBounds.isValid()) {
      mapRef.current?.fitBounds(mapBounds, { padding: [50, 50] });
    }
  };

  if (loading) {
    return (
      <div style={{
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
        borderRadius: '8px'
      }}>
        <div className="loading-spinner" />
        <p style={{ marginLeft: '10px' }}>Loading map...</p>
      </div>
    );
  }

  const defaultCenter = [-1.2864, 36.8172]; // Nairobi

  return (
    <div style={{ position: 'relative', height }}>
      {/* Map Controls Overlay */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        background: 'white',
        padding: '10px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        minWidth: '200px'
      }}>
        <div style={{ marginBottom: '10px' }}>
          <strong>Live Stats</strong>
        </div>
        <div style={{ fontSize: '14px' }}>
          <p style={{ margin: '5px 0' }}>
            🟢 Connected: {isConnected ? 'Yes' : 'No'}
          </p>
          <p style={{ margin: '5px 0' }}>
            🚌 Active Buses: {stats.activeBuses}/{stats.totalBuses}
          </p>
          <p style={{ margin: '5px 0' }}>
            📍 Avg Speed: {stats.averageSpeed} km/h
          </p>
          <p style={{ margin: '5px 0' }}>
            ⚠️ Outside Geofence: {stats.outsideGeofence}
          </p>
        </div>
        <button
          onClick={centerMapOnAll}
          style={{
            width: '100%',
            padding: '8px',
            marginTop: '10px',
            background: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Center Map
        </button>
      </div>

      {/* Selected Bus Info */}
      {selectedBus && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          zIndex: 1000,
          background: 'white',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          maxWidth: '300px'
        }}>
          <h4 style={{ margin: '0 0 10px 0' }}>
            Selected: Bus {selectedBus.busNumber}
          </h4>
          <p style={{ margin: '5px 0' }}>Driver: {selectedBus.driverName}</p>
          <p style={{ margin: '5px 0' }}>Speed: {selectedBus.currentLocation?.speed || 0} km/h</p>
          <button
            onClick={() => setSelectedBus(null)}
            style={{
              padding: '5px 10px',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      )}

      {/* Map */}
      <MapContainer
        center={defaultCenter}
        zoom={12}
        style={{ height: '100%', width: '100%', borderRadius: '8px' }}
        whenCreated={mapInstance => {
          mapRef.current = mapInstance;
        }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        
        {/* Geofences */}
        {showGeofences && <GeofenceLayer geofences={geofences} />}
        
        {/* Bus Markers */}
        {buses.map(bus => (
          <BusMarker
            key={bus._id || bus.busNumber}
            bus={bus}
            isSelected={selectedBus?._id === bus._id}
            onClick={handleBusSelect}
          />
        ))}
        
        {/* Auto-fit bounds */}
        <FitBounds bounds={mapBounds} />
      </MapContainer>
    </div>
  );
}