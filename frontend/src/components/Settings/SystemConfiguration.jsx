import { useState } from 'react';
import toast from 'react-hot-toast';

export default function SystemConfiguration() {
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);

  // General Settings
  const [generalSettings, setGeneralSettings] = useState({
    schoolName: 'KCA University',
    schoolAddress: 'Thika Road, Nairobi',
    schoolPhone: '+254 700 000000',
    schoolEmail: 'info@kca.ac.ke',
    timezone: 'Africa/Nairobi',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    language: 'en',
    currency: 'KES'
  });

  // Transport Settings
  const [transportSettings, setTransportSettings] = useState({
    speedLimit: 80,
    geofenceRadius: 500,
    fuelAlertThreshold: 15,
    maxStudentsPerBus: 40,
    morningTripTime: '06:30',
    eveningTripTime: '16:30',
    trackingInterval: 30, // seconds
    offlineCache: true,
    routeOptimization: true
  });

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: true,
    parentAlerts: true,
    driverAlerts: true,
    adminAlerts: true,
    attendanceAlerts: true,
    speedAlerts: true,
    geofenceAlerts: true,
    fuelAlerts: true,
    alertSound: 'default',
    quietHours: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '06:00'
  });

  // Security Settings
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: 30, // minutes
    passwordPolicy: 'strong',
    maxLoginAttempts: 5,
    lockoutDuration: 30, // minutes
    ipWhitelist: '',
    requireApproval: false,
    auditLogging: true,
    dataRetention: 90 // days
  });

  // Backup Settings
  const [backupSettings, setBackupSettings] = useState({
    autoBackup: true,
    backupFrequency: 'daily',
    backupTime: '02:00',
    retainBackups: 30,
    backupLocation: 'cloud',
    lastBackup: '2024-02-19 02:00:00',
    backupSize: '2.4 GB'
  });

  const handleGeneralChange = (e) => {
    const { name, value } = e.target;
    setGeneralSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleTransportChange = (e) => {
    const { name, value, type, checked } = e.target;
    setTransportSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleNotificationChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNotificationSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSecurityChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSecuritySettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleBackupChange = (e) => {
    const { name, value } = e.target;
    setBackupSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Settings saved successfully');
    }, 1500);
  };

  const handleBackupNow = () => {
    toast.success('Manual backup started');
  };

  const handleRestore = () => {
    toast.success('Restore process initiated');
  };

  const handleTestConnection = () => {
    toast.success('Connection test successful');
  };

  const tabs = [
    { id: 'general', name: 'General', icon: '⚙️' },
    { id: 'transport', name: 'Transport', icon: '🚌' },
    { id: 'notifications', name: 'Notifications', icon: '🔔' },
    { id: 'security', name: 'Security', icon: '🔒' },
    { id: 'backup', name: 'Backup', icon: '💾' }
  ];

  return (
    <div style={{ padding: '20px' }}>
      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        background: 'white',
        padding: '10px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflowX: 'auto'
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
              gap: '8px',
              whiteSpace: 'nowrap'
            }}
          >
            <span>{tab.icon}</span>
            {tab.name}
          </button>
        ))}
      </div>

      {/* Settings Forms */}
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        {/* General Settings */}
        {activeTab === 'general' && (
          <div>
            <h3 style={{ margin: '0 0 20px 0' }}>General Settings</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '20px'
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  School Name
                </label>
                <input
                  type="text"
                  name="schoolName"
                  value={generalSettings.schoolName}
                  onChange={handleGeneralChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  School Address
                </label>
                <input
                  type="text"
                  name="schoolAddress"
                  value={generalSettings.schoolAddress}
                  onChange={handleGeneralChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Phone Number
                </label>
                <input
                  type="text"
                  name="schoolPhone"
                  value={generalSettings.schoolPhone}
                  onChange={handleGeneralChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Email
                </label>
                <input
                  type="email"
                  name="schoolEmail"
                  value={generalSettings.schoolEmail}
                  onChange={handleGeneralChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Timezone
                </label>
                <select
                  name="timezone"
                  value={generalSettings.timezone}
                  onChange={handleGeneralChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                >
                  <option value="Africa/Nairobi">Nairobi (UTC+3)</option>
                  <option value="Africa/Johannesburg">Johannesburg (UTC+2)</option>
                  <option value="Africa/Lagos">Lagos (UTC+1)</option>
                  <option value="Africa/Cairo">Cairo (UTC+2)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Date Format
                </label>
                <select
                  name="dateFormat"
                  value={generalSettings.dateFormat}
                  onChange={handleGeneralChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Time Format
                </label>
                <select
                  name="timeFormat"
                  value={generalSettings.timeFormat}
                  onChange={handleGeneralChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                >
                  <option value="24h">24 Hour</option>
                  <option value="12h">12 Hour (AM/PM)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Language
                </label>
                <select
                  name="language"
                  value={generalSettings.language}
                  onChange={handleGeneralChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                >
                  <option value="en">English</option>
                  <option value="sw">Swahili</option>
                  <option value="fr">French</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Transport Settings */}
        {activeTab === 'transport' && (
          <div>
            <h3 style={{ margin: '0 0 20px 0' }}>Transport Settings</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '20px'
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Speed Limit (km/h)
                </label>
                <input
                  type="number"
                  name="speedLimit"
                  value={transportSettings.speedLimit}
                  onChange={handleTransportChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Geofence Radius (meters)
                </label>
                <input
                  type="number"
                  name="geofenceRadius"
                  value={transportSettings.geofenceRadius}
                  onChange={handleTransportChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Fuel Alert Threshold (%)
                </label>
                <input
                  type="number"
                  name="fuelAlertThreshold"
                  value={transportSettings.fuelAlertThreshold}
                  onChange={handleTransportChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Max Students Per Bus
                </label>
                <input
                  type="number"
                  name="maxStudentsPerBus"
                  value={transportSettings.maxStudentsPerBus}
                  onChange={handleTransportChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Morning Trip Time
                </label>
                <input
                  type="time"
                  name="morningTripTime"
                  value={transportSettings.morningTripTime}
                  onChange={handleTransportChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Evening Trip Time
                </label>
                <input
                  type="time"
                  name="eveningTripTime"
                  value={transportSettings.eveningTripTime}
                  onChange={handleTransportChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  GPS Tracking Interval (seconds)
                </label>
                <input
                  type="number"
                  name="trackingInterval"
                  value={transportSettings.trackingInterval}
                  onChange={handleTransportChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '15px', fontWeight: '500' }}>
                  Options
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <input
                    type="checkbox"
                    name="offlineCache"
                    checked={transportSettings.offlineCache}
                    onChange={handleTransportChange}
                  />
                  Enable Offline Cache
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    name="routeOptimization"
                    checked={transportSettings.routeOptimization}
                    onChange={handleTransportChange}
                  />
                  Enable Route Optimization
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Notification Settings */}
        {activeTab === 'notifications' && (
          <div>
            <h3 style={{ margin: '0 0 20px 0' }}>Notification Settings</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '30px'
            }}>
              <div>
                <h4 style={{ margin: '0 0 15px 0' }}>Delivery Methods</h4>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <input
                    type="checkbox"
                    name="emailNotifications"
                    checked={notificationSettings.emailNotifications}
                    onChange={handleNotificationChange}
                  />
                  Email Notifications
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <input
                    type="checkbox"
                    name="smsNotifications"
                    checked={notificationSettings.smsNotifications}
                    onChange={handleNotificationChange}
                  />
                  SMS Notifications
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <input
                    type="checkbox"
                    name="pushNotifications"
                    checked={notificationSettings.pushNotifications}
                    onChange={handleNotificationChange}
                  />
                  Push Notifications
                </label>
              </div>

              <div>
                <h4 style={{ margin: '0 0 15px 0' }}>Recipients</h4>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <input
                    type="checkbox"
                    name="parentAlerts"
                    checked={notificationSettings.parentAlerts}
                    onChange={handleNotificationChange}
                  />
                  Parents
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <input
                    type="checkbox"
                    name="driverAlerts"
                    checked={notificationSettings.driverAlerts}
                    onChange={handleNotificationChange}
                  />
                  Drivers
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <input
                    type="checkbox"
                    name="adminAlerts"
                    checked={notificationSettings.adminAlerts}
                    onChange={handleNotificationChange}
                  />
                  Administrators
                </label>
              </div>

              <div>
                <h4 style={{ margin: '0 0 15px 0' }}>Alert Types</h4>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <input
                    type="checkbox"
                    name="attendanceAlerts"
                    checked={notificationSettings.attendanceAlerts}
                    onChange={handleNotificationChange}
                  />
                  Attendance Alerts
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <input
                    type="checkbox"
                    name="speedAlerts"
                    checked={notificationSettings.speedAlerts}
                    onChange={handleNotificationChange}
                  />
                  Speed Alerts
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <input
                    type="checkbox"
                    name="geofenceAlerts"
                    checked={notificationSettings.geofenceAlerts}
                    onChange={handleNotificationChange}
                  />
                  Geofence Alerts
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <input
                    type="checkbox"
                    name="fuelAlerts"
                    checked={notificationSettings.fuelAlerts}
                    onChange={handleNotificationChange}
                  />
                  Fuel Alerts
                </label>
              </div>
            </div>

            <div style={{ marginTop: '30px' }}>
              <h4 style={{ margin: '0 0 15px 0' }}>Quiet Hours</h4>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <input
                  type="checkbox"
                  name="quietHours"
                  checked={notificationSettings.quietHours}
                  onChange={handleNotificationChange}
                />
                Enable Quiet Hours
              </label>
              
              {notificationSettings.quietHours && (
                <div style={{ display: 'flex', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Start Time</label>
                    <input
                      type="time"
                      name="quietHoursStart"
                      value={notificationSettings.quietHoursStart}
                      onChange={handleNotificationChange}
                      style={{
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px' }}>End Time</label>
                    <input
                      type="time"
                      name="quietHoursEnd"
                      value={notificationSettings.quietHoursEnd}
                      onChange={handleNotificationChange}
                      style={{
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Security Settings */}
        {activeTab === 'security' && (
          <div>
            <h3 style={{ margin: '0 0 20px 0' }}>Security Settings</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '20px'
            }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                  <input
                    type="checkbox"
                    name="twoFactorAuth"
                    checked={securitySettings.twoFactorAuth}
                    onChange={handleSecurityChange}
                  />
                  Enable Two-Factor Authentication
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                  <input
                    type="checkbox"
                    name="requireApproval"
                    checked={securitySettings.requireApproval}
                    onChange={handleSecurityChange}
                  />
                  Require Admin Approval for New Users
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                  <input
                    type="checkbox"
                    name="auditLogging"
                    checked={securitySettings.auditLogging}
                    onChange={handleSecurityChange}
                  />
                  Enable Audit Logging
                </label>
              </div>

              <div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Session Timeout (minutes)
                  </label>
                  <input
                    type="number"
                    name="sessionTimeout"
                    value={securitySettings.sessionTimeout}
                    onChange={handleSecurityChange}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Password Policy
                  </label>
                  <select
                    name="passwordPolicy"
                    value={securitySettings.passwordPolicy}
                    onChange={handleSecurityChange}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  >
                    <option value="weak">Weak (min 6 chars)</option>
                    <option value="medium">Medium (min 8 chars, letters & numbers)</option>
                    <option value="strong">Strong (min 10 chars, mixed case, numbers, symbols)</option>
                  </select>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Max Login Attempts
                  </label>
                  <input
                    type="number"
                    name="maxLoginAttempts"
                    value={securitySettings.maxLoginAttempts}
                    onChange={handleSecurityChange}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Lockout Duration (minutes)
                  </label>
                  <input
                    type="number"
                    name="lockoutDuration"
                    value={securitySettings.lockoutDuration}
                    onChange={handleSecurityChange}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Data Retention (days)
                  </label>
                  <input
                    type="number"
                    name="dataRetention"
                    value={securitySettings.dataRetention}
                    onChange={handleSecurityChange}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Backup Settings */}
        {activeTab === 'backup' && (
          <div>
            <h3 style={{ margin: '0 0 20px 0' }}>Backup Settings</h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '20px',
              marginBottom: '30px'
            }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                  <input
                    type="checkbox"
                    name="autoBackup"
                    checked={backupSettings.autoBackup}
                    onChange={handleBackupChange}
                  />
                  Enable Automatic Backups
                </label>

                {backupSettings.autoBackup && (
                  <>
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                        Backup Frequency
                      </label>
                      <select
                        name="backupFrequency"
                        value={backupSettings.backupFrequency}
                        onChange={handleBackupChange}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px'
                        }}
                      >
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                        Backup Time
                      </label>
                      <input
                        type="time"
                        name="backupTime"
                        value={backupSettings.backupTime}
                        onChange={handleBackupChange}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px'
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                        Retain Backups (days)
                      </label>
                      <input
                        type="number"
                        name="retainBackups"
                        value={backupSettings.retainBackups}
                        onChange={handleBackupChange}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px'
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                        Backup Location
                      </label>
                      <select
                        name="backupLocation"
                        value={backupSettings.backupLocation}
                        onChange={handleBackupChange}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px'
                        }}
                      >
                        <option value="local">Local Storage</option>
                        <option value="cloud">Cloud Storage</option>
                        <option value="both">Both Local & Cloud</option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              <div style={{
                background: '#f5f5f5',
                padding: '20px',
                borderRadius: '8px'
              }}>
                <h4 style={{ margin: '0 0 15px 0' }}>Backup Status</h4>
                <div style={{ marginBottom: '10px' }}>
                  <strong>Last Backup:</strong> {backupSettings.lastBackup}
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>Backup Size:</strong> {backupSettings.backupSize}
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <strong>Next Backup:</strong> Daily at {backupSettings.backupTime}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={handleBackupNow}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    💾 Backup Now
                  </button>
                  <button
                    onClick={handleRestore}
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
                    🔄 Restore
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div style={{
          marginTop: '30px',
          paddingTop: '20px',
          borderTop: '1px solid #eee',
          display: 'flex',
          gap: '10px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={handleTestConnection}
            style={{
              padding: '12px 24px',
              background: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Test Connection
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '12px 24px',
              background: saving ? '#ccc' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}