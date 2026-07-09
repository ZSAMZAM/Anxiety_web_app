import React from 'react';
import { FiMenu, FiMoon, FiSun } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import ProfileDropdown from './ProfileDropdown.jsx';

const NotificationBell = React.lazy(() => import('./NotificationBell.jsx'));

function Navbar({ onMenuToggle }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const role = (user?.role || '').toLowerCase();
  const roleLabel = {
    admin: 'System Administrator',
    super_admin: 'Super Administrator',
    doctor: user?.specialty || 'Therapist',
    user: 'Patient',
  }[role] || 'Operations User';

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-4 text-slate-900 shadow-sm transition-colors duration-300 md:px-6 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onMenuToggle} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 lg:hidden dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
            <FiMenu className="h-5 w-5" />
          </button>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Hello, {user?.name || user?.username || 'Guest'}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">{roleLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition-colors duration-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {isDark ? <FiSun className="h-5 w-5" /> : <FiMoon className="h-5 w-5" />}
          </button>

          <div className="hidden md:block">
            <div className="inline-block">
              <React.Suspense fallback={<div className="inline-block h-10 w-10" />}>
                <NotificationBell />
              </React.Suspense>
            </div>
          </div>

          <ProfileDropdown />
        </div>
      </div>
    </header>
  );
}

export default Navbar;
