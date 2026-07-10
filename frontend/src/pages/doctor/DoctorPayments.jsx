import { useEffect, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { FiRefreshCw, FiSearch } from 'react-icons/fi';
import SectionHeader from '../../components/SectionHeader.jsx';
import { api } from '../../services/api.js';

const initialFilters = { method: 'all', search: '' };
const money = (value, currency = 'USD') => `${Number(value || 0).toFixed(2)} ${currency}`;
const empty = (value) => value === null || value === undefined || value === '' ? 'Not recorded' : value;

function DoctorPayments() {
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState({ payments: [], summary: {}, analytics: {}, payment_methods: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (activeFilters = filters, silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      setData(await api.getDoctorPayments(activeFilters));
    } catch (err) {
      setError(err.message || 'Unable to load payment records.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load(filters);
    const intervalId = window.setInterval(() => load(filters, true), 15000);
    const onFocus = () => load(filters, true);
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, [filters.method, filters.search]);

  const rows = data.payments || [];
  const summary = data.summary || {};
  const analytics = data.analytics || {};
  const currency = summary.currency || 'USD';
  const cards = [
    ['Total Earnings (Gross)', money(summary.gross_earnings, currency)],
    ['Total Refunded', money(summary.refunded_amount, currency)],
    ['Net Earnings', money(summary.net_earnings, currency)],
    ['Completed Consultations', Number(summary.completed_consultations || 0)],
  ];

  const reset = () => setFilters(initialFilters);

  return (
    <div className="space-y-6">
      <SectionHeader subtitle="Doctor payments" title="Completed consultation earnings" />
      {error && <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <p className="text-xs font-bold text-slate-500">{label}</p>
            <p className="mt-2 text-xl font-black text-slate-950 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px_auto] md:items-end">
          <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
            <span className="mb-1.5 block">Search Patient</span>
            <span className="relative block">
              <FiSearch className="absolute left-3 top-3 text-slate-400" />
              <input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Patient name or phone" className="field pl-9" />
            </span>
          </label>
          <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
            <span className="mb-1.5 block">Payment Method</span>
            <select value={filters.method} onChange={(event) => setFilters((current) => ({ ...current, method: event.target.value }))} className="field">
              <option value="all">All methods</option>
              {(data.payment_methods || []).map((method) => <option key={method} value={method}>{method}</option>)}
            </select>
          </label>
          <button type="button" onClick={reset} className="btn-secondary"><FiRefreshCw /> Reset Filter</button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <EarningsChart title="Daily Net Earnings" data={analytics.daily_earnings} currency={currency} />
        <EarningsChart title="Weekly Net Earnings" data={analytics.weekly_earnings} currency={currency} />
        <EarningsChart title="Monthly Net Earnings" data={analytics.monthly_earnings} currency={currency} />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-4 dark:border-white/10">
          <h2 className="font-black text-slate-950 dark:text-white">Completed Payments</h2>
          <p className="text-xs text-slate-500">{rows.length} paid consultations</p>
        </div>
        {loading ? <div className="p-12 text-center text-sm text-slate-500">Loading completed payments...</div> : !rows.length ? <div className="p-12 text-center text-sm text-slate-500">No completed payments match these filters.</div> : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1050px] text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-950"><tr>{['Transaction ID', 'Patient Name', 'Patient Phone', 'Consultation Date', 'Payment Method', 'Consultation Fee', 'Refund Amount', 'Net Amount Received', 'Payment Status'].map((heading) => <th key={heading} className="px-3 py-3 text-left font-bold">{heading}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">{rows.map((payment) => <tr key={payment.id} className="hover:bg-blue-50/40 dark:hover:bg-white/5"><td className="px-3 py-3 font-mono text-xs">{empty(payment.transaction_id)}</td><td className="px-3 py-3 font-semibold">{empty(payment.patient_name)}</td><td className="px-3 py-3">{empty(payment.patient_phone)}</td><td className="px-3 py-3">{empty(payment.appointment_date)}</td><td className="px-3 py-3">{empty(payment.payment_method || payment.provider_name)}</td><td className="px-3 py-3">{money(payment.consultation_fee, payment.currency)}</td><td className="px-3 py-3 text-red-600">{money(payment.refund_amount, payment.currency)}</td><td className="px-3 py-3 font-bold text-emerald-600">{money(payment.doctor_earnings, payment.currency)}</td><td className="px-3 py-3"><span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">Completed</span></td></tr>)}</tbody>
              </table>
            </div>
            <div className="grid gap-3 p-4 lg:hidden">{rows.map((payment) => <div key={payment.id} className="rounded-md border border-slate-200 p-4 dark:border-white/10"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-slate-900 dark:text-white">{payment.patient_name}</p><p className="text-sm text-slate-500">{payment.patient_phone}</p></div><span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">Completed</span></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><Metric label="Consultation Date" value={payment.appointment_date} /><Metric label="Payment Method" value={payment.payment_method || payment.provider_name} /><Metric label="Consultation Fee" value={money(payment.consultation_fee, payment.currency)} /><Metric label="Refund" value={money(payment.refund_amount, payment.currency)} /><Metric label="Net Received" value={money(payment.doctor_earnings, payment.currency)} /><Metric label="Transaction" value={payment.transaction_id} /></dl></div>)}</div>
          </>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }) {
  return <div><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-words font-semibold text-slate-800 dark:text-slate-200">{empty(value)}</dd></div>;
}

function EarningsChart({ title, data = [], currency }) {
  return <div className="h-64 rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900"><h3 className="text-sm font-black text-slate-900 dark:text-white">{title}</h3><ResponsiveContainer width="100%" height="88%"><LineChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" /><XAxis dataKey="label" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip formatter={(value) => money(value, currency)} /><Line type="monotone" dataKey="earnings" name="Net Earnings" stroke="#2563EB" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>;
}

export default DoctorPayments;
