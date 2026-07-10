import { useEffect, useMemo, useState } from 'react';
import {
  FiActivity,
  FiBarChart2,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiColumns,
  FiCreditCard,
  FiDownload,
  FiEye,
  FiFileText,
  FiFilter,
  FiPrinter,
  FiRefreshCcw,
  FiSearch,
  FiTrash2,
  FiX,
} from 'react-icons/fi';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../../services/api.js';

const statusOptions = ['All', 'Pending', 'Reviewed', 'Approved'];
const predictionOptions = ['All', 'Anxiety', 'Depression', 'Normal'];
const riskOptions = ['All', 'High', 'Medium', 'Low'];
const pageSizeOptions = [10, 15, 25, 50];
const reportCategoryOptions = [
  { key: 'All', label: 'All Reports', description: 'Every generated report', icon: FiFileText },
  { key: 'Prediction', label: 'Prediction Reports', description: 'Assessment and model results', icon: FiActivity },
  { key: 'Appointments', label: 'Appointment Reports', description: 'Bookings and clinical visits', icon: FiCalendar },
  { key: 'Payments', label: 'Payment Reports', description: 'Transactions and exports', icon: FiCreditCard },
];

const columnConfig = [
  { key: 'report_id', label: 'Report ID' },
  { key: 'patient', label: 'Patient' },
  { key: 'doctor', label: 'Doctor' },
  { key: 'report_type', label: 'Report Type' },
  { key: 'prediction', label: 'Prediction' },
  { key: 'risk', label: 'Risk Level' },
  { key: 'confidence', label: 'Confidence' },
  { key: 'created_at', label: 'Created Date' },
  { key: 'status', label: 'Status' },
  { key: 'exports', label: 'Export Count' },
  { key: 'last_download', label: 'Last Download' },
];

const predictionBadge = {
  Anxiety: 'bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-500/15 dark:text-purple-200 dark:ring-purple-400/30',
  Depression: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-rose-400/30',
  Normal: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/30',
};

const riskBadge = {
  High: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/15 dark:text-red-200 dark:ring-red-400/30',
  Medium: 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/15 dark:text-orange-200 dark:ring-orange-400/30',
  Low: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/30',
};

const statusBadge = {
  Pending: 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/15 dark:text-orange-200 dark:ring-orange-400/30',
  Reviewed: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-200 dark:ring-blue-400/30',
  Approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/30',
};

const chartColors = ['#2563EB', '#1DA1F2', '#8B5CF6', '#EF4444', '#F97316', '#22C55E'];

const emptyFilters = {
  search: '',
  status: 'All',
  prediction: 'All',
  risk: 'All',
  startDate: '',
  endDate: '',
};

