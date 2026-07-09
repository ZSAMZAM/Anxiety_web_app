import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import SectionHeader from '../../components/SectionHeader.jsx';
import { api } from '../../services/api.js';

function Payment() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get booking data from navigation state or localStorage
  const [booking, setBooking] = useState(null);
  const [form, setForm] = useState({ 
    method: 'wafi', 
    cardNumber: '', 
    expiry: '', 
    cvv: '', 
    phone: '' 
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    // Try to get booking data from navigation state first
    const passedBooking = location.state?.booking;
    if (passedBooking) {
      setBooking(passedBooking);
      localStorage.setItem('pending-booking', JSON.stringify(passedBooking));
      return;
    }

    // Fall back to localStorage if page is refreshed
    const storedBooking = localStorage.getItem('pending-booking');
    if (storedBooking) {
      try {
        const parsed = JSON.parse(storedBooking);
        setBooking(parsed);
      } catch (err) {
        console.error('Failed to parse stored booking:', err);
        setError('Booking information not found. Please create a new booking.');
      }
    } else {
      setError('No booking found. Please create a booking first.');
    }
  }, [location.state]);

  const handlePayment = async (event) => {
    event.preventDefault();
    
    if (!booking) {
      setError('Booking information missing. Please go back and create a booking.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.processPayment({
        amount: booking.estimatedFee,
        payment_method: form.method,
        description: `Doctor appointment with ${booking.doctorName} on ${booking.appointmentDate}`,
        transaction_id: `BOOKING-${booking.id}-${form.method.toUpperCase()}-${Date.now()}`,
        booking_id: booking.id,
      });

      setSuccess(response);

      // Clear localStorage on successful payment
      localStorage.removeItem('pending-booking');

      // Redirect to success page after 2 seconds
      setTimeout(() => {
        navigate('/user/booking/success', { 
          state: { 
            booking: booking,
            payment: response 
          },
          replace: true
        });
      }, 2000);
    } catch (err) {
      console.error('Payment failed:', err);
      setError(err?.response?.data?.error || err.message || 'Payment failed. Please try again.');
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
                  <span className="text-xl">✓</span>
                  <div>
                    <p className="font-semibold">Payment successful!</p>
                    <p className="mt-1">Reference: <span className="font-mono">{success.transactionId}</span></p>
                    <p className="mt-2 text-xs">Redirecting to success page...</p>
                  </div>
                </div>
              </div>
            )}

            {!success && booking && (
              <>
                <div className="mt-6 space-y-4">
                  <label className="space-y-2 text-sm text-gray-700">
                    <span className="block text-gray-900">Payment method</span>
                    <select
                      value={form.method}
                      onChange={(e) => setForm({ ...form, method: e.target.value })}
                      disabled={loading}
                      className="w-full rounded-3xl border border-gray-200 bg-white/80 px-4 py-3 text-gray-900 outline-none shadow-sm backdrop-blur-sm disabled:opacity-50"
                    >
                      <option value="wafi">Wafi</option>
                      <option value="evc_plus">EVC Plus</option>
                      <option value="mobile_money">Mobile Money</option>
                      <option value="card">Credit/Debit Card</option>
                    </select>
                  </label>

                  {form.method === 'card' && (
                    <form onSubmit={handlePayment} className="space-y-6">
                      <label className="space-y-2 text-sm text-gray-700">
                        <span className="block text-gray-900">Card number</span>
                        <input
                          type="text"
                          value={form.cardNumber}
                          onChange={(e) => setForm({ ...form, cardNumber: e.target.value })}
                          placeholder="1234 5678 9012 3456"
                          className="w-full rounded-3xl border border-gray-200 bg-white/80 px-4 py-4 text-gray-900 outline-none shadow-sm backdrop-blur-sm disabled:opacity-50"
                          disabled={loading}
                          required
                        />
                      </label>
                      <div className="grid gap-6 sm:grid-cols-2">
                        <label className="space-y-2 text-sm text-gray-700">
                          <span className="block text-gray-900">Expiry date</span>
                          <input
                            type="text"
                            value={form.expiry}
                            onChange={(e) => setForm({ ...form, expiry: e.target.value })}
                            placeholder="MM/YY"
                            className="w-full rounded-3xl border border-gray-200 bg-white/80 px-4 py-4 text-gray-900 outline-none shadow-sm backdrop-blur-sm disabled:opacity-50"
                            disabled={loading}
                            required
                          />
                        </label>
                        <label className="space-y-2 text-sm text-gray-700">
                          <span className="block text-gray-900">CVV</span>
                          <input
                            type="password"
                            value={form.cvv}
                            onChange={(e) => setForm({ ...form, cvv: e.target.value })}
                            placeholder="123"
                            className="w-full rounded-3xl border border-gray-200 bg-white/80 px-4 py-4 text-gray-900 outline-none shadow-sm backdrop-blur-sm disabled:opacity-50"
                            disabled={loading}
                            required
                          />
                        </label>
                      </div>
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
                  )}

                  {(form.method === 'wafi' || form.method === 'evc_plus' || form.method === 'mobile_money') && (
                    <form onSubmit={handlePayment} className="space-y-6">
                      <label className="space-y-2 text-sm text-gray-700">
                        <span className="block text-gray-900">Phone number</span>
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          placeholder="+252 61 123 4567"
                          className="w-full rounded-3xl border border-gray-200 bg-white/80 px-4 py-4 text-gray-900 outline-none shadow-sm backdrop-blur-sm disabled:opacity-50"
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
                  )}
                </div>
              </>
            )}
          </div>

          {/* Booking Summary Sidebar */}
          <div className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-xl backdrop-blur-xl">
            <p className="text-sm uppercase tracking-[0.35em] text-sky-600">Booking summary</p>
            
            {booking && (
              <div className="mt-6 space-y-5 rounded-[2rem] bg-white/80 p-6 shadow-sm">
                {booking.doctorImage && (
                  <div className="flex items-center gap-4">
                    <img 
                      src={booking.doctorImage} 
                      alt={booking.doctorName}
                      className="h-16 w-16 rounded-3xl object-cover shadow-lg"
                    />
                    <div>
                      <p className="font-semibold text-gray-900">{booking.doctorName}</p>
                      <p className="text-xs text-gray-500">{booking.doctorSpecialization}</p>
                    </div>
                  </div>
                )}
                
                <div className="space-y-3 border-t border-gray-200 pt-4">
                  <div className="flex justify-between text-sm text-gray-600">
                    <p>Date</p>
                    <p className="font-medium text-gray-900">{new Date(booking.appointmentDate).toLocaleDateString()}</p>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <p>Time</p>
                    <p className="font-medium text-gray-900">{booking.appointmentTime}</p>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <p>Duration</p>
                    <p className="font-medium text-gray-900">{booking.duration} min</p>
                  </div>
                </div>

                <div className="rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 p-4 text-white shadow-lg">
                  <div className="flex justify-between items-center">
                    <p className="text-sm">Total amount</p>
                    <p className="text-2xl font-semibold">${booking.estimatedFee.toFixed(2)}</p>
                  </div>
                </div>

                {booking.notes && (
                  <div className="rounded-3xl bg-gray-50 p-4">
                    <p className="text-xs uppercase tracking-wider text-gray-500">Notes</p>
                    <p className="mt-2 text-sm text-gray-700">{booking.notes}</p>
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
