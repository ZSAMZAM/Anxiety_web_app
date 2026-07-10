import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Web panel route guard. Patient accounts are blocked from web dashboards,
// while doctor/admin routes still rely on backend RBAC for API protection.
function ProtectedRoute({ requiredRole, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const role = (user?.role || '').toLowerCase();
  const isAdminRole = role === 'admin' || role === 'super_admin';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sky-50 dark:bg-[#0F172A]">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-sky-200 border-t-sky-500"></div>
          <p className="mt-4 text-slate-600 dark:text-[#CBD5E1]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (role === 'user') {
    return <Navigate to="/login" replace />;
  }

  const getRedirectPath = () => {
    if (isAdminRole) return '/admin/dashboard';
    if (role === 'doctor') return '/doctor/dashboard';
    return '/login';
  };

  if (requiredRole) {
    const hasAccess = requiredRole === 'admin'
      ? isAdminRole
      : role === requiredRole;

    if (!hasAccess) {
      return <Navigate to={getRedirectPath()} replace />;
    }
  }

  return children || <Outlet />;
}

export default ProtectedRoute;
