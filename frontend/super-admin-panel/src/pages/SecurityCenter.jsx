import React, { useEffect, useMemo, useState } from 'react';
import { superAdminApi } from '../services/api';
import { Activity, AlertTriangle, Lock, RefreshCw, Search, Shield, UserCheck, UserX } from 'lucide-react';

const statusStyles = {
  SUCCESS: 'bg-emerald-500/15 text-emerald-600',
  FAILED: 'bg-red-500/15 text-red-500',
  BLOCKED: 'bg-amber-500/15 text-amber-600',
  LOCKED: 'bg-slate-500/15 text-slate-600 dark:text-slate-300',
};

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

const SecurityCenter = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadSecurityStats = async () => {
    setLoading(true);
    const data = await superAdminApi.getSecurityStats();
    setStats(data);
    setLoading(false);
  };

  useEffect(() => {
    loadSecurityStats();
  }, []);

  const attempts = useMemo(() => {
    const search = query.trim().toLowerCase();
    return (stats?.loginAttempts || []).filter((attempt) => {
      const status = String(attempt.status || '').toUpperCase();
      const matchesStatus = statusFilter === 'ALL' || status === statusFilter;
      const matchesSearch = !search || [
        attempt.username,
        attempt.role,
        attempt.ip_address,
        attempt.browser,
        attempt.device,
        attempt.platform,
        attempt.description,
      ].some((value) => String(value || '').toLowerCase().includes(search));
      return matchesStatus && matchesSearch;
    });
  }, [stats, query, statusFilter]);

  if (loading) {
    return <div className="text-slate-600 dark:text-slate-400">Loading security data...</div>;
  }

  const cards = [
    { label: 'Total Login Attempts', value: stats?.totalLoginAttempts, icon: Activity, tone: 'bg-primary/15 text-primary' },
    { label: 'Successful Logins', value: stats?.successfulLogins, icon: UserCheck, tone: 'bg-emerald-500/15 text-emerald-600' },
    { label: 'Failed Logins', value: stats?.failedLogins, icon: AlertTriangle, tone: 'bg-red-500/15 text-red-500' },
    { label: 'Blocked Access Attempts', value: stats?.blockedAccessAttempts, icon: Shield, tone: 'bg-amber-500/15 text-amber-600' },
    { label: 'Locked Accounts', value: stats?.lockedAccounts || stats?.blockedAccounts, icon: Lock, tone: 'bg-slate-500/15 text-slate-600 dark:text-slate-300' },
    { label: 'Active Sessions', value: stats?.activeSessions, icon: UserX, tone: 'bg-teal-500/15 text-teal-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold dark:text-slate-50 text-slate-900">Security Center</h2>
          <p className="mt-2 dark:text-slate-400 text-slate-600">Monitor login attempts, blocked access, locked accounts, and active sessions</p>
        </div>
        <button onClick={loadSecurityStats} className="premium-button-primary inline-flex items-center gap-2 px-5 py-3">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <div className="premium-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-6 dark:border-slate-700 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="text-xl font-bold dark:text-slate-50 text-slate-900">Login Attempt Tracking</h3>
            <p className="mt-1 text-sm dark:text-slate-400 text-slate-600">SUCCESS, FAILED, BLOCKED, and LOCKED authentication events</p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search security logs..."
                className="premium-input min-w-[280px] pl-12"
              />
            </div>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="premium-input md:w-44">
              {['ALL', 'SUCCESS', 'FAILED', 'BLOCKED', 'LOCKED'].map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px]">
            <thead className="dark:bg-slate-800 bg-slate-100">
              <tr>
                {['Username', 'Role', 'IP Address', 'Browser', 'Device', 'Platform', 'Date/Time', 'Status'].map((heading) => (
                  <th key={heading} className="px-6 py-4 text-left text-sm font-bold dark:text-slate-300 text-slate-600">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {attempts.map((attempt, index) => {
                const status = String(attempt.status || 'FAILED').toUpperCase();
                return (
                  <tr key={`${attempt.username}-${attempt.timestamp}-${index}`} className="dark:hover:bg-slate-800/60 hover:bg-slate-50">
                    <td className="px-6 py-4 font-semibold dark:text-slate-50 text-slate-900">{attempt.username || 'Unknown'}</td>
                    <td className="px-6 py-4 dark:text-slate-300 text-slate-700">{attempt.role || '-'}</td>
                    <td className="px-6 py-4 dark:text-slate-300 text-slate-700">{attempt.ip_address || '-'}</td>
                    <td className="px-6 py-4 dark:text-slate-300 text-slate-700">{attempt.browser || '-'}</td>
                    <td className="px-6 py-4 dark:text-slate-300 text-slate-700">{attempt.device || '-'}</td>
                    <td className="px-6 py-4 dark:text-slate-300 text-slate-700">{attempt.platform || '-'}</td>
                    <td className="px-6 py-4 dark:text-slate-300 text-slate-700">{attempt.timestamp || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusStyles[status] || statusStyles.FAILED}`}>{status}</span>
                    </td>
                  </tr>
                );
              })}
              {attempts.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-6 py-10 text-center dark:text-slate-400 text-slate-600">No security events found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SecurityCenter;
