import { useEffect, useMemo, useState } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiBarChart2,
  FiCalendar,
  FiCheckCircle,
  FiChevronRight,
  FiClock,
  FiDownload,
  FiEdit2,
  FiFilter,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiSlash,
  FiTrash2,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Avatar from '../../components/Avatar.jsx';
import { api } from '../../services/api.js';

const todayValue = () => new Date().toISOString().slice(0, 10);

const statusStyles = {
  Available: 'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/30',
  Busy: 'bg-orange-100 text-orange-700 ring-orange-200 dark:bg-orange-500/15 dark:text-orange-200 dark:ring-orange-500/30',
  'On Leave': 'bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-rose-500/30',
  Offline: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:ring-white/10',
};

const healthStyles = {
  Healthy: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/30',
  Warning: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-500/30',
  Conflict: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/15 dark:text-red-200 dark:ring-red-500/30',
};

const dayOptions = [
  ['monday', 'Monday'],
  ['tuesday', 'Tuesday'],
  ['wednesday', 'Wednesday'],
  ['thursday', 'Thursday'],
  ['friday', 'Friday'],
  ['saturday', 'Saturday'],
  ['sunday', 'Sunday'],
];

const viewLabels = [
  ['day', 'Today'],
  ['week', 'Week'],
  ['month', 'Month'],
  ['year', 'Year'],
];

const legend = [
  ['Available', 'bg-emerald-500'],
  ['Booked', 'bg-blue-500'],
  ['Vacation', 'bg-orange-500'],
  ['Blocked', 'bg-red-500'],
  ['Unavailable', 'bg-slate-400'],
];

