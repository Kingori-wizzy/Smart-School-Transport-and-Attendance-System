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

function RouteMap({ waypoints }) {
  const map = useMap();
  
  useEffect(() => {
    if (waypoints && waypoints.length > 0) {
      try {
        const bounds = L.latLngBounds(waypoints.map(w => [w.lat, w.lng]));
        map.fitBounds(bounds, { padding: [50, 50] });
      } catch (error) {
        console.error('Error fitting bounds:', error);
      }
    }
  }, [waypoints, map]);

  return (
    <>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {waypoints && waypoints.map((point, index) => (
        <Marker key={index} position={[point.lat, point.lng]}>
          <Popup>
            <b>{point.name || `Stop ${index + 1}`}</b>
            <br />
            {point.address || 'N/A'}
            <br />
            <small>ETA: {point.eta || 'N/A'}</small>
          </Popup>
        </Marker>
      ))}
      {waypoints && waypoints.length > 1 && (
        <Polyline
          positions={waypoints.map(w => [w.lat, w.lng])}
          color="#2196F3"
          weight={4}
          opacity={0.7}
        />
      )}
    </>
  );
}

export default function RoutePlanner() {
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [waypoints, setWaypoints] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [loading, setLoading] = useState(true);
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
  const defaultCenter = [-1.2864, 36.8172];

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
        const formattedRoutes = data.data.map(route => ({
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
          waypoints: route.stops?.map(stop => ({
            lat: stop.coordinates?.lat || stop.lat || defaultCenter[0],
            lng: stop.coordinates?.lng || stop.lng || defaultCenter[1],
            name: stop.name,
            address: stop.address || '',
            eta: stop.eta || ''
          })) || []
        }));
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
    if (route.waypoints && route.waypoints.length > 0) {
      setWaypoints(route.waypoints);
    } else {
      setWaypoints([
        { lat: defaultCenter[0], lng: defaultCenter[1], name: route.startPoint || 'Start Point' },
        { lat: defaultCenter[0] + 0.01, lng: defaultCenter[1] + 0.01, name: route.endPoint || 'End Point' }
      ]);
    }
    toast.success(`Viewing ${route.name} on map`);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
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
        stops: []
      };
      
      // Add start point as first stop if provided
      if (formData.startPoint) {
        routeData.stops.push({
          name: formData.startPoint,
          order: 0,
          coordinates: { lat: defaultCenter[0], lng: defaultCenter[1] }
        });
      }
      
      // Add end point as last stop if provided and different from start
      if (formData.endPoint && formData.endPoint !== formData.startPoint) {
        routeData.stops.push({
          name: formData.endPoint,
          order: 1,
          coordinates: { lat: defaultCenter[0] + 0.01, lng: defaultCenter[1] + 0.01 }
        });
      }
      
      // Add additional stops if specified
      if (formData.stops > 2) {
        for (let i = 2; i < formData.stops; i++) {
          routeData.stops.push({
            name: `Stop ${i + 1}`,
            order: i,
            coordinates: { 
              lat: defaultCenter[0] + (i * 0.005), 
              lng: defaultCenter[1] + (i * 0.005) 
            }
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
        <h3 style={{ margin: 0 }}>Route Planner</h3>
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
        height: '400px',
        marginBottom: '20px',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <MapContainer
          center={defaultCenter}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
        >
          <RouteMap waypoints={waypoints} />
        </MapContainer>
      </div>

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
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#white' }}>
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
                boxShadow: '0 4px 8px rgba(33, 150, 243, 0.3)',
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

            {route.assignedBuses && route.assignedBuses.length > 0 && (
              <div style={{
                marginBottom: '10px',
                padding: '8px',
                background: '#e3f2fd',
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                🚌 Assigned Buses: {route.assignedBuses.join(', ')}
              </div>
            )}

            {route.assignedDriver && (
              <div style={{
                marginBottom: '15px',
                padding: '8px',
                background: '#e8f5e9',
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                👤 Assigned Driver: {route.assignedDriver}
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: '10px',
              borderTop: '1px solid #eee',
              paddingTop: '15px'
            }}>
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
                  flex: 0.5,
                  padding: '8px',
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
              {editingRoute ? 'Edit Route' : 'Create New Route'}
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