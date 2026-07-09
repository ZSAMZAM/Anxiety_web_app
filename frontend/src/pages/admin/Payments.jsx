import { useEffect, useMemo, useState } from 'react';
import {
  FiCheck,
  FiClock,
  FiCreditCard,
  FiDollarSign,
  FiDownload,
  FiEye,
  FiFilter,
  FiPrinter,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiTrendingUp,
  FiX,
} from 'react-icons/fi';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import SectionHeader from '../../components/SectionHeader.jsx';
import { api } from '../../services/api.js';

const paymentStatuses = ['all', 'Completed', 'Pending', 'Failed', 'Refunded'];
const serviceStatuses = ['all', 'Waiting', 'Verified', 'Follow Up Required', 'Refunded', 'Cancelled'];

function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [actionPayment, setActionPayment] = useState(null);
  const [refundPayment, setRefundPayment] = useState(null);
  const [actionForm, setActionForm] = useState({
    service_verified: true,
    verification_notes: '',
  });
  const [refundForm, setRefundForm] = useState({ reason: '', notes: '', decision: 'approve' });
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    service_status: 'all',
    method: 'all',
    provider: 'all',
    doctor_id: 'all',
    patient_id: 'all',
    start_date: '',
    end_date: '',
    sort_by: 'created_at',
    sort_dir: 'desc',
    page: 1,
    limit: 10,
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [paymentsData, statsData] = await Promise.all([
        api.getAdminPayments(filters),
        api.getPaymentStats(),
      ]);
      setPayments(paymentsData.payments || []);
      setPagination({
        page: paymentsData.page || 1,
        pages: paymentsData.pages || 1,
        total: paymentsData.total || 0,
        limit: paymentsData.limit || filters.limit,
      });
      setStats(statsData);
    } catch (err) {
      setError(err.message || 'Unable to load payment monitoring data.');
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: key === 'page' ? value : 1 }));
  };

  const options = useMemo(() => {
    const methods = new Set();
    const providers = new Set();
    const doctors = new Map();
    const patients = new Map();
    payments.forEach((payment) => {
      if (payment.payment_method) methods.add(payment.payment_method);
      if (payment.provider_name) providers.add(payment.provider_name);
      if (payment.doctor_id && payment.doctor_name) doctors.set(payment.doctor_id, payment.doctor_name);
      if (payment.user_id && payment.user_name) patients.set(payment.user_id, payment.user_name);
    });
    return { methods: [...methods], providers: [...providers], doctors: [...doctors], patients: [...patients] };
  }, [payments]);

  const summary = stats?.summary || {};
  const summaryCards = [
    ['Total Revenue', money(summary.totalRevenue), FiDollarSign, 'from-emerald-500 to-teal-500'],
    ["Today's Revenue", money(summary.todayRevenue), FiTrendingUp, 'from-cyan-500 to-blue-500'],
    ['This Month Revenue', money(summary.monthRevenue), FiTrendingUp, 'from-indigo-500 to-violet-500'],
    ['Completed Payments', summary.successfulPayments || 0, FiCheck, 'from-green-500 to-emerald-500'],
    ['Pending Payments', summary.pendingPayments || 0, FiClock, 'from-amber-500 to-orange-500'],
    ['Failed Payments', summary.failedPayments || 0, FiX, 'from-red-500 to-rose-500'],
    ['Refunded Payments', summary.refundedPayments || 0, FiRefreshCw, 'from-slate-500 to-gray-600'],
    ['Total Transactions', summary.totalTransactions || 0, FiCreditCard, 'from-sky-500 to-cyan-500'],
  ];

  const runServiceAction = async () => {
    if (!actionPayment) return;
    try {
      setError('');
      await api.updatePaymentServiceStatus(actionPayment.id, actionForm);
      setSuccess('Service verification updated.');
      setActionPayment(null);
      await loadData();
    } catch (err) {
      setError(err.message || 'Unable to update service status.');
    }
  };

  const runRefundAction = async () => {
    if (!refundPayment) return;
    if (!refundForm.reason.trim()) {
      setError('Refund reason is required.');
      return;
    }
    try {
      setError('');
      await api.refundPayment(refundPayment.id, refundForm);
      setSuccess(refundForm.decision === 'approve' ? 'Refund processed.' : 'Refund rejected.');
      setRefundPayment(null);
      await loadData();
    } catch (err) {
      setError(err.message || 'Unable to process refund.');
    }
  };

  const exportRows = () => [
    [
      'Payment ID',
      'Transaction ID',
      'Reference ID',
      'Invoice ID',
      'Provider Transaction ID',
      'User Name',
      'User Phone',
      'Doctor Name',
      'Appointment ID',
      'Booking ID',
      'Amount',
      'Currency',
      'Payment Method',
      'Provider Name',
      'Payment Status',
      'Paid Date',
      'Service Status',
      'Created Date',
    ],
    ...payments.map((payment) => [
      payment.id,
      payment.transaction_id || '',
      payment.reference_id || '',
      payment.invoice_id || '',
      payment.provider_transaction_id || '',
      payment.user_name || '',
      payment.user_phone || '',
      payment.doctor_name || '',
      payment.appointment_id || '',
      payment.booking_id || '',
      payment.amount || 0,
      payment.currency || '',
      payment.payment_method || '',
      payment.provider_name || '',
      payment.payment_status || '',
      payment.paid_at || '',
      payment.service_status || '',
      payment.created_at || '',
    ]),
  ];

  const exportFile = (extension) => {
    const csv = exportRows().map((row) => row.map(csvCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `admin-payments.${extension}`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <SectionHeader
        subtitle="Payment monitoring and service verification"
        title="Verify consultations, revenue, refunds, and transaction integrity."
      />

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(([label, value, Icon, gradient]) => (
          <div key={label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white`}>
              <Icon />
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400">{label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-950 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <ChartCard title="Revenue by Day" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={stats?.daily_revenue || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => money(value)} />
              <Line type="monotone" dataKey="revenue" stroke="#06b6d4" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Revenue by Payment Method">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats?.revenue_by_method || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="method" />
              <YAxis />
              <Tooltip formatter={(value) => money(value)} />
              <Bar dataKey="revenue" fill="#4f46e5" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-cyan-600">
              <FiFilter /> Filters
            </div>
            <h2 className="mt-1 text-xl font-bold text-gray-950 dark:text-white">Payment Transactions</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => exportFile('csv')} className="btn-secondary"><FiDownload /> CSV</button>
            <button onClick={() => exportFile('xls')} className="btn-secondary"><FiDownload /> Excel</button>
            <button onClick={() => window.print()} className="btn-secondary"><FiPrinter /> Print</button>
            <button onClick={loadData} className="btn-primary"><FiRefreshCw /> Refresh</button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input icon={<FiSearch />} value={filters.search} onChange={(value) => updateFilter('search', value)} placeholder="Search patient, doctor, transaction" />
          <Select value={filters.status} onChange={(value) => updateFilter('status', value)} options={paymentStatuses} label="Payment Status" />
          <Select value={filters.service_status} onChange={(value) => updateFilter('service_status', value)} options={serviceStatuses} label="Service Status" />
          <Select value={filters.method} onChange={(value) => updateFilter('method', value)} options={['all', ...options.methods]} label="Method" />
          <Select value={filters.provider} onChange={(value) => updateFilter('provider', value)} options={['all', ...options.providers]} label="Provider" />
          <Select value={filters.doctor_id} onChange={(value) => updateFilter('doctor_id', value)} options={[['all', 'All Doctors'], ...options.doctors]} label="Doctor" />
          <Select value={filters.patient_id} onChange={(value) => updateFilter('patient_id', value)} options={[['all', 'All Patients'], ...options.patients]} label="Patient" />
          <div className="grid grid-cols-2 gap-2">
            <DateInput value={filters.start_date} onChange={(value) => updateFilter('start_date', value)} label="From" />
            <DateInput value={filters.end_date} onChange={(value) => updateFilter('end_date', value)} label="To" />
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-500">Loading real payment records...</div>
        ) : payments.length === 0 ? (
          <div className="py-16 text-center">
            <FiCreditCard className="mx-auto mb-3 text-4xl text-gray-400" />
            <p className="font-semibold text-gray-700 dark:text-slate-200">No payments found</p>
            <p className="text-sm text-gray-500">Adjust filters or wait for real payment transactions.</p>
          </div>
        ) : (
          <>
            <div className="mt-5 hidden overflow-x-auto xl:block">
              <table className="min-w-[1500px] text-left text-sm">
                <thead className="border-y border-gray-200 text-xs uppercase text-gray-500 dark:border-slate-700">
                  <tr>
                    {['Payment ID', 'Transaction ID', 'Reference ID', 'Invoice ID', 'Provider Txn', 'User', 'Phone', 'Doctor', 'Appointment', 'Booking', 'Amount', 'Method', 'Provider', 'Payment', 'Paid Date', 'Service', 'Created', 'Actions'].map((header) => (
                      <th key={header} className="px-3 py-3">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                      <td className="px-3 py-3 font-semibold">#{payment.id}</td>
                      <td className="px-3 py-3 font-mono text-xs">{empty(payment.transaction_id)}</td>
                      <td className="px-3 py-3 font-mono text-xs">{empty(payment.reference_id)}</td>
                      <td className="px-3 py-3 font-mono text-xs">{empty(payment.invoice_id)}</td>
                      <td className="px-3 py-3 font-mono text-xs">{empty(payment.provider_transaction_id)}</td>
                      <td className="px-3 py-3">{empty(payment.user_name)}</td>
                      <td className="px-3 py-3">{empty(payment.user_phone)}</td>
                      <td className="px-3 py-3">{empty(payment.doctor_name)}</td>
                      <td className="px-3 py-3">{empty(payment.appointment_id)}</td>
                      <td className="px-3 py-3">{empty(payment.booking_id)}</td>
                      <td className="px-3 py-3 font-semibold">{money(payment.amount)} {payment.currency || 'USD'}</td>
                      <td className="px-3 py-3">{empty(payment.payment_method)}</td>
                      <td className="px-3 py-3">{empty(payment.provider_name)}</td>
                      <td className="px-3 py-3"><Badge value={payment.payment_status} /></td>
                      <td className="px-3 py-3">{dateTime(payment.paid_at)}</td>
                      <td className="px-3 py-3"><Badge value={payment.service_status} /></td>
                      <td className="px-3 py-3">{dateTime(payment.created_at)}</td>
                      <td className="px-3 py-3">
                        <RowActions payment={payment} onView={setSelectedPayment} onVerify={openVerify} onRefund={openRefund} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 grid gap-4 xl:hidden">
              {payments.map((payment) => (
                <div key={payment.id} className="rounded-xl border border-gray-200 p-4 dark:border-slate-700">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-gray-950 dark:text-white">#{payment.id} · {empty(payment.user_name)}</p>
                      <p className="text-sm text-gray-500">{empty(payment.doctor_name)} · {money(payment.amount)}</p>
                    </div>
                    <Badge value={payment.payment_status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge value={payment.service_status} />
                    <span className="text-sm text-gray-500">{dateTime(payment.created_at)}</span>
                  </div>
                  <RowActions payment={payment} onView={setSelectedPayment} onVerify={openVerify} onRefund={openRefund} />
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-5 flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {pagination.page} of {pagination.pages} · {pagination.total} records</p>
          <div className="flex gap-2">
            <button disabled={pagination.page <= 1} onClick={() => updateFilter('page', pagination.page - 1)} className="btn-secondary disabled:opacity-40">Previous</button>
            <button disabled={pagination.page >= pagination.pages} onClick={() => updateFilter('page', pagination.page + 1)} className="btn-secondary disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Revenue by Month">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={stats?.monthly_revenue || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => money(value)} />
              <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Doctor Revenue">
          <div className="max-h-[260px] overflow-auto">
            {(stats?.doctor_revenue || []).map((row) => (
              <div key={row.doctorName} className="mb-3 rounded-xl border border-gray-200 p-3 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{row.doctorName}</p>
                  <p className="font-bold">{money(row.totalRevenue)}</p>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {row.totalConsultations} consultations · {row.paidConsultations} paid
                </p>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {selectedPayment && <PaymentDetailsModal payment={selectedPayment} onClose={() => setSelectedPayment(null)} />}
      {actionPayment && (
        <ActionModal
          title="Service Verification"
          onClose={() => setActionPayment(null)}
          onSubmit={runServiceAction}
        >
          <div className="rounded-xl border border-gray-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-sm font-semibold text-gray-950 dark:text-white">Did the doctor provide the service?</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              This can only be saved after the appointment is completed.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setActionForm((prev) => ({ ...prev, service_verified: true }))}
                className={`rounded-xl border px-4 py-3 text-sm font-bold transition ${
                  actionForm.service_verified
                    ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                }`}
              >
                YES
              </button>
              <button
                type="button"
                onClick={() => setActionForm((prev) => ({ ...prev, service_verified: false }))}
                className={`rounded-xl border px-4 py-3 text-sm font-bold transition ${
                  !actionForm.service_verified
                    ? 'border-red-500 bg-red-500 text-white shadow-lg shadow-red-500/20'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-red-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                }`}
              >
                NO
              </button>
            </div>
          </div>
          <textarea
            className="input mt-3 min-h-24"
            placeholder={actionForm.service_verified ? 'Verification notes' : 'Reason or issue reported by patient'}
            value={actionForm.verification_notes}
            onChange={(e) => setActionForm((prev) => ({ ...prev, verification_notes: e.target.value }))}
          />
        </ActionModal>
      )}
      {refundPayment && (
        <ActionModal title="Refund Management" onClose={() => setRefundPayment(null)} onSubmit={runRefundAction}>
          <Select value={refundForm.decision} onChange={(value) => setRefundForm((prev) => ({ ...prev, decision: value }))} options={['approve', 'reject']} label="Decision" />
          <textarea className="input mt-3 min-h-24" placeholder="Refund reason" value={refundForm.reason} onChange={(e) => setRefundForm((prev) => ({ ...prev, reason: e.target.value }))} />
          <textarea className="input mt-3 min-h-24" placeholder="Admin notes" value={refundForm.notes} onChange={(e) => setRefundForm((prev) => ({ ...prev, notes: e.target.value }))} />
        </ActionModal>
      )}
    </div>
  );

  function openVerify(payment) {
    setActionPayment(payment);
    setActionForm({
      service_verified: payment.service_verified !== false,
      verification_notes: payment.verification_notes || '',
    });
  }

  function openRefund(payment) {
    setRefundPayment(payment);
    setRefundForm({ reason: payment.refund_reason || '', notes: payment.refund_notes || '', decision: 'approve' });
  }
}

function RowActions({ payment, onView, onVerify, onRefund }) {
  const appointmentCompleted = String(payment.appointment_status || '').toLowerCase() === 'completed';
  const canVerify = payment.payment_status === 'Completed' && appointmentCompleted && payment.service_status !== 'Refunded';
  const canRefund = payment.payment_status === 'Completed' && payment.service_status !== 'Refunded';
  return (
    <div className="mt-3 flex flex-wrap gap-2 xl:mt-0">
      <button onClick={() => onView(payment)} className="btn-secondary"><FiEye /> Details</button>
      <button disabled={!canVerify} onClick={() => onVerify(payment)} className="btn-secondary disabled:opacity-40"><FiShield /> Verify</button>
      <button disabled={!canRefund} onClick={() => onRefund(payment)} className="btn-danger disabled:opacity-40"><FiRefreshCw /> Refund</button>
    </div>
  );
}

function PaymentDetailsModal({ payment, onClose }) {
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setAuditLoading(true);
    api.getPaymentAudit(payment.id)
      .then((logs) => {
        if (active) setAuditLogs(logs);
      })
      .finally(() => {
        if (active) setAuditLoading(false);
      });
    return () => {
      active = false;
    };
  }, [payment.id]);

  return (
    <ActionModal title={`Payment #${payment.id}`} onClose={onClose} hideSubmit>
      <div className="grid gap-4 md:grid-cols-2">
        <DetailGroup title="Patient Information" rows={[['Name', payment.user_name], ['Phone', payment.user_phone], ['Email', payment.user_email]]} />
        <DetailGroup title="Doctor Information" rows={[['Name', payment.doctor_name], ['Specialization', payment.doctor_specialization], ['Hospital', payment.doctor_hospital], ['Phone', payment.doctor_phone]]} />
        <DetailGroup title="Appointment Information" rows={[['Appointment ID', payment.appointment_id], ['Date', payment.appointment_date], ['Time', payment.appointment_time], ['Status', payment.appointment_status]]} />
        <DetailGroup title="Payment Information" rows={[['Transaction ID', payment.transaction_id], ['Reference ID', payment.reference_id], ['Invoice ID', payment.invoice_id], ['Provider Transaction ID', payment.provider_transaction_id], ['Amount', `${money(payment.amount)} ${payment.currency || 'USD'}`], ['Method', payment.payment_method], ['Provider', payment.provider_name], ['Paid Date', dateTime(payment.paid_at)]]} />
      </div>
      <div className="mt-4 rounded-xl border border-gray-200 p-4 dark:border-slate-700">
        <h3 className="font-bold">Service Verification</h3>
        <DetailRows rows={[['Service Status', payment.service_status], ['Service Verified', serviceAnswer(payment.service_verified)], ['Patient Response', payment.patient_response], ['Verification Notes', payment.verification_notes], ['Verified By', payment.service_verified_by_name], ['Verification Date', dateTime(payment.service_verified_at)]]} />
      </div>
      <div className="mt-4 rounded-xl border border-gray-200 p-4 dark:border-slate-700">
        <h3 className="font-bold">Merchant Response</h3>
        <pre className="mt-2 max-h-52 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{formatJson(payment.merchant_response)}</pre>
      </div>
      <div className="mt-4 rounded-xl border border-gray-200 p-4 dark:border-slate-700">
        <h3 className="font-bold">Service Verification History</h3>
        {auditLoading ? (
          <p className="mt-3 text-sm text-gray-500">Loading audit trail...</p>
        ) : auditLogs.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No service verification actions have been recorded for this payment.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {auditLogs.map((log, index) => (
              <div key={`${log.created_at}-${index}`} className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-gray-950 dark:text-white">{log.action}</span>
                  <span className="text-xs text-gray-500">{dateTime(log.created_at)}</span>
                </div>
                <p className="mt-1 text-gray-600 dark:text-slate-300">
                  {empty(log.actor)} changed {empty(log.previous_status)} to {empty(log.new_status)}
                </p>
                {(log.reason || log.notes) && (
                  <p className="mt-1 text-xs text-gray-500">{empty(log.reason || log.notes)}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ActionModal>
  );
}

function DetailGroup({ title, rows }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4 dark:border-slate-700">
      <h3 className="mb-3 font-bold">{title}</h3>
      <DetailRows rows={rows} />
    </div>
  );
}

function DetailRows({ rows }) {
  return rows.map(([label, value]) => (
    <div key={label} className="mb-2 flex gap-3 text-sm">
      <span className="w-32 shrink-0 text-gray-500">{label}</span>
      <span className="font-medium text-gray-950 dark:text-white">{empty(value)}</span>
    </div>
  ));
}

function ActionModal({ title, children, onClose, onSubmit, hideSubmit = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-950 dark:text-white">{title}</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-slate-800"><FiX /></button>
        </div>
        {children}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Close</button>
          {!hideSubmit && <button onClick={onSubmit} className="btn-primary">Submit</button>}
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 ${className}`}>
      <h2 className="mb-4 text-xl font-bold text-gray-950 dark:text-white">{title}</h2>
      {children}
    </div>
  );
}

function Alert({ type, message, onClose }) {
  const classes = type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700';
  return (
    <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${classes}`}>
      <span>{message}</span>
      <button onClick={onClose}><FiX /></button>
    </div>
  );
}

function Input({ icon, value, onChange, placeholder }) {
  return (
    <label className="input flex items-center gap-2">
      {icon}
      <input className="w-full bg-transparent outline-none" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

function Select({ value, onChange, options, label }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</span>
      <select className="input w-full" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => {
          const value = Array.isArray(option) ? option[0] : option;
          const label = Array.isArray(option) ? option[1] : option === 'all' ? 'All' : option;
          return <option key={value} value={value}>{label}</option>;
        })}
      </select>
    </label>
  );
}

function DateInput({ value, onChange, label }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</span>
      <input className="input w-full" type="date" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Badge({ value }) {
  const text = value || 'Unknown';
  const color = text === 'Completed' || text === 'Verified'
    ? 'bg-emerald-100 text-emerald-700'
    : text === 'Pending' || text === 'Waiting' || text === 'Follow Up Required'
      ? 'bg-amber-100 text-amber-700'
      : text === 'Failed' || text === 'Cancelled'
        ? 'bg-red-100 text-red-700'
        : 'bg-slate-100 text-slate-700';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>{text}</span>;
}

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function empty(value) {
  return value === null || value === undefined || value === '' ? 'N/A' : value;
}

function serviceAnswer(value) {
  if (value === null || value === undefined) return 'Not asked';
  return value ? 'YES' : 'NO';
}

function dateTime(value) {
  return value ? new Date(value).toLocaleString() : 'N/A';
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function formatJson(value) {
  if (!value) return 'No merchant response stored.';
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export default AdminPayments;
