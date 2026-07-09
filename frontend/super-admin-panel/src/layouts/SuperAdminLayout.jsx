import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
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

  const menuItems = [
    { path: '/super-admin/dashboard', icon: LayoutDashboard, label: 'IT Management Dashboard' },
    { path: '/super-admin/admins', icon: UserCog, label: 'Administrators' },
    { path: '/super-admin/users', icon: Users, label: 'Users' },
    { path: '/super-admin/doctors', icon: Stethoscope, label: 'Doctors' },
    { path: '/super-admin/payments', icon: CreditCard, label: 'Payments' },
    { path: '/super-admin/service-verification', icon: ClipboardCheck, label: 'Service Verification' },
    { path: '/super-admin/appointments', icon: Calendar, label: 'Appointments' },
    { path: '/super-admin/predictions', icon: Brain, label: 'Predictions' },
    { path: '/super-admin/reports', icon: FileText, label: 'Reports' },
    { path: '/super-admin/audit-logs', icon: ScrollText, label: 'Audit Logs' },
    { path: '/super-admin/roles', icon: ShieldCheck, label: 'Roles & Permissions' },
    { path: '/super-admin/backups', icon: Database, label: 'Backup Management' },
    { path: '/super-admin/system-monitoring', icon: Server, label: 'System Monitoring' },
    { path: '/super-admin/system-settings', icon: Settings, label: 'System Settings' },
    { path: '/super-admin/security', icon: Lock, label: 'Security Center' },
    { path: '/super-admin/notifications', icon: Bell, label: 'Notifications' },
    { path: '/super-admin/profile', icon: User, label: 'Profile' },
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
    <div className="min-h-screen dark:bg-slate-900 bg-slate-50 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 dark:bg-slate-800 bg-white dark:border-r dark:border-slate-700 border-slate-200 transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 dark:border-b dark:border-slate-700 border-b border-slate-200">
            {sidebarOpen && (
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/20 rounded-xl">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                </div>
                <span className="text-xl font-bold dark:text-slate-50 text-slate-900">IT Management Panel</span>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl dark:hover:bg-slate-700 hover:bg-slate-100 dark:text-slate-400 text-slate-600 dark:hover:text-slate-50 hover:text-slate-900 transition-all duration-300"
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
                      ? 'bg-primary text-white shadow-glow'
                      : 'dark:text-slate-400 text-slate-600 dark:hover:bg-slate-700 hover:bg-slate-100 dark:hover:text-slate-50 hover:text-slate-900'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full animate-slide-in" />
                  )}
                  <Icon className={`w-5 h-5 ${!sidebarOpen && 'mx-auto'} group-hover:scale-110 transition-transform duration-300`} />
                  {sidebarOpen && (
                    <span className="font-medium">{item.label}</span>
                  )}
                  {sidebarOpen && isActive && (
                    <ChevronRight className="w-4 h-4 ml-auto animate-fade-in" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 dark:border-t dark:border-slate-700 border-t border-slate-200">
            <button
              onClick={handleLogout}
              className={`group flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-danger dark:hover:bg-danger/10 hover:bg-danger/10 transition-all duration-300 ${
                !sidebarOpen && 'justify-center'
              }`}
            >
              <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
              {sidebarOpen && <span className="font-medium">Logout</span>}
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
        <header className="dark:bg-slate-800 bg-white dark:border-b dark:border-slate-700 border-b border-slate-200 px-6 py-4 sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold dark:text-slate-50 text-slate-900">
                {menuItems.find((item) => item.path === location.pathname)?.label || 'Dashboard'}
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <button
                  onClick={() => setSearchOpen(!searchOpen)}
                  className="p-2 rounded-xl dark:hover:bg-slate-700 hover:bg-slate-100 dark:text-slate-400 text-slate-600 dark:hover:text-slate-50 hover:text-slate-900 transition-all duration-300"
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
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl dark:hover:bg-slate-700 hover:bg-slate-100 dark:text-slate-400 text-slate-600 dark:hover:text-slate-50 hover:text-slate-900 transition-all duration-300"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="p-2 rounded-xl dark:hover:bg-slate-700 hover:bg-slate-100 dark:text-slate-400 text-slate-600 dark:hover:text-slate-50 hover:text-slate-900 transition-all duration-300 relative"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full animate-pulse"></span>
                  )}
                </button>
                {notificationsOpen && (
                  <div className="absolute right-0 top-12 w-80 premium-card p-4 animate-scale-in">
                    <h3 className="font-bold dark:text-slate-50 text-slate-900 mb-4">Notifications</h3>
                    <div className="space-y-3">
                      {notifications.length === 0 && (
                        <div className="p-3 dark:bg-slate-700 bg-slate-100 rounded-xl">
                          <p className="dark:text-slate-400 text-slate-600 text-sm">No real notifications yet</p>
                        </div>
                      )}
                      {notifications.map((notification) => (
                        <div key={notification.id} className="p-3 dark:bg-slate-700 bg-slate-100 rounded-xl">
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
                  className="flex items-center space-x-3 px-4 py-2 rounded-xl dark:hover:bg-slate-700 hover:bg-slate-100 transition-all duration-300"
                >
                  <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <span className="dark:text-slate-50 text-slate-900 font-medium">{user?.username}</span>
                  <ChevronDown className={`w-4 h-4 dark:text-slate-400 text-slate-600 transition-transform duration-300 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
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
        <main className="super-admin-surface p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
