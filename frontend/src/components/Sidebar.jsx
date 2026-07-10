import { NavLink } from 'react-router-dom';
import {
  FiActivity,
  FiAlertTriangle,
  FiBarChart2,
  FiBell,
  FiBookOpen,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiCreditCard,
  FiFileText,
  FiHeart,
  FiHome,
  FiRefreshCcw,
  FiSearch,
  FiShield,
  FiStar,
  FiUser,
  FiUsers,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

const userMenu = [
  { labelKey: 'dashboard', path: '/user/dashboard', icon: FiHome },
  { labelKey: 'assessment', path: '/user/assessment', icon: FiActivity },
  { labelKey: 'results', path: '/user/result', icon: FiBarChart2 },
  { labelKey: 'doctors', path: '/user/doctors', icon: FiUsers },
  { labelKey: 'booking', path: '/user/booking', icon: FiBookOpen },
  { labelKey: 'appointments', path: '/user/appointments', icon: FiCalendar },
  { labelKey: 'payment', path: '/user/payment', icon: FiCreditCard },
  { labelKey: 'history', path: '/user/history', icon: FiSearch },
  { labelKey: 'notifications', path: '/user/notifications', icon: FiBell },
  { labelKey: 'profile', path: '/user/profile', icon: FiUser },
];

const adminMenu = [
  { labelKey: 'dashboard', path: '/admin/dashboard', icon: FiHome },
  { labelKey: 'users', path: '/admin/users', icon: FiUsers },
  { labelKey: 'doctors', path: '/admin/doctors', icon: FiHeart },
  { labelKey: 'doctorPasswords', path: '/admin/doctor-passwords', icon: FiShield },
  { labelKey: 'appointments', path: '/admin/appointments', icon: FiBookOpen },
  { labelKey: 'emergencyExtensions', path: '/admin/emergency-extensions', icon: FiAlertTriangle },
  { labelKey: 'payments', path: '/admin/payments', icon: FiCreditCard },
  { labelKey: 'refundRequests', path: '/admin/refund-requests', icon: FiRefreshCcw },
  { labelKey: 'predictions', path: '/admin/predictions', icon: FiActivity },
  { labelKey: 'doctorSchedules', path: '/admin/doctor-schedules', icon: FiCalendar },
  { labelKey: 'doctorReviews', path: '/admin/doctor-reviews', icon: FiStar },
  { labelKey: 'reports', path: '/admin/reports', icon: FiFileText },
  { labelKey: 'notifications', path: '/admin/notifications', icon: FiBell },
];

const doctorMenu = [
  { labelKey: 'dashboard', path: '/doctor/dashboard', icon: FiHome },
  { labelKey: 'appointments', path: '/doctor/appointments', icon: FiBookOpen },
  { labelKey: 'payments', path: '/doctor/payments', icon: FiCreditCard },
  { labelKey: 'patients', path: '/doctor/patients', icon: FiUsers },
  { labelKey: 'predictions', path: '/doctor/predictions', icon: FiActivity },
  { labelKey: 'schedule', path: '/doctor/schedule', icon: FiCalendar },
  { labelKey: 'reviews', path: '/doctor/reviews', icon: FiStar },
  { labelKey: 'reports', path: '/doctor/reports', icon: FiFileText },
  { labelKey: 'notifications', path: '/doctor/notifications', icon: FiBell },
];

function Sidebar({ open, collapsed = false, onClose, onCollapseToggle }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const role = (user?.role || '').toLowerCase();
  const isAdminRole = role === 'admin' || role === 'super_admin';
  const menu = isAdminRole ? adminMenu : role === 'doctor' ? doctorMenu : userMenu;
  const dashboardPath = isAdminRole ? '/admin/dashboard' : role === 'doctor' ? '/doctor/dashboard' : '/user/dashboard';
  const widthClass = collapsed ? 'lg:w-20' : 'lg:w-64';

  return (
    <>
      <aside className={`dashboard-sidebar fixed inset-y-0 left-0 z-40 w-64 overflow-hidden border-r border-[#E2E8F0] bg-white/94 text-[#0F172A] shadow-[18px_0_55px_-44px_rgba(37,99,235,0.35)] backdrop-blur-xl transition-all duration-300 dark:border-white/10 dark:bg-[#061A2F]/96 dark:text-[#F8FAFC] dark:shadow-[18px_0_60px_rgba(2,8,23,0.42)] ${widthClass} ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className={`flex h-full flex-col ${collapsed ? 'px-3 py-6' : 'px-4 py-6'}`}>
          <div className="flex items-center justify-between gap-2">
            <NavLink to={dashboardPath} onClick={onClose} className={`flex items-center gap-3 rounded-2xl font-semibold text-[#0F172A] transition-colors duration-300 dark:text-[#F8FAFC] ${collapsed ? 'justify-center' : ''}`}>
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#06B6D4] text-lg font-black text-white shadow-lg shadow-[#2563EB]/20">A</span>
              {!collapsed && <span className="text-xl font-semibold text-[#0F172A] dark:text-white">AnxietyCare</span>}
            </NavLink>
            {!collapsed && (
              <button type="button" onClick={onCollapseToggle} className="hidden rounded-xl border border-[#E2E8F0] p-2 text-[#2563EB] transition hover:bg-[#EFF6FF] dark:border-white/10 dark:text-[#93C5FD] dark:hover:bg-white/8 lg:inline-flex">
                <FiChevronLeft />
              </button>
            )}
          </div>

          {collapsed && (
            <button type="button" onClick={onCollapseToggle} className="mt-5 hidden rounded-xl border border-[#E2E8F0] p-2 text-[#2563EB] transition hover:bg-[#EFF6FF] dark:border-white/10 dark:text-[#93C5FD] dark:hover:bg-white/8 lg:inline-flex">
              <FiChevronRight className="mx-auto" />
            </button>
          )}

          <nav className="mt-10 flex-1 space-y-1.5">
            {menu.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  title={collapsed ? t(item.labelKey) : undefined}
                  className={({ isActive }) => `group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ${collapsed ? 'justify-center' : ''} ${isActive ? 'bg-[#DBEAFE] text-[#1D4ED8] shadow-sm dark:bg-[#123B63] dark:text-[#BFDBFE]' : 'text-[#475569] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] dark:text-[#B6C6DA] dark:hover:bg-white/8 dark:hover:text-white'}`}
                >
                  {({ isActive }) => (
                    <>
                      <span className={`absolute left-0 h-7 w-1 rounded-r-full transition ${isActive ? 'bg-[#2563EB] opacity-100 dark:bg-[#60A5FA]' : 'opacity-0'}`} />
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} />}
    </>
  );
}

export default Sidebar;
