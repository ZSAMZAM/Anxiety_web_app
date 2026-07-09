import axios from 'axios';

const defaultApiUrl = import.meta.env.DEV ? '/api' : 'http://127.0.0.1:5000/api';
const apiBaseUrl = import.meta.env.DEV ? '/api' : import.meta.env.VITE_API_BASE_URL || defaultApiUrl;

const axiosInstance = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const formatAxiosError = (error) => {
  if (!error) return 'Unknown error occurred.';
  if (error.response) {
    return error.response.data?.error || `Server error: ${error.response.status}`;
  }
  if (error.request) {
    return `Network Error: Cannot connect to backend at ${apiBaseUrl}`;
  }
  return error.message || 'Unknown error occurred.';
};

axiosInstance.interceptors.request.use(
  (config) => {
    const token = window.localStorage.getItem('super-admin-token');
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }
    console.log(`📤 API Request: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => {
    console.log(`📥 API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error(`❌ API Error ${error.response.status}:`, error.response.data);
      error.message = formatAxiosError(error);
    } else if (error.request) {
      console.error('❌ No response from server. Check if backend is running:', error.request);
      error.message = formatAxiosError(error);
      error.isNetworkError = true;
    } else {
      console.error('❌ Request setup error:', error.message);
      error.message = formatAxiosError(error);
    }
    return Promise.reject(error);
  }
);

