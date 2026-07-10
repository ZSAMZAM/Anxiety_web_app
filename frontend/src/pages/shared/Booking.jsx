import { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';
import SectionHeader from '../../components/SectionHeader.jsx';

function Booking() {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [form, setForm] = useState({ date: '', time: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { doctorId } = useParams();
  const selectedDoctorFromState = location.state?.doctor;

  useEffect(() => {
    let active = true;
    api.getAssessmentBookingState()
      .then((state) => {
        if (!active) return;
        if (!state.canBookTherapist) {
          setError(state.bookingMessage);
          navigate(state.hasAssessment ? '/user/history' : '/user/assessment', {
            replace: true,
            state: { message: state.bookingMessage },
          });
          return;
        }
        return api.getDoctors().then((data) => {
          if (!active) return;
          setDoctors(data);
          const preferredDoctor = selectedDoctorFromState || (doctorId ? data.find((doctor) => doctor.id === Number(doctorId)) : null);
          setSelectedDoctor(preferredDoctor || data[0]);
        });
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.response?.data?.message || err?.response?.data?.error || err.message || 'Unable to verify assessment status.');
      });
    return () => {
      active = false;
    };
  }, [doctorId, selectedDoctorFromState]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const state = await api.getAssessmentBookingState();
      if (!state.canBookTherapist) {
        setError(state.bookingMessage);
        navigate(state.hasAssessment ? '/user/history' : '/user/assessment', {
          replace: true,
          state: { message: state.bookingMessage },
        });
        setLoading(false);
        return;
      }
      const bookingResponse = await api.bookAppointment({
        doctor_name: selectedDoctor?.name,
        appointment_date: form.date,
        appointment_time: form.time,
        notes: form.notes,
      });

      // Prepare booking data for payment page
      const bookingData = {
        id: bookingResponse.id || Date.now(),
        doctorName: selectedDoctor?.name,
        doctorId: selectedDoctor?.id,
        doctorSpecialization: selectedDoctor?.specialization,
        doctorImage: selectedDoctor?.photo,
        appointmentDate: form.date,
        appointmentTime: form.time,
        notes: form.notes,
        estimatedFee: selectedDoctor?.fee || 5,
        duration: 45,
        bookedAt: new Date().toISOString(),
      };

      // Store booking info in localStorage as backup
      localStorage.setItem('pending-booking', JSON.stringify(bookingData));

      // Navigate to payment page with booking data
      navigate('/user/payment', { 
        state: { booking: bookingData },
        replace: false 
      });
    } catch (err) {
      console.error('Booking failed:', err);
      setError(err?.response?.data?.message || err?.response?.data?.error || err.message || 'Failed to create booking. Please try again.');
      setLoading(false);
    }
  };

  return (
      <div className="space-y-10">
        <SectionHeader subtitle="Doctor booking" title="Reserve your session with a trusted specialist." />
        <div className="grid gap-6 xl:grid-cols-[0.95fr_0.65fr]">
          <div className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-xl backdrop-blur-xl">
            <p className="text-sm uppercase tracking-[0.35em] text-sky-600">Selected doctor</p>
            <div className="mt-6 space-y-4 rounded-3xl border border-gray-200 bg-white/80 p-6 shadow-sm">
              {selectedDoctor ? (
                <>
                  <div className="flex items-center gap-4">
                    <Avatar
                      src={selectedDoctor.photo || selectedDoctor.image || selectedDoctor.avatar}
                      name={selectedDoctor.name}
                      role="doctor"
                      size="xl"
                      className="shadow-lg"
                    />
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{selectedDoctor.name}</h3>
                      <p className="text-sm text-gray-500">{selectedDoctor.specialization}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">Experience: {selectedDoctor.experience}</p>
                  <p className="text-sm text-gray-600">Rating: {selectedDoctor.rating} / 5</p>
                </>
              ) : (
                <p className="text-gray-500">Choose a doctor to show details.</p>
              )}
            </div>
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <label className="space-y-2 text-sm text-gray-700">
                <span className="block text-gray-900">Choose doctor</span>
                <select
                  className="w-full rounded-3xl border border-gray-200 bg-white/80 px-4 py-3 text-gray-900 outline-none shadow-sm backdrop-blur-sm"
                  value={selectedDoctor?.id || ''}
                  onChange={(e) => setSelectedDoctor(doctors.find((doctor) => doctor.id === Number(e.target.value)))}
                >
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm text-gray-700">
                <span className="block text-gray-900">Select date</span>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full rounded-3xl border border-gray-200 bg-white/80 px-4 py-3 text-gray-900 outline-none shadow-sm backdrop-blur-sm"
                  required
                />
              </label>
              <label className="space-y-2 text-sm text-gray-700">
                <span className="block text-gray-900">Choose time</span>
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className="w-full rounded-3xl border border-gray-200 bg-white/80 px-4 py-3 text-gray-900 outline-none shadow-sm backdrop-blur-sm"
                  required
                />
              </label>
              <label className="space-y-2 text-sm text-gray-700">
                <span className="block text-gray-900">Notes</span>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows="4"
                  placeholder="Add any symptoms or preferences..."
                  className="w-full rounded-3xl border border-gray-200 bg-white/80 px-4 py-3 text-gray-900 outline-none shadow-sm backdrop-blur-sm"
                />
              </label>
              <button 
                type="submit"
                disabled={loading}
                className="w-full rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 px-6 py-4 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-sky-600 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    Processing...
                  </span>
                ) : (
                  'Confirm booking'
                )}
              </button>
            </form>
            {error && (
              <div className="mt-4 rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm">
                <p className="font-medium">Error</p>
                <p className="mt-1">{error}</p>
              </div>
            )}
          </div>
          <div className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-xl backdrop-blur-xl">
            <p className="text-sm uppercase tracking-[0.35em] text-sky-600">Booking summary</p>
            <div className="mt-6 space-y-4 text-gray-600">
              <p>Choose a doctor, select a convenient date and time, then add notes so the doctor can prepare ahead of the session.</p>
              <div className="rounded-3xl bg-white/80 p-5 shadow-sm">
                <p className="text-sm text-gray-500">Duration</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">45 min</p>
              </div>
              <div className="rounded-3xl bg-white/80 p-5 shadow-sm">
                <p className="text-sm text-gray-500">Estimated fee</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">${(selectedDoctor?.fee || 5).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}

export default Booking;
