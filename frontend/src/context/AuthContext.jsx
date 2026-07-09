import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem('anxiety-user');
    const storedRole = window.localStorage.getItem('anxiety-role');
    if (stored) {
      try {
        const parsedUser = JSON.parse(stored);
        if (storedRole && !parsedUser.role) {
          parsedUser.role = storedRole;
        }
        setUser(parsedUser);
      } catch (err) {
        console.warn('Failed to parse stored user, clearing corrupted value.', err);
        window.localStorage.removeItem('anxiety-user');
        window.localStorage.removeItem('anxiety-token');
        window.localStorage.removeItem('anxiety-role');
      }
    }
    setLoading(false);
  }, []);

  const login = async ({ username, password, platform = 'web' }) => {
    try {
      const authUser = await api.login({ username, password, platform });
      const userRecord = {
        ...authUser,
        role: (authUser.role || '').toLowerCase(),
        avatar: authUser.avatar,
      };
      window.localStorage.setItem('anxiety-user', JSON.stringify(userRecord));
      window.localStorage.setItem('anxiety-role', userRecord.role);
      if (authUser.token) {
        window.localStorage.setItem('anxiety-token', authUser.token);
      }
      setUser(userRecord);
      return userRecord;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    window.localStorage.removeItem('anxiety-user');
    window.localStorage.removeItem('anxiety-token');
    window.localStorage.removeItem('anxiety-role');
    setUser(null);
  };

  const updateUser = (updates) => {
    setUser((prev) => {
      const updated = { ...prev, ...updates };
      window.localStorage.setItem('anxiety-user', JSON.stringify(updated));
      return updated;
    });
  };

  const value = useMemo(
    () => ({ user, loading, login, logout, updateUser }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
