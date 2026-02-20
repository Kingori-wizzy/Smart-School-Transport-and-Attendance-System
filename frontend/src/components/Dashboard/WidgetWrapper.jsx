import { useState } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  XMarkIcon, 
  ArrowsPointingOutIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  PencilIcon 
} from '@heroicons/react/24/outline';

export default function WidgetWrapper({ widget, isEditing, onRemove, children }) {
  const { updateWidgetSettings, widgetSettings } = useDashboard();
  const { theme } = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleFullscreen = () => {
    // Implement fullscreen logic
    console.log('Fullscreen:', widget.id);
  };

  const settings = widgetSettings[widget.id] || {};

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative'
    }}>
      {/* Widget Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${theme === 'dark' ? '#444' : '#eee'}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: isEditing ? 'move' : 'default'
      }} className="drag-handle">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>{widget.icon}</span>
          <span style={{ fontWeight: '500' }}>{widget.name}</span>
          {settings.customTitle && (
            <span style={{
              fontSize: '12px',
              color: '#666',
              marginLeft: '8px',
              padding: '2px 6px',
              background: '#f0f0f0',
              borderRadius: '4px'
            }}>
              {settings.customTitle}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={handleRefresh}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              opacity: isRefreshing ? 0.5 : 1,
              animation: isRefreshing ? 'spin 1s linear infinite' : 'none'
            }}
          >
            <ArrowPathIcon style={{ width: '16px', height: '16px' }} />
          </button>
          
          <button
            onClick={handleFullscreen}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px'
            }}
          >
            <ArrowsPointingOutIcon style={{ width: '16px', height: '16px' }} />
          </button>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px'
            }}
          >
            <Cog6ToothIcon style={{ width: '16px', height: '16px' }} />
          </button>
          
          {isEditing && (
            <button
              onClick={onRemove}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                color: '#f44336'
              }}
            >
              <XMarkIcon style={{ width: '16px', height: '16px' }} />
            </button>
          )}
        </div>
      </div>

      {/* Widget Settings Panel */}
      {showSettings && (
        <div style={{
          position: 'absolute',
          top: '50px',
          right: '10px',
          background: theme === 'dark' ? '#444' : 'white',
          border: `1px solid ${theme === 'dark' ? '#555' : '#ddd'}`,
          borderRadius: '8px',
          padding: '16px',
          zIndex: 10,
          minWidth: '250px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          <h4 style={{ margin: '0 0 15px 0', fontSize: '14px' }}>
            {widget.name} Settings
          </h4>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>
              Custom Title
            </label>
            <input
              type="text"
              value={settings.customTitle || ''}
              onChange={(e) => updateWidgetSettings(widget.id, { customTitle: e.target.value })}
              placeholder={`${widget.name} Title`}
              style={{
                width: '100%',
                padding: '6px',
                border: `1px solid ${theme === 'dark' ? '#555' : '#ddd'}`,
                borderRadius: '4px',
                background: theme === 'dark' ? '#333' : 'white',
                color: theme === 'dark' ? 'white' : 'black'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>
              Refresh Interval
            </label>
            <select
              value={settings.refreshInterval || '0'}
              onChange={(e) => updateWidgetSettings(widget.id, { refreshInterval: e.target.value })}
              style={{
                width: '100%',
                padding: '6px',
                border: `1px solid ${theme === 'dark' ? '#555' : '#ddd'}`,
                borderRadius: '4px',
                background: theme === 'dark' ? '#333' : 'white',
                color: theme === 'dark' ? 'white' : 'black'
              }}
            >
              <option value="0">No auto-refresh</option>
              <option value="5">Every 5 seconds</option>
              <option value="15">Every 15 seconds</option>
              <option value="30">Every 30 seconds</option>
              <option value="60">Every minute</option>
            </select>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>
              Widget Size
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="number"
                value={settings.width || widget.defaultSize.w}
                onChange={(e) => updateWidgetSettings(widget.id, { width: parseInt(e.target.value) })}
                placeholder="Width"
                min={widget.minSize.w}
                max={widget.maxSize.w}
                style={{
                  width: '70px',
                  padding: '6px',
                  border: `1px solid ${theme === 'dark' ? '#555' : '#ddd'}`,
                  borderRadius: '4px'
                }}
              />
              <input
                type="number"
                value={settings.height || widget.defaultSize.h}
                onChange={(e) => updateWidgetSettings(widget.id, { height: parseInt(e.target.value) })}
                placeholder="Height"
                min={widget.minSize.h}
                max={widget.maxSize.h}
                style={{
                  width: '70px',
                  padding: '6px',
                  border: `1px solid ${theme === 'dark' ? '#555' : '#ddd'}`,
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>

          <button
            onClick={() => setShowSettings(false)}
            style={{
              width: '100%',
              padding: '8px',
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
      )}

      {/* Widget Content */}
      <div style={{
        flex: 1,
        padding: '16px',
        overflowY: 'auto',
        overflowX: 'hidden'
      }}>
        {children}
      </div>
    </div>
  );
}