import { useEffect, useMemo, useState } from 'react';
import { FiDownloadCloud, FiEye, FiFileText, FiFilter, FiSearch, FiArrowUpRight, FiArrowDownRight, FiCalendar, FiUsers, FiShield, FiRefreshCcw } from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import Card from '../../components/Card.jsx';
import SectionHeader from '../../components/SectionHeader.jsx';
import { api } from '../../services/api.js';

const statusOptions = ['All', 'Draft', 'Completed', 'Pending', 'Archived'];
const typeOptions = ['All', 'Anxiety', 'Depression', 'Neutral', 'Wellness'];
const statusStyles = {
  Draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  Completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
  Pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
  Archived: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
};
const chartColors = ['#0ea5e9', '#22c55e', '#f97316', '#818cf8', '#38bdf8'];

function AdminReports() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalReports, setTotalReports] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backendStats, setBackendStats] = useState({
    totalReports: 0,
    generatedReports: 0,
    predictionAccuracy: 0,
    exportDownloads: 0,
  });
  const [chartData, setChartData] = useState({
    monthlyActivity: [],
    predictionTrends: [],
    userAnalytics: [],
    mentalHealthStats: [],
  });

  useEffect(() => {
    loadReports();
    loadReportStats();
    loadReportCharts();
  }, [page, statusFilter, typeFilter, startDate, endDate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadReports();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        search: searchQuery || undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        type: typeFilter !== 'All' ? typeFilter : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        page,
        limit,
      };
      const data = await api.getReports(params);
      setReports(Array.isArray(data.reports) ? data.reports : []);
      setTotalReports(data.total || 0);
    } catch (err) {
      setError(err.message || 'Unable to load reports.');
    } finally {
      setLoading(false);
    }
  };

  const loadReportStats = async () => {
    try {
      const stats = await api.getReportStats();
      setBackendStats(stats || {
        totalReports: 0,
        generatedReports: 0,
        predictionAccuracy: 0,
        exportDownloads: 0,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const loadReportCharts = async () => {
    try {
      const data = await api.getReportCharts();
      setChartData({
        monthlyActivity: Array.isArray(data.monthlyActivity) ? data.monthlyActivity : [],
        predictionTrends: Array.isArray(data.predictionTrends) ? data.predictionTrends : [],
        userAnalytics: Array.isArray(data.userAnalytics) ? data.userAnalytics : [],
        mentalHealthStats: Array.isArray(data.mentalHealthStats) ? data.mentalHealthStats : [],
      });
    } catch (err) {
      console.error(err);
    }
  };

  const openReport = async (reportId) => {
    setReportLoading(true);
    try {
      const report = await api.getReport(reportId);
      setSelectedReport(report);
    } catch (err) {
      setError(err.message || 'Unable to open report preview.');
    } finally {
      setReportLoading(false);
    }
  };

  const closePreview = () => {
    setSelectedReport(null);
  };

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const exportPdf = async (reportId) => {
    try {
      const blob = await api.exportReportPdf(reportId);
      downloadBlob(blob, `report-${reportId}.pdf`);
      loadReportStats();
    } catch (err) {
      setError(err.message || 'Report PDF export failed.');
    }
  };

  const exportCsv = async (reportId) => {
    try {
      const blob = await api.exportReportCsv(reportId);
      downloadBlob(blob, `report-${reportId}.csv`);
      loadReportStats();
    } catch (err) {
      setError(err.message || 'Report CSV export failed.');
    }
  };

  const downloadReport = async (reportId) => {
    await exportPdf(reportId);
  };

  const monthlyActivity = useMemo(() => {
    return chartData.monthlyActivity || [];
  }, [chartData.monthlyActivity]);

  const predictionTrendData = useMemo(() => {
    return chartData.predictionTrends || [];
  }, [chartData.predictionTrends]);

  const userAnalyticsData = useMemo(() => {
    return chartData.userAnalytics || [];
  }, [chartData.userAnalytics]);

  const mentalHealthData = useMemo(() => {
    return chartData.mentalHealthStats || [];
  }, [chartData.mentalHealthStats]);

  const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-10 pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <SectionHeader subtitle="Admin reports" title="Premium report insights, export tools, and operational analytics." />
        <button
          type="button"
          onClick={loadReports}
          className="inline-flex items-center gap-2 rounded-3xl bg-gradient-to-r from-sky-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-sky-600 hover:to-cyan-500"
        >
          <FiRefreshCcw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card
          title="Total Reports"
          value={backendStats.totalReports}
          description="All generated admin reports across the application."
          icon={<FiFileText className="h-6 w-6" />}
        />
        <Card
          title="Generated Reports"
          value={backendStats.generatedReports}
          description="Finalized reports ready for review and export."
          icon={<FiUsers className="h-6 w-6" />}
        />
        <Card
          title="Prediction Accuracy"
          value={`${backendStats.predictionAccuracy}%`}
          description="Overall report confidence based on prediction score history."
          icon={<FiShield className="h-6 w-6" />}
        />
        <Card
          title="Export Downloads"
          value={backendStats.exportDownloads}
          description="Total PDF/CSV downloads by admin users."
          icon={<FiDownloadCloud className="h-6 w-6" />}
        />
      </div>

      <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-6 shadow-xl backdrop-blur-xl transition-colors duration-300 dark:border-slate-700 dark:bg-slate-950/80">
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr] xl:grid-cols-[2fr_1fr]">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[1.75rem] border border-slate-200/70 bg-slate-50 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Search reports</p>
              <div className="mt-3 flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-950">
                <FiSearch className="h-5 w-5 text-sky-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by user, id, or type"
                  className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200/70 bg-slate-50 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Status</p>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="mt-3 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200/70 bg-slate-50 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Type</p>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="mt-3 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                {typeOptions.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[1.75rem] border border-slate-200/70 bg-slate-50 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">From</p>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-3 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <div className="rounded-[1.75rem] border border-slate-200/70 bg-slate-50 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">To</p>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-3 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-6 shadow-xl backdrop-blur-xl transition-colors duration-300 dark:border-slate-700 dark:bg-slate-950/80">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-sky-600 dark:text-sky-300">Monthly Activity</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">Report Volume</h2>
            </div>
            <FiCalendar className="h-8 w-8 text-sky-500" />
          </div>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    border: '1px solid rgba(148,163,184,0.2)',
                    borderRadius: '1rem',
                    color: '#0f172a',
                    backdropFilter: 'blur(10px)',
                  }}
                  labelStyle={{ color: '#0f172a' }}
                />
                <Line type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 5, fill: '#0ea5e9' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-6 shadow-xl backdrop-blur-xl transition-colors duration-300 dark:border-slate-700 dark:bg-slate-950/80">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-sky-600 dark:text-sky-300">Prediction Trends</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">Insight Mix</h2>
            </div>
            <FiArrowUpRight className="h-8 w-8 text-emerald-500" />
          </div>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={predictionTrendData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={4}>
                  {predictionTrendData.map((entry, index) => (
                    <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    border: '1px solid rgba(148,163,184,0.2)',
                    borderRadius: '1rem',
                    color: '#0f172a',
                    backdropFilter: 'blur(10px)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-6 shadow-xl backdrop-blur-xl transition-colors duration-300 dark:border-slate-700 dark:bg-slate-950/80">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-sky-600 dark:text-sky-300">User Analytics</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">Top Reviewers</h2>
            </div>
            <FiUsers className="h-8 w-8 text-sky-500" />
          </div>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userAnalyticsData} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 12 }} />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    border: '1px solid rgba(148,163,184,0.2)',
                    borderRadius: '1rem',
                    color: '#0f172a',
                    backdropFilter: 'blur(10px)',
                  }}
                />
                <Bar dataKey="value" fill="#38bdf8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-6 shadow-xl backdrop-blur-xl transition-colors duration-300 dark:border-slate-700 dark:bg-slate-950/80">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Reports library</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Latest report activity</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">Showing {reports.length} of {totalReports}</span>
            <button
              type="button"
              onClick={() => { setPage(1); loadReports(); }}
              className="inline-flex items-center gap-2 rounded-3xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <FiFilter className="h-4 w-4" /> Apply filters
            </button>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-3 text-left text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                <th className="rounded-l-3xl px-5 py-4">Report ID</th>
                <th className="px-5 py-4">User Name</th>
                <th className="px-5 py-4">Prediction Type</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Date</th>
                <th className="rounded-r-3xl px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-5 py-8 text-center text-slate-500 dark:text-slate-400">Loading reports...</td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-8 text-center text-slate-500 dark:text-slate-400">No reports match your filters.</td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="transform rounded-[2rem] border border-slate-200/80 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-950/80">
                    <td className="px-5 py-5 text-slate-900 dark:text-slate-100">{report.report_id}</td>
                    <td className="px-5 py-5 text-slate-700 dark:text-slate-300">{report.user_name || 'N/A'}</td>
                    <td className="px-5 py-5 text-slate-700 dark:text-slate-300">{report.prediction_type || 'Neutral'}</td>
                    <td className="px-5 py-5">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[report.status] || statusStyles.Draft}`}>
                        {report.status || 'Draft'}
                      </span>
                    </td>
                    <td className="px-5 py-5 text-slate-700 dark:text-slate-300">{formatDate(report.created_at)}</td>
                    <td className="px-5 py-5">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openReport(report.id)}
                          className="inline-flex items-center gap-2 rounded-3xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                          <FiEye className="h-4 w-4" /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => exportPdf(report.id)}
                          className="inline-flex items-center gap-2 rounded-3xl bg-gradient-to-r from-sky-500 to-cyan-400 px-3 py-2 text-xs font-semibold text-white transition hover:from-sky-600 hover:to-cyan-500"
                        >
                          <FiDownloadCloud className="h-4 w-4" /> PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => exportCsv(report.id)}
                          className="inline-flex items-center gap-2 rounded-3xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                          <FiFileText className="h-4 w-4" /> CSV
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalReports > limit && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
            <span>Page {page} of {Math.ceil(totalReports / limit)}</span>
            <div className="inline-flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="rounded-3xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >Previous</button>
              <button
                type="button"
                onClick={() => setPage((current) => current + 1)}
                disabled={page >= Math.ceil(totalReports / limit)}
                className="rounded-3xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >Next</button>
            </div>
          </div>
        )}
      </div>

      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="relative w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-sky-600 dark:text-sky-300">Report preview</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{selectedReport.report_id}</h2>
              </div>
              <button
                type="button"
                onClick={closePreview}
                className="rounded-3xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>
            <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-6">
                <div className="rounded-[1.75rem] border border-slate-200/70 bg-slate-50 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">User information</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Name</p>
                      <p className="mt-2 text-sm text-slate-900 dark:text-slate-100">{selectedReport.user_name || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Status</p>
                      <p className="mt-2 text-sm text-slate-900 dark:text-slate-100">{selectedReport.status || 'Draft'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Created</p>
                      <p className="mt-2 text-sm text-slate-900 dark:text-slate-100">{formatDate(selectedReport.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Prediction</p>
                      <p className="mt-2 text-sm text-slate-900 dark:text-slate-100">{selectedReport.prediction_type || 'Neutral'}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-slate-200/70 bg-slate-50 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Report summary</h3>
                  <p className="mt-4 text-sm leading-7 text-slate-700 dark:text-slate-300">{selectedReport.summary || 'No report summary available yet.'}</p>
                </div>

                <div className="rounded-[1.75rem] border border-slate-200/70 bg-slate-50 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Details & notes</h3>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[selectedReport.status] || statusStyles.Draft}`}>
                      {selectedReport.status || 'Draft'}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-700 dark:text-slate-300">{selectedReport.admin_notes || 'Admin notes not available.'}</p>
                </div>

                <div className="rounded-[1.75rem] border border-slate-200/70 bg-slate-50 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Report insights</h3>
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-between rounded-3xl bg-white px-4 py-3 shadow-sm dark:bg-slate-950">
                      <span className="text-sm text-slate-700 dark:text-slate-300">Risk level</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {selectedReport.report_data?.riskLevel || selectedReport.prediction_type || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-3xl bg-white px-4 py-3 shadow-sm dark:bg-slate-950">
                      <span className="text-sm text-slate-700 dark:text-slate-300">Confidence</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {selectedReport.report_data?.confidence != null ? `${selectedReport.report_data.confidence}%` : `${selectedReport.prediction_confidence || 0}%`}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Recommendations</p>
                      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700 dark:text-slate-300">
                        {selectedReport.report_data?.recommendations?.length ? (
                          selectedReport.report_data.recommendations.map((recommendation, index) => (
                            <li key={index}>{recommendation}</li>
                          ))
                        ) : (
                          <li>No recommendations available.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[1.75rem] border border-slate-200/70 bg-slate-50 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Doctor / Admin info</h3>
                  <div className="mt-4 grid gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Doctor</p>
                      <p className="mt-2">{selectedReport.doctor_name || 'Not assigned'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Confidence</p>
                      <p className="mt-2">{selectedReport.prediction_confidence ? `${selectedReport.prediction_confidence}%` : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Report ID</p>
                      <p className="mt-2">{selectedReport.report_id}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-slate-200/70 bg-slate-50 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Analytics snapshot</h3>
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-between rounded-3xl bg-white px-4 py-3 shadow-sm dark:bg-slate-950">
                      <span className="text-sm text-slate-700 dark:text-slate-300">Download score</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedReport.downloads || 0}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-3xl bg-white px-4 py-3 shadow-sm dark:bg-slate-950">
                      <span className="text-sm text-slate-700 dark:text-slate-300">Prediction confidence</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedReport.prediction_confidence || 0}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 px-6 py-5 dark:border-slate-800">
              <button
                type="button"
                onClick={() => exportPdf(selectedReport.id)}
                disabled={reportLoading}
                className="inline-flex items-center gap-2 rounded-3xl bg-gradient-to-r from-sky-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-white transition hover:from-sky-600 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiDownloadCloud className="h-4 w-4" /> Export PDF
              </button>
              <button
                type="button"
                onClick={() => exportCsv(selectedReport.id)}
                disabled={reportLoading}
                className="inline-flex items-center gap-2 rounded-3xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiFileText className="h-4 w-4" /> Export CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700 dark:border-rose-600/40 dark:bg-rose-950/60 dark:text-rose-200">
          {error}
        </div>
      )}
    </div>
  );
}

export default AdminReports;
