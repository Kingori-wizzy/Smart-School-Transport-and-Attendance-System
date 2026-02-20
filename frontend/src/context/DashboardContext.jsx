import { createContext, useState, useContext, useEffect } from 'react';
import toast from 'react-hot-toast';

const DashboardContext = createContext();

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

// Available widgets
export const AVAILABLE_WIDGETS = {
  // Stats Widgets
  stats: {
    id: 'stats',
    name: 'Statistics Cards',
    description: 'Show key performance indicators',
    icon: '📊',
    defaultSize: { w: 12, h: 2 },
    minSize: { w: 6, h: 2 },
    maxSize: { w: 12, h: 3 },
    component: 'StatsWidget'
  },
  
  // Map Widget
  map: {
    id: 'map',
    name: 'Live GPS Map',
    description: 'Real-time bus tracking map',
    icon: '🗺️',
    defaultSize: { w: 12, h: 6 },
    minSize: { w: 8, h: 4 },
    maxSize: { w: 12, h: 8 },
    component: 'MapWidget'
  },
  
  // Attendance Chart
  attendanceChart: {
    id: 'attendanceChart',
    name: 'Attendance Chart',
    description: 'Daily attendance trends',
    icon: '📈',
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    maxSize: { w: 8, h: 5 },
    component: 'AttendanceChartWidget'
  },
  
  // Bus List
  busList: {
    id: 'busList',
    name: 'Active Buses',
    description: 'List of currently active buses',
    icon: '🚌',
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    maxSize: { w: 8, h: 6 },
    component: 'BusListWidget'
  },
  
  // Alerts Feed
  alerts: {
    id: 'alerts',
    name: 'Alerts Feed',
    description: 'Real-time alerts and notifications',
    icon: '⚠️',
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    maxSize: { w: 8, h: 6 },
    component: 'AlertsWidget'
  },
  
  // Quick Actions
  quickActions: {
    id: 'quickActions',
    name: 'Quick Actions',
    description: 'Common tasks and shortcuts',
    icon: '⚡',
    defaultSize: { w: 4, h: 2 },
    minSize: { w: 3, h: 2 },
    maxSize: { w: 6, h: 3 },
    component: 'QuickActionsWidget'
  },
  
  // Weather Widget (optional)
  weather: {
    id: 'weather',
    name: 'Weather',
    description: 'Current weather conditions',
    icon: '☁️',
    defaultSize: { w: 4, h: 2 },
    minSize: { w: 3, h: 2 },
    maxSize: { w: 6, h: 3 },
    component: 'WeatherWidget'
  },
  
  // Route Efficiency
  routeEfficiency: {
    id: 'routeEfficiency',
    name: 'Route Efficiency',
    description: 'Route performance metrics',
    icon: '🛣️',
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    maxSize: { w: 8, h: 5 },
    component: 'RouteEfficiencyWidget'
  },
  
  // Driver Performance
  driverPerformance: {
    id: 'driverPerformance',
    name: 'Driver Performance',
    description: 'Top drivers and ratings',
    icon: '👤',
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    maxSize: { w: 8, h: 5 },
    component: 'DriverPerformanceWidget'
  },
  
  // Fuel Monitoring
  fuelMonitor: {
    id: 'fuelMonitor',
    name: 'Fuel Monitor',
    description: 'Fuel levels and consumption',
    icon: '⛽',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    maxSize: { w: 6, h: 4 },
    component: 'FuelMonitorWidget'
  },
  
  // Recent Activity
  recentActivity: {
    id: 'recentActivity',
    name: 'Recent Activity',
    description: 'Latest system events',
    icon: '📋',
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    maxSize: { w: 8, h: 5 },
    component: 'RecentActivityWidget'
  }
};

// Default layouts for different roles
const DEFAULT_LAYOUTS = {
  admin: [
    { i: 'stats', x: 0, y: 0, w: 12, h: 2 },
    { i: 'map', x: 0, y: 2, w: 8, h: 4 },
    { i: 'alerts', x: 8, y: 2, w: 4, h: 4 },
    { i: 'attendanceChart', x: 0, y: 6, w: 6, h: 3 },
    { i: 'busList', x: 6, y: 6, w: 6, h: 3 },
    { i: 'quickActions', x: 0, y: 9, w: 4, h: 2 },
    { i: 'fuelMonitor', x: 4, y: 9, w: 4, h: 2 },
    { i: 'weather', x: 8, y: 9, w: 4, h: 2 }
  ],
  manager: [
    { i: 'stats', x: 0, y: 0, w: 12, h: 2 },
    { i: 'map', x: 0, y: 2, w: 8, h: 4 },
    { i: 'routeEfficiency', x: 8, y: 2, w: 4, h: 4 },
    { i: 'driverPerformance', x: 0, y: 6, w: 6, h: 3 },
    { i: 'fuelMonitor', x: 6, y: 6, w: 6, h: 3 }
  ],
  teacher: [
    { i: 'stats', x: 0, y: 0, w: 8, h: 2 },
    { i: 'attendanceChart', x: 8, y: 0, w: 4, h: 2 },
    { i: 'busList', x: 0, y: 2, w: 6, h: 3 },
    { i: 'recentActivity', x: 6, y: 2, w: 6, h: 3 },
    { i: 'quickActions', x: 0, y: 5, w: 12, h: 2 }
  ],
  parent: [
    { i: 'stats', x: 0, y: 0, w: 8, h: 2 },
    { i: 'map', x: 0, y: 2, w: 8, h: 4 },
    { i: 'alerts', x: 8, y: 2, w: 4, h: 4 },
    { i: 'recentActivity', x: 0, y: 6, w: 12, h: 3 }
  ]
};

