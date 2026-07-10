import { useEffect, useMemo, useState } from 'react';
import {
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiEye,
  FiFilter,
  FiRefreshCcw,
  FiSearch,
  FiShield,
  FiTrendingUp,
  FiX,
  FiXCircle,
} from 'react-icons/fi';
import SectionHeader from '../../components/SectionHeader.jsx';
import { api } from '../../services/api.js';

const statusOptions = ['All', 'Pending Review', 'Approved', 'Rejected', 'Processing', 'Completed', 'More Information Requested'];
const pageSizes = [10, 25, 50, 100];

const currency = (value) => `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateText = (value) => (value ? new Date(value).toLocaleString() : 'Not recorded');

function statusClass(status) {
  const value = String(status || '').toLowerCase();
  if (value.includes('complete') || value.includes('approved')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200';
  if (value.includes('reject')) return 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-200';
  if (value.includes('process')) return 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200';
  if (value.includes('information')) return 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-200';
  return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200';
}

function RefundRequests() {
  const [refunds, setRefunds] = useState([]);
  const [stats, setStats] = useState({});
  const [filters, setFilters] = useState({ search: '', status: 'All', doctor: '', patient: '', start_date: '', end_date: '', min_amount: '', max_amount: '', page: 1, limit: 10 });
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [actionModal, setActionModal] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [savingAction, setSavingAction] = useState(false);

  const query = useMemo(() => {
    const params = { ...filters };
    Object.keys(params).forEach((key) => {
      if (params[key] === '' || params[key] === 'All') delete params[key];
    });
    return params;
  }, [filters]);

  useEffect(() => {
    const handle = setTimeout(() => {
      loadRefunds();
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const data = await api.getAdminRefundStats();
    setStats(data || {});
  };

  const loadRefunds = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getAdminRefunds(query);
      setRefunds(data.refunds || []);
      setPagination({ total: data.total || 0, page: data.page || 1, limit: data.limit || filters.limit, pages: data.pages || 0 });
    } catch (err) {
      setError(err.message || 'Unable to load refund requests.');
    } finally {
      setLoading(false);
    }
  };

  const openDetails = async (refund) => {
    setDrawerLoading(true);
    setSelected(refund);
    try {
      const detail = await api.getAdminRefund(refund.id);
      setSelected(detail || refund);
    } catch (err) {
      setError(err.message || 'Unable to load refund details.');
    } finally {
      setDrawerLoading(false);
    }
  };

  const runAction = async () => {
    if (!actionModal) return;
    setSavingAction(true);
    setError('');
    try {
      await api.updateAdminRefund(actionModal.refund.id, { action: actionModal.action, admin_notes: adminNotes });
      setActionModal(null);
      setAdminNotes('');
      await Promise.all([loadRefunds(), loadStats()]);
      if (selected?.id === actionModal.refund.id) {
        const detail = await api.getAdminRefund(actionModal.refund.id);
        setSelected(detail);
      }
    } catch (err) {
      setError(err.message || 'Unable to update refund request.');
    } finally {
      setSavingAction(false);
    }
  };

  const exportRefunds = async (format) => {
    try {
      const blob = await api.exportAdminRefunds({ ...query, format });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `refund_requests.${format === 'excel' ? 'xls' : format}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Unable to export refunds.');
    }
  };

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value, page: key === 'page' ? value : 1 }));
  const resetFilters = () => setFilters({ search: '', status: 'All', doctor: '', patient: '', start_date: '', end_date: '', min_amount: '', max_amount: '', page: 1, limit: 10 });

  const statCards = [
    { label: 'Pending Refunds', value: stats.pending_refunds || 0, icon: FiClock, tone: 'text-amber-600' },
    { label: 'Approved Refunds', value: stats.approved_refunds || 0, icon: FiCheckCircle, tone: 'text-emerald-600' },
    { label: 'Rejected Refunds', value: stats.rejected_refunds || 0, icon: FiXCircle, tone: 'text-red-600' },
    { label: 'Total Refund Amount', value: currency(stats.total_refund_amount), icon: FiTrendingUp, tone: 'text-cyan-600' },
    { label: 'Refunded This Month', value: currency(stats.refunded_this_month), icon: FiRefreshCcw, tone: 'text-blue-600' },
    { label: 'Avg. Processing Time', value: `${Number(stats.average_processing_time || 0).toFixed(1)}h`, icon: FiShield, tone: 'text-violet-600' },
  ];

  return (
    <div className="space-y-8">
      <SectionHeader subtitle="Refund Requests" title="Banking-grade refund operations and audit control." />

      {error && (
        <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700 shadow-sm dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-[1.25rem] border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.35)] dark:border-slate-700 dark:bg-slate-900/80">
              <div className={`mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 ${card.tone} dark:bg-slate-800`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-black text-slate-950 dark:text-white">{card.value}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="sticky top-3 z-20 rounded-[1.25rem] border border-slate-200/80 bg-white/95 p-4 shadow-xl shadow-slate-200/50 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:shadow-black/20">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto]">
          <label className="relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Search refund, patient, doctor, transaction" className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-cyan-950" />
          </label>
          <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white">
            {statusOptions.map((status) => <option key={status}>{status}</option>)}
          </select>
          <input value={filters.doctor} onChange={(event) => updateFilter('doctor', event.target.value)} placeholder="Doctor" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          <input value={filters.patient} onChange={(event) => updateFilter('patient', event.target.value)} placeholder="Patient" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          <input type="date" value={filters.start_date} onChange={(event) => updateFilter('start_date', event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          <button onClick={resetFilters} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            <FiFilter /> Reset
          </button>
        </div>
      </div>

      <div className="rounded-[1.25rem] border border-slate-200/80 bg-white/95 shadow-xl shadow-slate-200/40 dark:border-slate-700 dark:bg-slate-900/90 dark:shadow-black/20">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-950 dark:text-white">Refund Table</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Showing {refunds.length ? (pagination.page - 1) * pagination.limit + 1 : 0}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} requests</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {['csv', 'excel', 'pdf'].map((format) => (
              <button key={format} onClick={() => exportRefunds(format)} className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-bold uppercase text-cyan-700 transition hover:bg-cyan-100 dark:border-cyan-900 dark:bg-cyan-950/30 dark:text-cyan-200">
                <FiDownload /> {format}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 p-5">
            {[1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />)}
          </div>
        ) : refunds.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-200">
              <FiRefreshCcw className="h-9 w-9" />
            </div>
            <h3 className="mt-5 text-2xl font-black text-slate-950 dark:text-white">No refund requests yet</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Eligible patient requests will appear here with payment, appointment, and audit context.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
                <tr>
                  {['Refund ID', 'Patient', 'Doctor', 'Appointment', 'Amount', 'Method', 'Reason', 'Request Date', 'Status', 'Admin', 'Actions'].map((heading) => <th key={heading} className="px-5 py-4">{heading}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {refunds.map((refund) => (
                  <tr key={refund.id} onClick={() => openDetails(refund)} className="cursor-pointer transition hover:bg-cyan-50/60 dark:hover:bg-cyan-950/20">
                    <td className="px-5 py-4 font-black text-slate-900 dark:text-white">{refund.refund_id}</td>
                    <td className="px-5 py-4"><p className="font-bold text-slate-800 dark:text-slate-100">{refund.patient?.name}</p><p className="text-xs text-slate-500">{refund.patient?.phone}</p></td>
                    <td className="px-5 py-4"><p className="font-bold text-slate-800 dark:text-slate-100">{refund.doctor?.name}</p><p className="text-xs text-slate-500">{refund.doctor?.specialization}</p></td>
                    <td className="px-5 py-4">#{refund.appointment_id}</td>
                    <td className="px-5 py-4 font-bold">{currency(refund.refund_amount)}</td>
                    <td className="px-5 py-4">{refund.payment_method || 'N/A'}</td>
                    <td className="px-5 py-4 max-w-[180px] truncate">{refund.reason}</td>
                    <td className="px-5 py-4">{dateText(refund.requested_at)}</td>
                    <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(refund.status)}`}>{refund.status}</span></td>
                    <td className="px-5 py-4">{refund.admin || 'Unassigned'}</td>
                    <td className="px-5 py-4">
                      <button onClick={(event) => { event.stopPropagation(); openDetails(refund); }} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white dark:bg-white dark:text-slate-950">
                        <FiEye /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-200 p-5 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <select value={filters.limit} onChange={(event) => updateFilter('limit', Number(event.target.value))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:w-36">
            {pageSizes.map((size) => <option key={size} value={size}>{size} per page</option>)}
          </select>
          <div className="flex gap-2">
            <button disabled={pagination.page <= 1} onClick={() => updateFilter('page', pagination.page - 1)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold disabled:opacity-40 dark:border-slate-700">Previous</button>
            <button disabled={pagination.page >= pagination.pages} onClick={() => updateFilter('page', pagination.page + 1)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold disabled:opacity-40 dark:border-slate-700">Next</button>
          </div>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/55 backdrop-blur-sm">
          <aside className="h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-2xl dark:bg-slate-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-600">Refund Details</p>
                <h3 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{selected.refund_id}</h3>
                <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-black ${statusClass(selected.status)}`}>{selected.status}</span>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700"><FiX /></button>
            </div>

            {drawerLoading ? (
              <div className="mt-8 h-40 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800" />
            ) : (
              <div className="mt-8 space-y-5">
                {[
                  ['Patient Information', `${selected.patient?.name || 'Unknown'} · ${selected.patient?.phone || 'No phone number'}`],
                  ['Doctor Information', `${selected.doctor?.name || 'Unknown'} · ${selected.doctor?.specialization || 'Specialist'}`],
                  ['Appointment Details', `#${selected.appointment_id} · ${selected.appointment?.date || 'No date'} ${selected.appointment?.time || ''} · ${selected.appointment?.status || 'No status'}`],
                  ['Payment Details', `${currency(selected.amount)} via ${selected.payment_method || 'N/A'} · ${selected.payment_status || 'N/A'}`],
                  ['Transaction ID', selected.transaction_id || 'Not recorded'],
                  ['Reason', selected.reason || 'Not recorded'],
                  ['Evidence', (selected.evidence?.system_reasons || []).join(' ') || 'No automated evidence recorded.'],
                  ['Doctor Attendance', selected.appointment?.service_status || 'Waiting for service verification'],
                  ['Admin Notes', selected.admin_notes || 'No admin notes yet.'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{value}</p>
                  </div>
                ))}

                <div className="rounded-[1.25rem] border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Appointment Timeline</p>
                  <div className="mt-3 space-y-3">
                    {(selected.timeline || []).length === 0 ? (
                      <p className="text-sm text-slate-500">No audit events yet.</p>
                    ) : selected.timeline.map((item, index) => (
                      <div key={`${item.action}-${index}`} className="rounded-2xl bg-slate-50 p-3 text-sm dark:bg-slate-900">
                        <p className="font-bold text-slate-900 dark:text-white">{item.action}</p>
                        <p className="text-xs text-slate-500">{dateText(item.created_at)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    ['Approve Refund', 'approve', 'bg-emerald-600'],
                    ['Reject Refund', 'reject', 'bg-red-600'],
                    ['Request More Information', 'request_info', 'bg-violet-600'],
                    ['Mark Processing', 'processing', 'bg-blue-600'],
                    ['Mark Completed', 'complete', 'bg-slate-950 dark:bg-white dark:text-slate-950'],
                  ].map(([label, action, tone]) => (
                    <button key={action} onClick={() => { setActionModal({ refund: selected, action, label }); setAdminNotes(''); }} className={`rounded-2xl px-4 py-3 text-sm font-black text-white shadow-lg ${tone}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur">
          <div className="w-full max-w-lg rounded-[1.5rem] bg-white p-6 shadow-2xl dark:bg-slate-900">
            <h3 className="text-2xl font-black text-slate-950 dark:text-white">{actionModal.label}</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">This action will be logged and the patient will be notified.</p>
            <textarea value={adminNotes} onChange={(event) => setAdminNotes(event.target.value)} rows={4} placeholder="Admin notes" className="mt-5 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setActionModal(null)} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold dark:border-slate-700">Cancel</button>
              <button onClick={runAction} disabled={savingAction} className="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-sm font-black text-white disabled:opacity-60">
                {savingAction ? 'Saving...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RefundRequests;
