import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiAlertTriangle,
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiEdit2,
  FiEye,
  FiPlus,
  FiRefreshCw,
  FiRepeat,
  FiSave,
  FiSlash,
  FiTrash2,
  FiX,
} from 'react-icons/fi';
import { api } from '../../services/api.js';

const dayOptions = [
  ['monday', 'Mon'],
  ['tuesday', 'Tue'],
  ['wednesday', 'Wed'],
  ['thursday', 'Thu'],
  ['friday', 'Fri'],
  ['saturday', 'Sat'],
  ['sunday', 'Sun'],
];

const recurrenceOptions = [
  ['one_time', 'One Time'],
  ['weekly', 'Weekly'],
  ['monthly', 'Monthly'],
  ['yearly', 'Yearly'],
  ['custom_days', 'Custom Days'],
];

const durationOptions = [10, 15, 20, 30, 45, 60, 90, 120];
const defaultTimezone = 'Africa/Mogadishu';
const monthOptions = [
  ['1', 'January'],
  ['2', 'February'],
  ['3', 'March'],
  ['4', 'April'],
  ['5', 'May'],
  ['6', 'June'],
  ['7', 'July'],
  ['8', 'August'],
  ['9', 'September'],
  ['10', 'October'],
  ['11', 'November'],
  ['12', 'December'],
];

const legendItems = [
  ['Available', 'bg-emerald-500'],
  ['Partially booked', 'bg-orange-400'],
  ['Fully booked', 'bg-red-400'],
  ['No schedule', 'bg-slate-400'],
];

const todayValue = () => new Date().toISOString().slice(0, 10);

