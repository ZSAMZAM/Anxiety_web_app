import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SectionHeader from '../../components/SectionHeader.jsx';
import { api } from '../../services/api.js';

function DoctorPredictions() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [selectedPrediction, setSelectedPrediction] = useState(null);

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

  const predictions = appointments.filter((appointment) => {
    if (!appointment.prediction_result) return false;
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [
      appointment.patient_name,
      appointment.patient_phone,
      appointment.prediction_result,
      appointment.risk_level,
      appointment.symptoms,
    ].some((value) => String(value || '').toLowerCase().includes(query));
    const matchesRisk = riskFilter === 'all' || String(appointment.risk_level || appointment.prediction_result || '').toLowerCase().includes(riskFilter);
    return matchesSearch && matchesRisk;
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B1120] text-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#06B6D4] mx-auto"></div>
          <p className="mt-4 text-slate-300">Loading prediction results…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <SectionHeader subtitle="Prediction results" title="Review patient predictions before appointments." />

      {error && (
        <div className="rounded-[2rem] border border-red-800 bg-[#111827] p-6 shadow-sm">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      <div className="rounded-[2rem] border border-[#334155] bg-[#111827] p-8 shadow-xl transition-colors duration-300">
        <div className="mb-6 grid gap-3 md:grid-cols-[1fr_220px]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search patient, phone, prediction, or symptoms"
            className="rounded-2xl border border-[#334155] bg-[#0B1120] px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-[#06B6D4]"
          />
          <select
            value={riskFilter}
            onChange={(event) => setRiskFilter(event.target.value)}
            className="rounded-2xl border border-[#334155] bg-[#0B1120] px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-[#06B6D4]"
          >
            <option value="all">All risk levels</option>
            <option value="high">High risk</option>
            <option value="moderate">Moderate risk</option>
            <option value="low">Low risk</option>
          </select>
        </div>

        {predictions.length ? (
          <div className="space-y-4">
            {predictions.map((appointment) => (
              <div key={appointment.id} className="rounded-3xl border border-[#334155] bg-[#1E293B] p-5 shadow-sm transition-colors duration-200">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-slate-300">{appointment.patient_name || 'Unknown patient'}</p>
                    <h3 className="mt-1 text-xl font-semibold text-slate-100">{appointment.prediction_result}</h3>
                  </div>
                  <p className="text-sm text-slate-300">Confidence: {appointment.prediction_confidence != null ? `${Math.round(appointment.prediction_confidence * 100)}%` : 'N/A'}</p>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm text-slate-300">
                  <p>Appointment: {appointment.appointment_date} at {appointment.appointment_time}</p>
                  <p>Phone Number: {appointment.patient_phone || appointment.phone || 'N/A'}</p>
                  <p>Risk Level: {appointment.risk_level || 'Not recorded'}</p>
                  <p>Payment: {appointment.payment_status || 'Paid'}</p>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedPrediction(appointment)}
                    className="rounded-2xl border border-[#334155] px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-[#06B6D4]"
                  >
                    View Details
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/doctor/appointments', { state: { appointmentId: appointment.id } })}
                    className="rounded-2xl bg-gradient-to-r from-[#06B6D4] to-[#0EA5E9] px-4 py-2 text-sm font-semibold text-white transition hover:from-[#0CA7D8] hover:to-[#0284C7]"
                  >
                    Start Consultation
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-[#334155] bg-[#111827] p-8 text-center text-slate-300 shadow-sm">
            <p>No prediction results are available yet for your patients.</p>
          </div>
        )}
      </div>

      {selectedPrediction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-[#334155] bg-[#111827] p-7 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-[#06B6D4]">{selectedPrediction.patient_name || 'Patient'}</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-100">{selectedPrediction.prediction_result}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPrediction(null)}
                className="rounded-2xl border border-[#334155] px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-[#06B6D4]"
              >
                Close
              </button>
            </div>
            <div className="mt-6 grid gap-4 text-sm text-slate-300 sm:grid-cols-2">
              <p>Confidence: {selectedPrediction.prediction_confidence != null ? `${Math.round(selectedPrediction.prediction_confidence * 100)}%` : 'N/A'}</p>
              <p>Risk Level: {selectedPrediction.risk_level || 'Not recorded'}</p>
              <p>Assessment Date: {selectedPrediction.created_at || selectedPrediction.appointment_date || 'Unknown'}</p>
              <p>Payment Status: {selectedPrediction.payment_status || 'Paid'}</p>
              <p>Consultation Status: {selectedPrediction.status || 'Confirmed'}</p>
              <p>Appointment: {selectedPrediction.appointment_date || 'Unknown'} at {selectedPrediction.appointment_time || 'Unknown'}</p>
            </div>
            <div className="mt-6 rounded-3xl border border-[#334155] bg-[#0B1120] p-5">
              <p className="text-sm font-semibold text-slate-100">Assessment Text</p>
              <p className="mt-2 text-sm text-slate-300">{selectedPrediction.symptoms || 'No assessment text recorded.'}</p>
            </div>
            <div className="mt-5 rounded-3xl border border-[#334155] bg-[#0B1120] p-5">
              <p className="text-sm font-semibold text-slate-100">Recommendation</p>
              <p className="mt-2 text-sm text-slate-300">{selectedPrediction.prediction_recommendation || 'No recommendation recorded.'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DoctorPredictions;
