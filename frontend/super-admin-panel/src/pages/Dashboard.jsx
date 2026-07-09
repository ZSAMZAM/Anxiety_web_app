import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { superAdminApi } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import {
  Users,
  UserCog,
  Stethoscope,
  Calendar,
  Brain,
  DollarSign,
  Clock,
  Activity,
  Database,
  FileText,
  Lock,
  Settings,
  Shield,
  Server,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const Dashboard = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    loadDashboardStats();
    loadChartData();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const data = await superAdminApi.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChartData = async () => {
    try {
      // Get chart data from API
      const [appointmentsData, paymentsData] = await Promise.all([
        superAdminApi.getAppointments(),
        superAdminApi.getPaymentStats(),
      ]);
      
      const monthlyAppointments = processMonthlyData(appointmentsData?.appointments || []);
      const paymentMethods = processPaymentMethods(paymentsData);
      const monthlyRevenue = processMonthlyRevenue(paymentsData?.daily_revenue || paymentsData?.revenue_trends || []);
      
      setChartData({
        monthlyAppointments,
        paymentMethods,
        monthlyRevenue,
      });
    } catch (error) {
      console.error('Failed to load chart data:', error);
    }
  };

  const processMonthlyData = (appointments) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const monthlyData = months.map((month, index) => {
      const count = appointments.filter(appointment => {
        const date = new Date(appointment.created_at);
        return date.getMonth() === index && date.getFullYear() === currentYear;
      }).length;
      return { month, appointments: count };
    });
    return monthlyData;
  };

  const processPaymentMethods = (paymentsData) => {
    const colors = ['#14B8A6', '#F59E0B', '#22C55E', '#6366F1', '#A78BFA'];
    const counts = paymentsData?.method_counts || paymentsData?.payment_methods || paymentsData?.paymentMethods || {};
    return Object.entries(counts)
      .map(([name, value], index) => ({
        name,
        value: Number(value) || 0,
        color: colors[index % colors.length],
      }))
      .filter((item) => item.value > 0);
  };

  const processMonthlyRevenue = (dailyRevenue) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    return months.map((month, index) => {
      const revenue = dailyRevenue.reduce((sum, item) => {
        const rawDate = item.date || item.day || item.created_at;
        const date = rawDate ? new Date(rawDate) : null;
        if (!date || Number.isNaN(date.getTime()) || date.getFullYear() !== currentYear || date.getMonth() !== index) {
          return sum;
        }
        return sum + Number(item.revenue || item.amount || item.total || 0);
      }, 0);
      return { month, revenue };
    });
  };

  const getSystemHealthStatus = (health) => {
    if (!health) return { status: 'Unknown', icon: Activity, color: 'slate', bgColor: 'bg-slate-500/20' };
    
    const healthLower = health.toLowerCase();
    if (healthLower === 'healthy') {
      return { status: 'Healthy', icon: CheckCircle, color: 'emerald', bgColor: 'bg-emerald-500/20' };
    } else if (healthLower === 'warning') {
      return { status: 'Warning', icon: AlertTriangle, color: 'amber', bgColor: 'bg-amber-500/20' };
    } else if (healthLower === 'critical') {
      return { status: 'Critical', icon: XCircle, color: 'danger', bgColor: 'bg-danger/20' };
    }
    return { status: 'Unknown', icon: Activity, color: 'slate', bgColor: 'bg-slate-500/20' };
  };

  const statCards = [
    { 
      title: 'Total Patients', 
      value: stats?.total_users || 0, 
      icon: Users, 
      color: 'teal',
      source: 'Live backend metric'
    },
    { 
      title: 'Total Doctors', 
      value: stats?.total_doctors || 0, 
      icon: Stethoscope, 
      color: 'emerald',
      source: 'Live backend metric'
    },
    { 
      title: 'Total Admins', 
      value: stats?.total_admins || 0, 
      icon: UserCog, 
      color: 'primary',
      source: 'Live backend metric'
    },
    { 
      title: 'Total Appointments', 
      value: stats?.total_appointments || 0, 
      icon: Calendar, 
      color: 'secondary',
      source: 'Live backend metric'
    },
    { 
      title: 'Total Predictions', 
      value: stats?.total_predictions || 0, 
      icon: Brain, 
      color: 'teal',
      source: 'Live backend metric'
    },
    { 
      title: 'Total Revenue', 
      value: `$${stats?.total_revenue ? stats.total_revenue.toLocaleString() : 0}`, 
      icon: DollarSign, 
      color: 'emerald',
      source: 'Live backend metric'
    },
    { 
      title: 'Pending Payments', 
      value: stats?.pending_payments || 0, 
      icon: Clock, 
      color: 'amber',
      source: 'Live backend metric'
    },
    {
      title: 'Failed Logins Today',
      value: stats?.failed_logins_today || stats?.failedLoginsToday || 0,
      icon: Lock,
      color: 'danger',
      source: 'Security center metric'
    },
    {
      title: 'Blocked Access',
      value: stats?.blocked_access_attempts || stats?.blockedAccessAttempts || 0,
      icon: Shield,
      color: 'amber',
      source: 'Security center metric'
    },
  ];

  const healthStatus = getSystemHealthStatus(stats?.system_health);
  const HealthIcon = healthStatus.icon;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="dark:text-dark-text light:text-light-text">Loading dashboard...</div>
      </div>
    );
  }

  const colorClasses = {
    teal: 'bg-teal-500/20 text-teal-500',
    emerald: 'bg-emerald-500/20 text-emerald-500',
    primary: 'bg-primary/20 text-primary',
    secondary: 'bg-secondary/20 text-secondary',
    amber: 'bg-amber-500/20 text-amber-500',
    danger: 'bg-danger/20 text-danger',
    slate: 'bg-slate-500/20 text-slate-500',
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold dark:text-slate-50 text-slate-900 mb-2">IT Management Dashboard</h2>
        <p className="dark:text-slate-400 text-slate-600">Real-time system statistics and metrics</p>
      </div>

      {/* Premium Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div 
              key={card.title} 
              className="premium-card p-6 hover:scale-105 transition-transform duration-300 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-4 rounded-2xl ${colorClasses[card.color]} group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="rounded-full bg-slate-500/10 px-3 py-1 text-sm font-medium text-slate-500 dark:text-slate-300">
                  Live
                </div>
              </div>
              <h3 className="dark:text-slate-400 text-slate-600 text-sm font-medium mb-1">{card.title}</h3>
              <p className="text-3xl font-bold dark:text-slate-50 text-slate-900 mb-2">{card.value}</p>
              <div className="flex items-center gap-2 text-sm dark:text-slate-400 text-slate-600">
                <Activity className="w-4 h-4 text-teal-500" />
                <span>{card.source}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* System Health Card */}
      <div className="premium-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl ${healthStatus.bgColor}`}>
              <HealthIcon className="w-8 h-8" />
            </div>
            <div>
              <h3 className="dark:text-slate-400 text-slate-600 text-sm font-medium mb-1">System Health</h3>
              <p className="text-3xl font-bold dark:text-slate-50 text-slate-900">{healthStatus.status}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="dark:text-slate-400 text-slate-600 text-sm">Last checked</p>
            <p className="dark:text-slate-50 text-slate-900 font-medium">Just now</p>
          </div>
        </div>
      </div>

      {/* Enterprise Control Center */}
      <div className="premium-card p-6">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.35em] text-primary">IT Administration Center</p>
          <h3 className="mt-3 text-2xl font-bold dark:text-slate-50 text-slate-900">Platform Governance</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Admin Management', desc: 'Create, disable, and reset admins', icon: UserCog, path: '/super-admin/admins', tone: 'bg-primary/20 text-primary' },
            { label: 'Role Permissions', desc: 'Control access policies', icon: Shield, path: '/super-admin/roles', tone: 'bg-secondary/20 text-secondary' },
            { label: 'Security Logs', desc: 'Monitor security events', icon: Lock, path: '/super-admin/security', tone: 'bg-danger/20 text-danger' },
            { label: 'Audit Logs', desc: 'Review system activity', icon: FileText, path: '/super-admin/audit-logs', tone: 'bg-amber-500/20 text-amber-500' },
            { label: 'Backup Management', desc: 'Manage database backups', icon: Database, path: '/super-admin/backups', tone: 'bg-emerald-500/20 text-emerald-500' },
            { label: 'System Settings', desc: 'Configure platform settings', icon: Settings, path: '/super-admin/system-settings', tone: 'bg-slate-500/20 text-slate-500' },
            { label: 'System Monitoring', desc: 'Track uptime and services', icon: Server, path: '/super-admin/system-monitoring', tone: 'bg-teal-500/20 text-teal-500' },
            { label: 'Service Verification', desc: 'Review paid appointment completion', icon: CheckCircle, path: '/super-admin/service-verification', tone: 'bg-emerald-500/20 text-emerald-500' },
            { label: 'Notifications', desc: 'Send platform-wide alerts', icon: AlertTriangle, path: '/super-admin/notifications', tone: 'bg-orange-500/20 text-orange-500' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="rounded-2xl border border-slate-200/60 p-5 text-left transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-700"
              >
                <div className={`inline-flex rounded-2xl p-3 ${item.tone}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="mt-4 font-semibold dark:text-slate-50 text-slate-900">{item.label}</p>
                <p className="mt-2 text-sm dark:text-slate-400 text-slate-600">{item.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <div className="premium-card p-6">
          <h3 className="text-xl font-bold dark:text-slate-50 text-slate-900 mb-6">User Growth</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData?.monthlyAppointments || []}>
              <defs>
                <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#14B8A6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#E2E8F0'} />
              <XAxis 
                dataKey="month" 
                stroke={isDarkMode ? '#94A3B8' : '#64748B'}
                tick={{ fill: isDarkMode ? '#94A3B8' : '#64748B' }}
              />
              <YAxis 
                stroke={isDarkMode ? '#94A3B8' : '#64748B'}
                tick={{ fill: isDarkMode ? '#94A3B8' : '#64748B' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
                 border: `1px solid ${isDarkMode ? '#334155' : '#E2E8F0'}`,
                  borderRadius: '12px',
                  color: isDarkMode ? '#F8FAFC' : '#0F172A',
                }}
              />
              <Area 
                type="monotone" 
                dataKey="appointments" 
                stroke="#14B8A6" 
                fillOpacity={1} 
                fill="url(#colorPrimary)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Trend Chart */}
        <div className="premium-card p-6">
          <h3 className="text-xl font-bold dark:text-slate-50 text-slate-900 mb-6">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData?.monthlyRevenue || []}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#E2E8F0'} />
              <XAxis 
                dataKey="month" 
                stroke={isDarkMode ? '#94A3B8' : '#64748B'}
                tick={{ fill: isDarkMode ? '#94A3B8' : '#64748B' }}
              />
              <YAxis 
                stroke={isDarkMode ? '#94A3B8' : '#64748B'}
                tick={{ fill: isDarkMode ? '#94A3B8' : '#64748B' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
                  border: `1px solid ${isDarkMode ? '#334155' : '#E2E8F0'}`,
                  borderRadius: '12px',
                  color: isDarkMode ? '#F8FAFC' : '#0F172A',
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#F59E0B" 
                strokeWidth={3}
                dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Methods Distribution */}
        <div className="premium-card p-6">
          <h3 className="text-xl font-bold dark:text-slate-50 text-slate-900 mb-6">Payment Methods</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData?.paymentMethods || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData?.paymentMethods?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
                  border: `1px solid ${isDarkMode ? '#334155' : '#E2E8F0'}`,
                  borderRadius: '12px',
                  color: isDarkMode ? '#F8FAFC' : '#0F172A',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Appointments Per Month */}
        <div className="premium-card p-6">
          <h3 className="text-xl font-bold dark:text-slate-50 text-slate-900 mb-6">Appointments Per Month</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData?.monthlyAppointments || []}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#E2E8F0'} />
              <XAxis 
                dataKey="month" 
                stroke={isDarkMode ? '#94A3B8' : '#64748B'}
                tick={{ fill: isDarkMode ? '#94A3B8' : '#64748B' }}
              />
              <YAxis 
                stroke={isDarkMode ? '#94A3B8' : '#64748B'}
                tick={{ fill: isDarkMode ? '#94A3B8' : '#64748B' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
                  border: `1px solid ${isDarkMode ? '#334155' : '#E2E8F0'}`,
                  borderRadius: '12px',
                  color: isDarkMode ? '#F8FAFC' : '#0F172A',
                }}
              />
              <Bar dataKey="appointments" fill="#22C55E" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