function AdminReports() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(() => columnConfig.reduce((acc, column) => ({ ...acc, [column.key]: true }), {}));
  const [showColumns, setShowColumns] = useState(false);
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [activeReportCategory, setActiveReportCategory] = useState('All');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [totalReports, setTotalReports] = useState(0);
  const [pages, setPages] = useState(1);
  const [sort, setSort] = useState({ key: 'created_at', direction: 'desc' });
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [stats, setStats] = useState({ totalReports: 0, generatedReports: 0, predictionAccuracy: 0, exportDownloads: 0 });
  const [chartData, setChartData] = useState({ monthlyActivity: [], predictionTrends: [], userAnalytics: [], mentalHealthStats: [] });

  useEffect(() => {
    loadReports();
  }, [page, limit, appliedFilters, activeReportCategory]);

  useEffect(() => {
    loadReportStats();
    loadReportCharts();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdminReports({
        search: appliedFilters.search || undefined,
        status: mapStatusForApi(appliedFilters.status),
        type: mapPredictionForApi(appliedFilters.prediction),
        report_category: activeReportCategory !== 'All' ? activeReportCategory : undefined,
        start_date: appliedFilters.startDate || undefined,
        end_date: appliedFilters.endDate || undefined,
        page,
        limit,
      });
      setReports(Array.isArray(data.reports) ? data.reports : []);
      setTotalReports(data.total || 0);
      setPages(data.pages || Math.max(1, Math.ceil((data.total || 0) / limit)));
    } catch (err) {
      setError(err.message || 'Unable to load reports.');
    } finally {
      setLoading(false);
    }
  };

  const loadReportStats = async () => {
    const data = await api.getReportStats();
    setStats(data || {});
  };

  const loadReportCharts = async () => {
    const data = await api.getReportCharts();
    setChartData({
      monthlyActivity: Array.isArray(data.monthlyActivity) ? data.monthlyActivity : [],
      predictionTrends: Array.isArray(data.predictionTrends) ? data.predictionTrends : [],
      userAnalytics: Array.isArray(data.userAnalytics) ? data.userAnalytics : [],
      mentalHealthStats: Array.isArray(data.mentalHealthStats) ? data.mentalHealthStats : [],
    });
  };

  const refreshAll = async () => {
    await Promise.all([loadReports(), loadReportStats(), loadReportCharts()]);
  };

  const normalizedReports = useMemo(() => reports.map(normalizeReport), [reports]);

  const filteredReports = useMemo(() => {
    return normalizedReports.filter((report) => {
      const categoryMatches = activeReportCategory === 'All' || report.category === activeReportCategory;
      const riskMatches = appliedFilters.risk === 'All' || report.risk === appliedFilters.risk;
      return categoryMatches && riskMatches;
    });
  }, [normalizedReports, activeReportCategory, appliedFilters.risk]);

  const sortedReports = useMemo(() => {
    return [...filteredReports].sort((a, b) => {
      const left = getSortValue(a, sort.key);
      const right = getSortValue(b, sort.key);
      if (left < right) return sort.direction === 'asc' ? -1 : 1;
      if (left > right) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredReports, sort]);

  const visibleColumnList = useMemo(() => columnConfig.filter((column) => visibleColumns[column.key]), [visibleColumns]);

  const todayReports = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return normalizedReports.filter((report) => toIsoDate(report.created_at) === today).length;
  }, [normalizedReports]);

  const highRiskCases = useMemo(() => normalizedReports.filter((report) => report.risk === 'High').length, [normalizedReports]);
  const pendingReviews = useMemo(() => normalizedReports.filter((report) => report.status === 'Pending').length, [normalizedReports]);
  const exportsThisMonth = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    return normalizedReports.reduce((sum, report) => sum + (toIsoDate(report.updated_at).startsWith(month) ? report.exports : 0), 0);
  }, [normalizedReports]);

  const averageConfidence = useMemo(() => {
    const values = normalizedReports.map((report) => report.confidence).filter((value) => Number.isFinite(value));
    if (!values.length) return stats.predictionAccuracy || 0;
    return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
  }, [normalizedReports, stats.predictionAccuracy]);

  const riskDistribution = useMemo(() => {
    const counts = normalizedReports.reduce((acc, report) => ({ ...acc, [report.risk]: (acc[report.risk] || 0) + 1 }), {});
    return ['High', 'Medium', 'Low'].map((name) => ({ name, value: counts[name] || 0 }));
  }, [normalizedReports]);

  const topDoctors = useMemo(() => {
    const counts = normalizedReports.reduce((acc, report) => {
      const name = report.doctor || 'Unassigned';
      return { ...acc, [name]: (acc[name] || 0) + 1 };
    }, {});
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [normalizedReports]);

  const recentActivity = useMemo(() => {
    return normalizedReports.slice(0, 5).map((report) => ({
      id: report.id,
      title: `${report.report_id} ${report.status.toLowerCase()}`,
      detail: `${report.patient} - ${report.prediction} - ${report.confidence}% confidence`,
      date: formatDate(report.updated_at || report.created_at),
    }));
  }, [normalizedReports]);

  const handleSort = (key) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const applyFilters = () => {
    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
      setError('Start date cannot be after end date.');
      return;
    }
    setError(null);
    setPage(1);
    setAppliedFilters(filters);
  };

  const resetFilters = () => {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPage(1);
  };

  const openReport = async (reportId) => {
    setDetailLoading(true);
    setError(null);
    try {
      const report = await api.getAdminReport(reportId);
      setSelectedReport(report ? normalizeReport(report) : null);
    } catch (err) {
      setError(err.message || 'Unable to open report details.');
    } finally {
      setDetailLoading(false);
    }
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
      await refreshAll();
    } catch (err) {
      setError(err.message || 'Report PDF export failed.');
    }
  };

  const exportCsv = async (reportId) => {
    try {
      const blob = await api.exportReportCsv(reportId);
      downloadBlob(blob, `report-${reportId}.csv`);
      await refreshAll();
    } catch (err) {
      setError(err.message || 'Report CSV export failed.');
    }
  };

  const exportVisibleCsv = () => {
    if (!sortedReports.length) {
      setNotice('There are no reports to export.');
      return;
    }
    const csv = [
      ['Report ID', 'Patient', 'Doctor', 'Report Type', 'Prediction', 'Risk Level', 'Confidence', 'Created Date', 'Status', 'Export Count', 'Last Download'].join(','),
      ...sortedReports.map((report) => [
        report.report_id,
        report.patient,
        report.doctor,
        report.report_type,
        report.prediction,
        report.risk,
        `${report.confidence}%`,
        formatDate(report.created_at),
        report.status,
        report.exports,
        formatDate(report.last_download),
      ].map(csvEscape).join(',')),
    ].join('\n');
    downloadBlob(new Blob([csv], { type: 'text/csv' }), `reports-${activeReportCategory.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const generateReport = async () => {
    try {
      await api.generateAdminReports();
      setNotice('Report generation request completed.');
      await refreshAll();
    } catch (err) {
      setError(err.message || 'Report generation is currently unavailable.');
    }
  };

  const selectReportCategory = (category) => {
    setActiveReportCategory(category);
    setPage(1);
    setNotice(`${category === 'All' ? 'All report categories' : `${category} reports`} selected.`);
  };

  return (
    <div className="space-y-4 pb-8">
      <header className="rounded-3xl border border-slate-200 bg-white/95 px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2563EB]">Admin reports</p>
            <h1 className="mt-1 text-3xl font-bold leading-tight text-[#0F172A] dark:text-slate-50">Reports Center</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[#64748B] dark:text-slate-400">
              Monitor, review, export, and manage all generated reports across the platform.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ActionButton onClick={generateReport} primary icon={<FiFileText />}>Generate Report</ActionButton>
            <ActionButton onClick={exportVisibleCsv} icon={<FiDownload />}>Export CSV</ActionButton>
            <ActionButton onClick={() => sortedReports.length ? sortedReports.forEach((report) => exportPdf(report.id)) : setNotice('There are no reports to export PDF.')} icon={<FiDownload />}>Export PDF</ActionButton>
            <ActionButton onClick={refreshAll} icon={<FiRefreshCcw />}>Refresh</ActionButton>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <KpiCard label="Total Reports" value={formatNumber(stats.totalReports || totalReports)} />
        <KpiCard label="Today's Reports" value={formatNumber(todayReports)} />
        <KpiCard label="High Risk Cases" value={formatNumber(highRiskCases)} tone="danger" />
        <KpiCard label="Pending Reviews" value={formatNumber(pendingReviews)} tone="warning" />
        <KpiCard label="Exports This Month" value={formatNumber(exportsThisMonth || stats.exportDownloads || 0)} />
        <KpiCard label="Avg Confidence" value={`${averageConfidence || 0}%`} />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white/95 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mb-2 flex items-center gap-2 px-1">
          <FiFileText className="h-4 w-4 text-[#2563EB]" />
          <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">Choose report category</p>
          <span className="text-xs text-[#64748B] dark:text-slate-400">Click a card to focus the table.</span>
        </div>
        <div className="grid gap-2 md:grid-cols-4">
          {reportCategoryOptions.map((category) => (
            <ReportCategoryCard
              key={category.key}
              category={category}
              active={activeReportCategory === category.key}
              onClick={() => selectReportCategory(category.key)}
            />
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
        <div className="grid gap-3 xl:grid-cols-[minmax(220px,1.5fr)_repeat(5,minmax(130px,1fr))]">
          <FilterControl label="Search" className="xl:min-w-[240px]">
            <FiSearch className="h-4 w-4 text-slate-400" />
            <input
              value={filters.search}
              onChange={(event) => setFilters({ ...filters, search: event.target.value })}
              placeholder="Report ID, patient, doctor"
              className="h-10 w-full border-0 bg-transparent p-0 text-sm focus:ring-0"
            />
          </FilterControl>
          <FilterSelect label="Status" value={filters.status} options={statusOptions} onChange={(value) => setFilters({ ...filters, status: value })} />
          <FilterSelect label="Prediction" value={filters.prediction} options={predictionOptions} onChange={(value) => setFilters({ ...filters, prediction: value })} />
          <FilterSelect label="Risk Level" value={filters.risk} options={riskOptions} onChange={(value) => setFilters({ ...filters, risk: value })} />
          <FilterControl label="Date Range">
            <input type="date" value={filters.startDate} onChange={(event) => setFilters({ ...filters, startDate: event.target.value })} className="h-10 w-full border-0 bg-transparent p-0 text-sm focus:ring-0" />
          </FilterControl>
          <FilterControl label="To">
            <input type="date" value={filters.endDate} onChange={(event) => setFilters({ ...filters, endDate: event.target.value })} className="h-10 w-full border-0 bg-transparent p-0 text-sm focus:ring-0" />
          </FilterControl>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <ActionButton onClick={applyFilters} primary compact icon={<FiFilter />}>Apply Filters</ActionButton>
            <ActionButton onClick={resetFilters} compact icon={<FiX />}>Reset Filters</ActionButton>
          </div>
          <div className="relative">
            <ActionButton onClick={() => setShowColumns((current) => !current)} compact icon={<FiColumns />}>Columns</ActionButton>
            {showColumns && (
              <div className="absolute right-0 z-30 mt-2 w-60 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                {columnConfig.map((column) => (
                  <label key={column.key} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
                    <input
                      type="checkbox"
                      checked={visibleColumns[column.key]}
                      onChange={(event) => setVisibleColumns({ ...visibleColumns, [column.key]: event.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-[#2563EB]"
                    />
                    {column.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {(error || notice) && (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200' : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200'}`}>
          {error || notice}
          <button type="button" onClick={() => { setError(null); setNotice(null); }} className="float-right font-semibold">Dismiss</button>
        </div>
      )}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-[#0F172A] dark:text-slate-50">Report Library</h2>
            <p className="text-sm text-[#64748B] dark:text-slate-400">Showing {sortedReports.length} {activeReportCategory === 'All' ? '' : activeReportCategory.toLowerCase()} reports from {totalReports} total</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500 dark:text-slate-400">Rows</span>
            <select value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); }} className="h-10 rounded-xl border border-[#D6E4F0] bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">
              {pageSizeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
        </div>

        <div className="max-h-[620px] overflow-auto">
          <table className="min-w-[1420px] w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="sticky top-0 z-20 bg-slate-50 text-xs uppercase tracking-[0.04em] text-slate-500 shadow-[0_1px_0_#E2E8F0] dark:bg-slate-900 dark:text-slate-400">
              <tr>
                {visibleColumnList.map((column) => (
                  <th key={column.key} className="whitespace-nowrap px-3 py-3">
                    <button type="button" onClick={() => handleSort(column.key)} className="inline-flex items-center gap-1 font-semibold hover:text-[#2563EB]">
                      {column.label}
                      <span className="text-[10px]">{sort.key === column.key ? (sort.direction === 'asc' ? 'ASC' : 'DESC') : ''}</span>
                    </button>
                  </th>
                ))}
                <th className="sticky right-0 bg-slate-50 px-4 py-3 text-right dark:bg-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows columns={visibleColumnList.length + 1} />
              ) : sortedReports.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnList.length + 1} className="px-6 py-16 text-center">
                    <div className="mx-auto flex max-w-md flex-col items-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB] dark:bg-blue-500/15">
                        <FiBarChart2 className="h-7 w-7" />
                      </div>
                      <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-50">No reports found</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Adjust filters or generate a new report to populate the report center.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedReports.map((report) => (
                  <tr key={report.id} className="group border-b border-slate-100 transition hover:bg-blue-50/40 dark:border-slate-800 dark:hover:bg-blue-500/10">
                    {visibleColumns.report_id && <td className="border-b border-slate-100 px-3 py-3 font-semibold text-slate-900 dark:border-slate-800 dark:text-slate-100">{report.report_id}</td>}
                    {visibleColumns.patient && <td className="border-b border-slate-100 px-3 py-3 dark:border-slate-800"><PersonCell name={report.patient} meta={`ID ${report.user_id || '-'}`} /></td>}
                    {visibleColumns.doctor && <td className="border-b border-slate-100 px-3 py-3 dark:border-slate-800"><PersonCell name={report.doctor} meta={report.department} /></td>}
                    {visibleColumns.report_type && <td className="border-b border-slate-100 px-3 py-3 text-slate-700 dark:border-slate-800 dark:text-slate-300">{report.report_type}</td>}
                    {visibleColumns.prediction && <td className="border-b border-slate-100 px-3 py-3 dark:border-slate-800"><Badge className={predictionBadge[report.prediction] || predictionBadge.Normal}>{report.prediction}</Badge></td>}
                    {visibleColumns.risk && <td className="border-b border-slate-100 px-3 py-3 dark:border-slate-800"><Badge className={riskBadge[report.risk]}>{report.risk}</Badge></td>}
                    {visibleColumns.confidence && <td className="border-b border-slate-100 px-3 py-3 dark:border-slate-800"><Confidence value={report.confidence} /></td>}
                    {visibleColumns.created_at && <td className="border-b border-slate-100 px-3 py-3 text-slate-700 dark:border-slate-800 dark:text-slate-300">{formatDate(report.created_at)}</td>}
                    {visibleColumns.status && <td className="border-b border-slate-100 px-3 py-3 dark:border-slate-800"><Badge className={statusBadge[report.status] || statusBadge.Pending}>{report.status}</Badge></td>}
                    {visibleColumns.exports && <td className="border-b border-slate-100 px-3 py-3 font-semibold text-slate-900 dark:border-slate-800 dark:text-slate-100">{report.exports}</td>}
                    {visibleColumns.last_download && <td className="border-b border-slate-100 px-3 py-3 text-slate-700 dark:border-slate-800 dark:text-slate-300">{formatDate(report.last_download)}</td>}
                    <td className="sticky right-0 border-b border-slate-100 bg-white px-4 py-3 text-right shadow-[-12px_0_20px_-20px_rgba(15,23,42,.45)] group-hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-950 dark:group-hover:bg-slate-900">
                      <div className="flex justify-end gap-1.5">
                        <IconButton label="View" onClick={() => openReport(report.id)}><FiEye /></IconButton>
                        <IconButton label="Download" onClick={() => exportPdf(report.id)}><FiDownload /></IconButton>
                        <IconButton label="Print" onClick={() => window.print()}><FiPrinter /></IconButton>
                        <IconButton label="Delete" danger onClick={async () => { if (window.confirm(`Delete ${report.report_id}?`)) { await api.deleteAdminReport(report.id); await refreshAll(); } }}><FiTrash2 /></IconButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400">Page {page} of {pages}</span>
          <div className="flex items-center gap-2">
            <ActionButton compact disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} icon={<FiChevronLeft />}>Previous</ActionButton>
            <ActionButton compact disabled={page >= pages} onClick={() => setPage((current) => Math.min(pages, current + 1))} icon={<FiChevronRight />}>Next</ActionButton>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-5">
        <AnalyticsCard className="xl:col-span-2" title="Reports Generated Per Month">
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={chartData.monthlyActivity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#64748B" />
              <YAxis tick={{ fontSize: 12 }} stroke="#64748B" />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </AnalyticsCard>
        <AnalyticsCard title="Prediction Distribution">
          <MiniPie data={chartData.predictionTrends} />
        </AnalyticsCard>
        <AnalyticsCard title="Risk Level Distribution">
          <MiniPie data={riskDistribution} />
        </AnalyticsCard>
        <AnalyticsCard title="Recent Activity Timeline">
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="border-l-2 border-[#2563EB] pl-3">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{activity.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{activity.detail}</p>
                <p className="text-xs text-slate-400">{activity.date}</p>
              </div>
            ))}
          </div>
        </AnalyticsCard>
        <AnalyticsCard className="xl:col-span-2" title="Top Doctors by Reports">
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={topDoctors.length ? topDoctors : chartData.userAnalytics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748B" />
              <YAxis tick={{ fontSize: 12 }} stroke="#64748B" />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill="#1DA1F2" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsCard>
        <AnalyticsCard className="xl:col-span-3" title="Most Common Predictions">
          <div className="grid gap-3 sm:grid-cols-3">
            {(chartData.mentalHealthStats || []).map((item, index) => (
              <div key={item.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="h-2 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">{item.name}</p>
                <p className="text-2xl font-bold text-slate-950 dark:text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </AnalyticsCard>
      </section>

      {(selectedReport || detailLoading) && (
        <ReportDrawer
          report={selectedReport}
          loading={detailLoading}
          onClose={() => setSelectedReport(null)}
          onPdf={() => selectedReport && exportPdf(selectedReport.id)}
          onCsv={() => selectedReport && exportCsv(selectedReport.id)}
        />
      )}
    </div>
  );
}

function normalizeReport(report) {
  const prediction = normalizePrediction(report.prediction_result || report.prediction_type);
  const confidence = normalizeConfidence(report.prediction_confidence ?? report.confidence_score ?? report.report_data?.confidence);
  const status = normalizeStatus(report.report_status || report.status);
  const category = inferReportCategory(report);
  return {
    ...report,
    patient: report.user_name || 'Unknown Patient',
    doctor: report.doctor_name || 'Unassigned',
    department: report.doctor_name ? 'Mental Health' : 'No department',
    category,
    report_type: inferReportType(report, category),
    prediction,
    risk: report.report_data?.riskLevel && ['High', 'Medium', 'Low'].includes(report.report_data.riskLevel) ? report.report_data.riskLevel : deriveRisk(prediction, confidence),
    confidence,
    status,
    exports: Number(report.exported_count ?? report.downloads ?? 0),
    last_download: Number(report.exported_count ?? report.downloads ?? 0) > 0 ? report.updated_at : null,
    age: report.report_data?.age || 'N/A',
    gender: report.report_data?.gender || 'N/A',
    modelVersion: report.report_data?.modelVersion || 'v2.6',
  };
}

function inferReportCategory(report) {
  const type = String(report.report_type || report.summary || report.report_id || '').toLowerCase();
  if (type.includes('payment') || String(report.report_id || '').toUpperCase().startsWith('PAY-')) return 'Payments';
  if (type.includes('appointment') || type.includes('booking') || type.includes('consultation')) return 'Appointments';
  return 'Prediction';
}

function inferReportType(report, category) {
  if (category === 'Payments') return 'Payment Transaction';
  if (category === 'Appointments') return 'Appointment Summary';
  if (String(report.report_type || '').trim()) return titleCase(report.report_type);
  return 'Mental Health Assessment';
}

function normalizePrediction(value) {
  const text = String(value || '').toLowerCase();
  if (text.includes('depression')) return 'Depression';
  if (text.includes('anxiety')) return 'Anxiety';
  return 'Normal';
}

function normalizeStatus(value) {
  const text = String(value || '').toLowerCase();
  if (text.includes('approved') || text.includes('completed')) return 'Approved';
  if (text.includes('review')) return 'Reviewed';
  return 'Pending';
}

function normalizeConfidence(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  return Math.round(number > 1 ? number : number * 100);
}

function deriveRisk(prediction, confidence) {
  if (prediction === 'Normal') return 'Low';
  if (confidence >= 85) return 'High';
  if (confidence >= 65) return 'Medium';
  return 'Low';
}

function mapStatusForApi(status) {
  if (status === 'All') return undefined;
  if (status === 'Approved') return 'Completed';
  if (status === 'Reviewed') return 'Completed';
  return status;
}

function mapPredictionForApi(prediction) {
  if (prediction === 'All') return undefined;
  if (prediction === 'Normal') return 'Neutral';
  return prediction;
}

function getSortValue(report, key) {
  if (key === 'patient') return report.patient.toLowerCase();
  if (key === 'doctor') return report.doctor.toLowerCase();
  if (key === 'confidence') return report.confidence;
  if (key === 'exports') return report.exports;
  if (key === 'created_at' || key === 'last_download') return new Date(report[key] || 0).getTime();
  return String(report[key] || '').toLowerCase();
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function toIsoDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function titleCase(value) {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function csvEscape(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function KpiCard({ label, value, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 text-[#2563EB]',
    danger: 'bg-red-50 text-red-600',
    warning: 'bg-orange-50 text-orange-600',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B] dark:text-slate-400">{label}</p>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-2xl font-bold text-[#0F172A] dark:text-white">{value}</p>
        <span className={`h-2.5 w-2.5 rounded-full ${tones[tone] || tones.blue}`} />
      </div>
    </div>
  );
}

function ReportCategoryCard({ category, active, onClick }) {
  const Icon = category.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition duration-200 hover:-translate-y-0.5 ${
        active
          ? 'border-[#2563EB] bg-blue-50 shadow-[0_14px_36px_-28px_rgba(37,99,235,.75)] dark:border-blue-400 dark:bg-blue-500/15'
          : 'border-[#D6E4F0] bg-white hover:border-[#93C5FD] hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'
      }`}
      aria-pressed={active}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
        active ? 'bg-[#2563EB] text-white' : 'bg-blue-50 text-[#2563EB] dark:bg-blue-500/15 dark:text-blue-300'
      }`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-[#0F172A] dark:text-slate-100">{category.label}</span>
        <span className="block truncate text-xs text-[#64748B] dark:text-slate-400">{category.description}</span>
      </span>
    </button>
  );
}

function FilterControl({ label, children, className = '' }) {
  return (
    <label className={`block rounded-2xl border border-[#D6E4F0] bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900 ${className}`}>
      <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#64748B] dark:text-slate-400">{label}</span>
      <span className="mt-1 flex items-center gap-2">{children}</span>
    </label>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <FilterControl label={label}>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full border-0 bg-transparent p-0 text-sm focus:ring-0">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </FilterControl>
  );
}

function ActionButton({ children, icon, onClick, primary, danger, compact, disabled }) {
  const style = primary
    ? 'bg-gradient-to-r from-[#1DA1F2] to-[#2563EB] text-white shadow-sm hover:-translate-y-0.5 hover:from-[#0B91E2] hover:to-[#1D4ED8]'
    : danger
      ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200'
      : 'border border-[#D6E4F0] bg-white text-[#0F172A] hover:border-[#93C5FD] hover:text-[#2563EB] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${compact ? 'h-10 px-3 text-sm' : 'h-11 px-4 text-sm'} ${style}`}
    >
      <span className="text-base">{icon}</span>
      {children}
    </button>
  );
}

function IconButton({ children, label, onClick, danger }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition ${danger ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-[#2563EB] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}
    >
      {children}
    </button>
  );
}

function Badge({ children, className }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${className}`}>{children}</span>;
}

function PersonCell({ name, meta }) {
  return (
    <div className="min-w-[150px]">
      <p className="font-semibold text-slate-900 dark:text-slate-100">{name}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{meta}</p>
    </div>
  );
}

function Confidence({ value }) {
  return (
    <div className="min-w-[90px]">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
        <span>{value}%</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-full rounded-full bg-[#2563EB]" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
}

function SkeletonRows({ columns }) {
  return Array.from({ length: 8 }).map((_, rowIndex) => (
    <tr key={rowIndex}>
      {Array.from({ length: columns }).map((__, columnIndex) => (
        <td key={columnIndex} className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <div className="h-4 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
        </td>
      ))}
    </tr>
  ));
}

function AnalyticsCard({ title, children, className = '' }) {
  return (
    <div className={`rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 ${className}`}>
      <h3 className="mb-4 text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h3>
      {children}
    </div>
  );
}

function MiniPie({ data }) {
  const safeData = data?.length ? data : [{ name: 'No data', value: 1 }];
  return (
    <ResponsiveContainer width="100%" height={210}>
      <PieChart>
        <Pie data={safeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={78} paddingAngle={3}>
          {safeData.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function ReportDrawer({ report, loading, onClose, onPdf, onCsv }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm">
      <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#2563EB]">Report detail</p>
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">{report?.report_id || 'Loading report'}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:text-[#2563EB] dark:border-slate-700 dark:text-slate-300">
            <FiX className="h-5 w-5" />
          </button>
        </div>
        {loading || !report ? (
          <div className="space-y-4 p-5">
            {Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />)}
          </div>
        ) : (
          <div className="space-y-4 p-5">
            <DrawerSection title="Patient Information" rows={[['Name', report.patient], ['Age', report.age], ['Gender', report.gender]]} />
            <DrawerSection title="Doctor Information" rows={[['Name', report.doctor], ['Department', report.department]]} />
            <DrawerSection title="Prediction Information" rows={[['Result', report.prediction], ['Confidence', `${report.confidence}%`], ['Model Version', report.modelVersion], ['Risk Level', report.risk]]} />
            <DrawerSection title="Report History" rows={[['Created', formatDate(report.created_at)], ['Reviewed', report.status === 'Pending' ? '-' : formatDate(report.updated_at)], ['Exported', report.exports > 0 ? `${report.exports} times` : 'Not exported']]} />
            <DrawerSection title="Downloads History" rows={[['Export Count', report.exports], ['Last Download', formatDate(report.last_download)]]} />
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-bold text-slate-950 dark:text-white">Notes</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{report.admin_notes || report.summary || 'No notes available.'}</p>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <ActionButton onClick={onPdf} primary compact icon={<FiDownload />}>Download PDF</ActionButton>
              <ActionButton onClick={onCsv} compact icon={<FiFileText />}>Export CSV</ActionButton>
              <ActionButton onClick={() => window.print()} compact icon={<FiPrinter />}>Print</ActionButton>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function DrawerSection({ title, rows }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <h3 className="font-bold text-slate-950 dark:text-white">{title}</h3>
      <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-2 text-sm">
            <span className="text-slate-500 dark:text-slate-400">{label}</span>
            <span className="text-right font-semibold text-slate-900 dark:text-slate-100">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: 'rgba(255,255,255,0.96)',
  border: '1px solid #D6E4F0',
  borderRadius: '14px',
  color: '#0F172A',
  boxShadow: '0 18px 50px -32px rgba(15,23,42,.35)',
};

export default AdminReports;
