import { useEffect, useMemo, useState } from 'react';
import { FiCalendar, FiCheck, FiX, FiEdit3, FiDownload } from 'react-icons/fi';
import SectionHeader from '../../components/SectionHeader.jsx';
import { api } from '../../services/api.js';

function AdminAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    page: 1,
    limit: 10
  });
  const [updatingStatus, setUpdatingStatus] = useState(null);

  useEffect(() => {
    loadAppointments();
  }, [filters]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminAppointments(filters);
      setAppointments(data.appointments || []);
    } catch (error) {
      console.error('Failed to load appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (appointmentId, newStatus) => {
    try {
      setUpdatingStatus(appointmentId);
      await api.updateAppointmentStatus(appointmentId, newStatus);
      // Update local state
      setAppointments(prev => prev.map(apt =>
        apt.id === appointmentId ? { ...apt, status: newStatus } : apt
      ));
    } catch (error) {
      console.error('Failed to update appointment status:', error);
      alert('Failed to update appointment status. Please try again.');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const filteredAppointments = useMemo(() => {
    return appointments.filter(appointment => {
      if (filters.status !== 'all' && appointment.status !== filters.status) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          (appointment.user_name && appointment.user_name.toLowerCase().includes(query)) ||
          (appointment.user_email && appointment.user_email.toLowerCase().includes(query)) ||
          (appointment.doctor_name && appointment.doctor_name.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [appointments, filters.status, searchQuery]);

  const exportData = () => {
    const csvContent = [
      ['ID', 'User Name', 'User Email', 'Doctor', 'Date', 'Time', 'Status'],
      ...appointments.map(a => [
        a.id,
        a.user_name || '',
        a.user_email || '',
        a.doctor_name,
        a.appointment_date,
        a.appointment_time,
        a.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'appointments.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Confirmed': return 'bg-blue-100 text-blue-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      case 'Rejected': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusActions = (appointment) => {
    switch (appointment.status) {
      case 'Pending':
        return (
          <>
            <button
              onClick={() => handleStatusUpdate(appointment.id, 'Confirmed')}
              disabled={updatingStatus === appointment.id}
              className="inline-flex items-center gap-2 rounded-3xl border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700 transition hover:bg-green-100 disabled:opacity-60"
            >
              <FiCheck /> Confirm
            </button>
            <button
              onClick={() => handleStatusUpdate(appointment.id, 'Rejected')}
              disabled={updatingStatus === appointment.id}
              className="inline-flex items-center gap-2 rounded-3xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 transition hover:bg-gray-100 disabled:opacity-60"
            >
              <FiX /> Reject
            </button>
            <button
              onClick={() => handleStatusUpdate(appointment.id, 'Cancelled')}
              disabled={updatingStatus === appointment.id}
              className="inline-flex items-center gap-2 rounded-3xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 transition hover:bg-red-100 disabled:opacity-60"
            >
              <FiX /> Cancel
            </button>
          </>
        );
      case 'Confirmed':
        return (
          <>
            <button
              onClick={() => handleStatusUpdate(appointment.id, 'Completed')}
              disabled={updatingStatus === appointment.id}
              className="inline-flex items-center gap-2 rounded-3xl border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700 transition hover:bg-green-100 disabled:opacity-60"
            >
              <FiCheck /> Complete
            </button>
            <button
              onClick={() => handleStatusUpdate(appointment.id, 'Cancelled')}
              disabled={updatingStatus === appointment.id}
              className="inline-flex items-center gap-2 rounded-3xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 transition hover:bg-red-100 disabled:opacity-60"
            >
              <FiX /> Cancel
            </button>
          </>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-slate-400">Loading appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <SectionHeader subtitle="Appointment management" title="View, approve, and manage all appointments." />

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[2rem] border border-gray-200 bg-white/40 p-6 shadow-xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/40">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-950">
              <FiCalendar className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">Pending</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
                {appointments.filter(a => a.status === 'Pending').length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-gray-200 bg-white/40 p-6 shadow-xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/40">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-950">
              <FiCalendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">Confirmed</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
                {appointments.filter(a => a.status === 'Confirmed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-gray-200 bg-white/40 p-6 shadow-xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/40">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-950">
              <FiCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">Completed</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
                {appointments.filter(a => a.status === 'Completed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-gray-200 bg-white/40 p-6 shadow-xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/40">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-red-100 dark:bg-red-950">
              <FiX className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">Cancelled</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
                {appointments.filter(a => a.status === 'Cancelled').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="rounded-[2rem] border border-gray-200 bg-white/40 p-6 shadow-xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/40">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-sky-600 dark:text-sky-400">All appointments</p>
            <h2 className="mt-3 text-2xl font-semibold text-gray-900 dark:text-slate-100">Manage appointment requests</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="rounded-3xl border border-gray-200 bg-white/80 px-4 py-3 text-gray-900 outline-none backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100"
            >
              <option value="all" className="dark:bg-slate-900">All Statuses</option>
              <option value="Pending" className="dark:bg-slate-900">Pending</option>
              <option value="Confirmed" className="dark:bg-slate-900">Confirmed</option>
              <option value="Completed" className="dark:bg-slate-900">Completed</option>
              <option value="Cancelled" className="dark:bg-slate-900">Cancelled</option>
              <option value="Rejected" className="dark:bg-slate-900">Rejected</option>
            </select>
            <input
              type="search"
              placeholder="Search appointments"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-3xl border border-gray-200 bg-white/80 px-4 py-3 text-gray-900 outline-none backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100"
            />
            <button
              onClick={exportData}
              className="inline-flex items-center gap-2 rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-sky-600 shadow-lg"
            >
              <FiDownload /> Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-gray-600 dark:text-slate-400">
            <thead className="border-b border-gray-200 text-gray-500 dark:border-slate-700 dark:text-slate-400">
              <tr>
                <th className="px-4 py-4">Patient</th>
                <th className="px-4 py-4">Doctor</th>
                <th className="px-4 py-4">Date & Time</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.map((appointment) => (
                <tr key={appointment.id} className="border-b border-gray-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-slate-100">{appointment.user_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-500">{appointment.user_email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-gray-900 dark:text-slate-100">{appointment.doctor_name}</p>
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-slate-100">
                        {appointment.appointment_date ? new Date(appointment.appointment_date).toLocaleDateString() : 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-500">{appointment.appointment_time}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs uppercase ${getStatusColor(appointment.status)}`}>
                      {appointment.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      {getStatusActions(appointment)}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredAppointments.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-gray-500 dark:text-slate-400">
                    No appointments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminAppointments;