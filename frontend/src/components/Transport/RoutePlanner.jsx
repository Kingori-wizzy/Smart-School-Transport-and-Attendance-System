/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
 
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom bus icon
const busIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom school icon
const schoolIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function RouteMap({ waypoints, centerOnRoute = true }) {
  const map = useMap();
  
  useEffect(() => {
    if (waypoints && waypoints.length > 0 && centerOnRoute) {
      try {
        const validWaypoints = waypoints.filter(w => w && typeof w.lat === 'number' && typeof w.lng === 'number');
        if (validWaypoints.length > 0) {
          const bounds = L.latLngBounds(validWaypoints.map(w => [w.lat, w.lng]));
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      } catch (error) {
        console.error('Error fitting bounds:', error);
      }
    }
  }, [waypoints, map, centerOnRoute]);

  return (
    <>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {waypoints && waypoints.map((point, index) => (
        <Marker 
          key={index} 
          position={[point.lat, point.lng]}
          icon={index === 0 ? schoolIcon : (index === waypoints.length - 1 ? busIcon : undefined)}
        >
          <Popup>
            <div style={{ minWidth: '150px' }}>
              <b>{point.name || `Stop ${index + 1}`}</b>
              <br />
              {point.address && <><small>{point.address}</small><br /></>}
              {point.eta && <small>⏱️ ETA: {point.eta}</small>}
              {point.arrivalTime && <small>🚌 Arrival: {point.arrivalTime}</small>}
              {point.departureTime && <small>🚪 Departure: {point.departureTime}</small>}
            </div>
          </Popup>
        </Marker>
      ))}
      {waypoints && waypoints.length > 1 && (
        <Polyline
          positions={waypoints.filter(w => w && typeof w.lat === 'number').map(w => [w.lat, w.lng])}
          color="#2196F3"
          weight={4}
          opacity={0.8}
          dashArray="10, 10"
        />
      )}
    </>
  );
}

// Component to handle map recentering
function MapController({ center, zoom }) {
  const map = useMap();
  
  useEffect(() => {
    if (center && center.lat && center.lng) {
      map.setView([center.lat, center.lng], zoom || 13);
    }
  }, [center, zoom, map]);
  
  return null;
}

export default function RoutePlanner({ selectedRoute: externalSelectedRoute, onRouteSelect }) {
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [waypoints, setWaypoints] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState({ lat: -1.2864, lng: 36.8172 });
  const [mapZoom, setMapZoom] = useState(12);
  const [showRouteDetails, setShowRouteDetails] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startPoint: '',
    endPoint: '',
    distance: 0,
    duration: 0,
    stops: 0,
    status: 'active',
    assignedBuses: [],
    assignedDriver: ''
  });

  // Nairobi coordinates as default center
  const defaultCenter = { lat: -1.2864, lng: 36.8172 };

  // Sync with external selected route if provided
  useEffect(() => {
    if (externalSelectedRoute && externalSelectedRoute !== selectedRoute) {
      handleViewOnMap(externalSelectedRoute);
    }
  }, [externalSelectedRoute]);

  useEffect(() => {
    fetchRoutes();
    fetchBuses();
    fetchDrivers();
  }, []);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/routes', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      
      if (data.success && data.data) {
        const formattedRoutes = data.data.map(route => {
          // Parse waypoints from stops
          let routeWaypoints = [];
          if (route.stops && route.stops.length > 0) {
            routeWaypoints = route.stops.map((stop, idx) => ({
              lat: stop.coordinates?.lat || stop.lat || defaultCenter.lat + (idx * 0.002),
              lng: stop.coordinates?.lng || stop.lng || defaultCenter.lng + (idx * 0.002),
              name: stop.name,
              address: stop.address || '',
              eta: stop.eta || '',
              arrivalTime: stop.arrivalTime || '',
              departureTime: stop.departureTime || ''
            }));
          }
          
          return {
            id: route._id,
            _id: route._id,
            name: route.name || 'Unnamed Route',
            description: route.description || '',
            startPoint: route.startPoint || route.stops?.[0]?.name || 'School',
            endPoint: route.endPoint || route.stops?.[route.stops.length - 1]?.name || 'Destination',
            distance: route.distance || 0,
            duration: route.estimatedDuration || route.duration || 0,
            stops: route.stops?.length || 0,
            status: route.active !== false ? 'active' : 'inactive',
            assignedBuses: route.assignedBuses || (route.busId ? [route.busId] : []),
            assignedDriver: route.assignedDriver || '',
            waypoints: routeWaypoints,
            routeData: route
          };
        });
        setRoutes(formattedRoutes);
      } else {
        setRoutes([]);
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
      toast.error('Failed to fetch routes');
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBuses = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/buses', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setBuses(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching buses:', error);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/users?role=driver', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        const formattedDrivers = (data.data || []).map(d => ({
          id: d._id,
          name: `${d.firstName || ''} ${d.lastName || ''}`.trim(),
          phone: d.phone || '',
          email: d.email || ''
        }));
        setDrivers(formattedDrivers);
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };

  const handleViewOnMap = (route) => {
    setSelectedRoute(route);
    setShowRouteDetails(true);
    
    if (route.waypoints && route.waypoints.length > 0) {
      setWaypoints(route.waypoints);
      // Center on first waypoint or calculate bounds
      if (route.waypoints[0]) {
        setMapCenter({ lat: route.waypoints[0].lat, lng: route.waypoints[0].lng });
      }
    } else {
      // Create default waypoints if none exist
      const defaultWaypoints = [
        { 
          lat: defaultCenter.lat, 
          lng: defaultCenter.lng, 
          name: route.startPoint || 'Start Point',
          address: 'School Location'
        },
        { 
          lat: defaultCenter.lat + 0.01, 
          lng: defaultCenter.lng + 0.01, 
          name: route.endPoint || 'End Point',
          address: 'Destination'
        }
      ];
      setWaypoints(defaultWaypoints);
      setMapCenter(defaultCenter);
    }
    
    setMapZoom(13);
    toast.success(`📍 Viewing ${route.name} on map`);
    
    // Callback to parent if provided
    if (onRouteSelect) {
      onRouteSelect(route);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error('Route name is required');
      return;
    }

    try {
      const routeData = {
        name: formData.name,
        description: formData.description,
        distance: parseFloat(formData.distance) || 0,
        estimatedDuration: parseInt(formData.duration) || 0,
        active: formData.status === 'active',
        startPoint: formData.startPoint || 'School',
        endPoint: formData.endPoint || 'Destination',
        stops: []
      };
      
      // Add start point as first stop
      routeData.stops.push({
        name: formData.startPoint || 'School',
        order: 0,
        coordinates: { lat: defaultCenter.lat, lng: defaultCenter.lng },
        address: formData.startPoint || 'School Location'
      });
      
      // Add end point as last stop
      if (formData.endPoint && formData.endPoint !== formData.startPoint) {
        routeData.stops.push({
          name: formData.endPoint,
          order: 1,
          coordinates: { lat: defaultCenter.lat + 0.01, lng: defaultCenter.lng + 0.01 },
          address: formData.endPoint
        });
      }
      
      // Add additional stops if specified
      const additionalStops = parseInt(formData.stops) || 0;
      if (additionalStops > 2) {
        for (let i = 2; i < additionalStops; i++) {
          routeData.stops.push({
            name: `Stop ${i + 1}`,
            order: i,
            coordinates: { 
              lat: defaultCenter.lat + (i * 0.003), 
              lng: defaultCenter.lng + (i * 0.003) 
            },
            address: `Stop ${i + 1}`
          });
        }
      }

      const url = editingRoute 
        ? `http://localhost:5000/api/routes/${editingRoute._id}`
        : 'http://localhost:5000/api/routes';
      const method = editingRoute ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(routeData)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to save route');
      }
      
      toast.success(editingRoute ? 'Route updated successfully' : 'Route created successfully');
      setShowForm(false);
      setEditingRoute(null);
      resetForm();
      fetchRoutes();
    } catch (error) {
      console.error('Error saving route:', error);
      toast.error(error.message || 'Failed to save route');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      startPoint: '',
      endPoint: '',
      distance: 0,
      duration: 0,
      stops: 0,
      status: 'active',
      assignedBuses: [],
      assignedDriver: ''
    });
  };

  const handleEdit = (route) => {
    setEditingRoute(route);
    setFormData({
      name: route.name || '',
      description: route.description || '',
      startPoint: route.startPoint || '',
      endPoint: route.endPoint || '',
      distance: route.distance || 0,
      duration: route.duration || 0,
      stops: route.stops || 0,
      status: route.status || 'active',
      assignedBuses: route.assignedBuses || [],
      assignedDriver: route.assignedDriver || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this route? This action cannot be undone.')) return;
    try {
      const response = await fetch(`http://localhost:5000/api/routes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete route');
      }
      
      toast.success('Route deleted successfully');
      fetchRoutes();
      
      if (selectedRoute?._id === id) {
        setSelectedRoute(null);
        setWaypoints([]);
        setShowRouteDetails(false);
      }
    } catch (error) {
      console.error('Error deleting route:', error);
      toast.error(error.message || 'Failed to delete route');
    }
  };

  const handleAssignDriver = async (routeId, driverId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/routes/${routeId}/assign-driver`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ driverId })
      });
      
      if (!response.ok) throw new Error('Failed to assign driver');
      
      toast.success('Driver assigned successfully');
      fetchRoutes();
    } catch (error) {
      console.error('Error assigning driver:', error);
      toast.error('Failed to assign driver');
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return '#4CAF50';
      case 'maintenance': return '#FF9800';
      case 'inactive': return '#f44336';
      default: return '#999';
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div className="loading-spinner" style={{ margin: '0 auto' }} />
        <p style={{ marginTop: '10px', color: '#666' }}>Loading routes...</p>
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
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div>
          <h3 style={{ margin: 0 }}>🗺️ Route Planner</h3>
          {selectedRoute && (
            <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
              Currently viewing: <strong>{selectedRoute.name}</strong>
            </p>
          )}
        </div>
        <button
          onClick={() => {
            setEditingRoute(null);
            resetForm();
            setShowForm(true);
          }}
          style={{
            padding: '10px 20px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          ➕ Create New Route
        </button>
      </div>

      {/* Map View */}
      <div style={{
        height: '450px',
        marginBottom: '20px',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        position: 'relative'
      }}>
        <MapContainer
          center={[mapCenter.lat, mapCenter.lng]}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          key={`${mapCenter.lat}-${mapCenter.lng}-${mapZoom}`}
        >
          <RouteMap waypoints={waypoints} centerOnRoute={!!selectedRoute} />
          <MapController center={mapCenter} zoom={mapZoom} />
        </MapContainer>
        
        {/* Map Controls Overlay */}
        <div style={{
          position: 'absolute',
          bottom: '10px',
          right: '10px',
          background: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          fontSize: '12px',
          zIndex: 1000
        }}>
          🚌 {waypoints.length} stops | 📍 Click markers for details
        </div>
      </div>

      {/* Selected Route Details */}
      {showRouteDetails && selectedRoute && (
        <div style={{
          background: '#e3f2fd',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          borderLeft: `4px solid ${getStatusColor(selectedRoute.status)}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <strong style={{ fontSize: '16px' }}>{selectedRoute.name}</strong>
              <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#555' }}>
                {selectedRoute.description || 'No description'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => handleEdit(selectedRoute)}
                style={{
                  padding: '6px 12px',
                  background: '#FF9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                ✏️ Edit Route
              </button>
              <button
                onClick={() => setShowRouteDetails(false)}
                style={{
                  padding: '6px 12px',
                  background: '#999',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Hide Details
              </button>
            </div>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '10px',
            marginTop: '10px',
            fontSize: '13px'
          }}>
            <div>📍 From: {selectedRoute.startPoint}</div>
            <div>🏁 To: {selectedRoute.endPoint}</div>
            <div>📏 Distance: {selectedRoute.distance} km</div>
            <div>⏱️ Duration: {selectedRoute.duration} min</div>
            <div>🛑 Stops: {selectedRoute.stops}</div>
            <div>📊 Status: <span style={{ color: getStatusColor(selectedRoute.status) }}>{selectedRoute.status}</span></div>
          </div>
        </div>
      )}

      {/* Route Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '15px',
        marginBottom: '20px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{routes.length}</div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>Total Routes</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)',
          color: 'white',
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {routes.filter(r => r.status === 'active').length}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>Active Routes</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          color: 'white',
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {routes.reduce((sum, r) => sum + (r.stops || 0), 0)}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>Total Stops</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #5f2c82 0%, #49a09d 100%)',
          color: 'white',
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {routes.reduce((sum, r) => sum + (r.distance || 0), 0)} km
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>Total Distance</div>
        </div>
      </div>

      {/* Routes List */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: '20px'
      }}>
        {routes.length > 0 ? routes.map(route => (
          <div
            key={route.id}
            style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              borderLeft: `4px solid ${getStatusColor(route.status)}`,
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              ...(selectedRoute?._id === route._id ? {
                boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)',
                transform: 'scale(1.02)'
              } : {})
            }}
            onClick={() => handleViewOnMap(route)}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px'
            }}>
              <h4 style={{ margin: 0, color: '#2196F3' }}>{route.name}</h4>
              <span style={{
                background: getStatusColor(route.status),
                color: 'white',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '12px'
              }}>
                {route.status}
              </span>
            </div>

            <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
              {route.description || 'No description'}
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              marginBottom: '15px',
              fontSize: '13px'
            }}>
              <div>
                <span style={{ color: '#666' }}>🔄 From:</span> {route.startPoint}
              </div>
              <div>
                <span style={{ color: '#666' }}>📍 To:</span> {route.endPoint}
              </div>
              <div>
                <span style={{ color: '#666' }}>📏 Distance:</span> {route.distance} km
              </div>
              <div>
                <span style={{ color: '#666' }}>⏱️ Duration:</span> {route.duration} min
              </div>
              <div>
                <span style={{ color: '#666' }}>🛑 Stops:</span> {route.stops}
              </div>
              <div>
                <span style={{ color: '#666' }}>🚌 Buses:</span> {route.assignedBuses?.length || 0}
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '10px',
              borderTop: '1px solid #eee',
              paddingTop: '15px'
            }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewOnMap(route);
                }}
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
                🗺️ View Map
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(route);
                }}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: '#FF9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                ✏️ Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(route.id);
                }}
                style={{
                  padding: '8px 12px',
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                🗑️
              </button>
            </div>
          </div>
        )) : (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '60px',
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
            <h3 style={{ marginBottom: '8px' }}>No routes found</h3>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Get started by creating your first route.
            </p>
            <button
              onClick={() => {
                setEditingRoute(null);
                resetForm();
                setShowForm(true);
              }}
              style={{
                padding: '10px 24px',
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ➕ Create New Route
            </button>
          </div>
        )}
      </div>

      {/* Route Form Modal */}
      {showForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          overflowY: 'auto'
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '8px',
            width: '550px',
            maxWidth: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 20px 0' }}>
              {editingRoute ? '✏️ Edit Route' : '➕ Create New Route'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Route Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., North Route, South Route"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Route description, landmarks, etc."
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Start Point
                  </label>
                  <input
                    type="text"
                    name="startPoint"
                    value={formData.startPoint}
                    onChange={handleInputChange}
                    placeholder="School, Gate, etc."
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    End Point
                  </label>
                  <input
                    type="text"
                    name="endPoint"
                    value={formData.endPoint}
                    onChange={handleInputChange}
                    placeholder="Final stop"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Distance (km)
                  </label>
                  <input
                    type="number"
                    name="distance"
                    value={formData.distance}
                    onChange={handleInputChange}
                    step="0.1"
                    min="0"
                    placeholder="0.0"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Duration (min)
                  </label>
                  <input
                    type="number"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    min="0"
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Number of Stops
                  </label>
                  <input
                    type="number"
                    name="stops"
                    value={formData.stops}
                    onChange={handleInputChange}
                    min="2"
                    placeholder="2"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                  <small style={{ color: '#666', fontSize: '11px' }}>Minimum 2 stops (start and end)</small>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  {editingRoute ? 'Update Route' : 'Create Route'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingRoute(null);
                    resetForm();
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}