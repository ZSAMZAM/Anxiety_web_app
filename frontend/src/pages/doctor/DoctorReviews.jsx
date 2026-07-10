import { useEffect, useState } from 'react';
import { FiStar } from 'react-icons/fi';
import SectionHeader from '../../components/SectionHeader.jsx';
import { api } from '../../services/api.js';

const statCard = 'rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-[#243447]/80';

function Stars({ value }) {
  return <span className="text-amber-400">{'★'.repeat(value)}<span className="text-slate-300 dark:text-slate-600">{'★'.repeat(5 - value)}</span></span>;
}

export default function DoctorReviews() {
  const [data, setData] = useState({ reviews: [], rating_distribution: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        setData(await api.getDoctorReviews());
      } catch (err) {
        setError(err.message || 'Unable to load reviews.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const distribution = data.rating_distribution || {};
  const reviews = data.reviews || [];

  return (
    <div className="space-y-6">
      <SectionHeader subtitle="Doctor reviews" title="Read patient feedback from completed appointments." />
      {error && <div className="rounded-2xl bg-red-50 p-4 text-red-700 dark:bg-red-500/10 dark:text-red-200">{error}</div>}
      {loading ? (
        <div className={statCard}>Loading reviews...</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <div className={statCard}>
              <FiStar className="h-6 w-6 text-amber-400" />
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Average Rating</p>
              <p className="text-3xl font-bold">{Number(data.average_rating || 0).toFixed(1)}</p>
            </div>
            <div className={statCard}><p className="text-sm text-slate-500 dark:text-slate-400">Total Reviews</p><p className="mt-3 text-3xl font-bold">{data.total_reviews || 0}</p></div>
            {[5, 4].map((star) => (
              <div className={statCard} key={star}><p className="text-sm text-slate-500 dark:text-slate-400">{star}-Star Count</p><p className="mt-3 text-3xl font-bold">{distribution[String(star)] || 0}</p></div>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[3, 2, 1].map((star) => (
              <div className={statCard} key={star}><p className="text-sm text-slate-500 dark:text-slate-400">{star}-Star Count</p><p className="mt-3 text-2xl font-bold">{distribution[String(star)] || 0}</p></div>
            ))}
          </div>
          <div className={statCard}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-500 dark:text-slate-400">
                  <tr><th className="py-3">Patient</th><th>Rating</th><th>Feedback</th><th>Date</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                  {reviews.map((review) => (
                    <tr key={review.id}>
                      <td className="py-4 font-medium">{review.patient_name}</td>
                      <td><Stars value={review.rating} /></td>
                      <td className="max-w-xl text-slate-600 dark:text-slate-300">{review.feedback || 'No written feedback.'}</td>
                      <td>{review.created_at ? new Date(review.created_at).toLocaleDateString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!reviews.length && <p className="py-8 text-center text-slate-500">No reviews yet.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
