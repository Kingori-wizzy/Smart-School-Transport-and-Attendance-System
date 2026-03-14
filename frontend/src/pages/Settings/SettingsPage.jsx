/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import UserManagement from '../../components/Settings/UserManagement';
import SystemConfiguration from '../../components/Settings/SystemConfiguration';
import Preferences from '../../components/Settings/Preferences';
import { settingsService } from '../../services/settings';
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
      const config = await settingsService.getSystemConfig();
      setSystemConfig(config.data);
    } catch (error) {
      console.error('Error fetching system config:', error);
      toast.error('Failed to load system configuration');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPreferences = async () => {
    try {
      setLoading(true);
      const prefs = await settingsService.getUserPreferences();
      setUserPreferences(prefs.data);
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast.error('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSystemConfig = async (config) => {
    try {
      await settingsService.updateSystemConfig(config);
      toast.success('System configuration saved');
      fetchSystemConfig();
    } catch (error) {
      toast.error('Failed to save configuration');
    }
  };

  const handleSavePreferences = async (prefs) => {
    try {
      await settingsService.updateUserPreferences(prefs);
      toast.success('Preferences saved');
      fetchUserPreferences();
    } catch (error) {
      toast.error('Failed to save preferences');
    }
  };

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