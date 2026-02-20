import { useState, useEffect } from 'react';
import GridLayout from 'react-grid-layout';
import { WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useDashboard } from '../../context/DashboardContext';
import { useTheme } from '../../context/ThemeContext';
import WidgetWrapper from './WidgetWrapper';
import WidgetSelector from './WidgetSelector';

const ReactGridLayout = WidthProvider(GridLayout);

export default function DashboardGrid({ children }) {
  const {
    layout,
    widgets,
    isEditing,
    updateLayout,
    breakpoint,
    setBreakpoint,
    layouts,
    toggleEditing,
    showWidgetSelector,
    setShowWidgetSelector,
    exportLayout,
    importLayout,
    resetToDefault
  } = useDashboard();

  const { theme } = useTheme();
  const [importFile, setImportFile] = useState(null);
  const [cols, setCols] = useState(12);

  // Handle responsive breakpoints
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setBreakpoint('xs');
        setCols(4);
      } else if (width < 992) {
        setBreakpoint('sm');
        setCols(6);
      } else if (width < 1200) {
        setBreakpoint('md');
        setCols(8);
      } else {
        setBreakpoint('lg');
        setCols(12);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setBreakpoint]);

  const onLayoutChange = (newLayout, newLayouts) => {
    updateLayout(newLayout, newLayouts);
  };

  const onDragStart = () => {
    // Optional: Add visual feedback
  };

  const onDragStop = () => {
    // Optional: Save after drag
  };

  const onResizeStart = () => {
    // Optional: Add visual feedback
  };

  const onResizeStop = (layout, oldItem, newItem) => {
    // Optional: Save after resize
  };

  return (
    <div style={{ position: 'relative', minHeight: '600px' }}>
      {/* Dashboard Controls */}
      {isEditing && (
        <div style={{
          position: 'sticky',
          top: '70px',
          zIndex: 100,
          background: theme === 'dark' ? '#333' : 'white',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          marginBottom: '20px',
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowWidgetSelector(true)}
              style={{
                padding: '8px 16px',
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              ➕ Add Widget
            </button>
            
            <button
              onClick={resetToDefault}
              style={{
                padding: '8px 16px',
                background: '#FF9800',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              🔄 Reset Layout
            </button>
            
            <button
              onClick={exportLayout}
              style={{
                padding: '8px 16px',
                background: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              📤 Export
            </button>
            
            <div style={{ position: 'relative' }}>
              <input
                type="file"
                id="import-file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files[0]) {
                    importLayout(e.target.files[0]);
                  }
                }}
              />
              <button
                onClick={() => document.getElementById('import-file').click()}
                style={{
                  padding: '8px 16px',
                  background: '#9C27B0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                📥 Import
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <span style={{
              padding: '8px 16px',
              background: '#f0f0f0',
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              {cols} Columns | {layout.length} Widgets
            </span>
            
            <button
              onClick={toggleEditing}
              style={{
                padding: '8px 16px',
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Done Editing
            </button>
          </div>
        </div>
      )}

      {/* Widget Selector Modal */}
      {showWidgetSelector && (
        <WidgetSelector onClose={() => setShowWidgetSelector(false)} />
      )}

      {/* Grid Layout */}
      <ReactGridLayout
        className="layout"
        layout={layout}
        cols={cols}
        rowHeight={100}
        width={1200}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        isDraggable={isEditing}
        isResizable={isEditing}
        onLayoutChange={onLayoutChange}
        onDragStart={onDragStart}
        onDragStop={onDragStop}
        onResizeStart={onResizeStart}
        onResizeStop={onResizeStop}
        draggableHandle=".drag-handle"
        resizeHandles={['se', 'sw', 'ne', 'nw']}
        useCSSTransforms={true}
        compactType="vertical"
        preventCollision={false}
        verticalCompact={true}
      >
        {widgets.map(widget => {
          const widgetLayout = layout.find(l => l.i === widget.id);
          if (!widgetLayout) return null;

          return (
            <div key={widget.id} style={{
              background: theme === 'dark' ? '#333' : 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              height: '100%',
              width: '100%'
            }}>
              <WidgetWrapper
                widget={widget}
                isEditing={isEditing}
                onRemove={() => removeWidget(widget.id)}
              >
                {/* Widget content will be rendered here */}
                {children}
              </WidgetWrapper>
            </div>
          );
        })}
      </ReactGridLayout>

      {/* Empty State */}
      {layout.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px',
          background: theme === 'dark' ? '#333' : 'white',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📊</div>
          <h3 style={{ margin: '0 0 10px 0' }}>Your Dashboard is Empty</h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Click "Add Widget" to start customizing your dashboard
          </p>
          <button
            onClick={() => setShowWidgetSelector(true)}
            style={{
              padding: '12px 24px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ➕ Add Your First Widget
          </button>
        </div>
      )}
    </div>
  );
}