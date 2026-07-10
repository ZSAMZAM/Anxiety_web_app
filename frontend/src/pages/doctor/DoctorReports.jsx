import { useEffect, useMemo, useState } from 'react';
import {
  FiActivity,
  FiBarChart2,
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiEye,
  FiFileText,
  FiFilter,
  FiPrinter,
  FiRefreshCw,
  FiSearch,
  FiShare2,
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
import { useNavigate } from 'react-router-dom';
import Avatar from '../../components/Avatar.jsx';
import { api } from '../../services/api.js';

const pageSizeOptions = [10, 25, 50, 100];
const statusOptions = ['All', 'Completed'];
const dateRangeOptions = [
  ['all', 'All Time'],
  ['today', 'Today'],
  ['week', 'This Week'],
  ['month', 'This Month'],
  ['custom', 'Custom Range'],
];
const chartColors = ['#0EA5E9', '#06B6D4', '#2563EB', '#8B5CF6', '#EF4444', '#F59E0B', '#22C55E'];

const emptyFilters = {
  search: '',
  specialization: '',
  date_range: 'all',
  start_date: '',
  end_date: '',
  status: 'All',
  risk_level: 'All',
  sort_by: 'created_at',
  sort_dir: 'desc',
};

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function statusClass(status = '') {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('completed') || normalized.includes('reviewed')) return 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/30';
  if (normalized.includes('shared')) return 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-200 dark:ring-blue-500/30';
  return 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-500/30';
}

function severityClass(severity = '') {
  const normalized = String(severity || '').toLowerCase();
  if (normalized.includes('high')) return 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/15 dark:text-red-200 dark:ring-red-500/30';
  if (normalized.includes('medium')) return 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/15 dark:text-orange-200 dark:ring-orange-500/30';
  return 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/30';
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function SummaryCard({ title, value, Icon, suffix = '', onClick, active = false }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900 ${active ? 'border-cyan-300 bg-cyan-50 dark:border-cyan-500/40' : 'border-slate-200 bg-white dark:border-white/10'}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-200"><Icon /></span>
      </div>
      <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">{value}{suffix}</p>
      <p className="text-sm font-bold text-slate-500 dark:text-slate-300">{title}</p>
    </button>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
      ))}
    </div>
  );
}

function EmptyChart({ title }) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-200 bg-cyan-50/60 px-4 text-center dark:border-cyan-500/20 dark:bg-cyan-500/10">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-cyan-600 shadow-sm dark:bg-slate-950 dark:text-cyan-200">
        <FiBarChart2 />
      </span>
      <p className="mt-3 text-sm font-black text-slate-800 dark:text-white">{title}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-300">No report data yet</p>
    </div>
  );
}

