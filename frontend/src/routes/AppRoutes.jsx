import { Navigate, Route, Routes } from 'react-router-dom';
import Login from '../pages/auth/Login.jsx';
import Splash from '../pages/Splash.jsx';
import LandingPage from '../pages/LandingPage.jsx';
import UserDashboard from '../pages/user/Dashboard.jsx';
import AdminDashboard from '../pages/admin/Dashboard.jsx';
import Assessment from '../pages/user/Assessment.jsx';
import ResultPage from '../pages/user/ResultPage.jsx';
import DoctorsPage from '../pages/user/DoctorsPage.jsx';
import BookingPage from '../pages/user/BookingPage.jsx';
import SuccessPage from '../pages/user/SuccessPage.jsx';
import Appointments from '../pages/user/Appointments.jsx';
import AdminDoctors from '../pages/admin/Doctors.jsx';
import Payment from '../pages/shared/Payment.jsx';
import History from '../pages/shared/History.jsx';
import Profile from '../pages/shared/Profile.jsx';
import AdminUsers from '../pages/admin/Users.jsx';
import AdminAppointments from '../pages/admin/Appointments.jsx';
import AdminPayments from '../pages/admin/Payments.jsx';
import AdminNotifications from '../pages/admin/Notifications.jsx';
import AdminReports from '../pages/admin/Reports.jsx';
import AdminSettings from '../pages/admin/Settings.jsx';
import NotFound from '../pages/shared/NotFound.jsx';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import NotificationsPage from '../pages/user/Notifications.jsx';
import DoctorDashboard from '../pages/doctor/DoctorDashboard.jsx';
import DoctorAppointments from '../pages/doctor/DoctorAppointments.jsx';
import DoctorPatients from '../pages/doctor/DoctorPatients.jsx';
import DoctorPredictions from '../pages/doctor/DoctorPredictions.jsx';
import DoctorProfile from '../pages/doctor/DoctorProfile.jsx';
import DoctorSchedule from '../pages/doctor/DoctorSchedule.jsx';
import DoctorSettings from '../pages/doctor/DoctorSettings.jsx';
import DoctorReports from '../pages/doctor/DoctorReports.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

function AppRoutes() {
  return (
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
        <Route path="patients" element={<DoctorPatients />} />
        <Route path="predictions" element={<DoctorPredictions />} />
        <Route path="schedule" element={<DoctorSchedule />} />
        <Route path="reports" element={<DoctorReports />} />
        <Route path="profile" element={<DoctorProfile />} />
        <Route path="settings" element={<DoctorSettings />} />
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
        <Route path="appointments" element={<AdminAppointments />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
