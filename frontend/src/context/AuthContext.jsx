import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

// Keeps the web session synchronized with backend JWT auth. Stored tokens are
// revalidated by fetching the profile, and invalid sessions are cleared.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearStoredAuth = () => {
    window.localStorage.removeItem('anxiety-user');
    window.localStorage.removeItem('anxiety-token');
    window.localStorage.removeItem('anxiety-role');
    window.sessionStorage.removeItem('anxiety-user');
    window.sessionStorage.removeItem('anxiety-token');
    window.sessionStorage.removeItem('anxiety-role');
    setUser(null);
  };

  const getAuthStorage = () => (
    window.sessionStorage.getItem('anxiety-token') || window.sessionStorage.getItem('anxiety-user')
      ? window.sessionStorage
      : window.localStorage
  );

  const getStoredToken = () => (
    window.sessionStorage.getItem('anxiety-token') || window.localStorage.getItem('anxiety-token')
  );

  const refreshUserProfile = async () => {
    const token = getStoredToken();
    if (!token) return;
    const storage = getAuthStorage();

    try {
      const profileResponse = await api.getProfile();
      const profileUser = profileResponse.user;
      if (profileUser) {
        setUser((prev) => {
          const updated = {
            ...prev,
            ...profileUser,
            fullname: profileUser.fullname || profileUser.name || prev?.fullname || prev?.name || '',
            role: (profileUser.role || prev?.role || '').toLowerCase(),
            must_change_password: Boolean(profileUser.must_change_password),
          };
          storage.setItem('anxiety-user', JSON.stringify(updated));
          return updated;
        });
      }
    } catch (err) {
      console.warn('Failed to refresh profile from backend:', err);
      clearStoredAuth();
    }
  };

  useEffect(() => {
    const storage = getAuthStorage();
    const stored = storage.getItem('anxiety-user');
    const storedRole = storage.getItem('anxiety-role');
    if (stored) {
      try {
        const parsedUser = JSON.parse(stored);
        if (storedRole && !parsedUser.role) {
          parsedUser.role = storedRole;
        }
        setUser(parsedUser);
      } catch (err) {
        console.warn('Failed to parse stored user, clearing corrupted value.', err);
        clearStoredAuth();
      }
    }

    const initializeProfile = async () => {
      if (stored && !getStoredToken()) {
        clearStoredAuth();
        setLoading(false);
        return;
      }
      if (stored && getStoredToken()) {
        await refreshUserProfile();
      }
      setLoading(false);
    };

    initializeProfile();
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearStoredAuth();
    };
    window.addEventListener('anxiety-auth-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('anxiety-auth-unauthorized', handleUnauthorized);
  }, []);

  const login = async ({ username, password, platform = 'web' }) => {
    try {
      clearStoredAuth();
      const authUser = await api.login({ username, password, platform });
      const userRecord = {
        ...authUser,
        fullname: authUser.fullname || authUser.name || authUser.username || '',
        role: (authUser.role || '').toLowerCase(),
        avatar: authUser.avatar,
        must_change_password: Boolean(authUser.must_change_password),
      };
      window.localStorage.setItem('anxiety-user', JSON.stringify(userRecord));
      window.localStorage.setItem('anxiety-role', userRecord.role);
      if (authUser.token) {
        window.localStorage.setItem('anxiety-token', authUser.token);
      }
      setUser(userRecord);
      await refreshUserProfile();
      return userRecord;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    try {
      clearStoredAuth();
    } catch (e) {
      console.warn('Error clearing stored auth during logout', e);
      setUser(null);
    }
  };

  const updateUser = (updates) => {
    setUser((prev) => {
      const updated = { ...prev, ...updates };
      getAuthStorage().setItem('anxiety-user', JSON.stringify(updated));
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
