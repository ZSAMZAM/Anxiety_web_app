import { useEffect, useState } from 'react';
import { FiAlertTriangle, FiClock, FiUserCheck, FiUsers } from 'react-icons/fi';
import SectionHeader from '../../components/SectionHeader.jsx';
import { api } from '../../services/api.js';

function EmergencyExtensions() {
  const [report, setReport] = useState({ stats: {}, doctors: [], history: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.getAdminConsultationExtensions()
      .then((data) => {
        if (mounted) setReport(data || { stats: {}, doctors: [], history: [] });
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const stats = report.stats || {};

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-red-500" />
          <p className="mt-4 text-slate-500">Loading emergency extensions...</p>
        </div>
      </div>
    );
  }

  const cards = [
    ['Today\'s Extensions', stats.emergency_extensions_today || 0, FiAlertTriangle, 'text-red-500'],
    ['Total Extensions', stats.total_extended_consultations || 0, FiClock, 'text-blue-500'],
    ['Average Extra Minutes', `${stats.average_extra_minutes || 0} min`, FiUserCheck, 'text-emerald-500'],
    ['Total Extra Minutes', `${stats.total_extra_minutes || 0} min`, FiUsers, 'text-amber-500'],
  ];

  return (
    <div className="space-y-8">
      <SectionHeader subtitle="Emergency consultation extensions" title="Audit every live consultation extension and schedule delay." />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon, color]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/80">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/80">
          <h2 className="text-lg font-black text-slate-950 dark:text-white">Doctors With Most Extensions</h2>
          <div className="mt-4 space-y-3">
            {(report.doctors || []).length ? report.doctors.map((doctor) => (
              <div key={doctor.doctor_id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
                <p className="font-bold text-slate-900 dark:text-white">{doctor.doctor_name}</p>
                <p className="text-sm text-slate-500">{doctor.extension_count} extensions · {doctor.total_minutes} min</p>
              </div>
            )) : <p className="py-8 text-center text-sm text-slate-500">No extensions recorded yet.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/80">
          <h2 className="text-lg font-black text-slate-950 dark:text-white">Extension Status</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-red-50 p-4 dark:bg-red-950/20">
              <p className="text-sm font-bold text-red-700 dark:text-red-200">Applied</p>
              <p className="mt-2 text-2xl font-black text-red-800 dark:text-red-100">{(report.history || []).filter((item) => item.status === 'Applied').length}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Audit Records</p>
              <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{(report.history || []).length}</p>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm dark:border-white/10 dark:bg-slate-900/80">
        <div className="border-b border-slate-200 p-5 dark:border-white/10">
          <h2 className="text-lg font-black text-slate-950 dark:text-white">Extension History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950">
              <tr>
                {['Doctor', 'Patient', 'Appointment', 'Original End Time', 'New End Time', 'Extra Minutes', 'Reason', 'Date', 'Who Approved', 'Status'].map((head) => (
                  <th key={head} className="px-4 py-3">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {(report.history || []).map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/70">
                  <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{item.doctor_name}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.patient_name}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">#{item.appointment_id} · {item.appointment_time}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.original_end_time}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.extended_end_time}</td>
                  <td className="px-4 py-3 font-black text-red-600">+{item.added_minutes} min</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.reason || '-'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.created_at ? new Date(item.created_at).toLocaleString() : '-'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.approved_by || 'Doctor'}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-black text-emerald-700">{item.status || 'Applied'}</span></td>
                </tr>
              ))}
              {!(report.history || []).length && (
                <tr>
                  <td colSpan="10" className="px-4 py-10 text-center text-slate-500">No emergency consultation extensions yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default EmergencyExtensions;
