import { useState, useEffect } from 'react';
import { transportService } from '../../services/transport';
import toast from 'react-hot-toast';

export default function BusManagement() {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBus, setEditingBus] = useState(null);
  const [formData, setFormData] = useState({
    busNumber: '',
    busId: '',
    driverName: '',
    driverPhone: '',
    capacity: 40,
    route: '',
    status: 'active',
    fuelLevel: 100
  });

  useEffect(() => {
    fetchBuses();
  }, []);

  const fetchBuses = async () => {
    try {
      setLoading(true);
      const data = await transportService.getBuses();
      setBuses(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to fetch buses');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBus) {
        await transportService.updateBus(editingBus._id, formData);
        toast.success('Bus updated successfully');
      } else {
        await transportService.createBus(formData);
        toast.success('Bus added successfully');
      }
      setShowForm(false);
      setEditingBus(null);
      setFormData({
        busNumber: '',
        busId: '',
        driverName: '',
        driverPhone: '',
        capacity: 40,
        route: '',
        status: 'active',
        fuelLevel: 100
      });
      fetchBuses();
    } catch (error) {
      toast.error('Failed to save bus');
    }
  };

  const handleEdit = (bus) => {
    setEditingBus(bus);
    setFormData({
      busNumber: bus.busNumber,
      busId: bus.busId || '',
      driverName: bus.driverName || '',
      driverPhone: bus.driverPhone || '',
      capacity: bus.capacity || 40,
      route: bus.route || '',
      status: bus.status || 'active',
      fuelLevel: bus.fuelLevel || 100
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this bus?')) return;
    try {
      await transportService.deleteBus(id);
      toast.success('Bus deleted successfully');
      fetchBuses();
    } catch (error) {
      toast.error('Failed to delete bus');
    }
  };

  const handleStatusToggle = async (bus) => {
    const newStatus = bus.status === 'active' ? 'maintenance' : 'active';
    try {
      await transportService.updateBusStatus(bus._id, newStatus);
      toast.success(`Bus status updated to ${newStatus}`);
      fetchBuses();
    } catch (error) {
      toast.error('Failed to update status');
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
        <h3 style={{ margin: 0 }}>Bus Fleet Management</h3>
        <button
          onClick={() => {
            setEditingBus(null);
            setFormData({
              busNumber: '',
              busId: '',
              driverName: '',
              driverPhone: '',
              capacity: 40,
              route: '',
              status: 'active',
              fuelLevel: 100
            });
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
          ➕ Add New Bus
        </button>
      </div>

      {/* Add/Edit Form Modal */}
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
              {editingBus ? 'Edit Bus' : 'Add New Bus'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Bus Number *
                </label>
                <input
                  type="text"
                  name="busNumber"
                  value={formData.busNumber}
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
                  Bus ID
                </label>
                <input
                  type="text"
                  name="busId"
                  value={formData.busId}
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
                  Driver Name
                </label>
                <input
                  type="text"
                  name="driverName"
                  value={formData.driverName}
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
                  Driver Phone
                </label>
                <input
                  type="tel"
                  name="driverPhone"
                  value={formData.driverPhone}
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
                  Capacity
                </label>
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleInputChange}
                  min="1"
                  max="100"
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
                  Route
                </label>
                <input
                  type="text"
                  name="route"
                  value={formData.route}
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

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Fuel Level (%)
                </label>
                <input
                  type="number"
                  name="fuelLevel"
                  value={formData.fuelLevel}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
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
                  {editingBus ? 'Update Bus' : 'Add Bus'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingBus(null);
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

      {/* Buses Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: '20px'
      }}>
        {buses.map(bus => (
          <div
            key={bus._id}
            style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              borderLeft: `4px solid ${bus.status === 'active' ? '#4CAF50' : '#FF9800'}`
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '15px'
            }}>
              <h4 style={{ margin: 0, color: '#2196F3' }}>{bus.busNumber}</h4>
              <span style={{
                background: bus.status === 'active' ? '#4CAF50' : '#FF9800',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '12px'
              }}>
                {bus.status}
              </span>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '14px', color: '#666' }}>Driver</div>
              <div style={{ fontWeight: '500' }}>{bus.driverName || 'Not assigned'}</div>
              {bus.driverPhone && (
                <div style={{ fontSize: '12px', color: '#666' }}>{bus.driverPhone}</div>
              )}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              marginBottom: '15px'
            }}>
              <div>
                <div style={{ fontSize: '12px', color: '#666' }}>Route</div>
                <div>{bus.route || 'Not assigned'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666' }}>Capacity</div>
                <div>{bus.capacity || 40}</div>
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                marginBottom: '5px'
              }}>
                <span>Fuel Level</span>
                <span style={{ fontWeight: 'bold' }}>{bus.fuelLevel || 100}%</span>
              </div>
              <div style={{
                width: '100%',
                height: '6px',
                background: '#f0f0f0',
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${bus.fuelLevel || 100}%`,
                  height: '100%',
                  background: (bus.fuelLevel || 100) > 20 ? '#4CAF50' : '#f44336'
                }} />
              </div>
            </div>

            {bus.currentLocation && (
              <div style={{
                fontSize: '12px',
                color: '#666',
                marginBottom: '15px'
              }}>
                📍 Last seen: {new Date(bus.currentLocation.timestamp).toLocaleTimeString()}
                <br />
                Speed: {bus.currentLocation.speed || 0} km/h
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: '10px',
              borderTop: '1px solid #eee',
              paddingTop: '15px'
            }}>
              <button
                onClick={() => handleEdit(bus)}
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
                onClick={() => handleStatusToggle(bus)}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: bus.status === 'active' ? '#FF9800' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {bus.status === 'active' ? '🔧 Maintenance' : '✅ Activate'}
              </button>
              <button
                onClick={() => handleDelete(bus._id)}
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

      {buses.length === 0 && !loading && (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          background: 'white',
          borderRadius: '8px'
        }}>
          <p style={{ color: '#666' }}>No buses found. Click "Add New Bus" to get started.</p>
        </div>
      )}
    </div>
  );
}