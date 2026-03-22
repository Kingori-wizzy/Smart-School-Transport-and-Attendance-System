 
import { useState, useEffect } from 'react';
import { transportService } from '../../services/transport';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function DriverManagement() {
  const [drivers, setDrivers] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [driverStats, setDriverStats] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    licenseNumber: '',
    licenseExpiry: '',
    experience: 0,
    assignedBus: '',
    status: 'active',
    emergencyContact: '',
    address: ''
  });

  useEffect(() => {
    fetchDrivers();
    fetchBuses();
  }, []);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/users?role=driver', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch drivers');
      }
      
      // Transform the data to match component format
      const formattedDrivers = (data.data || []).map(d => ({
        id: d._id,
        _id: d._id,
        firstName: d.firstName || '',
        lastName: d.lastName || '',
        name: `${d.firstName || ''} ${d.lastName || ''}`.trim(),
        email: d.email || '',
        phone: d.phone || '',
        licenseNumber: d.driverDetails?.licenseNumber || '',
        licenseExpiry: d.driverDetails?.licenseExpiry || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        experience: d.driverDetails?.experience || 0,
        assignedBus: d.driverDetails?.assignedBus || '',
        status: d.isActive !== false ? 'active' : 'inactive',
        emergencyContact: d.emergencyContact || '',
        address: d.address || '',
        joinDate: d.createdAt ? d.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
        rating: d.driverDetails?.rating || 4.5,
        totalTrips: d.driverDetails?.totalTrips || 0,
        incidents: d.driverDetails?.incidents || 0
      }));
      
      setDrivers(formattedDrivers);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      toast.error(error.message || 'Failed to fetch drivers');
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

  const fetchDriverStats = async (driver) => {
    try {
      const response = await fetch(`http://localhost:5000/api/driver/stats?driverId=${driver._id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setDriverStats(data.data);
      } else {
        // Fallback mock data
        setDriverStats({
          monthlyTrips: driver.totalTrips || 0,
          avgSpeed: 45,
          onTimeRate: 92,
          fuelEfficiency: 8.5,
          studentCompliments: 5,
          safetyScore: 96,
          lastTrip: new Date().toISOString(),
          nextTrip: new Date(Date.now() + 86400000).toISOString()
        });
      }
    } catch (error) {
      console.error('Error fetching driver stats:', error);
      // Fallback mock data
      setDriverStats({
        monthlyTrips: driver.totalTrips || 0,
        avgSpeed: 45,
        onTimeRate: 92,
        fuelEfficiency: 8.5,
        studentCompliments: 5,
        safetyScore: 96,
        lastTrip: new Date().toISOString(),
        nextTrip: new Date(Date.now() + 86400000).toISOString()
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.firstName || !formData.lastName) {
      toast.error('First name and last name are required');
      return;
    }
    if (!formData.phone) {
      toast.error('Phone number is required');
      return;
    }
    if (!formData.licenseNumber) {
      toast.error('License number is required');
      return;
    }
    if (!formData.licenseExpiry) {
      toast.error('License expiry date is required');
      return;
    }

    try {
      const driverData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || `${formData.firstName.toLowerCase()}.${formData.lastName.toLowerCase()}@driver.com`,
        phone: formData.phone,
        role: 'driver',
        isActive: formData.status === 'active',
        driverDetails: {
          licenseNumber: formData.licenseNumber,
          licenseExpiry: formData.licenseExpiry,
          experience: parseInt(formData.experience) || 0,
          assignedBus: formData.assignedBus || null
        }
      };

      let response;
      if (editingDriver) {
        // Update existing driver
        response = await fetch(`http://localhost:5000/api/users/${editingDriver._id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(driverData)
        });
      } else {
        // Create new driver
        driverData.password = 'password123';
        response = await fetch('http://localhost:5000/api/users', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(driverData)
        });
      }

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to save driver');
      }
      
      toast.success(editingDriver ? 'Driver updated successfully' : 'Driver added successfully');
      setShowForm(false);
      setEditingDriver(null);
      resetForm();
      fetchDrivers();
    } catch (error) {
      console.error('Error saving driver:', error);
      toast.error(error.message || 'Failed to save driver');
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      licenseNumber: '',
      licenseExpiry: '',
      experience: 0,
      assignedBus: '',
      status: 'active',
      emergencyContact: '',
      address: ''
    });
  };

  const handleEdit = (driver) => {
    setEditingDriver(driver);
    setFormData({
      firstName: driver.firstName || '',
      lastName: driver.lastName || '',
      email: driver.email || '',
      phone: driver.phone || '',
      licenseNumber: driver.licenseNumber || '',
      licenseExpiry: driver.licenseExpiry ? driver.licenseExpiry.split('T')[0] : '',
      experience: driver.experience || 0,
      assignedBus: driver.assignedBus || '',
      status: driver.status || 'active',
      emergencyContact: driver.emergencyContact || '',
      address: driver.address || ''
    });
    setShowForm(true);
  };

  const handleViewStats = async (driver) => {
    setSelectedDriver(driver);
    await fetchDriverStats(driver);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this driver? This action cannot be undone.')) return;
    try {
      const response = await fetch(`http://localhost:5000/api/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete driver');
      }
      
      toast.success('Driver deleted successfully');
      fetchDrivers();
    } catch (error) {
      console.error('Error deleting driver:', error);
      toast.error(error.message || 'Failed to delete driver');
    }
  };

  const handleStatusToggle = async (driver) => {
    const newStatus = driver.status === 'active' ? 'inactive' : 'active';
    try {
      const response = await fetch(`http://localhost:5000/api/users/${driver._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: newStatus === 'active' })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update status');
      }
      
      toast.success(`Driver ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      fetchDrivers();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error(error.message || 'Failed to update status');
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return '#4CAF50';
      case 'on-leave': return '#FF9800';
      case 'inactive': return '#f44336';
      default: return '#999';
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div className="loading-spinner" style={{ margin: '0 auto' }} />
        <p style={{ marginTop: '10px', color: '#666' }}>Loading drivers...</p>
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
        <h3 style={{ margin: 0 }}>Driver Management</h3>
        <button
          onClick={() => {
            setEditingDriver(null);
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
          ➕ Add New Driver
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
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{drivers.length}</div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>Total Drivers</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)',
          color: 'white',
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {drivers.filter(d => d.status === 'active').length}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>Active Drivers</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          color: 'white',
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {drivers.filter(d => d.assignedBus).length}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>Assigned to Bus</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #5f2c82 0%, #49a09d 100%)',
          color: 'white',
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {drivers.length ? (drivers.reduce((sum, d) => sum + (d.rating || 0), 0) / drivers.length).toFixed(1) : 0}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>Avg Rating</div>
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
              {editingDriver ? 'Edit Driver' : 'Add New Driver'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
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

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
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

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Optional - auto-generated if empty"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
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

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    License Number *
                  </label>
                  <input
                    type="text"
                    name="licenseNumber"
                    value={formData.licenseNumber}
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

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    License Expiry *
                  </label>
                  <input
                    type="date"
                    name="licenseExpiry"
                    value={formData.licenseExpiry}
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

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    name="experience"
                    value={formData.experience}
                    onChange={handleInputChange}
                    min="0"
                    max="50"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Assign Bus
                  </label>
                  <select
                    name="assignedBus"
                    value={formData.assignedBus}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  >
                    <option value="">Unassigned</option>
                    {buses.map(bus => (
                      <option key={bus._id} value={bus._id}>
                        {bus.busNumber} - {bus.route || 'No route'} (Cap: {bus.capacity})
                      </option>
                    ))}
                  </select>
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
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Emergency Contact
                  </label>
                  <input
                    type="tel"
                    name="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={handleInputChange}
                    placeholder="Emergency phone number"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Address
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows="3"
                    placeholder="Driver's residential address"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>
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
                  {editingDriver ? 'Update Driver' : 'Add Driver'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingDriver(null);
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

      {/* Driver Stats Modal */}
      {selectedDriver && driverStats && (
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
            width: '450px',
            maxWidth: '90%'
          }}>
            <h3 style={{ margin: '0 0 15px 0' }}>
              {selectedDriver.name} - Performance Stats
            </h3>
            <div style={{ marginBottom: '10px' }}>
              <strong>Monthly Trips:</strong> {driverStats.monthlyTrips}
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>On-Time Rate:</strong> {driverStats.onTimeRate}%
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>Fuel Efficiency:</strong> {driverStats.fuelEfficiency} km/L
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>Safety Score:</strong> {driverStats.safetyScore}/100
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>Student Compliments:</strong> {driverStats.studentCompliments}
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>Last Trip:</strong> {format(new Date(driverStats.lastTrip), 'MMM dd, yyyy')}
            </div>
            <div style={{ marginBottom: '20px' }}>
              <strong>Next Trip:</strong> {format(new Date(driverStats.nextTrip), 'MMM dd, yyyy')}
            </div>
            <button
              onClick={() => setSelectedDriver(null)}
              style={{
                width: '100%',
                padding: '10px',
                background: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Driver Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: '20px'
      }}>
        {drivers.map(driver => (
          <div
            key={driver.id}
            style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              borderLeft: `4px solid ${getStatusColor(driver.status)}`,
              transition: 'transform 0.2s, box-shadow 0.2s',
              cursor: 'pointer',
              ':hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
              }
            }}
            onClick={() => handleViewStats(driver)}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '15px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: '#2196F3',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '18px'
                }}>
                  {driver.firstName?.charAt(0) || driver.name?.charAt(0) || '?'}
                </div>
                <div>
                  <h4 style={{ margin: 0 }}>{driver.name || `${driver.firstName} ${driver.lastName}`}</h4>
                  <div style={{ fontSize: '12px', color: '#666' }}>{driver.email || 'No email'}</div>
                </div>
              </div>
              <span style={{
                background: getStatusColor(driver.status),
                color: 'white',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '12px'
              }}>
                {driver.status}
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              marginBottom: '15px',
              fontSize: '13px'
            }}>
              <div>
                <div style={{ color: '#666' }}>📞 Phone</div>
                <div>{driver.phone || 'N/A'}</div>
              </div>
              <div>
                <div style={{ color: '#666' }}>🪪 License</div>
                <div>{driver.licenseNumber || 'N/A'}</div>
              </div>
              <div>
                <div style={{ color: '#666' }}>📅 Expiry</div>
                <div style={{
                  color: driver.licenseExpiry && new Date(driver.licenseExpiry) < new Date() ? '#f44336' : 'inherit'
                }}>
                  {driver.licenseExpiry ? format(new Date(driver.licenseExpiry), 'MMM dd, yyyy') : 'N/A'}
                </div>
              </div>
              <div>
                <div style={{ color: '#666' }}>⭐ Experience</div>
                <div>{driver.experience} years</div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '15px',
              padding: '10px',
              background: '#f5f5f5',
              borderRadius: '6px'
            }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>Trips</div>
                <div style={{ fontWeight: 'bold' }}>{driver.totalTrips}</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>Rating</div>
                <div style={{ fontWeight: 'bold', color: '#FFC107' }}>{driver.rating} ⭐</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>Incidents</div>
                <div style={{ fontWeight: 'bold', color: driver.incidents > 0 ? '#f44336' : '#4CAF50' }}>
                  {driver.incidents}
                </div>
              </div>
            </div>

            {driver.assignedBus && (
              <div style={{
                marginBottom: '15px',
                padding: '8px',
                background: '#e3f2fd',
                borderRadius: '4px',
                fontSize: '13px'
              }}>
                🚌 Assigned to: <strong>{buses.find(b => b._id === driver.assignedBus)?.busNumber || 'Unknown'}</strong>
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
                  handleStatusToggle(driver);
                }}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: driver.status === 'active' ? '#FF9800' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                {driver.status === 'active' ? '🔴 Deactivate' : '🟢 Activate'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(driver);
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
                ✏️ Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(driver.id);
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
        ))}
      </div>

      {drivers.length === 0 && !loading && (
        <div style={{
          textAlign: 'center',
          padding: '60px',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👤</div>
          <h3 style={{ marginBottom: '8px' }}>No drivers found</h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Get started by adding your first driver to the system.
          </p>
          <button
            onClick={() => {
              setEditingDriver(null);
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
            ➕ Add New Driver
          </button>
        </div>
      )}
    </div>
  );
}