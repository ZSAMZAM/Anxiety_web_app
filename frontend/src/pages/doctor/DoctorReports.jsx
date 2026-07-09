import { FiFileText, FiDownload, FiFilter, FiSearch } from 'react-icons/fi';
import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';

function DoctorReports() {
  const [appointments, setAppointments] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await api.getDoctorAppointments();
        const completed = (result.appointments || []).filter((apt) => apt.status === 'Completed');
        setAppointments(completed);
        setFilteredReports(completed);
      } catch (err) {
        console.error('Failed to load reports:', err);
        setError(err.message || 'Unable to load reports.');
      } finally {
        setLoading(false);
      }
    };
    loadReports();
  }, []);

  useEffect(() => {
    let filtered = appointments;

    if (searchTerm) {
      filtered = filtered.filter((apt) =>
        apt.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.patient_email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (dateFilter !== 'all') {
      const today = new Date();
      const startDate = new Date();

      if (dateFilter === 'week') {
        startDate.setDate(today.getDate() - 7);
      } else if (dateFilter === 'month') {
        startDate.setMonth(today.getMonth() - 1);
      }

      filtered = filtered.filter((apt) => {
        const aptDate = new Date(apt.appointment_date);
        return aptDate >= startDate;
      });
    }

    setFilteredReports(filtered);
  }, [appointments, searchTerm, dateFilter]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Reports</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">View and manage your completed patient consultations and reports.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm dark:border-red-900 dark:bg-red-950">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-lg bg-white border border-slate-200 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950">
        <div className="grid gap-4 md:grid-cols-3 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Search Patient</label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Date Range</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="all">All Time</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last Month</option>
            </select>
          </div>
          <div>
            <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition">
              <FiFilter className="h-4 w-4" />
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.length > 0 ? (
          filteredReports.map((report, idx) => (
            <div key={idx} className="rounded-lg bg-white border border-slate-200 p-6 shadow-sm hover:shadow-md transition dark:border-slate-700 dark:bg-slate-950">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-slate-800">
                    <FiFileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{report.patient_name || 'Unknown Patient'}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{report.patient_email || 'No email'}</p>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm">
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">Date</p>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{report.appointment_date || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">Time</p>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{report.appointment_time || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">Prediction</p>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          <span className="inline-block rounded-full px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-slate-800 dark:text-blue-400">
                            {report.prediction_result || 'Unknown'}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                  <FiDownload className="h-4 w-4" />
                  Download
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg bg-white border border-slate-200 p-12 shadow-sm text-center dark:border-slate-700 dark:bg-slate-950">
            <FiFileText className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-600" />
            <p className="mt-4 text-slate-600 dark:text-slate-400">No reports found</p>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-white border border-slate-200 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Reports</p>
          <p className="mt-3 text-3xl font-bold text-blue-600 dark:text-blue-400">{appointments.length}</p>
        </div>
        <div className="rounded-lg bg-white border border-slate-200 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">This Month</p>
          <p className="mt-3 text-3xl font-bold text-blue-600 dark:text-blue-400">
            {appointments.filter((r) => {
              const date = new Date(r.appointment_date);
              const now = new Date();
              return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            }).length}
          </p>
        </div>
        <div className="rounded-lg bg-white border border-slate-200 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Avg. Per Week</p>
          <p className="mt-3 text-3xl font-bold text-blue-600 dark:text-blue-400">
            {Math.ceil(appointments.length / 4)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default DoctorReports;