function addDays(date, days) {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function currentTimeValue() {
  return new Date().toTimeString().slice(0, 5);
}

function createRuleForm(doctorId = '') {
  return {
    doctor_id: doctorId ? String(doctorId) : '',
    rule_id: null,
    start_date: todayValue(),
    end_date: addDays(todayValue(), 90),
    start_time: '09:00',
    end_time: '17:00',
    recurrence_type: 'weekdays',
    recurrence_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  };
}

function normalizeRuleDays(days) {
  if (typeof days === 'string') {
    return days.split(',').map((day) => day.trim()).filter(Boolean);
  }
  return Array.isArray(days) ? days : [];
}

function toCsv(rows) {
  const header = ['Doctor', 'Specialization', 'Status', 'Working Hours', 'Appointments Today', 'Next Available', 'Schedule Health'];
  const body = rows.map((doctor) => [
    doctor.name,
    doctor.specialization,
    doctor.today_status,
    doctor.working_hours,
    doctor.booked_today,
    doctor.next_available_date || '',
    getScheduleHealth(doctor).label,
  ]);
  return [header, ...body]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\n');
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatDateLabel(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

function getWarningSeverity(message = '') {
  const text = message.toLowerCase();
  if (text.includes('overlap') || text.includes('duplicate') || text.includes('outside') || text.includes('during vacation')) {
    return 'Conflict';
  }
  return 'Warning';
}

function getScheduleHealth(doctor) {
  const warnings = doctor?.warnings || [];
  if (warnings.some((warning) => getWarningSeverity(warning) === 'Conflict')) return { label: 'Conflict', dot: 'bg-red-500' };
  if (warnings.length || doctor?.today_status === 'Offline') return { label: 'Warning', dot: 'bg-amber-400' };
  return { label: 'Healthy', dot: 'bg-emerald-500' };
}

function extractDateFromWarning(message = '') {
  return message.match(/\d{4}-\d{2}-\d{2}/)?.[0] || null;
}

function getCalendarEntries(doctor, view, anchorDate) {
  const entries = Object.values(doctor?.calendar_slots || {}).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  if (view === 'day') return entries.filter((day) => day.date === anchorDate).slice(0, 1);
  if (view === 'week') return entries.slice(0, 7);
  if (view === 'year') return entries.slice(0, 365);
  return entries.slice(0, 42);
}

function CalendarGrid({ doctor, view, selectedDate, onSelectDay }) {
  const entries = getCalendarEntries(doctor, view, selectedDate);
  if (!entries.length) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300">
        No calendar slots in this range.
      </div>
    );
  }

  const gridClass = view === 'day' ? 'grid-cols-1' : 'grid-cols-7';
  return (
    <div className={`grid ${gridClass} gap-2`}>
      {entries.map((day) => {
        const slots = day.slots || [];
        const booked = slots.filter((slot) => slot.booked).length;
        const free = slots.length - booked;
        const selected = day.date === selectedDate;
        const tone = day.blocked
          ? 'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-500/30 dark:bg-orange-500/15 dark:text-orange-100'
          : booked && free
            ? 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-100'
            : booked
              ? 'border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-100'
              : free
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-100'
                : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300';
        return (
          <button
            key={day.date}
            type="button"
            onClick={() => onSelectDay(day.date)}
            className={`min-h-24 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ${tone} ${selected ? 'ring-2 ring-sky-400' : ''}`}
          >
            <span className="text-lg font-black">{Number(day.date.slice(8, 10))}</span>
            <span className="mt-1 block truncate text-xs font-bold">{day.blocked ? day.reason || 'Vacation' : free ? `${free} free slots` : booked ? `${booked} booked` : 'Unavailable'}</span>
            <span className="mt-3 flex gap-1">
              {!!free && <span className="h-1.5 flex-1 rounded-full bg-emerald-500" />}
              {!!booked && <span className="h-1.5 flex-1 rounded-full bg-blue-500" />}
              {day.blocked && <span className="h-1.5 flex-1 rounded-full bg-orange-500" />}
              {!slots.length && !day.blocked && <span className="h-1.5 flex-1 rounded-full bg-slate-400" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function DoctorSchedules() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [calendarView, setCalendarView] = useState('month');
  const [selectedDay, setSelectedDay] = useState(todayValue());
  const [workspaceMode, setWorkspaceMode] = useState('calendar');
  const [blockForm, setBlockForm] = useState({ doctor_id: '', start_date: todayValue(), end_date: todayValue(), reason: 'Blocked by administrator' });
  const [ruleForm, setRuleForm] = useState(createRuleForm());
  const [savingRule, setSavingRule] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    doctor_id: '',
    specialization: '',
    status: '',
    date: todayValue(),
    period: 'week',
  });

  const loadSchedules = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.getAdminDoctorSchedules(filters);
      setData(result);
      if (selectedDoctor) {
        const fresh = result.doctors?.find((doctor) => doctor.id === selectedDoctor.id);
        setSelectedDoctor(fresh || null);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Unable to load doctor schedules.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, [filters.doctor_id, filters.specialization, filters.status, filters.date, filters.period]);

  const doctors = data?.doctors || [];
  const specializations = data?.filters?.specializations || [];
  const summary = data?.summary || {};

  const filteredBySearch = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    if (!search) return doctors;
    return doctors.filter((doctor) => (
      String(doctor.name || '').toLowerCase().includes(search)
      || String(doctor.specialization || '').toLowerCase().includes(search)
      || String(doctor.username || '').toLowerCase().includes(search)
    ));
  }, [doctors, filters.search]);

  const dashboardStats = useMemo(() => {
    const totalSlots = Number(summary.working_slots_today || 0);
    const booked = Number(summary.booked_appointments_today || 0);
    const utilization = totalSlots ? Math.round((booked / totalSlots) * 100) : 0;
    return [
      ['total_doctors', 'Total Doctors', summary.total_doctors ?? 0, FiUsers, 'text-sky-500'],
      ['available_today', 'Available Today', summary.available_today ?? 0, FiCheckCircle, 'text-emerald-500'],
      ['working_now', 'Working Now', doctors.filter((doctor) => ['Available', 'Busy'].includes(doctor.today_status)).length, FiClock, 'text-cyan-500'],
      ['on_leave', 'Doctors On Leave', summary.on_leave ?? 0, FiSlash, 'text-orange-500'],
      ['booked_appointments_today', "Today's Appointments", booked, FiCalendar, 'text-blue-500'],
      ['conflicting_schedules', 'Schedule Conflicts', summary.conflicting_schedules ?? 0, FiAlertTriangle, 'text-red-500'],
      ['average_utilization', 'Average Utilization', `${utilization}%`, FiActivity, 'text-violet-500'],
    ];
  }, [doctors, summary]);

  const alertItems = useMemo(() => (data?.warnings || []).map((warning, index) => {
    const severity = getWarningSeverity(warning.message);
    return {
      ...warning,
      key: `${warning.doctor_id}-${index}`,
      severity,
      date: extractDateFromWarning(warning.message),
    };
  }), [data?.warnings]);

  const selectedDayData = selectedDoctor?.calendar_slots?.[selectedDay];
  const selectedDayAppointments = (selectedDoctor?.appointments || []).filter((item) => item.date === selectedDay);
  const upcomingVacation = selectedDoctor?.vacations?.find((item) => item.date >= todayValue());

  const openDoctorDrawer = (doctor, view = 'month', day = filters.date || todayValue()) => {
    setCalendarView(view);
    setSelectedDay(day);
    setWorkspaceMode('calendar');
    setSelectedDoctor(doctor);
    setBlockForm((prev) => ({ ...prev, doctor_id: String(doctor.id) }));
    setRuleForm(createRuleForm(doctor.id));
    if (filters.period !== view && view !== 'day') {
      setFilters((prev) => ({ ...prev, period: view }));
    }
  };

  const openAlertReview = (alert) => {
    const doctor = doctors.find((item) => item.id === alert.doctor_id);
    if (doctor) openDoctorDrawer(doctor, 'week', alert.date || filters.date || todayValue());
  };

  const changeRecurrence = (value) => {
    setRuleForm((current) => {
      let recurrenceDays = current.recurrence_days;
      if (value === 'weekdays') recurrenceDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      if (value === 'weekends') recurrenceDays = ['saturday', 'sunday'];
      if (value === 'daily' || value === 'specific_date' || value === 'first_monday') recurrenceDays = [];
      return { ...current, recurrence_type: value, recurrence_days: recurrenceDays };
    });
  };

  const toggleRuleDay = (day) => {
    setRuleForm((current) => {
      const days = new Set(current.recurrence_days || []);
      if (days.has(day)) days.delete(day);
      else days.add(day);
      return { ...current, recurrence_days: Array.from(days) };
    });
  };

  const startRuleCreate = (doctor = selectedDoctor) => {
    if (!doctor) return;
    setWorkspaceMode('edit');
    setCalendarView('week');
    setSelectedDoctor(doctor);
    setBlockForm((prev) => ({ ...prev, doctor_id: String(doctor.id) }));
    setRuleForm(createRuleForm(doctor.id));
  };

  const startRuleEdit = (doctor, rule) => {
    if (rule.legacy || String(rule.id).startsWith('legacy-')) {
      setError('Imported legacy schedules cannot be edited. Create a new schedule rule to replace it.');
      return;
    }
    if (rule.end_date && rule.end_date < todayValue()) {
      setError('Past schedules are automatically disabled and cannot be edited.');
      return;
    }
    setWorkspaceMode('edit');
    setCalendarView('week');
    setSelectedDoctor(doctor);
    setBlockForm((prev) => ({ ...prev, doctor_id: String(doctor.id) }));
    setRuleForm({
      doctor_id: String(doctor.id),
      rule_id: rule.id,
      start_date: rule.start_date || todayValue(),
      end_date: rule.end_date || addDays(todayValue(), 90),
      start_time: rule.start_time || '09:00',
      end_time: rule.end_time || '17:00',
      recurrence_type: rule.recurrence_type || 'weekly',
      recurrence_days: normalizeRuleDays(rule.recurrence_days),
    });
  };

  const validateRuleForm = () => {
    if (!ruleForm.doctor_id) return 'Select a doctor before saving a schedule.';
    if (!ruleForm.start_date || !ruleForm.end_date || !ruleForm.start_time || !ruleForm.end_time) return 'Start date, end date, start time, and end time are required.';
    if (ruleForm.end_date < ruleForm.start_date) return 'End date must be after start date.';
    if (ruleForm.start_time === ruleForm.end_time) return 'End time must be greater than start time.';
    if (ruleForm.end_time < ruleForm.start_time) return 'End time must be after start time.';
    if (ruleForm.start_date === todayValue() && ruleForm.start_time <= currentTimeValue()) return "Start time cannot be earlier than the current time for today's schedule.";
    if (ruleForm.end_date > addDays(todayValue(), 365)) return 'Availability can only be created for the next 12 months.';
    if (ruleForm.recurrence_type === 'weekly' && !(ruleForm.recurrence_days || []).length) return 'Select at least one recurring day.';
    return '';
  };

  const handleSaveRule = async (event) => {
    event.preventDefault();
    const validationError = validateRuleForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSavingRule(true);
    setError('');
    try {
      const doctorId = Number(ruleForm.doctor_id);
      const payload = {
        start_date: ruleForm.start_date,
        end_date: ruleForm.end_date,
        start_time: ruleForm.start_time,
        end_time: ruleForm.end_time,
        recurrence_type: ruleForm.recurrence_type,
        recurrence_days: ruleForm.recurrence_days,
      };
      if (ruleForm.rule_id) {
        await api.updateAdminDoctorAvailability(doctorId, ruleForm.rule_id, payload);
      } else {
        await api.createAdminDoctorAvailability(doctorId, payload);
      }
      setRuleForm(createRuleForm(doctorId));
      await loadSchedules();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Unable to save doctor schedule.');
    } finally {
      setSavingRule(false);
    }
  };

  const handleDeleteRule = async (doctor, rule) => {
    if (rule.legacy || String(rule.id).startsWith('legacy-')) {
      setError('Imported legacy schedules cannot be deleted. Create a new schedule rule to replace it.');
      return;
    }
    if (rule.end_date && rule.end_date < todayValue()) {
      setError('Past schedules are automatically disabled and cannot be deleted.');
      return;
    }
    if (!window.confirm('Delete this schedule rule?')) return;
    setSavingRule(true);
    setError('');
    try {
      await api.deleteAdminDoctorAvailability(doctor.id, rule.id);
      if (ruleForm.rule_id === rule.id) setRuleForm(createRuleForm(doctor.id));
      await loadSchedules();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Unable to delete doctor schedule.');
    } finally {
      setSavingRule(false);
    }
  };

  const handleBlockDate = async (event) => {
    event.preventDefault();
    const doctorId = Number(blockForm.doctor_id || selectedDoctor?.id);
    if (!doctorId) {
      setError('Select a doctor before blocking dates.');
      return;
    }
    setError('');
    try {
      await api.blockAdminDoctorDate(doctorId, blockForm);
      await loadSchedules();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Unable to block dates.');
    }
  };

  const handleUnblock = async (blockId) => {
    setError('');
    try {
      await api.unblockAdminDoctorDate(blockId);
      await loadSchedules();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Unable to unblock date.');
    }
  };

  if (loading && !data) {
    return <div className="flex min-h-[50vh] items-center justify-center text-slate-500">Loading doctor schedules...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#2563EB] dark:text-[#93C5FD]">Doctor Schedule Management</p>
          <h1 className="mt-2 max-w-4xl text-3xl font-bold leading-tight text-slate-950 dark:text-white">Monitor every doctor's calendar, conflicts, vacations, and availability from one clean operations view.</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={filters.search} onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))} placeholder="Search doctors" className="h-11 w-64 rounded-2xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-sky-400 dark:border-white/10 dark:bg-slate-900 dark:text-white" />
          </div>
          <button type="button" onClick={loadSchedules} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100">
            <FiRefreshCw /> Refresh
          </button>
          <button type="button" onClick={() => downloadText('doctor-schedules.csv', toCsv(filteredBySearch))} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 px-4 text-sm font-semibold text-white shadow-lg shadow-sky-500/20">
            <FiDownload /> Export
          </button>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">{error}</div>}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {dashboardStats.map(([key, label, value, Icon, color]) => (
          <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <Icon className={`h-5 w-5 ${color}`} />
              {key === 'conflicting_schedules' && Number(value) > 0 && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-600 dark:bg-red-500/15 dark:text-red-200">Review</span>}
            </div>
            <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">{value}</p>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-300">{label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200"><FiFilter /> Filters</div>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <select value={filters.doctor_id} onChange={(event) => setFilters((prev) => ({ ...prev, doctor_id: event.target.value }))} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-950 dark:text-white">
            <option value="">All doctors</option>
            {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}
          </select>
          <select value={filters.specialization} onChange={(event) => setFilters((prev) => ({ ...prev, specialization: event.target.value }))} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-950 dark:text-white">
            <option value="">All specializations</option>
            {specializations.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-950 dark:text-white">
            <option value="">All statuses</option>
            <option value="available">Available</option>
            <option value="busy">Busy</option>
            <option value="on_leave">On Leave</option>
            <option value="offline">Offline</option>
          </select>
          <input type="date" value={filters.date} onChange={(event) => setFilters((prev) => ({ ...prev, date: event.target.value }))} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-950 dark:text-white" />
          <select value={filters.period} onChange={(event) => setFilters((prev) => ({ ...prev, period: event.target.value }))} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-950 dark:text-white">
            <option value="day">Date</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
          </select>
          <button type="button" onClick={() => setFilters({ search: '', doctor_id: '', specialization: '', status: '', date: todayValue(), period: 'week' })} className="h-10 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200">Reset Filters</button>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-200"><FiAlertTriangle /></span>
            <div>
              <h2 className="text-base font-black text-slate-950 dark:text-white">Schedule Alerts</h2>
              <p className="text-sm text-slate-500 dark:text-slate-300">{alertItems.length ? `${alertItems.length} items need review` : 'No schedule alerts in the selected range'}</p>
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {alertItems.slice(0, 6).map((alert) => (
            <div key={alert.key} className={`flex items-center justify-between gap-4 rounded-2xl border p-4 ${alert.severity === 'Conflict' ? 'border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10' : 'border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10'}`}>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${alert.severity === 'Conflict' ? 'bg-red-500' : 'bg-amber-400'}`} />
                  <p className="font-bold text-slate-950 dark:text-white">{alert.doctor}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${healthStyles[alert.severity]}`}>{alert.severity}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-200">{alert.message}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-300">{alert.date ? formatDateLabel(alert.date) : 'Selected period'}</p>
              </div>
              <button type="button" onClick={() => openAlertReview(alert)} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100">
                Review <FiChevronRight />
              </button>
            </div>
          ))}
          {!alertItems.length && (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-white/10 dark:text-slate-300">All schedules look clear for this period.</div>
          )}
        </div>
      </section>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-4 py-4 dark:border-white/10">
          <h2 className="font-black text-slate-950 dark:text-white">Doctor Availability Roster</h2>
          <p className="text-sm text-slate-500 dark:text-slate-300">One row, one action. Detailed scheduling controls live inside each doctor's workspace.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1120px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                {['Doctor', 'Specialization', "Today's Status", "Today's Working Hours", "Today's Appointments", 'Next Available', 'Schedule Health', 'Actions'].map((head) => (
                  <th key={head} className="px-4 py-3">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {filteredBySearch.map((doctor) => {
                const health = getScheduleHealth(doctor);
                return (
                  <tr key={doctor.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar src={doctor.photo} name={doctor.name} role="doctor" size="lg" />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{doctor.name}</p>
                          <p className="text-xs text-slate-500">@{doctor.username || 'doctor'} {doctor.hospital ? `| ${doctor.hospital}` : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-700 dark:text-slate-200">{doctor.specialization}</td>
                    <td className="px-4 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusStyles[doctor.today_status] || statusStyles.Offline}`}>{doctor.today_status}</span></td>
                    <td className="px-4 py-4 text-slate-700 dark:text-slate-200">{doctor.working_hours}</td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-slate-950 dark:text-white">{doctor.booked_today}</div>
                      <div className="text-xs text-slate-500">{doctor.available_today} open slots</div>
                    </td>
                    <td className="px-4 py-4 text-slate-700 dark:text-slate-200">{doctor.next_available_date ? formatDateLabel(doctor.next_available_date) : '-'}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ring-1 ${healthStyles[health.label]}`}>
                        <span className={`h-2 w-2 rounded-full ${health.dot}`} /> {health.label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <button onClick={() => openDoctorDrawer(doctor, 'month')} className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-bold text-sky-700 shadow-sm hover:bg-sky-50 dark:border-sky-500/30 dark:bg-slate-950 dark:text-sky-200 dark:hover:bg-sky-500/10">
                        <FiCalendar /> View Schedule
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!filteredBySearch.length && (
                <tr><td colSpan="8" className="px-4 py-10 text-center text-slate-500">No doctor schedules found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        {[
          ['Most Busy Doctors', data?.analytics?.most_busy_doctors || []],
          ['Available Hours This Week', data?.analytics?.available_hours_week || []],
          ['Appointments Per Doctor', data?.analytics?.appointments_per_doctor || []],
          ['Vacation Distribution', data?.analytics?.vacation_distribution || []],
        ].map(([title, chartData]) => (
          <div key={title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">{title}</h3>
            <div className="mt-3 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" hide />
                  <YAxis allowDecimals={false} width={28} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0EA5E9" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      {selectedDoctor && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/45 backdrop-blur-sm">
          <aside className="h-full w-full max-w-7xl overflow-y-auto bg-slate-50 shadow-2xl dark:bg-slate-950">
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur dark:border-white/10 dark:bg-slate-950/95">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-center gap-4">
                  <Avatar src={selectedDoctor.photo} name={selectedDoctor.name} role="doctor" size="2xl" className="ring-4 ring-sky-100 dark:ring-sky-500/20" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-black text-slate-950 dark:text-white">{selectedDoctor.name}</h2>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusStyles[selectedDoctor.today_status] || statusStyles.Offline}`}>{selectedDoctor.today_status}</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{selectedDoctor.specialization} {selectedDoctor.hospital ? `| ${selectedDoctor.hospital}` : ''}</p>
                    <p className="text-xs text-slate-500">Experience: {selectedDoctor.experience || selectedDoctor.experience_years || 'Not specified'} | Availability: {selectedDoctor.next_available_date ? formatDateLabel(selectedDoctor.next_available_date) : 'No open slots in range'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => startRuleCreate(selectedDoctor)} className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-3 py-2 text-sm font-bold text-white shadow-sm shadow-sky-500/20"><FiEdit2 /> Edit Schedule</button>
                  <button type="button" onClick={() => setWorkspaceMode('block')} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:bg-slate-900 dark:text-red-200"><FiSlash /> Block Dates</button>
                  <button type="button" onClick={() => downloadText(`doctor-${selectedDoctor.id}-schedule.csv`, toCsv([selectedDoctor]))} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"><FiDownload /> Export</button>
                  <button onClick={() => setSelectedDoctor(null)} className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"><FiX /></button>
                </div>
              </div>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                {[
                  ["Appointments Today", selectedDoctor.booked_today, FiCalendar],
                  ['Working Hours', selectedDoctor.working_hours, FiClock],
                  ['Free Slots', selectedDoctor.statistics?.available_in_period ?? 0, FiCheckCircle],
                  ['Booked Slots', selectedDoctor.statistics?.booked_in_period ?? 0, FiBarChart2],
                  ['Vacation Days', selectedDoctor.statistics?.vacation_days ?? 0, FiSlash],
                  ['Upcoming Vacation', upcomingVacation ? formatDateLabel(upcomingVacation.date) : '-', FiShield],
                ].map(([label, value, Icon]) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
                    <Icon className="h-5 w-5 text-sky-500" />
                    <p className="mt-3 text-lg font-black text-slate-950 dark:text-white">{value}</p>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-300">{label}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="text-lg font-black text-slate-950 dark:text-white">Calendar Workspace</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-300">Click any day to inspect hours, patients, remaining slots, notes, and warnings.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {viewLabels.map(([view, label]) => (
                        <button
                          key={view}
                          type="button"
                          onClick={() => {
                            setCalendarView(view);
                            if (view !== 'day') setFilters((prev) => ({ ...prev, period: view }));
                          }}
                          className={`rounded-xl px-3 py-2 text-sm font-bold ${calendarView === view ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold text-slate-500 dark:text-slate-300">
                    {legend.map(([label, color]) => <span key={label} className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>)}
                  </div>
                  <div className="mt-4">
                    <CalendarGrid doctor={selectedDoctor} view={calendarView} selectedDate={selectedDay} onSelectDay={setSelectedDay} />
                  </div>
                </section>

                <aside className="space-y-4">
                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
                    <h3 className="font-black text-slate-950 dark:text-white">{formatDateLabel(selectedDay)}</h3>
                    <div className="mt-3 space-y-3 text-sm">
                      <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Working hours</p>
                        <p className="font-bold text-slate-900 dark:text-white">{selectedDayData?.slots?.length ? `${selectedDayData.slots[0].start} - ${selectedDayData.slots[selectedDayData.slots.length - 1].end}` : selectedDayData?.blocked ? selectedDayData.reason || 'Blocked' : 'Unavailable'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950"><p className="text-xs text-slate-500">Booked</p><p className="font-black dark:text-white">{selectedDayData?.slots?.filter((slot) => slot.booked).length || 0}</p></div>
                        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950"><p className="text-xs text-slate-500">Remaining</p><p className="font-black dark:text-white">{selectedDayData?.slots?.filter((slot) => !slot.booked).length || 0}</p></div>
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Appointments and patients</p>
                        <div className="space-y-2">
                          {selectedDayAppointments.map((item) => <div key={item.id} className="rounded-xl border border-slate-100 p-3 dark:border-white/10 dark:text-slate-100">{item.time} | {item.status}{item.notes ? <p className="mt-1 text-xs text-slate-500">{item.notes}</p> : null}</div>)}
                          {!selectedDayAppointments.length && <p className="rounded-xl bg-slate-50 p-3 text-slate-500 dark:bg-slate-950 dark:text-slate-300">No appointments on this day.</p>}
                        </div>
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Warnings</p>
                        {(selectedDoctor.warnings || []).filter((warning) => !extractDateFromWarning(warning) || extractDateFromWarning(warning) === selectedDay).map((warning) => <p key={warning} className="rounded-xl bg-amber-50 p-3 text-amber-800 dark:bg-amber-500/10 dark:text-amber-100">{warning}</p>)}
                        {!(selectedDoctor.warnings || []).filter((warning) => !extractDateFromWarning(warning) || extractDateFromWarning(warning) === selectedDay).length && <p className="rounded-xl bg-slate-50 p-3 text-slate-500 dark:bg-slate-950 dark:text-slate-300">No warnings for this day.</p>}
                      </div>
                    </div>
                  </section>

                  {workspaceMode === 'block' && (
                    <form onSubmit={handleBlockDate} className="rounded-2xl border border-red-200 bg-white p-4 shadow-sm dark:border-red-500/20 dark:bg-slate-900">
                      <h3 className="font-black text-slate-950 dark:text-white">Block Dates</h3>
                      <div className="mt-3 space-y-3">
                        <input type="date" value={blockForm.start_date} onChange={(event) => setBlockForm((prev) => ({ ...prev, start_date: event.target.value }))} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-950 dark:text-white" />
                        <input type="date" value={blockForm.end_date} onChange={(event) => setBlockForm((prev) => ({ ...prev, end_date: event.target.value }))} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-950 dark:text-white" />
                        <input value={blockForm.reason} onChange={(event) => setBlockForm((prev) => ({ ...prev, reason: event.target.value }))} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-950 dark:text-white" />
                        <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-red-500 text-sm font-bold text-white"><FiSlash /> Block Dates</button>
                      </div>
                    </form>
                  )}
                </aside>
              </div>

              {workspaceMode === 'edit' && (
                <form onSubmit={handleSaveRule} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-black text-slate-950 dark:text-white">{ruleForm.rule_id ? 'Edit Schedule Rule' : 'Add Working Hours'}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-300">Admin schedule control for {selectedDoctor.name}.</p>
                    </div>
                    <button type="button" onClick={() => setRuleForm(createRuleForm(selectedDoctor.id))} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200">
                      <FiPlus /> New
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">Start Date<input type="date" min={todayValue()} value={ruleForm.start_date} onChange={(event) => setRuleForm((prev) => ({ ...prev, start_date: event.target.value }))} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-sky-400 dark:border-white/10 dark:bg-slate-950 dark:text-white" /></label>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">End Date<input type="date" min={ruleForm.start_date} value={ruleForm.end_date} onChange={(event) => setRuleForm((prev) => ({ ...prev, end_date: event.target.value }))} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-sky-400 dark:border-white/10 dark:bg-slate-950 dark:text-white" /></label>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">Start Time<input type="time" value={ruleForm.start_time} onChange={(event) => setRuleForm((prev) => ({ ...prev, start_time: event.target.value }))} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-sky-400 dark:border-white/10 dark:bg-slate-950 dark:text-white" /></label>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">End Time<input type="time" value={ruleForm.end_time} onChange={(event) => setRuleForm((prev) => ({ ...prev, end_time: event.target.value }))} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-sky-400 dark:border-white/10 dark:bg-slate-950 dark:text-white" /></label>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">Recurrence<select value={ruleForm.recurrence_type} onChange={(event) => changeRecurrence(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-sky-400 dark:border-white/10 dark:bg-slate-950 dark:text-white"><option value="weekdays">Every weekday</option><option value="weekends">Every weekend</option><option value="weekly">Selected weekdays</option><option value="daily">Every day in date range</option><option value="specific_date">Specific date only</option><option value="first_monday">First Monday of every month</option></select></label>
                  </div>
                  {ruleForm.recurrence_type === 'weekly' && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {dayOptions.map(([value, label]) => (
                        <button key={value} type="button" onClick={() => toggleRuleDay(value)} className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${ruleForm.recurrence_days.includes(value) ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-950 dark:text-slate-300'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="submit" disabled={savingRule} className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-bold text-white shadow-sm disabled:opacity-60">
                      {ruleForm.rule_id ? <FiEdit2 /> : <FiPlus />} {savingRule ? 'Saving...' : ruleForm.rule_id ? 'Update Schedule' : 'Add Working Hours'}
                    </button>
                    {ruleForm.rule_id && <button type="button" onClick={() => setRuleForm(createRuleForm(selectedDoctor.id))} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200"><FiX /> Cancel Edit</button>}
                  </div>
                </form>
              )}

              <div className="grid gap-5 xl:grid-cols-2">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
                  <h3 className="font-black text-slate-950 dark:text-white">Active Schedule Rules</h3>
                  <div className="mt-3 space-y-2">
                    {(selectedDoctor.availability_rules || []).map((rule) => {
                      const expired = rule.end_date && rule.end_date < todayValue();
                      const locked = expired || rule.legacy || String(rule.id).startsWith('legacy-');
                      return (
                        <div key={rule.id} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-950">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold text-slate-900 dark:text-white">{String(rule.recurrence_type || 'weekly').replaceAll('_', ' ')}</p>
                              {expired && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">Past</span>}
                              {rule.legacy && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">Legacy</span>}
                            </div>
                            <p className="mt-1 text-slate-500 dark:text-slate-300">{rule.start_date || 'Today'} to {rule.end_date || 'Open'} | {rule.start_time} - {rule.end_time}</p>
                            <p className="text-sky-600 dark:text-sky-300">{rule.recurrence_days || rule.day_of_week || 'Calendar rule'}</p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            {!locked && <button type="button" onClick={() => startRuleEdit(selectedDoctor, rule)} className="rounded-lg p-2 text-sky-600 hover:bg-sky-50 dark:text-sky-200 dark:hover:bg-sky-500/10" title="Edit schedule"><FiEdit2 /></button>}
                            {!locked && <button type="button" onClick={() => handleDeleteRule(selectedDoctor, rule)} className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" title="Remove slots"><FiTrash2 /></button>}
                          </div>
                        </div>
                      );
                    })}
                    {!selectedDoctor.availability_rules?.length && <p className="text-sm text-slate-500">No active schedule rules.</p>}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
                  <h3 className="font-black text-slate-950 dark:text-white">Vacation Dates</h3>
                  <div className="mt-3 space-y-2">
                    {selectedDoctor.vacations.map((item) => (
                      <div key={item.id || item.date} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-950 dark:text-slate-100">
                        <span>{formatDateLabel(item.date)} | {item.reason}</span>
                        {item.id && <button onClick={() => handleUnblock(item.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" title="Cancel vacation"><FiX /></button>}
                      </div>
                    ))}
                    {!selectedDoctor.vacations.length && <p className="text-sm text-slate-500">No vacation dates.</p>}
                  </div>
                </section>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default DoctorSchedules;