export const DashboardProvider = ({ children, userRole = 'admin' }) => {
  const [layout, setLayout] = useState([]);
  const [widgets, setWidgets] = useState([]);
  const [layouts, setLayouts] = useState({});
  const [breakpoint, setBreakpoint] = useState('lg');
  const [isEditing, setIsEditing] = useState(false);
  const [showWidgetSelector, setShowWidgetSelector] = useState(false);
  const [dashboardTheme, setDashboardTheme] = useState('light');
  const [widgetSettings, setWidgetSettings] = useState({});

  // Load saved layout from localStorage
  useEffect(() => {
    const savedLayout = localStorage.getItem(`dashboard-layout-${userRole}`);
    const savedWidgets = localStorage.getItem(`dashboard-widgets-${userRole}`);
    const savedSettings = localStorage.getItem(`dashboard-settings-${userRole}`);
    
    if (savedLayout && savedWidgets) {
      setLayout(JSON.parse(savedLayout));
      setWidgets(JSON.parse(savedWidgets));
      if (savedSettings) {
        setWidgetSettings(JSON.parse(savedSettings));
      }
    } else {
      // Set default layout based on role
      setLayout(DEFAULT_LAYOUTS[userRole] || DEFAULT_LAYOUTS.admin);
      setWidgets(Object.values(AVAILABLE_WIDGETS));
    }
  }, [userRole]);

  // Save layout to localStorage
  useEffect(() => {
    if (layout.length > 0) {
      localStorage.setItem(`dashboard-layout-${userRole}`, JSON.stringify(layout));
      localStorage.setItem(`dashboard-widgets-${userRole}`, JSON.stringify(widgets));
      localStorage.setItem(`dashboard-settings-${userRole}`, JSON.stringify(widgetSettings));
    }
  }, [layout, widgets, widgetSettings, userRole]);

  const updateLayout = (newLayout, newLayouts) => {
    setLayout(newLayout);
    if (newLayouts) setLayouts(newLayouts);
  };

  const toggleEditing = () => {
    setIsEditing(!isEditing);
    if (!isEditing) {
      toast.success('Dashboard editing mode enabled');
    } else {
      toast.success('Dashboard layout saved');
    }
  };

  const addWidget = (widgetId) => {
    const widget = AVAILABLE_WIDGETS[widgetId];
    if (!widget) return;

    // Check if widget already exists
    if (widgets.some(w => w.id === widgetId)) {
      toast.error('Widget already exists');
      return;
    }

    const newWidget = { ...widget };
    setWidgets([...widgets, newWidget]);

    // Add to layout
    const newLayoutItem = {
      i: widgetId,
      x: 0,
      y: layout.reduce((maxY, item) => Math.max(maxY, item.y + item.h), 0),
      w: widget.defaultSize.w,
      h: widget.defaultSize.h
    };
    
    setLayout([...layout, newLayoutItem]);
    setShowWidgetSelector(false);
    toast.success(`Added ${widget.name} widget`);
  };

  const removeWidget = (widgetId) => {
    setWidgets(widgets.filter(w => w.id !== widgetId));
    setLayout(layout.filter(item => item.i !== widgetId));
    toast.success('Widget removed');
  };

  const updateWidgetSettings = (widgetId, settings) => {
    setWidgetSettings({
      ...widgetSettings,
      [widgetId]: { ...widgetSettings[widgetId], ...settings }
    });
  };

  const resetToDefault = () => {
    setLayout(DEFAULT_LAYOUTS[userRole] || DEFAULT_LAYOUTS.admin);
    setWidgets(Object.values(AVAILABLE_WIDGETS));
    setWidgetSettings({});
    toast.success('Dashboard reset to default');
  };

  const exportLayout = () => {
    const config = {
      layout,
      widgets: widgets.map(w => w.id),
      settings: widgetSettings,
      role: userRole,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-config-${userRole}-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    
    toast.success('Dashboard configuration exported');
  };

  const importLayout = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result);
        setLayout(config.layout);
        setWidgets(config.widgets.map(id => AVAILABLE_WIDGETS[id]).filter(Boolean));
        setWidgetSettings(config.settings || {});
        toast.success('Dashboard configuration imported');
      } catch (error) {
        toast.error('Invalid configuration file');
      }
    };
    reader.readAsText(file);
  };

  const value = {
    layout,
    widgets,
    layouts,
    breakpoint,
    isEditing,
    showWidgetSelector,
    dashboardTheme,
    widgetSettings,
    setBreakpoint,
    updateLayout,
    toggleEditing,
    addWidget,
    removeWidget,
    setShowWidgetSelector,
    setDashboardTheme,
    updateWidgetSettings,
    resetToDefault,
    exportLayout,
    importLayout,
    availableWidgets: AVAILABLE_WIDGETS
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};