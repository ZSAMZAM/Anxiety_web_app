import { NavLink } from 'react-router-dom';
import { FiHome, FiActivity, FiUsers, FiUser, FiHeart, FiBookOpen, FiCreditCard, FiBarChart2, FiFileText, FiLogOut, FiSearch, FiCalendar, FiSettings, FiBell } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext.jsx';

const userMenu = [
  { label: 'Dashboard', path: '/user/dashboard', icon: FiHome },
  { label: 'Assessment', path: '/user/assessment', icon: FiActivity },
  { label: 'Results', path: '/user/result', icon: FiBarChart2 },
  { label: 'Doctors', path: '/user/doctors', icon: FiUsers },
  { label: 'Booking', path: '/user/booking', icon: FiBookOpen },
  { label: 'Appointments', path: '/user/appointments', icon: FiCalendar },
  { label: 'Payment', path: '/user/payment', icon: FiCreditCard },
  { label: 'History', path: '/user/history', icon: FiSearch },
  { label: 'Notifications', path: '/user/notifications', icon: FiBell },
  { label: 'Profile', path: '/user/profile', icon: FiUser },
];

const adminMenu = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: FiHome },
  { label: 'Users', path: '/admin/users', icon: FiUsers },
  { label: 'Doctors', path: '/admin/doctors', icon: FiHeart },
  { label: 'Appointments', path: '/admin/appointments', icon: FiBookOpen },
  { label: 'Payments', path: '/admin/payments', icon: FiCreditCard },
  { label: 'Notifications', path: '/admin/notifications', icon: FiBell },
  { label: 'Reports', path: '/admin/reports', icon: FiFileText },
  { label: 'Settings', path: '/admin/settings', icon: FiSettings },
  { label: 'Profile', path: '/admin/profile', icon: FiUser },
];

const doctorMenu = [
  { label: 'Dashboard', path: '/doctor/dashboard', icon: FiHome },
  { label: 'Appointments', path: '/doctor/appointments', icon: FiBookOpen },
  { label: 'Patients', path: '/doctor/patients', icon: FiUsers },
  { label: 'Predictions', path: '/doctor/predictions', icon: FiActivity },
  { label: 'Schedule', path: '/doctor/schedule', icon: FiCalendar },
  { label: 'Reports', path: '/doctor/reports', icon: FiFileText },
  { label: 'Settings', path: '/doctor/settings', icon: FiSettings },
];

function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const isAdminRole = role === 'admin' || role === 'super_admin';
  const menu = isAdminRole ? adminMenu : role === 'doctor' ? doctorMenu : userMenu;
  const dashboardPath = isAdminRole ? '/admin/dashboard' : role === 'doctor' ? '/doctor/dashboard' : '/login';

  return (
    <>
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 overflow-hidden border-r border-slate-200 bg-white/95 text-slate-900 backdrop-blur-xl shadow-xl transition-transform duration-300 dark:border-slate-800 dark:bg-slate-950/95 dark:text-slate-100 ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex h-full flex-col justify-between px-6 py-8">
          <div>
            <NavLink to={dashboardPath} onClick={onClose} className="mb-12 inline-flex items-center gap-3 text-2xl font-semibold text-slate-900 transition-colors duration-300 dark:text-slate-100">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg">A</span>
              AnxietyCare
            </NavLink>
            <div className="space-y-1">
              {menu.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition hover:shadow-md ${isActive ? 'bg-gradient-to-r from-blue-500 to-cyan-400 text-white shadow-lg' : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'}`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </div>
          <div className="space-y-4">
            <button
              onClick={logout}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-200 shadow-sm dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <FiLogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={onClose} />}
    </>
  );
}

export default Sidebar;
