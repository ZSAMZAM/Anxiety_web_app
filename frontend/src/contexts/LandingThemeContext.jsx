import React, { createContext, useContext, useState, useEffect } from 'react';

const LandingThemeContext = createContext();

export const LandingThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem('anxietycare-theme');
    if (savedTheme !== null) {
      return savedTheme === 'dark';
    }
    // Check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    // Apply dark/light class to document
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Save to localStorage
    localStorage.setItem('anxietycare-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  return (
    <LandingThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </LandingThemeContext.Provider>
  );
};

export const useLandingTheme = () => {
  const context = useContext(LandingThemeContext);
  if (context === undefined) {
    throw new Error('useLandingTheme must be used within a LandingThemeProvider');
  }
  return context;
};
