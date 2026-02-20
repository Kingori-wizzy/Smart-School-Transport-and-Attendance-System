import { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Load saved preferences from localStorage
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved || 'light';
  });

  const [compactView, setCompactView] = useState(() => {
    const saved = localStorage.getItem('compactView');
    return saved === 'true';
  });

  const [animations, setAnimations] = useState(() => {
    const saved = localStorage.getItem('animations');
    return saved !== 'false'; // default true
  });

  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('fontSize');
    return saved || 'medium';
  });

  const [highContrast, setHighContrast] = useState(() => {
    const saved = localStorage.getItem('highContrast');
    return saved === 'true';
  });

  const [reduceMotion, setReduceMotion] = useState(() => {
    const saved = localStorage.getItem('reduceMotion');
    return saved === 'true';
  });

  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('language');
    return saved || 'en';
  });

  const [dateFormat, setDateFormat] = useState(() => {
    const saved = localStorage.getItem('dateFormat');
    return saved || 'DD/MM/YYYY';
  });

  const [timeFormat, setTimeFormat] = useState(() => {
    const saved = localStorage.getItem('timeFormat');
    return saved || '24h';
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });

  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('notifications');
    return saved !== 'false'; // default true
  });

  const [soundAlerts, setSoundAlerts] = useState(() => {
    const saved = localStorage.getItem('soundAlerts');
    return saved !== 'false'; // default true
  });

  const [alertVolume, setAlertVolume] = useState(() => {
    const saved = localStorage.getItem('alertVolume');
    return saved ? parseInt(saved) : 70;
  });

  const [autoSave, setAutoSave] = useState(() => {
    const saved = localStorage.getItem('autoSave');
    return saved !== 'false'; // default true
  });

  const [autoSaveInterval, setAutoSaveInterval] = useState(() => {
    const saved = localStorage.getItem('autoSaveInterval');
    return saved ? parseInt(saved) : 5;
  });

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('light-theme', 'dark-theme', 'high-contrast', 'reduce-motion');
    
    // Add current theme class
    root.classList.add(`${theme}-theme`);
    
    // Add high contrast if enabled
    if (highContrast) {
      root.classList.add('high-contrast');
    }
    
    // Add reduce motion if enabled
    if (reduceMotion) {
      root.classList.add('reduce-motion');
    }
    
    // Set font size
    root.style.fontSize = fontSize === 'small' ? '14px' : 
                          fontSize === 'medium' ? '16px' : '18px';
    
    // Save to localStorage
    localStorage.setItem('theme', theme);
    localStorage.setItem('highContrast', highContrast);
    localStorage.setItem('reduceMotion', reduceMotion);
    localStorage.setItem('fontSize', fontSize);
    
  }, [theme, highContrast, reduceMotion, fontSize]);

  // Save other preferences to localStorage
  useEffect(() => {
    localStorage.setItem('compactView', compactView);
    localStorage.setItem('animations', animations);
    localStorage.setItem('language', language);
    localStorage.setItem('dateFormat', dateFormat);
    localStorage.setItem('timeFormat', timeFormat);
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed);
    localStorage.setItem('notifications', notifications);
    localStorage.setItem('soundAlerts', soundAlerts);
    localStorage.setItem('alertVolume', alertVolume);
    localStorage.setItem('autoSave', autoSave);
    localStorage.setItem('autoSaveInterval', autoSaveInterval);
  }, [
    compactView, animations, language, dateFormat, timeFormat,
    sidebarCollapsed, notifications, soundAlerts, alertVolume,
    autoSave, autoSaveInterval
  ]);

  // Toggle functions
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const toggleCompactView = () => {
    setCompactView(prev => !prev);
  };

  const toggleAnimations = () => {
    setAnimations(prev => !prev);
  };

  const toggleHighContrast = () => {
    setHighContrast(prev => !prev);
  };

  const toggleReduceMotion = () => {
    setReduceMotion(prev => !prev);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
  };

  const toggleNotifications = () => {
    setNotifications(prev => !prev);
  };

  const toggleSoundAlerts = () => {
    setSoundAlerts(prev => !prev);
  };

  const toggleAutoSave = () => {
    setAutoSave(prev => !prev);
  };

  const value = {
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
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};