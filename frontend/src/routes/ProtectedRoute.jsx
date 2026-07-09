import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function ProtectedRoute({ requiredRole, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const role = (user?.role || '').toLowerCase();
  const isAdminRole = role === 'admin' || role === 'super_admin';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sky-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-sky-200 border-t-sky-500"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading...</p>
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

  if (requiredRole) {
    const hasAccess = requiredRole === 'admin' ? isAdminRole : role === requiredRole;

    if (!hasAccess) {
      return <Navigate to="/login" replace />;
    }
  }

  return children || <Outlet />;
}

export default ProtectedRoute;
