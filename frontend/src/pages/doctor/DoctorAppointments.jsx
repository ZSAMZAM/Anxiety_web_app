import { useEffect, useState } from 'react';
import { FiCheckCircle, FiXCircle } from 'react-icons/fi';
import SectionHeader from '../../components/SectionHeader.jsx';
import { api } from '../../services/api.js';

function DoctorAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const loadAppointments = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getDoctorAppointments();
      setAppointments(result.appointments || []);
    } catch (err) {
      console.error('Failed to load doctor appointments:', err);
      setError(err.message || 'Unable to load appointments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const handleStatusUpdate = async (appointmentId, status) => {
    if (!confirm(`Are you sure you want to change the appointment status to ${status}?`)) {
      return;
    }
    setUpdatingId(appointmentId);
    try {
      await api.updateDoctorAppointmentStatus(appointmentId, status);
      setAppointments((prev) =>
        prev.map((item) =>
          item.id === appointmentId ? { ...item, status } : item
        )
      );
    } catch (err) {
      console.error('Unable to update appointment status:', err);
      setError(err.message || 'Status update failed.');
    } finally {
      setUpdatingId(null);
    }
  };

  const canConfirm = (status) => status === 'Pending';
  const canComplete = (status) => status === 'Confirmed';
  const canCancel = (status) => status === 'Pending' || status === 'Confirmed';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading appointments…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <SectionHeader subtitle="Doctor appointments" title="Manage patient bookings and approve requests." />

      {error && (
        <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 shadow-sm">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-8 shadow-xl backdrop-blur-xl transition-colors duration-300 dark:border-slate-700 dark:bg-slate-950/80">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Patient</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Email</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Date</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Time</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Prediction</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Status</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {appointments.map((appointment) => (
                <tr key={appointment.id}>
                  <td className="px-4 py-4 text-sm text-slate-900 dark:text-slate-100">{appointment.patient_name || 'N/A'}</td>
                  <td className="px-4 py-4 text-sm text-slate-900 dark:text-slate-100">{appointment.patient_email || 'N/A'}</td>
                  <td className="px-4 py-4 text-sm text-slate-900 dark:text-slate-100">{appointment.appointment_date || 'N/A'}</td>
                  <td className="px-4 py-4 text-sm text-slate-900 dark:text-slate-100">{appointment.appointment_time || 'N/A'}</td>
                  <td className="px-4 py-4 text-sm text-slate-900 dark:text-slate-100">{appointment.prediction_result || 'None'}</td>
                  <td className="px-4 py-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    <span className={`rounded-full px-3 py-1 text-xs ${
                      appointment.status === 'Confirmed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                      appointment.status === 'Cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                      appointment.status === 'Completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                      appointment.status === 'Rejected' ? 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300' :
                      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                    }`}>
                      {appointment.status || 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-900 dark:text-slate-100">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      {canConfirm(appointment.status) && (
                        <>
                          <button
                            disabled={updatingId === appointment.id}
                            onClick={() => handleStatusUpdate(appointment.id, 'Confirmed')}
                            className="inline-flex items-center justify-center rounded-3xl bg-green-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-green-600 disabled:opacity-60"
                          >
                            <FiCheckCircle className="mr-2 h-4 w-4" /> Confirm
                          </button>
                          <button
                            disabled={updatingId === appointment.id}
                            onClick={() => handleStatusUpdate(appointment.id, 'Rejected')}
                            className="inline-flex items-center justify-center rounded-3xl bg-gray-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-gray-600 disabled:opacity-60"
                          >
                            <FiXCircle className="mr-2 h-4 w-4" /> Reject
                          </button>
                        </>
                      )}
                      {canComplete(appointment.status) && (
                        <button
                          disabled={updatingId === appointment.id}
                          onClick={() => handleStatusUpdate(appointment.id, 'Completed')}
                          className="inline-flex items-center justify-center rounded-3xl bg-blue-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-600 disabled:opacity-60"
                        >
                          <FiCheckCircle className="mr-2 h-4 w-4" /> Complete
                        </button>
                      )}
                      {canCancel(appointment.status) && (
                        <button
                          disabled={updatingId === appointment.id}
                          onClick={() => handleStatusUpdate(appointment.id, 'Cancelled')}
                          className="inline-flex items-center justify-center rounded-3xl bg-red-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
                        >
                          <FiXCircle className="mr-2 h-4 w-4" /> Cancel
                        </button>
                      )}
                      {!canConfirm(appointment.status) && !canComplete(appointment.status) && !canCancel(appointment.status) && (
                        <span className="text-sm text-slate-500 dark:text-slate-400">No action needed</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!appointments.length && (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400" colSpan="7">
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

export default DoctorAppointments;
