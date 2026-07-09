import { FiUsers, FiActivity, FiTrendingUp, FiShield, FiHeart, FiDollarSign, FiCalendar, FiSettings } from 'react-icons/fi';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import Card from '../../components/Card.jsx';
import SectionHeader from '../../components/SectionHeader.jsx';
import { api } from '../../services/api.js';

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsData, analyticsData] = await Promise.all([
          api.getDashboardStats(),
          api.getAdminAnalytics(),
        ]);

        setStats(statsData);
        setAnalytics(analyticsData);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="mt-4 text-slate-500 dark:text-slate-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const userGrowthData = analytics?.user_growth || [];
  const revenueTrendsData = analytics?.revenue_trends || [];
  const appointmentTrendsData = analytics?.appointment_trends || [];

  return (
      <div className="space-y-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <SectionHeader subtitle="Admin dashboard" title="Monitor users, doctors, appointments, and revenue at a glance." />
          <button
            onClick={() => navigate('/admin/doctors')}
            className="inline-flex items-center gap-2 rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-sky-600 shadow-lg"
          >
            Create Doctor
          </button>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <Card
            title="Total Users"
            value={stats?.totalUsers || 0}
            description={`${stats?.activeUsers || 0} active`}
            icon={<FiUsers />}
          />
          <Card
            title="Total Doctors"
            value={stats?.totalDoctors || stats?.activeDoctors || 0}
            description={`${stats?.activeDoctors || 0} active therapists`}
            icon={<FiShield />}
          />
          <Card
            title="Total Appointments"
            value={stats?.totalAppointments || 0}
            description={`${stats?.pendingAppointments || 0} pending`}
            icon={<FiCalendar />}
          />
          <Card
            title="Total Payments"
            value={stats?.totalPayments || 0}
            description={`${stats?.failedPayments || 0} failed`}
            icon={<FiDollarSign />}
          />
          <Card
            title="Revenue"
            value={`$${stats?.totalPaymentAmount?.toFixed(2) || '0.00'}`}
            description="Collected consultation fees"
            icon={<FiDollarSign />}
          />
          <Card
            title="System Status"
            value="Online"
            description="API and database monitored"
            icon={<FiActivity />}
          />
        </div>

        {/* Management Actions */}
        <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-6 shadow-xl backdrop-blur-xl transition-colors duration-300 dark:border-slate-700 dark:bg-slate-950/80">
          <div className="mb-6">
            <p className="text-sm uppercase tracking-[0.35em] text-sky-600 dark:text-sky-300">Management Center</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">Admin Operations</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'User CRUD', desc: 'Create, update, disable, or delete users', icon: FiUsers, path: '/admin/users', tone: 'from-sky-500 to-cyan-500' },
              { label: 'Doctor CRUD', desc: 'Manage therapist accounts and profiles', icon: FiShield, path: '/admin/doctors', tone: 'from-emerald-500 to-teal-500' },
              { label: 'Appointments', desc: 'Review bookings and update statuses', icon: FiCalendar, path: '/admin/appointments', tone: 'from-violet-500 to-indigo-500' },
              { label: 'Payments', desc: 'Monitor transactions and failed payments', icon: FiDollarSign, path: '/admin/payments', tone: 'from-amber-500 to-orange-500' },
              { label: 'Notifications', desc: 'Create and manage platform notices', icon: FiHeart, path: '/admin/notifications', tone: 'from-fuchsia-500 to-purple-500' },
              { label: 'Reports', desc: 'Export user, doctor, booking, and revenue reports', icon: FiTrendingUp, path: '/admin/reports', tone: 'from-slate-700 to-slate-900' },
              { label: 'Settings', desc: 'Review admin-facing system settings', icon: FiSettings, path: '/admin/settings', tone: 'from-red-500 to-rose-600' },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className={`rounded-3xl bg-gradient-to-br ${action.tone} p-5 text-left text-white shadow-lg transition hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-cyan-400`}
                >
                  <Icon className="h-6 w-6" />
                  <p className="mt-4 font-semibold">{action.label}</p>
                  <p className="mt-2 text-xs leading-5 text-white/80">{action.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 xl:grid-cols-2">
          {/* User Growth Chart */}
          <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-6 shadow-xl backdrop-blur-xl transition-colors duration-300 dark:border-slate-700 dark:bg-slate-950/80">
            <div className="mb-6">
              <p className="text-sm uppercase tracking-[0.35em] text-sky-600 dark:text-sky-300">User Growth</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">Registration Trends</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '1rem',
                    color: '#0f172a',
                    backdropFilter: 'blur(10px)'
                  }}
                  labelStyle={{ color: '#0f172a' }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

        </div>

        {/* More Charts */}
        <div className="grid gap-6 xl:grid-cols-2">
          {/* Appointments Per Month */}
          <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-6 shadow-xl backdrop-blur-xl transition-colors duration-300 dark:border-slate-700 dark:bg-slate-950/80">
            <div className="mb-6">
              <p className="text-sm uppercase tracking-[0.35em] text-sky-600 dark:text-sky-300">Appointments</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">Monthly Bookings</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={appointmentTrendsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '1rem',
                    color: '#0f172a',
                    backdropFilter: 'blur(10px)'
                  }}
                  labelStyle={{ color: '#0f172a' }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue Trends */}
          <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-6 shadow-xl backdrop-blur-xl transition-colors duration-300 dark:border-slate-700 dark:bg-slate-950/80">
            <div className="mb-6">
              <p className="text-sm uppercase tracking-[0.35em] text-sky-600 dark:text-sky-300">Revenue Trends</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">Monthly Earnings</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueTrendsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '1rem',
                    color: '#0f172a',
                    backdropFilter: 'blur(10px)'
                  }}
                  labelStyle={{ color: '#0f172a' }}
                  formatter={(value) => [`$${value?.toFixed(2)}`, 'Revenue']}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-6 shadow-xl backdrop-blur-xl transition-colors duration-300 dark:border-slate-700 dark:bg-slate-950/80">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800">
                <FiCalendar className="w-6 h-6 text-sky-500 dark:text-sky-400" />
              </div>
              <div>
                <p className="text-sm text-slate-700 dark:text-slate-400">Pending Appointments</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{stats?.pendingAppointments || 0}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-6 shadow-xl backdrop-blur-xl transition-colors duration-300 dark:border-slate-700 dark:bg-slate-950/80">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800">
                <FiTrendingUp className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-slate-700 dark:text-slate-400">Completed Appointments</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{stats?.completedAppointments || 0}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-6 shadow-xl backdrop-blur-xl transition-colors duration-300 dark:border-slate-700 dark:bg-slate-950/80">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800">
                <FiActivity className="w-6 h-6 text-rose-500 dark:text-rose-400" />
              </div>
              <div>
                <p className="text-sm text-slate-700 dark:text-slate-400">Failed Payments</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{stats?.failedPayments || 0}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-6 shadow-xl backdrop-blur-xl transition-colors duration-300 dark:border-slate-700 dark:bg-slate-950/80">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800">
                <FiHeart className="w-6 h-6 text-amber-500 dark:text-amber-300" />
              </div>
              <div>
                <p className="text-sm text-slate-700 dark:text-slate-400">Unread Notifications</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{stats?.unreadNotifications || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}

export default AdminDashboard;
