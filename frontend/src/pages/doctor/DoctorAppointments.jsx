import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiAlertTriangle, FiCheckCircle, FiClock, FiFileText, FiX, FiXCircle } from 'react-icons/fi';
import SectionHeader from '../../components/SectionHeader.jsx';
import { api } from '../../services/api.js';

const emptyConsultation = {
  symptoms: '',
  diagnosis: '',
  treatment_plan: '',
  prescription: '',
  doctor_notes: '',
  follow_up_recommendation: '',
  consultation_outcome: '',
};

const extensionReasons = [
  'Patient needs more discussion',
  'Emergency situation',
  'Crisis intervention',
  'Medication discussion',
  'Family consultation',
  'Other',
];

function toAppointmentDateTime(appointment, field = 'appointment_time') {
  const date = appointment?.appointment_date;
  const time = appointment?.[field] || appointment?.time;
  if (!date || !time) return null;
  const parsed = new Date(`${date}T${String(time).slice(0, 5)}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function addMinutes(date, minutes) {
  if (!date) return null;
  return new Date(date.getTime() + (Number(minutes) || 0) * 60000);
}

function timeLabel(date) {
  if (!date) return 'N/A';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function statusKey(status) {
  return String(status || '').toLowerCase();
}

function isActiveConsultation(appointment, now = new Date()) {
  const status = statusKey(appointment?.status);
  if (!['accepted', 'confirmed'].includes(status) || appointment?.has_report) return false;
  const start = toAppointmentDateTime(appointment, 'appointment_time');
  const end = toAppointmentDateTime(appointment, 'appointment_end_time') || addMinutes(start, appointment?.duration_minutes || 30);
  return start && end && now >= start && now <= end;
}

function DoctorAppointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [consultationAppointment, setConsultationAppointment] = useState(null);
  const [consultationForm, setConsultationForm] = useState(emptyConsultation);
  const [consultationError, setConsultationError] = useState('');
  const [extensionMinutes, setExtensionMinutes] = useState(15);
  const [customExtension, setCustomExtension] = useState('');
  const [extensionReason, setExtensionReason] = useState('');
  const [extensionModalAppointment, setExtensionModalAppointment] = useState(null);
  const [extending, setExtending] = useState(false);

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

  const canConfirm = (status) => String(status || '').toLowerCase() === 'pending';
  const canCancel = (status) => ['pending', 'confirmed', 'accepted'].includes(String(status || '').toLowerCase());
  const canStartConsultation = (appointment) => {
    const status = String(appointment.status || '').toLowerCase();
    return ['accepted', 'confirmed'].includes(status) && !appointment.has_report;
  };
  const activeAppointmentId = appointments.find((appointment) => isActiveConsultation(appointment))?.id;
  const canExtendAppointment = (appointment) => appointment.id === activeAppointmentId && isActiveConsultation(appointment);

  const openConsultation = (appointment) => {
    setConsultationAppointment(appointment);
    setConsultationForm({
      ...emptyConsultation,
      symptoms: appointment.symptoms || '',
      follow_up_recommendation: appointment.prediction_recommendation || '',
    });
    setConsultationError('');
  };

  const openExtensionModal = (appointment) => {
    setExtensionModalAppointment(appointment);
    setExtensionMinutes(15);
    setCustomExtension('');
    setExtensionReason('');
    setConsultationError('');
  };

  const updateConsultationField = (field, value) => {
    setConsultationForm((prev) => ({ ...prev, [field]: value }));
  };

  const extendSession = async () => {
    if (!extensionModalAppointment) return;
    const minutes = extensionMinutes === 'custom' ? Number(customExtension) : Number(extensionMinutes);
    if (!Number.isInteger(minutes) || minutes < 1) {
      setConsultationError('Enter a valid extension duration in whole minutes.');
      return;
    }
    if (minutes > 60) {
      setConsultationError('A single extension cannot exceed 60 minutes.');
      return;
    }
    if (!extensionReason) {
      setConsultationError('Select a reason before confirming the extension.');
      return;
    }
    setExtending(true);
    setConsultationError('');
    try {
      const result = await api.extendDoctorAppointment(extensionModalAppointment.id, {
        minutes,
        reason: extensionReason,
        emergency_mode: true,
      });
      const refreshed = await api.getDoctorAppointments();
      const nextAppointments = refreshed.appointments || [];
      setAppointments(nextAppointments);
      const updated = nextAppointments.find((item) => item.id === extensionModalAppointment.id);
      if (updated) setConsultationAppointment(updated);
      setExtensionModalAppointment(null);
      setCustomExtension('');
      setExtensionReason('');
      setConsultationError(`${result.message} ${result.affected_appointments.length} later appointment(s) updated.`);
    } catch (err) {
      setConsultationError(err.message || 'Unable to extend this consultation.');
    } finally {
      setExtending(false);
    }
  };

  const completeConsultation = async (event) => {
    event.preventDefault();
    if (!consultationAppointment) return;
    const required = ['symptoms', 'diagnosis', 'treatment_plan', 'prescription', 'doctor_notes', 'follow_up_recommendation', 'consultation_outcome'];
    const missing = required.filter((field) => !String(consultationForm[field] || '').trim());
    if (missing.length) {
      setConsultationError('Complete all required consultation fields before saving.');
      return;
    }
    setUpdatingId(consultationAppointment.id);
    setConsultationError('');
    try {
      const result = await api.completeDoctorConsultation(consultationAppointment.id, {
        ...consultationForm,
        prediction_result: consultationAppointment.prediction_result,
        confidence_score: consultationAppointment.prediction_confidence,
        risk_level: consultationAppointment.risk_level,
      });
      setAppointments((prev) => prev.map((item) => (
        item.id === consultationAppointment.id
          ? { ...item, status: 'Completed', has_report: true, report_id: result.report?.id || result.report?.report_id }
          : item
      )));
      setConsultationAppointment(null);
      setConsultationForm(emptyConsultation);
    } catch (err) {
      setConsultationError(err.message || 'Unable to complete consultation.');
    } finally {
      setUpdatingId(null);
    }
  };

  const selectedExtensionMinutes = extensionMinutes === 'custom' ? Number(customExtension) : Number(extensionMinutes);
  const extensionCurrentEnd = toAppointmentDateTime(extensionModalAppointment, 'appointment_end_time') || addMinutes(toAppointmentDateTime(extensionModalAppointment), extensionModalAppointment?.duration_minutes || 30);
  const extensionNewEnd = Number.isFinite(selectedExtensionMinutes) ? addMinutes(extensionCurrentEnd, selectedExtensionMinutes) : null;
  const affectedNextAppointment = extensionModalAppointment && extensionNewEnd
    ? appointments
        .filter((item) => item.id !== extensionModalAppointment.id && item.appointment_date === extensionModalAppointment.appointment_date)
        .filter((item) => !['cancelled', 'canceled', 'rejected', 'failed', 'expired', 'completed'].includes(statusKey(item.status)))
        .sort((a, b) => String(a.appointment_time || '').localeCompare(String(b.appointment_time || '')))
        .find((item) => {
          const nextStart = toAppointmentDateTime(item, 'appointment_time');
          return nextStart && nextStart >= extensionCurrentEnd && nextStart < extensionNewEnd;
        })
    : null;
  const affectedDelayMinutes = affectedNextAppointment && extensionNewEnd
    ? Math.max(0, Math.round((extensionNewEnd - toAppointmentDateTime(affectedNextAppointment, 'appointment_time')) / 60000))
    : 0;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B1120] text-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#06B6D4] mx-auto"></div>
          <p className="mt-4 text-slate-300">Loading appointments…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <SectionHeader subtitle="Doctor appointments" title="Manage patient bookings and approve requests." />

      {error && (
        <div className="rounded-[2rem] border border-red-800 bg-[#111827] p-6 shadow-sm">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      <div className="rounded-[2rem] border border-[#334155] bg-[#111827] p-8 shadow-xl transition-colors duration-300">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#334155] text-left">
            <thead className="bg-[#0F172A]">
              <tr>
                <th className="px-4 py-3 text-sm font-semibold text-slate-400">Patient</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-400">Phone Number</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-400">Date</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-400">Time</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-400">Prediction</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-400">Status</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]">
              {appointments.map((appointment) => (
                <tr key={appointment.id}>
                  <td className="px-4 py-4 text-sm text-slate-100">{appointment.patient_name || 'N/A'}</td>
                  <td className="px-4 py-4 text-sm text-slate-100">{appointment.patient_phone || appointment.phone || 'N/A'}</td>
                  <td className="px-4 py-4 text-sm text-slate-100">{appointment.appointment_date || 'N/A'}</td>
                  <td className="px-4 py-4 text-sm text-slate-100">
                    <p>{appointment.appointment_time || 'N/A'}{appointment.appointment_end_time ? ` - ${appointment.appointment_end_time}` : ''}</p>
                    {appointment.extension_minutes > 0 && <p className="mt-1 text-xs font-bold text-red-200">Extended +{appointment.extension_minutes} min</p>}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-100">{appointment.prediction_result || 'None'}</td>
                  <td className="px-4 py-4 text-sm font-semibold text-slate-100">
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
                            className="inline-flex items-center justify-center rounded-3xl bg-slate-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-600 disabled:opacity-60"
                          >
                            <FiXCircle className="mr-2 h-4 w-4" /> Reject
                          </button>
                        </>
                      )}
                      {canStartConsultation(appointment) && (
                        <button
                          disabled={updatingId === appointment.id}
                          onClick={() => openConsultation(appointment)}
                          className="inline-flex items-center justify-center rounded-3xl bg-blue-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-600 disabled:opacity-60"
                        >
                          <FiFileText className="mr-2 h-4 w-4" /> Start Consultation
                        </button>
                      )}
                      {canExtendAppointment(appointment) && (
                        <button
                          type="button"
                          disabled={extending}
                          onClick={() => openExtensionModal(appointment)}
                          className="inline-flex items-center justify-center rounded-3xl bg-red-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
                        >
                          <FiClock className="mr-2 h-4 w-4" /> Extend Consultation
                        </button>
                      )}
                      {appointment.emergency_extension && <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-3 py-2 text-xs font-bold text-red-200"><FiAlertTriangle /> Emergency Consultation</span>}
                      {appointment.has_report && (
                        <button
                          onClick={() => navigate('/doctor/reports')}
                          className="inline-flex items-center justify-center rounded-3xl border border-cyan-500 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/10"
                        >
                          <FiFileText className="mr-2 h-4 w-4" /> View Report
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
                      {!canConfirm(appointment.status) && !canStartConsultation(appointment) && !canCancel(appointment.status) && !appointment.has_report && (
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

      {consultationAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <form onSubmit={completeConsultation} className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] border border-slate-700 bg-[#111827] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-700 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Consultation</p>
                <h2 className="mt-1 text-2xl font-bold text-white">Complete Consultation</h2>
                <p className="mt-1 text-sm text-slate-400">Appointment #{consultationAppointment.id}</p>
              </div>
              <button type="button" onClick={() => setConsultationAppointment(null)} className="rounded-full border border-slate-600 p-2 text-slate-300 hover:bg-slate-800">
                <FiX />
              </button>
            </div>

            {consultationError && <div className="mt-4 rounded-2xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">{consultationError}</div>}

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <InfoPanel title="Patient Information" rows={[
                ['Name', consultationAppointment.patient_name || 'N/A'],
                ['Phone Number', consultationAppointment.patient_phone || consultationAppointment.phone || 'N/A'],
                ['Phone', consultationAppointment.patient_phone || consultationAppointment.phone || 'N/A'],
                ['Age / Gender', `${consultationAppointment.patient_age || '-'} / ${consultationAppointment.patient_gender || '-'}`],
              ]} />
              <InfoPanel title="Appointment Information" rows={[
                ['Date', consultationAppointment.appointment_date || 'N/A'],
                ['Original', `${consultationAppointment.original_appointment_time || consultationAppointment.appointment_time || 'N/A'} - ${consultationAppointment.original_appointment_end_time || 'N/A'}`],
                ['Current', `${consultationAppointment.appointment_time || 'N/A'} - ${consultationAppointment.appointment_end_time || 'N/A'}`],
                ['Total Duration', `${consultationAppointment.duration_minutes || 30} minutes${consultationAppointment.extension_minutes ? ` (+${consultationAppointment.extension_minutes} min)` : ''}`],
                ['Status', consultationAppointment.status || 'N/A'],
                ['Fee', `$${Number(consultationAppointment.fee || 0).toFixed(2)}`],
              ]} />
              <InfoPanel title="Prediction Information" rows={[
                ['Prediction', consultationAppointment.prediction_result || 'None'],
                ['Confidence', consultationAppointment.prediction_confidence != null ? `${consultationAppointment.prediction_confidence}%` : 'N/A'],
                ['Risk Level', consultationAppointment.risk_level || 'N/A'],
                ['Payment', consultationAppointment.payment_status || 'N/A'],
              ]} />
            </div>

            <section className={`mt-5 rounded-2xl border p-4 ${consultationAppointment.emergency_extension ? 'border-red-500/60 bg-red-950/20' : 'border-cyan-700/60 bg-cyan-950/20'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="flex items-center gap-2 font-bold text-white"><FiClock /> Active Consultation Timing</p><p className="mt-1 text-xs text-slate-400">Current end: {consultationAppointment.appointment_end_time || 'N/A'}{consultationAppointment.extension_minutes ? ` · Extra time: ${consultationAppointment.extension_minutes} minutes` : ''}</p></div>
                {consultationAppointment.emergency_extension && <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white"><FiAlertTriangle /> Emergency Consultation</span>}
              </div>
              {canExtendAppointment(consultationAppointment) ? (
                <button type="button" onClick={() => openExtensionModal(consultationAppointment)} className="mt-4 inline-flex items-center gap-2 rounded-md bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600">
                  <FiClock /> Extend Consultation
                </button>
              ) : (
                <p className="mt-4 text-sm text-slate-400">Extension is available only while this appointment is actively in progress.</p>
              )}
            </section>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <Field label="Symptoms" value={consultationForm.symptoms} onChange={(value) => updateConsultationField('symptoms', value)} textarea />
              <Field label="Diagnosis" value={consultationForm.diagnosis} onChange={(value) => updateConsultationField('diagnosis', value)} textarea />
              <Field label="Treatment Plan" value={consultationForm.treatment_plan} onChange={(value) => updateConsultationField('treatment_plan', value)} textarea />
              <Field label="Prescription" value={consultationForm.prescription} onChange={(value) => updateConsultationField('prescription', value)} textarea />
              <Field label="Doctor Notes" value={consultationForm.doctor_notes} onChange={(value) => updateConsultationField('doctor_notes', value)} textarea />
              <Field label="Follow-up Recommendation" value={consultationForm.follow_up_recommendation} onChange={(value) => updateConsultationField('follow_up_recommendation', value)} textarea />
              <label className="lg:col-span-2">
                <span className="text-sm font-semibold text-slate-300">Consultation Outcome</span>
                <select value={consultationForm.consultation_outcome} onChange={(event) => updateConsultationField('consultation_outcome', event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-slate-600 bg-slate-950 px-3 text-sm text-white outline-none focus:border-cyan-400">
                  <option value="">Select outcome</option>
                  <option value="Stable - routine follow-up">Stable - routine follow-up</option>
                  <option value="Improved - continue treatment">Improved - continue treatment</option>
                  <option value="Needs close monitoring">Needs close monitoring</option>
                  <option value="Referred for specialist care">Referred for specialist care</option>
                  <option value="Emergency escalation recommended">Emergency escalation recommended</option>
                </select>
              </label>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => setConsultationAppointment(null)} className="rounded-2xl border border-slate-600 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800">Cancel</button>
              <button disabled={updatingId === consultationAppointment.id} type="submit" className="rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-950/30 hover:bg-cyan-400 disabled:opacity-60">
                Complete Consultation
              </button>
            </div>
          </form>
        </div>
      )}

      {extensionModalAppointment && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[2rem] border border-red-500/40 bg-[#111827] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-700 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">Emergency extension</p>
                <h2 className="mt-1 text-2xl font-bold text-white">Extend Consultation</h2>
                <p className="mt-1 text-sm text-slate-400">{extensionModalAppointment.patient_name || 'Patient'} · Appointment #{extensionModalAppointment.id}</p>
              </div>
              <button type="button" onClick={() => setExtensionModalAppointment(null)} className="rounded-full border border-slate-600 p-2 text-slate-300 hover:bg-slate-800">
                <FiX />
              </button>
            </div>

            {consultationError && <div className="mt-4 rounded-2xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">{consultationError}</div>}

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-950 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Current End</p>
                <p className="mt-2 text-xl font-black text-white">{timeLabel(extensionCurrentEnd)}</p>
              </div>
              <div className="rounded-2xl bg-slate-950 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">New End</p>
                <p className="mt-2 text-xl font-black text-white">{timeLabel(extensionNewEnd)}</p>
              </div>
              <div className="rounded-2xl bg-slate-950 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Next Delay</p>
                <p className="mt-2 text-xl font-black text-red-200">{affectedDelayMinutes ? `${affectedDelayMinutes} min` : 'None'}</p>
              </div>
            </div>

            <div className="mt-5">
              <p className="text-sm font-bold text-slate-200">Extend by</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[5, 10, 15, 20, 30].map((minutes) => (
                  <button key={minutes} type="button" onClick={() => setExtensionMinutes(minutes)} className={`h-10 rounded-md px-4 text-sm font-bold ${extensionMinutes === minutes ? 'bg-red-500 text-white' : 'border border-slate-600 text-slate-200 hover:bg-slate-800'}`}>+{minutes} min</button>
                ))}
                <button type="button" onClick={() => setExtensionMinutes('custom')} className={`h-10 rounded-md px-4 text-sm font-bold ${extensionMinutes === 'custom' ? 'bg-red-500 text-white' : 'border border-slate-600 text-slate-200 hover:bg-slate-800'}`}>Custom minutes</button>
              </div>
              {extensionMinutes === 'custom' && (
                <label className="mt-3 block text-sm font-bold text-slate-200">
                  Custom minutes
                  <input type="number" min="1" max="60" step="1" value={customExtension} onChange={(event) => setCustomExtension(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-slate-600 bg-slate-950 px-3 text-white" />
                </label>
              )}
            </div>

            <label className="mt-5 block text-sm font-bold text-slate-200">
              Reason
              <select value={extensionReason} onChange={(event) => setExtensionReason(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-slate-600 bg-slate-950 px-3 text-white">
                <option value="">Select reason</option>
                {extensionReasons.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
              </select>
            </label>

            <div className="mt-5 rounded-2xl border border-amber-400/40 bg-amber-950/20 p-4 text-sm text-amber-100">
              <p className="font-bold">This will delay the following appointments automatically and notify affected patients.</p>
              {affectedNextAppointment ? (
                <p className="mt-2">Affected next appointment: {affectedNextAppointment.patient_name || 'Patient'} at {affectedNextAppointment.appointment_time}. New start will be {timeLabel(extensionNewEnd)}.</p>
              ) : (
                <p className="mt-2">No immediate next appointment is affected by this extension.</p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setExtensionModalAppointment(null)} className="rounded-2xl border border-slate-600 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800">Cancel</button>
              <button type="button" disabled={extending} onClick={extendSession} className="rounded-2xl bg-red-500 px-5 py-3 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-60">
                {extending ? 'Confirming...' : 'Confirm Extension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoPanel({ title, rows }) {
  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-950/50 p-4">
      <h3 className="font-semibold text-white">{title}</h3>
      <div className="mt-3 space-y-2">
        {rows.map(([label, value]) => (
          <p key={label} className="text-sm text-slate-400"><span className="font-semibold text-slate-200">{label}:</span> {value}</p>
        ))}
      </div>
    </section>
  );
}

function Field({ label, value, onChange, textarea = false }) {
  return (
    <label>
      <span className="text-sm font-semibold text-slate-300">{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="mt-2 w-full rounded-2xl border border-slate-600 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-cyan-400" />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-slate-600 bg-slate-950 px-3 text-sm text-white outline-none focus:border-cyan-400" />
      )}
    </label>
  );
}

export default DoctorAppointments;