export const superAdminApi = {
  login: async ({ username, password }) => {
    try {
      const { data } = await axiosInstance.post('/super-admin/login', { username, password });
      return data;
    } catch (error) {
      const message = error?.response?.data?.error || 'Login failed.';
      throw new Error(message);
    }
  },

  getDashboardStats: async () => {
    try {
      const { data } = await axiosInstance.get('/super-admin/dashboard');
      return data;
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
      return {
        totalUsers: 0,
        totalDoctors: 0,
        totalAdmins: 0,
        totalAppointments: 0,
        totalPredictions: 0,
        totalRevenue: 0,
        pendingPayments: 0,
        systemHealth: 'unknown',
      };
    }
  },

  getAdmins: async (params = {}) => {
    try {
      const { data } = await axiosInstance.get('/super-admin/admins', { params });
      return data;
    } catch (error) {
      console.error('Failed to load admins:', error);
      return { admins: [], total: 0, page: 1, limit: 10, pages: 0 };
    }
  },

  createAdmin: async (adminData) => {
    try {
      const { data } = await axiosInstance.post('/super-admin/admins', adminData);
      return data;
    } catch (error) {
      console.error('Failed to create admin:', error);
      throw error;
    }
  },

  updateAdmin: async (adminId, adminData) => {
    try {
      const { data } = await axiosInstance.put(`/super-admin/admins/${adminId}`, adminData);
      return data;
    } catch (error) {
      console.error('Failed to update admin:', error);
      throw error;
    }
  },

  deleteAdmin: async (adminId) => {
    try {
      const { data } = await axiosInstance.delete(`/super-admin/admins/${adminId}`);
      return data;
    } catch (error) {
      console.error('Failed to delete admin:', error);
      throw error;
    }
  },

  suspendAdmin: async (adminId) => {
    try {
      const { data } = await axiosInstance.put(`/super-admin/admins/${adminId}/suspend`);
      return data;
    } catch (error) {
      console.error('Failed to suspend admin:', error);
      throw error;
    }
  },

  activateAdmin: async (adminId) => {
    try {
      const { data } = await axiosInstance.put(`/super-admin/admins/${adminId}/activate`);
      return data;
    } catch (error) {
      console.error('Failed to activate admin:', error);
      throw error;
    }
  },

  getUsers: async (params = {}) => {
    try {
      const { data } = await axiosInstance.get('/super-admin/users', { params });
      return data;
    } catch (error) {
      console.error('Failed to load users:', error);
      return { users: [], total: 0, page: 1, limit: 10, pages: 0 };
    }
  },

  updateUserStatus: async (userId, status) => {
    try {
      const { data } = await axiosInstance.put(`/super-admin/users/${userId}`, { status });
      return data;
    } catch (error) {
      console.error('Failed to update user status:', error);
      throw error;
    }
  },

  deleteUser: async (userId) => {
    try {
      const { data } = await axiosInstance.delete(`/super-admin/users/${userId}`);
      return data;
    } catch (error) {
      console.error('Failed to delete user:', error);
      throw error;
    }
  },

  exportUsers: async () => {
    try {
      const response = await axiosInstance.get('/super-admin/users/export', {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Failed to export users:', error);
      throw error;
    }
  },

  getDoctors: async (params = {}) => {
    try {
      const { data } = await axiosInstance.get('/super-admin/doctors', { params });
      return data;
    } catch (error) {
      console.error('Failed to load doctors:', error);
      return { doctors: [], total: 0, page: 1, limit: 10, pages: 0 };
    }
  },

  approveDoctor: async (doctorId) => {
    try {
      const { data } = await axiosInstance.put(`/super-admin/doctors/${doctorId}/approve`);
      return data;
    } catch (error) {
      console.error('Failed to approve doctor:', error);
      throw error;
    }
  },

  suspendDoctor: async (doctorId) => {
    try {
      const { data } = await axiosInstance.put(`/super-admin/doctors/${doctorId}/suspend`);
      return data;
    } catch (error) {
      console.error('Failed to suspend doctor:', error);
      throw error;
    }
  },

  activateDoctor: async (doctorId) => {
    try {
      const { data } = await axiosInstance.put(`/super-admin/doctors/${doctorId}/activate`);
      return data;
    } catch (error) {
      console.error('Failed to activate doctor:', error);
      throw error;
    }
  },

  deleteDoctor: async (doctorId) => {
    try {
      const { data } = await axiosInstance.delete(`/super-admin/doctors/${doctorId}`);
      return data;
    } catch (error) {
      console.error('Failed to delete doctor:', error);
      throw error;
    }
  },

  getPayments: async (params = {}) => {
    try {
      const { data } = await axiosInstance.get('/super-admin/payments', { params });
      return data;
    } catch (error) {
      console.error('Failed to load payments:', error);
      return { payments: [], total: 0, page: 1, limit: 10, pages: 0 };
    }
  },

  getPaymentStats: async () => {
    try {
      const { data } = await axiosInstance.get('/super-admin/payments/stats');
      return data;
    } catch (error) {
      console.error('Failed to load payment stats:', error);
      return {
        todayRevenue: 0,
        monthlyRevenue: 0,
        totalRevenue: 0,
        failedTransactions: 0,
      };
    }
  },

  getAppointments: async (params = {}) => {
    try {
      const { data } = await axiosInstance.get('/super-admin/appointments', { params });
      return data;
    } catch (error) {
      console.error('Failed to load appointments:', error);
      return { appointments: [], total: 0, page: 1, limit: 10, pages: 0 };
    }
  },

  getPredictions: async (params = {}) => {
    try {
      const { data } = await axiosInstance.get('/super-admin/predictions', { params });
      return data;
    } catch (error) {
      console.error('Failed to load predictions:', error);
      return { predictions: [], total: 0, page: 1, limit: 10, pages: 0 };
    }
  },

  getReports: async (params = {}) => {
    try {
      const { data } = await axiosInstance.get('/super-admin/reports', { params });
      return data;
    } catch (error) {
      console.error('Failed to load reports:', error);
      return { reports: [], total: 0, page: 1, limit: 10, pages: 0 };
    }
  },

  generateReport: async (reportData) => {
    try {
      const { data } = await axiosInstance.post('/super-admin/reports', reportData);
      return data;
    } catch (error) {
      console.error('Failed to generate report:', error);
      throw error;
    }
  },

  getAuditLogs: async (params = {}) => {
    try {
      const { data } = await axiosInstance.get('/super-admin/audit-logs', { params });
      return data;
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      return { logs: [], total: 0, page: 1, limit: 10, pages: 0 };
    }
  },

  getRoles: async () => {
    try {
      const { data } = await axiosInstance.get('/super-admin/roles');
      return data;
    } catch (error) {
      console.error('Failed to load roles:', error);
      return { roles: [] };
    }
  },

  updateRolePermissions: async (roleId, permissions) => {
    try {
      const { data } = await axiosInstance.put(`/super-admin/roles/${roleId}`, { permissions });
      return data;
    } catch (error) {
      console.error('Failed to update role permissions:', error);
      throw error;
    }
  },

  getBackups: async () => {
    try {
      const { data } = await axiosInstance.get('/super-admin/backups');
      return data;
    } catch (error) {
      console.error('Failed to load backups:', error);
      return { backups: [] };
    }
  },

  createBackup: async () => {
    try {
      const { data } = await axiosInstance.post('/super-admin/backups');
      return data;
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw error;
    }
  },

  downloadBackup: async (backupId) => {
    try {
      const response = await axiosInstance.get(`/super-admin/backups/${backupId}/download`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Failed to download backup:', error);
      throw error;
    }
  },

  deleteBackup: async (backupId) => {
    try {
      const { data } = await axiosInstance.delete(`/super-admin/backups/${backupId}`);
      return data;
    } catch (error) {
      console.error('Failed to delete backup:', error);
      throw error;
    }
  },

  getSystemSettings: async () => {
    try {
      const { data } = await axiosInstance.get('/super-admin/system-settings');
      return data;
    } catch (error) {
      console.error('Failed to load system settings:', error);
      return { settings: {} };
    }
  },

  updateSystemSettings: async (settings) => {
    try {
      const { data } = await axiosInstance.put('/super-admin/system-settings', settings);
      return data;
    } catch (error) {
      console.error('Failed to update system settings:', error);
      throw error;
    }
  },

  getSecurityStats: async () => {
    try {
      const { data } = await axiosInstance.get('/super-admin/security');
      return data;
    } catch (error) {
      console.error('Failed to load security stats:', error);
      return {
        totalLoginAttempts: 0,
        successfulLogins: 0,
        failedLogins: 0,
        failedLoginsToday: 0,
        blockedAccessAttempts: 0,
        lockedAccounts: 0,
        activeSessions: 0,
        blockedAccounts: 0,
        otpAttempts: 0,
        recentLogins: [],
        loginAttempts: [],
        suspiciousActivity: [],
      };
    }
  },

  getSystemMonitoring: async () => {
    try {
      const { data } = await axiosInstance.get('/super-admin/system-monitoring');
      return data;
    } catch (error) {
      console.error('Failed to load system monitoring:', error);
      return {
        apiStatus: 'unknown',
        databaseStatus: 'unknown',
        serverHealth: 'unknown',
        cpuUsage: 0,
        memoryUsage: 0,
        storageUsage: 0,
        systemUptime: 0,
      };
    }
  },

  getServiceVerification: async () => {
    try {
      const { data } = await axiosInstance.get('/super-admin/service-verification');
      return data;
    } catch (error) {
      console.error('Failed to load service verification:', error);
      return { records: [], summary: {} };
    }
  },

  sendNotification: async (notificationData) => {
    try {
      const { data } = await axiosInstance.post('/super-admin/notifications', notificationData);
      return data;
    } catch (error) {
      console.error('Failed to send notification:', error);
      throw error;
    }
  },

  getNotifications: async () => {
    try {
      const { data } = await axiosInstance.get('/super-admin/notifications');
      return data;
    } catch (error) {
      console.error('Failed to load IT notifications:', error);
      return { notifications: [] };
    }
  },

  getProfile: async () => {
    try {
      const { data } = await axiosInstance.get('/super-admin/profile');
      return data;
    } catch (error) {
      console.error('Failed to load profile:', error);
      throw error;
    }
  },

  updateProfile: async (profileData) => {
    try {
      const { data } = await axiosInstance.put('/super-admin/profile', profileData);
      return data;
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post('/super-admin/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      window.localStorage.removeItem('super-admin-token');
      window.localStorage.removeItem('super-admin-id');
      window.localStorage.removeItem('super-admin-username');
      window.localStorage.removeItem('super-admin-role');
    }
  },
};

export { axiosInstance, formatAxiosError };
