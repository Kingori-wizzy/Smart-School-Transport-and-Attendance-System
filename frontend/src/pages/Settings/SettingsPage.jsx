import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import UserManagement from '../../components/Settings/UserManagement';
import SystemConfiguration from '../../components/Settings/Systemconfiguration';
import Preferences from '../../components/Settings/Preferences';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('users');

  const tabs = [
    { id: 'users', name: 'User Management', icon: '👥' },
    { id: 'system', name: 'System Configuration', icon: '⚙️' },
    { id: 'preferences', name: 'My Preferences', icon: '🎨' }
  ];

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>Smart Transport</h3>
        </div>
        <ul className="sidebar-nav">
          <li><a href="/">🏠 Dashboard</a></li>
          <li><a href="/attendance">📝 Attendance</a></li>
          <li><a href="/transport">🚌 Transport</a></li>
          <li><a href="/analytics">📊 Analytics</a></li>
          <li><a href="/reports">📑 Reports</a></li>
          <li><a href="/settings" className="active">⚙️ Settings</a></li>
        </ul>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="top-bar">
          <h2>Settings</h2>
          <div className="user-info">
            <span className="welcome-text">
              Welcome, {user?.name || user?.email || 'Admin'}
            </span>
            <button onClick={logout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>

        <div className="content-area">
          {/* Tab Navigation */}
          <div style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '20px',
            background: 'white',
            padding: '10px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '10px 20px',
                  background: activeTab === tab.id ? '#2196F3' : '#f5f5f5',
                  color: activeTab === tab.id ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            minHeight: '500px'
          }}>
            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'system' && <SystemConfiguration />}
            {activeTab === 'preferences' && <Preferences />}
          </div>
        </div>
      </div>
    </div>
  );
}