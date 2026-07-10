import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import SuperAdminLayout from './layouts/SuperAdminLayout';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdminManagement = lazy(() => import('./pages/AdminManagement'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const DoctorManagement = lazy(() => import('./pages/DoctorManagement'));
const Payments = lazy(() => import('./pages/Payments'));
const Appointments = lazy(() => import('./pages/Appointments'));
const Predictions = lazy(() => import('./pages/Predictions'));
const Reports = lazy(() => import('./pages/Reports'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const RoleManagement = lazy(() => import('./pages/RoleManagement'));
const DatabaseBackups = lazy(() => import('./pages/DatabaseBackups'));
const SystemSettings = lazy(() => import('./pages/SystemSettings'));
const SecurityCenter = lazy(() => import('./pages/SecurityCenter'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Profile = lazy(() => import('./pages/Profile'));
const SystemMonitoring = lazy(() => import('./pages/SystemMonitoring'));
const ServiceVerification = lazy(() => import('./pages/ServiceVerification'));

const PageFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center text-gray-400">
    Loading...
  </div>
);

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
        <Suspense fallback={<PageFallback />}>
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
        </Suspense>
      </AuthProvider>
    </Router>
  );
}

export default App;
