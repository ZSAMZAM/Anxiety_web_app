import { FiAlertTriangle, FiBell, FiCalendar, FiCheck, FiClock, FiCreditCard, FiDollarSign, FiFilter, FiRefreshCw, FiSearch, FiUser, FiUsers, FiX, FiActivity } from 'react-icons/fi';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

function DoctorDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState({});
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const loadDashboard = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [appointmentsResult, notificationsResult, paymentsResult] = await Promise.allSettled([
        api.getDoctorAppointments(),
        api.getUserNotifications(),
        api.getDoctorPayments(),
      ]);

      if (appointmentsResult.status === 'rejected') {
        throw appointmentsResult.reason;
      }

      setAppointments(appointmentsResult.value?.appointments || []);
      if (notificationsResult.status === 'fulfilled') {
        setNotifications(notificationsResult.value || []);
      } else {
        console.warn('Doctor notifications unavailable:', notificationsResult.reason);
        setNotifications([]);
      }
      if (paymentsResult.status === 'fulfilled') {
        setPaymentSummary(paymentsResult.value?.summary || {});
      }
    } catch (err) {
      console.error('Doctor dashboard load failed:', err);
      const message = err.message || 'Unable to load doctor dashboard.';
      setError(
        message.includes('Authentication required')
          ? 'Your session has expired. Please sign in again.'
          : message
      );
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    loadDashboard();
    const intervalId = window.setInterval(() => {
      if (mounted) loadDashboard({ silent: true });
    }, 30000);
    const onFocus = () => loadDashboard({ silent: true });
    window.addEventListener('focus', onFocus);
    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => {
    let filtered = appointments;

    if (activeTab !== 'All') {
      filtered = filtered.filter((apt) => String(apt.status || '').toLowerCase() === activeTab.toLowerCase());
    }

    if (searchTerm) {
      filtered = filtered.filter((apt) =>
        apt.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.patient_phone?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredAppointments(filtered);
  }, [appointments, activeTab, searchTerm]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayAppointments = appointments.filter((a) => a.appointment_date === today).length;
    const completed = appointments.filter((a) => a.status === 'Completed').length;
    const pending = appointments.filter((a) => ['pending', 'confirmed'].includes(String(a.status || '').toLowerCase())).length;
    const accepted = appointments.filter((a) => String(a.status || '').toLowerCase() === 'accepted').length;
    const totalPatients = new Set(appointments.map((a) => a.user_id || a.patient_phone || a.patient_name)).size;
    const upcomingAppointments = appointments
      .filter((a) => a.appointment_date >= today && ['pending', 'confirmed', 'accepted'].includes(String(a.status || '').toLowerCase()))
      .sort((a, b) => `${a.appointment_date || ''} ${a.appointment_time || ''}`.localeCompare(`${b.appointment_date || ''} ${b.appointment_time || ''}`));
    const upcoming = upcomingAppointments.length;

    const revenue = appointments
      .filter((a) => String(a.status || '').toLowerCase() === 'completed')
      .reduce((sum, a) => sum + (parseFloat(a.fee || a.consultation_fee || a.amount) || 0), 0);

    const todaySchedule = appointments
      .filter((a) => a.appointment_date === today)
      .sort((a, b) => String(a.appointment_time || '').localeCompare(String(b.appointment_time || '')));
    const currentClock = new Date().toTimeString().slice(0, 5);
    const currentConsultation = todaySchedule.find((a) => {
      const start = String(a.appointment_time || '').slice(0, 5);
      const end = String(a.appointment_end_time || a.endTime || a.appointment_time || '').slice(0, 5);
      return ['accepted', 'confirmed'].includes(String(a.status || '').toLowerCase()) && start <= currentClock && currentClock <= end;
    });
    const remainingMinutes = currentConsultation?.appointment_end_time
      ? Math.max(0, Math.ceil((new Date(`${today}T${String(currentConsultation.appointment_end_time).slice(0, 5)}:00`) - new Date()) / 60000))
      : 0;

    const patientList = Array.from(
      new Map(
        appointments
          .filter((a) => a.patient_name || a.patient_phone)
          .map((a) => [a.user_id || a.patient_phone || a.patient_name, a])
      ).values()
    ).slice(0, 5);

    return {
      newPatientAssessments: notifications.filter((n) => String(n.type || '').toUpperCase() === 'ASSESSMENT').length,
      todayAppointments,
      completed,
      pending,
      accepted,
      totalPatients,
      upcoming,
      todaySchedule,
      currentConsultation,
      remainingMinutes,
      patientList,
      revenue,
      upcomingAppointments: upcomingAppointments.slice(0, 5),
    };
  }, [appointments, notifications]);

  const handleStatusUpdate = async (appointmentId, status) => {
    if (!appointmentId) return;
    setActionLoadingId(`${appointmentId}-${status}`);
    setError(null);
    try {
      await api.updateDoctorAppointmentStatus(appointmentId, status);
      await loadDashboard();
    } catch (err) {
      setError(err.message || `Unable to update appointment to ${status}.`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const monthStart = `${today.slice(0, 7)}-01`;
  const earningsLabel = (value) => `${Number(value || 0).toFixed(2)} ${paymentSummary.currency || 'USD'}`;
  const paymentCards = [
    { title: 'Total Earnings', value: earningsLabel(paymentSummary.total_earnings), icon: FiDollarSign, color: 'text-emerald-400', path: '/doctor/payments' },
    { title: 'Net Earnings', value: earningsLabel(paymentSummary.net_earnings), icon: FiActivity, color: 'text-cyan-400', path: '/doctor/payments' },
    { title: 'Refunded Amount', value: earningsLabel(paymentSummary.refunded_amount), icon: FiRefreshCw, color: 'text-red-400', path: '/doctor/payments?status=Refunded' },
    { title: "Today's Earnings", value: earningsLabel(paymentSummary.today_earnings), icon: FiDollarSign, color: 'text-blue-400', path: `/doctor/payments?date_from=${today}&date_to=${today}` },
    { title: "This Week's Earnings", value: earningsLabel(paymentSummary.week_earnings), icon: FiCalendar, color: 'text-cyan-400', path: `/doctor/payments?date_from=${weekStart.toISOString().slice(0, 10)}&date_to=${today}` },
    { title: "This Month's Earnings", value: earningsLabel(paymentSummary.month_earnings), icon: FiCalendar, color: 'text-indigo-400', path: `/doctor/payments?date_from=${monthStart}&date_to=${today}` },
    { title: 'Pending Payments', value: paymentSummary.pending_payments || 0, icon: FiClock, color: 'text-amber-400', path: '/doctor/payments?status=Pending' },
    { title: 'Completed Payments', value: paymentSummary.completed_payments || 0, icon: FiCheck, color: 'text-emerald-400', path: '/doctor/payments?status=Completed' },
    { title: 'Refunded Payments', value: paymentSummary.refunded_payments || 0, icon: FiRefreshCw, color: 'text-slate-400', path: '/doctor/payments?status=Refunded' },
    { title: 'Paid Consultations', value: paymentSummary.total_paid_appointments || 0, icon: FiCreditCard, color: 'text-sky-400', path: '/doctor/payments?status=Completed' },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#06B6D4] mx-auto"></div>
          <p className="mt-4 text-slate-300">Loading doctor dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-3xl border border-red-800 bg-[#111827] p-4 shadow-sm">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      <div className="rounded-3xl border border-[#334155] bg-[#111827] p-6 text-slate-100 shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-[#94A3B8]">Doctor Workspace</p>
            <h1 className="mt-3 text-3xl font-bold text-slate-100">Dr. {user?.fullname || user?.name || user?.username || 'Doctor'}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              {user?.specialty ? user.specialty : 'Manage your appointments and patient workflow from one place.'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Calendar', icon: FiCalendar, action: () => navigate('/doctor/appointments') },
              { label: 'Patients', icon: FiUsers, action: () => navigate('/doctor/patients') },
              { label: 'Profile', icon: FiUser, action: () => navigate('/doctor/profile') },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="rounded-2xl bg-[#1E293B] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#06B6D4]"
                >
                  <Icon className="mx-auto mb-2 h-5 w-5 text-[#06B6D4]" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        {[
          { title: "Today's Appointments", value: stats.todayAppointments, icon: FiCalendar, iconColor: 'text-cyan-400' },
          { title: 'New Assessments From Patients', value: stats.newPatientAssessments, icon: FiActivity, iconColor: 'text-rose-400' },
          { title: 'Upcoming Appointments', value: stats.upcoming, icon: FiClock, iconColor: 'text-sky-400' },
          { title: 'Pending Bookings', value: stats.pending, icon: FiBell, iconColor: 'text-amber-400' },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="rounded-xl bg-[#1E293B] p-6 shadow-sm border border-[#334155] transition hover:border-[#06B6D4]">
              <div className="flex items-start justify-between">
                <div className="rounded-xl bg-[#0F172A] p-3">
                  <Icon className={`h-6 w-6 ${card.iconColor}`} />
                </div>
              </div>
              <p className="mt-4 text-3xl font-bold text-slate-100">{card.value}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">{card.title}</p>
              <button onClick={() => navigate('/doctor/appointments')} className="mt-3 inline-flex items-center text-xs font-medium text-[#06B6D4] hover:text-cyan-300">View appointments</button>
            </div>
          );
        })}
      </div>

      {stats.currentConsultation && (
        <section className="rounded-3xl border border-red-300 bg-red-50 p-5 shadow-sm dark:border-red-500/30 dark:bg-red-950/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-red-700 dark:text-red-200">
                <FiAlertTriangle /> {stats.currentConsultation.emergency_extension ? 'Emergency Extension Active' : 'Current Consultation'}
              </p>
              <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">{stats.currentConsultation.patient_name || 'Patient'}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {stats.currentConsultation.appointment_time || '--'} - {stats.currentConsultation.appointment_end_time || '--'}
              </p>
              {stats.currentConsultation.extension_reason && <p className="mt-2 text-sm font-semibold text-red-700 dark:text-red-100">Reason: {stats.currentConsultation.extension_reason}</p>}
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-white/80 p-3 dark:bg-slate-900/70">
                <p className="text-xs font-bold text-slate-500">Original End</p>
                <p className="mt-1 font-black text-slate-950 dark:text-white">{stats.currentConsultation.original_appointment_end_time || stats.currentConsultation.appointment_end_time || '--'}</p>
              </div>
              <div className="rounded-2xl bg-white/80 p-3 dark:bg-slate-900/70">
                <p className="text-xs font-bold text-slate-500">New End</p>
                <p className="mt-1 font-black text-slate-950 dark:text-white">{stats.currentConsultation.appointment_end_time || '--'}</p>
              </div>
              <div className="rounded-2xl bg-white/80 p-3 dark:bg-slate-900/70">
                <p className="text-xs font-bold text-slate-500">Extended Time</p>
                <p className="mt-1 font-black text-red-700 dark:text-red-200">+{stats.currentConsultation.extension_minutes || 0} min</p>
              </div>
              <div className="rounded-2xl bg-white/80 p-3 dark:bg-slate-900/70">
                <p className="text-xs font-bold text-slate-500">Remaining Time</p>
                <p className="mt-1 font-black text-slate-950 dark:text-white">{stats.remainingMinutes} min</p>
              </div>
            </div>
          </div>
          <button type="button" onClick={() => navigate('/doctor/appointments')} className="mt-4 rounded-2xl bg-red-500 px-4 py-2 text-sm font-black text-white hover:bg-red-600">Extend Consultation</button>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between"><div><h2 className="text-lg font-bold text-slate-950 dark:text-white">Payment Overview</h2><p className="text-xs text-slate-500">Real earnings from your appointment payments</p></div><button onClick={() => navigate('/doctor/payments')} className="text-sm font-bold text-blue-600 hover:text-blue-700">View all payments</button></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {paymentCards.map((card) => { const Icon = card.icon; return <button key={card.title} onClick={() => navigate(card.path)} className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-white/10 dark:bg-slate-900"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{card.title}</span><Icon className={`h-4 w-4 ${card.color}`} /></div><p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{card.value}</p></button>; })}
        </div>
      </section>

      {/* Secondary Stats */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <div className="rounded-xl bg-[#1E293B] p-6 shadow-sm border border-[#334155]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-300">Pending Requests</p>
              <p className="mt-2 text-3xl font-bold text-slate-100">{stats.pending}</p>
            </div>
            <div className="rounded-xl bg-[#0F172A] p-3">
              <FiClock className="h-6 w-6 text-amber-400" />
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-[#1E293B] p-6 shadow-sm border border-[#334155]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-300">Completed Appointments</p>
              <p className="mt-2 text-3xl font-bold text-slate-100">{stats.completed}</p>
            </div>
            <div className="rounded-xl bg-[#0F172A] p-3">
              <FiCheck className="h-6 w-6 text-cyan-400" />
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-[#1E293B] p-6 shadow-sm border border-[#334155]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-300">Availability Management</p>
              <p className="mt-2 text-3xl font-bold text-slate-100">Manage</p>
            </div>
            <div className="rounded-xl bg-[#0F172A] p-3"><FiActivity className="h-6 w-6 text-sky-400" /></div>
          </div>
        </div>
      </div>

      {/* Main Content Row */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Appointment Requests */}
        <div className="xl:col-span-2 rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-xl shadow-cyan-900/5 backdrop-blur dark:border-white/10 dark:bg-slate-800/85 dark:shadow-black/20">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-950 dark:text-slate-100">Appointment Requests</h2>
          </div>

          {/* Tabs and Search */}
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-2 overflow-x-auto border-b border-slate-200 dark:border-white/10">
              {['All', 'Confirmed', 'Accepted', 'Completed', 'Cancelled', 'Rejected'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                    activeTab === tab
                      ? 'border-[#06B6D4] text-[#06B6D4]'
                      : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1 md:flex-none">
                <FiSearch className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search patient..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-[#06B6D4] dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                <FiFilter className="h-4 w-4" />
                Filter
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-900">
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-300">Patient</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-300">Phone Number</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-300">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-300">Time</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-300">Prediction</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-300">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                {filteredAppointments.length > 0 ? (
                  filteredAppointments.map((apt, idx) => (
                    <tr key={apt.id || idx} className="transition hover:bg-cyan-50/70 dark:hover:bg-white/5">
                      <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{apt.patient_name || 'Unknown'}</td>
                      <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{apt.patient_phone || apt.phone || '—'}</td>
                      <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{apt.appointment_date || '—'}</td>
                      <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{apt.appointment_time || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-[#0F8EA8] dark:bg-slate-900 dark:text-[#06B6D4]">
                          {apt.prediction_result || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                          ['pending', 'pending payment', 'confirmed'].includes(String(apt.status || '').toLowerCase()) ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200' :
                          String(apt.status || '').toLowerCase() === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200' :
                          String(apt.status || '').toLowerCase() === 'accepted' ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200' :
                          String(apt.status || '').toLowerCase() === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200' :
                          'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-200'
                        }`}>
                          {apt.status || 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            disabled={!['confirmed', 'pending'].includes(String(apt.status || '').toLowerCase()) || actionLoadingId === `${apt.id}-Accepted`}
                            onClick={() => handleStatusUpdate(apt.id, 'Accepted')}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                            title="Accept appointment"
                          >
                            <FiCheck className="h-4 w-4" />
                          </button>
                          <button
                            disabled={!['confirmed', 'accepted', 'pending'].includes(String(apt.status || '').toLowerCase()) || actionLoadingId === `${apt.id}-Cancelled`}
                            onClick={() => handleStatusUpdate(apt.id, 'Cancelled')}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-500 text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                            title="Cancel appointment"
                          >
                            <FiX className="h-4 w-4" />
                          </button>
                          <button
                            disabled={String(apt.status || '').toLowerCase() !== 'accepted' || actionLoadingId === `${apt.id}-Completed`}
                            onClick={() => handleStatusUpdate(apt.id, 'Completed')}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500 text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-40"
                            title="Complete appointment"
                          >
                            <FiActivity className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                      No appointments found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
            <span>Showing 1 to {Math.min(filteredAppointments.length, 10)} of {filteredAppointments.length} entries</span>
            <div className="flex gap-1">
              <button className="rounded-3xl border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">←</button>
              <button className="px-3 py-1 rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 text-white text-sm font-semibold shadow-sm">1</button>
              <button className="rounded-3xl border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">→</button>
            </div>
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-xl shadow-cyan-900/5 backdrop-blur dark:border-white/10 dark:bg-slate-800/85 dark:shadow-black/20">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-950 dark:text-slate-100">Today's Schedule</h2>
            <button onClick={() => navigate('/doctor/appointments')} className="text-xs font-medium text-[#06B6D4] hover:text-cyan-300">View Calendar</button>
          </div>

          <div className="space-y-4">
            {stats.todaySchedule.length > 0 ? (
              stats.todaySchedule.map((slot, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-[#06B6D4] dark:border-white/10 dark:bg-slate-900">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{slot.appointment_time || '—'}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{slot.patient_name || 'Unknown'}</p>
                    </div>
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                      slot.status === 'Pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
                    }`}>
                      {slot.status || 'Pending'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">No appointments today</p>
            )}
          </div>

          <button onClick={() => navigate('/doctor/schedule')} className="mt-6 w-full inline-flex items-center justify-center gap-2 border-t border-[#334155] pt-6 text-sm font-medium text-[#06B6D4] hover:text-cyan-300">Manage availability</button>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Notifications */}
        <div className="rounded-xl bg-[#1E293B] p-6 shadow-sm border border-[#334155]">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-100">Notifications</h2>
          </div>
          <div className="space-y-4">
            {notifications.slice(0, 5).length > 0 ? (
              notifications.slice(0, 5).map((notification) => (
                <div key={notification.id} className="rounded-xl border border-[#334155] bg-[#0F172A] p-4">
                  <p className="text-sm font-semibold text-slate-100">{notification.title || notification.type || 'Notification'}</p>
                  <p className="mt-1 text-xs text-slate-400">{notification.message || 'No message provided.'}</p>
                  <p className="mt-2 text-xs text-slate-500">{notification.created_at || notification.createdAt || ''}</p>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">No notifications yet</p>
            )}
          </div>
        </div>

        {/* Patient List */}
        <div className="rounded-xl bg-[#1E293B] p-6 shadow-sm border border-[#334155]">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-100">Recent Patients</h2>
            <button onClick={() => navigate('/doctor/patients')} className="text-xs font-medium text-[#06B6D4] hover:text-cyan-300">View patients</button>
          </div>

          <div className="space-y-4">
            {stats.patientList.length > 0 ? (
              stats.patientList.map((patient, idx) => (
                <div key={patient.user_id || patient.patient_phone || patient.patient_name || idx} className="pb-4 border-b border-[#334155] last:border-b-0 last:pb-0">
                  <p className="text-sm font-semibold text-slate-100">{patient.patient_name || 'Unknown patient'}</p>
                  <p className="mt-1 text-xs text-slate-400">{patient.patient_phone || patient.phone || 'No phone number listed'}</p>
                  <p className="mt-1 text-xs text-slate-400">Last appointment: {patient.appointment_date || 'Not scheduled'}</p>
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-slate-400">No patient records yet</p>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="rounded-xl bg-[#1E293B] p-6 shadow-sm border border-[#334155]">
          <h2 className="mb-6 text-xl font-bold text-slate-100">Quick Stats</h2>

          <div className="space-y-4">
            <div className="rounded-xl bg-[#0F172A] p-4">
              <p className="text-xs text-slate-400 font-medium">Patients This Month</p>
              <p className="mt-2 text-2xl font-bold text-[#06B6D4]">{stats.totalPatients}</p>
            </div>
            <div className="rounded-xl bg-[#0F172A] p-4">
              <p className="text-xs text-slate-400 font-medium">Upcoming Appointments</p>
              <p className="mt-2 text-2xl font-bold text-[#06B6D4]">{stats.upcoming}</p>
            </div>
            <div className="rounded-xl bg-[#0F172A] p-4">
              <p className="text-xs text-slate-400 font-medium">Completed Sessions</p>
              <p className="mt-2 text-2xl font-bold text-[#06B6D4]">{stats.completed}</p>
            </div>
            <div className="rounded-xl bg-[#0F172A] p-4">
              <p className="text-xs text-slate-400 font-medium">Total Earnings</p>
              <p className="mt-2 text-lg font-bold text-amber-400">${stats.revenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DoctorDashboard;

