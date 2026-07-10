import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import { superAdminApi } from '../services/api';
import {
  LayoutDashboard,
  Users,
  UserCog,
  Stethoscope,
  CreditCard,
  Calendar,
  Brain,
  FileText,
  ScrollText,
  ShieldCheck,
  Database,
  Settings,
  Lock,
  Bell,
  User,
  LogOut,
  Server,
  ClipboardCheck,
  Menu,
  X,
  ChevronDown,
  Search,
  Sun,
  Moon,
  ChevronRight,
} from 'lucide-react';

const SuperAdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const { t } = useLanguage();

  const menuItems = [
    { path: '/super-admin/dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
    { path: '/super-admin/admins', icon: UserCog, labelKey: 'administrators' },
    { path: '/super-admin/users', icon: Users, labelKey: 'users' },
    { path: '/super-admin/doctors', icon: Stethoscope, labelKey: 'doctors' },
    { path: '/super-admin/payments', icon: CreditCard, labelKey: 'payments' },
    { path: '/super-admin/service-verification', icon: ClipboardCheck, labelKey: 'serviceVerification' },
    { path: '/super-admin/appointments', icon: Calendar, labelKey: 'appointments' },
    { path: '/super-admin/predictions', icon: Brain, labelKey: 'predictions' },
    { path: '/super-admin/reports', icon: FileText, labelKey: 'reports' },
    { path: '/super-admin/audit-logs', icon: ScrollText, labelKey: 'auditLogs' },
    { path: '/super-admin/roles', icon: ShieldCheck, labelKey: 'rolesPermissions' },
    { path: '/super-admin/backups', icon: Database, labelKey: 'backupManagement' },
    { path: '/super-admin/system-monitoring', icon: Server, labelKey: 'systemMonitoring' },
    { path: '/super-admin/system-settings', icon: Settings, labelKey: 'systemSettings' },
    { path: '/super-admin/security', icon: Lock, labelKey: 'securityCenter' },
    { path: '/super-admin/notifications', icon: Bell, labelKey: 'notifications' },
    { path: '/super-admin/profile', icon: User, labelKey: 'profile' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/super-admin/login');
  };

  useEffect(() => {
    let mounted = true;
    const loadNotifications = async () => {
      const data = await superAdminApi.getNotifications();
      if (mounted) setNotifications((data.notifications || []).slice(0, 5));
    };
    loadNotifications();
    const timer = window.setInterval(loadNotifications, 30000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const unreadCount = notifications.filter((item) => String(item.status || 'Unread').toLowerCase() !== 'read').length;

  return (
    <div className="super-admin-shell min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-50 flex">
      {/* Sidebar */}
      <aside
        className={`super-admin-sidebar fixed inset-y-0 left-0 z-50 border-r border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,142,168,0.10)] transition-all duration-300 dark:border-white/10 dark:bg-slate-800 dark:text-slate-50 dark:shadow-[18px_0_60px_rgba(2,8,23,0.32)] ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-white/10">
            {sidebarOpen && (
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-accent text-white shadow-glow">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <span className="text-xl font-bold text-slate-900 dark:text-slate-50">{t('itManagementPanel')}</span>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl text-slate-600 transition-all duration-300 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-slate-50"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 relative ${
                    isActive
                      ? 'bg-gradient-to-r from-primary/95 to-accent/90 text-white shadow-glow'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full animate-slide-in" />
                  )}
                  <Icon className={`w-5 h-5 ${!sidebarOpen && 'mx-auto'} group-hover:scale-110 transition-transform duration-300`} />
                  {sidebarOpen && (
                    <span className="font-medium">{t(item.labelKey)}</span>
                  )}
                  {sidebarOpen && isActive && (
                    <ChevronRight className="w-4 h-4 ml-auto animate-fade-in" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-slate-200 dark:border-white/10">
            <button
              onClick={handleLogout}
              className={`group flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-danger dark:hover:bg-danger/10 hover:bg-danger/10 transition-all duration-300 ${
                !sidebarOpen && 'justify-center'
              }`}
            >
              <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
              {sidebarOpen && <span className="font-medium">{t('logout')}</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        {/* Topbar */}
        <header className="super-admin-topbar sticky top-0 z-40 border-b border-slate-200 bg-white px-6 py-4 shadow-[0_12px_30px_rgba(15,142,168,0.08)] dark:border-white/10 dark:bg-slate-800 dark:text-slate-50 dark:shadow-[0_18px_50px_rgba(2,8,23,0.24)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                {t(menuItems.find((item) => item.path === location.pathname)?.labelKey || 'dashboard')}
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <button
                  onClick={() => setSearchOpen(!searchOpen)}
                  className="p-2 rounded-xl text-slate-600 transition-all duration-300 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
                >
                  <Search className="w-5 h-5" />
                </button>
                {searchOpen && (
                  <div className="absolute right-0 top-12 w-80 premium-card p-4 animate-scale-in">
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="premium-input"
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {/* Theme Toggle */}
              <LanguageSelector />

              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl text-slate-600 transition-all duration-300 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="relative p-2 rounded-xl text-slate-600 transition-all duration-300 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full animate-pulse"></span>
                  )}
                </button>
                {notificationsOpen && (
                  <div className="absolute right-0 top-12 w-80 premium-card p-4 animate-scale-in">
                    <h3 className="font-bold dark:text-slate-50 text-slate-900 mb-4">{t('notifications')}</h3>
                    <div className="space-y-3">
                      {notifications.length === 0 && (
                        <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/8">
                          <p className="dark:text-slate-400 text-slate-600 text-sm">No real notifications yet</p>
                        </div>
                      )}
                      {notifications.map((notification) => (
                        <div key={notification.id} className="p-3 rounded-xl bg-slate-100 dark:bg-white/8">
                          <p className="font-medium dark:text-slate-50 text-slate-900 text-sm">{notification.title || notification.type || 'Notification'}</p>
                          <p className="dark:text-slate-400 text-slate-600 text-xs mt-1">{notification.message}</p>
                          <p className="dark:text-slate-400 text-slate-600 text-xs mt-2">
                            {notification.created_at ? new Date(notification.created_at).toLocaleString() : 'Just now'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center space-x-3 px-4 py-2 rounded-xl transition-all duration-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-slate-900 font-medium dark:text-slate-50">{user?.username}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform duration-300 dark:text-slate-300 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 premium-card p-2 animate-scale-in">
                    <Link
                      to="/super-admin/profile"
                      className="flex items-center space-x-3 px-4 py-3 dark:text-slate-400 text-slate-600 dark:hover:bg-slate-700 hover:bg-slate-100 dark:hover:text-slate-50 hover:text-slate-900 rounded-xl transition-all duration-300"
                      onClick={() => setProfileDropdownOpen(false)}
                    >
                      <User className="w-4 h-4" />
                      <span className="font-medium">Profile</span>
                    </Link>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        handleLogout();
                      }}
                      className="flex items-center space-x-3 w-full px-4 py-3 text-danger dark:hover:bg-danger/10 hover:bg-danger/10 rounded-xl transition-all duration-300"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="font-medium">Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="super-admin-surface min-h-[calc(100vh-73px)] bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.10),transparent_28%),linear-gradient(180deg,#F7FAFC_0%,#EEF8FB_100%)] p-6 dark:bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.22),transparent_30%),radial-gradient(circle_at_10%_0%,rgba(34,211,238,0.12),transparent_26%),linear-gradient(180deg,#0F172A_0%,#111C31_100%)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
