import React from 'react';
import { FiMenu, FiMoon, FiSun } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import ProfileDropdown from './ProfileDropdown.jsx';
import LanguageSelector from './LanguageSelector.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

const NotificationBell = React.lazy(() => import('./NotificationBell.jsx'));

function Navbar({ onMenuToggle }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === 'dark';
  const role = (user?.role || '').toLowerCase();
  const roleLabel = {
    admin: t('systemAdministrator'),
    super_admin: t('superAdministrator'),
    doctor: user?.specialty || t('doctor'),
    user: t('patient'),
  }[role] || t('operationsUser');

  return (
    <header className="sticky top-0 z-20 border-b border-[#E2E8F0]/70 bg-white/72 px-4 py-3 text-[#0F172A] backdrop-blur-2xl transition-colors duration-300 dark:border-white/10 dark:bg-[#061A2F]/72 dark:text-[#F8FAFC] md:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onMenuToggle} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white/86 text-[#2563EB] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#EFF6FF] dark:border-white/10 dark:bg-[#0B2239]/80 dark:text-[#93C5FD] dark:hover:bg-white/8 lg:hidden">
            <FiMenu className="h-5 w-5" />
          </button>
          <div>
            <p className="text-sm font-bold text-[#0F172A] dark:text-white">{t('hello')}, {user?.name || user?.username || t('guest')}</p>
            <p className="text-xs font-medium text-[#64748B] dark:text-[#B6C6DA]">{roleLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden sm:block">
            <LanguageSelector compact />
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white/86 text-[#2563EB] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#EFF6FF] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 dark:border-white/10 dark:bg-[#0B2239]/80 dark:text-[#93C5FD] dark:hover:bg-white/8"
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
