 
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import UserManagement from '../../components/Settings/UserManagement';
import SystemConfiguration from '../../components/Settings/SystemConfiguration';
import Preferences from '../../components/Settings/Preferences';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [systemConfig, setSystemConfig] = useState(null);
  const [userPreferences, setUserPreferences] = useState(null);
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: 'users', name: 'User Management', icon: '👥' },
    { id: 'system', name: 'System Configuration', icon: '⚙️' },
    { id: 'preferences', name: 'My Preferences', icon: '🎨' }
  ];

  useEffect(() => {
    if (activeTab === 'system') {
      fetchSystemConfig();
    } else if (activeTab === 'preferences') {
      fetchUserPreferences();
    }
  }, [activeTab]);

  const fetchSystemConfig = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setSystemConfig(data.data);
      } else {
        setSystemConfig({
          schoolName: 'Smart School',
          schoolAddress: '',
          schoolPhone: '',
          schoolEmail: '',
          timezone: 'Africa/Nairobi',
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '24h',
          language: 'en',
          currency: 'KES'
        });
      }
    } catch (error) {
      console.error('Error fetching system config:', error);
      toast.error('Failed to load system configuration');
      setSystemConfig({
        schoolName: 'Smart School',
        schoolAddress: '',
        schoolPhone: '',
        schoolEmail: '',
        timezone: 'Africa/Nairobi',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        language: 'en',
        currency: 'KES'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPreferences = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/user/preferences', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setUserPreferences(data.data);
      } else {
        setUserPreferences({
          theme: 'light',
          compactView: false,
          animations: true,
          fontSize: 'medium',
          highContrast: false,
          reduceMotion: false,
          language: 'en',
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '24h',
          sidebarCollapsed: false,
          notifications: true,
          soundAlerts: true,
          alertVolume: 70,
          autoSave: true,
          autoSaveInterval: 5
        });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast.error('Failed to load preferences');
      setUserPreferences({
        theme: 'light',
        compactView: false,
        animations: true,
        fontSize: 'medium',
        highContrast: false,
        reduceMotion: false,
        language: 'en',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        sidebarCollapsed: false,
        notifications: true,
        soundAlerts: true,
        alertVolume: 70,
        autoSave: true,
        autoSaveInterval: 5
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSystemConfig = async (config) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to save configuration');
      toast.success('System configuration saved');
      fetchSystemConfig();
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error(error.message || 'Failed to save configuration');
    }
  };

  const handleSavePreferences = async (prefs) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(prefs)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to save preferences');
      toast.success('Preferences saved');
      fetchUserPreferences();
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error(error.message || 'Failed to save preferences');
    }
  };

  return (
    <div className="dashboard">
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

          <div style={{
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            minHeight: '500px',
            padding: '20px'
          }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '50px' }}>
                <div className="loading-spinner" />
              </div>
            ) : (
              <>
                {activeTab === 'users' && <UserManagement />}
                {activeTab === 'system' && (
                  <SystemConfiguration 
                    config={systemConfig} 
                    onSave={handleSaveSystemConfig} 
                  />
                )}
                {activeTab === 'preferences' && (
                  <Preferences 
                    preferences={userPreferences} 
                    onSave={handleSavePreferences} 
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}