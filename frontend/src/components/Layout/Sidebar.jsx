import { NavLink } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';

export default function Sidebar() {
  const { isConnected } = useSocket();
  const { theme, toggleTheme, sidebarCollapsed } = useTheme();

  const menuItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/attendance', label: 'Attendance' },
    { path: '/transport', label: 'Transport' },
    { path: '/students/transport', label: 'Transport Students' },
    { path: '/analytics', label: 'Analytics' },
    { path: '/reports', label: 'Reports' },
    { path: '/messaging', label: 'Messaging' },
    { path: '/sms', label: 'SMS Dashboard' },
    { path: '/settings', label: 'Settings' }
  ];

  // Helper function to get current time
  const getCurrentTime = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (sidebarCollapsed) {
    return (
      <div className="sidebar" style={{ width: '80px' }}>
        <div className="sidebar-header" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '14px' }}>ST</h3>
        </div>
        <ul className="sidebar-nav">
          {menuItems.map(item => (
            <li key={item.path}>
              <NavLink 
                to={item.path}
                className={({ isActive }) => isActive ? 'active' : ''}
                title={item.label}
                style={{ justifyContent: 'center', padding: '12px 0' }}
              >
                <span style={{ fontSize: '12px', fontWeight: '500' }}>
                  {item.label.charAt(0)}
                  {item.label.charAt(1) === 't' && item.label.charAt(2) === 'u' ? '' : ''}
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
        
        <div className="sidebar-footer" style={{ textAlign: 'center' }}>
          <p title={isConnected ? 'Live Connection' : 'Disconnected'}>
            <span style={{ 
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#4CAF50' : '#f44336',
              boxShadow: isConnected ? '0 0 5px #4CAF50' : 'none'
            }}></span>
          </p>
          <button
            onClick={toggleTheme}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '16px',
              cursor: 'pointer',
              color: 'white',
              marginTop: '10px'
            }}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? 'Dark' : 'Light'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>Smart Transport</h3>
        <p style={{ fontSize: '12px', marginTop: '5px', opacity: 0.8 }}>
          School Management System
        </p>
      </div>
      
      <ul className="sidebar-nav">
        {menuItems.map(item => (
          <li key={item.path}>
            <NavLink 
              to={item.path}
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
      
      <div className="sidebar-footer">
        <div style={{ 
          padding: '10px', 
          backgroundColor: 'rgba(255,255,255,0.05)', 
          borderRadius: '8px',
          marginBottom: '10px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ fontSize: '12px', opacity: 0.7 }}>Network</span>
            <span style={{ 
              fontSize: '12px',
              color: isConnected ? '#4CAF50' : '#f44336'
            }}>
              {isConnected ? 'Online' : 'Offline'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', opacity: 0.7 }}>Time</span>
            <span style={{ fontSize: '12px' }}>{getCurrentTime()}</span>
          </div>
        </div>
        
        <button
          onClick={toggleTheme}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '20px',
            cursor: 'pointer',
            width: '100%',
            marginTop: '5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
        >
          {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
        </button>
      </div>
    </div>
  );
}