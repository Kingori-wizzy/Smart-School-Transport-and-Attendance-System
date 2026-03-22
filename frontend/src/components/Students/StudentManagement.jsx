/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function StudentManagement() {
  const [students, setStudents] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [filterBus, setFilterBus] = useState('all');
  const [filterTransport, setFilterTransport] = useState('all');
  
  const [formData, setFormData] = useState({
    admissionNumber: '',
    firstName: '',
    lastName: '',
    age: '',
    gender: 'Male',
    classLevel: '',
    stream: '',
    parentId: '',
    guardianContact: '',
    usesTransport: true,
    transportDetails: {
      pickupPoint: { name: '', coordinates: { lat: 0, lng: 0 } },
      dropoffPoint: { name: '', coordinates: { lat: 0, lng: 0 } },
      busId: '',
      status: 'pending'
    },
    medicalNotes: '',
    emergencyContact: ''
  });

  const classes = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 
                   'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Form 1', 'Form 2', 'Form 3', 'Form 4'];

  const genders = ['Male', 'Female', 'Other'];

  useEffect(() => {
    fetchStudents();
    fetchBuses();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/students', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setStudents(data.data || []);
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to fetch students');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBuses = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/buses', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setBuses(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching buses:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'usesTransport') {
      setFormData(prev => ({ ...prev, usesTransport: checked }));
    } else if (name.startsWith('transportDetails.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        transportDetails: {
          ...prev.transportDetails,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.admissionNumber) {
      toast.error('Admission number is required');
      return;
    }
    if (!formData.firstName || !formData.lastName) {
      toast.error('First name and last name are required');
      return;
    }
    if (!formData.guardianContact) {
      toast.error('Guardian contact is required');
      return;
    }

    try {
      const studentData = {
        admissionNumber: formData.admissionNumber.toUpperCase(),
        firstName: formData.firstName,
        lastName: formData.lastName,
        age: parseInt(formData.age) || 0,
        gender: formData.gender,
        classLevel: formData.classLevel,
        stream: formData.stream || '',
        guardianContact: formData.guardianContact,
        usesTransport: formData.usesTransport,
        transportDetails: {
          pickupPoint: {
            name: formData.transportDetails.pickupPoint?.name || '',
            coordinates: { lat: 0, lng: 0 }
          },
          dropoffPoint: {
            name: formData.transportDetails.dropoffPoint?.name || '',
            coordinates: { lat: 0, lng: 0 }
          },
          busId: formData.transportDetails.busId || null,
          status: formData.transportDetails.busId ? 'active' : 'pending'
        },
        medicalNotes: formData.medicalNotes || '',
        emergencyContact: formData.emergencyContact || ''
      };

      const url = editingStudent 
        ? `http://localhost:5000/api/students/${editingStudent._id}`
        : 'http://localhost:5000/api/students';
      const method = editingStudent ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(studentData)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to save student');
      }
      
      toast.success(editingStudent ? 'Student updated successfully' : 'Student added successfully');
      setShowForm(false);
      setEditingStudent(null);
      resetForm();
      fetchStudents();
    } catch (error) {
      console.error('Error saving student:', error);
      toast.error(error.message || 'Failed to save student');
    }
  };

  const resetForm = () => {
    setFormData({
      admissionNumber: '',
      firstName: '',
      lastName: '',
      age: '',
      gender: 'Male',
      classLevel: '',
      stream: '',
      parentId: '',
      guardianContact: '',
      usesTransport: true,
      transportDetails: {
        pickupPoint: { name: '', coordinates: { lat: 0, lng: 0 } },
        dropoffPoint: { name: '', coordinates: { lat: 0, lng: 0 } },
        busId: '',
        status: 'pending'
      },
      medicalNotes: '',
      emergencyContact: ''
    });
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      admissionNumber: student.admissionNumber || '',
      firstName: student.firstName || '',
      lastName: student.lastName || '',
      age: student.age || '',
      gender: student.gender || 'Male',
      classLevel: student.classLevel || '',
      stream: student.stream || '',
      parentId: student.parentId?._id || student.parentId || '',
      guardianContact: student.guardianContact || '',
      usesTransport: student.usesTransport !== false,
      transportDetails: {
        pickupPoint: student.transportDetails?.pickupPoint || { name: '', coordinates: { lat: 0, lng: 0 } },
        dropoffPoint: student.transportDetails?.dropoffPoint || { name: '', coordinates: { lat: 0, lng: 0 } },
        busId: student.transportDetails?.busId?._id || student.transportDetails?.busId || student.busId || '',
        status: student.transportDetails?.status || 'pending'
      },
      medicalNotes: student.medicalNotes || '',
      emergencyContact: student.emergencyContact || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student? This action cannot be undone.')) return;
    try {
      const response = await fetch(`http://localhost:5000/api/students/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete student');
      }
      
      toast.success('Student deleted successfully');
      fetchStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error(error.message || 'Failed to delete student');
    }
  };

  const handleViewDetails = (student) => {
    setSelectedStudent(student);
  };

  const handleExport = async () => {
    try {
      const csvRows = [
        ['Admission Number', 'First Name', 'Last Name', 'Class', 'Gender', 'Guardian Contact', 'Transport', 'Bus', 'Pickup Point', 'Dropoff Point', 'Medical Notes'].join(','),
        ...students.map(s => [
          s.admissionNumber || '',
          s.firstName || '',
          s.lastName || '',
          s.classLevel || '',
          s.gender || '',
          s.guardianContact || '',
          s.usesTransport ? 'Yes' : 'No',
          s.transportDetails?.busId?.busNumber || s.busNumber || 'N/A',
          s.transportDetails?.pickupPoint?.name || s.pickupPoint || '',
          s.transportDetails?.dropoffPoint?.name || s.dropOffPoint || '',
          (s.medicalNotes || '').replace(/,/g, ';')
        ].join(','))
      ];
      
      const csv = csvRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `students-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Students exported successfully');
    } catch (error) {
      console.error('Error exporting students:', error);
      toast.error('Failed to export students');
    }
  };

  const filteredStudents = students.filter(student => {
    const fullName = `${student.firstName || ''} ${student.lastName || ''}`.toLowerCase();
    const matchesSearch = 
      fullName.includes(searchTerm.toLowerCase()) ||
      student.admissionNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.guardianContact?.includes(searchTerm);
    
    const matchesClass = filterClass === 'all' || student.classLevel === filterClass;
    const matchesBus = filterBus === 'all' || student.transportDetails?.busId?._id === filterBus || student.busId === filterBus;
    const matchesTransport = filterTransport === 'all' || 
      (filterTransport === 'transport' && student.usesTransport) ||
      (filterTransport === 'no-transport' && !student.usesTransport);
    
    return matchesSearch && matchesClass && matchesBus && matchesTransport;
  });

  const getBusNumber = (student) => {
    if (student.transportDetails?.busId?.busNumber) return student.transportDetails.busId.busNumber;
    if (student.busNumber) return student.busNumber;
    return 'Not assigned';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div className="loading-spinner" style={{ margin: '0 auto' }} />
        <p style={{ marginTop: '10px', color: '#666' }}>Loading students...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Header with Stats */}
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
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{students.length}</div>
          <div>Total Students</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
            {students.filter(s => s.usesTransport).length}
          </div>
          <div>Use Transport</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
            {students.filter(s => s.transportDetails?.busId || s.busId).length}
          </div>
          <div>Assigned to Bus</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #5f2c82 0%, #49a09d 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
            {new Set(students.map(s => s.classLevel)).size}
          </div>
          <div>Classes</div>
        </div>
      </div>

      {/* Actions Bar */}
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
            placeholder="🔍 Search by name, admission number, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              width: '250px',
              fontSize: '14px'
            }}
          />
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            style={{
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              minWidth: '130px'
            }}
          >
            <option value="all">All Classes</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={filterBus}
            onChange={(e) => setFilterBus(e.target.value)}
            style={{
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              minWidth: '130px'
            }}
          >
            <option value="all">All Buses</option>
            <option value="">Not Assigned</option>
            {buses.map(bus => (
              <option key={bus._id} value={bus._id}>{bus.busNumber}</option>
            ))}
          </select>
          <select
            value={filterTransport}
            onChange={(e) => setFilterTransport(e.target.value)}
            style={{
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              minWidth: '130px'
            }}
          >
            <option value="all">All Students</option>
            <option value="transport">Uses Transport</option>
            <option value="no-transport">No Transport</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleExport}
            style={{
              padding: '10px 20px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            📥 Export CSV
          </button>
          <button
            onClick={() => {
              setEditingStudent(null);
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
            ➕ Add Student
          </button>
        </div>
      </div>

      {/* Students Table */}
      <div style={{
        background: 'white',
        borderRadius: '10px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'auto'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th style={{ padding: '15px', textAlign: 'left' }}>Student</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Admission No.</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Class</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Guardian Contact</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Transport</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Bus</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Actions</th>
             </tr>
          </thead>
          <tbody>
            {filteredStudents.map(student => (
              <tr key={student._id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: `hsl(${(student.firstName?.length || 0) * 30}, 70%, 50%)`,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '18px'
                    }}>
                      {student.firstName?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div style={{ fontWeight: '500' }}>
                        {student.firstName} {student.lastName}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {student.gender} • Age: {student.age || 'N/A'}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '15px' }}>
                  <code style={{ background: '#f5f5f5', padding: '4px 8px', borderRadius: '4px' }}>
                    {student.admissionNumber}
                  </code>
                </td>
                <td style={{ padding: '15px' }}>
                  {student.classLevel}
                  {student.stream && <div style={{ fontSize: '11px', color: '#666' }}>{student.stream}</div>}
                </td>
                <td style={{ padding: '15px' }}>
                  <div>{student.guardianContact}</div>
                  {student.emergencyContact && (
                    <div style={{ fontSize: '11px', color: '#f44336' }}>
                      🚨 Emergency: {student.emergencyContact}
                    </div>
                  )}
                </td>
                <td style={{ padding: '15px' }}>
                  <span style={{
                    background: student.usesTransport ? '#4CAF50' : '#999',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px'
                  }}>
                    {student.usesTransport ? 'Yes' : 'No'}
                  </span>
                </td>
                <td style={{ padding: '15px' }}>
                  {student.usesTransport ? (
                    <span style={{
                      background: getBusNumber(student) !== 'Not assigned' ? '#2196F3' : '#FF9800',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px'
                    }}>
                      {getBusNumber(student)}
                    </span>
                  ) : (
                    <span style={{ color: '#999' }}>N/A</span>
                  )}
                </td>
                <td style={{ padding: '15px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleViewDetails(student)}
                      style={{
                        padding: '6px 12px',
                        background: '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                      title="View Details"
                    >
                      👁️
                    </button>
                    <button
                      onClick={() => handleEdit(student)}
                      style={{
                        padding: '6px 12px',
                        background: '#FF9800',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(student._id)}
                      style={{
                        padding: '6px 12px',
                        background: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredStudents.length === 0 && !loading && (
          <div style={{
            textAlign: 'center',
            padding: '60px',
            color: '#666'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👨‍🎓</div>
            <h3>No students found</h3>
            <p>Try adjusting your search or filters, or add a new student.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Student Modal */}
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
            width: '700px',
            maxWidth: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 20px 0' }}>
              {editingStudent ? 'Edit Student' : 'Add New Student'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Admission Number *
                  </label>
                  <input
                    type="text"
                    name="admissionNumber"
                    value={formData.admissionNumber}
                    onChange={handleInputChange}
                    required
                    placeholder="2024/STU/001"
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
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
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
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
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Age
                  </label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    min="3"
                    max="25"
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  >
                    {genders.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Class *
                  </label>
                  <select
                    name="classLevel"
                    value={formData.classLevel}
                    onChange={handleInputChange}
                    required
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  >
                    <option value="">Select Class</option>
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Stream (Optional)
                  </label>
                  <input
                    type="text"
                    name="stream"
                    value={formData.stream}
                    onChange={handleInputChange}
                    placeholder="East, West, North, etc."
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Guardian Contact *
                  </label>
                  <input
                    type="tel"
                    name="guardianContact"
                    value={formData.guardianContact}
                    onChange={handleInputChange}
                    required
                    placeholder="+254712345678"
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
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
                    placeholder="Alternate contact number"
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <input
                      type="checkbox"
                      name="usesTransport"
                      checked={formData.usesTransport}
                      onChange={handleInputChange}
                      style={{ width: '20px', height: '20px' }}
                    />
                    <span style={{ fontWeight: '500' }}>Student uses school transport</span>
                  </label>
                </div>

                {formData.usesTransport && (
                  <>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                        Assign Bus
                      </label>
                      <select
                        name="transportDetails.busId"
                        value={formData.transportDetails.busId}
                        onChange={handleInputChange}
                        style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                      >
                        <option value="">Select Bus</option>
                        {buses.map(bus => (
                          <option key={bus._id} value={bus._id}>
                            {bus.busNumber} - {bus.route || 'No route'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                        Pickup Point
                      </label>
                      <input
                        type="text"
                        name="transportDetails.pickupPoint.name"
                        value={formData.transportDetails.pickupPoint?.name || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          transportDetails: {
                            ...prev.transportDetails,
                            pickupPoint: { ...prev.transportDetails.pickupPoint, name: e.target.value }
                          }
                        }))}
                        placeholder="Where student gets on"
                        style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                        Dropoff Point
                      </label>
                      <input
                        type="text"
                        name="transportDetails.dropoffPoint.name"
                        value={formData.transportDetails.dropoffPoint?.name || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          transportDetails: {
                            ...prev.transportDetails,
                            dropoffPoint: { ...prev.transportDetails.dropoffPoint, name: e.target.value }
                          }
                        }))}
                        placeholder="Where student gets off"
                        style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                    </div>
                  </>
                )}

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Medical Notes / Special Requirements
                  </label>
                  <textarea
                    name="medicalNotes"
                    value={formData.medicalNotes}
                    onChange={handleInputChange}
                    rows="3"
                    placeholder="Allergies, medications, special needs, etc."
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
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
                  {editingStudent ? 'Update Student' : 'Add Student'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingStudent(null);
                    resetForm();
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

      {/* Student Details Modal */}
      {selectedStudent && (
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
            width: '550px',
            maxWidth: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 20px 0' }}>Student Details</h3>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              marginBottom: '20px',
              padding: '15px',
              background: '#f8f9fa',
              borderRadius: '10px'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                background: `hsl(${(selectedStudent.firstName?.length || 0) * 30}, 70%, 50%)`,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '36px',
                fontWeight: 'bold'
              }}>
                {selectedStudent.firstName?.charAt(0) || '?'}
              </div>
              <div>
                <h2 style={{ margin: '0 0 5px 0' }}>
                  {selectedStudent.firstName} {selectedStudent.lastName}
                </h2>
                <p style={{ margin: 0, color: '#666' }}>
                  Admission: <strong>{selectedStudent.admissionNumber}</strong>
                </p>
                <p style={{ margin: 0, color: '#666' }}>
                  Class: {selectedStudent.classLevel} {selectedStudent.stream}
                </p>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '15px',
              marginBottom: '20px'
            }}>
              <div><strong>📅 Age:</strong> {selectedStudent.age || 'N/A'}</div>
              <div><strong>⚧ Gender:</strong> {selectedStudent.gender || 'N/A'}</div>
              <div style={{ gridColumn: 'span 2' }}>
                <strong>📞 Guardian Contact:</strong> {selectedStudent.guardianContact}
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <strong>🚨 Emergency Contact:</strong> {selectedStudent.emergencyContact || 'N/A'}
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <strong>🚌 Transport:</strong> {selectedStudent.usesTransport ? 'Yes' : 'No'}
              </div>
              {selectedStudent.usesTransport && (
                <>
                  <div><strong>🚍 Bus:</strong> {getBusNumber(selectedStudent)}</div>
                  <div><strong>📍 Pickup:</strong> {selectedStudent.transportDetails?.pickupPoint?.name || selectedStudent.pickupPoint || 'N/A'}</div>
                  <div><strong>📍 Dropoff:</strong> {selectedStudent.transportDetails?.dropoffPoint?.name || selectedStudent.dropOffPoint || 'N/A'}</div>
                </>
              )}
              {selectedStudent.medicalNotes && (
                <div style={{ gridColumn: 'span 2' }}>
                  <strong>🏥 Medical Notes:</strong>
                  <p style={{ margin: '5px 0 0 0', background: '#fff3e0', padding: '8px', borderRadius: '4px' }}>
                    {selectedStudent.medicalNotes}
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  setSelectedStudent(null);
                  handleEdit(selectedStudent);
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#FF9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                ✏️ Edit Student
              </button>
              <button
                onClick={() => setSelectedStudent(null)}
                style={{
                  flex: 1,
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
        </div>
      )}
    </div>
  );
}