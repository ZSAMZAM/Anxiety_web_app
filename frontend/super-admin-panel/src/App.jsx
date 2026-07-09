import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import SuperAdminLayout from './layouts/SuperAdminLayout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import AdminManagement from './pages/AdminManagement';
import UserManagement from './pages/UserManagement';
import DoctorManagement from './pages/DoctorManagement';
import Payments from './pages/Payments';
import Appointments from './pages/Appointments';
import Predictions from './pages/Predictions';
import Reports from './pages/Reports';
import AuditLogs from './pages/AuditLogs';
import RoleManagement from './pages/RoleManagement';
import DatabaseBackups from './pages/DatabaseBackups';
import SystemSettings from './pages/SystemSettings';
import SecurityCenter from './pages/SecurityCenter';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import SystemMonitoring from './pages/SystemMonitoring';
import ServiceVerification from './pages/ServiceVerification';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-gray-400">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/super-admin/login" replace />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-gray-400">Loading...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/super-admin/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route
            path="/it-management/login"
            element={<Navigate to="/super-admin/login" replace />}
          />
          <Route
            path="/it-management/*"
            element={<Navigate to="/super-admin/dashboard" replace />}
          />
          <Route
            path="/super-admin/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/super-admin"
            element={
              <ProtectedRoute>
                <SuperAdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/super-admin/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="admins" element={<AdminManagement />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="doctors" element={<DoctorManagement />} />
            <Route path="payments" element={<Payments />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="predictions" element={<Predictions />} />
            <Route path="reports" element={<Reports />} />
            <Route path="audit-logs" element={<AuditLogs />} />
            <Route path="roles" element={<RoleManagement />} />
            <Route path="backups" element={<DatabaseBackups />} />
            <Route path="system-settings" element={<SystemSettings />} />
            <Route path="security" element={<SecurityCenter />} />
            <Route path="system-monitoring" element={<SystemMonitoring />} />
            <Route path="service-verification" element={<ServiceVerification />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/super-admin/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
