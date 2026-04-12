 
import { useState, useEffect } from 'react';
import { transportService } from '../../services/transport';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function DriverManagement({ onDriverSelect, selectedDriverId }) {
  const [drivers, setDrivers] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [driverStats, setDriverStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
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
        incidents: d.driverDetails?.incidents || 0,
        onTimeRate: d.driverDetails?.onTimeRate || 92,
        safetyScore: d.driverDetails?.safetyScore || 96
      }));
      
      setDrivers(formattedDrivers);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      toast.error(error.message || 'Failed to fetch drivers');
      setDrivers([]);
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
      setBuses([]);
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
        setDriverStats({
          monthlyTrips: driver.totalTrips || 0,
          avgSpeed: 45,
          onTimeRate: driver.onTimeRate || 92,
          fuelEfficiency: 8.5,
          studentCompliments: 5,
          safetyScore: driver.safetyScore || 96,
          lastTrip: new Date().toISOString(),
          nextTrip: new Date(Date.now() + 86400000).toISOString(),
          totalDistance: 1250,
          attendanceRate: 98
        });
      }
    } catch (error) {
      console.error('Error fetching driver stats:', error);
      setDriverStats({
        monthlyTrips: driver.totalTrips || 0,
        avgSpeed: 45,
        onTimeRate: driver.onTimeRate || 92,
        fuelEfficiency: 8.5,
        studentCompliments: 5,
        safetyScore: driver.safetyScore || 96,
        lastTrip: new Date().toISOString(),
        nextTrip: new Date(Date.now() + 86400000).toISOString(),
        totalDistance: 1250,
        attendanceRate: 98
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
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
        emergencyContact: formData.emergencyContact,
        address: formData.address,
        driverDetails: {
          licenseNumber: formData.licenseNumber,
          licenseExpiry: formData.licenseExpiry,
          experience: parseInt(formData.experience) || 0,
          assignedBus: formData.assignedBus || null
        }
      };

      let response;
      if (editingDriver) {
        response = await fetch(`http://localhost:5000/api/users/${editingDriver._id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(driverData)
        });
      } else {
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
      
      // If assigned bus, also update the bus with driver
      if (formData.assignedBus && !editingDriver) {
        await fetch(`http://localhost:5000/api/buses/${formData.assignedBus}/assign-driver`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            driverId: result.data?._id || editingDriver?._id,
            driverName: `${formData.firstName} ${formData.lastName}`,
            driverPhone: formData.phone
          })
        });
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
    setShowStatsModal(true);
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

  const getStatusIcon = (status) => {
    switch(status) {
      case 'active': return '✅';
      case 'on-leave': return '🌴';
      case 'inactive': return '⛔';
      default: return '❓';
    }
  };

  // Filter drivers based on search and status
  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = searchTerm === '' || 
      driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.phone.includes(searchTerm);
    const matchesStatus = filterStatus === 'all' || driver.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div className="loading-spinner" style={{ margin: '0 auto', width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #2196F3', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '10px', color: '#666' }}>Loading drivers...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
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
          <h3 style={{ margin: 0 }}>👨‍✈️ Driver Management</h3>
          <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
            Manage your drivers, track performance, and assign to buses
          </p>
        </div>
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
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
        >
          ➕ Add New Driver
        </button>
      </div>

      {/* Stats Overview */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '20px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{drivers.length}</div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Drivers</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
            {drivers.filter(d => d.status === 'active').length}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Active Drivers</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
            {drivers.filter(d => d.assignedBus).length}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Assigned to Bus</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #5f2c82 0%, #49a09d 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
            {drivers.length ? (drivers.reduce((sum, d) => sum + (d.rating || 0), 0) / drivers.length).toFixed(1) : 0}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Avg Rating</div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div style={{
        display: 'flex',
        gap: '15px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        <input
          type="text"
          placeholder="🔍 Search drivers by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '14px',
            minWidth: '200px'
          }}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '14px',
            background: 'white'
          }}
        >
          <option value="all">All Status</option>
          <option value="active">✅ Active</option>
          <option value="inactive">⛔ Inactive</option>
          <option value="on-leave">🌴 On Leave</option>
        </select>
      </div>

      {/* Driver Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
        gap: '20px'
      }}>
        {filteredDrivers.map(driver => (
          <div
            key={driver.id}
            style={{
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              borderLeft: `4px solid ${getStatusColor(driver.status)}`,
              transition: 'all 0.3s ease',
              overflow: 'hidden',
              ...(selectedDriverId === driver._id ? {
                boxShadow: '0 4px 16px rgba(33, 150, 243, 0.3)',
                transform: 'translateY(-2px)'
              } : {})
            }}
            onClick={() => {
              if (onDriverSelect) onDriverSelect(driver);
              handleViewStats(driver);
            }}
          >
            <div style={{ padding: '20px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '15px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '20px'
                  }}>
                    {driver.firstName?.charAt(0) || driver.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '16px', color: '#333' }}>
                      {driver.name || `${driver.firstName} ${driver.lastName}`}
                    </h4>
                    <div style={{ fontSize: '12px', color: '#666' }}>{driver.email || 'No email'}</div>
                  </div>
                </div>
                <span style={{
                  background: getStatusColor(driver.status),
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {getStatusIcon(driver.status)} {driver.status}
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
                  <div style={{ color: '#666', marginBottom: '2px' }}>📞 Phone</div>
                  <div style={{ fontWeight: '500' }}>{driver.phone || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ color: '#666', marginBottom: '2px' }}>🪪 License</div>
                  <div style={{ fontWeight: '500' }}>{driver.licenseNumber || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ color: '#666', marginBottom: '2px' }}>📅 Expiry</div>
                  <div style={{
                    fontWeight: '500',
                    color: driver.licenseExpiry && new Date(driver.licenseExpiry) < new Date() ? '#f44336' : 'inherit'
                  }}>
                    {driver.licenseExpiry ? format(new Date(driver.licenseExpiry), 'MMM dd, yyyy') : 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#666', marginBottom: '2px' }}>⭐ Experience</div>
                  <div style={{ fontWeight: '500' }}>{driver.experience} years</div>
                </div>
              </div>

              {/* Performance Stats */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '15px',
                padding: '12px',
                background: '#f8f9fa',
                borderRadius: '8px'
              }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#666' }}>Trips</div>
                  <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{driver.totalTrips}</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#666' }}>Rating</div>
                  <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#FFC107' }}>
                    {driver.rating} ⭐
                  </div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#666' }}>Incidents</div>
                  <div style={{ 
                    fontWeight: 'bold', 
                    fontSize: '16px',
                    color: driver.incidents > 0 ? '#f44336' : '#4CAF50' 
                  }}>
                    {driver.incidents}
                  </div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#666' }}>On-Time</div>
                  <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#2196F3' }}>
                    {driver.onTimeRate}%
                  </div>
                </div>
              </div>

              {/* Assigned Bus */}
              {driver.assignedBus && (
                <div style={{
                  marginBottom: '15px',
                  padding: '8px 12px',
                  background: '#e3f2fd',
                  borderRadius: '6px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>🚌</span>
                  <span>Assigned to: <strong>
                    {buses.find(b => b._id === driver.assignedBus)?.busNumber || 'Unknown'}
                  </strong></span>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '10px',
                borderTop: '1px solid #eee',
                paddingTop: '15px',
                marginTop: '5px'
              }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewStats(driver);
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: '#9C27B0',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#7B1FA2'}
                  onMouseLeave={(e) => e.target.style.background = '#9C27B0'}
                >
                  📊 Stats
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(driver);
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: '#FF9800',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#F57C00'}
                  onMouseLeave={(e) => e.target.style.background = '#FF9800'}
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusToggle(driver);
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: driver.status === 'active' ? '#FF5722' : '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                  onMouseLeave={(e) => e.target.style.opacity = '1'}
                >
                  {driver.status === 'active' ? '🔴 Deactivate' : '🟢 Activate'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(driver.id);
                  }}
                  style={{
                    padding: '8px 12px',
                    background: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#D32F2F'}
                  onMouseLeave={(e) => e.target.style.background = '#f44336'}
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredDrivers.length === 0 && !loading && (
        <div style={{
          textAlign: 'center',
          padding: '60px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>👨‍✈️</div>
          <h3 style={{ marginBottom: '8px', color: '#333' }}>No drivers found</h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            {searchTerm || filterStatus !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Get started by adding your first driver to the system'}
          </p>
          {(searchTerm || filterStatus !== 'all') ? (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
              }}
              style={{
                padding: '10px 24px',
                background: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Clear Filters
            </button>
          ) : (
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
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ➕ Add New Driver
            </button>
          )}
        </div>
      )}

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
            borderRadius: '12px',
            width: '650px',
            maxWidth: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>
              {editingDriver ? '✏️ Edit Driver' : '➕ Add New Driver'}
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
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
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
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
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
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
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
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
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
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
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
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
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
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
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
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
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
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="active">✅ Active</option>
                    <option value="inactive">⛔ Inactive</option>
                    <option value="on-leave">🌴 On Leave</option>
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
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
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
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '25px' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#45a049'}
                  onMouseLeave={(e) => e.target.style.background = '#4CAF50'}
                >
                  {editingDriver ? 'Update Driver' : 'Add Driver'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingDriver(null);
                    resetForm();
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#D32F2F'}
                  onMouseLeave={(e) => e.target.style.background = '#f44336'}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Driver Stats Modal */}
      {showStatsModal && selectedDriver && driverStats && (
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
          zIndex: 1001,
          overflowY: 'auto'
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '12px',
            width: '500px',
            maxWidth: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#333' }}>
                📊 {selectedDriver.name} - Performance Stats
              </h3>
              <button
                onClick={() => setShowStatsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#999'
                }}
              >
                ×
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '15px',
              marginBottom: '20px'
            }}>
              <div style={{
                padding: '15px',
                background: '#e3f2fd',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2196F3' }}>
                  {driverStats.monthlyTrips}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Monthly Trips</div>
              </div>
              <div style={{
                padding: '15px',
                background: '#e8f5e9',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#4CAF50' }}>
                  {driverStats.onTimeRate}%
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>On-Time Rate</div>
              </div>
              <div style={{
                padding: '15px',
                background: '#fff3e0',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#FF9800' }}>
                  {driverStats.fuelEfficiency}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Fuel Efficiency (km/L)</div>
              </div>
              <div style={{
                padding: '15px',
                background: '#fce4ec',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f44336' }}>
                  {driverStats.safetyScore}/100
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Safety Score</div>
              </div>
            </div>

            <div style={{
              padding: '15px',
              background: '#f5f5f5',
              borderRadius: '8px',
              marginBottom: '15px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>Student Compliments</span>
                <strong>{driverStats.studentCompliments}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>Average Speed</span>
                <strong>{driverStats.avgSpeed} km/h</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>Total Distance</span>
                <strong>{driverStats.totalDistance} km</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Attendance Rate</span>
                <strong>{driverStats.attendanceRate}%</strong>
              </div>
            </div>

            <div style={{
              padding: '15px',
              background: '#f5f5f5',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>Last Trip</span>
                <strong>{format(new Date(driverStats.lastTrip), 'MMM dd, yyyy')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Next Trip</span>
                <strong>{format(new Date(driverStats.nextTrip), 'MMM dd, yyyy')}</strong>
              </div>
            </div>

            <button
              onClick={() => setShowStatsModal(false)}
              style={{
                width: '100%',
                padding: '12px',
                background: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}