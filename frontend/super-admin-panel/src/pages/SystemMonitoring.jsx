import React, { useEffect, useState } from 'react';
import { Activity, Database, HardDrive, MemoryStick, RefreshCw, Server, Wifi, Cpu } from 'lucide-react';
import { superAdminApi } from '../services/api';

const formatUptime = (seconds = 0) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
};

const MetricCard = ({ title, value, icon: Icon, tone = 'text-primary', suffix = '' }) => (
  <div className="premium-card p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold dark:text-slate-400 text-slate-600">{title}</p>
        <p className="mt-3 text-3xl font-bold dark:text-slate-50 text-slate-900">
          {value}{suffix}
        </p>
      </div>
      <div className={`rounded-2xl bg-slate-500/10 p-4 ${tone}`}>
        <Icon className="h-7 w-7" />
      </div>
    </div>
  </div>
);

const SystemMonitoring = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMetrics = async () => {
    setLoading(true);
    const data = await superAdminApi.getSystemMonitoring();
    setMetrics(data);
    setLoading(false);
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  if (loading) {
    return <div className="text-slate-600 dark:text-slate-400">Loading system monitoring...</div>;
  }

  const statusRows = [
    { label: 'API Status', value: metrics?.apiStatus || 'unknown', icon: Wifi },
    { label: 'Database Status', value: metrics?.databaseStatus || 'unknown', icon: Database },
    { label: 'Server Health', value: metrics?.serverHealth || 'unknown', icon: Server },
    { label: 'Platform', value: metrics?.platform || '-', icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold dark:text-slate-50 text-slate-900">System Monitoring</h2>
          <p className="mt-2 dark:text-slate-400 text-slate-600">Live infrastructure status for IT administrators</p>
        </div>
        <button onClick={loadMetrics} className="premium-button-primary inline-flex items-center gap-2 px-5 py-3">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="CPU Usage" value={Number(metrics?.cpuUsage || 0).toFixed(1)} suffix="%" icon={Cpu} tone="text-primary" />
        <MetricCard title="Memory Usage" value={Number(metrics?.memoryUsage || 0).toFixed(1)} suffix="%" icon={MemoryStick} tone="text-amber-500" />
        <MetricCard title="Storage Usage" value={Number(metrics?.storageUsage || 0).toFixed(1)} suffix="%" icon={HardDrive} tone="text-emerald-500" />
        <MetricCard title="System Uptime" value={formatUptime(metrics?.systemUptime)} icon={Activity} tone="text-teal-500" />
      </div>

      <div className="premium-card overflow-hidden">
        <div className="border-b border-slate-200 p-6 dark:border-slate-700">
          <h3 className="text-xl font-bold dark:text-slate-50 text-slate-900">Service Status</h3>
          <p className="mt-1 text-sm dark:text-slate-400 text-slate-600">Last checked {metrics?.checkedAt || 'just now'}</p>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {statusRows.map((row) => {
            const Icon = row.icon;
            const healthy = ['online', 'healthy'].includes(String(row.value).toLowerCase());
            return (
              <div key={row.label} className="flex items-center justify-between p-5">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="font-semibold dark:text-slate-50 text-slate-900">{row.label}</span>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${healthy ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'}`}>
                  {row.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SystemMonitoring;
