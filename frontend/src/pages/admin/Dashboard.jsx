import { FiUsers, FiActivity, FiTrendingUp, FiShield, FiHeart, FiDollarSign, FiCalendar, FiBarChart2, FiArrowUpRight } from 'react-icons/fi';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend, Label, LabelList } from 'recharts';
import Card from '../../components/Card.jsx';
import SectionHeader from '../../components/SectionHeader.jsx';
import { api } from '../../services/api.js';

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [paymentStats, setPaymentStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Dashboard cards are database-driven and refreshed on an interval/focus so
  // assessments, payments, and appointments appear without manual reloads.
  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const [statsData, analyticsData, paymentStatsData] = await Promise.all([
          api.getDashboardStats(),
          api.getAdminAnalytics(),
          api.getPaymentStats(),
        ]);

        if (!mounted) return;
        setStats(statsData);
        setAnalytics(analyticsData);
        setPaymentStats(paymentStatsData);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();
    const intervalId = window.setInterval(loadData, 30000);
    const onFocus = () => loadData();
    window.addEventListener('focus', onFocus);
    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
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

  const totalUsers = stats?.totalUsers || userGrowthData.reduce((sum, item) => sum + (item.count || 0), 0);
  const totalAppointments = stats?.totalAppointments || appointmentTrendsData.reduce((sum, item) => sum + (item.count || 0), 0);
  const financial = paymentStats?.summary || {};
  const totalRevenue = typeof financial.netRevenue === 'number'
    ? financial.netRevenue
    : revenueTrendsData.reduce((sum, item) => sum + (item.revenue || 0), 0);

  const appointmentSum = appointmentTrendsData.reduce((sum, item) => sum + (item.count || 0), 0);
  const averageMonthlyAppointments = appointmentTrendsData.length
    ? Math.round(appointmentSum / appointmentTrendsData.length)
    : 0;

  const bestAppointmentMonth = appointmentTrendsData.reduce((best, item) => {
    if (!best || item.count > best.count) return item;
    return best;
  }, null);

  const appointmentGrowthPercent = appointmentTrendsData.length >= 2
    ? (() => {
        const last = appointmentTrendsData[appointmentTrendsData.length - 1];
        const previous = appointmentTrendsData[appointmentTrendsData.length - 2];
        if (!previous || previous.count === 0) return last?.count ? 100 : 0;
        return Math.round(((last.count - previous.count) / previous.count) * 100);
      })()
    : 0;

  const bestRevenueMonth = revenueTrendsData.reduce((best, item) => {
    if (!best || item.revenue > best.revenue) return item;
    return best;
  }, null);

  const latestRevenueMonth = revenueTrendsData.length
    ? revenueTrendsData[revenueTrendsData.length - 1]
    : null;

  const revenueGrowthPercent = revenueTrendsData.length >= 2
    ? (() => {
        const last = revenueTrendsData[revenueTrendsData.length - 1];
        const previous = revenueTrendsData[revenueTrendsData.length - 2];
        if (!previous || previous.revenue === 0) return last?.revenue ? 100 : 0;
        return Math.round(((last.revenue - previous.revenue) / previous.revenue) * 100);
      })()
    : 0;

  const hasAppointmentData = appointmentTrendsData.length > 0;
  const hasRevenueData = revenueTrendsData.length > 0;
  const hasUserGrowthData = userGrowthData.length > 0;

  const formatCurrency = (value) => `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatChangeLabel = (percent) => {
    if (percent > 0) return `+${percent}% vs prior month`;
    if (percent < 0) return `${percent}% vs prior month`;
    return 'No change';
  };

  return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <SectionHeader subtitle="Admin dashboard" title="Monitor users, doctors, appointments, and revenue at a glance." />
          <button
            onClick={() => navigate('/admin/doctors')}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#2563EB] to-[#06B6D4] px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 shadow-lg shadow-blue-500/20"
          >
            Create Doctor
          </button>
        </div>

        {/* Revenue & appointment insights */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Card
            title="Gross Revenue"
            value={formatCurrency(financial.grossRevenue)}
            description="Successful payment volume"
            icon={<FiDollarSign />}
          />
          <Card
            title="Net Revenue"
            value={formatCurrency(totalRevenue)}
            description="Gross less approved refunds"
            icon={<FiTrendingUp />}
          />
          <Card
            title="Total Refunded"
            value={formatCurrency(financial.totalRefunded)}
            description={`${financial.refundedPayments || 0} fully refunded payments`}
            icon={<FiArrowUpRight />}
          />
          <Card
            title="Doctor Earnings"
            value={formatCurrency(financial.doctorEarnings)}
            description="Current net doctor share"
            icon={<FiUsers />}
          />
          <Card
            title="Platform Earnings"
            value={formatCurrency(financial.platformEarnings)}
            description="Current net platform share"
            icon={<FiShield />}
          />
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card
            title="New Assessments Today"
            value={stats?.newAssessmentsToday || 0}
            description="Completed today"
            icon={<FiActivity />}
          />
          <Card
            title="New Payments Today"
            value={stats?.newPaymentsToday || 0}
            description="Successful payments today"
            icon={<FiDollarSign />}
          />
          <Card
            title="New Appointments Today"
            value={stats?.newAppointmentsToday || 0}
            description="Bookings created today"
            icon={<FiCalendar />}
          />
          <Card
            title="New Doctors"
            value={stats?.newDoctorsToday || stats?.newDoctors || 0}
            description="Activated today"
            icon={<FiShield />}
          />
          <Card
            title="Total Users"
            value={stats?.totalUsers || 0}
            description={`${stats?.activeUsers || 0} active`}
            icon={<FiUsers />}
          />
          <Card
            title="Average Monthly Appointments"
            value={averageMonthlyAppointments}
            description={`Based on ${appointmentTrendsData.length || 0} months`}
            icon={<FiCalendar />}
          />
          <Card
            title="Total Appointments"
            value={stats?.totalAppointments || 0}
            description={`${stats?.pendingAppointments || 0} pending`}
            icon={<FiCalendar />}
          />
          <Card
            title="Failed Payments"
            value={stats?.failedPayments || 0}
            description="Needs review"
            icon={<FiActivity />}
          />
          <Card
            title="Unread Notifications"
            value={stats?.unreadNotifications || 0}
            description="Action required"
            icon={<FiHeart />}
          />
        </div>


        {/* Management Actions */}
        <div className="rounded-[18px] border border-[#E2E8F0] bg-white/72 p-4 shadow-[0_20px_64px_-48px_rgba(37,99,235,0.42)] backdrop-blur-xl transition-colors duration-300 dark:border-white/10 dark:bg-[#0B2239]/74">
          <div className="mb-4">
            <p className="text-sm uppercase tracking-[0.35em] text-[#2563EB] dark:text-[#93C5FD]">Management Center</p>
            <h2 className="mt-2 text-xl font-bold text-[#111827] dark:text-[#F8FAFC]">Admin Operations</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Users', desc: 'Manage platform users.', icon: FiUsers, path: '/admin/users' },
              { label: 'Doctors', desc: 'Manage therapist accounts.', icon: FiShield, path: '/admin/doctors' },
              { label: 'Appointments', desc: 'Review bookings.', icon: FiCalendar, path: '/admin/appointments' },
              { label: 'Payments', desc: 'Monitor transactions.', icon: FiDollarSign, path: '/admin/payments' },
              { label: 'Notifications', desc: 'Manage platform notices.', icon: FiHeart, path: '/admin/notifications' },
              { label: 'Reports', desc: 'Generate analytics reports.', icon: FiTrendingUp, path: '/admin/reports' },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className="group relative min-h-[126px] overflow-hidden rounded-[16px] border border-[#E2E8F0] bg-white/86 p-4 text-left text-[#0F172A] shadow-[0_18px_46px_-38px_rgba(37,99,235,0.36)] transition duration-300 ease-out hover:-translate-y-1 hover:bg-[#EFF6FF] hover:shadow-[0_24px_70px_-44px_rgba(37,99,235,0.58)] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 dark:border-white/10 dark:bg-[#0F2A44]/76 dark:text-white dark:hover:bg-[#102B46]"
                >
                  <span className="absolute right-4 top-4 text-[#2563EB]/55 transition group-hover:scale-110 dark:text-[#60A5FA]/60">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB] dark:bg-[#2563EB]/14 dark:text-[#93C5FD]">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <p className="mt-4 text-lg font-bold text-[#0F172A] dark:text-white">{action.label}</p>
                  <p className="mt-1 text-sm leading-5 text-[#64748B] dark:text-[#B6C6DA]">{action.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 xl:grid-cols-2">
          {/* User Growth Chart */}
          <div className="rounded-[18px] border border-[#E2E8F0] bg-white/72 p-4 shadow-[0_20px_64px_-48px_rgba(37,99,235,0.42)] backdrop-blur-xl transition-colors duration-300 dark:border-white/10 dark:bg-[#0B2239]/70">
            <div className="mb-4">
              <p className="text-sm uppercase tracking-[0.35em] text-[#2563EB] dark:text-[#93C5FD]">User Growth</p>
              <h2 className="mt-2 text-xl font-bold text-[#111827] dark:text-[#F8FAFC]">Registration Trends</h2>
            </div>
            <div className="mb-4 rounded-[16px] border border-[#E2E8F0] bg-[#EFF6FF]/80 p-3 text-sm text-[#64748B] dark:border-white/10 dark:bg-[#102B46]/72 dark:text-[#B6C6DA]">
              <p className="text-[#2563EB] dark:text-[#93C5FD]">Total Users</p>
              <p className="mt-1 text-2xl font-black text-[#1D4ED8] dark:text-white">{totalUsers}</p>
            </div>
            {hasUserGrowthData ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={userGrowthData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="userGrowthGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#2563EB" />
                      <stop offset="100%" stopColor="#06B6D4" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#DBEAFE" />
                  <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 12 }}>
                    <Label value="Month" position="insideBottom" offset={-10} fill="#475569" />
                  </XAxis>
                  <YAxis stroke="#475569" tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid rgba(37, 99, 235, 0.20)',
                      borderRadius: '1rem',
                      color: '#0f172a',
                      backdropFilter: 'blur(10px)'
                    }}
                    labelStyle={{ color: '#0f172a' }}
                    formatter={(value) => [value, 'Users']}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="New Users"
                    stroke="url(#userGrowthGradient)"
                    strokeWidth={4}
                    dot={{ fill: '#2563EB', stroke: '#ffffff', strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 8 }}
                    animationDuration={1500}
                    animationEasing="ease-out"
                  >
                    <LabelList dataKey="count" position="top" fill="#2563EB" style={{ fontSize: 12, fontWeight: 700 }} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex min-h-[260px] items-center justify-center rounded-[16px] border border-dashed border-[#E2E8F0] bg-[#EFF6FF]/72 text-[#475569] dark:border-white/10 dark:bg-[#102B46]/72 dark:text-[#B6C6DA]">
                No registration trend data available yet.
              </div>
            )}
          </div>

        </div>

        {/* More Charts */}
        <div className="grid gap-4 xl:grid-cols-2">
          {/* Appointments Per Month */}
          <div className="rounded-[18px] border border-[#E2E8F0] bg-white/72 p-4 shadow-[0_20px_64px_-48px_rgba(37,99,235,0.42)] backdrop-blur-xl transition-colors duration-300 dark:border-white/10 dark:bg-[#0B2239]/70">
            <div className="mb-4">
              <p className="text-sm uppercase tracking-[0.35em] text-[#2563EB] dark:text-[#93C5FD]">Appointments</p>
              <h2 className="mt-2 text-xl font-bold text-[#111827] dark:text-[#F8FAFC]">Monthly Bookings</h2>
            </div>
            <div className="mb-4 rounded-[16px] border border-[#E2E8F0] bg-[#EFF6FF]/80 p-3 text-sm text-[#64748B] dark:border-white/10 dark:bg-[#102B46]/72 dark:text-[#B6C6DA]">
              <p className="text-[#2563EB] dark:text-[#93C5FD]">Total Appointments</p>
              <p className="mt-1 text-2xl font-black text-[#1D4ED8] dark:text-white">{totalAppointments}</p>
            </div>
            {hasAppointmentData ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={appointmentTrendsData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#DBEAFE" />
                  <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 12 }}>
                    <Label value="Month" position="insideBottom" offset={-10} fill="#475569" />
                  </XAxis>
                  <YAxis stroke="#475569" tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid rgba(37, 99, 235, 0.20)',
                      borderRadius: '1rem',
                      color: '#0f172a',
                      backdropFilter: 'blur(10px)'
                    }}
                    labelStyle={{ color: '#0f172a' }}
                    formatter={(value) => [value, 'Appointments']}
                  />
                  <Legend verticalAlign="top" align="right" iconType="square" />
                  <Bar dataKey="count" name="Appointments" radius={[12, 12, 0, 0]} animationDuration={1200} animationEasing="ease-out">
                    {appointmentTrendsData.map((entry, index) => (
                      <Cell key={`cell-${entry.month}-${index}`} fill={[ '#2563EB', '#0EA5E9', '#06B6D4', '#10B981', '#3B82F6', '#38BDF8', '#14B8A6', '#60A5FA' ][index % 8]} />
                    ))}
                    <LabelList dataKey="count" position="top" fill="#2563EB" style={{ fontSize: 12, fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex min-h-[260px] items-center justify-center rounded-[16px] border border-dashed border-[#E2E8F0] bg-[#EFF6FF]/72 text-[#475569] dark:border-white/10 dark:bg-[#102B46]/72 dark:text-[#B6C6DA]">
                No appointment trend data available yet.
              </div>
            )}
          </div>

          {/* Revenue Trends */}
          <div className="rounded-[18px] border border-[#E2E8F0] bg-white/72 p-4 shadow-[0_20px_64px_-48px_rgba(37,99,235,0.42)] backdrop-blur-xl transition-colors duration-300 dark:border-white/10 dark:bg-[#0B2239]/70">
            <div className="mb-4">
              <p className="text-sm uppercase tracking-[0.35em] text-[#2563EB] dark:text-[#93C5FD]">Revenue Trends</p>
              <h2 className="mt-2 text-xl font-bold text-[#111827] dark:text-[#F8FAFC]">Monthly Earnings</h2>
            </div>
            <div className="mb-4 rounded-[16px] border border-[#E2E8F0] bg-[#EFF6FF]/80 p-3 text-sm text-[#64748B] dark:border-white/10 dark:bg-[#102B46]/72 dark:text-[#B6C6DA]">
              <p className="text-[#2563EB] dark:text-[#93C5FD]">Total Revenue</p>
              <p className="mt-1 text-2xl font-black text-[#1D4ED8] dark:text-white">${totalRevenue.toFixed(2)}</p>
            </div>
            {hasRevenueData ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={revenueTrendsData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#2563EB" />
                      <stop offset="100%" stopColor="#06B6D4" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#DBEAFE" />
                  <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 12 }}>
                    <Label value="Month" position="insideBottom" offset={-10} fill="#475569" />
                  </XAxis>
                  <YAxis stroke="#475569" tick={{ fontSize: 12 }} domain={['auto', 'auto']} tickFormatter={(value) => `$${value}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid rgba(37, 99, 235, 0.20)',
                      borderRadius: '1rem',
                      color: '#0f172a',
                      backdropFilter: 'blur(10px)'
                    }}
                    labelStyle={{ color: '#0f172a' }}
                    formatter={(value) => [`$${value.toFixed(2)}`, 'Revenue']}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="url(#revenueGradient)"
                    strokeWidth={4}
                    dot={{ fill: '#2563EB', stroke: '#ffffff', strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 8 }}
                    animationDuration={1500}
                    animationEasing="ease-out"
                  >
                    <LabelList dataKey="revenue" position="top" fill="#2563EB" style={{ fontSize: 12, fontWeight: 700 }} formatter={(value) => `$${value}`} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex min-h-[260px] items-center justify-center rounded-[16px] border border-dashed border-[#E2E8F0] bg-[#EFF6FF]/72 text-[#475569] dark:border-white/10 dark:bg-[#102B46]/72 dark:text-[#B6C6DA]">
                No revenue trend data available yet.
              </div>
            )}
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[16px] border border-[#E2E8F0] bg-white/86 p-4 shadow-[0_18px_46px_-38px_rgba(37,99,235,0.36)] backdrop-blur-xl transition-colors duration-300 dark:border-white/10 dark:bg-[#0B2239]/74">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-[#EFF6FF] p-3 dark:bg-[#2563EB]/14">
                <FiCalendar className="h-5 w-5 text-[#2563EB] dark:text-[#93C5FD]" />
              </div>
              <div>
                <p className="text-sm text-[#64748B] dark:text-[#B6C6DA]">Pending Appointments</p>
                <p className="text-2xl font-black text-[#1D4ED8] dark:text-white">{stats?.pendingAppointments || 0}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[16px] border border-[#E2E8F0] bg-white/86 p-4 shadow-[0_18px_46px_-38px_rgba(37,99,235,0.36)] backdrop-blur-xl transition-colors duration-300 dark:border-white/10 dark:bg-[#0B2239]/74">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-[#EFF6FF] p-3 dark:bg-[#2563EB]/14">
                <FiTrendingUp className="h-5 w-5 text-[#2563EB] dark:text-[#93C5FD]" />
              </div>
              <div>
                <p className="text-sm text-[#64748B] dark:text-[#B6C6DA]">Completed Appointments</p>
                <p className="text-2xl font-black text-[#1D4ED8] dark:text-white">{stats?.completedAppointments || 0}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[16px] border border-[#E2E8F0] bg-white/86 p-4 shadow-[0_18px_46px_-38px_rgba(37,99,235,0.36)] backdrop-blur-xl transition-colors duration-300 dark:border-white/10 dark:bg-[#0B2239]/74">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-red-50 p-3 dark:bg-red-500/12">
                <FiActivity className="h-5 w-5 text-[#9F3546] dark:text-[#F1A0AA]" />
              </div>
              <div>
                <p className="text-sm text-[#64748B] dark:text-[#B6C6DA]">Failed Payments</p>
                <p className="text-2xl font-black text-[#9F3546] dark:text-[#F1A0AA]">{stats?.failedPayments || 0}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[16px] border border-[#E2E8F0] bg-white/86 p-4 shadow-[0_18px_46px_-38px_rgba(37,99,235,0.36)] backdrop-blur-xl transition-colors duration-300 dark:border-white/10 dark:bg-[#0B2239]/74">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-[#EFF6FF] p-3 dark:bg-[#2563EB]/14">
                <FiHeart className="h-5 w-5 text-[#2563EB] dark:text-[#93C5FD]" />
              </div>
              <div>
                <p className="text-sm text-[#64748B] dark:text-[#B6C6DA]">Unread Notifications</p>
                <p className="text-2xl font-black text-[#1D4ED8] dark:text-white">{stats?.unreadNotifications || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}

export default AdminDashboard;
