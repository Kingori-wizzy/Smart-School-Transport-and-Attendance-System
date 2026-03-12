import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Instead of throwing error, return default theme
    console.warn('useTheme used outside ThemeProvider, returning default theme');
    return {
      isDarkMode: false,
      colors: {
        primary: '#667eea',
        secondary: '#764ba2',
        background: '#f5f5f5',
        card: '#ffffff',
        text: '#333333',
        textSecondary: '#666666',
        border: '#dddddd',
        success: '#4CAF50',
        warning: '#FF9800',
        danger: '#f44336',
        info: '#2196F3',
      },
      toggleTheme: () => {},
    };
  }
  return context;
};

const lightColors = {
  primary: '#667eea',
  secondary: '#764ba2',
  background: '#f5f5f5',
  card: '#ffffff',
  text: '#333333',
  textSecondary: '#666666',
  border: '#dddddd',
  success: '#4CAF50',
  warning: '#FF9800',
  danger: '#f44336',
  info: '#2196F3',
};

const darkColors = {
  primary: '#5a67d8',
  secondary: '#6b46a0',
  background: '#121212',
  card: '#1e1e1e',
  text: '#ffffff',
  textSecondary: '#b0b0b0',
  border: '#333333',
  success: '#4CAF50',
  warning: '#FF9800',
  danger: '#f44336',
  info: '#2196F3',
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const theme = {
    isDarkMode,
    colors: isDarkMode ? darkColors : lightColors,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};