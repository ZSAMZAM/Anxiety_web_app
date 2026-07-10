import { useEffect, useMemo, useState } from 'react';
import { FiClock, FiCopy, FiEye, FiEyeOff, FiKey, FiRefreshCw, FiSearch, FiShield, FiX } from 'react-icons/fi';
import SectionHeader from '../../components/SectionHeader.jsx';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';

const FILTERS = [
  { label: 'All statuses', value: 'all' },
  { label: 'Generated', value: 'generated' },
  { label: 'Changed', value: 'changed' },
  { label: 'Reset', value: 'reset' },
  { label: 'Recently Changed', value: 'recent' },
];

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function DoctorPasswords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [revealedPasswords, setRevealedPasswords] = useState({});
  const [historyDoctor, setHistoryDoctor] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [resettingId, setResettingId] = useState(null);
  const { showToast } = useToast();

  const loadPasswords = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError('');
      const data = await api.getAdminDoctorPasswords({
        search: query,
        status: statusFilter !== 'all' ? statusFilter : '',
      });
      setRecords(data);
    } catch (loadError) {
      const message = loadError?.response?.data?.error || loadError?.message || 'Unable to load doctor passwords.';
      setError(message);
      if (!silent) setRecords([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadPasswords();
  }, [query, statusFilter]);

  useEffect(() => {
    const intervalId = window.setInterval(() => loadPasswords(true), 15000);
    return () => window.clearInterval(intervalId);
  }, [query, statusFilter]);

  const filteredRecords = useMemo(() => records, [records]);

  const statusBadgeClass = (status) => {
    switch (String(status || '').toLowerCase()) {
      case 'generated':
        return 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200';
      case 'changed':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200';
      case 'reset':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
      case 'temporary':
        return 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200';
      case 'expired':
        return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
    }
  };

  const passwordKey = (doctorId, field) => `${doctorId}:${field}`;

  const togglePassword = async (record, field) => {
    const key = passwordKey(record.doctor_id, field);
    if (visiblePasswords[key]) {
      setVisiblePasswords((current) => ({ ...current, [key]: false }));
      return;
    }
    try {
      const result = await api.accessAdminDoctorPassword(record.doctor_id, field, 'view');
      setRevealedPasswords((current) => ({ ...current, [key]: result.password }));
      setVisiblePasswords((current) => ({ ...current, [key]: true }));
    } catch (accessError) {
      showToast('Password protected', accessError.message || 'This password cannot be revealed.');
    }
  };

  const copyPassword = async (record, field) => {
    try {
      const result = await api.accessAdminDoctorPassword(record.doctor_id, field, 'copy');
      await navigator.clipboard.writeText(result.password);
      showToast('Password copied successfully.', 'The temporary password is now on your clipboard.');
    } catch (copyError) {
      showToast('Password protected', copyError.message || 'Unable to copy this password.');
    }
  };

  const resetPassword = async (record, label = 'Password reset') => {
    setResettingId(record.doctor_id);
    try {
      const result = await api.resetAdminDoctorPassword(record.doctor_id);
      const key = passwordKey(record.doctor_id, 'current_password');
      setRevealedPasswords((current) => ({ ...current, [key]: result.generated_password }));
      setVisiblePasswords((current) => ({ ...current, [key]: true }));
      await loadPasswords(true);
      showToast(label, `New temporary password: ${result.generated_password}`);
    } catch (resetError) {
      showToast('Reset failed', resetError?.response?.data?.error || resetError?.message || 'Unable to reset password.');
    } finally {
      setResettingId(null);
    }
  };

  const openHistory = async (record) => {
    setHistoryDoctor(record);
    setHistoryLoading(true);
    try {
      const history = await api.getAdminDoctorPasswordHistory(record.doctor_id);
      setHistoryRows(history);
    } catch (historyError) {
      showToast('History unavailable', historyError?.response?.data?.error || historyError?.message || 'Unable to load history.');
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-8">
        <SectionHeader subtitle="Doctor password management" title="Track temporary passwords, resets, and doctor password changes." />

        <div className="rounded-[2rem] border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-xl">
          <div className="mb-6 grid gap-4 xl:grid-cols-[1fr_auto_auto] xl:items-center">
            <div>
              <p className="text-sm text-gray-500">
                Admin-visible passwords are limited to generated or reset temporary passwords. Doctor-chosen passwords are protected.
              </p>
              {error && (
                <div className="mt-3 rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-3xl border border-gray-200 bg-white/80 px-4 py-3 text-gray-900 outline-none backdrop-blur-sm"
            >
              {FILTERS.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
            </select>
            <label className="relative block">
              <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Search name, username, phone, or status"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full rounded-3xl border border-gray-200 bg-white/80 py-3 pl-11 pr-4 text-gray-900 outline-none backdrop-blur-sm xl:w-96"
              />
            </label>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex min-h-[220px] items-center justify-center py-16 text-gray-500">
                <div className="text-center">
                  <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-cyan-500"></div>
                  <p className="text-sm font-medium">Loading password records...</p>
                </div>
              </div>
            ) : (
              <table className="min-w-[1500px] text-left text-sm text-gray-600">
                <thead className="border-b border-gray-200 text-gray-500">
                  <tr>
                    <th className="px-4 py-4">Doctor ID</th>
                    <th className="px-4 py-4">Doctor Name</th>
                    <th className="px-4 py-4">Username</th>
                    <th className="px-4 py-4">Phone Number</th>
                    <th className="px-4 py-4">Generated Password</th>
                    <th className="px-4 py-4">Current Password</th>
                    <th className="px-4 py-4">Password Status</th>
                    <th className="px-4 py-4">Password Last Changed</th>
                    <th className="px-4 py-4">Changed By</th>
                    <th className="px-4 py-4">Account Created Date</th>
                    <th className="px-4 py-4">Last Login</th>
                    <th className="px-4 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => {
                    return (
                      <tr key={record.doctor_id} className="border-b border-gray-200 align-top hover:bg-slate-50">
                        <td className="px-4 py-4 font-semibold text-gray-900">{record.doctor_id}</td>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-gray-900">{record.doctor_name}</p>
                          {record.must_change_password && <p className="mt-1 text-xs text-amber-700">Change required on next login</p>}
                        </td>
                        <td className="px-4 py-4">{record.username || '-'}</td>
                        <td className="px-4 py-4">{record.phone || '-'}</td>
                        <td className="px-4 py-4"><PasswordField record={record} field="generated_password" available={record.generated_password_available} visible={visiblePasswords[passwordKey(record.doctor_id, 'generated_password')]} value={revealedPasswords[passwordKey(record.doctor_id, 'generated_password')]} onToggle={togglePassword} onCopy={copyPassword} /></td>
                        <td className="px-4 py-4"><PasswordField record={record} field="current_password" available={record.current_password_available} visible={visiblePasswords[passwordKey(record.doctor_id, 'current_password')]} value={revealedPasswords[passwordKey(record.doctor_id, 'current_password')]} onToggle={togglePassword} onCopy={copyPassword} unavailableLabel="Hashed after doctor change" /></td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase ${statusBadgeClass(record.password_status)}`}>
                            {record.password_status_label}
                          </span>
                        </td>
                        <td className="px-4 py-4">{formatDateTime(record.password_last_changed)}</td>
                        <td className="px-4 py-4">{record.changed_by || '-'}</td>
                        <td className="px-4 py-4">{formatDateTime(record.account_created_date)}</td>
                        <td className="px-4 py-4">{formatDateTime(record.last_login)}</td>
                        <td className="px-4 py-4">
                          <div className="flex min-w-[280px] flex-wrap gap-2">
                            <button type="button" disabled={resettingId === record.doctor_id} onClick={() => resetPassword(record, 'Password reset')} className="inline-flex items-center gap-2 rounded-3xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60" title="Reset Password">
                              <FiKey /> Reset
                            </button>
                            <button type="button" disabled={resettingId === record.doctor_id} onClick={() => resetPassword(record, 'New password generated')} className="inline-flex items-center gap-2 rounded-3xl bg-cyan-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-cyan-600 disabled:opacity-60" title="Generate New Password">
                              <FiRefreshCw /> Generate
                            </button>
                            <button type="button" onClick={() => openHistory(record)} className="inline-flex items-center gap-2 rounded-3xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50" title="View Change History">
                              <FiClock /> History
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan="12" className="px-4 py-8 text-center text-gray-500">No password records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {historyDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/20 bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-600">
                  <FiShield /> Password History
                </div>
                <h2 className="mt-2 text-2xl font-semibold text-gray-900">{historyDoctor.doctor_name}</h2>
              </div>
              <button type="button" onClick={() => setHistoryDoctor(null)} className="rounded-full border border-gray-200 bg-white p-2 text-gray-500 transition hover:bg-slate-50 hover:text-gray-700">
                <FiX />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-auto">
              {historyLoading ? (
                <div className="py-10 text-center text-gray-500">Loading history...</div>
              ) : (
                <table className="min-w-full text-left text-sm text-gray-600">
                  <thead className="border-b border-gray-200 text-gray-500">
                    <tr>
                      <th className="px-4 py-3">History ID</th>
                      <th className="px-4 py-3">Old Password</th>
                      <th className="px-4 py-3">New Password</th>
                      <th className="px-4 py-3">Changed By</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3">Change Date & Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.map((row) => (
                      <tr key={row.history_id} className="border-b border-gray-200">
                        <td className="px-4 py-3 font-semibold text-gray-900">{row.history_id}</td>
                        <td className="px-4 py-3 font-mono text-xs">{row.old_password || 'Protected'}</td>
                        <td className="px-4 py-3 font-mono text-xs">{row.new_password || 'Protected'}</td>
                        <td className="px-4 py-3">{row.changed_by}</td>
                        <td className="px-4 py-3">{row.reason}</td>
                        <td className="px-4 py-3">{formatDateTime(row.change_date)}</td>
                      </tr>
                    ))}
                    {historyRows.length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-gray-500">No password history found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PasswordField({ record, field, available, visible, value, onToggle, onCopy, unavailableLabel = 'Not available' }) {
  if (!available) {
    return <span className="text-xs text-slate-500">{unavailableLabel}</span>;
  }
  return (
    <div className="flex min-w-[210px] items-center gap-1">
      <span className="min-w-[108px] font-mono text-xs text-slate-800">{visible && value ? value : '************'}</span>
      <button type="button" onClick={() => onToggle(record, field)} className="rounded-md p-2 text-slate-600 transition hover:bg-slate-100" title={visible ? 'Hide password' : 'View password'} aria-label={visible ? 'Hide password' : 'View password'}>
        {visible ? <FiEyeOff /> : <FiEye />}
      </button>
      <button type="button" onClick={() => onCopy(record, field)} className="rounded-md p-2 text-slate-600 transition hover:bg-slate-100" title="Copy password" aria-label="Copy password">
        <FiCopy />
      </button>
    </div>
  );
}

export default DoctorPasswords;
