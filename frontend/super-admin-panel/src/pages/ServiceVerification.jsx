import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, CreditCard, FileSearch, RefreshCw, RotateCcw } from 'lucide-react';
import { superAdminApi } from '../services/api';

const StatCard = ({ label, value, icon: Icon, tone }) => (
  <div className="premium-card p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold dark:text-slate-400 text-slate-600">{label}</p>
        <p className="mt-3 text-3xl font-bold dark:text-slate-50 text-slate-900">{value || 0}</p>
      </div>
      <div className={`rounded-2xl p-4 ${tone}`}>
        <Icon className="h-7 w-7" />
      </div>
    </div>
  </div>
);

const ServiceVerification = () => {
  const [data, setData] = useState({ records: [], summary: {} });
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const response = await superAdminApi.getServiceVerification();
    setData(response);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const records = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return data.records || [];
    return (data.records || []).filter((record) =>
      [record.patient_name, record.doctor_name, record.payment_status, record.service_status, record.transaction_id]
        .some((value) => String(value || '').toLowerCase().includes(search))
    );
  }, [data.records, query]);

  if (loading) {
    return <div className="text-slate-600 dark:text-slate-400">Loading service verification...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold dark:text-slate-50 text-slate-900">Service Verification Monitoring</h2>
          <p className="mt-2 dark:text-slate-400 text-slate-600">Review paid appointments, completion status, verification requests, and refund decisions</p>
        </div>
        <button onClick={loadData} className="premium-button-primary inline-flex items-center gap-2 px-5 py-3">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Paid Appointments" value={data.summary?.paidAppointments} icon={CreditCard} tone="bg-emerald-500/15 text-emerald-600" />
        <StatCard label="Verification Requests" value={data.summary?.verificationRequests} icon={FileSearch} tone="bg-primary/15 text-primary" />
        <StatCard label="Refund Decisions" value={data.summary?.refundDecisions} icon={RotateCcw} tone="bg-amber-500/15 text-amber-600" />
        <StatCard label="Tracked Records" value={records.length} icon={ClipboardCheck} tone="bg-teal-500/15 text-teal-600" />
      </div>

      <div className="premium-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-6 dark:border-white/10 md:flex-row md:items-center md:justify-between">
          <h3 className="text-xl font-bold dark:text-slate-50 text-slate-900">Verification Queue</h3>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search verification records..."
            className="premium-input md:max-w-sm"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="bg-slate-100 dark:bg-slate-950/55">
              <tr>
                {['Appointment', 'Patient', 'Doctor', 'Date', 'Payment', 'Service', 'Verification', 'Refund'].map((heading) => (
                  <th key={heading} className="px-6 py-4 text-left text-sm font-bold text-slate-600 dark:text-sky-200">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {records.map((record) => (
                <tr key={`${record.appointment_id}-${record.transaction_id}`} className="hover:bg-slate-50 dark:bg-slate-800/35 dark:hover:bg-sky-400/10">
                  <td className="px-6 py-4 font-semibold dark:text-slate-50 text-slate-900">#{record.appointment_id}</td>
                  <td className="px-6 py-4 dark:text-slate-300 text-slate-700">{record.patient_name || '-'}</td>
                  <td className="px-6 py-4 dark:text-slate-300 text-slate-700">{record.doctor_name || '-'}</td>
                  <td className="px-6 py-4 dark:text-slate-300 text-slate-700">{record.appointment_date || '-'}</td>
                  <td className="px-6 py-4 dark:text-slate-300 text-slate-700">{record.payment_status || '-'} ${Number(record.amount || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 dark:text-slate-300 text-slate-700">{record.service_status || '-'}</td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-sky-500/15 px-3 py-1 text-sm font-semibold text-sky-600 dark:text-sky-200">{record.verification_status}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-amber-500/15 px-3 py-1 text-sm font-semibold text-amber-600 dark:text-amber-200">{record.refund_decision}</span>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-6 py-10 text-center dark:text-slate-400 text-slate-600">No verification records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ServiceVerification;
