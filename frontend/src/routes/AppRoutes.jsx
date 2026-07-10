import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

const Login = lazy(() => import('../pages/auth/Login.jsx'));
const Splash = lazy(() => import('../pages/Splash.jsx'));
const LandingPage = lazy(() => import('../pages/LandingPage.jsx'));
const UserDashboard = lazy(() => import('../pages/user/Dashboard.jsx'));
const AdminDashboard = lazy(() => import('../pages/admin/Dashboard.jsx'));
const Assessment = lazy(() => import('../pages/user/Assessment.jsx'));
const ResultPage = lazy(() => import('../pages/user/ResultPage.jsx'));
const DoctorsPage = lazy(() => import('../pages/user/DoctorsPage.jsx'));
const BookingPage = lazy(() => import('../pages/user/BookingPage.jsx'));
const SuccessPage = lazy(() => import('../pages/user/SuccessPage.jsx'));
const Appointments = lazy(() => import('../pages/user/Appointments.jsx'));
const AdminDoctors = lazy(() => import('../pages/admin/Doctors.jsx'));
const AdminDoctorPasswords = lazy(() => import('../pages/admin/DoctorPasswords.jsx'));
const Payment = lazy(() => import('../pages/shared/Payment.jsx'));
const History = lazy(() => import('../pages/shared/History.jsx'));
const Profile = lazy(() => import('../pages/shared/Profile.jsx'));
const AdminUsers = lazy(() => import('../pages/admin/Users.jsx'));
const AdminAppointments = lazy(() => import('../pages/admin/Appointments.jsx'));
const AdminEmergencyExtensions = lazy(() => import('../pages/admin/EmergencyExtensions.jsx'));
const AdminPayments = lazy(() => import('../pages/admin/Payments.jsx'));
const AdminRefundRequests = lazy(() => import('../pages/admin/RefundRequests.jsx'));
const AdminPredictions = lazy(() => import('../pages/admin/Predictions.jsx'));
const AdminDoctorSchedules = lazy(() => import('../pages/admin/DoctorSchedules.jsx'));
const AdminNotifications = lazy(() => import('../pages/admin/Notifications.jsx'));
const AdminReports = lazy(() => import('../pages/admin/Reports.jsx'));
const AdminDoctorReviews = lazy(() => import('../pages/admin/DoctorReviews.jsx'));
const NotFound = lazy(() => import('../pages/shared/NotFound.jsx'));
const NotificationsPage = lazy(() => import('../pages/user/Notifications.jsx'));
const DoctorDashboard = lazy(() => import('../pages/doctor/DoctorDashboard.jsx'));
const DoctorAppointments = lazy(() => import('../pages/doctor/DoctorAppointments.jsx'));
const DoctorPayments = lazy(() => import('../pages/doctor/DoctorPayments.jsx'));
const DoctorPatients = lazy(() => import('../pages/doctor/DoctorPatients.jsx'));
const DoctorPredictions = lazy(() => import('../pages/doctor/DoctorPredictions.jsx'));
const DoctorSchedule = lazy(() => import('../pages/doctor/DoctorSchedule.jsx'));
const DoctorReports = lazy(() => import('../pages/doctor/DoctorReports.jsx'));
const DoctorReviews = lazy(() => import('../pages/doctor/DoctorReviews.jsx'));

const PageFallback = () => (
  <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A] flex items-center justify-center text-sm text-slate-500 dark:text-[#CBD5E1]">
    Loading...
  </div>
);

function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/splash" element={<Splash />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Navigate to="/login" replace />} />

      <Route
        path="/user"
        element={
          <ProtectedRoute requiredRole="user">
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<UserDashboard />} />
        <Route path="assessment" element={<Assessment />} />
        <Route path="result" element={<ResultPage />} />
        <Route path="doctors" element={<DoctorsPage />} />
        <Route path="booking/success" element={<SuccessPage />} />
        <Route path="booking/:doctorId" element={<BookingPage />} />
        <Route path="booking" element={<BookingPage />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="payment" element={<Payment />} />
        <Route path="history" element={<History />} />
        <Route path="profile" element={<Profile />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      <Route path="/doctor-dashboard" element={<Navigate to="/doctor/dashboard" replace />} />

      <Route
        path="/doctor"
        element={
          <ProtectedRoute requiredRole="doctor">
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DoctorDashboard />} />
        <Route path="appointments" element={<DoctorAppointments />} />
        <Route path="payments" element={<DoctorPayments />} />
        <Route path="patients" element={<DoctorPatients />} />
        <Route path="predictions" element={<DoctorPredictions />} />
        <Route path="schedule" element={<DoctorSchedule />} />
        <Route path="reports" element={<DoctorReports />} />
        <Route path="reviews" element={<DoctorReviews />} />
        <Route path="profile" element={<Profile />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin">
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="doctors" element={<AdminDoctors />} />
        <Route path="doctor-passwords" element={<AdminDoctorPasswords />} />
        <Route path="appointments" element={<AdminAppointments />} />
        <Route path="emergency-extensions" element={<AdminEmergencyExtensions />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="refund-requests" element={<AdminRefundRequests />} />
        <Route path="predictions" element={<AdminPredictions />} />
        <Route path="doctor-schedules" element={<AdminDoctorSchedules />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="doctor-reviews" element={<AdminDoctorReviews />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="profile" element={<Profile />} />
      </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;
