import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    phone: '',
    status: 'active',
    permissions: []
  });

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    // Mock users data
    const mockUsers = [
      {
        id: 'USR001',
        name: 'Admin User',
        email: 'admin@school.com',
        role: 'admin',
        phone: '+254700000001',
        status: 'active',
        lastLogin: '2024-02-19T08:30:00',
        createdAt: '2023-01-01T00:00:00',
        permissions: ['all']
      },
      {
        id: 'USR002',
        name: 'John Manager',
        email: 'john.manager@school.com',
        role: 'manager',
        phone: '+254700000002',
        status: 'active',
        lastLogin: '2024-02-18T14:20:00',
        createdAt: '2023-06-15T00:00:00',
        permissions: ['view_reports', 'manage_buses', 'manage_drivers']
      },
      {
        id: 'USR003',
        name: 'Sarah Teacher',
        email: 'sarah.teacher@school.com',
        role: 'teacher',
        phone: '+254700000003',
        status: 'active',
        lastLogin: '2024-02-19T07:45:00',
        createdAt: '2023-09-20T00:00:00',
        permissions: ['view_attendance', 'take_attendance']
      },
      {
        id: 'USR004',
        name: 'Mike Driver',
        email: 'mike.driver@school.com',
        role: 'driver',
        phone: '+254700000004',
        status: 'inactive',
        lastLogin: '2024-02-15T16:30:00',
        createdAt: '2024-01-10T00:00:00',
        permissions: ['view_route', 'update_gps']
      },
      {
        id: 'USR005',
        name: 'Parent Account',
        email: 'parent@example.com',
        role: 'parent',
        phone: '+254700000005',
        status: 'active',
        lastLogin: '2024-02-19T06:15:00',
        createdAt: '2024-02-01T00:00:00',
        permissions: ['view_child', 'receive_notifications']
      }
    ];
    setUsers(mockUsers);
    setLoading(false);
  };

  const fetchRoles = async () => {
    // Mock roles data
    const mockRoles = [
      {
        id: 'role_admin',
        name: 'Administrator',
        description: 'Full system access',
        permissions: ['all']
      },
      {
        id: 'role_manager',
        name: 'Manager',
        description: 'Manage operations, view reports',
        permissions: ['view_reports', 'manage_buses', 'manage_drivers', 'manage_routes']
      },
      {
        id: 'role_teacher',
        name: 'Teacher',
        description: 'Take attendance, view student info',
        permissions: ['view_attendance', 'take_attendance', 'view_students']
      },
      {
        id: 'role_driver',
        name: 'Driver',
        description: 'View route, update GPS',
        permissions: ['view_route', 'update_gps', 'view_schedule']
      },
      {
        id: 'role_parent',
        name: 'Parent',
        description: 'View child location, receive alerts',
        permissions: ['view_child', 'receive_notifications', 'view_attendance_history']
      }
    ];
    setRoles(mockRoles);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    toast.success(editingUser ? 'User updated successfully' : 'User created successfully');
    setShowForm(false);
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'user',
      phone: '',
      status: 'active',
      permissions: []
    });
    fetchUsers();
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      confirmPassword: '',
      role: user.role,
      phone: user.phone || '',
      status: user.status,
      permissions: user.permissions || []
    });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      toast.success('User deleted successfully');
      fetchUsers();
    }
  };

  const handleStatusToggle = (user) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    toast.success(`User status changed to ${newStatus}`);
    fetchUsers();
  };

  const handleResetPassword = (user) => {
    toast.success(`Password reset email sent to ${user.email}`);
  };

  const getRoleBadgeColor = (role) => {
    switch(role) {
      case 'admin': return '#f44336';
      case 'manager': return '#FF9800';
      case 'teacher': return '#4CAF50';
      case 'driver': return '#2196F3';
      case 'parent': return '#9C27B0';
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
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{users.length}</div>
          <div>Total Users</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
            {users.filter(u => u.status === 'active').length}
          </div>
          <div>Active Users</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
            {users.filter(u => u.role === 'admin').length}
          </div>
          <div>Administrators</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #5f2c82 0%, #49a09d 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
            {users.filter(u => u.role === 'driver').length}
          </div>
          <div>Drivers</div>
        </div>
      </div>

      {/* Actions Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h3 style={{ margin: 0 }}>User Management</h3>
        <button
          onClick={() => {
            setEditingUser(null);
            setFormData({
              name: '',
              email: '',
              password: '',
              confirmPassword: '',
              role: 'user',
              phone: '',
              status: 'active',
              permissions: []
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
          ➕ Add New User
        </button>
      </div>

      {/* Users Table */}
      <div style={{
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'auto'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ padding: '15px', textAlign: 'left' }}>User</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Role</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Last Login</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: getRoleBadgeColor(user.role),
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold'
                    }}>
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: '500' }}>{user.name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{user.email}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{user.phone}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '15px' }}>
                  <span style={{
                    background: getRoleBadgeColor(user.role),
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    {user.role.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '15px' }}>
                  <span style={{
                    background: user.status === 'active' ? '#4CAF50' : '#f44336',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}>
                    {user.status}
                  </span>
                </td>
                <td style={{ padding: '15px' }}>
                  {format(new Date(user.lastLogin), 'MMM dd, yyyy HH:mm')}
                </td>
                <td style={{ padding: '15px' }}>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button
                      onClick={() => handleEdit(user)}
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
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleStatusToggle(user)}
                      style={{
                        padding: '6px 12px',
                        background: user.status === 'active' ? '#FF9800' : '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      {user.status === 'active' ? '🔒 Deactivate' : '✅ Activate'}
                    </button>
                    <button
                      onClick={() => handleResetPassword(user)}
                      style={{
                        padding: '6px 12px',
                        background: '#9C27B0',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      🔑 Reset
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
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

      {/* Add/Edit User Modal */}
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
            maxWidth: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 20px 0' }}>
              {editingUser ? 'Edit User' : 'Add New User'}
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
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Role *
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                >
                  <option value="admin">Administrator</option>
                  <option value="manager">Manager</option>
                  <option value="teacher">Teacher</option>
                  <option value="driver">Driver</option>
                  <option value="parent">Parent</option>
                  <option value="user">Basic User</option>
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
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              {!editingUser && (
                <>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                      Password *
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required={!editingUser}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required={!editingUser}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                </>
              )}

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: '500' }}>
                  Permissions
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '10px',
                  padding: '15px',
                  background: '#f5f5f5',
                  borderRadius: '4px'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input type="checkbox" /> View Dashboard
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input type="checkbox" /> Manage Users
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input type="checkbox" /> View Reports
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input type="checkbox" /> Manage Buses
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input type="checkbox" /> Manage Drivers
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input type="checkbox" /> Take Attendance
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input type="checkbox" /> View GPS Tracking
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input type="checkbox" /> Receive Alerts
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
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
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingUser(null);
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