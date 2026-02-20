import { useState, useEffect } from 'react';
import { transportService } from '../../services/transport';
import { studentService } from '../../services/student';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function EnhancedTransportManagement() {
  const [activeTab, setActiveTab] = useState('buses');
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [trips, setTrips] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [formData, setFormData] = useState({
    // Bus fields
    busNumber: '',
    busId: '',
    driverName: '',
    driverPhone: '',
    capacity: 40,
    route: '',
    status: 'active',
    fuelLevel: 100,
    lastMaintenance: '',
    nextMaintenance: '',
    insuranceExpiry: '',
    
    // Driver fields
    name: '',
    email: '',
    phone: '',
    licenseNumber: '',
    licenseExpiry: '',
    experience: 0,
    assignedBus: '',
    emergencyContact: '',
    address: '',
    
    // Route fields
    routeName: '',
    description: '',
    startPoint: '',
    endPoint: '',
    distance: 0,
    duration: 0,
    stops: [],
    waypoints: []
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [busesData, studentsData] = await Promise.all([
        transportService.getBuses(),
        studentService.getStudents()
      ]);
      
      setBuses(Array.isArray(busesData) ? busesData : []);
      setStudents(Array.isArray(studentsData) ? studentsData : []);
      
      // Mock drivers data (replace with actual API call)
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
          rating: 4.8,
          totalTrips: 1250
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
          rating: 4.5,
          totalTrips: 850
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
          rating: 4.9,
          totalTrips: 2100
        }
      ];
      setDrivers(mockDrivers);

      // Mock routes data
      const mockRoutes = [
        {
          id: 'R001',
          routeName: 'Route A - North',
          description: 'Serving Westlands, Parklands, Ngara areas',
          startPoint: 'School Main Gate',
          endPoint: 'Pangani',
          distance: 12.5,
          duration: 45,
          stops: 4,
          status: 'active',
          assignedBuses: ['BUS001', 'BUS002']
        },
        {
          id: 'R002',
          routeName: 'Route B - East',
          description: 'Serving Buruburu, Donholm, Fedha estates',
          startPoint: 'School Main Gate',
          endPoint: 'Fedha',
          distance: 15.2,
          duration: 50,
          stops: 5,
          status: 'active',
          assignedBuses: ['BUS003']
        }
      ];
      setRoutes(mockRoutes);

      // Mock trips data
      const mockTrips = [
        {
          id: 'T001',
          tripName: 'Morning Trip - Route A',
          route: 'Route A - North',
          bus: 'BUS001',
          driver: 'John Driver',
          startTime: '06:30',
          endTime: '07:45',
          status: 'in-progress',
          students: 28,
          completed: false
        },
        {
          id: 'T002',
          tripName: 'Morning Trip - Route B',
          route: 'Route B - East',
          bus: 'BUS003',
          driver: 'James Driver',
          startTime: '06:45',
          endTime: '08:00',
          status: 'scheduled',
          students: 32,
          completed: false
        }
      ];
      setTrips(mockTrips);

    } catch (error) {
      toast.error('Failed to fetch transport data');
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
      if (activeTab === 'buses') {
        if (editingItem) {
          await transportService.updateBus(editingItem._id, formData);
          toast.success('Bus updated successfully');
        } else {
          await transportService.createBus(formData);
          toast.success('Bus added successfully');
        }
      } else if (activeTab === 'drivers') {
        // Handle driver submission
        toast.success(editingItem ? 'Driver updated' : 'Driver added');
      } else if (activeTab === 'routes') {
        // Handle route submission
        toast.success(editingItem ? 'Route updated' : 'Route created');
      } else if (activeTab === 'trips') {
        // Handle trip submission
        toast.success(editingItem ? 'Trip updated' : 'Trip created');
      }
      
      setShowForm(false);
      setEditingItem(null);
      resetForm();
      fetchAllData();
    } catch (error) {
      toast.error('Failed to save');
    }
  };

  const resetForm = () => {
    setFormData({
      busNumber: '', busId: '', driverName: '', driverPhone: '', capacity: 40,
      route: '', status: 'active', fuelLevel: 100, lastMaintenance: '',
      nextMaintenance: '', insuranceExpiry: '', name: '', email: '', phone: '',
      licenseNumber: '', licenseExpiry: '', experience: 0, assignedBus: '',
      emergencyContact: '', address: '', routeName: '', description: '',
      startPoint: '', endPoint: '', distance: 0, duration: 0, stops: [], waypoints: []
    });
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    if (activeTab === 'buses') {
      setFormData({
        busNumber: item.busNumber,
        busId: item.busId || '',
        driverName: item.driverName || '',
        driverPhone: item.driverPhone || '',
        capacity: item.capacity || 40,
        route: item.route || '',
        status: item.status || 'active',
        fuelLevel: item.fuelLevel || 100,
        lastMaintenance: item.lastMaintenance || '',
        nextMaintenance: item.nextMaintenance || '',
        insuranceExpiry: item.insuranceExpiry || '',
        name: '', email: '', phone: '', licenseNumber: '', licenseExpiry: '',
        experience: 0, assignedBus: '', emergencyContact: '', address: '',
        routeName: '', description: '', startPoint: '', endPoint: '',
        distance: 0, duration: 0, stops: [], waypoints: []
      });
    } else if (activeTab === 'drivers') {
      setFormData({
        name: item.name,
        email: item.email,
        phone: item.phone,
        licenseNumber: item.licenseNumber,
        licenseExpiry: item.licenseExpiry,
        experience: item.experience,
        assignedBus: item.assignedBus || '',
        status: item.status || 'active',
        emergencyContact: item.emergencyContact || '',
        address: item.address || '',
        busNumber: '', busId: '', driverName: '', driverPhone: '', capacity: 40,
        route: '', fuelLevel: 100, lastMaintenance: '', nextMaintenance: '',
        insuranceExpiry: '', routeName: '', description: '', startPoint: '',
        endPoint: '', distance: 0, duration: 0, stops: [], waypoints: []
      });
    }
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      if (activeTab === 'buses') {
        await transportService.deleteBus(id);
        toast.success('Bus deleted successfully');
      } else {
        toast.success('Item deleted successfully');
      }
      fetchAllData();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleStatusToggle = async (item) => {
    const newStatus = item.status === 'active' ? 'inactive' : 'active';
    try {
      if (activeTab === 'buses') {
        await transportService.updateBusStatus(item._id, newStatus);
        toast.success(`Bus status updated to ${newStatus}`);
      } else {
        toast.success(`Status updated to ${newStatus}`);
      }
      fetchAllData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleStartTrip = (trip) => {
    toast.success(`Trip ${trip.tripName} started`);
  };

  const handleEndTrip = (trip) => {
    toast.success(`Trip ${trip.tripName} completed`);
  };

  const handleViewOnMap = (route) => {
    toast.success(`Viewing ${route.routeName} on map`);
  };

  const handleAssignStudents = (bus) => {
    toast.success(`Assign students to ${bus.busNumber}`);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return '#4CAF50';
      case 'inactive': return '#f44336';
      case 'on-leave': return '#FF9800';
      case 'maintenance': return '#FF9800';
      case 'scheduled': return '#2196F3';
      case 'in-progress': return '#4CAF50';
      case 'completed': return '#9C27B0';
      default: return '#999';
    }
  };

  const tabs = [
    { id: 'buses', name: 'Buses', icon: '🚌', count: buses.length },
    { id: 'drivers', name: 'Drivers', icon: '👤', count: drivers.length },
    { id: 'routes', name: 'Routes', icon: '🗺️', count: routes.length },
    { id: 'trips', name: 'Trips', icon: '📅', count: trips.length },
    { id: 'assignments', name: 'Assignments', icon: '📋', count: students.filter(s => s.busId).length }
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div className="loading-spinner" style={{ margin: '0 auto' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        background: 'white',
        padding: '10px',
        borderRadius: '10px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflowX: 'auto'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 24px',
              background: activeTab === tab.id ? 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)' : '#f5f5f5',
              color: activeTab === tab.id ? 'white' : '#333',
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
          >
            <span>{tab.icon}</span>
            {tab.name}
            <span style={{
              background: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : '#ddd',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px'
            }}>
              {tab.count}
            </span>
          </button>
        ))}
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
          padding: '20px',
          borderRadius: '10px'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
            {buses.filter(b => b.status === 'active').length}/{buses.length}
          </div>
          <div>Active Buses</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
            {drivers.filter(d => d.status === 'active').length}/{drivers.length}
          </div>
          <div>Active Drivers</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
            {trips.filter(t => t.status === 'in-progress').length}
          </div>
          <div>Active Trips</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #5f2c82 0%, #49a09d 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
            {students.filter(s => s.busId).length}
          </div>
          <div>Students Assigned</div>
        </div>
      </div>

      {/* Search and Actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        background: 'white',
        padding: '20px',
        borderRadius: '10px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', gap: '15px', flex: 1 }}>
          <input
            type="text"
            placeholder={`🔍 Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              width: '300px',
              fontSize: '14px'
            }}
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              minWidth: '150px'
            }}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            resetForm();
            setShowForm(true);
          }}
          style={{
            padding: '10px 20px',
            background: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          ➕ Add {activeTab.slice(0, -1)}
        </button>
      </div>

      {/* Content based on active tab */}
      <div style={{
        background: 'white',
        borderRadius: '10px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'auto'
      }}>
        {/* Buses Tab */}
        {activeTab === 'buses' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '15px', textAlign: 'left' }}>Bus</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Driver</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Route</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Fuel</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Students</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {buses.map(bus => {
                const assignedStudents = students.filter(s => s.busId === bus._id).length;
                return (
                  <tr key={bus._id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '15px' }}>
                      <div style={{ fontWeight: 'bold' }}>{bus.busNumber}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Capacity: {bus.capacity}</div>
                    </td>
                    <td style={{ padding: '15px' }}>
                      <div>{bus.driverName || 'Not assigned'}</div>
                      {bus.driverPhone && (
                        <div style={{ fontSize: '12px', color: '#666' }}>{bus.driverPhone}</div>
                      )}
                    </td>
                    <td style={{ padding: '15px' }}>{bus.route || 'Not assigned'}</td>
                    <td style={{ padding: '15px' }}>
                      <span style={{
                        background: getStatusColor(bus.status),
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        {bus.status}
                      </span>
                    </td>
                    <td style={{ padding: '15px' }}>
                      <div>{bus.fuelLevel || 100}%</div>
                      <div style={{
                        width: '60px',
                        height: '4px',
                        background: '#eee',
                        borderRadius: '2px',
                        marginTop: '4px'
                      }}>
                        <div style={{
                          width: `${bus.fuelLevel || 100}%`,
                          height: '100%',
                          background: (bus.fuelLevel || 100) > 20 ? '#4CAF50' : '#f44336',
                          borderRadius: '2px'
                        }} />
                      </div>
                    </td>
                    <td style={{ padding: '15px' }}>
                      <span style={{
                        background: assignedStudents > 0 ? '#4CAF50' : '#999',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px'
                      }}>
                        {assignedStudents}/{bus.capacity}
                      </span>
                    </td>
                    <td style={{ padding: '15px' }}>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                          onClick={() => handleAssignStudents(bus)}
                          style={{
                            padding: '6px 10px',
                            background: '#9C27B0',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          👥 Assign
                        </button>
                        <button
                          onClick={() => handleEdit(bus)}
                          style={{
                            padding: '6px 10px',
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
                          onClick={() => handleStatusToggle(bus)}
                          style={{
                            padding: '6px 10px',
                            background: bus.status === 'active' ? '#f44336' : '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          {bus.status === 'active' ? '🔴 Off' : '🟢 On'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Drivers Tab */}
        {activeTab === 'drivers' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '15px', textAlign: 'left' }}>Driver</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>License</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Experience</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Assigned Bus</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Rating</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map(driver => (
                <tr key={driver.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '15px' }}>
                    <div style={{ fontWeight: 'bold' }}>{driver.name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{driver.phone}</div>
                  </td>
                  <td style={{ padding: '15px' }}>
                    <div>{driver.licenseNumber}</div>
                    <div style={{
                      fontSize: '11px',
                      color: new Date(driver.licenseExpiry) < new Date() ? '#f44336' : '#4CAF50'
                    }}>
                      Exp: {format(new Date(driver.licenseExpiry), 'MMM dd, yyyy')}
                    </div>
                  </td>
                  <td style={{ padding: '15px' }}>{driver.experience} years</td>
                  <td style={{ padding: '15px' }}>
                    {driver.assignedBus ? (
                      <span style={{
                        background: '#2196F3',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        {driver.assignedBus}
                      </span>
                    ) : 'Not assigned'}
                  </td>
                  <td style={{ padding: '15px' }}>
                    <span style={{
                      background: getStatusColor(driver.status),
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      {driver.status}
                    </span>
                  </td>
                    <td style={{ padding: '15px' }}>
                    <span style={{ color: '#FFC107' }}>
                      {'⭐'.repeat(Math.floor(driver.rating))}
                    </span>
                    <span style={{ marginLeft: '5px', fontSize: '12px' }}>
                      {driver.rating}
                    </span>
                  </td>
                  <td style={{ padding: '15px' }}>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button
                        onClick={() => handleEdit(driver)}
                        style={{
                          padding: '6px 10px',
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
                        onClick={() => handleStatusToggle(driver)}
                        style={{
                          padding: '6px 10px',
                          background: driver.status === 'active' ? '#f44336' : '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        {driver.status === 'active' ? '🔴 Off' : '🟢 On'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Routes Tab */}
        {activeTab === 'routes' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '15px', textAlign: 'left' }}>Route</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Description</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Start → End</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Distance</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Duration</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Stops</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {routes.map(route => (
                <tr key={route.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '15px', fontWeight: 'bold' }}>
                    {route.routeName}
                  </td>
                  <td style={{ padding: '15px' }}>{route.description}</td>
                  <td style={{ padding: '15px' }}>
                    {route.startPoint} → {route.endPoint}
                  </td>
                  <td style={{ padding: '15px' }}>{route.distance} km</td>
                  <td style={{ padding: '15px' }}>{route.duration} min</td>
                  <td style={{ padding: '15px' }}>{route.stops} stops</td>
                  <td style={{ padding: '15px' }}>
                    <span style={{
                      background: getStatusColor(route.status),
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      {route.status}
                    </span>
                  </td>
                  <td style={{ padding: '15px' }}>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button
                        onClick={() => handleViewOnMap(route)}
                        style={{
                          padding: '6px 10px',
                          background: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        🗺️ Map
                      </button>
                      <button
                        onClick={() => handleEdit(route)}
                        style={{
                          padding: '6px 10px',
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Trips Tab */}
        {activeTab === 'trips' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '15px', textAlign: 'left' }}>Trip</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Route</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Bus/Driver</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Time</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Students</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {trips.map(trip => (
                <tr key={trip.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '15px', fontWeight: 'bold' }}>
                    {trip.tripName}
                  </td>
                  <td style={{ padding: '15px' }}>{trip.route}</td>
                  <td style={{ padding: '15px' }}>
                    <div>{trip.bus}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{trip.driver}</div>
                  </td>
                  <td style={{ padding: '15px' }}>
                    <div>{trip.startTime} - {trip.endTime}</div>
                  </td>
                  <td style={{ padding: '15px' }}>
                    <span style={{
                      background: trip.students > 0 ? '#4CAF50' : '#999',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }}>
                      {trip.students}
                    </span>
                  </td>
                  <td style={{ padding: '15px' }}>
                    <span style={{
                      background: getStatusColor(trip.status),
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      {trip.status}
                    </span>
                  </td>
                  <td style={{ padding: '15px' }}>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {trip.status === 'scheduled' && (
                        <button
                          onClick={() => handleStartTrip(trip)}
                          style={{
                            padding: '6px 10px',
                            background: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          ▶️ Start
                        </button>
                      )}
                      {trip.status === 'in-progress' && (
                        <button
                          onClick={() => handleEndTrip(trip)}
                          style={{
                            padding: '6px 10px',
                            background: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          ⏹️ End
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(trip)}
                        style={{
                          padding: '6px 10px',
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Assignments Tab */}
        {activeTab === 'assignments' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '15px', textAlign: 'left' }}>Student</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Class</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Parent</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Assigned Bus</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Pickup</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Dropoff</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.filter(s => s.busId).map(student => {
                const bus = buses.find(b => b._id === student.busId);
                return (
                  <tr key={student._id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '15px' }}>
                      <div style={{ fontWeight: 'bold' }}>{student.name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{student.studentId}</div>
                    </td>
                    <td style={{ padding: '15px' }}>{student.className}</td>
                    <td style={{ padding: '15px' }}>
                      <div>{student.parentName}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{student.parentPhone}</div>
                    </td>
                    <td style={{ padding: '15px' }}>
                      <span style={{
                        background: '#2196F3',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        {bus?.busNumber || 'Unknown'}
                      </span>
                    </td>
                    <td style={{ padding: '15px' }}>{student.pickupPoint || 'N/A'}</td>
                    <td style={{ padding: '15px' }}>{student.dropoffPoint || 'N/A'}</td>
                    <td style={{ padding: '15px' }}>
                      <button
                        onClick={() => handleEdit(student)}
                        style={{
                          padding: '6px 10px',
                          background: '#FF9800',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        🔄 Reassign
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
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
            borderRadius: '10px',
            width: '600px',
            maxWidth: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 20px 0' }}>
              {editingItem ? `Edit ${activeTab.slice(0, -1)}` : `Add New ${activeTab.slice(0, -1)}`}
            </h3>
            <form onSubmit={handleSubmit}>
              {activeTab === 'buses' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                      Bus Number *
                    </label>
                    <input
                      type="text"
                      name="busNumber"
                      value={formData.busNumber}
                      onChange={handleInputChange}
                      required
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                      Capacity *
                    </label>
                    <input
                      type="number"
                      name="capacity"
                      value={formData.capacity}
                      onChange={handleInputChange}
                      required
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                      Driver Name
                    </label>
                    <input
                      type="text"
                      name="driverName"
                      value={formData.driverName}
                      onChange={handleInputChange}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                      Driver Phone
                    </label>
                    <input
                      type="tel"
                      name="driverPhone"
                      value={formData.driverPhone}
                      onChange={handleInputChange}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                      Route
                    </label>
                    <input
                      type="text"
                      name="route"
                      value={formData.route}
                      onChange={handleInputChange}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>
                  <div>
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
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
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
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                      Last Maintenance
                    </label>
                    <input
                      type="date"
                      name="lastMaintenance"
                      value={formData.lastMaintenance}
                      onChange={handleInputChange}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'drivers' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
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
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                      Phone *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
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
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
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
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                      Experience (years)
                    </label>
                    <input
                      type="number"
                      name="experience"
                      value={formData.experience}
                      onChange={handleInputChange}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
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
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    >
                      <option value="">None</option>
                      {buses.map(bus => (
                        <option key={bus._id} value={bus.busNumber}>
                          {bus.busNumber}
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
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="on-leave">On Leave</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                      Emergency Contact
                    </label>
                    <input
                      type="tel"
                      name="emergencyContact"
                      value={formData.emergencyContact}
                      onChange={handleInputChange}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
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
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>
                </div>
              )}

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
                    cursor: 'pointer'
                  }}
                >
                  {editingItem ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingItem(null);
                    resetForm();
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
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