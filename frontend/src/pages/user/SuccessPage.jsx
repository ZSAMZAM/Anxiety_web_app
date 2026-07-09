import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import SectionHeader from '../../components/SectionHeader.jsx';

function SuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [payment, setPayment] = useState(null);

  useEffect(() => {
    // Get booking and payment data from navigation state
    const passedBooking = location.state?.booking;
    const passedPayment = location.state?.payment;

    if (passedBooking) {
      setBooking(passedBooking);
    } else {
      // Try to get from localStorage as fallback
      const storedBooking = localStorage.getItem('pending-booking');
      if (storedBooking) {
        try {
          setBooking(JSON.parse(storedBooking));
        } catch (err) {
          console.error('Failed to parse stored booking:', err);
        }
      }
    }

    if (passedPayment) {
      setPayment(passedPayment);
    }
  }, [location.state]);

  if (!booking) {
    return (
      <div className="space-y-10">
        <SectionHeader subtitle="No booking" title="Booking information not found." />
        <div className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-xl backdrop-blur-xl text-center">
          <p className="text-gray-600 mb-6">It looks like you don't have a booking in progress.</p>
          <button
            onClick={() => navigate('/user/doctors')}
            className="inline-flex items-center justify-center rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 px-6 py-4 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-sky-600 shadow-lg"
          >
            Browse Doctors
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <SectionHeader 
        subtitle="Payment confirmed" 
        title="Your appointment has been booked and paid!" 
      />
      
      {/* Success Banner */}
      <div className="rounded-[2rem] border border-green-200 bg-green-50 p-8 shadow-xl">
        <div className="flex items-start gap-4">
          <span className="text-4xl">✓</span>
          <div>
            <h3 className="text-xl font-semibold text-green-900">Booking confirmed</h3>
            <p className="mt-2 text-green-800">
              Your appointment with <span className="font-semibold">{booking.doctorName}</span> on{' '}
              <span className="font-semibold">{booking?.appointmentDate ? new Date(booking.appointmentDate).toLocaleDateString() : '—'}</span> at{' '}
              <span className="font-semibold">{booking.appointmentTime || '—'}</span> has been confirmed.
            </p>
            {payment && (
              <p className="mt-2 text-sm text-green-700">
                Payment reference: <span className="font-mono text-xs">{payment.transactionId}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Booking Details */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Doctor Card */}
        <div className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-xl backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.35em] text-sky-600">Your doctor</p>
          <div className="mt-6 flex items-center gap-4">
            {booking.doctorImage && (
              <img 
                src={booking.doctorImage} 
                alt={booking.doctorName}
                className="h-20 w-20 rounded-3xl object-cover shadow-lg"
              />
            )}
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{booking.doctorName}</h3>
              <p className="text-sm text-gray-600 mt-1">{booking.doctorSpecialization}</p>
            </div>
          </div>
        </div>

        {/* Appointment Details Card */}
        <div className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-xl backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.35em] text-sky-600">Appointment details</p>
          <div className="mt-6 space-y-4 text-gray-700">
            <div className="flex justify-between">
              <span className="text-gray-600">Date</span>
              <span className="font-semibold text-gray-900">{new Date(booking.appointmentDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Time</span>
              <span className="font-semibold text-gray-900">{booking.appointmentTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Duration</span>
              <span className="font-semibold text-gray-900">{booking.duration} minutes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Summary */}
      {payment && (
        <div className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-xl backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.35em] text-sky-600">Payment summary</p>
          <div className="mt-6 rounded-3xl bg-white/80 p-6 shadow-sm space-y-4">
              <div className="flex justify-between text-gray-700">
              <span>Appointment fee</span>
              <span className="font-semibold text-gray-900">${((booking?.estimatedFee ?? 0)).toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-200 pt-4 flex justify-between">
              <span className="font-semibold text-gray-900">Total paid</span>
              <span className="text-xl font-semibold bg-gradient-to-r from-cyan-600 to-sky-600 bg-clip-text text-transparent">${((booking?.estimatedFee ?? 0)).toFixed(2)}</span>
            </div>
            <div className="mt-4 rounded-2xl bg-blue-50 p-3">
              <p className="text-xs text-blue-700 font-mono">Transaction ID: {payment.transactionId}</p>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {booking.notes && (
        <div className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-xl backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.35em] text-sky-600">Your notes</p>
          <div className="mt-4 rounded-3xl bg-white/80 p-6 shadow-sm">
            <p className="text-gray-700">{booking.notes}</p>
          </div>
        </div>
      )}

      {/* Next Steps */}
      <div className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-xl backdrop-blur-xl">
        <p className="text-sm uppercase tracking-[0.35em] text-sky-600">What happens next?</p>
        <div className="mt-6 space-y-4">
          <div className="flex gap-4">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500 text-white font-semibold">1</div>
            <div>
              <p className="font-semibold text-gray-900">Confirmation</p>
              <p className="text-sm text-gray-600">Your doctor will confirm the appointment within 24 hours.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500 text-white font-semibold">2</div>
            <div>
              <p className="font-semibold text-gray-900">Preparation</p>
              <p className="text-sm text-gray-600">Check your email for any pre-appointment information.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500 text-white font-semibold">3</div>
            <div>
              <p className="font-semibold text-gray-900">Connect</p>
              <p className="text-sm text-gray-600">Join the session at the scheduled time via video call.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <button
          type="button"
          onClick={() => navigate('/user/history')}
          className="inline-flex flex-1 items-center justify-center rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 px-6 py-4 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-sky-600 shadow-lg"
        >
          View appointment history
        </button>
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem('pending-booking');
            navigate('/user/dashboard');
          }}
          className="inline-flex flex-1 items-center justify-center rounded-3xl border border-gray-200 bg-white px-6 py-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 shadow-sm"
        >
          Return to dashboard
        </button>
      </div>
    </div>
  );
}

export default SuccessPage;
