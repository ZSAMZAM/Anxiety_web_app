import { useLocation, useNavigate } from 'react-router-dom';
import SectionHeader from '../../components/SectionHeader.jsx';
import { api } from '../../services/api.js';

function SuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const booking = location.state?.booking || null;
  const payment = location.state?.payment || null;

  if (!booking || !payment) {
    return (
      <div className="space-y-10">
        <SectionHeader subtitle="Payment" title="Payment details are not available." />
        <div className="rounded-[2rem] border border-white/20 bg-white/10 p-8 text-center shadow-xl backdrop-blur-xl">
          <p className="mb-6 text-gray-600">Open your appointment list to review confirmed bookings.</p>
          <button
            type="button"
            onClick={() => navigate('/user/appointments')}
            className="rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 px-6 py-4 text-sm font-semibold text-white shadow-lg"
          >
            View Appointment
          </button>
        </div>
      </div>
    );
  }

  const paymentId = payment.id || payment.payment_id;
  const transactionReference = payment.referenceId || payment.reference_id || payment.transactionId || payment.transaction_id;
  const bookingId = booking.id || payment.bookingId || payment.appointmentId;
  const amount = Number(payment.amount || booking.estimatedFee || booking.consultation_fee || 0);
  const paymentTime = payment.paidAt || payment.paid_at || payment.paymentTime || payment.created_at || new Date().toISOString();
  const receiptUrl = api.getPaymentReceiptUrl(paymentId);

  const rows = [
    ['Payment ID', paymentId],
    ['Transaction Reference', transactionReference],
    ['Booking ID', bookingId],
    ['Doctor Name', booking.doctorName || booking.doctor_name],
    ['Appointment Date', booking.appointmentDate || booking.appointment_date],
    ['Appointment Time', booking.appointmentTime || booking.appointment_time],
    ['Consultation Fee', `$${amount.toFixed(2)} ${payment.currency || 'USD'}`],
    ['Payment Method', payment.paymentMethod || payment.payment_method],
    ['Payment Time', paymentTime ? new Date(paymentTime).toLocaleString() : 'Not recorded'],
  ];

  return (
    <div className="space-y-10">
      <SectionHeader subtitle="Payment Successful" title="Payment Successful" />
      <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-8 shadow-xl">
        <p className="text-lg font-semibold text-emerald-900">Your appointment is confirmed.</p>
        <p className="mt-2 text-sm text-emerald-800">Receipt and booking details are ready below.</p>
      </div>

      <div className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-xl backdrop-blur-xl">
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-white/85 p-4 shadow-sm dark:bg-slate-950/45">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">{label}</p>
              <p className="mt-2 break-words text-sm font-semibold text-slate-900 dark:text-slate-50">{value || 'Not recorded'}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <button
          type="button"
          onClick={() => navigate('/user/appointments')}
          className="flex-1 rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 px-6 py-4 text-sm font-semibold text-white shadow-lg"
        >
          View Appointment
        </button>
        <a
          href={receiptUrl || '#'}
          className="flex-1 rounded-3xl border border-gray-200 bg-white px-6 py-4 text-center text-sm font-semibold text-gray-700 shadow-sm"
        >
          Download Receipt
        </a>
        <button
          type="button"
          onClick={() => navigate('/user/dashboard')}
          className="flex-1 rounded-3xl border border-gray-200 bg-white px-6 py-4 text-sm font-semibold text-gray-700 shadow-sm"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

export default SuccessPage;