function addDays(date, days) {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function currentTimeValue() {
  return new Date().toTimeString().slice(0, 5);
}

function minutesBetween(start, end) {
  const [startHour, startMinute] = String(start || '').split(':').map(Number);
  const [endHour, endMinute] = String(end || '').split(':').map(Number);
  if (![startHour, startMinute, endHour, endMinute].every(Number.isFinite)) return 0;
  return (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
}

function makeRuleForm() {
  return {
    start_date: todayValue(),
    end_date: '',
    start_time: '09:00',
    end_time: '17:00',
    appointment_duration_minutes: 10,
    timezone: defaultTimezone,
    recurrence_type: 'one_time',
    recurrence_days: [],
    day_of_month: Number(todayValue().slice(8, 10)),
    yearly_month: Number(todayValue().slice(5, 7)),
    yearly_day: Number(todayValue().slice(8, 10)),
  };
}

function monthStart(monthValue) {
  return `${monthValue}-01`;
}

function shiftMonth(monthValue, offset) {
  const date = new Date(`${monthValue}-01T00:00:00`);
  date.setMonth(date.getMonth() + offset);
  return date.toISOString().slice(0, 7);
}

function monthLabel(monthValue) {
  return new Date(`${monthValue}-01T00:00:00`).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

function formatDate(value) {
  if (!value) return 'No end date';
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(value) {
  if (!value) return '--';
  const [hour, minute] = String(value).slice(0, 5).split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function dayName(day) {
  return String(day || '').charAt(0).toUpperCase() + String(day || '').slice(1);
}

function ordinal(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  const suffix = number % 100 >= 11 && number % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][number % 10] || 'th';
  return `${number}${suffix}`;
}

function validYearlyDate(month, day) {
  const date = new Date(2028, Number(month) - 1, Number(day));
  return date.getMonth() === Number(month) - 1 && date.getDate() === Number(day);
}

function normalizeDays(days) {
  if (Array.isArray(days)) return days;
  return String(days || '')
    .split(',')
    .map((day) => day.trim())
    .filter(Boolean);
}

function recurrenceLabel(rule) {
  const type = String(rule.recurrence_type || 'weekly').toLowerCase();
  const days = normalizeDays(rule.recurrence_days || rule.day_of_week);
  const metadata = rule.recurrence_metadata || {};
  if (type === 'one_time' || type === 'specific_date' || type === 'once') return `One Time: ${formatDate(rule.start_date)}`;
  if (type === 'monthly') return `Monthly: Every ${ordinal(metadata.day_of_month || String(rule.start_date || '').slice(8, 10))} of the month`;
  if (type === 'yearly') {
    const month = monthOptions.find(([value]) => Number(value) === Number(metadata.month || String(rule.start_date || '').slice(5, 7)))?.[1] || 'Selected month';
    return `Yearly: Every ${month} ${Number(metadata.day || String(rule.start_date || '').slice(8, 10))}`;
  }
  if (days.length) return `${type === 'custom_days' ? 'Custom Days' : 'Weekly'}: Every ${days.map(dayName).join(', ')}`;
  return 'Weekly rule';
}

function ruleSummary(rule) {
  const timeRange = `${formatTime(rule.start_time)}-${formatTime(rule.end_time)}`;
  const days = normalizeDays(rule.recurrence_days);
  if (rule.recurrence_type === 'one_time') return `One Time: ${formatDate(rule.start_date)} • ${timeRange}`;
  if (rule.recurrence_type === 'weekly') return `Weekly: Every ${days.map(dayName).join(', ')} • ${timeRange}`;
  if (rule.recurrence_type === 'monthly') return `Monthly: Every ${ordinal(rule.day_of_month)} of the month • ${timeRange}`;
  if (rule.recurrence_type === 'yearly') {
    const month = monthOptions.find(([value]) => Number(value) === Number(rule.yearly_month))?.[1] || 'Month';
    return `Yearly: Every ${month} ${rule.yearly_day} • ${timeRange}`;
  }
  return `Custom Days: Every ${days.map(dayName).join(', ')} • ${timeRange}`;
}

function buildMonthDays(monthValue, calendarSlots = {}) {
  const first = new Date(`${monthValue}-01T00:00:00`);
  const cursor = new Date(first);
  cursor.setDate(cursor.getDate() - first.getDay());
  return Array.from({ length: 42 }, () => {
    const date = cursor.toISOString().slice(0, 10);
    const day = {
      date,
      inMonth: date.startsWith(monthValue),
      ...(calendarSlots[date] || { date, slots: [], available: false, blocked: false }),
    };
    cursor.setDate(cursor.getDate() + 1);
    return day;
  });
}

function buildWeekDays(anchorDate, calendarSlots = {}) {
  const base = new Date(`${anchorDate}T00:00:00`);
  base.setDate(base.getDate() - base.getDay());
  return Array.from({ length: 7 }, () => {
    const date = base.toISOString().slice(0, 10);
    const day = {
      date,
      inMonth: true,
      ...(calendarSlots[date] || { date, slots: [], available: false, blocked: false }),
    };
    base.setDate(base.getDate() + 1);
    return day;
  });
}

function dayTone(day) {
  const booked = (day.slots || []).filter((slot) => slot.booked).length;
  const open = (day.slots || []).filter((slot) => !slot.booked).length;
  if (day.blocked) return 'border-red-200 bg-red-50/70 dark:border-red-500/25 dark:bg-red-500/10';
  if (booked && !open) return 'border-red-200 bg-red-50/60 dark:border-red-500/25 dark:bg-red-500/10';
  if (booked && open) return 'border-orange-200 bg-orange-50/60 dark:border-orange-500/25 dark:bg-orange-500/10';
  if (open) return 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/25 dark:bg-emerald-500/10';
  return 'border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-slate-950/50';
}

function dayStatus(day) {
  const booked = (day.slots || []).filter((slot) => slot.booked).length;
  const open = (day.slots || []).filter((slot) => !slot.booked).length;
  if (day.blocked) return { key: 'conflict', label: day.reason || 'Blocked', dot: 'bg-red-400' };
  if (booked && !open) return { key: 'booked', label: 'Fully booked', dot: 'bg-red-400' };
  if (booked && open) return { key: 'busy', label: 'Partially booked', dot: 'bg-orange-400' };
  if (open) return { key: 'available', label: 'Available', dot: 'bg-emerald-500' };
  return { key: 'none', label: 'No schedule', dot: 'bg-slate-400' };
}

function ruleEndDate(rule) {
  if (rule.recurrence_type === 'one_time') return rule.start_date;
  return rule.end_date || addDays(rule.start_date || todayValue(), 365);
}

function ruleMatchesDate(rule, dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  const type = String(rule.recurrence_type || 'weekly').toLowerCase();
  const metadata = rule.recurrence_metadata || {};
  const start = rule.start_date || todayValue();
  const end = ruleEndDate(rule);
  if (dateValue < start || dateValue > end) return false;
  if (type === 'one_time' || type === 'specific_date' || type === 'once') return dateValue === start;
  if (type === 'monthly') return date.getDate() === Number(metadata.day_of_month || rule.day_of_month || start.slice(8, 10));
  if (type === 'yearly') {
    return date.getMonth() + 1 === Number(metadata.month || rule.yearly_month || start.slice(5, 7))
      && date.getDate() === Number(metadata.day || rule.yearly_day || start.slice(8, 10));
  }
  const day = WEEKDAY_INDEX_TO_NAME[date.getDay()];
  return normalizeDays(rule.recurrence_days || rule.day_of_week).includes(day);
}

const WEEKDAY_INDEX_TO_NAME = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function rulesConflict(candidate, existing) {
  const start = candidate.start_date > (existing.start_date || todayValue()) ? candidate.start_date : (existing.start_date || todayValue());
  const end = ruleEndDate(candidate) < ruleEndDate(existing) ? ruleEndDate(candidate) : ruleEndDate(existing);
  if (end < start) return '';
  let cursor = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  while (cursor <= endDate) {
    const dateValue = cursor.toISOString().slice(0, 10);
    if (ruleMatchesDate(candidate, dateValue) && ruleMatchesDate(existing, dateValue)) {
      if (candidate.start_time === existing.start_time && candidate.end_time === existing.end_time) {
        return `Duplicate schedule already exists on ${formatDate(dateValue)}.`;
      }
      if (candidate.start_time < existing.end_time && existing.start_time < candidate.end_time) {
        return `Schedule conflicts with ${formatTime(existing.start_time)}-${formatTime(existing.end_time)} on ${formatDate(dateValue)}.`;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return '';
}

function DoctorSchedule() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [schedule, setSchedule] = useState({ availability_rules: [], unavailable_dates: [], calendar_slots: {} });
  const [calendarMonth, setCalendarMonth] = useState(todayValue().slice(0, 7));
  const [calendarView, setCalendarView] = useState('month');
  const [selectedDate, setSelectedDate] = useState(todayValue());
  const [dayPanelOpen, setDayPanelOpen] = useState(false);
  const [calendarFilter, setCalendarFilter] = useState('all');
  const [doctorName, setDoctorName] = useState('Doctor');
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [rule, setRule] = useState(makeRuleForm);
  const [leave, setLeave] = useState({ start_date: todayValue(), end_date: todayValue(), reason: 'Vacation' });

  const formRef = useRef(null);
  const leaveRef = useRef(null);
  const calendarRef = useRef(null);

  const calendarDays = useMemo(() => {
    if (calendarView === 'day') {
      const day = schedule.calendar_slots?.[selectedDate] || { date: selectedDate, slots: [], available: false, blocked: false };
      return [{ ...day, inMonth: true }];
    }
    if (calendarView === 'week') return buildWeekDays(selectedDate, schedule.calendar_slots || {});
    return buildMonthDays(calendarMonth, schedule.calendar_slots || {});
  }, [calendarMonth, calendarView, schedule.calendar_slots, selectedDate]);

  const selectedDay = schedule.calendar_slots?.[selectedDate] || { date: selectedDate, slots: [], available: false, blocked: false };
  const canGoPreviousMonth = monthStart(calendarMonth) > todayValue();
  const maxMonth = addDays(todayValue(), 365).slice(0, 7);
  const canGoNextMonth = calendarMonth < maxMonth;
  const activeRules = schedule.availability_rules || [];
  const leaveDates = schedule.unavailable_dates || [];
  const bookedCount = Object.values(schedule.calendar_slots || {}).reduce((total, day) => total + (day.slots || []).filter((slot) => slot.booked).length, 0);
  const availableCount = Object.values(schedule.calendar_slots || {}).reduce((total, day) => total + (day.slots || []).filter((slot) => !slot.booked).length, 0);
  const conflictCount = Object.values(schedule.calendar_slots || {}).filter((day) => day.blocked).length;
  const todayDay = schedule.calendar_slots?.[todayValue()];
  const workingToday = !!todayDay && !todayDay.blocked && (todayDay.slots || []).length > 0;
  const mobileDays = useMemo(() => buildWeekDays(selectedDate, schedule.calendar_slots || {}), [selectedDate, schedule.calendar_slots]);

  const loadSchedule = async () => {
    setLoading(true);
    setError('');
    try {
      const start = addDays(monthStart(calendarMonth), -7);
      const end = addDays(monthStart(shiftMonth(calendarMonth, 1)), 7);
      const [data, profile] = await Promise.all([
        api.getDoctorSchedule({ start, end }),
        api.getDoctorProfile().catch(() => null),
      ]);
      setSchedule(data);
      const doctor = profile?.doctor || {};
      setDoctorName(doctor.fullname || doctor.name || doctor.username || 'Doctor');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load schedule from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedule();
  }, [calendarMonth]);

  const scrollTo = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleDay = (day) => {
    setRule((current) => {
      const days = new Set(current.recurrence_days || []);
      if (days.has(day)) days.delete(day);
      else days.add(day);
      return { ...current, recurrence_days: Array.from(days) };
    });
  };

  const changeRecurrence = (value) => {
    setRule((current) => {
      let recurrenceDays = current.recurrence_days || [];
      if (value === 'weekly' && !recurrenceDays.length) recurrenceDays = ['monday'];
      if (value === 'custom_days' && !recurrenceDays.length) recurrenceDays = ['monday'];
      if (['one_time', 'monthly', 'yearly'].includes(value)) recurrenceDays = [];
      return { ...current, recurrence_type: value, recurrence_days: recurrenceDays };
    });
  };

  const resetRuleForm = () => {
    setEditingRuleId(null);
    setRule(makeRuleForm());
  };

  const editRule = (item) => {
    if (item.legacy || String(item.id).startsWith('legacy-')) {
      setError('Imported legacy schedules cannot be edited. Create a new availability rule to replace it.');
      return;
    }
    const days = normalizeDays(item.recurrence_days);
    const metadata = item.recurrence_metadata || {};
    const recurrenceType = item.recurrence_type === 'specific_date' || item.recurrence_type === 'once' ? 'one_time' : item.recurrence_type || 'weekly';
    setEditingRuleId(item.id);
    setRule({
      start_date: item.start_date || todayValue(),
      end_date: item.end_date || '',
      start_time: item.start_time || '09:00',
      end_time: item.end_time || '17:00',
      appointment_duration_minutes: item.appointment_duration_minutes || item.duration_minutes || 30,
      timezone: item.timezone || defaultTimezone,
      recurrence_type: recurrenceType,
      recurrence_days: days,
      day_of_month: Number(metadata.day_of_month || String(item.start_date || todayValue()).slice(8, 10)),
      yearly_month: Number(metadata.month || String(item.start_date || todayValue()).slice(5, 7)),
      yearly_day: Number(metadata.day || String(item.start_date || todayValue()).slice(8, 10)),
    });
    setCalendarMonth((item.start_date || todayValue()).slice(0, 7));
    setSelectedDate(item.start_date || todayValue());
    scrollTo(formRef);
  };

  const validateRule = () => {
    const effectiveEndDate = ruleEndDate(rule);
    if (!rule.start_date || !rule.start_time || !rule.end_time) return 'Date, start time, and end time are required.';
    if (rule.recurrence_type === 'one_time' && rule.start_date < todayValue()) return 'One Time schedules cannot use a past date.';
    if (rule.start_date < todayValue()) return 'Start date cannot be in the past.';
    if (effectiveEndDate < rule.start_date) return 'End date cannot be before start date.';
    if (rule.start_time >= rule.end_time) return 'End time must be after start time.';
    if (rule.recurrence_type === 'one_time' && rule.start_date === todayValue() && rule.start_time <= currentTimeValue()) return "Start time cannot be in the past for today's schedule.";
    if (effectiveEndDate > addDays(todayValue(), 365)) return 'Availability can only be created for the next 12 months.';
    if (!durationOptions.includes(Number(rule.appointment_duration_minutes))) return 'Appointment duration must be 10, 15, 20, 30, 45, 60, 90, or 120 minutes.';
    if (minutesBetween(rule.start_time, rule.end_time) < 10) return 'Working hours must be at least 10 minutes.';
    if (minutesBetween(rule.start_time, rule.end_time) < Number(rule.appointment_duration_minutes)) return 'This duration exceeds working hours.';
    if (minutesBetween(rule.start_time, rule.end_time) > 12 * 60) return 'Working hours cannot exceed 12 hours per day.';
    if ((rule.recurrence_type === 'weekly' || rule.recurrence_type === 'custom_days') && !(rule.recurrence_days || []).length) return 'Select at least one weekday.';
    if (rule.recurrence_type === 'monthly' && (Number(rule.day_of_month) < 1 || Number(rule.day_of_month) > 31)) return 'Monthly day must be valid from 1 to 31.';
    if (rule.recurrence_type === 'yearly' && !validYearlyDate(rule.yearly_month, rule.yearly_day)) return 'Yearly date must be valid. February 30 is not allowed.';
    const conflict = activeRules
      .filter((item) => !item.legacy && String(item.id) !== String(editingRuleId))
      .map((item) => rulesConflict(rule, item))
      .find(Boolean);
    if (conflict) return conflict;
    return '';
  };

  const saveRule = async (event) => {
    event.preventDefault();
    const validationError = validateRule();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        start_date: rule.start_date,
        end_date: ruleEndDate(rule),
        start_time: rule.start_time,
        end_time: rule.end_time,
        timezone: rule.timezone || defaultTimezone,
        appointment_duration_minutes: Number(rule.appointment_duration_minutes),
        recurrence_type: rule.recurrence_type,
        recurrence_days: ['weekly', 'custom_days'].includes(rule.recurrence_type) ? rule.recurrence_days : [],
        recurrence_metadata: rule.recurrence_type === 'monthly'
          ? { day_of_month: Number(rule.day_of_month) }
          : rule.recurrence_type === 'yearly'
            ? { month: Number(rule.yearly_month), day: Number(rule.yearly_day) }
            : {},
        day_of_month: Number(rule.day_of_month),
        yearly_month: Number(rule.yearly_month),
        yearly_day: Number(rule.yearly_day),
      };
      if (editingRuleId) await api.updateDoctorAvailability(editingRuleId, payload);
      else await api.createDoctorAvailability(payload);
      resetRuleForm();
      await loadSchedule();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Unable to save availability.');
    } finally {
      setSaving(false);
    }
  };

  const removeRule = async (ruleItem) => {
    if (ruleItem.legacy || String(ruleItem.id).startsWith('legacy-')) {
      setError('Imported legacy schedules cannot be deleted. Create a new rule to replace legacy availability.');
      return;
    }
    if (!window.confirm('Delete this availability rule? Booked appointments must be handled first.')) return;
    setSaving(true);
    setError('');
    try {
      await api.deleteDoctorAvailability(ruleItem.id);
      await loadSchedule();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Unable to remove availability.');
    } finally {
      setSaving(false);
    }
  };

  const saveLeave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (!leave.start_date || !leave.end_date) throw new Error('Start and end dates are required.');
      if (leave.start_date < todayValue()) throw new Error('Unavailable dates cannot be created in the past.');
      if (leave.end_date < leave.start_date) throw new Error('End date cannot be before start date.');
      if (leave.end_date > addDays(todayValue(), 365)) throw new Error('Unavailable dates can only be created for the next 12 months.');
      await api.createDoctorUnavailableDates(leave);
      setLeave({ start_date: todayValue(), end_date: todayValue(), reason: 'Vacation' });
      await loadSchedule();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Unable to save unavailable dates.');
    } finally {
      setSaving(false);
    }
  };

  const removeLeave = async (blockId) => {
    setSaving(true);
    setError('');
    try {
      await api.deleteDoctorUnavailableDate(blockId);
      await loadSchedule();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Unable to remove unavailable date.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-700 dark:text-slate-200">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-cyan-500" />
          <p className="mt-4">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-300">Doctor Schedule</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-slate-50">Calendar-based availability management</h1>
          <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-300">Create, edit, update, and remove availability rules. Patients only see open slots that pass schedule validation.</p>
        </div>
        <button type="button" onClick={loadSchedule} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100">
          <FiRefreshCw /> Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      )}
      {saving && (
        <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-semibold text-cyan-700 dark:border-cyan-400/30 dark:bg-cyan-500/10 dark:text-cyan-200">
          Saving changes to the database...
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <h2 className="text-xl font-black text-slate-950 dark:text-white">Quick Actions</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ['Add Availability', 'Set working hours', FiPlus, () => scrollTo(formRef), 'from-cyan-500 to-blue-600'],
            ['Block Dates', 'Mark unavailable days', FiSlash, () => scrollTo(leaveRef), 'from-red-500 to-orange-500'],
            ['Add Vacation', 'Vacation or leave', FiClock, () => scrollTo(leaveRef), 'from-orange-500 to-amber-500'],
            ['View Calendar', 'Open full calendar', FiEye, () => scrollTo(calendarRef), 'from-slate-800 to-slate-600'],
          ].map(([title, subtitle, Icon, action, gradient]) => (
            <button key={title} type="button" onClick={action} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-slate-950">
              <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-sm`}>
                <Icon />
              </span>
              <p className="mt-4 font-black text-slate-950 dark:text-white">{title}</p>
              <p className="text-sm text-slate-500 dark:text-slate-300">{subtitle}</p>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-4">
        {[
          ['Active Rules', activeRules.length, FiRepeat, 'text-cyan-500'],
          ['Available Slots', availableCount, FiCheckCircle, 'text-emerald-500'],
          ['Booked Slots', bookedCount, FiCalendar, 'text-blue-500'],
          ['Unavailable Days', leaveDates.length, FiAlertTriangle, 'text-orange-500'],
        ].map(([label, value, Icon, tone]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <Icon className={`h-5 w-5 ${tone}`} />
            <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{value}</p>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-300">{label}</p>
          </div>
        ))}
      </div>

      <section ref={formRef} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white"><FiCalendar /></span>
            <div>
              <h2 className="text-xl font-black text-slate-950 dark:text-white">Availability Form</h2>
              <p className="text-sm text-slate-500 dark:text-slate-300">{editingRuleId ? 'Editing an existing rule. Saving updates the same rule.' : 'Create a working-hours rule for patient booking.'}</p>
            </div>
          </div>
          {editingRuleId && <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700 ring-1 ring-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-200 dark:ring-cyan-500/30">Editing rule #{editingRuleId}</span>}
        </div>

        <form onSubmit={saveRule} className="mt-5 space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2 text-sm font-bold text-slate-700 dark:text-slate-200">Recurrence<select value={rule.recurrence_type} onChange={(e) => changeRecurrence(e.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-950 dark:text-white">{recurrenceOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            {rule.recurrence_type === 'one_time' && (
              <label className="space-y-2 text-sm font-bold text-slate-700 dark:text-slate-200">Date<input type="date" min={todayValue()} value={rule.start_date} onChange={(e) => setRule({ ...rule, start_date: e.target.value })} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-950 dark:text-white" /></label>
            )}
            {rule.recurrence_type === 'monthly' && (
              <label className="space-y-2 text-sm font-bold text-slate-700 dark:text-slate-200">Day of Month<select value={rule.day_of_month} onChange={(e) => setRule({ ...rule, day_of_month: Number(e.target.value) })} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-950 dark:text-white">{Array.from({ length: 31 }, (_, index) => index + 1).map((day) => <option key={day} value={day}>{ordinal(day)}</option>)}</select></label>
            )}
            {rule.recurrence_type === 'yearly' && (
              <>
                <label className="space-y-2 text-sm font-bold text-slate-700 dark:text-slate-200">Month<select value={rule.yearly_month} onChange={(e) => setRule({ ...rule, yearly_month: Number(e.target.value) })} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-950 dark:text-white">{monthOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="space-y-2 text-sm font-bold text-slate-700 dark:text-slate-200">Day<select value={rule.yearly_day} onChange={(e) => setRule({ ...rule, yearly_day: Number(e.target.value) })} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-950 dark:text-white">{Array.from({ length: 31 }, (_, index) => index + 1).map((day) => <option key={day} value={day}>{day}</option>)}</select></label>
              </>
            )}
            <label className="space-y-2 text-sm font-bold text-slate-700 dark:text-slate-200">Start Time<input type="time" value={rule.start_time} onChange={(e) => setRule({ ...rule, start_time: e.target.value })} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-950 dark:text-white" /></label>
            <label className="space-y-2 text-sm font-bold text-slate-700 dark:text-slate-200">End Time<input type="time" value={rule.end_time} onChange={(e) => setRule({ ...rule, end_time: e.target.value })} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-950 dark:text-white" /></label>
            <label className="space-y-2 text-sm font-bold text-slate-700 dark:text-slate-200">Slot Duration<select value={rule.appointment_duration_minutes} onChange={(e) => setRule({ ...rule, appointment_duration_minutes: Number(e.target.value) })} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-950 dark:text-white">{durationOptions.map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}</select></label>
          </div>

          {(rule.recurrence_type === 'weekly' || rule.recurrence_type === 'custom_days') && (
            <div className="space-y-2">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Weekdays</p>
              <div className="flex flex-wrap gap-2">
              {dayOptions.map(([value, label]) => (
                <button key={value} type="button" onClick={() => toggleDay(value)} className={`rounded-full px-4 py-2 text-sm font-bold transition ${rule.recurrence_days.includes(value) ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-950 dark:text-slate-300'}`}>
                  {label}
                </button>
              ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-sm font-bold text-cyan-900 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-100">
            {ruleSummary(rule)}
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-cyan-600/20 disabled:opacity-60">
              <FiSave /> {editingRuleId ? 'Update Availability' : 'Save Availability'}
            </button>
            <button type="button" onClick={resetRuleForm} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10">
              <FiX /> Reset
            </button>
          </div>
        </form>
      </section>

      <section ref={leaveRef} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-white"><FiSlash /></span>
          <div>
            <h2 className="text-xl font-black text-slate-950 dark:text-white">Block Dates and Vacations</h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">Unavailable days are hidden from patient booking after backend validation.</p>
          </div>
        </div>
        <form onSubmit={saveLeave} className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_2fr_auto]">
          <input type="date" min={todayValue()} value={leave.start_date} onChange={(e) => setLeave({ ...leave, start_date: e.target.value })} className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-950 dark:text-white" />
          <input type="date" min={leave.start_date} value={leave.end_date} onChange={(e) => setLeave({ ...leave, end_date: e.target.value })} className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-950 dark:text-white" />
          <input value={leave.reason} onChange={(e) => setLeave({ ...leave, reason: e.target.value })} placeholder="Vacation, training, emergency leave..." className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-950 dark:text-white" />
          <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white"><FiPlus /> Add</button>
        </form>
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {leaveDates.slice(0, 8).map((item) => (
            <div key={`${item.id}-${item.date}`} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-950">
              <span className="font-semibold text-slate-700 dark:text-slate-200">{formatDate(item.date)} | {item.reason || 'Unavailable'}</span>
              {item.id && <button type="button" onClick={() => removeLeave(item.id)} className="rounded-full p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"><FiTrash2 /></button>}
            </div>
          ))}
          {!leaveDates.length && <p className="text-sm text-slate-500 dark:text-slate-300">No blocked dates or vacations.</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <h2 className="text-xl font-black text-slate-950 dark:text-white">Active Availability Rules</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {activeRules.map((item) => {
            const legacy = item.legacy || String(item.id).startsWith('legacy-');
            return (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-slate-950 dark:text-white">{recurrenceLabel(item)}</h3>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/30">Active</span>
                      {legacy && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-500/30">Legacy</span>}
                    </div>
                    <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">{formatTime(item.start_time)} - {formatTime(item.end_time)}</p>
                    <p className="text-sm font-bold text-cyan-700 dark:text-cyan-200">{item.appointment_duration_minutes || item.duration_minutes || 30} minute appointment slots</p>
                    <p className="text-sm text-slate-500 dark:text-slate-300">{formatDate(item.start_date)} to {formatDate(item.end_date)}</p>
                  </div>
                  <div className="flex gap-1">
                    {!legacy && <button type="button" onClick={() => editRule(item)} className="inline-flex items-center gap-1 rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm font-bold text-cyan-700 hover:bg-cyan-50 dark:border-cyan-500/30 dark:bg-slate-900 dark:text-cyan-200"><FiEdit2 /> Edit</button>}
                    {!legacy && <button type="button" onClick={() => removeRule(item)} className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:bg-slate-900 dark:text-red-200"><FiTrash2 /> Delete</button>}
                  </div>
                </div>
              </div>
            );
          })}
          {!activeRules.length && <p className="text-slate-500 dark:text-slate-300">No availability rules yet.</p>}
        </div>
      </section>

      <section ref={calendarRef} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-950 dark:text-white">Calendar Overview</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Quick view of patient-facing availability</p>
          </div>
          <div className="flex min-w-0 items-center gap-1.5">
            <button type="button" onClick={() => { setCalendarMonth(todayValue().slice(0, 7)); setSelectedDate(todayValue()); }} className="h-8 rounded-md border border-slate-200 px-3 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200">Today</button>
            <div className="hidden rounded-md bg-slate-100 p-0.5 sm:flex dark:bg-slate-950">
              {['month', 'week'].map((view) => <button key={view} type="button" onClick={() => setCalendarView(view)} className={`h-7 rounded px-2.5 text-xs font-bold capitalize ${calendarView === view ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-300' : 'text-slate-500'}`}>{view}</button>)}
            </div>
            <button type="button" disabled={!canGoPreviousMonth} onClick={() => setCalendarMonth((value) => shiftMonth(value, -1))} aria-label="Previous month" className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-500 disabled:opacity-30 dark:border-white/10"><FiChevronLeft /></button>
            <span className="w-28 text-center text-xs font-black text-slate-700 sm:w-32 dark:text-slate-200">{monthLabel(calendarMonth)}</span>
            <button type="button" disabled={!canGoNextMonth} onClick={() => setCalendarMonth((value) => shiftMonth(value, 1))} aria-label="Next month" className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-500 disabled:opacity-30 dark:border-white/10"><FiChevronRight /></button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            ['today', 'Working today', workingToday ? 'Yes' : 'No', workingToday ? 'text-emerald-600' : 'text-slate-500'],
            ['booked', 'Appointments', bookedCount, 'text-blue-600'],
            ['available', 'Available slots', availableCount, 'text-emerald-600'],
            ['busy', 'Booked slots', bookedCount, 'text-orange-600'],
            ['conflict', 'Conflicts', conflictCount, conflictCount ? 'text-red-600' : 'text-slate-500'],
          ].map(([key, label, value, tone]) => (
            <button key={key} type="button" onClick={() => { if (key === 'today') { setCalendarMonth(todayValue().slice(0, 7)); setSelectedDate(todayValue()); setDayPanelOpen(true); } else { setCalendarFilter(calendarFilter === key ? 'all' : key); } }} className={`min-h-14 rounded-md border px-3 py-2 text-left transition ${calendarFilter === key ? 'border-blue-300 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-500/10' : 'border-slate-200 hover:border-slate-300 dark:border-white/10'}`}>
              <span className={`block text-base font-black ${tone}`}>{value}</span><span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">{label}</span>
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-3 border-y border-slate-100 py-2 text-[11px] font-bold text-slate-500 dark:border-white/5 dark:text-slate-400">
          {legendItems.map(([label, color]) => <span key={label} className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${color}`} />{label}</span>)}
        </div>

        <div className="hidden sm:block">
          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase text-slate-400">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="mt-1.5 grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const booked = (day.slots || []).filter((slot) => slot.booked).length;
              const open = (day.slots || []).filter((slot) => !slot.booked).length;
              const status = dayStatus(day);
              const filteredOut = calendarFilter !== 'all' && calendarFilter !== 'today' && status.key !== calendarFilter;
              return (
                <button key={day.date} type="button" onClick={() => { setSelectedDate(day.date); setDayPanelOpen(true); }} className={`h-[72px] min-w-0 rounded-md border p-2 text-left transition hover:border-blue-300 hover:shadow-sm ${dayTone(day)} ${!day.inMonth || filteredOut ? 'opacity-35' : ''} ${day.date === todayValue() ? 'ring-1 ring-blue-500' : ''}`}>
                  <div className="flex items-center justify-between"><span className={`text-xs font-black ${day.date === todayValue() ? 'text-blue-600' : 'text-slate-900 dark:text-white'}`}>{Number(day.date.slice(8, 10))}</span><span className={`h-2 w-2 rounded-full ${status.dot}`} title={status.label} /></div>
                  <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400"><span>{booked} booked</span><span>{open} open</span></div>
                  {!!day.blocked && <p className="mt-1 truncate text-[9px] font-bold text-red-600">{day.reason || 'Conflict'}</p>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3 space-y-1.5 sm:hidden">
          {mobileDays.map((day) => {
            const status = dayStatus(day);
            const booked = (day.slots || []).filter((slot) => slot.booked).length;
            const open = (day.slots || []).filter((slot) => !slot.booked).length;
            return <button key={day.date} type="button" onClick={() => { setSelectedDate(day.date); setDayPanelOpen(true); }} className={`flex w-full items-center justify-between rounded-md border p-3 text-left ${dayTone(day)} ${day.date === todayValue() ? 'ring-1 ring-blue-500' : ''}`}><span><span className="block text-xs font-black text-slate-900 dark:text-white">{formatDate(day.date)}</span><span className="mt-0.5 block text-[11px] text-slate-500">{booked} booked · {open} available</span></span><span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500"><span className={`h-2 w-2 rounded-full ${status.dot}`} />{status.label}</span></button>;
          })}
        </div>
      </section>

      {dayPanelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35" onMouseDown={() => setDayPanelOpen(false)}>
          <aside className="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-2xl dark:bg-slate-900" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-slate-200 pb-4 dark:border-white/10"><div><p className="text-xs font-bold uppercase text-blue-600">Day schedule</p><h3 className="mt-1 text-xl font-black text-slate-950 dark:text-white">{formatDate(selectedDate)}</h3><p className="text-sm text-slate-500">{doctorName}</p></div><button type="button" onClick={() => setDayPanelOpen(false)} aria-label="Close day details" className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-500 dark:border-white/10"><FiX /></button></div>
            <div className="mt-5 grid grid-cols-2 gap-2 text-sm"><div className="rounded-md bg-slate-50 p-3 dark:bg-slate-950"><p className="text-xs text-slate-500">Working hours</p><p className="mt-1 font-bold text-slate-900 dark:text-white">{selectedDay.slots?.length ? `${formatTime(selectedDay.slots[0].start)} - ${formatTime(selectedDay.slots[selectedDay.slots.length - 1].end)}` : 'Not scheduled'}</p></div><div className="rounded-md bg-slate-50 p-3 dark:bg-slate-950"><p className="text-xs text-slate-500">Break time</p><p className="mt-1 font-bold text-slate-900 dark:text-white">Not configured</p></div></div>
            {!!selectedDay.blocked && <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700"><FiAlertTriangle className="mr-2 inline" />{selectedDay.reason || 'Schedule conflict'}</div>}
            <div className="mt-5"><h4 className="text-sm font-black text-slate-900 dark:text-white">Appointments and slots</h4><div className="mt-2 divide-y divide-slate-100 rounded-md border border-slate-200 dark:divide-white/5 dark:border-white/10">{(selectedDay.slots || []).map((slot) => <div key={`${selectedDate}-${slot.start}`} className="flex items-center justify-between px-3 py-2.5"><span className="text-sm font-bold text-slate-700 dark:text-slate-200">{formatTime(slot.start)} - {formatTime(slot.end)}</span><span className={`rounded-full px-2 py-1 text-[10px] font-black ${slot.booked ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{slot.booked ? 'Booked' : 'Available'}</span></div>)}{!selectedDay.slots?.length && <p className="p-4 text-sm text-slate-500">No schedule for this day.</p>}</div></div>
            <div className="mt-6 grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => { setDayPanelOpen(false); scrollTo(formRef); }} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-bold text-white"><FiEdit2 /> Edit Schedule</button><button type="button" onClick={() => { setRule((current) => ({ ...current, start_date: selectedDate })); setDayPanelOpen(false); scrollTo(formRef); }} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-bold text-slate-700 dark:border-white/10 dark:text-slate-200"><FiPlus /> Add Availability</button><button type="button" onClick={() => setDayPanelOpen(false)} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-bold text-slate-700 sm:col-span-2 dark:border-white/10 dark:text-slate-200"><FiEye /> View Appointments</button></div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default DoctorSchedule;
