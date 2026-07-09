import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import SectionHeader from '../../components/SectionHeader.jsx';
import { api } from '../../services/api.js';

const normalizeResultType = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized.includes('anxiety')) return 'anxiety';
  if (normalized.includes('depression')) return 'depression';
  if (normalized.includes('neutral')) return 'neutral';
  return 'neutral';
};

const defaultEducation = [
  'Practice stress management techniques such as deep breathing or short breaks.',
  'Maintain a regular sleep schedule and reduce screen time before bedtime.',
  'Use self-care routines to support your emotional wellbeing.',
];

function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState('');

  useEffect(() => {
    // Retrieval strategy (in order of priority):
    // 1. location.state?.prediction (from navigate - fresh data)
    // 2. localStorage (persists across refresh/direct URL)
    // 3. Fallback to API history fetch
    const passedPrediction = location.state?.prediction;
    
    if (passedPrediction) {
      setPrediction(passedPrediction);
      setLoading(false);
    } else {
      const storedPrediction = localStorage.getItem('anxiety-prediction');
      if (storedPrediction) {
        try {
          const parsed = JSON.parse(storedPrediction);
          setPrediction(parsed);
          setLoading(false);
        } catch (error) {
          console.error('Failed to parse stored prediction:', error);
          localStorage.removeItem('anxiety-prediction');
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }

    // Load history separately
    api.getPredictionHistory()
      .then(setHistory)
      .catch((error) => setHistoryError(error?.message || 'Unable to load prediction history.'))
      .finally(() => setLoadingHistory(false));
  }, [location.state]);

  if (loading) {
    return (
      <div className="space-y-10">
        <SectionHeader subtitle="Prediction result" title="Review your latest mental health assessment." />
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-500 mx-auto"></div>
            <p className="mt-6 text-gray-600">Loading your prediction...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="space-y-10">
        <SectionHeader subtitle="Prediction result" title="Review your latest mental health assessment." />
        <div className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-xl backdrop-blur-xl">
          <div className="text-center py-12">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 shadow-lg">
              <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0-11a9 9 0 110 18 9 9 0 010-18z" />
              </svg>
            </div>
            <h3 className="mt-6 text-2xl font-semibold text-gray-900">No prediction found</h3>
            <p className="mt-3 text-gray-600">We couldn't find a prediction result. Please start a new assessment.</p>
            <button
              type="button"
              onClick={() => navigate('/user/assessment')}
              className="mt-8 inline-flex items-center justify-center rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 px-8 py-3 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-sky-600 shadow-lg"
            >
              Start Assessment
            </button>
          </div>
        </div>
      </div>
    );
  }

  const latest = prediction;

  const resultType = normalizeResultType(latest.result || latest.anxietyLevel);
  const needsSupport = resultType === 'anxiety' || resultType === 'depression';
  const healthMessage = needsSupport
    ? 'Your result indicates you may need professional support.'
    : 'Your results indicate you are currently in a normal range.';

  return (
    <div className="space-y-10">
      <SectionHeader subtitle="Prediction result" title="Review your latest mental health assessment." />
      <div className="grid gap-6 xl:grid-cols-[0.8fr_0.6fr]">
        <div className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-xl backdrop-blur-xl">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-sky-600">Assessment result</p>
              <h2 className="mt-3 text-3xl font-semibold text-gray-900">{latest.anxietyLevel}</h2>
            </div>
            <div className="rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 px-4 py-3 text-white shadow-lg">
              {latest.confidence}% confidence
            </div>
          </div>
          <p className="text-gray-600">{latest.summary}</p>
          <div className="mt-8 rounded-3xl bg-white/80 p-6 text-gray-600 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">Care guidance</h3>
            <p className="mt-4 text-gray-700">{healthMessage}</p>
            {needsSupport ? (
              <div className="mt-6 flex flex-col gap-4 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate('/user/doctors')}
                  className="inline-flex flex-1 items-center justify-center rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 px-6 py-4 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-sky-600 shadow-lg"
                >
                  Choose Doctor
                </button>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {defaultEducation.map((item) => (
                  <div key={item} className="rounded-3xl border border-gray-200 bg-white/80 p-4 shadow-sm text-sm text-gray-700">
                    {item}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-xl backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.35em] text-sky-600">Recent history</p>
          {loadingHistory ? (
            <p className="mt-6 text-gray-600">Loading recent results...</p>
          ) : historyError ? (
            <p className="mt-6 text-red-600">{historyError}</p>
          ) : (
            <ol className="mt-6 space-y-4 text-gray-600">
              {(history.slice(0, 3).length ? history.slice(0, 3) : [latest]).map((item, index) => (
                <li key={index} className="rounded-3xl border border-gray-200 bg-white/80 p-4 shadow-sm">
                  <p className="font-semibold text-gray-900">{item.anxietyLevel}</p>
                  <p className="text-sm">{item.summary}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.3em] text-gray-500">{item.date}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResultPage;
