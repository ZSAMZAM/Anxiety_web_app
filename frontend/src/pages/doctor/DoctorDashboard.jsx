import { FiBell, FiCalendar, FiCheck, FiClock, FiDollarSign, FiFilter, FiSearch, FiSettings, FiUser, FiUsers, FiX, FiActivity } from 'react-icons/fi';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';

function DoctorDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const navigate = useNavigate();

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const [result, notificationResult] = await Promise.all([
        api.getDoctorAppointments(),
        api.getUserNotifications(),
      ]);
      setAppointments(result.appointments || []);
      setNotifications(notificationResult || []);
    } catch (err) {
      console.error('Doctor dashboard load failed:', err);
      setError(err.message || 'Unable to load doctor dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    let filtered = appointments;

    if (activeTab !== 'All') {
      filtered = filtered.filter((apt) => String(apt.status || '').toLowerCase() === activeTab.toLowerCase());
    }

    if (searchTerm) {
      filtered = filtered.filter((apt) =>
        apt.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.patient_email?.toLowerCase().includes(searchTerm.toLowerCase())
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
    const totalPatients = new Set(appointments.map((a) => a.patient_email || a.patient_name)).size;
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

    const patientList = Array.from(
      new Map(
        appointments
          .filter((a) => a.patient_name || a.patient_email)
          .map((a) => [a.patient_email || a.patient_name, a])
      ).values()
    ).slice(0, 5);

    return {
      todayAppointments,
      completed,
      pending,
      accepted,
      totalPatients,
      upcoming,
      todaySchedule,
      patientList,
      revenue,
      upcomingAppointments: upcomingAppointments.slice(0, 5),
    };
  }, [appointments]);

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading doctor dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-600 via-cyan-600 to-slate-900 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-100">Therapist Workspace</p>
            <h1 className="mt-3 text-3xl font-bold">Today's clinical schedule</h1>
            <p className="mt-2 max-w-2xl text-sm text-cyan-50">
              Review patient sessions, respond to pending requests, and keep your availability current.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Calendar', icon: FiCalendar, action: () => navigate('/doctor/appointments') },
              { label: 'Patients', icon: FiUsers, action: () => navigate('/doctor/patients') },
              { label: 'Settings', icon: FiBell, action: () => navigate('/doctor/settings') },
              { label: 'Profile', icon: FiUser, action: () => navigate('/doctor/profile') },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="rounded-2xl bg-white/15 px-4 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/70"
                >
                  <Icon className="mx-auto mb-2 h-5 w-5" />
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
          { title: "Today's Appointments", value: stats.todayAppointments, icon: FiCalendar, color: 'bg-blue-50', iconColor: 'text-blue-600' },
          { title: 'Upcoming Appointments', value: stats.upcoming, icon: FiClock, color: 'bg-sky-50', iconColor: 'text-sky-600' },
          { title: 'Total Patients', value: stats.totalPatients, icon: FiUsers, color: 'bg-amber-50', iconColor: 'text-amber-600' },
          { title: 'Revenue', value: `$${stats.revenue.toFixed(2)}`, icon: FiDollarSign, color: 'bg-emerald-50', iconColor: 'text-emerald-600' },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="rounded-xl bg-white p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all duration-200">
              <div className="flex items-start justify-between">
                <div className={`rounded-xl p-3 ${card.color}`}>
                  <Icon className={`h-6 w-6 ${card.iconColor}`} />
                </div>
              </div>
              <p className="mt-4 text-3xl font-bold text-slate-900">{card.value}</p>
              <p className="mt-1 text-sm font-medium text-slate-600">{card.title}</p>
              <button onClick={() => navigate('/doctor/appointments')} className="mt-3 inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-700">View appointments</button>
            </div>
          );
        })}
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Pending Requests</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{stats.pending}</p>
            </div>
            <div className="rounded-xl p-3 bg-amber-50">
              <FiClock className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Completed Appointments</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{stats.completed}</p>
            </div>
            <div className="rounded-xl p-3 bg-cyan-50">
              <FiCheck className="h-6 w-6 text-cyan-600" />
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Availability Management</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">Manage</p>
            </div>
            <div className="rounded-xl p-3 bg-teal-50"><FiSettings className="h-6 w-6 text-teal-600" /></div>
          </div>
        </div>
      </div>

      {/* Main Content Row */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Appointment Requests */}
        <div className="xl:col-span-2 rounded-xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">Appointment Requests</h2>
          </div>

          {/* Tabs and Search */}
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
              {['All', 'Confirmed', 'Accepted', 'Completed', 'Cancelled', 'Rejected'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                    activeTab === tab
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1 md:flex-none">
                <FiSearch className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search patient..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
                <FiFilter className="h-4 w-4" />
                Filter
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Patient</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Time</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Prediction</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.length > 0 ? (
                  filteredAppointments.map((apt, idx) => (
                    <tr key={apt.id || idx} className="border-b border-slate-100 hover:bg-slate-50 transition">
                      <td className="px-4 py-3 text-slate-600">{apt.patient_name || 'Unknown'}</td>
                      <td className="px-4 py-3 text-slate-600">{apt.patient_email || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{apt.appointment_date || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{apt.appointment_time || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded-full px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700">
                          {apt.prediction_result || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                          ['pending', 'pending payment', 'confirmed'].includes(String(apt.status || '').toLowerCase()) ? 'bg-amber-100 text-amber-700' :
                          String(apt.status || '').toLowerCase() === 'completed' ? 'bg-green-100 text-green-700' :
                          String(apt.status || '').toLowerCase() === 'accepted' ? 'bg-blue-100 text-blue-700' :
                          String(apt.status || '').toLowerCase() === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {apt.status || 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            disabled={!['confirmed', 'pending'].includes(String(apt.status || '').toLowerCase()) || actionLoadingId === `${apt.id}-Accepted`}
                            onClick={() => handleStatusUpdate(apt.id, 'Accepted')}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-600 transition hover:bg-green-200 disabled:cursor-not-allowed disabled:opacity-40"
                            title="Accept appointment"
                          >
                            <FiCheck className="h-4 w-4" />
                          </button>
                          <button
                            disabled={!['confirmed', 'accepted', 'pending'].includes(String(apt.status || '').toLowerCase()) || actionLoadingId === `${apt.id}-Cancelled`}
                            onClick={() => handleStatusUpdate(apt.id, 'Cancelled')}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600 transition hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                            title="Cancel appointment"
                          >
                            <FiX className="h-4 w-4" />
                          </button>
                          <button
                            disabled={String(apt.status || '').toLowerCase() !== 'accepted' || actionLoadingId === `${apt.id}-Completed`}
                            onClick={() => handleStatusUpdate(apt.id, 'Completed')}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 transition hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-40"
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
                    <td colSpan="7" className="px-4 py-8 text-center text-slate-600">
                      No appointments found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-between text-sm text-slate-600">
            <span>Showing 1 to {Math.min(filteredAppointments.length, 10)} of {filteredAppointments.length} entries</span>
            <div className="flex gap-1">
              <button className="px-3 py-1 rounded-3xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold transition hover:bg-slate-50 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">←</button>
              <button className="px-3 py-1 rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 text-white text-sm font-semibold shadow-sm">1</button>
              <button className="px-3 py-1 rounded-3xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold transition hover:bg-slate-50 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">→</button>
            </div>
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Today's Schedule</h2>
            <button onClick={() => navigate('/doctor/appointments')} className="text-xs font-medium text-blue-600 hover:text-blue-700">View Calendar</button>
          </div>

          <div className="space-y-4">
            {stats.todaySchedule.length > 0 ? (
              stats.todaySchedule.map((slot, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 p-4 hover:border-blue-300 transition">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{slot.appointment_time || '—'}</p>
                      <p className="mt-1 text-sm text-slate-600">{slot.patient_name || 'Unknown'}</p>
                    </div>
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                      slot.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {slot.status || 'Pending'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-slate-600">No appointments today</p>
            )}
          </div>

          <button onClick={() => navigate('/doctor/schedule')} className="mt-6 w-full inline-flex items-center justify-center gap-2 border-t border-slate-200 pt-6 text-sm font-medium text-blue-600 hover:text-blue-700"><FiSettings className="h-4 w-4" />Manage availability</button>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Notifications */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Notifications</h2>
            <button onClick={() => navigate('/doctor/settings')} className="text-xs font-medium text-blue-600 hover:text-blue-700">Settings</button>
          </div>
          <div className="space-y-4">
            {notifications.slice(0, 5).length > 0 ? (
              notifications.slice(0, 5).map((notification) => (
                <div key={notification.id} className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">{notification.title || notification.type || 'Notification'}</p>
                  <p className="mt-1 text-xs text-slate-600">{notification.message || 'No message provided.'}</p>
                  <p className="mt-2 text-xs text-slate-400">{notification.created_at || notification.createdAt || ''}</p>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-slate-600">No notifications yet</p>
            )}
          </div>
        </div>

                {/* Patient List */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Recent Patients</h2>
            <button onClick={() => navigate('/doctor/patients')} className="text-xs font-medium text-blue-600 hover:text-blue-700">View patients</button>
          </div>

          <div className="space-y-4">
            {stats.patientList.length > 0 ? (
              stats.patientList.map((patient, idx) => (
                <div key={patient.patient_email || patient.patient_name || idx} className="pb-4 border-b border-slate-100 last:border-b-0 last:pb-0">
                  <p className="text-sm font-semibold text-slate-800">{patient.patient_name || 'Unknown patient'}</p>
                  <p className="mt-1 text-xs text-slate-500">{patient.patient_email || 'No email listed'}</p>
                  <p className="mt-1 text-xs text-slate-500">Last appointment: {patient.appointment_date || 'Not scheduled'}</p>
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-slate-600">No patient records yet</p>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
          <h2 className="mb-6 text-xl font-bold text-slate-900">Quick Stats</h2>

          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-600 font-medium">Patients This Month</p>
              <p className="mt-2 text-2xl font-bold text-blue-600">{stats.totalPatients}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-600 font-medium">Upcoming Appointments</p>
              <p className="mt-2 text-2xl font-bold text-blue-600">{stats.upcoming}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-600 font-medium">Completed Sessions</p>
              <p className="mt-2 text-2xl font-bold text-blue-600">{stats.completed}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-600 font-medium">Total Earnings</p>
              <p className="mt-2 text-lg font-bold text-orange-600">${stats.revenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DoctorDashboard;

