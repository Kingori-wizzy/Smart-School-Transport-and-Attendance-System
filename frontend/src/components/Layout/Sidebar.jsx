import { NavLink } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';

export default function Sidebar() {
  const { isConnected } = useSocket();
  const { theme, toggleTheme, sidebarCollapsed } = useTheme();

  const menuItems = [
    { path: '/', icon: 'D', label: 'Dashboard' },
    { path: '/attendance', icon: 'A', label: 'Attendance' },
    { path: '/transport', icon: 'B', label: 'Transport' },
    { path: '/students/transport', icon: 'S', label: 'Transport Students' },
    { path: '/analytics', icon: 'G', label: 'Analytics' },
    { path: '/reports', icon: 'R', label: 'Reports' },
    { path: '/sms', icon: 'M', label: 'SMS Dashboard' },
    { path: '/settings', icon: 'S', label: 'Settings' }
  ];

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
                <span style={{ fontSize: '20px' }}>{item.icon}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        
        <div className="sidebar-footer" style={{ textAlign: 'center' }}>
          <p title={isConnected ? 'Live' : 'Offline'}>
            {isConnected ? '●' : '○'}
          </p>
          <button
            onClick={toggleTheme}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: 'white',
              marginTop: '10px'
            }}
            title={theme === 'light' ? 'Switch to Dark' : 'Switch to Light'}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>Smart Transport</h3>
      </div>
      <ul className="sidebar-nav">
        {menuItems.map(item => (
          <li key={item.path}>
            <NavLink 
              to={item.path}
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              <span>{item.icon}</span> {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
      
      <div className="sidebar-footer">
        <p>
          <span>Network</span> {isConnected ? 'Live' : 'Offline'}
        </p>
        <p>
          <span>Time</span> {new Date().toLocaleTimeString()}
        </p>
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
            marginTop: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
        </button>
      </div>
    </div>
  );
}