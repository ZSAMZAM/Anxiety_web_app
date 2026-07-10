import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronDown, FiLogOut, FiUser, FiLock, FiSettings } from 'react-icons/fi';
import { MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../services/api.js';
import Avatar from './Avatar.jsx';

function ProfileDropdown() {
  const { user, logout, updateUser } = useAuth();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordErrors, setPasswordErrors] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const role = (user?.role || '').toLowerCase();
  const isAdminRole = role === 'admin' || role === 'super_admin';

  // Refresh profile data from server to keep dropdown in sync
  const refreshProfileData = async () => {
    try {
      if (role === 'doctor') {
        const { doctor } = await api.getDoctorProfile();
        if (doctor) {
          updateUser(doctor);
        }
      } else {
        const { user: userData } = await api.getProfile();
        if (userData) {
          updateUser(userData);
        }
      }
    } catch (err) {
      console.error('Failed to refresh profile in dropdown:', err);
    }
  };

  // Listen for profile updates from other tabs/windows
  useEffect(() => {
    const handleStorageChange = () => {
      refreshProfileData();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [role]);

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

  const handlePasswordModalOpen = () => {
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordErrors({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setPasswordModalOpen(true);
  };

  const handlePasswordModalClose = () => {
    setPasswordModalOpen(false);
    setPasswordErrors({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordErrors({ currentPassword: '', newPassword: '', confirmPassword: '' });

    const nextErrors = { currentPassword: '', newPassword: '', confirmPassword: '' };
    let hasError = false;

    if (!passwordForm.currentPassword) {
      nextErrors.currentPassword = 'Current password is required.';
      hasError = true;
    }
    if (!passwordForm.newPassword) {
      nextErrors.newPassword = 'New password is required.';
      hasError = true;
    } else if (passwordForm.newPassword.length < 8) {
      nextErrors.newPassword = 'New password must be at least 8 characters.';
      hasError = true;
    }
    if (!passwordForm.confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your new password.';
      hasError = true;
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
      hasError = true;
    }

    if (hasError) {
      setPasswordErrors(nextErrors);
      return;
    }

    setPasswordSaving(true);
    try {
      await api.updateProfile({
        current_password: passwordForm.currentPassword,
        password: passwordForm.newPassword,
      });
      showToast('Password changed successfully.', 'Your password has been updated successfully.');
      handlePasswordModalClose();
    } catch (error) {
      const serverErrors = error.errors || {};
      const nextErrors = {
        currentPassword: serverErrors.current_password || serverErrors.currentPassword || '',
        newPassword: serverErrors.password || serverErrors.newPassword || '',
        confirmPassword: serverErrors.confirmPassword || serverErrors.confirm_password || '',
      };

      if (nextErrors.currentPassword || nextErrors.newPassword || nextErrors.confirmPassword) {
        setPasswordErrors((prev) => ({ ...prev, ...nextErrors }));
      } else {
        showToast('Password change failed', error.message || 'Unable to update password.');
      }
      console.error('Password update failed:', error);
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleLogoutConfirmOpen = () => {
    setLogoutConfirmOpen(true);
  };

  const handleLogoutCancel = () => {
    setLogoutConfirmOpen(false);
  };

  const handleLogout = () => {
    logout();
    try {
      window.sessionStorage.removeItem('anxiety-user');
      window.sessionStorage.removeItem('anxiety-token');
      window.sessionStorage.removeItem('anxiety-role');
    } catch (e) {
      console.warn('Error clearing sessionStorage during logout', e);
    }
    navigate('/login');
  };

  const handleMenuItemClick = (item) => {
    setOpen(false);
    if (item.action === 'logout' || item.action === 'confirmLogout') {
      handleLogoutConfirmOpen();
      return;
    }
    if (item.action === 'openPasswordModal') {
      handlePasswordModalOpen();
      return;
    }
    if (item.path) {
      if (item.path.includes('profile')) {
        refreshProfileData();
      }
      navigate(item.path);
    }
  };

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
      return user?.specialty || '';
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
        { label: 'Manage Account', path: '/doctor/profile', icon: FiUser },
        { label: 'Change Password', action: 'openPasswordModal', icon: FiLock },
        { label: 'Logout', action: 'confirmLogout', icon: FiLogOut },
      ];
    }
    
    if (isAdminRole) {
      return [
        { label: 'Manage Account', path: role === 'super_admin' ? '/super-admin/profile' : '/admin/profile', icon: FiUser },
        { label: 'Change Password', action: 'openPasswordModal', icon: FiLock },
        { label: 'Logout', action: 'confirmLogout', icon: FiLogOut },
      ];
    }

    return [
      { label: 'My Profile', path: '/user/profile', icon: FiUser },
      { label: 'Settings', path: '/user/settings', icon: FiSettings },
      { label: 'Logout', action: 'confirmLogout', icon: FiLogOut },
    ];
  };

  const menuItems = getMenuItems();
  const userName = user?.fullname || user?.name || 'User';

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={toggleMenu}
        className="inline-flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white/86 px-4 py-2 text-sm font-medium text-[#475569] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#EFF6FF] dark:border-white/10 dark:bg-[#0B2239]/80 dark:text-[#B6C6DA] dark:hover:bg-white/8"
      >
        <Avatar src={user?.avatar} name={userName} size="md" />
        <div className="hidden sm:block text-left">
          <p className="text-sm font-semibold text-[#0F172A] dark:text-white">{getDisplayName()}</p>
          <p className="text-xs text-[#64748B] dark:text-[#B6C6DA]">{getSubtitle()}</p>
        </div>
        <FiChevronDown className="h-4 w-4 text-[#64748B] dark:text-[#B6C6DA]" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[220px] overflow-hidden rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] shadow-xl shadow-blue-900/10 backdrop-blur-xl dark:border-white/10 dark:bg-[#061A2F] dark:text-white">
          <div className="border-b border-[#E2E8F0] px-3 py-2.5 dark:border-white/10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#2563EB] dark:text-[#93C5FD]">Role</p>
            <p className="text-sm font-semibold">{getRoleLabel()}</p>
          </div>
          <div className="space-y-0.5 p-1.5">
            {menuItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleMenuItemClick(item)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[#EFF6FF] hover:text-[#1D4ED8] dark:hover:bg-white/8 ${item.action === 'logout' || item.action === 'confirmLogout' ? 'text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950 hover:text-red-700' : 'text-[#475569] dark:text-[#B6C6DA]'}`}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[550px] rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)] transition-all duration-300 ease-out dark:border-slate-700 dark:bg-slate-950"
               style={{ animation: 'fadeInScale 220ms ease-out forwards' }}>
            <style>{`@keyframes fadeInScale { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }`}</style>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Change Password</h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Update your password securely.</p>
              </div>
              <button
                type="button"
                onClick={handlePasswordModalClose}
                className="rounded-full border border-slate-200 bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) => {
                      setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }));
                      setPasswordErrors((prev) => ({ ...prev, currentPassword: '' }));
                    }}
                    className="h-12 w-full rounded-[12px] border border-slate-300 bg-white px-4 pr-10 text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:ring-sky-800"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                    aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                  >
                    {showCurrentPassword ? <MdVisibilityOff className="h-5 w-5" /> : <MdVisibility className="h-5 w-5" />}
                  </button>
                </div>
                {passwordErrors.currentPassword && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-300">{passwordErrors.currentPassword}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => {
                      setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }));
                      setPasswordErrors((prev) => ({ ...prev, newPassword: '' }));
                    }}
                    className="h-12 w-full rounded-[12px] border border-slate-300 bg-white px-4 pr-10 text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:ring-sky-800"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                  >
                    {showNewPassword ? <MdVisibilityOff className="h-5 w-5" /> : <MdVisibility className="h-5 w-5" />}
                  </button>
                </div>
                {passwordErrors.newPassword && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-300">{passwordErrors.newPassword}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => {
                      setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }));
                      setPasswordErrors((prev) => ({ ...prev, confirmPassword: '' }));
                    }}
                    className="h-12 w-full rounded-[12px] border border-slate-300 bg-white px-4 pr-10 text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:ring-sky-800"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <MdVisibilityOff className="h-5 w-5" /> : <MdVisibility className="h-5 w-5" />}
                  </button>
                </div>
                {passwordErrors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-300">{passwordErrors.confirmPassword}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="inline-flex h-12 min-h-[48px] items-center justify-center gap-2 rounded-[12px] bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {passwordSaving && (
                    <span className="flex h-5 w-5 animate-spin items-center justify-center rounded-full border-2 border-white/60 border-t-white" />
                  )}
                  {passwordSaving ? 'Saving...' : 'Save Password'}
                </button>
                <button
                  type="button"
                  onClick={handlePasswordModalClose}
                  className="inline-flex h-12 items-center justify-center rounded-[12px] border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {logoutConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-950">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Confirm Logout</h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Are you sure you want to log out? You will need to sign in again to access your dashboard.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Logout
              </button>
              <button
                type="button"
                onClick={handleLogoutCancel}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileDropdown;
