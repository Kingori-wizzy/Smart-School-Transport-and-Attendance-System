/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function Preferences({ preferences: initialPrefs, onSave }) {
  // Local state for preferences (independent of ThemeContext)
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prefs, setPrefs] = useState({
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

  // Load initial preferences from props
  useEffect(() => {
    if (initialPrefs) {
      setPrefs({
        theme: initialPrefs.theme || 'light',
        compactView: initialPrefs.compactView || false,
        animations: initialPrefs.animations !== undefined ? initialPrefs.animations : true,
        fontSize: initialPrefs.fontSize || 'medium',
        highContrast: initialPrefs.highContrast || false,
        reduceMotion: initialPrefs.reduceMotion || false,
        language: initialPrefs.language || 'en',
        dateFormat: initialPrefs.dateFormat || 'DD/MM/YYYY',
        timeFormat: initialPrefs.timeFormat || '24h',
        sidebarCollapsed: initialPrefs.sidebarCollapsed || false,
        notifications: initialPrefs.notifications !== undefined ? initialPrefs.notifications : true,
        soundAlerts: initialPrefs.soundAlerts !== undefined ? initialPrefs.soundAlerts : true,
        alertVolume: initialPrefs.alertVolume || 70,
        autoSave: initialPrefs.autoSave !== undefined ? initialPrefs.autoSave : true,
        autoSaveInterval: initialPrefs.autoSaveInterval || 5
      });
    }
  }, [initialPrefs]);

  // Apply theme to document when it changes
  useEffect(() => {
    if (prefs.theme === 'dark') {
      document.body.classList.add('dark-mode');
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      document.body.setAttribute('data-theme', 'light');
    }
  }, [prefs.theme]);

  const updatePreference = (key, value) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(prefs);
      toast.success('Preferences saved successfully');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all preferences to default?')) return;
    
    const defaultPrefs = {
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
    };
    
    setPrefs(defaultPrefs);
    
    try {
      await onSave(defaultPrefs);
      toast.success('Preferences reset to default');
    } catch (error) {
      console.error('Error resetting preferences:', error);
      toast.error('Failed to reset preferences');
    }
  };

  // Styles based on current theme
  const isDark = prefs.theme === 'dark';
  
  const styles = {
    container: {
      padding: '20px'
    },
    card: {
      background: isDark ? '#1e1e2e' : '#ffffff',
      padding: '30px',
      borderRadius: '12px',
      boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.1)',
      color: isDark ? '#e0e0e0' : '#333333'
    },
    title: {
      margin: '0 0 30px 0',
      color: isDark ? '#ffffff' : '#333333'
    },
    themePreview: {
      marginBottom: '30px',
      padding: '20px',
      background: isDark ? '#2a2a3a' : '#f5f5f5',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
      flexWrap: 'wrap'
    },
    themeBadge: {
      padding: '10px 20px',
      background: isDark ? '#1e1e2e' : '#ffffff',
      color: isDark ? '#e0e0e0' : '#333333',
      borderRadius: '8px',
      border: `1px solid ${isDark ? '#3a3a4a' : '#ddd'}`,
      boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.1)'
    },
    themeButton: {
      padding: '10px 20px',
      background: prefs.theme === 'dark' ? '#ff9800' : '#2196F3',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    section: {
      marginBottom: '30px'
    },
    sectionTitle: {
      margin: '0 0 20px 0',
      paddingBottom: '10px',
      borderBottom: `2px solid ${isDark ? '#3a3a4a' : '#eee'}`,
      color: isDark ? '#90caf9' : '#2196F3'
    },
    formGroup: {
      marginBottom: '15px'
    },
    label: {
      display: 'block',
      marginBottom: '5px',
      fontWeight: '500'
    },
    select: {
      width: '100%',
      padding: '10px',
      background: isDark ? '#2a2a3a' : '#ffffff',
      color: isDark ? '#e0e0e0' : '#333333',
      border: `1px solid ${isDark ? '#3a3a4a' : '#ddd'}`,
      borderRadius: '6px',
      cursor: 'pointer'
    },
    checkbox: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      cursor: 'pointer'
    },
    checkboxInput: {
      cursor: 'pointer'
    },
    range: {
      width: '100%',
      cursor: 'pointer'
    },
    previewSection: {
      marginTop: '30px',
      padding: '20px',
      background: isDark ? '#2a2a3a' : '#f8f9fa',
      borderRadius: '8px'
    },
    previewTitle: {
      margin: '0 0 15px 0',
      color: isDark ? '#e0e0e0' : '#333333'
    },
    previewContainer: {
      display: 'flex',
      gap: '20px',
      flexWrap: 'wrap'
    },
    previewPrimary: {
      padding: '15px',
      background: isDark ? '#1e1e2e' : '#ffffff',
      color: isDark ? '#e0e0e0' : '#333333',
      borderRadius: '8px',
      border: `1px solid ${isDark ? '#3a3a4a' : '#ddd'}`,
      boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.1)'
    },
    previewSecondary: {
      padding: '15px',
      background: isDark ? '#2a2a3a' : '#f5f5f5',
      color: isDark ? '#a0a0b0' : '#666666',
      borderRadius: '8px',
      border: `1px solid ${isDark ? '#3a3a4a' : '#eee'}`
    },
    previewSuccess: {
      padding: '15px',
      background: '#4CAF50',
      color: 'white',
      borderRadius: '8px'
    },
    previewWarning: {
      padding: '15px',
      background: '#FF9800',
      color: 'white',
      borderRadius: '8px'
    },
    previewDanger: {
      padding: '15px',
      background: '#f44336',
      color: 'white',
      borderRadius: '8px'
    },
    buttonContainer: {
      marginTop: '30px',
      paddingTop: '20px',
      borderTop: `1px solid ${isDark ? '#3a3a4a' : '#eee'}`,
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end'
    },
    resetButton: {
      padding: '12px 24px',
      background: '#f44336',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500'
    },
    saveButton: {
      padding: '12px 24px',
      background: saving ? '#ccc' : '#4CAF50',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: saving ? 'not-allowed' : 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      opacity: saving ? 0.7 : 1
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
      gap: '30px'
    },
    disabledCheckbox: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      cursor: 'not-allowed',
      opacity: 0.6
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div className="loading-spinner" style={{ margin: '0 auto' }} />
        <p>Loading preferences...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h3 style={styles.title}>User Preferences</h3>

        {/* Theme Preview */}
        <div style={styles.themePreview}>
          <div style={styles.themeBadge}>
            Current Theme: <strong>{prefs.theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</strong>
          </div>
          <button
            onClick={() => updatePreference('theme', prefs.theme === 'dark' ? 'light' : 'dark')}
            style={styles.themeButton}
          >
            {prefs.theme === 'dark' ? '☀️ Switch to Light' : '🌙 Switch to Dark'}
          </button>
        </div>

        <div style={styles.grid}>
          {/* Display Preferences */}
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>🎨 Display Settings</h4>

            <div style={styles.formGroup}>
              <label style={styles.label}>Theme</label>
              <select
                value={prefs.theme}
                onChange={(e) => updatePreference('theme', e.target.value)}
                style={styles.select}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={prefs.compactView}
                  onChange={(e) => updatePreference('compactView', e.target.checked)}
                  style={styles.checkboxInput}
                />
                Compact View (Show more items)
              </label>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={prefs.animations}
                  onChange={(e) => updatePreference('animations', e.target.checked)}
                  style={styles.checkboxInput}
                />
                Enable Animations
              </label>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={prefs.highContrast}
                  onChange={(e) => updatePreference('highContrast', e.target.checked)}
                  style={styles.checkboxInput}
                />
                High Contrast Mode
              </label>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={prefs.reduceMotion}
                  onChange={(e) => updatePreference('reduceMotion', e.target.checked)}
                  style={styles.checkboxInput}
                />
                Reduce Motion
              </label>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={prefs.sidebarCollapsed}
                  onChange={(e) => updatePreference('sidebarCollapsed', e.target.checked)}
                  style={styles.checkboxInput}
                />
                Collapse Sidebar
              </label>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Font Size</label>
              <select
                value={prefs.fontSize}
                onChange={(e) => updatePreference('fontSize', e.target.value)}
                style={styles.select}
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </div>

          {/* Notification Preferences */}
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>🔔 Notification Settings</h4>

            <div style={styles.formGroup}>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={prefs.notifications}
                  onChange={(e) => updatePreference('notifications', e.target.checked)}
                  style={styles.checkboxInput}
                />
                Enable Notifications
              </label>
            </div>

            <div style={styles.formGroup}>
              <label style={prefs.notifications ? styles.checkbox : styles.disabledCheckbox}>
                <input
                  type="checkbox"
                  checked={prefs.soundAlerts}
                  onChange={(e) => updatePreference('soundAlerts', e.target.checked)}
                  disabled={!prefs.notifications}
                  style={styles.checkboxInput}
                />
                Sound Alerts
              </label>
            </div>

            {prefs.soundAlerts && prefs.notifications && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Alert Volume: {prefs.alertVolume}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={prefs.alertVolume}
                  onChange={(e) => updatePreference('alertVolume', parseInt(e.target.value))}
                  style={styles.range}
                />
              </div>
            )}
          </div>

          {/* Language & Regional */}
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>🌍 Language & Regional</h4>

            <div style={styles.formGroup}>
              <label style={styles.label}>Language</label>
              <select
                value={prefs.language}
                onChange={(e) => updatePreference('language', e.target.value)}
                style={styles.select}
              >
                <option value="en">English</option>
                <option value="sw">Swahili</option>
                <option value="fr">French</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Date Format</label>
              <select
                value={prefs.dateFormat}
                onChange={(e) => updatePreference('dateFormat', e.target.value)}
                style={styles.select}
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Time Format</label>
              <select
                value={prefs.timeFormat}
                onChange={(e) => updatePreference('timeFormat', e.target.value)}
                style={styles.select}
              >
                <option value="24h">24 Hour</option>
                <option value="12h">12 Hour (AM/PM)</option>
              </select>
            </div>
          </div>

          {/* Auto Save */}
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>💾 Auto Save</h4>

            <div style={styles.formGroup}>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={prefs.autoSave}
                  onChange={(e) => updatePreference('autoSave', e.target.checked)}
                  style={styles.checkboxInput}
                />
                Enable Auto Save
              </label>
            </div>

            {prefs.autoSave && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Auto Save Interval (minutes)</label>
                <select
                  value={prefs.autoSaveInterval}
                  onChange={(e) => updatePreference('autoSaveInterval', parseInt(e.target.value))}
                  style={styles.select}
                >
                  <option value="1">1 minute</option>
                  <option value="5">5 minutes</option>
                  <option value="10">10 minutes</option>
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Preview Section */}
        <div style={styles.previewSection}>
          <h4 style={styles.previewTitle}>Preview</h4>
          <div style={styles.previewContainer}>
            <div style={styles.previewPrimary}>Sample Text - Primary</div>
            <div style={styles.previewSecondary}>Sample Text - Secondary</div>
            <div style={styles.previewSuccess}>Success</div>
            <div style={styles.previewWarning}>Warning</div>
            <div style={styles.previewDanger}>Danger</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={styles.buttonContainer}>
          <button onClick={handleReset} style={styles.resetButton}>
            Reset to Default
          </button>
          <button onClick={handleSave} disabled={saving} style={styles.saveButton}>
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}