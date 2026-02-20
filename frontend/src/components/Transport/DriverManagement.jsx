import { useState, useEffect } from 'react';
import { transportService } from '../../services/transport';
import { attendanceService } from '../../services/attendance';
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
    name: '',
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
      // Mock drivers data - replace with actual API call
      const mockDrivers = [
        {
          id: 'DRV001',
          name: 'John Driver',
          email: 'john.driver@school.com',
          phone: '+254700000001',
          licenseNumber: 'L123456',
          licenseExpiry: '2025-12-31',
          experience: 8,
          assignedBus: 'BUS001',
          status: 'active',
          emergencyContact: '+254711111111',
          address: 'Nairobi',
          joinDate: '2023-01-15',
          rating: 4.8,
          totalTrips: 1250,
          incidents: 2
        },
        {
          id: 'DRV002',
          name: 'Peter Driver',
          email: 'peter.driver@school.com',
          phone: '+254700000002',
          licenseNumber: 'L789012',
          licenseExpiry: '2024-06-30',
          experience: 5,
          assignedBus: 'BUS002',
          status: 'active',
          emergencyContact: '+254722222222',
          address: 'Kiambu',
          joinDate: '2024-02-01',
          rating: 4.5,
          totalTrips: 850,
          incidents: 1
        },
        {
          id: 'DRV003',
          name: 'James Driver',
          email: 'james.driver@school.com',
          phone: '+254700000003',
          licenseNumber: 'L345678',
          licenseExpiry: '2024-03-15',
          experience: 12,
          assignedBus: 'BUS003',
          status: 'on-leave',
          emergencyContact: '+254733333333',
          address: 'Machakos',
          joinDate: '2022-05-10',
          rating: 4.9,
          totalTrips: 2100,
          incidents: 0
        },
        {
          id: 'DRV004',
          name: 'Mary Driver',
          email: 'mary.driver@school.com',
          phone: '+254700000004',
          licenseNumber: 'L901234',
          licenseExpiry: '2024-09-20',
          experience: 3,
          assignedBus: '',
          status: 'active',
          emergencyContact: '+254744444444',
          address: 'Thika',
          joinDate: '2024-08-01',
          rating: 4.2,
          totalTrips: 320,
          incidents: 0
        }
      ];
      setDrivers(mockDrivers);
    } catch (error) {
      toast.error('Failed to fetch drivers');
    } finally {
      setLoading(false);
    }
  };

  const fetchBuses = async () => {
    const data = await transportService.getBuses();
    setBuses(Array.isArray(data) ? data : []);
  };

  const fetchDriverStats = (driver) => {
    // Mock stats - replace with real API call
    setDriverStats({
      monthlyTrips: 45,
      avgSpeed: 52,
      onTimeRate: 94,
      fuelEfficiency: 8.2,
      studentCompliments: 12,
      safetyScore: 98,
      lastTrip: '2024-02-19T14:30:00',
      nextTrip: '2024-02-20T06:30:00'
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDriver) {
        toast.success('Driver updated successfully');
      } else {
        toast.success('Driver added successfully');
      }
      setShowForm(false);
      setEditingDriver(null);
      setFormData({
        name: '',
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
      fetchDrivers();
    } catch (error) {
      toast.error('Failed to save driver');
    }
  };

  const handleEdit = (driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      email: driver.email,
      phone: driver.phone,
      licenseNumber: driver.licenseNumber,
      licenseExpiry: driver.licenseExpiry,
      experience: driver.experience,
      assignedBus: driver.assignedBus || '',
      status: driver.status,
      emergencyContact: driver.emergencyContact || '',
      address: driver.address || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this driver?')) return;
    try {
      toast.success('Driver deleted successfully');
      fetchDrivers();
    } catch (error) {
      toast.error('Failed to delete driver');
    }
  };

  const handleViewStats = (driver) => {
    setSelectedDriver(driver);
    fetchDriverStats(driver);
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
        <h3 style={{ margin: 0 }}>Driver Management</h3>
        <button
          onClick={() => {
            setEditingDriver(null);
            setFormData({
              name: '',
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
            {Math.round(drivers.reduce((sum, d) => sum + (d.rating || 0), 0) / drivers.length * 10) / 10}
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
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Full Name *
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
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
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

              <div style={{ marginBottom: '15px' }}>
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

              <div style={{ marginBottom: '15px' }}>
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

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Years of Experience
                </label>
                <input
                  type="number"
                  name="experience"
                  value={formData.experience}
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
                    <option key={bus._id} value={bus.busNumber}>
                      {bus.busNumber} - {bus.route || 'No route'}
                    </option>
                  ))}
                </select>
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
                  <option value="on-leave">On Leave</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Emergency Contact
                </label>
                <input
                  type="tel"
                  name="emergencyContact"
                  value={formData.emergencyContact}
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
                  Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
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
              borderLeft: `4px solid ${getStatusColor(driver.status)}`
            }}
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
                  {driver.name.charAt(0)}
                </div>
                <div>
                  <h4 style={{ margin: 0 }}>{driver.name}</h4>
                  <div style={{ fontSize: '12px', color: '#666' }}>{driver.email}</div>
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
                <div>{driver.phone}</div>
              </div>
              <div>
                <div style={{ color: '#666' }}>🪪 License</div>
                <div>{driver.licenseNumber}</div>
              </div>
              <div>
                <div style={{ color: '#666' }}>📅 Expiry</div>
                <div style={{
                  color: new Date(driver.licenseExpiry) < new Date() ? '#f44336' : 'inherit'
                }}>
                  {format(new Date(driver.licenseExpiry), 'MMM dd, yyyy')}
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
                🚌 Assigned to: <strong>{driver.assignedBus}</strong>
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: '10px',
              borderTop: '1px solid #eee',
              paddingTop: '15px'
            }}>
              <button
                onClick={() => handleViewStats(driver)}
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
                📊 Stats
              </button>
              <button
                onClick={() => handleEdit(driver)}
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
                onClick={() => handleDelete(driver.id)}
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
            width: '500px',
            maxWidth: '90%'
          }}>
            <h3 style={{ margin: '0 0 20px 0' }}>
              {selectedDriver.name} - Performance Stats
            </h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '15px',
              marginBottom: '20px'
            }}>
              <div style={{ textAlign: 'center', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>Monthly Trips</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{driverStats.monthlyTrips}</div>
              </div>
              <div style={{ textAlign: 'center', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>Avg Speed</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{driverStats.avgSpeed} km/h</div>
              </div>
              <div style={{ textAlign: 'center', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>On-Time Rate</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4CAF50' }}>
                  {driverStats.onTimeRate}%
                </div>
              </div>
              <div style={{ textAlign: 'center', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>Safety Score</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2196F3' }}>
                  {driverStats.safetyScore}%
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>Fuel Efficiency</span>
                <span>{driverStats.fuelEfficiency} km/l</span>
              </div>
              <div style={{
                width: '100%',
                height: '8px',
                background: '#f0f0f0',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${(driverStats.fuelEfficiency / 10) * 100}%`,
                  height: '100%',
                  background: '#4CAF50'
                }} />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', marginBottom: '5px' }}>
                🎖️ Student Compliments: {driverStats.studentCompliments}
              </div>
              <div style={{ fontSize: '14px', marginBottom: '5px' }}>
                🕐 Last Trip: {format(new Date(driverStats.lastTrip), 'MMM dd, HH:mm')}
              </div>
              <div style={{ fontSize: '14px' }}>
                ⏰ Next Trip: {format(new Date(driverStats.nextTrip), 'MMM dd, HH:mm')}
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedDriver(null);
                setDriverStats(null);
              }}
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

      {drivers.length === 0 && !loading && (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          background: 'white',
          borderRadius: '8px'
        }}>
          <p style={{ color: '#666' }}>No drivers found. Click "Add New Driver" to get started.</p>
        </div>
      )}
    </div>
  );
}