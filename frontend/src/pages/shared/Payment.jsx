import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Avatar from '../../components/Avatar.jsx';
import SectionHeader from '../../components/SectionHeader.jsx';
import { api } from '../../services/api.js';

function Payment() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get booking data from navigation state or localStorage
  const [booking, setBooking] = useState(null);
  const [form, setForm] = useState({ 
    method: 'hormuud', 
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [pendingPayment, setPendingPayment] = useState(null);
  const appointmentPaid = String(booking?.paymentStatus || booking?.payment_status || '').toLowerCase() === 'paid';

  const applyBooking = (nextBooking) => {
    setBooking(nextBooking);
    const nextPhone = nextBooking?.paymentPhone || nextBooking?.phone || nextBooking?.raw?.phone || '';
    if (nextPhone) {
      setForm((current) => ({ ...current, phone: current.phone || nextPhone }));
    }
  };

  useEffect(() => {
    // Try to get booking data from navigation state first
    const passedBooking = location.state?.booking;
    if (passedBooking) {
      applyBooking(passedBooking);
      localStorage.setItem('pending-booking', JSON.stringify(passedBooking));
      return;
    }

    // Fall back to localStorage if page is refreshed
    const storedBooking = localStorage.getItem('pending-booking');
    if (storedBooking) {
      try {
        const parsed = JSON.parse(storedBooking);
        applyBooking(parsed);
      } catch (err) {
        console.error('Failed to parse stored booking:', err);
        setError('Booking information not found. Please create a new booking.');
      }
    } else {
      setError('No booking found. Please create a booking first.');
    }
  }, [location.state]);

  const completePayment = (payment) => {
    setSuccess(payment);
    setPendingPayment(null);
    localStorage.removeItem('pending-booking');
    navigate('/user/booking/success', { state: { booking, payment }, replace: true });
  };

  const checkPaymentStatus = async (payment = pendingPayment) => {
    if (!payment?.id) return;
    setCheckingStatus(true);
    setError(null);
    try {
      const refreshedPayment = await api.getPaymentStatus(payment.id);
      const status = String(refreshedPayment.status || '').toLowerCase();
      if (status === 'completed' || status === 'paid') {
        completePayment(refreshedPayment);
        return;
      }
      if (status === 'failed') {
        setPendingPayment(null);
        setError(refreshedPayment.message || refreshedPayment.failureReason || 'Payment failed. Please try again.');
        return;
      }
      setPendingPayment(refreshedPayment);
    } catch (err) {
      setError(err.message || 'Unable to check payment status.');
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    if (!pendingPayment?.id || success) return undefined;
    const intervalId = window.setInterval(() => {
      checkPaymentStatus(pendingPayment);
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [pendingPayment?.id, success]);

  useEffect(() => {
    if (!loading && !pendingPayment) return undefined;
    const preventRefresh = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', preventRefresh);
    return () => window.removeEventListener('beforeunload', preventRefresh);
  }, [loading, pendingPayment]);

  const handlePayment = async (event) => {
    event.preventDefault();
    
    if (!booking) {
      setError('Booking information missing. Please go back and create a booking.');
      return;
    }
    if (!form.phone.trim()) {
      setError('Merchant phone number is required for payment processing.');
      return;
    }
    const paidStatus = String(booking.paymentStatus || booking.payment_status || '').toLowerCase();
    if (paidStatus === 'paid') {
      setError('This appointment has already been paid.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.processPayment({
        amount: booking.estimatedFee,
        payment_method: form.method,
        payment_phone: form.phone,
        description: `Doctor appointment with ${booking.doctorName} on ${booking.appointmentDate}`,
        booking_id: booking.id,
      });

      if (String(response.status || '').toLowerCase() === 'failed') {
        setError(response.message || response.failureReason || 'Payment failed. Please try again.');
        setLoading(false);
        return;
      }

      if (['completed', 'paid'].includes(String(response.status || '').toLowerCase())) {
        completePayment(response);
        return;
      }

      setPendingPayment(response);
      setLoading(false);
    } catch (err) {
      console.error('Payment failed:', err);
      setError(err?.response?.data?.message || err?.response?.data?.error || err.message || 'Payment failed. Please try again.');
      setLoading(false);
    }
  };

  if (error && !booking) {
    return (
      <div className="space-y-10">
        <SectionHeader subtitle="Error" title="Unable to process payment." />
        <div className="rounded-[2rem] border border-red-200 bg-red-50 p-8 text-center shadow-xl">
          <p className="text-red-800 mb-6">{error}</p>
          <button
            onClick={() => navigate('/user/booking', { replace: true })}
            className="inline-flex items-center justify-center rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 px-6 py-4 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-sky-600 shadow-lg"
          >
            Create New Booking
          </button>
        </div>
      </div>
    );
  }

  return (
      <div className="space-y-10">
        <SectionHeader subtitle="Checkout" title="Complete payment for your appointment." />
        <div className="grid gap-6 xl:grid-cols-[0.9fr_0.7fr]">
          <div className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-xl backdrop-blur-xl">
            <p className="text-sm uppercase tracking-[0.35em] text-sky-600">Payment details</p>
            
            {error && (
              <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm">
                <p className="font-medium">Error</p>
                <p className="mt-1">{error}</p>
              </div>
            )}

            {success && (
              <div className="mt-6 rounded-3xl border border-green-200 bg-green-50 p-5 text-sm text-green-800 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✅</span>
                  <div>
                    <p className="font-semibold">Payment Successful</p>
                    <p className="mt-1">Transaction ID: <span className="font-mono">{success.transactionId}</span></p>
                    <p className="mt-1">Amount paid: ${Number(success.amount || booking?.estimatedFee || 0).toFixed(2)} {success.currency || 'USD'}</p>
                    <p className="mt-1 font-semibold">Appointment Confirmed</p>
                    <button
                      type="button"
                      onClick={() => navigate('/user/booking/success', { state: { booking, payment: success }, replace: true })}
                      className="mt-4 rounded-2xl bg-green-600 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              </div>
            )}

            {pendingPayment && !success && (
              <div className="mt-6 rounded-3xl border border-sky-200 bg-sky-50 p-5 text-sm text-sky-900 shadow-sm">
                <p className="font-semibold">Confirm payment on your phone</p>
                <p className="mt-1">
                  Hormuud/Waafi should send a confirmation prompt to <span className="font-semibold">{form.phone}</span>.
                  Approve it, then wait here while we check the merchant status.
                </p>
                <p className="mt-2 text-xs">
                  Reference: <span className="font-mono">{pendingPayment.transactionId}</span>
                </p>
                <button
                  type="button"
                  onClick={() => checkPaymentStatus(pendingPayment)}
                  disabled={checkingStatus}
                  className="mt-4 inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-500 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-cyan-600 hover:to-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {checkingStatus ? 'Checking...' : 'Check payment status'}
                </button>
              </div>
            )}

            {appointmentPaid && !success && (
              <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-900 shadow-sm">
                This appointment has already been paid.
              </div>
            )}

            {!success && !pendingPayment && booking && !appointmentPaid && (
              <>
                <div className="mt-6 space-y-4">
                  <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    <span className="block text-slate-900 dark:text-slate-50">Payment method</span>
                    <select
                      value={form.method}
                      onChange={(e) => setForm({ ...form, method: e.target.value })}
                      disabled={loading}
                      className="w-full rounded-3xl border border-gray-200 bg-white/90 px-4 py-3 text-slate-900 outline-none shadow-sm backdrop-blur-sm disabled:opacity-50 dark:border-white/10 dark:bg-slate-950/55 dark:text-slate-50"
                    >
                      <option value="hormuud">Hormuud Merchant</option>
                      <option value="evc_plus">Hormuud EVC Plus</option>
                      <option value="wafi">Waafi</option>
                    </select>
                  </label>

                  <form onSubmit={handlePayment} className="space-y-6">
                      <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                        <span className="block text-slate-900 dark:text-slate-50">Hormuud phone number</span>
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          placeholder="+252 61 123 4567"
                          className="w-full rounded-3xl border border-gray-200 bg-white/90 px-4 py-4 text-slate-900 outline-none shadow-sm backdrop-blur-sm disabled:opacity-50 dark:border-white/10 dark:bg-slate-950/55 dark:text-slate-50"
                          disabled={loading}
                          required
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
                          `Pay $${booking.estimatedFee.toFixed(2)}`
                        )}
                      </button>
                    </form>
                </div>
              </>
            )}
          </div>

          {/* Booking Summary Sidebar */}
          <div className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-xl backdrop-blur-xl">
            <p className="text-sm uppercase tracking-[0.35em] text-sky-600">Booking summary</p>
            
            {booking && (
              <div className="mt-6 space-y-5 rounded-[2rem] border border-slate-200 bg-white/90 p-6 text-slate-900 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/35 dark:text-slate-50">
                {booking.doctorName && (
                  <div className="flex items-center gap-4">
                    <Avatar
                      src={booking.doctorImage}
                      name={booking.doctorName}
                      role="doctor"
                      size="xl"
                      className="shadow-lg"
                    />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-50">{booking.doctorName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-300">{booking.doctorSpecialization}</p>
                    </div>
                  </div>
                )}
                
                <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-white/10">
                  <div className="flex justify-between text-sm font-medium text-slate-500 dark:text-slate-300">
                    <p>Date</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-50">{new Date(booking.appointmentDate).toLocaleDateString()}</p>
                  </div>
                  <div className="flex justify-between text-sm font-medium text-slate-500 dark:text-slate-300">
                    <p>Time</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-50">{booking.appointmentTime}</p>
                  </div>
                  <div className="flex justify-between text-sm font-medium text-slate-500 dark:text-slate-300">
                    <p>Duration</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-50">{booking.duration} min</p>
                  </div>
                  <div className="flex justify-between gap-4 text-sm font-medium text-slate-500 dark:text-slate-300">
                    <p>Payment phone</p>
                    <p className="break-all text-right font-semibold text-slate-900 dark:text-slate-50">{form.phone || booking.phone || 'Not provided'}</p>
                  </div>
                </div>

                <div className="rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 p-4 text-white shadow-lg">
                  <div className="flex justify-between items-center">
                    <p className="text-sm">Total amount</p>
                    <p className="text-2xl font-semibold">${booking.estimatedFee.toFixed(2)}</p>
                  </div>
                </div>

                {booking.notes && (
                  <div className="rounded-3xl bg-slate-50 p-4 dark:bg-white/5">
                    <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-300">Notes</p>
                    <p className="mt-2 text-sm text-slate-700 dark:text-slate-100">{booking.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
  );
}

export default Payment;

