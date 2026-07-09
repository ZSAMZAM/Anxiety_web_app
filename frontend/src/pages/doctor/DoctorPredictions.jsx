import { useEffect, useState } from 'react';
import SectionHeader from '../../components/SectionHeader.jsx';
import { api } from '../../services/api.js';

function DoctorPredictions() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadAppointments = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await api.getDoctorAppointments();
        setAppointments(result.appointments || []);
      } catch (err) {
        console.error('Unable to load prediction results:', err);
        setError(err.message || 'Unable to load prediction results.');
      } finally {
        setLoading(false);
      }
    };

    loadAppointments();
  }, []);

  const predictions = appointments.filter((appointment) => appointment.prediction_result);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading prediction results…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <SectionHeader subtitle="Prediction results" title="Review patient predictions before appointments." />

      {error && (
        <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 shadow-sm">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-8 shadow-xl backdrop-blur-xl transition-colors duration-300 dark:border-slate-700 dark:bg-slate-950/80">
        {predictions.length ? (
          <div className="space-y-4">
            {predictions.map((appointment) => (
              <div key={appointment.id} className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm transition-colors duration-200 dark:border-slate-700 dark:bg-slate-900/60">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-300">{appointment.patient_name || 'Unknown patient'}</p>
                    <h3 className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">{appointment.prediction_result}</h3>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">Confidence: {appointment.prediction_confidence != null ? `${Math.round(appointment.prediction_confidence * 100)}%` : 'N/A'}</p>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm text-slate-600 dark:text-slate-300">
                  <p>Appointment: {appointment.appointment_date} · {appointment.appointment_time}</p>
                  <p>Email: {appointment.patient_email || 'N/A'}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-8 text-center text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
            <p>No prediction results are available yet for your patients.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default DoctorPredictions;
