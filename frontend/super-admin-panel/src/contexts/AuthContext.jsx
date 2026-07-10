import React, { createContext, useContext, useState, useEffect } from 'react';
import { superAdminApi } from '../services/api';

const AuthContext = createContext(null);

const isItManagementRole = (role) => ['SUPER_ADMIN', 'IT_ADMIN', 'super_admin', 'it_admin'].includes(role);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const clearSession = async ({ remote = true } = {}) => {
    if (remote) {
      try {
        await superAdminApi.logout();
      } catch (error) {
        console.error('Logout error:', error);
      }
    } else {
      window.localStorage.removeItem('super-admin-token');
      window.localStorage.removeItem('super-admin-id');
      window.localStorage.removeItem('super-admin-username');
      window.localStorage.removeItem('super-admin-role');
    }

    setUser(null);
    setIsAuthenticated(false);
  };

  useEffect(() => {
    const token = window.localStorage.getItem('super-admin-token');
    const superAdminId = window.localStorage.getItem('super-admin-id');
    const username = window.localStorage.getItem('super-admin-username');
    const role = window.localStorage.getItem('super-admin-role');

    const verifyStoredSession = async () => {
      if (!token || !superAdminId || !isItManagementRole(role)) {
        await clearSession({ remote: false });
        setLoading(false);
        return;
      }

      try {
        const profile = await superAdminApi.getProfile();
        setUser({
          id: profile.id || superAdminId,
          username: profile.username || username,
          role,
        });
        setIsAuthenticated(true);
      } catch (error) {
        console.warn('Stored IT Management session is invalid:', error);
        await clearSession();
      } finally {
        setLoading(false);
      }
    };

    verifyStoredSession();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await superAdminApi.login(credentials);
      
      if (!isItManagementRole(response.role)) {
        throw new Error('Access denied. IT administrator role required.');
      }

      window.localStorage.setItem('super-admin-token', response.token);
      window.localStorage.setItem('super-admin-id', response.super_admin_id);
      window.localStorage.setItem('super-admin-username', response.username);
      window.localStorage.setItem('super-admin-role', response.role);

      setUser({
        id: response.super_admin_id,
        username: response.username,
        role: response.role,
      });
      setIsAuthenticated(true);
      
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    await clearSession();
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
