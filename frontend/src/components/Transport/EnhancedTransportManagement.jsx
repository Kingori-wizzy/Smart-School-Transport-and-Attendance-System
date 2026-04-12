/* eslint-disable no-dupe-keys */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function EnhancedTransportManagement() {
  const [activeTab, setActiveTab] = useState('buses');
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [trips, setTrips] = useState([]);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Assignment Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedBusForAssignment, setSelectedBusForAssignment] = useState(null);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);
  
  // Trip Student Assignment Modal State
  const [showTripAssignModal, setShowTripAssignModal] = useState(false);
  const [selectedTripForAssignment, setSelectedTripForAssignment] = useState(null);
  const [availableStudentsForTrip, setAvailableStudentsForTrip] = useState([]);
  const [selectedStudentsForTrip, setSelectedStudentsForTrip] = useState([]);
  const [tripAssignLoading, setTripAssignLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    // Bus fields
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
    insuranceExpiry: '',
    
    // Driver fields
    firstName: '',
    lastName: '',
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
    stops: 0,
    waypoints: [],
    
    // Trip fields
    tripName: '',
    routeId: '',
    busId: '',
    driverId: '',
    startTime: '',
    endTime: '',
    tripDate: '',
    tripType: 'morning',
    status: 'scheduled',
    
    // Assignment fields
    studentId: '',
    busAssignmentId: ''
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      const [busesData, studentsData, driversData, routesData, tripsData] = await Promise.allSettled([
        fetchBusesFromAPI(),
        fetchStudentsFromAPI(),
        fetchDriversFromAPI(),
        fetchRoutesFromAPI(),
        fetchTripsFromAPI()
      ]);
      
      if (busesData.status === 'fulfilled') {
        setBuses(Array.isArray(busesData.value) ? busesData.value : []);
      } else {
        console.error('Error fetching buses:', busesData.reason);
        setBuses([]);
      }

      if (studentsData.status === 'fulfilled') {
        const studentsArray = studentsData.value?.data || studentsData.value || [];
        setStudents(Array.isArray(studentsArray) ? studentsArray : []);
      } else {
        console.error('Error fetching students:', studentsData.reason);
        setStudents([]);
      }

      if (driversData.status === 'fulfilled') {
        setDrivers(driversData.value);
      } else {
        console.error('Error fetching drivers:', driversData.reason);
        setDrivers([]);
      }

      if (routesData.status === 'fulfilled') {
        setRoutes(routesData.value);
      } else {
        console.error('Error fetching routes:', routesData.reason);
        setRoutes([]);
      }

      if (tripsData.status === 'fulfilled') {
        setTrips(tripsData.value);
      } else {
        console.error('Error fetching trips:', tripsData.reason);
        setTrips([]);
      }

      const studentsWithBuses = (studentsData.status === 'fulfilled' 
        ? (studentsData.value?.data || studentsData.value || [])
        : []).filter(s => s.busId || s.transportDetails?.busId);
      setAssignments(studentsWithBuses);

    } catch (error) {
      console.error('Error fetching all data:', error);
      toast.error('Failed to fetch transport data');
    } finally {
      setLoading(false);
    }
  };

  const fetchBusesFromAPI = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/buses', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (!data.success) return [];
      return data.data || [];
    } catch (error) {
      console.error('Error fetching buses:', error);
      return [];
    }
  };

  const fetchStudentsFromAPI = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/students', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (!data.success) return { data: [] };
      return data;
    } catch (error) {
      console.error('Error fetching students:', error);
      return { data: [] };
    }
  };

  const fetchDriversFromAPI = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/users?role=driver', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (!data.success) return [];
      
      return (data.data || []).map(d => ({
        id: d._id,
        _id: d._id,
        firstName: d.firstName || '',
        lastName: d.lastName || '',
        name: `${d.firstName || ''} ${d.lastName || ''}`.trim(),
        email: d.email || '',
        phone: d.phone || '',
        licenseNumber: d.driverDetails?.licenseNumber || '',
        licenseExpiry: d.driverDetails?.licenseExpiry || new Date().toISOString().split('T')[0],
        experience: d.driverDetails?.experience || 0,
        assignedBus: d.driverDetails?.assignedBus || '',
        status: d.isActive !== false ? 'active' : 'inactive',
        rating: d.driverDetails?.rating || 4.5,
        totalTrips: d.driverDetails?.totalTrips || 0
      }));
    } catch (error) {
      console.error('Error fetching drivers:', error);
      return [];
    }
  };

  const fetchRoutesFromAPI = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/routes', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (!data.success) return [];
      
      return (data.data || []).map(route => {
        let startPoint = '';
        let endPoint = '';
        if (route.stops && route.stops.length > 0) {
          startPoint = route.stops[0].name || '';
          endPoint = route.stops[route.stops.length - 1].name || '';
        }
        
        return {
          id: route._id,
          _id: route._id,
          routeName: route.name || 'Unnamed Route',
          description: route.description || '',
          startPoint: startPoint,
          endPoint: endPoint,
          distance: route.distance || 0,
          duration: route.estimatedDuration || 0,
          stops: route.stops?.length || 0,
          status: route.active !== false ? 'active' : 'inactive',
          assignedBuses: route.busId ? [route.busId] : []
        };
      });
    } catch (error) {
      console.error('Error fetching routes:', error);
      return [];
    }
  };

  const fetchTripsFromAPI = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/trips', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (!data.success) return [];
      
      return (data.data || []).map(trip => ({
        id: trip._id,
        _id: trip._id,
        tripName: `${trip.routeName || 'Trip'}${trip.tripType ? ` - ${trip.tripType}` : ''}`,
        route: trip.routeName || 'Unknown Route',
        routeId: trip.routeId,
        bus: trip.vehicleId || 'Unknown Bus',
        busNumber: trip.vehicleId,
        busId: trip.busId || trip.vehicleId,
        driver: typeof trip.driverId === 'object' ? trip.driverId?.name || 'Unknown Driver' : 'Unknown Driver',
        driverId: typeof trip.driverId === 'object' ? trip.driverId?._id : trip.driverId,
        startTime: trip.scheduledStartTime ? format(new Date(trip.scheduledStartTime), 'HH:mm') : '--:--',
        endTime: trip.scheduledEndTime ? format(new Date(trip.scheduledEndTime), 'HH:mm') : '--:--',
        tripDate: trip.scheduledStartTime ? format(new Date(trip.scheduledStartTime), 'yyyy-MM-dd') : '',
        tripType: trip.tripType || 'morning',
        status: trip.status || 'scheduled',
        students: trip.students || [],
        studentsCount: trip.students?.length || 0
      }));
    } catch (error) {
      console.error('Error fetching trips:', error);
      return [];
    }
  };

  const fetchStudentsNotInTrip = async (tripId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/students/unassigned-trips/list?tripId=${tripId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (!data.success) return [];
      return data.data || [];
    } catch (error) {
      console.error('Error fetching unassigned students:', error);
      return [];
    }
  };

  const assignStudentToTrip = async (studentId, tripId, tripType) => {
    try {
      const response = await fetch(`http://localhost:5000/api/trips/${tripId}/assign-student`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ studentId, tripType })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to assign student');
      return true;
    } catch (error) {
      console.error('Error assigning student to trip:', error);
      throw error;
    }
  };

  const removeStudentFromTrip = async (studentId, tripId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/trips/${tripId}/remove-student`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ studentId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to remove student');
      return true;
    } catch (error) {
      console.error('Error removing student from trip:', error);
      throw error;
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'driverId') {
      const selectedDriver = drivers.find(d => d._id === value);
      if (selectedDriver) {
        setFormData(prev => ({
          ...prev,
          driverId: value,
          driverName: selectedDriver.name,
          driverPhone: selectedDriver.phone
        }));
        return;
      }
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (activeTab === 'buses') {
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

        const url = editingItem 
          ? `http://localhost:5000/api/buses/${editingItem._id}`
          : 'http://localhost:5000/api/buses';
        const method = editingItem ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
          method,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(busData)
        });
        
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Failed to save bus');
        
        toast.success(editingItem ? 'Bus updated successfully' : 'Bus added successfully');
      } 
      else if (activeTab === 'drivers') {
        if (!formData.firstName || !formData.lastName) {
          toast.error('First name and last name are required');
          return;
        }
        if (!formData.phone) {
          toast.error('Phone number is required');
          return;
        }

        const fullName = `${formData.firstName} ${formData.lastName}`.trim();
        let email = formData.email;
        if (!email) {
          email = `${formData.firstName.toLowerCase()}.${formData.lastName.toLowerCase()}.${Date.now()}@driver.com`;
        }

        let formattedPhone = formData.phone;
        const phoneDigits = formData.phone.replace(/\D/g, '');
        if (phoneDigits.length >= 10) {
          formattedPhone = phoneDigits.slice(0, 10);
        }

        const driverData = {
          name: fullName,
          email: email,
          password: 'password123',
          phone: formattedPhone,
          role: 'driver',
          isActive: formData.status === 'active',
          firstName: formData.firstName,
          lastName: formData.lastName
        };

        if (formData.licenseNumber) {
          driverData.driverDetails = {
            licenseNumber: formData.licenseNumber,
            licenseExpiry: formData.licenseExpiry || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            experience: parseInt(formData.experience) || 0,
            assignedBus: formData.assignedBus || null
          };
        }

        const url = editingItem 
          ? `http://localhost:5000/api/users/${editingItem._id}`
          : 'http://localhost:5000/api/users';
        const method = editingItem ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
          method,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(driverData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          if (result.errors) {
            const errorMessages = result.errors.map(e => e.msg).join(', ');
            throw new Error(errorMessages);
          }
          throw new Error(result.message || 'Failed to save driver');
        }
        
        toast.success(editingItem ? 'Driver updated successfully' : 'Driver added successfully');
      }
      else if (activeTab === 'routes') {
        const routeData = {
          name: formData.routeName,
          description: formData.description,
          distance: parseFloat(formData.distance) || 0,
          estimatedDuration: parseInt(formData.duration) || 0,
          active: formData.status === 'active',
          stops: []
        };
        
        if (formData.startPoint) {
          routeData.stops.push({ name: formData.startPoint, order: 0 });
        }
        if (formData.endPoint && formData.endPoint !== formData.startPoint) {
          routeData.stops.push({ name: formData.endPoint, order: 1 });
        }

        const url = editingItem 
          ? `http://localhost:5000/api/routes/${editingItem._id}`
          : 'http://localhost:5000/api/routes';
        const method = editingItem ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
          method,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(routeData)
        });
        
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Failed to save route');
        
        toast.success(editingItem ? 'Route updated successfully' : 'Route created successfully');
      }
      else if (activeTab === 'trips') {
        if (!formData.routeId) {
          toast.error('Please select a route');
          return;
        }
        if (!formData.driverId) {
          toast.error('Please select a driver');
          return;
        }
        if (!formData.tripDate || !formData.startTime) {
          toast.error('Please select trip date and time');
          return;
        }

        const selectedRoute = routes.find(r => r._id === formData.routeId);
        const selectedBus = buses.find(b => b._id === formData.busId);
        
        const tripData = {
          routeName: selectedRoute?.routeName || '',
          routeId: formData.routeId,
          vehicleId: selectedBus?.busNumber || '',
          busId: formData.busId || null,
          driverId: formData.driverId,
          tripType: formData.tripType || 'morning',
          scheduledStartTime: new Date(`${formData.tripDate}T${formData.startTime}:00`).toISOString(),
          scheduledEndTime: formData.endTime ? new Date(`${formData.tripDate}T${formData.endTime}:00`).toISOString() : null,
          status: formData.status || 'scheduled'
        };

        const url = editingItem 
          ? `http://localhost:5000/api/trips/${editingItem._id}`
          : 'http://localhost:5000/api/trips';
        const method = editingItem ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
          method,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(tripData)
        });
        
        const result = await response.json();
        
        if (!response.ok) throw new Error(result.message || 'Failed to save trip');
        
        toast.success(editingItem ? 'Trip updated successfully' : 'Trip created successfully');
      }
      
      setShowForm(false);
      setEditingItem(null);
      resetForm();
      fetchAllData();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error(error.message || 'Failed to save');
    }
  };

  const resetForm = () => {
    setFormData({
      busNumber: '', registrationNumber: '', busId: '', driverId: '', driverName: '', driverPhone: '',
      capacity: 40, route: '', status: 'active', fuelLevel: 100, lastMaintenance: '',
      nextMaintenance: '', insuranceExpiry: '', firstName: '', lastName: '',
      email: '', phone: '', licenseNumber: '', licenseExpiry: '', experience: 0,
      assignedBus: '', emergencyContact: '', address: '', routeName: '',
      description: '', startPoint: '', endPoint: '', distance: 0, duration: 0,
      stops: 0, waypoints: [], tripName: '', routeId: '', busId: '', driverId: '',
      startTime: '', endTime: '', tripDate: '', tripType: 'morning', status: 'scheduled', 
      studentId: '', busAssignmentId: ''
    });
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    if (activeTab === 'buses') {
      setFormData({
        ...formData,
        busNumber: item.busNumber || '',
        registrationNumber: item.registrationNumber || '',
        busId: item.busId || '',
        driverId: item.driverId?._id || item.driverId || '',
        driverName: item.driverName || '',
        driverPhone: item.driverPhone || '',
        capacity: item.capacity || 40,
        route: item.route || '',
        status: item.status || 'active',
        fuelLevel: item.fuelLevel || 100,
        lastMaintenance: item.lastMaintenance ? item.lastMaintenance.split('T')[0] : '',
        nextMaintenance: item.nextMaintenance ? item.nextMaintenance.split('T')[0] : '',
        insuranceExpiry: item.insuranceExpiry ? item.insuranceExpiry.split('T')[0] : ''
      });
    } else if (activeTab === 'drivers') {
      setFormData({
        ...formData,
        firstName: item.firstName || '',
        lastName: item.lastName || '',
        email: item.email || '',
        phone: item.phone || '',
        licenseNumber: item.licenseNumber || '',
        licenseExpiry: item.licenseExpiry ? item.licenseExpiry.split('T')[0] : '',
        experience: item.experience || 0,
        assignedBus: item.assignedBus || '',
        status: item.status || 'active',
        emergencyContact: item.emergencyContact || '',
        address: item.address || ''
      });
    } else if (activeTab === 'routes') {
      setFormData({
        ...formData,
        routeName: item.routeName || '',
        description: item.description || '',
        startPoint: item.startPoint || '',
        endPoint: item.endPoint || '',
        distance: item.distance || 0,
        duration: item.duration || 0,
        stops: item.stops || 0,
        status: item.status || 'active'
      });
    } else if (activeTab === 'trips') {
      setFormData({
        ...formData,
        routeId: item.routeId || item.route?._id || '',
        busId: item.busId || (item.busNumber ? buses.find(b => b.busNumber === item.busNumber)?._id : ''),
        driverId: item.driverId || item.driver?._id || '',
        startTime: item.startTime || '',
        endTime: item.endTime || '',
        tripDate: item.tripDate || '',
        tripType: item.tripType || 'morning',
        status: item.status || 'scheduled'
      });
    }
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      let url = '';
      if (activeTab === 'buses') url = `http://localhost:5000/api/buses/${id}`;
      else if (activeTab === 'drivers') url = `http://localhost:5000/api/users/${id}`;
      else if (activeTab === 'routes') url = `http://localhost:5000/api/routes/${id}`;
      else if (activeTab === 'trips') url = `http://localhost:5000/api/trips/${id}`;
      else return;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete');
      }
      
      toast.success(`${activeTab.slice(0, -1)} deleted successfully`);
      fetchAllData();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error(error.message || 'Failed to delete');
    }
  };

  const handleStatusToggle = async (item) => {
    const newStatus = item.status === 'active' ? 'inactive' : 'active';
    try {
      if (activeTab === 'buses') {
        const response = await fetch(`http://localhost:5000/api/buses/${item._id}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: newStatus })
        });
        if (!response.ok) throw new Error('Failed to update status');
        toast.success(`Bus status updated to ${newStatus}`);
      } else if (activeTab === 'drivers') {
        const response = await fetch(`http://localhost:5000/api/users/${item._id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ isActive: newStatus === 'active' })
        });
        if (!response.ok) throw new Error('Failed to update status');
        toast.success(`Driver ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      }
      fetchAllData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error.message || 'Failed to update status');
    }
  };

  const handleStartTrip = async (trip) => {
    try {
      const response = await fetch(`http://localhost:5000/api/trips/${trip._id}/start`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to start trip');
      toast.success('Trip started successfully');
      fetchAllData();
    } catch (error) {
      console.error('Error starting trip:', error);
      toast.error(error.message || 'Failed to start trip');
    }
  };

  const handleEndTrip = async (trip) => {
    try {
      const response = await fetch(`http://localhost:5000/api/trips/${trip._id}/complete`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to end trip');
      toast.success('Trip ended successfully');
      fetchAllData();
    } catch (error) {
      console.error('Error ending trip:', error);
      toast.error(error.message || 'Failed to end trip');
    }
  };

  const openTripAssignModal = async (trip) => {
    setSelectedTripForAssignment(trip);
    setTripAssignLoading(true);
    try {
      const unassignedStudents = await fetchStudentsNotInTrip(trip._id);
      setAvailableStudentsForTrip(unassignedStudents);
      setSelectedStudentsForTrip([]);
      setShowTripAssignModal(true);
    } catch (error) {
      console.error('Error fetching unassigned students:', error);
      toast.error('Failed to fetch students');
    } finally {
      setTripAssignLoading(false);
    }
  };

  const handleAssignStudentsToTrip = async () => {
    if (!selectedTripForAssignment) return;
    if (selectedStudentsForTrip.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    setTripAssignLoading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const studentId of selectedStudentsForTrip) {
        try {
          await assignStudentToTrip(studentId, selectedTripForAssignment._id, selectedTripForAssignment.tripType);
          successCount++;
        } catch (error) {
          console.error(`Failed to assign student ${studentId}:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully assigned ${successCount} student(s) to trip`);
      }
      if (failCount > 0) {
        toast.error(`Failed to assign ${failCount} student(s)`);
      }
      
      setShowTripAssignModal(false);
      setSelectedTripForAssignment(null);
      setSelectedStudentsForTrip([]);
      fetchAllData();
    } catch (error) {
      console.error('Error assigning students to trip:', error);
      toast.error(error.message || 'Failed to assign students');
    } finally {
      setTripAssignLoading(false);
    }
  };

  const handleRemoveStudentFromTrip = async (tripId, studentId, studentName) => {
    if (!window.confirm(`Remove ${studentName} from this trip?`)) return;
    
    try {
      await removeStudentFromTrip(studentId, tripId);
      toast.success(`${studentName} removed from trip`);
      fetchAllData();
    } catch (error) {
      console.error('Error removing student:', error);
      toast.error(error.message || 'Failed to remove student');
    }
  };

  const toggleStudentSelectionForTrip = (studentId) => {
    setSelectedStudentsForTrip(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleViewOnMap = (route) => {
    toast.success(`Viewing ${route.routeName} on map`);
  };

  const openAssignModal = (bus) => {
    setSelectedBusForAssignment(bus);
    fetchAvailableStudents(bus._id);
    setShowAssignModal(true);
  };

  const fetchAvailableStudents = async (busId) => {
    try {
      const response = await fetch('http://localhost:5000/api/students', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      const studentsData = data.data || [];
      const available = studentsData.filter(s => 
        (!s.busId && !s.transportDetails?.busId) || s.usesTransport === false
      );
      setAvailableStudents(available);
      setSelectedStudents([]);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to fetch students');
    }
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleAssignStudents = async () => {
    if (!selectedBusForAssignment) return;
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
              busId: selectedBusForAssignment._id,
              busNumber: selectedBusForAssignment.busNumber,
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
        toast.success(`Successfully assigned ${successCount} student(s) to bus ${selectedBusForAssignment.busNumber}`);
      }
      if (failCount > 0) {
        toast.error(`Failed to assign ${failCount} student(s)`);
      }
      
      setShowAssignModal(false);
      setSelectedBusForAssignment(null);
      setSelectedStudents([]);
      fetchAllData();
    } catch (error) {
      console.error('Error assigning students:', error);
      toast.error(error.message || 'Failed to assign students');
    } finally {
      setAssignLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'active': return '#4CAF50';
      case 'inactive': return '#f44336';
      case 'on-leave': return '#FF9800';
      case 'maintenance': return '#FF9800';
      case 'scheduled': return '#2196F3';
      case 'running': return '#4CAF50';
      case 'in-progress': return '#4CAF50';
      case 'completed': return '#9C27B0';
      case 'cancelled': return '#f44336';
      default: return '#999';
    }
  };

  const tabs = [
    { id: 'buses', name: 'Buses', count: buses.length },
    { id: 'drivers', name: 'Drivers', count: drivers.length },
    { id: 'routes', name: 'Routes', count: routes.length },
    { id: 'trips', name: 'Trips', count: trips.length },
    { id: 'assignments', name: 'Assignments', count: assignments.length }
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div className="loading-spinner" style={{ margin: '0 auto' }} />
        <p style={{ marginTop: '10px', color: '#666' }}>Loading transport data...</p>
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
            {trips.filter(t => t.status === 'scheduled' || t.status === 'running').length}
          </div>
          <div>Active/Scheduled Trips</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #5f2c82 0%, #49a09d 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
            {assignments.length}
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
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <div style={{ display: 'flex', gap: '15px', flex: 1, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
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
          Add {activeTab === 'assignments' ? 'Assignment' : activeTab.slice(0, -1)}
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
                <th style={{ padding: '15px', textAlign: 'left' }}>Reg No.</th>
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
                const assignedStudents = students.filter(s => s.busId === bus._id || s.transportDetails?.busId === bus._id).length;
                return (
                  <tr key={bus._id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '15px' }}>
                      <div style={{ fontWeight: 'bold' }}>{bus.busNumber}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Capacity: {bus.capacity}</div>
                    </td>
                    <td style={{ padding: '15px' }}>
                      <div>{bus.registrationNumber || 'N/A'}</div>
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
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => openAssignModal(bus)}
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
                          Assign
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
                          Edit
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
                          {bus.status === 'active' ? 'Deactivate' : 'Activate'}
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
                        {buses.find(b => b._id === driver.assignedBus)?.busNumber || 'Unknown'}
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
                      {'★'.repeat(Math.floor(driver.rating))}
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
                        Edit
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
                        {driver.status === 'active' ? 'Deactivate' : 'Activate'}
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
                <th style={{ padding: '15px', textAlign: 'left' }}>Start - End</th>
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
                    {route.startPoint} - {route.endPoint}
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
                        Map
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
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(route.id)}
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
                        Delete
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
                    <div style={{ fontSize: '11px', color: '#666' }}>{trip.tripDate}</div>
                    </td>
                  <td style={{ padding: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        background: trip.studentsCount > 0 ? '#4CAF50' : '#999',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px'
                      }}>
                        {trip.studentsCount}
                      </span>
                      {trip.studentsCount > 0 && (
                        <button
                          onClick={() => {
                            const studentList = trip.students?.map(s => 
                              `${s.firstName} ${s.lastName}`
                            ).join('\n') || 'No student details';
                            alert(`Students on this trip:\n\n${studentList}`);
                          }}
                          style={{
                            padding: '4px 8px',
                            background: '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px'
                          }}
                        >
                          View
                        </button>
                      )}
                    </div>
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
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
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
                          Start
                        </button>
                      )}
                      {trip.status === 'running' && (
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
                          End
                        </button>
                      )}
                      <button
                        onClick={() => openTripAssignModal(trip)}
                        style={{
                          padding: '6px 10px',
                          background: '#9C27B0',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                        title="Assign students to this trip"
                      >
                        Assign
                      </button>
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
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(trip.id)}
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
                        Delete
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
              {assignments.map(student => {
                const bus = buses.find(b => b._id === (student.busId || student.transportDetails?.busId));
                return (
                  <tr key={student._id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '15px' }}>
                      <div style={{ fontWeight: 'bold' }}>{student.name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{student.admissionNumber}</div>
                      </td>
                    <td style={{ padding: '15px' }}>{student.classLevel}</td>
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
                        Reassign
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
          zIndex: 1000,
          overflowY: 'auto'
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
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Bus Number *</label>
                    <input type="text" name="busNumber" value={formData.busNumber} onChange={handleInputChange} required placeholder="KAA 123A" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Registration Number *</label>
                    <input type="text" name="registrationNumber" value={formData.registrationNumber} onChange={handleInputChange} required placeholder="KCA 123T" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Assign Driver</label>
                    <select name="driverId" value={formData.driverId} onChange={handleInputChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
                      <option value="">Select Driver (Optional)</option>
                      {drivers.map(driver => (
                        <option key={driver._id} value={driver._id}>{driver.name} - {driver.phone}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Capacity</label>
                    <input type="number" name="capacity" value={formData.capacity} onChange={handleInputChange} min="1" max="100" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Route</label>
                    <input type="text" name="route" value={formData.route} onChange={handleInputChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Fuel Level (%)</label>
                    <input type="number" name="fuelLevel" value={formData.fuelLevel} onChange={handleInputChange} min="0" max="100" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Status</label>
                    <select name="status" value={formData.status} onChange={handleInputChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Last Maintenance</label>
                    <input type="date" name="lastMaintenance" value={formData.lastMaintenance} onChange={handleInputChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Next Maintenance</label>
                    <input type="date" name="nextMaintenance" value={formData.nextMaintenance} onChange={handleInputChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Insurance Expiry</label>
                    <input type="date" name="insuranceExpiry" value={formData.insuranceExpiry} onChange={handleInputChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                </div>
              )}

              {activeTab === 'drivers' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>First Name *</label>
                    <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Last Name *</label>
                    <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Optional - auto-generated if empty" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Phone Number *</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>License Number *</label>
                    <input type="text" name="licenseNumber" value={formData.licenseNumber} onChange={handleInputChange} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>License Expiry *</label>
                    <input type="date" name="licenseExpiry" value={formData.licenseExpiry} onChange={handleInputChange} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Experience (years)</label>
                    <input type="number" name="experience" value={formData.experience} onChange={handleInputChange} min="0" max="50" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Assign Bus</label>
                    <select name="assignedBus" value={formData.assignedBus} onChange={handleInputChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
                      <option value="">Unassigned</option>
                      {buses.map(bus => (
                        <option key={bus._id} value={bus._id}>{bus.busNumber}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Status</label>
                    <select name="status" value={formData.status} onChange={handleInputChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Emergency Contact</label>
                    <input type="tel" name="emergencyContact" value={formData.emergencyContact} onChange={handleInputChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Address</label>
                    <textarea name="address" value={formData.address} onChange={handleInputChange} rows="3" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                </div>
              )}

              {activeTab === 'routes' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Route Name *</label>
                    <input type="text" name="routeName" value={formData.routeName} onChange={handleInputChange} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Description</label>
                    <textarea name="description" value={formData.description} onChange={handleInputChange} rows="3" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Start Point</label>
                    <input type="text" name="startPoint" value={formData.startPoint} onChange={handleInputChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>End Point</label>
                    <input type="text" name="endPoint" value={formData.endPoint} onChange={handleInputChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Distance (km)</label>
                    <input type="number" name="distance" value={formData.distance} onChange={handleInputChange} step="0.1" min="0" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Duration (min)</label>
                    <input type="number" name="duration" value={formData.duration} onChange={handleInputChange} min="0" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Number of Stops</label>
                    <input type="number" name="stops" value={formData.stops} onChange={handleInputChange} min="0" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Status</label>
                    <select name="status" value={formData.status} onChange={handleInputChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              )}

              {activeTab === 'trips' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Route *</label>
                    <select name="routeId" value={formData.routeId} onChange={handleInputChange} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
                      <option value="">Select Route</option>
                      {routes.map(route => (
                        <option key={route._id} value={route._id}>{route.routeName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Bus</label>
                    <select name="busId" value={formData.busId} onChange={handleInputChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
                      <option value="">Select Bus (Optional)</option>
                      {buses.map(bus => (
                        <option key={bus._id} value={bus._id}>{bus.busNumber}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Driver *</label>
                    <select name="driverId" value={formData.driverId} onChange={handleInputChange} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
                      <option value="">Select Driver</option>
                      {drivers.map(driver => (
                        <option key={driver._id} value={driver._id}>{driver.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Trip Date *</label>
                    <input type="date" name="tripDate" value={formData.tripDate} onChange={handleInputChange} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Start Time *</label>
                    <input type="time" name="startTime" value={formData.startTime} onChange={handleInputChange} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>End Time</label>
                    <input type="time" name="endTime" value={formData.endTime} onChange={handleInputChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Trip Type</label>
                    <select name="tripType" value={formData.tripType} onChange={handleInputChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
                      <option value="morning">Morning Pickup</option>
                      <option value="afternoon">Afternoon Dropoff</option>
                      <option value="special">Special Trip</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Status</label>
                    <select name="status" value={formData.status} onChange={handleInputChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
                      <option value="scheduled">Scheduled</option>
                      <option value="running">Running</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" style={{ flex: 1, padding: '12px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                  {editingItem ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditingItem(null); resetForm(); }} style={{ flex: 1, padding: '12px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Assignment Modal (Bus) */}
      {showAssignModal && selectedBusForAssignment && (
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
            borderRadius: '10px',
            width: '600px',
            maxWidth: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 10px 0' }}>
              Assign Students to Bus {selectedBusForAssignment.busNumber}
            </h3>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Select students to assign to this bus. Capacity: {selectedBusForAssignment.capacity}
            </p>

            <input
              type="text"
              placeholder="Search students by name or admission number..."
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
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
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
                          {student.admissionNumber}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {student.classLevel}
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
              padding: '10px',
              background: '#f5f5f5',
              borderRadius: '6px'
            }}>
              <span>Selected: <strong>{selectedStudents.length}</strong> students</span>
              <span>Bus Capacity: <strong>{selectedBusForAssignment.capacity}</strong></span>
              {selectedStudents.length > selectedBusForAssignment.capacity && (
                <span style={{ color: '#f44336' }}>Exceeds capacity!</span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleAssignStudents}
                disabled={selectedStudents.length === 0 || assignLoading}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: selectedStudents.length === 0 ? '#ccc' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
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
                  setSelectedBusForAssignment(null);
                  setSelectedStudents([]);
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
          </div>
        </div>
      )}

      {/* Trip Student Assignment Modal */}
      {showTripAssignModal && selectedTripForAssignment && (
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
          zIndex: 1002,
          overflowY: 'auto'
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '10px',
            width: '700px',
            maxWidth: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 10px 0' }}>
              Assign Students to Trip
            </h3>
            <p style={{ color: '#666', marginBottom: '5px' }}>
              <strong>{selectedTripForAssignment.tripName}</strong>
            </p>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Bus: {selectedTripForAssignment.bus} | Time: {selectedTripForAssignment.startTime} - {selectedTripForAssignment.endTime}
            </p>

            <div style={{
              marginBottom: '20px',
              padding: '12px',
              background: '#e3f2fd',
              borderRadius: '6px'
            }}>
              <strong>Currently assigned students:</strong> {selectedTripForAssignment.studentsCount}
              {selectedTripForAssignment.studentsCount > 0 && (
                <button
                  onClick={() => {
                    const studentList = selectedTripForAssignment.students?.map(s => 
                      `${s.firstName} ${s.lastName}`
                    ).join('\n') || 'No student details';
                    alert(`Students currently on this trip:\n\n${studentList}`);
                  }}
                  style={{
                    marginLeft: '10px',
                    padding: '4px 12px',
                    background: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  View List
                </button>
              )}
            </div>

            <input
              type="text"
              placeholder="Search students by name or admission number..."
              onChange={(e) => {
                const searchTerm = e.target.value.toLowerCase();
                const filtered = availableStudentsForTrip.filter(s => 
                  `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm) ||
                  s.admissionNumber?.toLowerCase().includes(searchTerm)
                );
                setAvailableStudentsForTrip(filtered);
              }}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                marginBottom: '20px',
                fontSize: '14px'
              }}
            />

            {tripAssignLoading && availableStudentsForTrip.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div className="loading-spinner" style={{ margin: '0 auto' }} />
                <p style={{ marginTop: '10px', color: '#666' }}>Loading students...</p>
              </div>
            ) : (
              <div style={{
                maxHeight: '400px',
                overflowY: 'auto',
                border: '1px solid #eee',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                {availableStudentsForTrip.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                    No unassigned students found. All students may already be assigned to this trip.
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
                                setSelectedStudentsForTrip(availableStudentsForTrip.map(s => s._id));
                              } else {
                                setSelectedStudentsForTrip([]);
                              }
                            }}
                            checked={selectedStudentsForTrip.length === availableStudentsForTrip.length && availableStudentsForTrip.length > 0}
                          />
                        </th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Student Name</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Admission No.</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Class</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Assigned Bus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availableStudentsForTrip.map(student => (
                        <tr key={student._id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '12px' }}>
                            <input
                              type="checkbox"
                              checked={selectedStudentsForTrip.includes(student._id)}
                              onChange={() => toggleStudentSelectionForTrip(student._id)}
                            />
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: '500' }}>
                              {student.firstName} {student.lastName}
                            </div>
                          </td>
                          <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>
                            {student.admissionNumber}
                          </td>
                          <td style={{ padding: '12px' }}>
                            {student.classLevel}
                          </td>
                          <td style={{ padding: '12px' }}>
                            {student.transportDetails?.busId?.busNumber || student.busId?.busNumber || 'Not assigned'}
                                                    </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              padding: '10px',
              background: '#f5f5f5',
              borderRadius: '6px'
            }}>
              <span>Selected: <strong>{selectedStudentsForTrip.length}</strong> students</span>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleAssignStudentsToTrip}
                disabled={selectedStudentsForTrip.length === 0 || tripAssignLoading}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: selectedStudentsForTrip.length === 0 ? '#ccc' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: selectedStudentsForTrip.length === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {tripAssignLoading ? 'Assigning...' : `Assign ${selectedStudentsForTrip.length} Student(s)`}
              </button>
              <button
                onClick={() => {
                  setShowTripAssignModal(false);
                  setSelectedTripForAssignment(null);
                  setSelectedStudentsForTrip([]);
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
          </div>
        </div>
      )}
    </div>
  );
}