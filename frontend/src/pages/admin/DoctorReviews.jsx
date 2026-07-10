import { useEffect, useMemo, useState } from 'react';
import { FiDownload, FiStar } from 'react-icons/fi';
import SectionHeader from '../../components/SectionHeader.jsx';
import { api } from '../../services/api.js';

const card = 'rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-[#243447]/80';

function Stars({ value }) {
  return <span className="text-amber-400">{'★'.repeat(value)}<span className="text-slate-300 dark:text-slate-600">{'★'.repeat(5 - value)}</span></span>;
}

export default function AdminDoctorReviews() {
  const [data, setData] = useState({ reviews: [], stats: {} });
  const [filters, setFilters] = useState({ doctor_id: '', rating: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
        setData(await api.getAdminDoctorReviews(params));
      } catch (err) {
        setError(err.message || 'Unable to load doctor reviews.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [filters]);

  const reviews = data.reviews || [];
  const stats = data.stats || {};
  const doctorOptions = useMemo(() => {
    const map = new Map();
    reviews.forEach((review) => map.set(String(review.doctor_id), review.doctor_name));
    return [...map.entries()];
  }, [reviews]);

  const exportCsv = () => {
    const rows = [
      ['Doctor', 'Patient', 'Rating', 'Feedback', 'Date'],
      ...reviews.map((review) => [
        review.doctor_name,
        review.patient_name,
        review.rating,
        `"${String(review.feedback || '').replaceAll('"', '""')}"`,
        review.created_at || '',
      ]),
    ];
    const blob = new Blob([rows.map((row) => row.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'doctor-reviews.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <SectionHeader subtitle="Doctor reviews" title="Monitor patient feedback across all doctors." />
      {error && <div className="rounded-2xl bg-red-50 p-4 text-red-700 dark:bg-red-500/10 dark:text-red-200">{error}</div>}
      <div className="grid gap-4 md:grid-cols-4">
        <div className={card}><FiStar className="h-6 w-6 text-amber-400" /><p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Platform Average</p><p className="text-3xl font-bold">{Number(stats.average_platform_rating || 0).toFixed(1)}</p></div>
        <div className={card}><p className="text-sm text-slate-500 dark:text-slate-400">Total Reviews</p><p className="mt-3 text-3xl font-bold">{stats.total_reviews || 0}</p></div>
        <div className={card}><p className="text-sm text-slate-500 dark:text-slate-400">Highest Rated</p><p className="mt-3 text-lg font-bold">{stats.highest_rated_doctor?.name || '-'}</p><p className="text-sm text-slate-500">{stats.highest_rated_doctor?.average_rating || 0}/5</p></div>
        <div className={card}><p className="text-sm text-slate-500 dark:text-slate-400">Lowest Rated</p><p className="mt-3 text-lg font-bold">{stats.lowest_rated_doctor?.name || '-'}</p><p className="text-sm text-slate-500">{stats.lowest_rated_doctor?.average_rating || 0}/5</p></div>
      </div>

      <div className={card}>
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center">
          <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-900" value={filters.doctor_id} onChange={(e) => setFilters((prev) => ({ ...prev, doctor_id: e.target.value }))}>
            <option value="">All doctors</option>
            {doctorOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-900" value={filters.rating} onChange={(e) => setFilters((prev) => ({ ...prev, rating: e.target.value }))}>
            <option value="">All ratings</option>
            {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} Star</option>)}
          </select>
          <input className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-900" placeholder="Search feedback" value={filters.search} onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))} />
          <button onClick={exportCsv} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-3 font-semibold text-white shadow-lg shadow-cyan-500/20"><FiDownload /> Export</button>
        </div>
        {loading ? <p>Loading reviews...</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500 dark:text-slate-400">
                <tr><th className="py-3">Doctor</th><th>Patient</th><th>Rating</th><th>Feedback</th><th>Date</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {reviews.map((review) => (
                  <tr key={review.id}>
                    <td className="py-4 font-semibold">{review.doctor_name}</td>
                    <td>{review.patient_name}</td>
                    <td><Stars value={review.rating} /></td>
                    <td className="max-w-xl text-slate-600 dark:text-slate-300">{review.feedback || 'No written feedback.'}</td>
                    <td>{review.created_at ? new Date(review.created_at).toLocaleDateString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!reviews.length && <p className="py-8 text-center text-slate-500">No reviews found.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
