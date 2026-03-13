import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-defaulticon-compatibility';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import { useSocket } from '../../context/SocketContext';
import { transportService } from '../../services/transport';
import { formatTime } from '../../utils/formatters'; // Removed unused formatDistance
import toast from 'react-hot-toast';

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom bus icons with different colors and animations
const createBusIcon = (status, speed, direction = 0) => {
  const colors = {
    active: '#4CAF50',
    inactive: '#f44336',
    maintenance: '#FF9800',
    'on-trip': '#2196F3'
  };
  
  const color = colors[status] || '#4CAF50';
  const size = speed > 0 ? 48 : 40;
  
  return L.divIcon({
    className: 'custom-bus-icon',
    html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${speed > 0 ? '20px' : '16px'};
        transform: rotate(${direction}deg);
        transition: all 0.3s ease;
        animation: ${speed > 0 ? 'busMove 1s infinite alternate' : 'none'};
      ">
        🚌
      </div>
      ${speed > 0 ? `<div style="
        position: absolute;
        bottom: -20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.7);
        color: white;
        padding: 2px 6px;
        border-radius: 10px;
        font-size: 10px;
        white-space: nowrap;
      ">${speed} km/h</div>` : ''}
    `,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
    popupAnchor: [0, -size/2]
    // Removed duplicate className property
  });
};

// Stop icon
const stopIcon = L.divIcon({
  className: 'stop-icon',
  html: `
    <div style="
      width: 12px;
      height: 12px;
      background: #FF9800;
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    "></div>
  `,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

// Geofence icon - Kept but marked with eslint-disable if really unused
// eslint-disable-next-line no-unused-vars
const geofenceIcon = L.divIcon({
  className: 'geofence-icon',
  html: `
    <div style="
      width: 16px;
      height: 16px;
      background: #2196F3;
      border: 2px solid white;
      border-radius: 4px;
      transform: rotate(45deg);
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    "></div>
  `,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

// ==================== HELPER COMPONENTS ====================

function FitBounds({ bounds }) { // Removed unused mapInstance prop
  const map = useMap();
  
  useEffect(() => {
    if (!map) {
      console.warn('Map not ready yet');
      return;
    }
    
    if (!bounds) {
      console.warn('No bounds provided');
      return;
    }
    
    const isValidBounds = () => {
      try {
        return bounds && 
               typeof bounds.isValid === 'function' && 
               bounds.isValid() && 
               bounds.getNorth() !== -Infinity &&
               bounds.getSouth() !== Infinity;
      } catch (error) {
        console.warn('Bounds validation error:', error);
        return false;
      }
    };
    
    if (!isValidBounds()) {
      console.warn('Invalid bounds, using default view');
      return;
    }
    
    const timer = setTimeout(() => {
      try {
        map.fitBounds(bounds, { 
          padding: [50, 50], 
          maxZoom: 15,
          animate: true,
          duration: 1
        });
      } catch (error) {
        console.error('Error fitting bounds:', error);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [bounds, map]);
  
  return null;
}

function LiveLocationUpdater({ busId, onLocationUpdate }) {
  const map = useMap();
  
  useEffect(() => {
    if (!busId) return;
    
    if (typeof onLocationUpdate !== 'function') {
      console.warn('onLocationUpdate is not a function');
      return;
    }
    
    const interval = setInterval(() => {
      try {
        const mockUpdate = {
          busId,
          lat: -1.2864 + (Math.random() - 0.5) * 0.01,
          lng: 36.8172 + (Math.random() - 0.5) * 0.01,
          speed: Math.floor(20 + Math.random() * 40),
          heading: Math.floor(Math.random() * 360),
          timestamp: new Date()
        };
        onLocationUpdate(mockUpdate);
      } catch (error) {
        console.error('Error in location update:', error);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [busId, map, onLocationUpdate]);
  
  return null;
}

// ==================== MAIN COMPONENT ====================

export default function LiveGPSMap({ 
  height = '600px', 
  showGeofences = true,
  showStops = true,
  showRoutes = true,
  onBusSelect,
  selectedBusId 
}) {
  // ==================== 1. STATE DECLARATIONS ====================
  const [buses, setBuses] = useState([]);
  const [geofences, setGeofences] = useState([]);
  const [stops, setStops] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [mapBounds, setMapBounds] = useState(() => {
    const bounds = L.latLngBounds();
    bounds.extend([-1.2864, 36.8172]);
    return bounds;
  });
  const [loading, setLoading] = useState(true);
  const [mapLayers, setMapLayers] = useState({
    satellite: false,
    traffic: false,
    heatmap: false
  });
  const [stats, setStats] = useState({
    totalBuses: 0,
    movingBuses: 0,
    stoppedBuses: 0,
    averageSpeed: 0,
    alerts: 0
  });
  const [mapCenter] = useState([-1.2864, 36.8172]);
  const [mapZoom] = useState(12);
  // Removed unused mapReady state
  
  const { socket, isConnected } = useSocket();
  const mapRef = useRef();
  const markersRef = useRef({});
  const initialFetchDone = useRef(false);

  // ==================== 2. ALL FETCH FUNCTIONS ====================

  const fetchBuses = useCallback(async () => {
    try {
      const data = await transportService.getBuses();
      const busesArray = Array.isArray(data) ? data : [];
      setBuses(busesArray);
      
      const bounds = L.latLngBounds();
      let hasValidLocations = false;
      
      busesArray.forEach(bus => {
        if (bus.currentLocation?.lat && bus.currentLocation?.lng) {
          bounds.extend([bus.currentLocation.lat, bus.currentLocation.lng]);
          hasValidLocations = true;
        }
      });
      
      if (hasValidLocations) {
        setMapBounds(bounds);
      }
      
      const moving = busesArray.filter(b => (b.currentLocation?.speed || 0) > 0).length;
      const speeds = busesArray
        .map(b => b.currentLocation?.speed || 0)
        .filter(s => s > 0);
      const avgSpeed = speeds.length > 0 
        ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length) 
        : 0;
      
      setStats({
        totalBuses: busesArray.length,
        movingBuses: moving,
        stoppedBuses: busesArray.length - moving,
        averageSpeed: avgSpeed,
        alerts: 0
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching buses:', error);
      toast.error('Failed to load bus data');
      setLoading(false);
    }
  }, []);

  const fetchGeofences = useCallback(async () => {
    try {
      const data = await transportService.getGeofences();
      setGeofences(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching geofences:', error);
    }
  }, []);

  const fetchStops = useCallback(async () => {
    const mockStops = [
      { id: 'STOP1', name: 'School Main Gate', lat: -1.2864, lng: 36.8172, type: 'school' },
      { id: 'STOP2', name: 'Westlands', lat: -1.2964, lng: 36.8272, type: 'stop' },
      { id: 'STOP3', name: 'Parklands', lat: -1.2764, lng: 36.8072, type: 'stop' },
      { id: 'STOP4', name: 'Ngara', lat: -1.2664, lng: 36.7972, type: 'stop' },
      { id: 'STOP5', name: 'Pangani', lat: -1.2564, lng: 36.7872, type: 'stop' }
    ];
    setStops(mockStops);
  }, []);

  const fetchRoutes = useCallback(async () => {
    const mockRoutes = [
      {
        id: 'ROUTE1',
        name: 'Route A - North',
        waypoints: [
          [-1.2864, 36.8172],
          [-1.2964, 36.8272],
          [-1.2764, 36.8072],
          [-1.2664, 36.7972],
          [-1.2564, 36.7872]
        ],
        color: '#2196F3'
      },
      {
        id: 'ROUTE2',
        name: 'Route B - East',
        waypoints: [
          [-1.2864, 36.8172],
          [-1.2764, 36.8272],
          [-1.2664, 36.8372],
          [-1.2564, 36.8472]
        ],
        color: '#4CAF50'
      }
    ];
    setRoutes(mockRoutes);
  }, []);

  // ==================== 3. HANDLER FUNCTIONS ====================

  const handleLiveGPSUpdate = useCallback((data) => {
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
            heading: data.heading,
            timestamp: data.timestamp
          },
          fuelLevel: data.fuelLevel
        };
        
        if (markersRef.current[updated[index]._id]) {
          const marker = markersRef.current[updated[index]._id];
          marker.setLatLng([data.lat, data.lon]);
          marker.setIcon(createBusIcon(updated[index].status, data.speed, data.heading));
        }
        
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
  }, []);

  const handleGeofenceAlert = useCallback((alert) => {
    setStats(prev => ({ ...prev, alerts: prev.alerts + 1 }));
    toast.warning(`🚨 Geofence alert: ${alert.message}`, {
      duration: 5000,
      icon: '📍',
      position: 'top-right'
    });
    
    if (markersRef.current[alert.vehicleId]) {
      const marker = markersRef.current[alert.vehicleId];
      if (marker?.getElement()) {
        marker.getElement().style.animation = 'flash 0.5s 3';
        setTimeout(() => {
          if (marker?.getElement()) {
            marker.getElement().style.animation = '';
          }
        }, 1500);
      }
    }
  }, []);

  const handleSpeedAlert = useCallback((alert) => {
    setStats(prev => ({ ...prev, alerts: prev.alerts + 1 }));
    toast.error(`🚨 Speed alert: ${alert.message}`, {
      duration: 5000,
      icon: '⚠️',
      position: 'top-right'
    });
  }, []);

  const handleBusStatusChange = useCallback((data) => {
    setBuses(prev => {
      const index = prev.findIndex(b => b._id === data.busId);
      if (index >= 0) {
        const updated = [...prev];
        updated[index].status = data.status;
        return updated;
      }
      return prev;
    });
  }, []);

  const flyToBus = useCallback((bus) => {
    if (!mapRef.current) {
      console.warn('Map not ready yet');
      return;
    }
    
    if (!bus?.currentLocation?.lat || !bus?.currentLocation?.lng) {
      console.warn('Bus location not available');
      return;
    }
    
    try {
      mapRef.current.flyTo(
        [bus.currentLocation.lat, bus.currentLocation.lng],
        16,
        { duration: 1.5 }
      );
    } catch (error) {
      console.error('Error flying to bus:', error);
      toast.error('Failed to focus on bus');
    }
  }, []);

  const handleBusClick = useCallback((bus) => {
    setSelectedBus(bus);
    if (onBusSelect) onBusSelect(bus);
    flyToBus(bus);
  }, [onBusSelect, flyToBus]);

  const centerMapOnAll = useCallback(() => {
    if (!mapRef.current) {
      console.warn('Map not ready yet');
      toast.error('Map is still loading');
      return;
    }
    
    if (!mapBounds) {
      console.warn('No bounds available');
      return;
    }
    
    try {
      const isValidBounds = () => {
        try {
          return mapBounds && 
                 typeof mapBounds.isValid === 'function' && 
                 mapBounds.isValid() && 
                 mapBounds.getNorth() !== -Infinity &&
                 mapBounds.getSouth() !== Infinity;
        } catch (error) {
          console.warn('Bounds validation error:', error);
          return false;
        }
      };
      
      if (!isValidBounds()) {
        console.warn('Invalid bounds, using default view');
        mapRef.current.setView(mapCenter, mapZoom);
        return;
      }
      
      mapRef.current.fitBounds(mapBounds, { 
        padding: [50, 50], 
        maxZoom: 15,
        animate: true,
        duration: 1
      });
      
    } catch (error) {
      console.error('Error centering map:', error);
      toast.error('Failed to center map');
      
      try {
        mapRef.current.setView(mapCenter, mapZoom);
      } catch (fallbackError) {
        console.error('Fallback view also failed:', fallbackError);
      }
    }
  }, [mapBounds, mapCenter, mapZoom]);

  const toggleLayer = useCallback((layer) => {
    setMapLayers(prev => ({
      ...prev,
      [layer]: !prev[layer]
    }));
  }, []);

  const handleMapCreated = useCallback((mapInstance) => {
    mapRef.current = mapInstance;
    
    setTimeout(() => {
      centerMapOnAll();
    }, 200);
  }, [centerMapOnAll]);

  // ==================== 4. ALL useEffect HOOKS ====================

  // Fetch initial data - only once
  useEffect(() => {
    if (!initialFetchDone.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchBuses();
      if (showGeofences) fetchGeofences();
      if (showStops) fetchStops();
      if (showRoutes) fetchRoutes();
      initialFetchDone.current = true;
    }
  }, [fetchBuses, fetchGeofences, fetchStops, fetchRoutes, showGeofences, showStops, showRoutes]);

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    socket.on('liveGPS', handleLiveGPSUpdate);
    socket.on('geofenceAlert', handleGeofenceAlert);
    socket.on('speedAlert', handleSpeedAlert);
    socket.on('busStatusChange', handleBusStatusChange);

    return () => {
      socket.off('liveGPS', handleLiveGPSUpdate);
      socket.off('geofenceAlert', handleGeofenceAlert);
      socket.off('speedAlert', handleSpeedAlert);
      socket.off('busStatusChange', handleBusStatusChange);
    };
  }, [socket, handleLiveGPSUpdate, handleGeofenceAlert, handleSpeedAlert, handleBusStatusChange]);

  // Handle selected bus from parent
  useEffect(() => {
    if (selectedBusId && buses.length > 0) {
      const bus = buses.find(b => b._id === selectedBusId || b.busNumber === selectedBusId);
      if (bus && bus._id !== selectedBus?._id) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedBus(bus);
        flyToBus(bus);
      }
    }
  }, [selectedBusId, buses, flyToBus, selectedBus]);

  // ==================== 5. RENDER LOGIC ====================

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
        <p style={{ marginLeft: '10px' }}>Loading map data...</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height }}>
      {/* Map Controls Overlay */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        background: 'white',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
        minWidth: '250px',
        maxWidth: '300px'
      }}>
        <div style={{ 
          marginBottom: '15px',
          paddingBottom: '10px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <strong>Live GPS Tracking</strong>
          <span style={{
            background: isConnected ? '#4CAF50' : '#f44336',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '10px'
          }}>
            {isConnected ? '🟢 LIVE' : '🔴 OFFLINE'}
          </span>
        </div>

        {/* Live Stats */}
        <div style={{ marginBottom: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
            <span>Total Buses:</span>
            <strong>{stats.totalBuses}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
            <span>🚗 Moving:</span>
            <strong style={{ color: '#4CAF50' }}>{stats.movingBuses}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
            <span>⏱️ Stopped:</span>
            <strong style={{ color: '#FF9800' }}>{stats.stoppedBuses}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
            <span>📊 Avg Speed:</span>
            <strong>{stats.averageSpeed} km/h</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span>⚠️ Alerts:</span>
            <strong style={{ color: stats.alerts > 0 ? '#f44336' : '#666' }}>{stats.alerts}</strong>
          </div>
        </div>

        {/* Layer Controls */}
        <div style={{ marginBottom: '15px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '8px' }}>Map Layers:</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => toggleLayer('satellite')}
              style={{
                padding: '6px 12px',
                background: mapLayers.satellite ? '#2196F3' : '#f0f0f0',
                color: mapLayers.satellite ? 'white' : '#333',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              🛰️ Satellite
            </button>
            <button
              onClick={() => toggleLayer('traffic')}
              style={{
                padding: '6px 12px',
                background: mapLayers.traffic ? '#2196F3' : '#f0f0f0',
                color: mapLayers.traffic ? 'white' : '#333',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              🚦 Traffic
            </button>
            <button
              onClick={() => toggleLayer('heatmap')}
              style={{
                padding: '6px 12px',
                background: mapLayers.heatmap ? '#2196F3' : '#f0f0f0',
                color: mapLayers.heatmap ? 'white' : '#333',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              🔥 Heatmap
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={centerMapOnAll}
            style={{
              flex: 1,
              padding: '8px',
              background: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            🔍 Fit All
          </button>
          <button
            onClick={() => {
              setSelectedBus(null);
              centerMapOnAll();
            }}
            style={{
              flex: 1,
              padding: '8px',
              background: '#f5f5f5',
              color: '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            🗺️ Reset
          </button>
        </div>

        {/* Selected Bus Info */}
        {selectedBus && (
          <div style={{
            marginTop: '15px',
            padding: '10px',
            background: '#e3f2fd',
            borderRadius: '6px'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
              Selected: {selectedBus.busNumber}
            </div>
            <div style={{ fontSize: '12px' }}>
              <div>Driver: {selectedBus.driverName || 'N/A'}</div>
              <div>Speed: {selectedBus.currentLocation?.speed || 0} km/h</div>
              <div>Status: <span style={{
                background: selectedBus.status === 'active' ? '#4CAF50' : '#FF9800',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '10px'
              }}>{selectedBus.status}</span></div>
              <div>Last update: {formatTime(selectedBus.currentLocation?.timestamp)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Map */}
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%', borderRadius: '8px' }}
        whenCreated={handleMapCreated}
      >
        {/* Base Layer */}
        <TileLayer
          url={mapLayers.satellite 
            ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          }
          attribution={mapLayers.satellite
            ? '&copy; <a href="https://www.esri.com/">Esri</a>'
            : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          }
        />

        {/* Traffic Layer (if enabled) */}
        {mapLayers.traffic && (
          <TileLayer
            url="https://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.thunderforest.com/">Thunderforest</a>'
          />
        )}

        {/* Routes */}
        {showRoutes && routes.map(route => (
          <Polyline
            key={route.id}
            positions={route.waypoints}
            color={route.color}
            weight={4}
            opacity={0.7}
          >
            <Popup>
              <strong>{route.name}</strong>
            </Popup>
          </Polyline>
        ))}

        {/* Geofences */}
        {showGeofences && geofences.map(geofence => (
          geofence.type === 'circle' ? (
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
                <strong>{geofence.routeName}</strong><br/>
                Radius: {geofence.radiusMeters}m
              </Popup>
            </Circle>
          ) : geofence.type === 'polygon' && (
            <Polyline
              key={geofence._id}
              positions={[...geofence.polygonPoints.map(p => [p.lat, p.lon]), [geofence.polygonPoints[0]?.lat, geofence.polygonPoints[0]?.lon]]}
              pathOptions={{
                color: '#2196F3',
                weight: 2,
                fillColor: '#2196F3',
                fillOpacity: 0.1
              }}
            >
              <Popup>
                <strong>{geofence.routeName}</strong><br/>
                Polygon Geofence
              </Popup>
            </Polyline>
          )
        ))}

        {/* Stops */}
        {showStops && stops.map(stop => (
          <Marker
            key={stop.id}
            position={[stop.lat, stop.lng]}
            icon={stopIcon}
          >
            <Popup>
              <strong>{stop.name}</strong><br/>
              {stop.type === 'school' ? '🏫 School' : '🚏 Bus Stop'}
            </Popup>
          </Marker>
        ))}

        {/* Bus Markers */}
        {buses.map(bus => (
          <Marker
            key={bus._id}
            position={[
              bus.currentLocation?.lat || mapCenter[0],
              bus.currentLocation?.lng || mapCenter[1]
            ]}
            icon={createBusIcon(
              bus.status,
              bus.currentLocation?.speed || 0,
              bus.currentLocation?.heading || 0
            )}
            eventHandlers={{
              click: () => handleBusClick(bus),
              mouseover: (e) => {
                e.target.openPopup();
              },
              mouseout: (e) => {
                e.target.closePopup();
              }
            }}
            ref={ref => {
              if (ref) {
                markersRef.current[bus._id] = ref;
              }
            }}
          >
            <Popup>
              <div style={{ minWidth: '200px' }}>
                <div style={{
                  background: bus.status === 'active' ? '#4CAF50' : '#FF9800',
                  color: 'white',
                  padding: '8px',
                  margin: '-12px -12px 10px -12px',
                  borderRadius: '8px 8px 0 0',
                  fontWeight: 'bold'
                }}>
                  Bus {bus.busNumber}
                </div>
                
                <div style={{ padding: '5px 0' }}>
                  <p style={{ margin: '5px 0' }}>
                    <strong>Driver:</strong> {bus.driverName || 'N/A'}
                  </p>
                  <p style={{ margin: '5px 0' }}>
                    <strong>Route:</strong> {bus.route || 'N/A'}
                  </p>
                  <p style={{ margin: '5px 0' }}>
                    <strong>Speed:</strong> {bus.currentLocation?.speed || 0} km/h
                  </p>
                  <p style={{ margin: '5px 0' }}>
                    <strong>Status:</strong> 
                    <span style={{
                      background: bus.status === 'active' ? '#4CAF50' : '#FF9800',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      marginLeft: '5px',
                      fontSize: '11px'
                    }}>
                      {bus.status}
                    </span>
                  </p>
                  <p style={{ margin: '5px 0' }}>
                    <strong>Fuel:</strong> {bus.fuelLevel || 100}%
                  </p>
                  <p style={{ margin: '5px 0', fontSize: '11px', color: '#666' }}>
                    Last update: {formatTime(bus.currentLocation?.timestamp)}
                  </p>
                </div>

                <div style={{
                  borderTop: '1px solid #eee',
                  paddingTop: '10px',
                  marginTop: '5px',
                  display: 'flex',
                  gap: '5px'
                }}>
                  <button
                    onClick={() => flyToBus(bus)}
                    style={{
                      flex: 1,
                      padding: '6px',
                      background: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px'
                    }}
                  >
                    👁️ Focus
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`Bus: ${bus.busNumber}, Location: ${bus.currentLocation?.lat}, ${bus.currentLocation?.lng}`);
                      toast.success('Location copied');
                    }}
                    style={{
                      flex: 1,
                      padding: '6px',
                      background: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px'
                    }}
                  >
                    📋 Copy
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Live location updater for selected bus */}
        {selectedBus && (
          <LiveLocationUpdater
            busId={selectedBus._id}
            onLocationUpdate={handleLiveGPSUpdate}
          />
        )}

        {/* Auto-fit bounds */}
        <FitBounds bounds={mapBounds} />
      </MapContainer>

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes busMove {
          from { transform: translateY(0); }
          to { transform: translateY(-3px); }
        }
        @keyframes flash {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
          100% { opacity: 1; transform: scale(1); }
        }
        .bus-marker-active {
          filter: drop-shadow(0 4px 6px rgba(76, 175, 80, 0.3));
        }
        .bus-marker-inactive {
          filter: drop-shadow(0 4px 6px rgba(244, 67, 54, 0.3));
        }
      `}</style>
    </div>
  );
}