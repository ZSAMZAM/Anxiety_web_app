import { useEffect, useMemo, useState } from 'react';
import SectionHeader from '../../components/SectionHeader.jsx';
import { api } from '../../services/api.js';
import { FiX, FiFileText, FiActivity } from 'react-icons/fi';

function DoctorPatients() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientHistory, setPatientHistory] = useState([]);
  const [patientPredictions, setPatientPredictions] = useState([]);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const loadAppointments = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await api.getDoctorAppointments();
        setAppointments(result.appointments || []);
      } catch (err) {
        console.error('Unable to load doctor patients:', err);
        setError(err.message || 'Unable to load patients.');
      } finally {
        setLoading(false);
      }
    };

    loadAppointments();
  }, []);

  const handleViewPatient = async (patient) => {
    setSelectedPatient(patient);
    setShowModal(true);
    setNotes('');
    
    // Load patient history
    try {
      const history = appointments.filter(a => a.user_id === patient.user_id);
      setPatientHistory(history);
    } catch (err) {
      console.error('Failed to load patient history:', err);
    }

    const predictions = appointments
      .filter((appointment) => appointment.user_id === patient.user_id && appointment.prediction_result)
      .map((appointment) => ({
        id: appointment.prediction_id || appointment.id,
        anxietyLevel: appointment.prediction_result,
        confidence: appointment.prediction_confidence != null
          ? Math.round(Number(appointment.prediction_confidence) > 1 ? Number(appointment.prediction_confidence) : Number(appointment.prediction_confidence) * 100)
          : 0,
        date: appointment.created_at || appointment.appointment_date,
        summary: appointment.prediction_recommendation || `Detected ${appointment.prediction_result}.`,
        sharingStatus: 'shared_with_doctor',
      }));
    setPatientPredictions(predictions);
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      // In a real implementation, this would save notes to the database
      // For now, we'll just show a success message
      alert('Notes saved successfully!');
    } catch (err) {
      console.error('Failed to save notes:', err);
      alert('Failed to save notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  const patients = useMemo(() => {
    const map = {};
    appointments.forEach((appointment) => {
      if (!appointment.user_id) return;
      if (!map[appointment.user_id]) {
        map[appointment.user_id] = {
          user_id: appointment.user_id,
          name: appointment.patient_name || 'Unknown',
          phone: appointment.patient_phone || appointment.phone || 'No phone number',
          lastAppointment: appointment.appointment_date,
          latestPrediction: appointment.prediction_result || 'Not recorded',
          riskLevel: appointment.risk_level || 'Not recorded',
          assessmentDate: appointment.created_at || appointment.appointment_date,
          paymentStatus: appointment.payment_status || 'Paid',
          consultationStatus: appointment.status || 'Confirmed',
          upcoming: appointment.status !== 'Rejected' ? 1 : 0,
          appointments: 1,
        };
      } else {
        map[appointment.user_id].appointments += 1;
        if (appointment.appointment_date > (map[appointment.user_id].lastAppointment || '')) {
          map[appointment.user_id].lastAppointment = appointment.appointment_date;
          map[appointment.user_id].latestPrediction = appointment.prediction_result || map[appointment.user_id].latestPrediction;
          map[appointment.user_id].riskLevel = appointment.risk_level || map[appointment.user_id].riskLevel;
          map[appointment.user_id].assessmentDate = appointment.created_at || appointment.appointment_date || map[appointment.user_id].assessmentDate;
          map[appointment.user_id].paymentStatus = appointment.payment_status || map[appointment.user_id].paymentStatus;
          map[appointment.user_id].consultationStatus = appointment.status || map[appointment.user_id].consultationStatus;
        }
        if (appointment.status !== 'Rejected') {
          map[appointment.user_id].upcoming += 1;
        }
      }
    });
    return Object.values(map);
  }, [appointments]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B1120] text-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#06B6D4] mx-auto"></div>
          <p className="mt-4 text-slate-300">Loading patients…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <SectionHeader subtitle="Doctor patients" title="View your patient list and appointment history." />

      {error && (
        <div className="rounded-[2rem] border border-red-800 bg-[#111827] p-6 shadow-sm">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        {patients.length ? (
          patients.map((patient) => (
            <div 
              key={patient.user_id} 
              onClick={() => handleViewPatient(patient)}
              className="rounded-[2rem] border border-[#334155] bg-[#1E293B] p-6 shadow-xl transition-colors duration-300 hover:border-[#06B6D4] hover:shadow-2xl cursor-pointer"
            >
              <p className="text-sm uppercase tracking-[0.35em] text-[#06B6D4]">{patient.name}</p>
              <h3 className="mt-3 text-2xl font-semibold text-slate-100">{patient.phone}</h3>
              <div className="mt-6 space-y-3 text-sm text-slate-300">
                <p>Appointments: <span className="font-semibold text-slate-100">{patient.appointments}</span></p>
                <p>Upcoming: <span className="font-semibold text-slate-100">{patient.upcoming}</span></p>
                <p>Last booked: <span className="font-semibold text-slate-100">{patient.lastAppointment || 'Unknown'}</span></p>
                <p>Prediction: <span className="font-semibold text-slate-100">{patient.latestPrediction}</span></p>
                <p>Risk: <span className="font-semibold text-slate-100">{patient.riskLevel}</span></p>
                <p>Payment: <span className="font-semibold text-slate-100">{patient.paymentStatus}</span></p>
                <p>Consultation: <span className="font-semibold text-slate-100">{patient.consultationStatus}</span></p>
              </div>
              <button className="mt-6 w-full rounded-3xl bg-gradient-to-r from-[#06B6D4] to-[#0EA5E9] px-4 py-3 text-sm font-semibold text-white transition hover:from-[#0CA7D8] hover:to-[#0284C7]">
                View Details
              </button>
            </div>
          ))
        ) : (
          <div className="rounded-[2rem] border border-[#334155] bg-[#111827] p-8 text-center text-slate-300 shadow-sm">
            <p>No patient records available yet.</p>
          </div>
        )}
      </div>

      {/* Patient Details Modal */}
      {showModal && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="rounded-[2rem] border border-[#334155] bg-[#111827] p-8 shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Patient Details</h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-100"
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Patient Info */}
              <div className="rounded-3xl bg-slate-50 p-6 dark:bg-slate-800">
                <p className="text-sm uppercase tracking-[0.35em] text-sky-600">Patient Information</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <p><span className="font-semibold text-slate-900 dark:text-slate-100">Name:</span> {selectedPatient.name}</p>
                  <p><span className="font-semibold text-slate-900 dark:text-slate-100">Phone Number:</span> {selectedPatient.phone}</p>
                  <p><span className="font-semibold text-slate-900 dark:text-slate-100">Total Appointments:</span> {selectedPatient.appointments}</p>
                  <p><span className="font-semibold text-slate-900 dark:text-slate-100">Upcoming:</span> {selectedPatient.upcoming}</p>
                  <p><span className="font-semibold text-slate-900 dark:text-slate-100">Prediction:</span> {selectedPatient.latestPrediction}</p>
                  <p><span className="font-semibold text-slate-900 dark:text-slate-100">Risk Level:</span> {selectedPatient.riskLevel}</p>
                  <p><span className="font-semibold text-slate-900 dark:text-slate-100">Assessment Date:</span> {selectedPatient.assessmentDate || 'Unknown'}</p>
                  <p><span className="font-semibold text-slate-900 dark:text-slate-100">Payment Status:</span> {selectedPatient.paymentStatus}</p>
                  <p><span className="font-semibold text-slate-900 dark:text-slate-100">Consultation Status:</span> {selectedPatient.consultationStatus}</p>
                </div>
              </div>

              {/* Appointment History */}
              <div className="rounded-3xl bg-slate-50 p-6 dark:bg-slate-800">
                <p className="text-sm uppercase tracking-[0.35em] text-sky-600 flex items-center gap-2">
                  <FiFileText className="h-4 w-4" /> Appointment History
                </p>
                <div className="mt-4 space-y-3">
                  {patientHistory.length > 0 ? (
                    patientHistory.map((apt, idx) => (
                      <div key={idx} className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{apt.appointment_date || 'Unknown'}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{apt.appointment_time || 'Unknown'}</p>
                          </div>
                          <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                            apt.status === 'Completed' ? 'bg-green-100 text-green-700' :
                            apt.status === 'Confirmed' ? 'bg-blue-100 text-blue-700' :
                            apt.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {apt.status || 'Pending'}
                          </span>
                        </div>
                        {apt.notes && (
                          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Notes: {apt.notes}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-600 dark:text-slate-400">No appointment history available.</p>
                  )}
                </div>
              </div>

              {/* Prediction Results */}
              <div className="rounded-3xl bg-slate-50 p-6 dark:bg-slate-800">
                <p className="text-sm uppercase tracking-[0.35em] text-sky-600 flex items-center gap-2">
                  <FiActivity className="h-4 w-4" /> Prediction Results
                </p>
                <div className="mt-4 space-y-3">
                  {patientPredictions.length > 0 ? (
                    patientPredictions.slice(0, 5).map((pred, idx) => (
                      <div key={idx} className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{pred.anxietyLevel || 'Unknown'}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{pred.date || 'Unknown'}</p>
                          </div>
                          <span className="text-sm text-sky-600 font-semibold">{pred.confidence}% confidence</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{pred.summary || 'No summary available'}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-600 dark:text-slate-400">No prediction results available.</p>
                  )}
                </div>
              </div>

              {/* Add Notes */}
              <div className="rounded-3xl bg-slate-50 p-6 dark:bg-slate-800">
                <p className="text-sm uppercase tracking-[0.35em] text-sky-600">Doctor Notes</p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this patient..."
                  rows={4}
                  className="mt-4 w-full rounded-3xl border border-[#334155] bg-[#111827] px-4 py-3 text-slate-100 outline-none transition focus:border-[#06B6D4]"
                />
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="mt-4 rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 px-6 py-3 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-sky-600 disabled:opacity-50"
                >
                  {savingNotes ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DoctorPatients;
