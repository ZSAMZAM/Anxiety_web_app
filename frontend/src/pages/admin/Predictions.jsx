import { useEffect, useMemo, useState } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiBarChart2,
  FiCalendar,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiTrendingUp,
} from 'react-icons/fi';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import SectionHeader from '../../components/SectionHeader.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { api } from '../../services/api.js';

const resultOptions = ['all', 'Anxiety', 'Depression', 'Neutral'];

const normalizeResult = (value) => {
  const label = String(value || 'Unknown');
  const lower = label.toLowerCase();
  if (lower.includes('anxiety')) return 'Anxiety';
  if (lower.includes('depression')) return 'Depression';
  if (lower.includes('neutral')) return 'Neutral';
  return label;
};

const resultStyle = (value) => {
  const result = normalizeResult(value);
  if (result === 'Anxiety') return 'bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-300/20';
  if (result === 'Depression') return 'bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-400/10 dark:text-rose-200 dark:ring-rose-300/20';
  if (result === 'Neutral') return 'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-300/20';
  return 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:ring-white/10';
};

const formatConfidence = (value) => {
  const numeric = Number(value || 0);
  return `${Math.round(numeric > 1 ? numeric : numeric * 100)}%`;
};

function AdminPredictions() {
  const { t } = useLanguage();
  const [predictions, setPredictions] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 10 });
  const [filters, setFilters] = useState({
    result: 'all',
    date_from: '',
    date_to: '',
    confidence_min: '',
    page: 1,
    limit: 10,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [predictionData, statData] = await Promise.all([
        api.getAdminPredictions(filters),
        api.getAdminPredictionStats(),
      ]);
      setPredictions(predictionData.predictions || []);
      setPagination({
        page: predictionData.page || 1,
        pages: predictionData.pages || 1,
        total: predictionData.total || 0,
        limit: predictionData.limit || filters.limit,
      });
      setStats(statData);
    } catch (err) {
      setError(err.message || 'Unable to load assessment predictions.');
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: key === 'page' ? value : 1 }));
  };

  const normalizedCounts = useMemo(() => {
    const counts = { Anxiety: 0, Depression: 0, Neutral: 0, Other: 0 };
    Object.entries(stats?.result_counts || {}).forEach(([key, value]) => {
      const normalized = normalizeResult(key);
      if (counts[normalized] !== undefined) counts[normalized] += Number(value || 0);
      else counts.Other += Number(value || 0);
    });
    return counts;
  }, [stats]);

  const distributionData = useMemo(
    () => [
      { name: 'Anxiety', value: normalizedCounts.Anxiety, color: '#F59E0B' },
      { name: 'Depression', value: normalizedCounts.Depression, color: '#F43F5E' },
      { name: 'Neutral', value: normalizedCounts.Neutral, color: '#10B981' },
      { name: 'Other', value: normalizedCounts.Other, color: '#64748B' },
    ].filter((item) => item.value > 0),
    [normalizedCounts],
  );

  const filteredPredictions = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return predictions;
    return predictions.filter((prediction) => {
      return [
        prediction.user_name,
        prediction.user_phone,
        prediction.prediction_result,
        prediction.input_text,
      ].some((value) => String(value || '').toLowerCase().includes(search));
    });
  }, [predictions, searchTerm]);

  const totalAssessments = Object.values(normalizedCounts).reduce((sum, value) => sum + value, 0);
  const recentCount = (stats?.daily_predictions || []).slice(-7).reduce((sum, item) => sum + Number(item.count || 0), 0);
  const highRiskCount = stats?.high_risk_users?.length || 0;

  const cards = [
    { label: t('totalAssessments'), value: totalAssessments, icon: FiActivity, color: 'from-sky-500 to-cyan-400' },
    { label: t('recentAssessments'), value: recentCount, icon: FiTrendingUp, color: 'from-cyan-500 to-teal-400' },
    { label: t('highRiskUsers'), value: highRiskCount, icon: FiAlertTriangle, color: 'from-amber-500 to-orange-400' },
    { label: t('neutralResults'), value: normalizedCounts.Neutral, icon: FiShield, color: 'from-emerald-500 to-teal-400' },
  ];

  return (
    <div className="space-y-8">
      <SectionHeader subtitle={t('assessmentMonitoring')} title={t('predictionDashboardTitle')} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-5 shadow-xl shadow-slate-200/60 backdrop-blur-xl dark:border-white/10 dark:bg-[#1E293B]/88 dark:shadow-black/20">
              <div className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${card.color} text-white shadow-lg`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-300">{card.label}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">{card.value}</p>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur-xl dark:border-white/10 dark:bg-[#1E293B]/88 dark:shadow-black/20">
          <div className="mb-6 flex items-center gap-3">
            <FiBarChart2 className="h-5 w-5 text-sky-500" />
            <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{t('dailyAssessments')}</h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.daily_predictions || []}>
                <defs>
                  <linearGradient id="assessmentGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid rgba(148,163,184,0.25)' }} />
                <Area type="monotone" dataKey="count" stroke="#0EA5E9" strokeWidth={3} fill="url(#assessmentGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur-xl dark:border-white/10 dark:bg-[#1E293B]/88 dark:shadow-black/20">
          <div className="mb-6 flex items-center gap-3">
            <FiActivity className="h-5 w-5 text-sky-500" />
            <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{t('resultDistribution')}</h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distributionData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={96} paddingAngle={4}>
                  {distributionData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid rgba(148,163,184,0.25)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {distributionData.map((item) => (
              <div key={item.name} className="rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900/50">
                <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="font-medium text-slate-700 dark:text-slate-200">{item.name}</span>
                <span className="float-right text-slate-500 dark:text-slate-300">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-5 shadow-xl shadow-slate-200/60 backdrop-blur-xl dark:border-white/10 dark:bg-[#1E293B]/88 dark:shadow-black/20">
        <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_160px_150px_150px_auto]">
          <label className="relative">
            <FiSearch className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t('searchAssessments')}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-white/10 dark:bg-slate-950/50 dark:text-white dark:focus:ring-sky-400/10"
            />
          </label>
          <select value={filters.result} onChange={(event) => updateFilter('result', event.target.value)} className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none dark:border-white/10 dark:bg-slate-950/50 dark:text-white">
            {resultOptions.map((option) => <option key={option} value={option}>{option === 'all' ? t('allResults') : option}</option>)}
          </select>
          <input type="date" value={filters.date_from} onChange={(event) => updateFilter('date_from', event.target.value)} className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none dark:border-white/10 dark:bg-slate-950/50 dark:text-white" />
          <input type="date" value={filters.date_to} onChange={(event) => updateFilter('date_to', event.target.value)} className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none dark:border-white/10 dark:bg-slate-950/50 dark:text-white" />
          <button onClick={loadData} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-400 px-5 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:-translate-y-0.5">
            <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                <th className="px-4 py-4">{t('patient')}</th>
                <th className="px-4 py-4">{t('result')}</th>
                <th className="px-4 py-4">{t('confidence')}</th>
                <th className="px-4 py-4">{t('assessmentText')}</th>
                <th className="px-4 py-4">{t('date')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-4 py-12 text-center text-slate-500 dark:text-slate-300">{t('loading')}</td>
                </tr>
              ) : filteredPredictions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-12 text-center text-slate-500 dark:text-slate-300">{t('noAssessments')}</td>
                </tr>
              ) : filteredPredictions.map((prediction) => (
                <tr key={prediction.id} className="transition hover:bg-sky-50/70 dark:hover:bg-white/5">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-900 dark:text-white">{prediction.user_name || t('unknownPatient')}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{prediction.user_phone || `#${prediction.user_id || prediction.id}`}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${resultStyle(prediction.prediction_result)}`}>
                      {prediction.prediction_result || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-900 dark:text-white">{formatConfidence(prediction.confidence_score)}</td>
                  <td className="max-w-md px-4 py-4 text-slate-600 dark:text-slate-300">
                    <span className="line-clamp-2">{prediction.input_text || '-'}</span>
                  </td>
                  <td className="px-4 py-4 text-slate-500 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <FiCalendar className="h-4 w-4" />
                      {prediction.created_at ? new Date(prediction.created_at).toLocaleString() : '-'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 text-sm text-slate-500 dark:border-white/10 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
          <span>{pagination.total} {t('assessments')}</span>
          <div className="flex gap-2">
            <button disabled={pagination.page <= 1} onClick={() => updateFilter('page', pagination.page - 1)} className="rounded-xl border border-slate-200 px-4 py-2 font-medium disabled:opacity-40 dark:border-white/10">
              {t('previous')}
            </button>
            <button disabled={pagination.page >= pagination.pages} onClick={() => updateFilter('page', pagination.page + 1)} className="rounded-xl border border-slate-200 px-4 py-2 font-medium disabled:opacity-40 dark:border-white/10">
              {t('next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPredictions;
