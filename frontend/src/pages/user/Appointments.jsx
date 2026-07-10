import { useEffect, useState } from 'react';
import SectionHeader from '../../components/SectionHeader.jsx';
import { api } from '../../services/api.js';
import { FiCalendar, FiClock, FiCreditCard, FiRefreshCcw, FiUser, FiX } from 'react-icons/fi';

function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(null);
  const [refundDialog, setRefundDialog] = useState(null);
  const [refundForm, setRefundForm] = useState({ reason: 'Doctor did not join', notes: '' });
  const [submittingRefund, setSubmittingRefund] = useState(false);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getAppointments();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load appointments:', err);
      setError('Unable to load your appointments.');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    setCancelling(appointmentId);
    try {
      await api.cancelAppointment(appointmentId);
      // Refresh appointments after cancellation
      await loadAppointments();
    } catch (err) {
      setError(err.message || 'Failed to cancel appointment');
    } finally {
      setCancelling(null);
    }
  };

  const submitRefundRequest = async () => {
    if (!refundDialog) return;
    setSubmittingRefund(true);
    setError('');
    try {
      await api.requestRefund({
        appointment_id: refundDialog.id,
        reason: refundForm.reason,
        notes: refundForm.notes,
      });
      setRefundDialog(null);
      setRefundForm({ reason: 'Doctor did not join', notes: '' });
      await loadAppointments();
    } catch (err) {
      setError(err.message || 'Failed to submit refund request');
    } finally {
      setSubmittingRefund(false);
    }
  };

  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRefundStatusColor = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('approved') || s.includes('completed')) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200';
    if (s.includes('rejected')) return 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200';
    if (s.includes('processing')) return 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200';
    return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200';
  };

  const canCancel = (status) => {
    const s = (status || '').toLowerCase();
    return s === 'pending' || s === 'confirmed';
  };

  const doctorName = (appointment) => appointment.doctor_name || appointment.doctorName || 'Doctor';
  const appointmentDate = (appointment) => appointment.appointment_date || appointment.date;
  const appointmentTime = (appointment) => appointment.appointment_time || appointment.time;

  return (
    <div className="space-y-10">
      <SectionHeader subtitle="Appointments" title="Manage your scheduled sessions." />
      
      {error && (
        <div className="rounded-[2rem] border border-red-200 bg-red-50 p-4 shadow-md">
          <p className="text-sm text-red-800">
            <span className="font-semibold">⚠ Error:</span> {error}
          </p>
        </div>
      )}

      {refundDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[1.5rem] border border-white/20 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">Refund Request</p>
                <h3 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">Request appointment refund</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {doctorName(refundDialog)} · {appointmentDate(refundDialog)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRefundDialog(null)}
                className="rounded-2xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <FiX />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Reason for refund</span>
                <select
                  value={refundForm.reason}
                  onChange={(event) => setRefundForm((current) => ({ ...current, reason: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-cyan-950"
                >
                  <option>Doctor did not join</option>
                  <option>Appointment never started</option>
                  <option>Doctor cancelled</option>
                  <option>Wrong payment</option>
                  <option>Other</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Additional notes</span>
                <textarea
                  value={refundForm.notes}
                  onChange={(event) => setRefundForm((current) => ({ ...current, notes: event.target.value }))}
                  rows={4}
                  placeholder="Add details that help the admin review this request."
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-cyan-950"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setRefundDialog(null)}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitRefundRequest}
                disabled={submittingRefund}
                className="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition hover:shadow-xl disabled:opacity-60"
              >
                {submittingRefund ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="rounded-[2rem] border border-white/20 bg-white/10 p-8 text-gray-600 shadow-xl backdrop-blur-xl">
          Loading appointments…
        </div>
      ) : appointments.length === 0 ? (
        <div className="rounded-[2rem] border border-white/20 bg-white/10 p-8 text-gray-600 shadow-xl backdrop-blur-xl">
          <p className="text-lg font-semibold text-gray-900">No appointments found</p>
          <p className="mt-2">You haven't booked any appointments yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {appointments.map((appointment) => (
            <div
              key={appointment.id}
              className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-6 shadow-xl backdrop-blur-xl transition hover:shadow-2xl dark:border-slate-700 dark:bg-slate-900/80"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-sky-500 text-white">
                      <FiUser className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                        {doctorName(appointment)}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {appointment.specialization || 'Specialist'}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center gap-3 rounded-3xl bg-slate-50 p-4 dark:bg-slate-800">
                      <FiCalendar className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Date</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {appointmentDate(appointment) ? new Date(`${appointmentDate(appointment)}T00:00:00`).toLocaleDateString() : 'Date not assigned'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-3xl bg-slate-50 p-4 dark:bg-slate-800">
                      <FiClock className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Time</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {appointmentTime(appointment) || 'Time not assigned'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {appointment.notes && (
                    <div className="rounded-3xl bg-slate-50 p-4 dark:bg-slate-800">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Notes</p>
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{appointment.notes}</p>
                    </div>
                  )}

                  {(appointment.refundStatus || appointment.refund_status) && (
                    <div className="flex items-center gap-3 rounded-3xl border border-cyan-100 bg-cyan-50 p-4 dark:border-cyan-900/70 dark:bg-cyan-950/20">
                      <FiRefreshCcw className="h-5 w-5 text-cyan-600 dark:text-cyan-300" />
                      <div>
                        <p className="text-xs text-cyan-700 dark:text-cyan-300">Refund status</p>
                        <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-bold ${getRefundStatusColor(appointment.refundStatus || appointment.refund_status)}`}>
                          {appointment.refundStatus || appointment.refund_status}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-3">
                  <span className={`inline-flex rounded-full px-4 py-2 text-xs font-semibold ${getStatusColor(appointment.status)}`}>
                    {appointment.status || 'Pending'}
                  </span>
                  
                  {canCancel(appointment.status) && (
                    <button
                      onClick={() => handleCancelAppointment(appointment.id)}
                      disabled={cancelling === appointment.id}
                      className="inline-flex items-center gap-2 rounded-3xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
                    >
                      {cancelling === appointment.id ? 'Cancelling...' : (
                        <>
                          <FiX className="h-4 w-4" /> Cancel
                        </>
                      )}
                    </button>
                  )}

                  {(appointment.canRequestRefund || appointment.can_request_refund) && (
                    <button
                      onClick={() => setRefundDialog(appointment)}
                      className="inline-flex items-center gap-2 rounded-3xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-100 dark:border-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-300 dark:hover:bg-cyan-950/50"
                    >
                      <FiCreditCard className="h-4 w-4" /> Request Refund
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Appointments;
