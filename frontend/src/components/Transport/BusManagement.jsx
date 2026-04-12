/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { transportService } from '../../services/transport';
import { userService } from '../../services/user';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function BusManagement({ onBusSelect, selectedBusId }) {
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedBus, setSelectedBus] = useState(null);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
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
    fetchStudents();
  }, []);

  const fetchBuses = async () => {
    try {
      setLoading(true);
      const data = await transportService.getBuses();
      setBuses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching buses:', error);
      toast.error('Failed to fetch buses');
      setBuses([]);
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
      setDrivers([]);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/students', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setStudents(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
    }
  };

  const fetchAvailableStudents = async (busId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/students`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      const studentsData = data.data || [];
      const available = studentsData.filter(s => 
        !s.busId && !s.transportDetails?.busId && s.usesTransport !== false
      );
      setAvailableStudents(available);
      setSelectedStudents([]);
    } catch (error) {
      console.error('Error fetching available students:', error);
      toast.error('Failed to fetch students');
      setAvailableStudents([]);
    }
  };

  const handleAssignStudents = async () => {
    if (!selectedBus) return;
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    setAssignLoading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const studentId of selectedStudents) {
        try {
          const response = await fetch(`http://localhost:5000/api/students/${studentId}/assign-bus`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              busId: selectedBus._id,
              busNumber: selectedBus.busNumber,
              pickupPoint: availableStudents.find(s => s._id === studentId)?.pickupPoint || 'School Gate',
              dropoffPoint: availableStudents.find(s => s._id === studentId)?.dropoffPoint || 'Home'
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to assign student');
          }
          successCount++;
        } catch (error) {
          console.error(`Failed to assign student ${studentId}:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully assigned ${successCount} student(s) to bus ${selectedBus.busNumber}`);
      }
      if (failCount > 0) {
        toast.error(`Failed to assign ${failCount} student(s)`);
      }
      
      setShowAssignModal(false);
      setSelectedBus(null);
      setSelectedStudents([]);
      fetchBuses();
      fetchStudents();
    } catch (error) {
      console.error('Error assigning students:', error);
      toast.error(error.message || 'Failed to assign students');
    } finally {
      setAssignLoading(false);
    }
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleViewAssignments = (bus) => {
    setSelectedBus(bus);
    fetchAvailableStudents(bus._id);
    setShowAssignModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'driverId') {
      const selectedDriver = drivers.find(d => d._id === value);
      if (selectedDriver) {
        setFormData(prev => ({
          ...prev,
          driverId: value,
          driverName: `${selectedDriver.firstName || ''} ${selectedDriver.lastName || ''}`.trim(),
          driverPhone: selectedDriver.phone || ''
        }));
        
        if (editingBus) {
          updateBusDriver(editingBus._id, value, selectedDriver);
        }
        return;
      }
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const updateBusDriver = async (busId, driverId, driver) => {
    try {
      await fetch(`http://localhost:5000/api/buses/${busId}/assign-driver`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          driverId, 
          driverName: `${driver.firstName} ${driver.lastName}`.trim(),
          driverPhone: driver.phone 
        })
      });
    } catch (error) {
      console.error('Error updating bus driver:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
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

      let savedBus;
      if (editingBus) {
        savedBus = await transportService.updateBus(editingBus._id, busData);
        toast.success('Bus updated successfully');
      } else {
        savedBus = await transportService.createBus(busData);
        toast.success('Bus added successfully');
      }
      
      setShowForm(false);
      setEditingBus(null);
      resetForm();
      fetchBuses();
      
      if (onBusSelect && savedBus) {
        onBusSelect(savedBus);
      }
    } catch (error) {
      console.error('Error saving bus:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to save bus');
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
      toast.error(error.response?.data?.message || 'Failed to delete bus');
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
      toast.error(error.response?.data?.message || 'Failed to update status');
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

  const getStatusIcon = (status) => {
    switch(status) {
      case 'active': return '✅';
      case 'maintenance': return '🔧';
      case 'inactive': return '⛔';
      default: return '❓';
    }
  };

  const getAssignedStudentsCount = (busId) => {
    return students.filter(s => s.busId === busId || s.transportDetails?.busId === busId).length;
  };

  // Filter buses based on search and status
  const filteredBuses = buses.filter(bus => {
    const matchesSearch = searchTerm === '' || 
      bus.busNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (bus.registrationNumber && bus.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (bus.driverName && bus.driverName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || bus.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div className="loading-spinner" style={{ margin: '0 auto', width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #2196F3', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '10px', color: '#666' }}>Loading buses...</p>
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
          <h3 style={{ margin: 0 }}>🚌 Bus Fleet Management</h3>
          <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
            Manage your bus fleet, assign drivers, and track student assignments
          </p>
        </div>
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
          ➕ Add New Bus
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
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{buses.length}</div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Buses</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
            {buses.filter(b => b.status === 'active').length}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Active Buses</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
            {buses.filter(b => b.status === 'maintenance').length}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>In Maintenance</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #5f2c82 0%, #49a09d 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
            {buses.reduce((sum, b) => sum + (b.capacity || 0), 0)}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Capacity</div>
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
          placeholder="🔍 Search buses by number, registration, or driver..."
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
          <option value="maintenance">🔧 Maintenance</option>
          <option value="inactive">⛔ Inactive</option>
        </select>
      </div>

      {/* Buses Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
        gap: '20px'
      }}>
        {filteredBuses.map(bus => {
          const assignedCount = getAssignedStudentsCount(bus._id);
          return (
            <div
              key={bus._id}
              style={{
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                borderLeft: `4px solid ${getStatusColor(bus.status)}`,
                transition: 'all 0.3s ease',
                overflow: 'hidden',
                ...(selectedBusId === bus._id ? {
                  boxShadow: '0 4px 16px rgba(33, 150, 243, 0.3)',
                  transform: 'translateY(-2px)'
                } : {})
              }}
              onClick={() => onBusSelect && onBusSelect(bus)}
            >
              <div style={{ padding: '20px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '15px'
                }}>
                  <div>
                    <h4 style={{ margin: 0, color: '#2196F3', fontSize: '18px' }}>{bus.busNumber}</h4>
                    {bus.registrationNumber && (
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        Reg: {bus.registrationNumber}
                      </div>
                    )}
                    {bus.busId && (
                      <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                        ID: {bus.busId}
                      </div>
                    )}
                  </div>
                  <span style={{
                    background: getStatusColor(bus.status),
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {getStatusIcon(bus.status)} {bus.status === 'active' ? 'Active' : bus.status === 'maintenance' ? 'Maintenance' : 'Inactive'}
                  </span>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>👨‍✈️ Driver</div>
                  <div style={{ fontWeight: '500' }}>{bus.driverName || 'Not assigned'}</div>
                  {bus.driverPhone && (
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>📞 {bus.driverPhone}</div>
                  )}
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '15px'
                }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666' }}>📍 Route</div>
                    <div style={{ fontWeight: '500', fontSize: '14px' }}>{bus.route || 'Not assigned'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666' }}>👥 Capacity</div>
                    <div style={{ fontWeight: '500', fontSize: '14px' }}>{bus.capacity || 40} students</div>
                  </div>
                </div>

                {/* Assigned Students */}
                <div style={{
                  marginBottom: '15px',
                  padding: '8px 12px',
                  background: '#e3f2fd',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '13px' }}>🎓 Assigned Students</span>
                  <span style={{
                    background: assignedCount > 0 ? '#4CAF50' : '#999',
                    color: 'white',
                    padding: '2px 10px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {assignedCount} / {bus.capacity || 40}
                  </span>
                </div>

                {/* Fuel Level */}
                <div style={{ marginBottom: '15px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    marginBottom: '6px'
                  }}>
                    <span>⛽ Fuel Level</span>
                    <span style={{ fontWeight: 'bold' }}>{bus.fuelLevel || 100}%</span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    background: '#f0f0f0',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${bus.fuelLevel || 100}%`,
                      height: '100%',
                      background: (bus.fuelLevel || 100) > 20 ? '#4CAF50' : '#f44336',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>

                {/* Maintenance Info */}
                {bus.nextMaintenance && (
                  <div style={{
                    fontSize: '11px',
                    color: new Date(bus.nextMaintenance) < new Date() ? '#f44336' : '#666',
                    marginBottom: '15px',
                    padding: '6px 10px',
                    background: '#f9f9f9',
                    borderRadius: '6px'
                  }}>
                    🔧 Next maintenance: {new Date(bus.nextMaintenance).toLocaleDateString()}
                  </div>
                )}

                {bus.lastMaintenance && (
                  <div style={{
                    fontSize: '11px',
                    color: '#666',
                    marginBottom: '10px',
                    padding: '4px 8px',
                    background: '#f5f5f5',
                    borderRadius: '4px'
                  }}>
                    🛠️ Last maintenance: {new Date(bus.lastMaintenance).toLocaleDateString()}
                  </div>
                )}

                {bus.currentLocation && (
                  <div style={{
                    fontSize: '12px',
                    color: '#666',
                    marginBottom: '15px',
                    padding: '8px',
                    background: '#e8f5e9',
                    borderRadius: '6px'
                  }}>
                    📍 Last seen: {new Date(bus.currentLocation.timestamp).toLocaleTimeString()}
                    <br />
                    Speed: {bus.currentLocation.speed || 0} km/h
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
                      handleEdit(bus);
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#1976D2'}
                    onMouseLeave={(e) => e.target.style.background = '#2196F3'}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewAssignments(bus);
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
                    👥 Assign
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusToggle(bus);
                    }}
                    style={{
                      flex: 0.8,
                      padding: '8px 12px',
                      background: bus.status === 'active' ? '#FF9800' : '#4CAF50',
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
                    {bus.status === 'active' ? '🔧 Maint' : '✅ Activate'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(bus._id);
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
          );
        })}
      </div>

      {filteredBuses.length === 0 && !loading && (
        <div style={{
          textAlign: 'center',
          padding: '60px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🚌</div>
          <h3 style={{ marginBottom: '8px', color: '#333' }}>No buses found</h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            {searchTerm || filterStatus !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Get started by adding your first bus to the fleet'}
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
                setEditingBus(null);
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
              ➕ Add New Bus
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
            width: '600px',
            maxWidth: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>
              {editingBus ? '✏️ Edit Bus' : '➕ Add New Bus'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Bus Number * <span style={{ color: '#999', fontSize: '12px' }}>(e.g., KAA 123A)</span>
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
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Registration Number * <span style={{ color: '#999', fontSize: '12px' }}>(e.g., KCA 123T)</span>
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
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

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
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

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
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
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
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

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
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
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
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="active">✅ Active</option>
                  <option value="maintenance">🔧 Maintenance</option>
                  <option value="inactive">⛔ Inactive</option>
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
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

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
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

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
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

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
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
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
                  {editingBus ? 'Update Bus' : 'Add Bus'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingBus(null);
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

      {/* Student Assignment Modal */}
      {showAssignModal && selectedBus && (
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
            width: '600px',
            maxWidth: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#333' }}>
                  Assign Students to Bus {selectedBus.busNumber}
                </h3>
                <p style={{ color: '#666', marginTop: '5px' }}>
                  Capacity: {selectedBus.capacity} students | Currently assigned: {getAssignedStudentsCount(selectedBus._id)}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedBus(null);
                  setSelectedStudents([]);
                }}
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

            <input
              type="text"
              placeholder="🔍 Search students by name or admission number..."
              onChange={(e) => {
                const searchTerm = e.target.value.toLowerCase();
                const filtered = availableStudents.filter(s => 
                  `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm) ||
                  s.admissionNumber?.toLowerCase().includes(searchTerm)
                );
                setAvailableStudents(filtered);
              }}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '14px'
              }}
            />

            <div style={{
              maxHeight: '400px',
              overflowY: 'auto',
              border: '1px solid #eee',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              {availableStudents.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                  No unassigned students found
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa', position: 'sticky', top: 0 }}>
                      <th style={{ padding: '12px', textAlign: 'left', width: '40px' }}>
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudents(availableStudents.map(s => s._id));
                            } else {
                              setSelectedStudents([]);
                            }
                          }}
                          checked={selectedStudents.length === availableStudents.length && availableStudents.length > 0}
                        />
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Student Name</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Admission No.</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Class</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableStudents.map(student => (
                      <tr key={student._id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px' }}>
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(student._id)}
                            onChange={() => toggleStudentSelection(student._id)}
                          />
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: '500' }}>
                            {student.firstName} {student.lastName}
                          </div>
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>
                          {student.admissionNumber || 'N/A'}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {student.classLevel || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              padding: '12px',
              background: '#f5f5f5',
              borderRadius: '8px'
            }}>
              <span>Selected: <strong>{selectedStudents.length}</strong> students</span>
              <span>Bus Capacity: <strong>{selectedBus.capacity}</strong></span>
              {selectedStudents.length > selectedBus.capacity && (
                <span style={{ color: '#f44336' }}>⚠️ Exceeds capacity!</span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleAssignStudents}
                disabled={selectedStudents.length === 0 || assignLoading}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: selectedStudents.length === 0 ? '#ccc' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: selectedStudents.length === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {assignLoading ? 'Assigning...' : `Assign ${selectedStudents.length} Student(s)`}
              </button>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedBus(null);
                  setSelectedStudents([]);
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}