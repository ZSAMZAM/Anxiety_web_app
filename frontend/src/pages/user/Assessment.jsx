import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SectionHeader from '../../components/SectionHeader.jsx';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';

function Assessment() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handlePredict = async (event) => {
    event.preventDefault();
    if (!input.trim()) {
      showToast('Validation error', 'Please enter your thoughts before submitting.');
      return;
    }
    setLoading(true);
    try {
      const response = await api.submitAssessment({ text: input });
      localStorage.setItem('anxiety-prediction', JSON.stringify(response));
      showToast('Analysis complete', 'Your assessment is ready.');
      navigate('/user/result', { state: { prediction: response } });
    } catch (error) {
      showToast('Prediction error', error?.response?.data?.error || error.message || 'Unable to reach backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="space-y-10">
        <SectionHeader subtitle="Self assessment" title="Describe how you feel and get an anxiety prediction." />
        <div className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-xl backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.35em] text-sky-600">Your input</p>
          <form className="mt-6 space-y-6" onSubmit={handlePredict}>
            <label className="space-y-3 text-gray-700">
              <span className="block text-sm font-medium text-gray-900">What are you feeling today?</span>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Write about your thoughts, sleep, stress, or mood..."
                rows="8"
                className="w-full rounded-3xl border border-gray-200 bg-white/80 px-5 py-4 text-gray-900 outline-none transition focus:border-cyan-400 shadow-sm backdrop-blur-sm"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 px-6 py-4 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-sky-600 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg"
            >
              {loading ? 'Analyzing...' : 'Predict anxiety'}
            </button>
          </form>
        </div>
      </div>
  );
}

export default Assessment;