function DoctorReports() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({});
  const [charts, setCharts] = useState({});
  const [filters, setFilters] = useState(emptyFilters);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const loadReports = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getDoctorReports({
        search: debouncedSearch || undefined,
        status: filters.status !== 'All' ? filters.status : undefined,
        risk_level: filters.risk_level !== 'All' ? filters.risk_level : undefined,
        specialization: filters.specialization || undefined,
        date_range: filters.date_range,
        start_date: filters.date_range === 'custom' ? filters.start_date : undefined,
        end_date: filters.date_range === 'custom' ? filters.end_date : undefined,
        sort_by: filters.sort_by,
        sort_dir: filters.sort_dir,
        page,
        limit,
      });
      setReports(Array.isArray(data.reports) ? data.reports : []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch (err) {
      setError(err.message || 'Unable to load reports.');
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    setStatsLoading(true);
    try {
      const [statsData, chartData] = await Promise.all([
        api.getDoctorReportStats(),
        api.getDoctorReportCharts(),
      ]);
      setStats(statsData || {});
      setCharts(chartData || {});
    } catch (err) {
      setError(err.message || 'Unable to load report analytics.');
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [debouncedSearch, filters.status, filters.risk_level, filters.specialization, filters.date_range, filters.start_date, filters.end_date, filters.sort_by, filters.sort_dir, page, limit]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const showingStart = total ? (page - 1) * limit + 1 : 0;
  const showingEnd = Math.min(page * limit, total);

  const visibleReports = useMemo(() => reports, [reports]);

  const openReport = async (report) => {
    setDetailLoading(true);
    setSelectedReport(report);
    try {
      const detail = await api.getDoctorReport(report.id);
      setSelectedReport(detail || report);
    } catch (err) {
      setError(err.message || 'Unable to load report details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleSelected = (id) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const exportOne = async (report, format = 'pdf') => {
    try {
      const blob = await api.exportDoctorReport(report.id, format);
      downloadBlob(blob, `${report.report_id || `report-${report.id}`}.${format === 'csv' ? 'csv' : 'pdf'}`);
      setNotice('Report export started.');
    } catch (err) {
      setError(err.message || 'Unable to export report.');
    }
  };

  const exportMany = async (format = 'csv') => {
    try {
      const blob = await api.exportDoctorReports({
        format,
        ids: selectedIds.length ? selectedIds.join(',') : undefined,
        search: debouncedSearch || undefined,
        status: filters.status !== 'All' ? filters.status : undefined,
        risk_level: filters.risk_level !== 'All' ? filters.risk_level : undefined,
        specialization: filters.specialization || undefined,
        date_range: filters.date_range,
        start_date: filters.date_range === 'custom' ? filters.start_date : undefined,
        end_date: filters.date_range === 'custom' ? filters.end_date : undefined,
        sort_by: filters.sort_by,
        sort_dir: filters.sort_dir,
      });
      downloadBlob(blob, `doctor-reports.${format === 'excel' ? 'xls' : format === 'pdf' ? 'pdf' : 'csv'}`);
      setNotice(selectedIds.length ? 'Selected reports export started.' : 'Filtered reports export started.');
    } catch (err) {
      setError(err.message || 'Unable to export reports.');
    }
  };

  const resetFilters = () => {
    setFilters(emptyFilters);
    setSelectedIds([]);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-300">Clinical Reports</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-slate-50">EMR reporting workspace</h1>
          <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-300">Review completed consultation reports, prediction outcomes, notes, exports, and patient follow-up signals.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { loadReports(); loadAnalytics(); }} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100">
            <FiRefreshCw /> Refresh
          </button>
          <button type="button" onClick={() => exportMany('csv')} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-cyan-200 bg-white px-4 text-sm font-bold text-cyan-700 shadow-sm hover:bg-cyan-50 dark:border-cyan-500/30 dark:bg-slate-900 dark:text-cyan-200">
            <FiDownload /> CSV
          </button>
          <button type="button" onClick={() => exportMany('pdf')} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100">
            <FiDownload /> PDF
          </button>
          <button type="button" onClick={() => exportMany('excel')} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-cyan-600/20">
            <FiDownload /> Excel
          </button>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">{error}</div>}
      {notice && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</div>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['All completed', stats.totalReports || 0, FiFileText, '', 'all'],
          ['7-day activity', stats.reportsThisWeek || 0, FiActivity, '', 'week'],
          ['Month activity', stats.reportsThisMonth || 0, FiCalendar, '', 'month'],
          ['Consultations', stats.completedConsultations || 0, FiCheckCircle, '', 'appointments'],
        ].map(([title, value, Icon, suffix, target]) => (
          <SummaryCard
            key={title}
            title={title}
            value={statsLoading ? '-' : value}
            suffix={suffix}
            Icon={Icon}
            active={target !== 'appointments' && filters.date_range === target}
            onClick={() => {
              if (target === 'appointments') {
                navigate('/doctor/appointments');
                return;
              }
              setFilters((prev) => ({ ...prev, date_range: target, start_date: '', end_date: '' }));
              setPage(1);
            }}
          />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-5">
        {[
          ['Monthly Reports', charts.monthlyReports || [], 'bar'],
          ['Prediction Distribution', charts.predictionDistribution || [], 'pie'],
          ['Completed Consultations', charts.completedConsultations || [], 'line'],
          ['Most Common Diagnoses', charts.mostCommonDiagnoses || [], 'bar'],
          ['Weekly Activity', charts.weeklyActivity || [], 'line'],
        ].map(([title, data, type]) => {
          const hasData = Array.isArray(data) && data.some((item) => Number(item.value || 0) > 0);
          return (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">{title}</h3>
              <div className="mt-3 h-40">
                {!hasData ? <EmptyChart title={title} /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    {type === 'pie' ? (
                      <PieChart>
                        <Pie data={data} dataKey="value" nameKey="name" innerRadius={32} outerRadius={55}>
                          {(data || []).map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    ) : type === 'line' ? (
                      <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" hide />
                        <YAxis allowDecimals={false} width={28} />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="#0EA5E9" strokeWidth={3} dot={false} />
                      </LineChart>
                    ) : (
                      <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" hide />
                        <YAxis allowDecimals={false} width={28} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#06B6D4" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section className="sticky top-0 z-20 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/95">
        <div className="flex items-center justify-between gap-3 md:hidden">
          <button type="button" onClick={() => setFiltersOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold dark:border-white/10 dark:text-white"><FiFilter /> Filters</button>
          <p className="text-sm font-bold text-slate-500">{total} reports</p>
        </div>
        <div className={`${filtersOpen ? 'grid' : 'hidden'} mt-3 gap-3 md:mt-0 md:grid md:grid-cols-2 xl:grid-cols-8`}>
          <label className="xl:col-span-2">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Search Patient</span>
            <div className="relative mt-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={filters.search} onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))} placeholder="Name, phone, appointment ID, diagnosis..." className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-900 dark:text-white" />
            </div>
          </label>
          <label>
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Specialization</span>
            <input value={filters.specialization} onChange={(event) => setFilters((prev) => ({ ...prev, specialization: event.target.value }))} placeholder="Optional" className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-900 dark:text-white" />
          </label>
          <label>
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Date Range</span>
            <select value={filters.date_range} onChange={(event) => setFilters((prev) => ({ ...prev, date_range: event.target.value }))} className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-900 dark:text-white">
              {dateRangeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          {filters.date_range === 'custom' && (
            <>
              <input type="date" value={filters.start_date} onChange={(event) => setFilters((prev) => ({ ...prev, start_date: event.target.value }))} className="mt-5 h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-900 dark:text-white" />
              <input type="date" value={filters.end_date} onChange={(event) => setFilters((prev) => ({ ...prev, end_date: event.target.value }))} className="mt-5 h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-900 dark:text-white" />
            </>
          )}
          <label>
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Status</span>
            <select value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))} className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-900 dark:text-white">
              {statusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Risk Level</span>
            <select value={filters.risk_level} onChange={(event) => setFilters((prev) => ({ ...prev, risk_level: event.target.value }))} className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-900 dark:text-white">
              {['All', 'High', 'Moderate', 'Low'].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Sort</span>
            <select value={`${filters.sort_by}:${filters.sort_dir}`} onChange={(event) => {
              const [sort_by, sort_dir] = event.target.value.split(':');
              setFilters((prev) => ({ ...prev, sort_by, sort_dir }));
            }} className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-900 dark:text-white">
              <option value="created_at:desc">Newest first</option>
              <option value="created_at:asc">Oldest first</option>
              <option value="patient:asc">Patient A-Z</option>
              <option value="appointment_date:desc">Appointment date</option>
              <option value="prediction:asc">Prediction</option>
              <option value="status:asc">Status</option>
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button type="button" onClick={resetFilters} className="h-11 rounded-2xl border border-slate-200 px-4 text-sm font-black text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10">Reset</button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-white/10 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-black text-slate-950 dark:text-white">Report List</h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">Showing {showingStart}-{showingEnd} of {total} reports</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); }} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-950 dark:text-white">
              {pageSizeOptions.map((size) => <option key={size} value={size}>{size} per page</option>)}
            </select>
            {!!selectedIds.length && <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200">{selectedIds.length} selected</span>}
          </div>
        </div>

        <div className="p-4">
          {loading ? <SkeletonRows /> : visibleReports.length ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
              <table className="min-w-[1280px] w-full divide-y divide-slate-200 text-left text-sm dark:divide-white/10">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Select</th>
                    <th className="px-4 py-3">Report ID</th>
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Appointment</th>
                    <th className="px-4 py-3">Prediction</th>
                    <th className="px-4 py-3">Risk</th>
                    <th className="px-4 py-3">Diagnosis</th>
                    <th className="px-4 py-3">Treatment Plan</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created / Updated</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white dark:divide-white/10 dark:bg-slate-900">
                  {visibleReports.map((report) => (
                    <tr key={report.id} className="align-top transition hover:bg-cyan-50/60 dark:hover:bg-cyan-500/10">
                      <td className="px-4 py-4">
                        <input type="checkbox" checked={selectedIds.includes(report.id)} onChange={() => toggleSelected(report.id)} className="h-4 w-4 rounded border-slate-300" aria-label={`Select ${report.report_id}`} />
                      </td>
                      <td className="px-4 py-4 font-black text-slate-900 dark:text-white">{report.report_id}</td>
                      <td className="px-4 py-4">
                        <div className="flex min-w-56 items-center gap-3">
                          <Avatar src={report.patient_avatar} name={report.patient_name} role="user" size="md" />
                          <div>
                            <p className="font-black text-slate-900 dark:text-white">{report.patient_name || 'Patient'}</p>
                            <p className="text-xs font-semibold text-slate-500">{report.patient_phone || 'No phone number'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                        <p className="font-bold">{formatDate(report.appointment_date)}</p>
                        <p className="text-xs">{report.appointment_time || '-'} | #{report.appointment_id || '-'}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-black text-slate-900 dark:text-white">{report.prediction_result || '-'}</p>
                        <p className="text-xs text-slate-500">{report.prediction_confidence || 0}% confidence</p>
                      </td>
                      <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${severityClass(report.severity)}`}>{report.severity || 'Low'}</span></td>
                      <td className="max-w-52 px-4 py-4 font-semibold text-slate-700 dark:text-slate-200">{report.diagnosis || 'Not recorded'}</td>
                      <td className="max-w-64 px-4 py-4 text-slate-600 dark:text-slate-300">
                        <p className="line-clamp-2">{report.treatment_plan || 'Not recorded'}</p>
                      </td>
                      <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${statusClass(report.status)}`}>{report.status || 'Draft'}</span></td>
                      <td className="px-4 py-4 text-xs font-semibold text-slate-500">
                        <p>{formatDateTime(report.created_at)}</p>
                        <p>{formatDateTime(report.updated_at)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => openReport(report)} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-white dark:border-white/10 dark:text-slate-200" aria-label="View report"><FiEye /></button>
                          <button type="button" onClick={() => exportOne(report, 'pdf')} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-white dark:border-white/10 dark:text-slate-200" aria-label="Print PDF"><FiPrinter /></button>
                          <button type="button" onClick={() => exportOne(report, 'csv')} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-white dark:border-white/10 dark:text-slate-200" aria-label="Export report"><FiDownload /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex min-h-96 flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-200 bg-gradient-to-br from-cyan-50 to-blue-50 p-8 text-center dark:border-cyan-500/20 dark:from-cyan-500/10 dark:to-blue-500/10">
              <div className="relative flex h-28 w-28 items-center justify-center rounded-[2rem] bg-white shadow-xl shadow-cyan-900/10 dark:bg-slate-900">
                <FiFileText className="h-12 w-12 text-cyan-500" />
                <span className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500 text-white"><FiCheckCircle /></span>
              </div>
              <h3 className="mt-6 text-2xl font-black text-slate-950 dark:text-white">No Reports Yet</h3>
              <p className="mt-2 max-w-md text-slate-600 dark:text-slate-300">You haven't completed any consultation reports. Once reports are saved in the database, they will appear here with analytics and export tools.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button type="button" onClick={() => navigate('/doctor/appointments')} className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-cyan-600/20">Go to Appointments</button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 p-4 dark:border-white/10 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-300">Showing {showingStart}-{showingEnd} of {total} reports</p>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-xl border border-slate-200 p-2 text-slate-600 disabled:opacity-40 dark:border-white/10 dark:text-slate-200"><FiChevronLeft /></button>
            <span className="text-sm font-black text-slate-700 dark:text-slate-200">Page {page} of {pages}</span>
            <button type="button" disabled={page >= pages} onClick={() => setPage((value) => Math.min(pages, value + 1))} className="rounded-xl border border-slate-200 p-2 text-slate-600 disabled:opacity-40 dark:border-white/10 dark:text-slate-200"><FiChevronRight /></button>
          </div>
        </div>
      </section>

      {selectedReport && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/45 backdrop-blur-sm">
          <aside className="h-full w-full max-w-3xl overflow-y-auto bg-white shadow-2xl dark:bg-slate-950">
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 p-5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black uppercase tracking-wide text-cyan-600 dark:text-cyan-300">{selectedReport.report_id}</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{selectedReport.patient_name}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-300">{selectedReport.diagnosis} | {selectedReport.prediction_result}</p>
                </div>
                <button type="button" onClick={() => setSelectedReport(null)} className="rounded-full border border-slate-200 p-2 text-slate-500 dark:border-white/10 dark:text-slate-200"><FiX /></button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => exportOne(selectedReport, 'pdf')} className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-3 py-2 text-sm font-black text-white"><FiDownload /> Download PDF</button>
                <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 dark:border-white/10 dark:text-slate-200"><FiPrinter /> Print</button>
                <button type="button" onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/doctor/reports?report=${selectedReport.id}`); setNotice('Report link copied.'); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 dark:border-white/10 dark:text-slate-200"><FiShare2 /> Share</button>
              </div>
            </div>

            {detailLoading ? <div className="p-5"><SkeletonRows /></div> : (
              <div className="space-y-4 p-5">
                {[
                  ['Patient Information', [`Name: ${selectedReport.patient_name}`, `Age: ${selectedReport.patient_age || '-'}`, `Gender: ${selectedReport.patient_gender || '-'}`, `Phone: ${selectedReport.patient_phone || '-'}`]],
                  ['Appointment Information', [`Appointment ID: ${selectedReport.appointment_id || '-'}`, `Date: ${formatDate(selectedReport.appointment_date)}`, `Time: ${selectedReport.appointment_time || '-'}`, `Status: ${selectedReport.status || '-'}`]],
                  ['Prediction Result', [`Prediction: ${selectedReport.prediction_result || '-'}`, `Mental Health Score: ${selectedReport.mental_health_score || 0}`, `Severity: ${selectedReport.severity || '-'}`]],
                ].map(([title, rows]) => (
                  <section key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900">
                    <h3 className="font-black text-slate-950 dark:text-white">{title}</h3>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300 md:grid-cols-2">
                      {rows.map((row) => <p key={row}>{row}</p>)}
                    </div>
                  </section>
                ))}
                {[
                  ['Symptoms', selectedReport.symptoms],
                  ['Doctor Notes', selectedReport.doctor_notes || selectedReport.summary],
                  ['Diagnosis', selectedReport.diagnosis],
                  ['Treatment Plan', selectedReport.treatment_plan],
                  ['Prescription', selectedReport.prescription || selectedReport.medications],
                  ['Follow-up Recommendation', selectedReport.follow_up_recommendation || selectedReport.recommendations],
                  ['Consultation Outcome', selectedReport.consultation_outcome],
                  ['Follow-up Date', selectedReport.follow_up_date],
                ].map(([title, value]) => (
                  <section key={title} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
                    <h3 className="font-black text-slate-950 dark:text-white">{title}</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{Array.isArray(value) ? (value.length ? value.join(', ') : 'Not recorded.') : value || 'Not recorded.'}</p>
                  </section>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

export default DoctorReports;
