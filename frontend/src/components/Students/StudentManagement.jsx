import { useState, useEffect } from 'react';
import { studentService } from '../../services/student';
import { transportService } from '../../services/transport';
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
  
  const [formData, setFormData] = useState({
    studentId: '',
    name: '',
    className: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    address: '',
    busId: '',
    pickupPoint: '',
    dropoffPoint: '',
    emergencyContact: '',
    medicalNotes: '',
    profileImage: null
  });

  const classes = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 
                   'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

  useEffect(() => {
    fetchStudents();
    fetchBuses();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const data = await studentService.getStudents();
      setStudents(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const fetchBuses = async () => {
    const data = await transportService.getBuses();
    setBuses(Array.isArray(data) ? data : []);
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'profileImage') {
      setFormData(prev => ({ ...prev, profileImage: files[0] }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingStudent) {
        await studentService.updateStudent(editingStudent._id, formData);
        toast.success('Student updated successfully');
      } else {
        await studentService.createStudent(formData);
        toast.success('Student added successfully');
      }
      setShowForm(false);
      setEditingStudent(null);
      resetForm();
      fetchStudents();
    } catch (error) {
      toast.error('Failed to save student');
    }
  };

  const resetForm = () => {
    setFormData({
      studentId: '',
      name: '',
      className: '',
      parentName: '',
      parentPhone: '',
      parentEmail: '',
      address: '',
      busId: '',
      pickupPoint: '',
      dropoffPoint: '',
      emergencyContact: '',
      medicalNotes: '',
      profileImage: null
    });
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      studentId: student.studentId || '',
      name: student.name || '',
      className: student.className || '',
      parentName: student.parentName || '',
      parentPhone: student.parentPhone || '',
      parentEmail: student.parentEmail || '',
      address: student.address || '',
      busId: student.busId || '',
      pickupPoint: student.pickupPoint || '',
      dropoffPoint: student.dropoffPoint || '',
      emergencyContact: student.emergencyContact || '',
      medicalNotes: student.medicalNotes || '',
      profileImage: null
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    try {
      await studentService.deleteStudent(id);
      toast.success('Student deleted successfully');
      fetchStudents();
    } catch (error) {
      toast.error('Failed to delete student');
    }
  };

  const handleViewDetails = (student) => {
    setSelectedStudent(student);
  };

  const handleExport = () => {
    const csv = students.map(s => 
      `${s.studentId},${s.name},${s.className},${s.parentName},${s.parentPhone}`
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    toast.success('Students exported successfully');
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.parentName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesClass = filterClass === 'all' || student.className === filterClass;
    const matchesBus = filterBus === 'all' || student.busId === filterBus;
    
    return matchesSearch && matchesClass && matchesBus;
  });

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div className="loading-spinner" style={{ margin: '0 auto' }} />
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
            {students.filter(s => s.busId).length}
          </div>
          <div>Assigned to Bus</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
            {new Set(students.map(s => s.className)).size}
          </div>
          <div>Classes</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #5f2c82 0%, #49a09d 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
            {students.filter(s => s.emergencyContact).length}
          </div>
          <div>Emergency Contacts</div>
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
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', gap: '15px', flex: 1 }}>
          <input
            type="text"
            placeholder="🔍 Search students by name, ID, parent..."
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
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            style={{
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              minWidth: '150px'
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
              minWidth: '150px'
            }}
          >
            <option value="all">All Buses</option>
            {buses.map(bus => (
              <option key={bus._id} value={bus._id}>{bus.busNumber}</option>
            ))}
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
              <th style={{ padding: '15px', textAlign: 'left' }}>ID</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Class</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Parent</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Contact</th>
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
                      background: `hsl(${student.name?.length * 30}, 70%, 50%)`,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold'
                    }}>
                      {student.name?.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: '500' }}>{student.name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{student.address}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '15px' }}>{student.studentId}</td>
                <td style={{ padding: '15px' }}>{student.className}</td>
                <td style={{ padding: '15px' }}>
                  <div>{student.parentName}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{student.parentEmail}</div>
                </td>
                <td style={{ padding: '15px' }}>
                  <div>{student.parentPhone}</div>
                  {student.emergencyContact && (
                    <div style={{ fontSize: '12px', color: '#f44336' }}>
                      🚨 {student.emergencyContact}
                    </div>
                  )}
                </td>
                <td style={{ padding: '15px' }}>
                  {student.busId ? (
                    <span style={{
                      background: '#4CAF50',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      {buses.find(b => b._id === student.busId)?.busNumber || 'Assigned'}
                    </span>
                  ) : (
                    <span style={{ color: '#999' }}>Not assigned</span>
                  )}
                </td>
                <td style={{ padding: '15px' }}>
                  <div style={{ display: 'flex', gap: '5px' }}>
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
                    >
                      👁️ View
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
                    >
                      ✏️ Edit
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
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
              {editingStudent ? 'Edit Student' : 'Add New Student'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Student ID *
                  </label>
                  <input
                    type="text"
                    name="studentId"
                    value={formData.studentId}
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
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Class *
                  </label>
                  <select
                    name="className"
                    value={formData.className}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  >
                    <option value="">Select Class</option>
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Parent Name *
                  </label>
                  <input
                    type="text"
                    name="parentName"
                    value={formData.parentName}
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
                    Parent Phone *
                  </label>
                  <input
                    type="tel"
                    name="parentPhone"
                    value={formData.parentPhone}
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
                    Parent Email
                  </label>
                  <input
                    type="email"
                    name="parentEmail"
                    value={formData.parentEmail}
                    onChange={handleInputChange}
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
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
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
                    name="busId"
                    value={formData.busId}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  >
                    <option value="">No Bus</option>
                    {buses.map(bus => (
                      <option key={bus._id} value={bus._id}>
                        {bus.busNumber} - {bus.route}
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
                    name="pickupPoint"
                    value={formData.pickupPoint}
                    onChange={handleInputChange}
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
                    Dropoff Point
                  </label>
                  <input
                    type="text"
                    name="dropoffPoint"
                    value={formData.dropoffPoint}
                    onChange={handleInputChange}
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
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Medical Notes / Special Requirements
                  </label>
                  <textarea
                    name="medicalNotes"
                    value={formData.medicalNotes}
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
                    cursor: 'pointer'
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
            width: '500px',
            maxWidth: '90%'
          }}>
            <h3 style={{ margin: '0 0 20px 0' }}>Student Details</h3>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                background: `hsl(${selectedStudent.name?.length * 30}, 70%, 50%)`,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '32px',
                fontWeight: 'bold'
              }}>
                {selectedStudent.name?.charAt(0)}
              </div>
              <div>
                <h2 style={{ margin: '0 0 5px 0' }}>{selectedStudent.name}</h2>
                <p style={{ margin: 0, color: '#666' }}>ID: {selectedStudent.studentId}</p>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '15px',
              marginBottom: '20px'
            }}>
              <div>
                <strong>Class:</strong> {selectedStudent.className}
              </div>
              <div>
                <strong>Parent:</strong> {selectedStudent.parentName}
              </div>
              <div>
                <strong>Phone:</strong> {selectedStudent.parentPhone}
              </div>
              <div>
                <strong>Email:</strong> {selectedStudent.parentEmail || 'N/A'}
              </div>
              <div>
                <strong>Address:</strong> {selectedStudent.address || 'N/A'}
              </div>
              <div>
                <strong>Bus:</strong> {selectedStudent.busId ? 
                  buses.find(b => b._id === selectedStudent.busId)?.busNumber : 'Not assigned'}
              </div>
              <div>
                <strong>Pickup:</strong> {selectedStudent.pickupPoint || 'N/A'}
              </div>
              <div>
                <strong>Dropoff:</strong> {selectedStudent.dropoffPoint || 'N/A'}
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <strong>Emergency Contact:</strong> {selectedStudent.emergencyContact || 'N/A'}
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <strong>Medical Notes:</strong>
                <p style={{ margin: '5px 0 0 0', color: '#666' }}>
                  {selectedStudent.medicalNotes || 'No notes'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => handleEdit(selectedStudent)}
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