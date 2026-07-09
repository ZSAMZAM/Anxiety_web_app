import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronDown, FiSettings, FiLogOut, FiUser, FiLock, FiBell, FiUserCheck, FiHome, FiCalendar } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from './Avatar.jsx';

function ProfileDropdown() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const role = (user?.role || '').toLowerCase();
  const isAdminRole = role === 'admin' || role === 'super_admin';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = () => setOpen((current) => !current);

  const getDisplayName = () => {
    if (role === 'doctor') {
      return `Dr. ${user?.fullname || user?.name || 'Doctor'}`;
    } else if (isAdminRole) {
      return 'Admin User';
    } else {
      return user?.fullname || user?.name || 'User';
    }
  };

  const getSubtitle = () => {
    if (role === 'doctor') {
      return user?.specialty || 'General Practice';
    } else if (isAdminRole) {
      return role === 'super_admin' ? 'Super Administrator' : 'System Administrator';
    } else {
      return 'Patient';
    }
  };

  const getRoleLabel = () => {
    if (role === 'doctor') return 'Doctor';
    if (role === 'super_admin') return 'Super Administrator';
    if (role === 'admin') return 'Administrator';
    return 'Patient';
  };

  const getMenuItems = () => {
    if (role === 'doctor') {
      return [
        { label: 'Profile', path: '/doctor/profile', icon: FiUserCheck },
        { label: 'Change Password', path: '/doctor/settings', icon: FiLock },
        { label: 'Settings', path: '/doctor/settings', icon: FiSettings },
        { label: 'Notifications', path: '/doctor/appointments', icon: FiBell },
      ];
    } else if (isAdminRole) {
      return [
        { label: 'Dashboard', path: '/admin/dashboard', icon: FiHome },
        { label: 'Settings', path: '/admin/settings', icon: FiSettings },
      ];
    } else {
      return [
        { label: 'Profile', path: '/user/profile', icon: FiUser },
        { label: 'Change Password', path: '/user/settings', icon: FiLock },
        { label: 'Appointments', path: '/user/appointments', icon: FiCalendar },
        { label: 'Settings', path: '/user/settings', icon: FiSettings },
      ];
    }
  };

  const menuItems = getMenuItems();
  const userName = user?.fullname || user?.name || 'User';

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={toggleMenu}
        className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
      >
        <Avatar src={user?.avatar} name={userName} size="md" />
        <div className="hidden sm:block text-left">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{getDisplayName()}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">{getSubtitle()}</p>
        </div>
        <FiChevronDown className="h-4 w-4 text-slate-500" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-3 min-w-[240px] overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-2xl shadow-slate-200/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
          <div className="space-y-1 border-b border-slate-200 px-4 py-4 dark:border-slate-700">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Role</p>
            <p className="text-sm font-semibold">{getRoleLabel()}</p>
          </div>
          <div className="space-y-1 p-2">
            {menuItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate(item.path);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-slate-200 p-3 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-red-600 transition hover:bg-red-50 hover:text-red-700 dark:text-red-300 dark:hover:bg-red-950"
            >
              <FiLogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileDropdown;
