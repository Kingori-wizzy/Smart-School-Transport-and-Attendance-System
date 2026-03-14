/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
 
import { useState, useEffect } from 'react';
import { transportService } from '../../services/transport';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import { routeService } from '../../services/route'; // We'll create this

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

  if (!waypoints || waypoints.length === 0) {
    return (
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
    );
  }

  return (
    <>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {waypoints.map((point, index) => (
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
      {waypoints.length > 1 && (
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
    assignedBuses: []
  });

  // Nairobi coordinates as default center
  const defaultCenter = [-1.2864, 36.8172];

  useEffect(() => {
    fetchRoutes();
    fetchBuses();
  }, []);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      // Try to fetch real routes from API
      const response = await fetch('http://localhost:5000/api/routes', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      
      if (data.success && data.data) {
        // Transform API data to match component format
        const formattedRoutes = data.data.map(route => ({
          id: route._id,
          _id: route._id,
          name: route.name || 'Unnamed Route',
          description: route.description || '',
          startPoint: route.startPoint || route.stops?.[0]?.name || 'School',
          endPoint: route.endPoint || route.stops?.[route.stops.length - 1]?.name || 'Destination',
          distance: route.distance || 0,
          duration: route.duration || 0,
          stops: route.stops?.length || 0,
          status: route.status || 'active',
          assignedBuses: route.assignedBuses || [],
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
        // Fallback to empty array if no data
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
      const data = await transportService.getBuses();
      setBuses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching buses:', error);
    }
  };

  const handleViewOnMap = (route) => {
    setSelectedRoute(route);
    if (route.waypoints && route.waypoints.length > 0) {
      setWaypoints(route.waypoints);
    } else {
      // If no waypoints, show default
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
    try {
      const routeData = {
        name: formData.name,
        description: formData.description,
        startPoint: formData.startPoint,
        endPoint: formData.endPoint,
        distance: parseFloat(formData.distance) || 0,
        duration: parseInt(formData.duration) || 0,
        stops: formData.stops ? parseInt(formData.stops) : 0,
        status: formData.status,
        assignedBuses: formData.assignedBuses
      };

      if (editingRoute) {
        // Update existing route
        await routeService.updateRoute(editingRoute._id, routeData);
        toast.success('Route updated successfully');
      } else {
        // Create new route
        await routeService.createRoute(routeData);
        toast.success('Route created successfully');
      }
      
      setShowForm(false);
      setEditingRoute(null);
      resetForm();
      fetchRoutes();
    } catch (error) {
      console.error('Error saving route:', error);
      toast.error('Failed to save route');
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
      assignedBuses: []
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
      assignedBuses: route.assignedBuses || []
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this route?')) return;
    try {
      await routeService.deleteRoute(id);
      toast.success('Route deleted successfully');
      fetchRoutes();
      
      // Clear map if deleted route was selected
      if (selectedRoute?._id === id) {
        setSelectedRoute(null);
        setWaypoints([]);
      }
    } catch (error) {
      console.error('Error deleting route:', error);
      toast.error('Failed to delete route');
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
          background: 'white',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#666' }}>Total Routes</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{routes.length}</div>
        </div>
        <div style={{
          background: 'white',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#666' }}>Active Routes</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4CAF50' }}>
            {routes.filter(r => r.status === 'active').length}
          </div>
        </div>
        <div style={{
          background: 'white',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#666' }}>Total Stops</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {routes.reduce((sum, r) => sum + (r.stops || 0), 0)}
          </div>
        </div>
        <div style={{
          background: 'white',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#666' }}>Total Distance</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {routes.reduce((sum, r) => sum + (r.distance || 0), 0)} km
          </div>
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
              transition: 'transform 0.2s',
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
                marginBottom: '15px',
                padding: '8px',
                background: '#f5f5f5',
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                <strong>Assigned Buses:</strong> {route.assignedBuses.join(', ')}
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
                  background: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
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
                  cursor: 'pointer'
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
            padding: '40px',
            background: 'white',
            borderRadius: '8px'
          }}>
            <p style={{ color: '#666' }}>No routes found. Click "Create New Route" to get started.</p>
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
            width: '500px',
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
                  style={{
                    width: '100%',
                    padding: '8px',
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
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Start Point
                </label>
                <input
                  type="text"
                  name="startPoint"
                  value={formData.startPoint}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  End Point
                </label>
                <input
                  type="text"
                  name="endPoint"
                  value={formData.endPoint}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ marginBottom: '15px' }}>
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
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Duration (min)
                  </label>
                  <input
                    type="number"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    min="0"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Number of Stops
                </label>
                <input
                  type="number"
                  name="stops"
                  value={formData.stops}
                  onChange={handleInputChange}
                  min="0"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                >
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
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
                    padding: '10px',
                    background: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
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