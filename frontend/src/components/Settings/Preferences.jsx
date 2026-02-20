import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';

export default function Preferences() {
  const {
    // State
    theme,
    compactView,
    animations,
    fontSize,
    highContrast,
    reduceMotion,
    language,
    dateFormat,
    timeFormat,
    sidebarCollapsed,
    notifications,
    soundAlerts,
    alertVolume,
    autoSave,
    autoSaveInterval,
    
    // Setters
    setTheme,
    setCompactView,
    setAnimations,
    setFontSize,
    setHighContrast,
    setReduceMotion,
    setLanguage,
    setDateFormat,
    setTimeFormat,
    setSidebarCollapsed,
    setNotifications,
    setSoundAlerts,
    setAlertVolume,
    setAutoSave,
    setAutoSaveInterval,
    
    // Toggles
    toggleTheme,
    toggleCompactView,
    toggleAnimations,
    toggleHighContrast,
    toggleReduceMotion,
    toggleSidebar,
    toggleNotifications,
    toggleSoundAlerts,
    toggleAutoSave,
  } = useTheme();

  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Preferences saved successfully');
    }, 500);
  };

  const handleReset = () => {
    if (window.confirm('Reset all preferences to default?')) {
      setTheme('light');
      setCompactView(false);
      setAnimations(true);
      setFontSize('medium');
      setHighContrast(false);
      setReduceMotion(false);
      setLanguage('en');
      setDateFormat('DD/MM/YYYY');
      setTimeFormat('24h');
      setSidebarCollapsed(false);
      setNotifications(true);
      setSoundAlerts(true);
      setAlertVolume(70);
      setAutoSave(true);
      setAutoSaveInterval(5);
      toast.success('Preferences reset to default');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{
        background: 'var(--card-bg)',
        padding: '30px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px var(--shadow-color)',
        color: 'var(--text-primary)'
      }}>
        <h3 style={{ margin: '0 0 30px 0', color: 'var(--text-primary)' }}>
          User Preferences
        </h3>

        {/* Theme Preview */}
        <div style={{
          marginBottom: '30px',
          padding: '20px',
          background: 'var(--bg-tertiary)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '20px'
        }}>
          <div style={{
            padding: '10px 20px',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)'
          }}>
            Current Theme: <strong>{theme}</strong>
          </div>
          <button
            onClick={toggleTheme}
            className="theme-toggle"
          >
            {theme === 'light' ? '🌙 Switch to Dark' : '☀️ Switch to Light'}
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '30px'
        }}>
          {/* Display Preferences */}
          <div>
            <h4 style={{
              margin: '0 0 20px 0',
              paddingBottom: '10px',
              borderBottom: '2px solid var(--border-color)',
              color: 'var(--info)'
            }}>
              🎨 Display Settings
            </h4>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Theme
              </label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px'
                }}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  checked={compactView}
                  onChange={toggleCompactView}
                />
                Compact View (Show more items)
              </label>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  checked={animations}
                  onChange={toggleAnimations}
                />
                Enable Animations
              </label>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  checked={highContrast}
                  onChange={toggleHighContrast}
                />
                High Contrast Mode
              </label>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  checked={reduceMotion}
                  onChange={toggleReduceMotion}
                />
                Reduce Motion
              </label>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  checked={sidebarCollapsed}
                  onChange={toggleSidebar}
                />
                Collapse Sidebar
              </label>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Font Size
              </label>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px'
                }}
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </div>

          {/* Notification Preferences */}
          <div>
            <h4 style={{
              margin: '0 0 20px 0',
              paddingBottom: '10px',
              borderBottom: '2px solid var(--border-color)',
              color: 'var(--success)'
            }}>
              🔔 Notification Settings
            </h4>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  checked={notifications}
                  onChange={toggleNotifications}
                />
                Enable Notifications
              </label>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  checked={soundAlerts}
                  onChange={toggleSoundAlerts}
                  disabled={!notifications}
                />
                Sound Alerts
              </label>
            </div>

            {soundAlerts && notifications && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Alert Volume: {alertVolume}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={alertVolume}
                  onChange={(e) => setAlertVolume(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            )}
          </div>

          {/* Language & Regional */}
          <div>
            <h4 style={{
              margin: '20px 0 20px 0',
              paddingBottom: '10px',
              borderBottom: '2px solid var(--border-color)',
              color: 'var(--warning)'
            }}>
              🌍 Language & Regional
            </h4>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px'
                }}
              >
                <option value="en">English</option>
                <option value="sw">Swahili</option>
                <option value="fr">French</option>
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Date Format
              </label>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px'
                }}
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Time Format
              </label>
              <select
                value={timeFormat}
                onChange={(e) => setTimeFormat(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px'
                }}
              >
                <option value="24h">24 Hour</option>
                <option value="12h">12 Hour (AM/PM)</option>
              </select>
            </div>
          </div>

          {/* Auto Save */}
          <div>
            <h4 style={{
              margin: '20px 0 20px 0',
              paddingBottom: '10px',
              borderBottom: '2px solid var(--border-color)',
              color: 'var(--danger)'
            }}>
              💾 Auto Save
            </h4>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  checked={autoSave}
                  onChange={toggleAutoSave}
                />
                Enable Auto Save
              </label>
            </div>

            {autoSave && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Auto Save Interval (minutes)
                </label>
                <select
                  value={autoSaveInterval}
                  onChange={(e) => setAutoSaveInterval(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px'
                  }}
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
        <div style={{
          marginTop: '30px',
          padding: '20px',
          background: 'var(--bg-tertiary)',
          borderRadius: '8px'
        }}>
          <h4 style={{ margin: '0 0 15px 0', color: 'var(--text-primary)' }}>Preview</h4>
          <div style={{
            display: 'flex',
            gap: '20px',
            flexWrap: 'wrap'
          }}>
            <div style={{
              padding: '15px',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)'
            }}>
              Sample Text - Primary
            </div>
            <div style={{
              padding: '15px',
              background: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)'
            }}>
              Sample Text - Secondary
            </div>
            <div style={{
              padding: '15px',
              background: 'var(--success)',
              color: 'white',
              borderRadius: '8px'
            }}>
              Success
            </div>
            <div style={{
              padding: '15px',
              background: 'var(--warning)',
              color: 'white',
              borderRadius: '8px'
            }}>
              Warning
            </div>
            <div style={{
              padding: '15px',
              background: 'var(--danger)',
              color: 'white',
              borderRadius: '8px'
            }}>
              Danger
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          marginTop: '30px',
          paddingTop: '20px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          gap: '10px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={handleReset}
            style={{
              padding: '12px 24px',
              background: 'var(--danger)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Reset to Default
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '12px 24px',
              background: saving ? 'var(--text-muted)' : 'var(--success)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}