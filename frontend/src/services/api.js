import axios from 'axios';

// =========================================================
// AXIOS INSTANCE SETUP
// =========================================================

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

// =========================================================
// REQUEST INTERCEPTOR - Add auth token to every request
// =========================================================

axiosInstance.interceptors.request.use(
  (config) => {
    const token = window.localStorage.getItem('anxiety-token');
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

// =========================================================
// RESPONSE INTERCEPTOR - Handle responses and errors
// =========================================================

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

const normalizePredictionResult = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized.includes('anxiety')) return 'anxiety';
  if (normalized.includes('depression')) return 'depression';
  if (normalized.includes('neutral')) return 'neutral';
  return 'neutral';
};

export const api = {
  submitAssessment: async ({ text }) => {
    try {
      const response = await axiosInstance.post('/predict', { text });
      const data = response.data;
      const result = normalizePredictionResult(data.result || data.class_name);
      let recommendedActions = [];

      if (result === 'neutral' || (result === 'anxiety' && data.confidence < 0.70)) {
        try {
          const recResponse = await axiosInstance.get('/recommendations', {
            params: {
              text,
              prediction: data.class_name,
              confidence: data.confidence,
            },
          });

          if (Array.isArray(recResponse.data.recommendations) && recResponse.data.recommendations.length) {
            recommendedActions = recResponse.data.recommendations;
          }
        } catch (recError) {
          console.warn('Recommendations unavailable:', recError);
        }
      }

      return {
        result,
        anxietyLevel: data.class_name || result,
        confidence: Math.round(data.confidence * 100),
        summary: `Detected ${data.class_name || result} with ${Math.round(data.confidence * 100)}% confidence.`,
        recommendedActions,
        raw: data,
      };
    } catch (error) {
      console.error('Assessment request failed:', error);
      throw error;
    }
  },

  getPredictionHistory: async () => {
    try {
      const { data } = await axiosInstance.get('/history');
      return (data.history || []).map((item) => {
        const rawResult = item.result || item.anxietyLevel || item.prediction_result || item.class_name || '';
        const normalizedResult = normalizePredictionResult(rawResult);
        const isoDate = item.date || item.created_at || new Date().toISOString().split('T')[0];

        // Normalize confidence to an integer percentage (0-100)
        const rawConfidence = typeof item.confidence === 'number' ? item.confidence : (item.confidence_score || item.confidence || 0);
        const confidencePercent = rawConfidence > 1 ? Math.round(rawConfidence) : Math.round(rawConfidence * 100);

        return {
          id: item.id,
          date: isoDate,
          result: normalizedResult,
          anxietyLevel: item.anxietyLevel || item.prediction_result || item.class_name || normalizedResult,
          confidence: Number.isFinite(confidencePercent) ? confidencePercent : 0,
          summary: item.summary || `Detected ${item.anxietyLevel || item.prediction_result || item.class_name || normalizedResult} with ${Number.isFinite(confidencePercent) ? confidencePercent : 0}% confidence.`,
        };
      });
    } catch (error) {
      console.error('Failed to load prediction history:', error);
      return [];
    }
  },

  getDoctors: async (params = {}) => {
    try {
      const { data } = await axiosInstance.get('/doctors', { params });
      return data.doctors || [];
    } catch (error) {
      console.error('Failed to load doctors:', error);
      throw error;
    }
  },

  getDoctorAvailability: async (doctorId) => {
    try {
      const { data } = await axiosInstance.get(`/doctors/${doctorId}/availability`);
      return data;
    } catch (error) {
      console.error('Failed to load doctor availability:', error);
      throw error;
    }
  },

  getUsers: async () => {
    try {
      const { data } = await axiosInstance.get('/users');
      return data.users || [];
    } catch (error) {
      console.error('Failed to load users:', error);
      return [];
    }
  },

  getDashboardStats: async () => {
    try {
      const { data } = await axiosInstance.get('/dashboard-stats');
      return data.stats || {
        totalUsers: 0,
        totalPredictions: 0,
        totalAppointments: 0,
        totalPayments: 0,
        recentPredictions: 0,
        pendingAppointments: 0,
        totalPaymentAmount: 0,
      };
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
      return {
        totalUsers: 0,
        totalPredictions: 0,
        totalAppointments: 0,
        totalPayments: 0,
        recentPredictions: 0,
        pendingAppointments: 0,
        totalPaymentAmount: 0,
      };
    }
  },

  healthCheck: async () => {
    try {
      const { data } = await axiosInstance.get('/health');
      return data;
    } catch (error) {
      const message = formatAxiosError(error);
      console.error('Health check failed:', message);
      throw new Error(message);
    }
  },

  getUserAppointments: async (userId) => {
    try {
      const { data } = await axiosInstance.get(`/appointments/user/${userId}`);
      if (Array.isArray(data)) {
        return data;
      }
      return data.appointments || [];
    } catch (error) {
      console.error('Failed to load appointment history:', error);
      throw error;
    }
  },

  getAppointments: async () => {
    try {
      const { data } = await axiosInstance.get('/appointments');
      return data.appointments || [];
    } catch (error) {
      console.error('Failed to load appointments:', error);
      throw error;
    }
  },

  cancelAppointment: async (appointmentId) => {
    try {
      const { data } = await axiosInstance.put(`/appointments/${appointmentId}`, { status: 'Cancelled' });
      return data;
    } catch (error) {
      console.error('Failed to cancel appointment:', error);
      throw error;
    }
  },

  getPayments: async (userId) => {
    try {
      const { data } = await axiosInstance.get('/payments', {
        params: { user_id: userId }
      });
      return data.payments || [];
    } catch (error) {
      console.error('Failed to load payments:', error);
      return [];
    }
  },

  bookAppointment: async (payload) => {
    try {
      const { data } = await axiosInstance.post('/appointments', payload);
      return data.appointment || {};
    } catch (error) {
      console.error('Failed to book appointment:', error);
      const message = error?.response?.data?.error || 'Unable to complete booking.';
      throw new Error(message);
    }
  },

  processPayment: async (payload) => {
    try {
      const { data } = await axiosInstance.post('/payments', payload);
      return data.payment || {};
    } catch (error) {
      console.error('Payment request failed:', error);
      throw error;
    }
  },

  login: async ({ username, password, platform }) => {
    try {
      const { data } = await axiosInstance.post('/login', { username, password, platform });
      return { ...(data.user || {}), role: data.role || data.user?.role, token: data.token };
    } catch (error) {
      const message = error?.response?.data?.error || 'Login failed.';
      throw new Error(message);
    }
  },

  updateProfile: async ({ name, email, password }) => {
    try {
      const payload = { name, email };
      if (password) {
        payload.password = password;
      }
      const { data } = await axiosInstance.put('/profile', payload);
      return data;
    } catch (error) {
      const message = error?.response?.data?.error || 'Profile update failed.';
      throw new Error(message);
    }
  },

  // Admin API methods
  getAdminAppointments: async (params = {}) => {
    try {
      const { data } = await axiosInstance.get('/admin/appointments', { params });
      return data;
    } catch (error) {
      console.error('Failed to load admin appointments:', error);
      return { appointments: [], total: 0, page: 1, limit: 10, pages: 0 };
    }
  },

  updateAppointmentStatus: async (appointmentId, status) => {
    try {
      const { data } = await axiosInstance.put(`/admin/appointments/${appointmentId}`, { status });
      return data;
    } catch (error) {
      console.error('Failed to update appointment status:', error);
      throw error;
    }
  },

  getDoctorAppointments: async () => {
    try {
      const { data } = await axiosInstance.get('/doctor/appointments');
      return data;
    } catch (error) {
      console.error('Failed to load doctor appointments:', error);
      throw new Error(formatAxiosError(error));
    }
  },

  updateDoctorAppointmentStatus: async (appointmentId, status) => {
    try {
      const { data } = await axiosInstance.put(`/doctor/appointments/${appointmentId}`, { status });
      return data;
    } catch (error) {
      console.error('Failed to update doctor appointment status:', error);
      throw new Error(formatAxiosError(error));
    }
  },

  getAdminPayments: async (params = {}) => {
    try {
      const { data } = await axiosInstance.get('/admin/payments', { params });
      return data;
    } catch (error) {
      console.error('Failed to load admin payments:', error);
      return { payments: [], total: 0, page: 1, limit: 10, pages: 0 };
    }
  },

  getPaymentStats: async () => {
    try {
      const { data } = await axiosInstance.get('/admin/payments/stats');
      return data;
    } catch (error) {
      console.error('Failed to load payment stats:', error);
      return {
        status_counts: {},
        method_counts: {},
        daily_revenue: [],
        total_revenue: 0
      };
    }
  },

  updatePaymentServiceStatus: async (paymentId, payload) => {
    try {
      const { data } = await axiosInstance.put(`/admin/payments/${paymentId}/service`, payload);
      return data;
    } catch (error) {
      console.error('Failed to update payment service status:', error);
      throw new Error(formatAxiosError(error));
    }
  },

  refundPayment: async (paymentId, payload) => {
    try {
      const { data } = await axiosInstance.post(`/admin/payments/${paymentId}/refund`, payload);
      return data;
    } catch (error) {
      console.error('Failed to process refund:', error);
      throw new Error(formatAxiosError(error));
    }
  },

  getPaymentAudit: async (paymentId) => {
    try {
      const { data } = await axiosInstance.get(`/admin/payments/${paymentId}/audit`);
      return data.audit_logs || [];
    } catch (error) {
      console.error('Failed to load payment audit history:', error);
      return [];
    }
  },

  getAdminNotifications: async (params = {}) => {
    try {
      const { data } = await axiosInstance.get('/admin/notifications', { params });
      return data;
    } catch (error) {
      console.error('Failed to load admin notifications:', error);
      return { notifications: [], total: 0, page: 1, limit: 10, pages: 0 };
    }
  },

  sendNotification: async (payload) => {
    try {
      const { data } = await axiosInstance.post('/admin/notifications', payload);
      return data;
    } catch (error) {
      console.error('Failed to send notification:', error);
      throw error;
    }
  },

  deleteAdminNotification: async (notificationId) => {
    try {
      const { data } = await axiosInstance.delete(`/admin/notifications/${notificationId}`);
      return data;
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw error;
    }
  },

  uploadAvatar: async (formData) => {
    try {
      const { data } = await axiosInstance.post('/profile/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return data;
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      throw error;
    }
  },

  getAvatarUrl: (avatarPath) => {
    if (!avatarPath) return null;
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) return avatarPath;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';
    return `${apiUrl}${avatarPath}`;
  },

  getInitials: (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  },

  getInitialsColor: (name) => {
    const colors = ['#0891B2', '#06B6D4', '#14B8A6', '#10B981', '#0F172A', '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', '#F97316'];
    if (!name) return colors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  },

  getAdminAnalytics: async () => {
    try {
      const { data } = await axiosInstance.get('/admin/analytics');
      return data;
    } catch (error) {
      console.error('Failed to load admin analytics:', error);
      return {
        user_growth: [],
        prediction_trends: [],
        appointment_trends: [],
        revenue_trends: [],
        anxiety_trends: []
      };
    }
  },

  getReports: async (params = {}) => {
    try {
      const { data } = await axiosInstance.get('/reports', { params });
      return data;
    } catch (error) {
      console.error('Failed to load reports:', error);
      return { reports: [], total: 0, page: 1, limit: 10 };
    }
  },

  getAdminReports: async (params = {}) => {
    try {
      const { data } = await axiosInstance.get('/admin/reports', { params });
      return data;
    } catch (error) {
      console.error('Failed to load admin reports:', error);
      return { reports: [], total: 0, page: 1, limit: 10 };
    }
  },

  getReport: async (reportId) => {
    try {
      const { data } = await axiosInstance.get(`/reports/${reportId}`);
      return data.report;
    } catch (error) {
      console.error('Failed to load report details:', error);
      return null;
    }
  },

  getAdminReport: async (reportId) => {
    try {
      const { data } = await axiosInstance.get(`/admin/reports/${reportId}`);
      return data.report;
    } catch (error) {
      console.error('Failed to load report details:', error);
      return null;
    }
  },

  getReportStats: async () => {
    try {
      const { data } = await axiosInstance.get('/reports/stats');
      return data;
    } catch (error) {
      console.error('Failed to load report stats:', error);
      return { totalReports: 0, generatedReports: 0, predictionAccuracy: 0, exportDownloads: 0 };
    }
  },

  getReportCharts: async () => {
    try {
      const { data } = await axiosInstance.get('/reports/charts');
      return data;
    } catch (error) {
      console.error('Failed to load report charts:', error);
      return { monthlyActivity: [], predictionTrends: [], userAnalytics: [], mentalHealthStats: [] };
    }
  },

  exportReportPdf: async (reportId) => {
    try {
      const response = await axiosInstance.get(`/admin/reports/${reportId}/export/pdf`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Failed to export report PDF:', error);
      throw error;
    }
  },

  exportReportCsv: async (reportId) => {
    try {
      const response = await axiosInstance.get(`/admin/reports/${reportId}/export/csv`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Failed to export report CSV:', error);
      throw error;
    }
  },

  downloadReportPdf: async (reportId) => {
    try {
      const response = await axiosInstance.get(`/admin/reports/${reportId}/export/pdf`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Failed to download report PDF:', error);
      throw error;
    }
  },

  getAdminUsers: async (params = {}) => {
    try {
      const { data } = await axiosInstance.get('/admin/users', { params });
      return data;
    } catch (error) {
      console.error('Failed to load admin users:', error);
      throw error;
    }
  },

  getAdminDoctors: async (params = {}) => {
    try {
      const { data } = await axiosInstance.get('/admin/doctors', { params });
      return data.doctors || [];
    } catch (error) {
      console.error('Failed to load admin doctors:', error);
      throw error;
    }
  },

  createDoctor: async (doctorData) => {
    try {
      const { data } = await axiosInstance.post('/doctors/create', doctorData);
      return data;
    } catch (error) {
      console.error('Failed to create doctor:', error);
      throw error;
    }
  },

  updateDoctor: async (doctorId, doctorData) => {
    try {
      const { data } = await axiosInstance.put(`/admin/doctors/${doctorId}`, doctorData);
      return data;
    } catch (error) {
      console.error('Failed to update doctor:', error);
      throw error;
    }
  },

  deleteDoctor: async (doctorId) => {
    try {
      const { data } = await axiosInstance.delete(`/admin/doctors/${doctorId}`);
      return data;
    } catch (error) {
      console.error('Failed to delete doctor:', error);
      throw error;
    }
  },

  updateUserStatus: async (userId, status) => {
    try {
      const { data } = await axiosInstance.put(`/admin/users/${userId}`, { status });
      return data;
    } catch (error) {
      console.error('Failed to update user status:', error);
      throw error;
    }
  },

  createAdminUser: async (userData) => {
    try {
      const { data } = await axiosInstance.post('/admin/users', userData);
      return data;
    } catch (error) {
      console.error('Failed to create admin user:', error);
      throw error;
    }
  },

  updateAdminUser: async (userId, userData) => {
    try {
      const { data } = await axiosInstance.put(`/admin/users/${userId}`, userData);
      return data;
    } catch (error) {
      console.error('Failed to update admin user:', error);
      throw error;
    }
  },

  deleteUser: async (userId) => {
    try {
      const { data } = await axiosInstance.delete(`/admin/users/${userId}`);
      return data;
    } catch (error) {
      console.error('Failed to delete user:', error);
      throw error;
    }
  },

  getUserStats: async () => {
    try {
      const { data } = await axiosInstance.get('/user/stats');
      return data.stats || {};
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
      throw new Error(formatAxiosError(error));
    }
  },

  // User notifications
  getUserNotifications: async () => {
    try {
      const { data } = await axiosInstance.get('/user/notifications');
      return data.notifications || [];
    } catch (error) {
      console.error('Failed to load user notifications:', error);
      return [];
    }
  },

  getRecommendations: async (params = {}) => {
    try {
      const { data } = await axiosInstance.get('/recommendations', { params });
      return data.recommendations || [];
    } catch (error) {
      console.error('Failed to load recommendations:', error);
      return [];
    }
  },

  markNotificationRead: async (notificationId) => {
    try {
      const { data } = await axiosInstance.put(`/user/notifications/${notificationId}/read`);
      return data;
    } catch (error) {
      console.error('Failed to mark notification read:', error);
      throw error;
    }
  },

  markNotificationUnread: async (notificationId) => {
    try {
      const { data } = await axiosInstance.put(`/user/notifications/${notificationId}/unread`);
      return data;
    } catch (error) {
      console.error('Failed to mark notification unread:', error);
      throw error;
    }
  },

  markAllNotificationsRead: async () => {
    try {
      const { data } = await axiosInstance.put('/user/notifications/mark-all-read');
      return data;
    } catch (error) {
      console.error('Failed to mark all notifications read:', error);
      throw error;
    }
  },

  deleteNotification: async (notificationId) => {
    try {
      const { data } = await axiosInstance.delete(`/user/notifications/${notificationId}`);
      return data;
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw error;
    }
  },

  // Export axiosInstance for advanced use cases
  axiosInstance,
};

// =========================================================
// PUBLIC LANDING PAGE API METHODS (No authentication required)
// =========================================================

export const publicApi = {
  getPublicStats: async () => {
    try {
      const { data } = await axiosInstance.get('/public/stats');
      return data.stats || {
        totalPatients: 0,
        totalDoctors: 0,
        totalAssessments: 0,
        successfulAppointments: 0
      };
    } catch (error) {
      console.error('Failed to load public stats:', error);
      return {
        totalPatients: 0,
        totalDoctors: 0,
        totalAssessments: 0,
        successfulAppointments: 0
      };
    }
  },

  getFeaturedDoctors: async (limit = 6) => {
    try {
      const { data } = await axiosInstance.get('/public/featured-doctors', { params: { limit } });
      return data.doctors || [];
    } catch (error) {
      console.error('Failed to load featured doctors:', error);
      return [];
    }
  },

  getTestimonials: async () => {
    try {
      const { data } = await axiosInstance.get('/public/testimonials');
      return data.testimonials || [];
    } catch (error) {
      console.error('Failed to load testimonials:', error);
      return [];
    }
  },

  submitContactForm: async (formData) => {
    try {
      const { data } = await axiosInstance.post('/public/contact', formData);
      return data;
    } catch (error) {
      console.error('Failed to submit contact form:', error);
      throw error;
    }
  },
};

export { axiosInstance, formatAxiosError as parseApiError };
