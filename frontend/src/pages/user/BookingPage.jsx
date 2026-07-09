import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import SectionHeader from '../../components/SectionHeader.jsx';
import { api } from '../../services/api.js';

function BookingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { doctorId } = useParams();
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(location.state?.doctor || null);
  const [loading, setLoading] = useState(true);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [scheduleError, setScheduleError] = useState('');
  const [availabilitySchedule, setAvailabilitySchedule] = useState({});
  const [bookedSlots, setBookedSlots] = useState([]);
  const [form, setForm] = useState({ date: '', time: '', phone: '', notes: '' });
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    api.getDoctors()
      .then((data) => {
        setDoctors(data);
        if (!selectedDoctor) {
          const matched = doctorId ? data.find((doc) => String(doc.id) === doctorId) : data[0];
          setSelectedDoctor(matched || data[0] || null);
        }
      })
      .catch(() => setError('Unable to load doctors for booking.'))
      .finally(() => setLoading(false));
  }, [doctorId, location.state?.doctor]);

  useEffect(() => {
    if (!selectedDoctor?.id) return;

    setScheduleLoading(true);
    setScheduleError('');
    api.getDoctorAvailability(selectedDoctor.id)
      .then((data) => {
        const doctor = data.doctor || {};
        setSelectedDoctor((current) => ({ ...(current || {}), ...doctor }));
        setAvailabilitySchedule(doctor.availability_schedule || doctor.availabilitySchedule || data.availability_schedule || {});
        setBookedSlots(Array.isArray(data.booked_slots) ? data.booked_slots : []);
      })
      .catch((err) => {
        setAvailabilitySchedule({});
        setBookedSlots([]);
        setScheduleError(err.message || 'Failed to load schedule from server.');
      })
      .finally(() => setScheduleLoading(false));
  }, [selectedDoctor?.id]);

  const weekdayKey = (dateString) => {
    if (!dateString) return '';
    const date = new Date(`${dateString}T00:00:00`);
    return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
  };

  const slotsForDate = (dateString) => {
    const day = availabilitySchedule?.[weekdayKey(dateString)];
    if (!day || day.available !== true || !Array.isArray(day.slots)) return [];
    const bookedTimes = new Set(
      bookedSlots
        .filter((slot) => (slot.date || slot.appointment_date) === dateString)
        .map((slot) => String(slot.time || slot.appointment_time || '').slice(0, 5))
    );
    return day.slots
      .map((slot) => ({
        start: String(slot.start || slot.start_time || '').slice(0, 5),
        end: String(slot.end || slot.end_time || '').slice(0, 5),
      }))
      .filter((slot) => slot.start && slot.end)
      .map((slot) => ({ ...slot, booked: bookedTimes.has(slot.start) }));
  };

  const selectedDateSlots = slotsForDate(form.date);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!selectedDoctor) {
      setError('Please select a doctor before booking.');
      return;
    }

    if (!form.date || !form.time || !form.phone) {
      setError('Date, time, and phone number are required.');
      return;
    }

    if (form.date < today) {
      setError('You cannot select a past date. Please choose today or a future date.');
      return;
    }

    const matchingSlot = selectedDateSlots.find((slot) => slot.start === form.time && !slot.booked);
    if (!matchingSlot) {
      setError('Please select an available time from the doctor schedule.');
      return;
    }

    setSubmitting(true);
    try {
      const appointment = await api.bookAppointment({
        doctor_id: selectedDoctor.id,
        doctor_name: selectedDoctor.name,
        appointment_date: form.date,
        appointment_time: form.time,
        phone: form.phone,
        notes: form.notes,
      });

      // Build a concise booking object for the payment page
      const booking = {
        id: appointment.id || appointment.appointment_id || Date.now(),
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        doctorImage: selectedDoctor.photo,
        doctorSpecialization: selectedDoctor.specialization,
        appointmentDate: appointment.appointment_date || appointment.date || form.date,
        appointmentTime: appointment.appointment_time || appointment.time || form.time,
        duration: appointment.duration || 45,
        estimatedFee: (selectedDoctor.fee ?? selectedDoctor.price) || 5.0,
        notes: form.notes,
        raw: appointment,
      };

      // Navigate to payment and pass booking details via location.state
      navigate('/user/payment', { state: { booking } });
    } catch (submitError) {
      setError(submitError.message || 'Unable to confirm booking.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-10">
      <SectionHeader subtitle="Book appointment" title="Reserve your session with a trusted specialist." />
      <div className="grid gap-6 xl:grid-cols-[0.95fr_0.65fr]">
        <div className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-xl backdrop-blur-xl">
          {loading ? (
            <p className="text-gray-600">Loading selected doctor…</p>
          ) : selectedDoctor ? (
            <>
              <div className="space-y-6">
                <div className="rounded-3xl border border-gray-200 bg-white/80 p-6 shadow-sm">
                  <div className="flex items-center gap-4">
                    <img src={selectedDoctor.photo} alt={selectedDoctor.name} className="h-16 w-16 rounded-3xl object-cover shadow-lg" />
                    <div>
                      <p className="text-sm uppercase tracking-[0.35em] text-sky-600">Doctor</p>
                      <h3 className="mt-2 text-2xl font-semibold text-gray-900">{selectedDoctor.name}</h3>
                      <p className="text-sm text-gray-500">{selectedDoctor.specialization}</p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <p className="rounded-3xl bg-slate-50 p-4 text-sm text-gray-700">Experience: {selectedDoctor.experience || 'N/A'}</p>
                    <p className="rounded-3xl bg-slate-50 p-4 text-sm text-gray-700">Consultation: ${selectedDoctor.fee?.toFixed(2) ?? '5.00'}</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-6 lg:grid-cols-2">
                    <label className="space-y-2 text-sm text-gray-700">
                      <span className="block text-gray-900">Appointment Date</span>
                      <input
                        type="date"
                        min={today}
                        value={form.date}
                        onChange={(e) => setForm({ ...form, date: e.target.value, time: '' })}
                        className="w-full rounded-3xl border border-gray-200 bg-white/80 px-4 py-3 text-gray-900 outline-none shadow-sm backdrop-blur-sm"
                        required
                      />
                    </label>
                    <label className="space-y-2 text-sm text-gray-700">
                      <span className="block text-gray-900">Appointment Time</span>
                      <select
                        value={form.time}
                        onChange={(e) => setForm({ ...form, time: e.target.value })}
                        className="w-full rounded-3xl border border-gray-200 bg-white/80 px-4 py-3 text-gray-900 outline-none shadow-sm backdrop-blur-sm"
                        required
                        disabled={!form.date || scheduleLoading || selectedDateSlots.length === 0}
                      >
                        <option value="">
                          {scheduleLoading ? 'Loading schedule...' : form.date ? 'Select available time' : 'Choose a date first'}
                        </option>
                        {selectedDateSlots.map((slot) => (
                          <option key={`${slot.start}-${slot.end}`} value={slot.start} disabled={slot.booked}>
                            {slot.start} - {slot.end}{slot.booked ? ' (Booked)' : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {scheduleError && <p className="text-sm text-red-600">{scheduleError}</p>}
                  {form.date && !scheduleLoading && !scheduleError && selectedDateSlots.length === 0 && (
                    <p className="text-sm text-amber-700">No available schedule slots for this date.</p>
                  )}
                  <label className="space-y-2 text-sm text-gray-700">
                    <span className="block text-gray-900">Phone Number</span>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="Enter phone number"
                      className="w-full rounded-3xl border border-gray-200 bg-white/80 px-4 py-3 text-gray-900 outline-none shadow-sm backdrop-blur-sm"
                      required
                    />
                  </label>
                  <label className="space-y-2 text-sm text-gray-700">
                    <span className="block text-gray-900">Message / Notes</span>
                    <textarea
                      rows="4"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="Any symptoms or details for your doctor"
                      className="w-full rounded-3xl border border-gray-200 bg-white/80 px-4 py-3 text-gray-900 outline-none shadow-sm backdrop-blur-sm"
                    />
                  </label>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 px-6 py-4 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-sky-600 shadow-lg disabled:opacity-60"
                  >
                    {submitting ? 'Booking…' : 'Confirm Booking'}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="space-y-4 rounded-3xl border border-gray-200 bg-white/80 p-8 text-gray-700 shadow-sm">
              <p className="text-lg font-semibold text-gray-900">No doctor available</p>
              <p>Please choose a specialist from the doctor list before booking.</p>
              <Link
                to="/user/doctors"
                className="inline-flex rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 px-5 py-3 text-sm font-semibold text-white shadow-lg"
              >
                Browse doctors
              </Link>
            </div>
          )}
        </div>
        <div className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-xl backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.35em] text-sky-600">Booking overview</p>
          <div className="mt-6 space-y-4 text-gray-600">
            <p>Complete the booking form to confirm your appointment. We will notify the specialist once it is scheduled.</p>
            <div className="rounded-3xl bg-white/80 p-5 shadow-sm">
              <p className="text-sm text-gray-500">Estimated duration</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">45 min</p>
            </div>
            <div className="rounded-3xl bg-white/80 p-5 shadow-sm">
              <p className="text-sm text-gray-500">Booking status</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">Pending confirmation</p>
            </div>
            <div className="rounded-3xl bg-white/80 p-5 shadow-sm">
              <p className="text-sm text-gray-500">Need help?</p>
              <p className="mt-2 text-sm text-gray-700">Reach out to support if you need to reschedule or update your details.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookingPage;
