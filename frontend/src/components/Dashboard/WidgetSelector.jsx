import { useDashboard } from '../../context/DashboardContext';
import { useTheme } from '../../context/ThemeContext';
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function WidgetSelector({ onClose }) {
  const { availableWidgets, widgets, addWidget } = useDashboard();
  const { theme } = useTheme();

  const categories = {
    'Core': ['stats', 'map', 'alerts', 'quickActions'],
    'Analytics': ['attendanceChart', 'routeEfficiency', 'driverPerformance'],
    'Monitoring': ['busList', 'fuelMonitor', 'recentActivity'],
    'Extras': ['weather']
  };

  const getWidgetsByCategory = (category) => {
    return categories[category]
      .map(id => availableWidgets[id])
      .filter(Boolean);
  };

  return (
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
      zIndex: 2000,
      backdropFilter: 'blur(5px)'
    }}>
      <div style={{
        background: theme === 'dark' ? '#333' : 'white',
        borderRadius: '12px',
        width: '800px',
        maxWidth: '90%',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{
          padding: '20px',
          borderBottom: `1px solid ${theme === 'dark' ? '#444' : '#eee'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0 }}>Add Widgets to Dashboard</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '4px'
            }}
          >
            <XMarkIcon style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          {Object.keys(categories).map(category => (
            <div key={category} style={{ marginBottom: '30px' }}>
              <h4 style={{
                margin: '0 0 15px 0',
                color: theme === 'dark' ? '#ccc' : '#666',
                textTransform: 'uppercase',
                fontSize: '12px',
                letterSpacing: '1px'
              }}>
                {category}
              </h4>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '15px'
              }}>
                {getWidgetsByCategory(category).map(widget => {
                  const isAdded = widgets.some(w => w.id === widget.id);
                  
                  return (
                    <div
                      key={widget.id}
                      onClick={() => !isAdded && addWidget(widget.id)}
                      style={{
                        padding: '15px',
                        background: theme === 'dark' ? '#444' : '#f5f5f5',
                        borderRadius: '8px',
                        cursor: isAdded ? 'not-allowed' : 'pointer',
                        opacity: isAdded ? 0.5 : 1,
                        border: `2px solid ${isAdded ? '#4CAF50' : 'transparent'}`,
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isAdded) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isAdded) {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }
                      }}
                    >
                      <div style={{ fontSize: '32px', marginBottom: '10px' }}>
                        {widget.icon}
                      </div>
                      <h5 style={{ margin: '0 0 5px 0' }}>{widget.name}</h5>
                      <p style={{
                        margin: 0,
                        fontSize: '12px',
                        color: '#666',
                        lineHeight: '1.4'
                      }}>
                        {widget.description}
                      </p>
                      {isAdded && (
                        <div style={{
                          marginTop: '10px',
                          fontSize: '11px',
                          color: '#4CAF50',
                          fontWeight: 'bold'
                        }}>
                          ✓ Already Added
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          padding: '20px',
          borderTop: `1px solid ${theme === 'dark' ? '#444' : '#eee'}`,
          textAlign: 'right'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}