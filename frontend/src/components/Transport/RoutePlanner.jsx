import { useState, useEffect } from 'react';
import { transportService } from '../../services/transport';
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

function RouteMap({ waypoints, center }) {
  const map = useMap();
  
  useEffect(() => {
    if (waypoints.length > 0) {
      const bounds = L.latLngBounds(waypoints.map(w => [w.lat, w.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [waypoints, map]);

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
            {point.address}
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
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [waypoints, setWaypoints] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startPoint: '',
    endPoint: '',
    distance: 0,
    duration: 0,
    stops: [],
    status: 'active',
    assignedBuses: []
  });

  // Mock waypoints for demo
  const mockWaypoints = [
    { lat: -1.2864, lng: 36.8172, name: 'School Main Gate', address: 'KCA University', eta: '07:00' },
    { lat: -1.2964, lng: 36.8272, name: 'Stop 1 - Westlands', address: 'Westlands Shopping Center', eta: '07:15' },
    { lat: -1.2764, lng: 36.8072, name: 'Stop 2 - Parklands', address: 'Parklands Baptist Church', eta: '07:30' },
    { lat: -1.2664, lng: 36.7972, name: 'Stop 3 - Ngara', address: 'Ngara Roundabout', eta: '07:45' },
    { lat: -1.2564, lng: 36.7872, name: 'Stop 4 - Pangani', address: 'Pangani Shopping Center', eta: '08:00' }
  ];

  useEffect(() => {
    fetchRoutes();
    setWaypoints(mockWaypoints);
  }, []);

  const fetchRoutes = async () => {
    // Mock routes data
    const mockRoutes = [
      {
        id: 'R001',
        name: 'Route A - North',
        description: 'Serving Westlands, Parklands, Ngara areas',
        startPoint: 'School',
        endPoint: 'Pangani',
        distance: 12.5,
        duration: 45,
        stops: 4,
        status: 'active',
        assignedBuses: ['BUS001', 'BUS002']
      },
      {
        id: 'R002',
        name: 'Route B - East',
        description: 'Serving Buruburu, Donholm, Fedha estates',
        startPoint: 'School',
        endPoint: 'Fedha',
        distance: 15.2,
        duration: 50,
        stops: 5,
        status: 'active',
        assignedBuses: ['BUS003']
      },
      {
        id: 'R003',
        name: 'Route C - South',
        description: 'Serving Langata, South B, South C',
        startPoint: 'School',
        endPoint: 'Langata',
        distance: 18.0,
        duration: 60,
        stops: 6,
        status: 'maintenance',
        assignedBuses: []
      }
    ];
    setRoutes(mockRoutes);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    toast.success(editingRoute ? 'Route updated successfully' : 'Route created successfully');
    setShowForm(false);
    setEditingRoute(null);
    fetchRoutes();
  };

  const handleEdit = (route) => {
    setEditingRoute(route);
    setFormData({
      name: route.name,
      description: route.description,
      startPoint: route.startPoint,
      endPoint: route.endPoint,
      distance: route.distance,
      duration: route.duration,
      stops: route.stops,
      status: route.status,
      assignedBuses: route.assignedBuses
    });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this route?')) {
      toast.success('Route deleted successfully');
      fetchRoutes();
    }
  };

  const handleViewOnMap = (route) => {
    setSelectedRoute(route);
  };

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
            setFormData({
              name: '',
              description: '',
              startPoint: '',
              endPoint: '',
              distance: 0,
              duration: 0,
              stops: [],
              status: 'active',
              assignedBuses: []
            });
            setShowForm(true);
          }}
          style={{
            padding: '10px 20px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
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
          center={[-1.2864, 36.8172]}
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
        {routes.map(route => (
          <div
            key={route.id}
            style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              borderLeft: `4px solid ${route.status === 'active' ? '#4CAF50' : '#FF9800'}`
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px'
            }}>
              <h4 style={{ margin: 0, color: '#2196F3' }}>{route.name}</h4>
              <span style={{
                background: route.status === 'active' ? '#4CAF50' : '#FF9800',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '12px'
              }}>
                {route.status}
              </span>
            </div>

            <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
              {route.description}
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
                <span style={{ color: '#666' }}>🚌 Buses:</span> {route.assignedBuses.length}
              </div>
            </div>

            {route.assignedBuses.length > 0 && (
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
                onClick={() => handleViewOnMap(route)}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                🗺️ View Map
              </button>
              <button
                onClick={() => handleEdit(route)}
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
                onClick={() => handleDelete(route.id)}
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
        ))}
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
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '8px',
            width: '500px',
            maxWidth: '90%'
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