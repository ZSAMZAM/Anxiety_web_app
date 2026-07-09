import { FiCalendar, FiPlus, FiTrash2, FiClock } from 'react-icons/fi';
import { useState, useEffect } from 'react';
import { api } from '../../services/api.js';

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function DoctorSchedule() {
  const [schedule, setSchedule] = useState({
    workingHours: '09:00 AM - 06:00 PM',
    weeklySlots: {},
    vacationDates: [],
  });
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [slotFrom, setSlotFrom] = useState('09:00');
  const [slotTo, setSlotTo] = useState('13:00');
  const [vacationDate, setVacationDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    setLoading(true);
    try {
      const response = await api.get('/profile');
      if (response.user) {
        const availabilitySchedule = response.user.availability_schedule;
        if (availabilitySchedule) {
          try {
            const parsed = typeof availabilitySchedule === 'string' 
              ? JSON.parse(availabilitySchedule) 
              : availabilitySchedule;
            setSchedule(parsed);
          } catch (e) {
            console.error('Failed to parse availability schedule:', e);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load schedule:', err);
      setError('Failed to load schedule from server.');
    } finally {
      setLoading(false);
    }
  };

  const saveScheduleToBackend = async (updatedSchedule) => {
    setSaving(true);
    setError('');
    try {
      await api.put('/profile', {
        availability_schedule: JSON.stringify(updatedSchedule),
      });
    } catch (err) {
      console.error('Failed to save schedule:', err);
      setError('Failed to save schedule to server.');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleAddSlot = async () => {
    if (!slotFrom || !slotTo) return;
    const nextSlot = `${slotFrom} - ${slotTo}`;
    const updatedSlots = [...(schedule.weeklySlots[selectedDay] || []), nextSlot];
    const nextSchedule = {
      ...schedule,
      weeklySlots: {
        ...schedule.weeklySlots,
        [selectedDay]: updatedSlots,
      },
    };
    setSchedule(nextSchedule);
    try {
      await saveScheduleToBackend(nextSchedule);
    } catch (err) {
      // Revert on error
      setSchedule(schedule);
    }
  };

  const handleDeleteSlot = async (day, slotIndex) => {
    const nextSchedule = {
      ...schedule,
      weeklySlots: {
        ...schedule.weeklySlots,
        [day]: schedule.weeklySlots[day].filter((_, index) => index !== slotIndex),
      },
    };
    setSchedule(nextSchedule);
    try {
      await saveScheduleToBackend(nextSchedule);
    } catch (err) {
      // Revert on error
      setSchedule(schedule);
    }
  };

  const handleAddVacation = async () => {
    if (!vacationDate) return;
    const nextSchedule = {
      ...schedule,
      vacationDates: Array.from(new Set([...schedule.vacationDates, vacationDate])).sort(),
    };
    setSchedule(nextSchedule);
    try {
      await saveScheduleToBackend(nextSchedule);
      setVacationDate('');
    } catch (err) {
      // Revert on error
      setSchedule(schedule);
    }
  };

  const handleRemoveVacation = async (date) => {
    const nextSchedule = {
      ...schedule,
      vacationDates: schedule.vacationDates.filter((d) => d !== date),
    };
    setSchedule(nextSchedule);
    try {
      await saveScheduleToBackend(nextSchedule);
    } catch (err) {
      // Revert on error
      setSchedule(schedule);
    }
  };

  const workingHours = schedule.workingHours || '09:00 AM - 06:00 PM';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Doctor Schedule</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Manage your weekly availability and vacation dates.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {saving && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <p className="text-sm text-blue-800">Saving changes...</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Schedule Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Working Hours Card */}
          <div className="rounded-xl bg-white border border-slate-200 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-slate-800">
                <FiClock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Working Hours</p>
                <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{workingHours}</p>
              </div>
            </div>
          </div>

          {/* Add Slot Section */}
          <div className="rounded-xl bg-white border border-slate-200 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Add Available Slot</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-4 items-end">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Day</label>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                >
                  {daysOfWeek.map((day) => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">From</label>
                <input
                  type="time"
                  value={slotFrom}
                  onChange={(e) => setSlotFrom(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">To</label>
                <input
                  type="time"
                  value={slotTo}
                  onChange={(e) => setSlotTo(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <button
                onClick={handleAddSlot}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
              >
                <FiPlus className="h-4 w-4" />
                Add Slot
              </button>
            </div>
          </div>

          {/* Weekly Schedule */}
          <div className="rounded-xl bg-white border border-slate-200 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">Weekly Availability</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {daysOfWeek.map((day) => (
                <div key={day} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100">{day}</h3>
                    <span className="inline-block rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-slate-800 dark:text-blue-400">
                      {schedule.weeklySlots[day]?.length || 0}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {schedule.weeklySlots[day]?.length ? (
                      schedule.weeklySlots[day].map((slot, idx) => (
                        <div key={idx} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900/80">
                          <span className="text-sm text-slate-700 dark:text-slate-300">{slot}</span>
                          <button
                            onClick={() => handleDeleteSlot(day, idx)}
                            className="text-red-500 hover:text-red-700 transition"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400">No slots</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Vacation Sidebar */}
        <div className="space-y-6">
          {/* Add Vacation */}
          <div className="rounded-xl bg-white border border-slate-200 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Add Vacation</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Date</label>
                <input
                  type="date"
                  value={vacationDate}
                  onChange={(e) => setVacationDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <button
                onClick={handleAddVacation}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
              >
                <FiPlus className="h-4 w-4" />
                Add Vacation
              </button>
            </div>
          </div>

          {/* Vacation List */}
          <div className="rounded-xl bg-white border border-slate-200 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Blocked Dates</h2>
            <div className="space-y-2">
              {schedule.vacationDates?.length ? (
                schedule.vacationDates.map((date) => (
                  <div key={date} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900/80">
                    <span className="text-sm text-slate-700 dark:text-slate-300">{date}</span>
                    <button
                      onClick={() => handleRemoveVacation(date)}
                      className="text-red-500 hover:text-red-700 transition"
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">No vacation dates</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DoctorSchedule;

