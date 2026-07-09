import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, useEffect } from 'react';

const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {},
});

const STORAGE_KEY = 'dashboard-theme';

// Get the initial theme - called synchronously to avoid hydration issues
const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'light';

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }

    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
    return prefersDark ? 'dark' : 'light';
  } catch (error) {
    console.warn('Unable to read theme preference:', error);
    return 'light';
  }
};

// Apply theme to DOM
const applyTheme = (theme) => {
  try {
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    
    root.style.colorScheme = theme;
  } catch (error) {
    console.warn('Unable to apply theme:', error);
  }
};

// Apply theme on page load before React renders to prevent flash
if (typeof window !== 'undefined') {
  const theme = getInitialTheme();
  applyTheme(theme);
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useLayoutEffect(() => {
    applyTheme(theme);
    
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      console.warn('Unable to persist theme preference:', error);
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const newTheme = current === 'dark' ? 'light' : 'dark';
      console.log(`🌓 Theme toggled: ${current} → ${newTheme}`);
      return newTheme;
    });
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
