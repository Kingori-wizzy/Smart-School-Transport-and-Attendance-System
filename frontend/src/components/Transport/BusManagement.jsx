/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { transportService } from '../../services/transport';
import { userService } from '../../services/user';
import toast from 'react-hot-toast';

export default function BusManagement() {
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBus, setEditingBus] = useState(null);
  const [formData, setFormData] = useState({
    busNumber: '',
    registrationNumber: '',
    busId: '',
    driverId: '',
    driverName: '',
    driverPhone: '',
    capacity: 40,
    route: '',
    status: 'active',
    fuelLevel: 100,
    lastMaintenance: '',
    nextMaintenance: '',
    insuranceExpiry: ''
  });

  useEffect(() => {
    fetchBuses();
    fetchDrivers();
  }, []);

  const fetchBuses = async () => {
    try {
      setLoading(true);
      const data = await transportService.getBuses();
      setBuses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching buses:', error);
      toast.error('Failed to fetch buses');
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/users?role=driver', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setDrivers(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // If driver is selected, auto-fill driver name and phone
    if (name === 'driverId') {
      const selectedDriver = drivers.find(d => d._id === value);
      if (selectedDriver) {
        setFormData(prev => ({
          ...prev,
          driverId: value,
          driverName: `${selectedDriver.firstName || ''} ${selectedDriver.lastName || ''}`.trim(),
          driverPhone: selectedDriver.phone || ''
        }));
        return;
      }
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.busNumber) {
      toast.error('Bus Number is required');
      return;
    }
    if (!formData.registrationNumber) {
      toast.error('Registration Number is required');
      return;
    }

    try {
      const busData = {
        busNumber: formData.busNumber,
        registrationNumber: formData.registrationNumber,
        busId: formData.busId,
        driverId: formData.driverId || null,
        driverName: formData.driverName,
        driverPhone: formData.driverPhone,
        capacity: parseInt(formData.capacity),
        route: formData.route,
        status: formData.status,
        fuelLevel: parseInt(formData.fuelLevel),
        lastMaintenance: formData.lastMaintenance || null,
        nextMaintenance: formData.nextMaintenance || null,
        insuranceExpiry: formData.insuranceExpiry || null
      };

      if (editingBus) {
        await transportService.updateBus(editingBus._id, busData);
        toast.success('Bus updated successfully');
      } else {
        await transportService.createBus(busData);
        toast.success('Bus added successfully');
      }
      
      setShowForm(false);
      setEditingBus(null);
      resetForm();
      fetchBuses();
    } catch (error) {
      console.error('Error saving bus:', error);
      toast.error(error.response?.data?.message || 'Failed to save bus');
    }
  };

  const resetForm = () => {
    setFormData({
      busNumber: '',
      registrationNumber: '',
      busId: '',
      driverId: '',
      driverName: '',
      driverPhone: '',
      capacity: 40,
      route: '',
      status: 'active',
      fuelLevel: 100,
      lastMaintenance: '',
      nextMaintenance: '',
      insuranceExpiry: ''
    });
  };

  const handleEdit = (bus) => {
    setEditingBus(bus);
    setFormData({
      busNumber: bus.busNumber || '',
      registrationNumber: bus.registrationNumber || '',
      busId: bus.busId || '',
      driverId: bus.driverId?._id || bus.driverId || '',
      driverName: bus.driverName || '',
      driverPhone: bus.driverPhone || '',
      capacity: bus.capacity || 40,
      route: bus.route || '',
      status: bus.status || 'active',
      fuelLevel: bus.fuelLevel || 100,
      lastMaintenance: bus.lastMaintenance ? bus.lastMaintenance.split('T')[0] : '',
      nextMaintenance: bus.nextMaintenance ? bus.nextMaintenance.split('T')[0] : '',
      insuranceExpiry: bus.insuranceExpiry ? bus.insuranceExpiry.split('T')[0] : ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this bus? This action cannot be undone.')) return;
    try {
      await transportService.deleteBus(id);
      toast.success('Bus deleted successfully');
      fetchBuses();
    } catch (error) {
      console.error('Error deleting bus:', error);
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
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
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
        <p>Loading buses...</p>
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
        <h3 style={{ margin: 0 }}>Bus Fleet Management</h3>
        <button
          onClick={() => {
            setEditingBus(null);
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
          ➕ Add New Bus
        </button>
      </div>

      {/* Stats Overview */}
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
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{buses.length}</div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>Total Buses</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)',
          color: 'white',
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {buses.filter(b => b.status === 'active').length}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>Active Buses</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          color: 'white',
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {buses.filter(b => b.status === 'maintenance').length}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>In Maintenance</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #5f2c82 0%, #49a09d 100%)',
          color: 'white',
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {buses.reduce((sum, b) => sum + (b.capacity || 0), 0)}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>Total Capacity</div>
        </div>
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
          zIndex: 1000,
          overflowY: 'auto'
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '8px',
            width: '600px',
            maxWidth: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 20px 0' }}>
              {editingBus ? 'Edit Bus' : 'Add New Bus'}
            </h3>
            <form onSubmit={handleSubmit}>
              {/* Bus Number */}
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Bus Number * (e.g., KAA 123A)
                </label>
                <input
                  type="text"
                  name="busNumber"
                  value={formData.busNumber}
                  onChange={handleInputChange}
                  required
                  placeholder="KAA 123A"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              {/* Registration Number - NEW FIELD */}
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Registration Number * (e.g., KCA 123T)
                </label>
                <input
                  type="text"
                  name="registrationNumber"
                  value={formData.registrationNumber}
                  onChange={handleInputChange}
                  required
                  placeholder="KCA 123T"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              {/* Bus ID (Internal) */}
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Bus ID (Internal)
                </label>
                <input
                  type="text"
                  name="busId"
                  value={formData.busId}
                  onChange={handleInputChange}
                  placeholder="BUS-001"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              {/* Assign Driver - NEW DROPDOWN */}
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Assign Driver
                </label>
                <select
                  name="driverId"
                  value={formData.driverId}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                >
                  <option value="">Select a driver (optional)</option>
                  {drivers.map(driver => (
                    <option key={driver._id} value={driver._id}>
                      {driver.firstName} {driver.lastName} - {driver.phone}
                    </option>
                  ))}
                </select>
              </div>

              {/* Driver Name (auto-filled) */}
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Driver Name
                </label>
                <input
                  type="text"
                  name="driverName"
                  value={formData.driverName}
                  onChange={handleInputChange}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#f5f5f5',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              {/* Driver Phone (auto-filled) */}
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Driver Phone
                </label>
                <input
                  type="tel"
                  name="driverPhone"
                  value={formData.driverPhone}
                  onChange={handleInputChange}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#f5f5f5',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              {/* Capacity */}
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Capacity (students)
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

              {/* Route */}
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Assigned Route
                </label>
                <input
                  type="text"
                  name="route"
                  value={formData.route}
                  onChange={handleInputChange}
                  placeholder="North Route, South Route, etc."
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              {/* Status */}
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

              {/* Fuel Level */}
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

              {/* Last Maintenance */}
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Last Maintenance Date
                </label>
                <input
                  type="date"
                  name="lastMaintenance"
                  value={formData.lastMaintenance}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              {/* Next Maintenance */}
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Next Maintenance Date
                </label>
                <input
                  type="date"
                  name="nextMaintenance"
                  value={formData.nextMaintenance}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              {/* Insurance Expiry */}
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Insurance Expiry Date
                </label>
                <input
                  type="date"
                  name="insuranceExpiry"
                  value={formData.insuranceExpiry}
                  onChange={handleInputChange}
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
              borderLeft: `4px solid ${getStatusColor(bus.status)}`,
              transition: 'transform 0.2s, box-shadow 0.2s',
              cursor: 'pointer',
              ':hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
              }
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '15px'
            }}>
              <div>
                <h4 style={{ margin: 0, color: '#2196F3' }}>{bus.busNumber}</h4>
                {bus.registrationNumber && (
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                    Reg: {bus.registrationNumber}
                  </div>
                )}
              </div>
              <span style={{
                background: getStatusColor(bus.status),
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

            {/* Fuel Level Bar */}
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

            {/* Maintenance Info */}
            {bus.nextMaintenance && (
              <div style={{
                fontSize: '11px',
                color: new Date(bus.nextMaintenance) < new Date() ? '#f44336' : '#666',
                marginBottom: '10px',
                padding: '4px 8px',
                background: '#f9f9f9',
                borderRadius: '4px'
              }}>
                🔧 Next maintenance: {new Date(bus.nextMaintenance).toLocaleDateString()}
              </div>
            )}

            {bus.currentLocation && (
              <div style={{
                fontSize: '12px',
                color: '#666',
                marginBottom: '15px',
                padding: '8px',
                background: '#e3f2fd',
                borderRadius: '4px'
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
                  cursor: 'pointer',
                  fontSize: '12px'
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
                  cursor: 'pointer',
                  fontSize: '12px'
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
                  cursor: 'pointer',
                  fontSize: '12px'
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
          padding: '60px',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚌</div>
          <h3 style={{ marginBottom: '8px' }}>No buses found</h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Get started by adding your first bus to the fleet.
          </p>
          <button
            onClick={() => {
              setEditingBus(null);
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
            ➕ Add New Bus
          </button>
        </div>
      )}
    </div>
  );
}