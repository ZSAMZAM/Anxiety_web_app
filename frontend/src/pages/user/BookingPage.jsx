import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Avatar from '../../components/Avatar.jsx';
import SectionHeader from '../../components/SectionHeader.jsx';
import { api } from '../../services/api.js';

function BookingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { doctorId } = useParams();
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(location.state?.doctor || null);
  const [loading, setLoading] = useState(true);
  const [assessmentChecked, setAssessmentChecked] = useState(false);
  const [canBookTherapist, setCanBookTherapist] = useState(false);
  const [bookingMessage, setBookingMessage] = useState('Please complete your mental health assessment before booking a therapist.');
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [scheduleError, setScheduleError] = useState('');
  const [availabilitySchedule, setAvailabilitySchedule] = useState({});
  const [activeAvailabilityRules, setActiveAvailabilityRules] = useState([]);
  const [calendarSlots, setCalendarSlots] = useState({});
  const [bookedSlots, setBookedSlots] = useState([]);
  const [form, setForm] = useState({ date: '', time: '', phone: '', notes: '' });
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [timeSlots, setTimeSlots] = useState([]);
  const today = new Date().toISOString().split('T')[0];
  const maxBookingDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  useEffect(() => {
    api.getAssessmentBookingState()
      .then((state) => {
        setCanBookTherapist(state.canBookTherapist);
        setBookingMessage(state.bookingMessage);
        if (!state.canBookTherapist) {
          setError(state.bookingMessage);
          navigate(state.hasAssessment ? '/user/history' : '/user/assessment', {
            replace: true,
            state: { message: state.bookingMessage },
          });
        }
      })
      .catch(() => {
        setCanBookTherapist(false);
        setError('Unable to verify your assessment status. Please try again.');
      })
      .finally(() => setAssessmentChecked(true));
  }, [navigate]);

  const monthOptions = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const normalizeDays = (days) => {
    if (Array.isArray(days)) return days;
    return String(days || '')
      .split(',')
      .map((day) => day.trim())
      .filter(Boolean);
  };

  const dayName = (day) => String(day || '').charAt(0).toUpperCase() + String(day || '').slice(1);

  const ordinal = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return value;
    const suffix = number % 100 >= 11 && number % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][number % 10] || 'th';
    return `${number}${suffix}`;
  };

  const formatDate = (value) => {
    if (!value) return 'No end date';
    return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (value) => {
    if (!value) return '--';
    const [hour, minute] = String(value).slice(0, 5).split(':').map(Number);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
    return new Date(2000, 0, 1, hour, minute).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatTimeRange = (start, end) => `${formatTime(start)} - ${formatTime(end)}`;

  const recurrenceLabel = (rule) => {
    const type = String(rule.recurrence_type || 'weekly').toLowerCase();
    const metadata = rule.recurrence_metadata || {};
    const days = normalizeDays(rule.recurrence_days || rule.day_of_week);
    const startDate = String(rule.start_date || '');
    if (type === 'one_time' || type === 'specific_date' || type === 'once') return `One Time: ${formatDate(rule.start_date)}`;
    if (type === 'monthly') return `Monthly: Every ${ordinal(metadata.day_of_month || startDate.slice(8, 10))} of the month`;
    if (type === 'yearly') {
      const month = monthOptions[Number(metadata.month || startDate.slice(5, 7)) - 1] || 'Selected month';
      return `Yearly: Every ${month} ${Number(metadata.day || startDate.slice(8, 10))}`;
    }
    if (days.length) return `${type === 'custom_days' ? 'Custom Days' : 'Weekly'}: Every ${days.map(dayName).join(', ')}`;
    return 'Weekly availability';
  };

  const hasPassed = (dateString, timeString) => {
    if (!dateString || !timeString) return false;
    return new Date(`${dateString}T${timeString}:00`) <= new Date();
  };

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
        const rules = doctor.availability_rules || data.availability_rules || [];
        setSelectedDoctor((current) => ({ ...(current || {}), ...doctor }));
        setAvailabilitySchedule(doctor.availability_schedule || doctor.availabilitySchedule || data.availability_schedule || {});
        setActiveAvailabilityRules(Array.isArray(rules) ? rules : []);
        setCalendarSlots(doctor.calendar_slots || data.calendar_slots || {});
        setBookedSlots(Array.isArray(data.booked_slots) ? data.booked_slots : []);
      })
      .catch((err) => {
        setAvailabilitySchedule({});
        setActiveAvailabilityRules([]);
        setCalendarSlots({});
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
    const calendarDay = calendarSlots?.[dateString];
    if (calendarDay) {
      if (calendarDay.blocked || calendarDay.available === false) return [];
      const slots = (calendarDay.slots || [])
        .map((slot) => ({
          start: String(slot.start || slot.start_time || '').slice(0, 5),
          end: String(slot.end || slot.end_time || '').slice(0, 5),
          booked: Boolean(slot.booked) || slot.status === 'booked',
        }))
        .filter((slot) => slot.start && slot.end);
      return slots;
    }
    const day = availabilitySchedule?.[weekdayKey(dateString)];
    if (!day || day.available !== true || !Array.isArray(day.slots)) {
      return [];
    }
    const bookedTimes = new Set(
      bookedSlots
        .filter((slot) => (slot.date || slot.appointment_date) === dateString)
        .map((slot) => String(slot.time || slot.appointment_time || '').slice(0, 5))
    );
    const slots = day.slots
      .map((slot) => ({
        start: String(slot.start || slot.start_time || '').slice(0, 5),
        end: String(slot.end || slot.end_time || '').slice(0, 5),
      }))
      .filter((slot) => slot.start && slot.end)
      .map((slot) => ({ ...slot, booked: bookedTimes.has(slot.start) }));
    return slots;
  };

  const selectedDateSlots = slotsForDate(form.date);
  const consultationFee = Number(selectedDoctor?.cons_fee ?? selectedDoctor?.consultation_fee ?? selectedDoctor?.fee ?? 0);

  // Convert time range slots into individual 1-hour slots (e.g., 09:00-17:00 becomes 09:00, 10:00, 11:00...)
  const generateHourlySlots = (slots, dateString = form.date) => {
    const hourlySlots = [];
    slots.forEach((slot) => {
      const [startHour, startMin] = slot.start.split(':').map(Number);
      const [endHour, endMin] = slot.end.split(':').map(Number);
      
      for (let h = startHour; h < endHour; h++) {
        const slotStart = `${String(h).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
        const slotEnd = `${String(h + 1).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
        hourlySlots.push({
          start: slotStart,
          end: slotEnd,
          display: formatTimeRange(slotStart, slotEnd),
          booked: slot.booked,
          expired: hasPassed(dateString, slotEnd),
        });
      }
    });
    return hourlySlots;
  };

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setForm({ ...form, date: newDate, time: '' });
    // Generate hourly slots when date changes
    const slots = slotsForDate(newDate);
    const hourly = generateHourlySlots(slots, newDate);
    setTimeSlots(hourly);
  };

  useEffect(() => {
    if (!form.date) {
      setTimeSlots([]);
      return;
    }
    setTimeSlots(generateHourlySlots(slotsForDate(form.date), form.date));
  }, [form.date, availabilitySchedule, calendarSlots, bookedSlots]);

  const handleOpenTimeModal = () => {
    if (!form.date) {
      setError('Please select a date first.');
      return;
    }
    setShowTimeModal(true);
  };

  const handleSelectTime = (slot) => {
    if (slot.booked || slot.expired) {
      setError(slot.expired ? 'This appointment time has already passed.' : 'This time slot is already booked. Please choose a different time.');
      return;
    }
    setForm({ ...form, time: slot.start });
    setShowTimeModal(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!selectedDoctor) {
      setError('Please select a doctor before booking.');
      return;
    }

    if (!canBookTherapist) {
      setError(bookingMessage);
      navigate('/user/assessment', {
        state: { message: bookingMessage },
      });
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

    if (form.date > maxBookingDate) {
      setError('Appointments can only be scheduled within the next 12 months.');
      return;
    }

    const matchingSlot = generateHourlySlots(selectedDateSlots, form.date).find((slot) => slot.start === form.time && !slot.booked && !slot.expired);
    if (!matchingSlot) {
      setError(hasPassed(form.date, form.time) ? 'This appointment time has already passed.' : 'Please select an available time from the doctor schedule.');
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
        estimatedFee: consultationFee,
        phone: appointment.phone || form.phone,
        paymentPhone: appointment.phone || form.phone,
        notes: form.notes,
        raw: appointment,
      };

      // Navigate to payment and pass booking details via location.state
      navigate('/user/payment', { state: { booking } });
    } catch (submitError) {
      setError(submitError.message || 'Unable to confirm booking.');
      if (submitError.message === 'Please complete your mental health assessment before booking a therapist.') {
        navigate('/user/assessment', {
          state: { message: submitError.message },
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-10">
      <SectionHeader subtitle="Book appointment" title="Reserve your session with a trusted specialist." />
      {!assessmentChecked && (
        <div className="rounded-[2rem] border border-white/20 bg-white/10 p-8 text-gray-600 shadow-xl backdrop-blur-xl">
          Checking assessment status...
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-[0.95fr_0.65fr]">
        <div className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-xl backdrop-blur-xl">
          {loading ? (
            <p className="text-gray-600">Loading selected doctorâ€¦</p>
          ) : selectedDoctor ? (
            <>
              <div className="space-y-6">
                <div className="rounded-3xl border border-gray-200 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/80">
                  <div className="flex items-center gap-4">
                    <Avatar
                      src={selectedDoctor.photo || selectedDoctor.image || selectedDoctor.avatar}
                      name={selectedDoctor.name}
                      role="doctor"
                      size="xl"
                      className="shadow-lg"
                    />
                    <div>
                      <p className="text-sm uppercase tracking-[0.35em] text-sky-600">Doctor</p>
                      <h3 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-slate-100">{selectedDoctor.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-slate-400">{selectedDoctor.specialization}</p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <p className="rounded-3xl bg-slate-50 p-4 text-sm text-gray-700 dark:bg-slate-950/70 dark:text-slate-200">Experience: {selectedDoctor.experience || 'N/A'}</p>
                    <p className="rounded-3xl bg-slate-50 p-4 text-sm text-gray-700 dark:bg-slate-950/70 dark:text-slate-200">Consultation: ${consultationFee.toFixed(2)} USD</p>
                  </div>
                </div>

                <div className="rounded-3xl border border-gray-200 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/80">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.28em] text-sky-600">Doctor schedule</p>
                      <h3 className="mt-2 text-xl font-semibold text-gray-900 dark:text-slate-100">Active Availability Rules</h3>
                    </div>
                    {scheduleLoading && <span className="text-sm font-semibold text-sky-600">Loading...</span>}
                  </div>
                  <div className="mt-5 space-y-3">
                    {!scheduleLoading && activeAvailabilityRules.length === 0 && (
                      <p className="rounded-3xl bg-slate-50 p-4 text-sm text-gray-700 dark:bg-slate-950/70 dark:text-slate-200">
                        No active availability rules are published for this doctor yet.
                      </p>
                    )}
                    {activeAvailabilityRules.map((rule) => (
                      <div key={rule.id} className="rounded-3xl bg-slate-50 p-4 dark:bg-slate-950/70">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-base font-semibold text-gray-900 dark:text-slate-100">{recurrenceLabel(rule)}</p>
                            <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-slate-100">
                              {formatTime(rule.start_time)} - {formatTime(rule.end_time)}
                            </p>
                            <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-200">
                              {rule.appointment_duration_minutes || rule.duration_minutes || 10} minute appointment slots
                            </p>
                            <p className="text-sm text-gray-500 dark:text-slate-400">
                              {formatDate(rule.start_date)} to {formatDate(rule.end_date)}
                            </p>
                          </div>
                          <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/30">
                            Active
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-6 lg:grid-cols-2">
                    <label className="space-y-2 text-sm text-gray-700 dark:text-slate-300">
                      <span className="block text-gray-900 dark:text-slate-100">Appointment Date</span>
                      <input
                        type="date"
                        min={today}
                        max={maxBookingDate}
                        value={form.date}
                        onChange={handleDateChange}
                        className="w-full rounded-3xl border border-gray-200 bg-white/80 px-4 py-3 text-gray-900 outline-none shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-100"
                        required
                      />
                    </label>
                    <label className="space-y-2 text-sm text-gray-700 dark:text-slate-300">
                      <span className="block text-gray-900 dark:text-slate-100">Appointment Time</span>
                      <button
                        type="button"
                        onClick={handleOpenTimeModal}
                        className="w-full rounded-3xl border border-gray-200 bg-white/80 px-4 py-3 text-left text-gray-900 outline-none shadow-sm backdrop-blur-sm transition hover:bg-white/90 disabled:opacity-50 dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-100 dark:hover:bg-slate-900"
                        disabled={!form.date || scheduleLoading || timeSlots.length === 0}
                        required
                      >
                        {scheduleLoading ? 'Loading schedule...' : form.time ? formatTime(form.time) : form.date ? 'Select available time' : 'Choose a date first'}
                      </button>
                    </label>
                  </div>
                  {scheduleError && <p className="text-sm text-red-600">{scheduleError}</p>}
                  {form.date && !scheduleLoading && !scheduleError && selectedDateSlots.length === 0 && (
                    <p className="text-sm text-amber-700">No available schedule slots for this date.</p>
                  )}
                  <label className="space-y-2 text-sm text-gray-700 dark:text-slate-300">
                    <span className="block text-gray-900 dark:text-slate-100">Phone Number</span>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="Enter phone number"
                      className="w-full rounded-3xl border border-gray-200 bg-white/80 px-4 py-3 text-gray-900 outline-none shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-100"
                      required
                    />
                  </label>
                  <label className="space-y-2 text-sm text-gray-700 dark:text-slate-300">
                    <span className="block text-gray-900 dark:text-slate-100">Message / Notes</span>
                    <textarea
                      rows="4"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="Any symptoms or details for your doctor"
                      className="w-full rounded-3xl border border-gray-200 bg-white/80 px-4 py-3 text-gray-900 outline-none shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-100"
                    />
                  </label>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 px-6 py-4 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-sky-600 shadow-lg disabled:opacity-60"
                  >
                    {submitting ? 'Bookingâ€¦' : 'Confirm Booking'}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="space-y-4 rounded-3xl border border-gray-200 bg-white/80 p-8 text-gray-700 shadow-sm dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-300">
              <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">No doctor available</p>
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
          <div className="mt-6 space-y-4 text-gray-600 dark:text-slate-300">
            <p>Complete the booking form to confirm your appointment. We will notify the specialist once it is scheduled.</p>
            <div className="rounded-3xl bg-white/80 p-5 shadow-sm dark:bg-slate-900/80">
              <p className="text-sm text-gray-500 dark:text-slate-400">Estimated duration</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-slate-100">45 min</p>
            </div>
            <div className="rounded-3xl bg-white/80 p-5 shadow-sm dark:bg-slate-900/80">
              <p className="text-sm text-gray-500 dark:text-slate-400">Booking status</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-slate-100">Pending confirmation</p>
            </div>
            <div className="rounded-3xl bg-white/80 p-5 shadow-sm dark:bg-slate-900/80">
              <p className="text-sm text-gray-500 dark:text-slate-400">Consultation fee</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-slate-100">${consultationFee.toFixed(2)} USD</p>
            </div>
            <div className="rounded-3xl bg-white/80 p-5 shadow-sm dark:bg-slate-900/80">
              <p className="text-sm text-gray-500 dark:text-slate-400">Need help?</p>
              <p className="mt-2 text-sm text-gray-700 dark:text-slate-300">Reach out to support if you need to reschedule or update your details.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Time Slot Selection Modal */}
      {showTimeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[2rem] border border-white/20 bg-white p-8 shadow-2xl">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">Select Time</h2>
              <p className="mt-2 text-sm text-gray-600">Choose your preferred appointment time</p>
            </div>

            {timeSlots.length === 0 ? (
              <p className="py-8 text-center text-gray-600">No available time slots for this date.</p>
            ) : (
              <div className="space-y-2">
                {timeSlots.map((slot) => (
                  <button
                    key={slot.start}
                    onClick={() => handleSelectTime(slot)}
                    disabled={slot.booked || slot.expired}
                    className={`w-full rounded-2xl border-2 p-4 text-left transition ${
                      slot.booked || slot.expired
                        ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                        : form.time === slot.start
                        ? 'border-cyan-500 bg-cyan-50 text-cyan-900 font-semibold'
                        : 'border-gray-200 bg-white text-gray-900 hover:border-cyan-300 hover:bg-cyan-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{slot.display}</span>
                      {slot.booked && <span className="text-xs font-semibold text-gray-500">BOOKED</span>}
                      {!slot.booked && slot.expired && <span className="text-xs font-semibold text-amber-600">PASSED</span>}
                      {!slot.booked && !slot.expired && form.time === slot.start && <span className="text-lg">✓</span>}
                      {!slot.booked && !slot.expired && form.time !== slot.start && <span className="text-sm text-gray-400">Available</span>}
                    </div>
                    {slot.expired && <p className="mt-2 text-xs text-amber-700">This appointment time has already passed.</p>}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowTimeModal(false)}
                className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => setShowTimeModal(false)}
                disabled={!form.time}
                className="flex-1 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-sky-600 disabled:opacity-50"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BookingPage;

