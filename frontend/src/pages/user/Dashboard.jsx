import { FiActivity, FiBarChart2, FiBell, FiCalendar, FiClock, FiHeart, FiUser } from 'react-icons/fi';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../services/api.js';
import Avatar from '../../components/Avatar.jsx';
import Card from '../../components/Card.jsx';
import SectionHeader from '../../components/SectionHeader.jsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function UserDashboard() {
  const [stats, setStats] = useState(null);
  const [predictionHistory, setPredictionHistory] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingPredictions, setLoadingPredictions] = useState(true);
  const [error, setError] = useState(null);
  const [latestPrediction, setLatestPrediction] = useState(null);
  const [upcomingAppointment, setUpcomingAppointment] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [recommendedDoctors, setRecommendedDoctors] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [assessmentState, setAssessmentState] = useState({
    hasAssessment: false,
    canBookTherapist: false,
    bookingMessage: 'Please complete your mental health assessment before booking a therapist.',
  });
  const { user } = useAuth();
  const navigate = useNavigate();

  const normalizeResultType = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('anxiety')) return 'anxiety';
    if (normalized.includes('depression')) return 'depression';
    if (normalized.includes('neutral')) return 'neutral';
    return 'neutral';
  };

  const formatMonthLabel = (isoDate) => {
    try {
      const date = new Date(isoDate);
      return date.toLocaleString('default', { month: 'short' });
    } catch {
      return isoDate;
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) {
        setStats(null);
        setLoadingStats(false);
        return;
      }

      setLoadingStats(true);
      setError(null);

      try {
        const data = await api.getUserStats();
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid response format from server');
        }

        const transformedStats = {
          totals: [
            {
              key: 'predictions',
              title: 'Total Predictions',
              value: data?.totalPredictions ?? 0,
              description: 'Assessments completed',
            },
            {
              key: 'doctors',
              title: 'Doctors Available',
              value: data?.doctorsAvailable ?? 0,
              description: 'Mental health specialists',
            },
            {
              key: 'bookings',
              title: 'My Appointments',
              value: data?.myAppointments ?? 0,
              description: 'Scheduled sessions',
            },
            {
              key: 'payments',
              title: 'Payments Made',
              value: data?.paymentsMade ?? 0,
              description: 'Transaction history',
            },
          ],
        };
        setStats(transformedStats);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
        const errorMsg = err?.response?.data?.error || err?.message || 'Failed to load statistics. Please try refreshing.';
        setError(errorMsg);
        setStats({
          totals: [
            { key: 'predictions', title: 'Total Predictions', value: 0, description: 'Assessments completed' },
            { key: 'doctors', title: 'Doctors Available', value: 0, description: 'Mental health specialists' },
            { key: 'bookings', title: 'My Appointments', value: 0, description: 'Scheduled sessions' },
            { key: 'payments', title: 'Payments Made', value: 0, description: 'Transaction history' },
          ],
        });
      } finally {
        setLoadingStats(false);
      }
    };

    const fetchPredictionHistory = async () => {
      if (!user?.id) {
        setPredictionHistory([]);
        setLoadingPredictions(false);
        return;
      }

      setLoadingPredictions(true);
      try {
        const history = await api.getPredictionHistory();
        const bookingState = await api.getAssessmentBookingState();
        setAssessmentState(bookingState);
        setPredictionHistory(history.map((item) => ({
          ...item,
          result: normalizeResultType(item.result || item.anxietyLevel),
          date: item.date,
        })));
        
        if (history && history.length > 0) {
          const latest = history[0];
          setLatestPrediction(latest);
          const backendRecommendations = await api.getRecommendations({
            text: latest.summary || latest.result || latest.anxietyLevel || '',
            prediction: latest.anxietyLevel || latest.result,
            confidence: latest.confidence || latest.confidence_score || 0,
          });
          setRecommendations(backendRecommendations);
        } else {
          setLatestPrediction(null);
          setRecommendations([]);
        }
      } catch (err) {
        console.error('Failed to fetch prediction history:', err);
        setPredictionHistory([]);
        setLatestPrediction(null);
        setRecommendations([]);
      } finally {
        setLoadingPredictions(false);
      }
    };

    const fetchAdditionalData = async () => {
      if (!user?.id) return;

      try {
        // Fetch upcoming appointment
        const appointments = await api.getAppointments();
        const upcoming = appointments.find(a => 
          a.status === 'Pending' || a.status === 'Confirmed'
        );
        setUpcomingAppointment(upcoming || null);

        const currentAssessmentState = await api.getAssessmentBookingState();
        setAssessmentState(currentAssessmentState);
        if (currentAssessmentState.canBookTherapist) {
          const doctors = await api.getDoctors();
          setRecommendedDoctors((doctors || []).slice(0, 4));
        } else {
          setRecommendedDoctors([]);
        }

        const notifications = await api.getUserNotifications();
        setNotifications(notifications.slice(0, 3));
        const unreadCount = notifications.filter(n => !n.is_read).length;
        setUnreadNotifications(unreadCount);
      } catch (err) {
        console.error('Failed to fetch additional data:', err);
      }
    };

    fetchStats();
    fetchPredictionHistory();
    fetchAdditionalData();
  }, [user?.id]);

  const predictionData = useMemo(() => {
    if (!predictionHistory || predictionHistory.length === 0) {
      return [];
    }

    const monthlyMap = new Map();

    predictionHistory.forEach((item) => {
      const monthKey = item.date?.slice(0, 7) || 'unknown';
      const monthLabel = formatMonthLabel(item.date || '');
      const result = normalizeResultType(item.result);

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month: monthLabel,
          anxiety: 0,
          neutral: 0,
          depression: 0,
        });
      }

      const monthRow = monthlyMap.get(monthKey);
      if (result === 'anxiety') monthRow.anxiety += 1;
      else if (result === 'depression') monthRow.depression += 1;
      else monthRow.neutral += 1;
    });

    return Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, row]) => row);
  }, [predictionHistory]);

  const pieData = useMemo(() => {
    const counts = { anxiety: 0, neutral: 0, depression: 0 };
    predictionHistory.forEach((item) => {
      const result = normalizeResultType(item.result);
      counts[result] += 1;
    });

    const total = counts.anxiety + counts.neutral + counts.depression;
    if (total === 0) {
      return [
        { name: 'Anxiety', value: 0, percentage: 0, color: '#8b5cf6' },
        { name: 'Neutral', value: 0, percentage: 0, color: '#06b6d4' },
        { name: 'Depression', value: 0, percentage: 0, color: '#ec4899' },
      ];
    }

    return [
      { name: 'Anxiety', value: counts.anxiety, percentage: Math.round((counts.anxiety / total) * 100), color: '#8b5cf6' },
      { name: 'Neutral', value: counts.neutral, percentage: Math.round((counts.neutral / total) * 100), color: '#06b6d4' },
      { name: 'Depression', value: counts.depression, percentage: Math.round((counts.depression / total) * 100), color: '#ec4899' },
    ];
  }, [predictionHistory]);

  const mentalHealthScore = useMemo(() => {
    if (predictionHistory.length === 0) return null;
    
    const recentPredictions = predictionHistory.slice(0, 5);
    let score = 75;
    
    recentPredictions.forEach((pred) => {
      const result = normalizeResultType(pred.result);
      if (result === 'neutral') score += 5;
      else if (result === 'anxiety') score -= 10;
      else if (result === 'depression') score -= 15;
    });
    return Math.max(0, Math.min(100, Math.round(score)));
  }, [predictionHistory]);

  const upcomingDoctorName = upcomingAppointment?.doctor_name || upcomingAppointment?.doctorName || 'Doctor';
  const upcomingDate = upcomingAppointment?.appointment_date || upcomingAppointment?.date;
  const upcomingTime = upcomingAppointment?.appointment_time || upcomingAppointment?.time;

  return (
      <div className="space-y-10">
        <SectionHeader subtitle="User dashboard" title="Your wellness summary and prediction activity." />
        
        {/* Error Banner */}
        {error && (
          <div className="rounded-[2rem] border border-red-200 bg-red-50 p-4 shadow-md">
            <p className="text-sm text-red-800">
              <span className="font-semibold">⚠ Error:</span> {error}
            </p>
          </div>
        )}

        <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-8 shadow-xl backdrop-blur-xl transition-colors duration-300 dark:border-slate-700 dark:bg-slate-950/80">
          <div className="flex items-center gap-6">
            <Avatar src={user?.avatar} name={user?.fullname || user?.name} size="2xl" className="border-4 border-cyan-200 shadow-lg" />
            <div className="flex-1">
              <p className="text-sm uppercase tracking-[0.35em] text-sky-600 dark:text-sky-300">Welcome back</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h2 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Hi, {user?.name?.split(' ')[0] || 'there'}.</h2>
              </div>
              <p className="mt-2 text-slate-600 dark:text-slate-400">Your anxiety insights and wellness data are displayed below. Check your prediction trends and recent activity.</p>
            </div>
            <div className="flex gap-4">
              {unreadNotifications > 0 && (
                <div className="rounded-full bg-red-500 px-4 py-2 text-white shadow-lg">
                  <span className="font-semibold">{unreadNotifications}</span> unread notifications
                </div>
              )}
            </div>
          </div>
          
          {/* Latest Anxiety Status */}
          {latestPrediction && (
            <div className="mt-6 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-800 dark:bg-cyan-950/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-cyan-800 dark:text-cyan-300">Latest Anxiety Status</p>
                  <p className="mt-1 text-lg font-bold text-cyan-900 dark:text-cyan-100">
                    {normalizeResultType(latestPrediction.result || latestPrediction.anxietyLevel).toUpperCase()}
                  </p>
                  <p className="mt-1 text-sm text-cyan-700 dark:text-cyan-400">
                    {new Date(latestPrediction.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="rounded-full bg-cyan-500 px-4 py-2 text-white shadow-lg">
                  {latestPrediction.confidence_score ? `${Math.round(latestPrediction.confidence_score * 100)}% confidence` : 'Latest'}
                </div>
              </div>
            </div>
          )}

          {/* Mental Health Score */}
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Mental Health Score</p>
                <p className="mt-1 text-3xl font-bold text-emerald-900 dark:text-emerald-100">
                  {mentalHealthScore === null ? 'Pending' : `${mentalHealthScore}/100`}
                </p>
                <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">
                  {mentalHealthScore === null ? 'Take an assessment to calculate your score' : mentalHealthScore >= 80 ? 'Excellent' : mentalHealthScore >= 60 ? 'Good' : 'Needs Attention'}
                </p>
              </div>
              <div className="rounded-full bg-emerald-500 px-4 py-2 text-white shadow-lg">
                <FiHeart className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Upcoming Appointment */}
          {upcomingAppointment && (
            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Upcoming Appointment</p>
                  <p className="mt-1 text-lg font-bold text-blue-900 dark:text-blue-100">
                    {upcomingDoctorName}
                  </p>
                  <p className="mt-1 text-sm text-blue-700 dark:text-blue-400">
                    {upcomingDate ? new Date(`${upcomingDate}T00:00:00`).toLocaleDateString() : 'Date not assigned'} at {upcomingTime || 'Time not assigned'}
                  </p>
                </div>
                <div className="rounded-full bg-blue-500 px-4 py-2 text-white shadow-lg">
                  {upcomingAppointment.status}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Statistics Cards with Loading State */}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {loadingStats ? (
            // Loading skeleton
              Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm animate-pulse transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900/70">
                <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700"></div>
                <div className="mt-4 h-8 w-16 rounded bg-slate-300 dark:bg-slate-700"></div>
                <div className="mt-2 h-3 w-32 rounded bg-slate-200 dark:bg-slate-700"></div>
              </div>
            ))
          ) : stats?.totals ? (
            stats.totals.map((item) => {
              const icon = item.key === 'predictions' ? <FiActivity /> : item.key === 'doctors' ? <FiHeart /> : item.key === 'bookings' ? <FiClock /> : <FiBarChart2 />;
              return <Card key={item.key} title={item.title} value={item.value} description={item.description} icon={icon} />;
            })
          ) : (
            <div className="col-span-full rounded-3xl border border-yellow-200 bg-yellow-50 p-6 text-center">
              <p className="text-sm text-yellow-800">No statistics available. Please try refreshing.</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {[
            { label: 'Start Assessment', icon: FiActivity, to: '/user/assessment', tone: 'from-cyan-500 to-sky-500' },
            ...(assessmentState.canBookTherapist
              ? [{ label: 'Book Therapist', icon: FiHeart, to: '/user/doctors', tone: 'from-violet-500 to-fuchsia-500' }]
              : []),
            { label: 'Appointments', icon: FiCalendar, to: '/user/appointments', tone: 'from-emerald-500 to-teal-500' },
            { label: 'History', icon: FiBarChart2, to: '/user/history', tone: 'from-amber-500 to-orange-500' },
            { label: 'Notifications', icon: FiBell, to: '/user/notifications', tone: 'from-rose-500 to-pink-500' },
            { label: 'Profile', icon: FiUser, to: '/user/profile', tone: 'from-slate-700 to-slate-900' },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => navigate(action.to)}
                className={`rounded-3xl bg-gradient-to-br ${action.tone} p-4 text-left text-white shadow-lg transition hover:-translate-y-1 hover:shadow-xl`}
              >
                <Icon className="h-6 w-6" />
                <p className="mt-4 text-sm font-semibold">{action.label}</p>
              </button>
            );
          })}
        </div>

        {/* Backend Recommendations */}
        <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-6 shadow-xl backdrop-blur-xl transition-colors duration-300 dark:border-slate-700 dark:bg-slate-950/80">
          <div className="mb-6">
            <p className="text-sm uppercase tracking-[0.35em] text-sky-600">Care Guidance</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">Backend Recommendations</h2>
          </div>
          {recommendations.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
              {assessmentState.hasAssessment
                ? 'Your latest result does not require therapist booking. Continue with supportive recommendations.'
                : 'Complete an assessment to load personalized recommendations from the backend.'}
            </div>
          ) : (
            <div className="space-y-4">
              {recommendations.slice(0, 4).map((rec, idx) => {
                const message = typeof rec === 'string' ? rec : rec.message || rec.title || rec.description || 'Recommendation available';
                const priority = String(rec.priority || rec.risk_level || 'normal').toLowerCase();
                const tone = priority.includes('high') || priority.includes('critical')
                  ? 'border-red-200 bg-red-50 dark:border-red-400/30 dark:bg-red-500/10'
                  : priority.includes('medium') || priority.includes('moderate')
                    ? 'border-amber-200 bg-amber-50 dark:border-amber-400/30 dark:bg-amber-500/10'
                    : 'border-emerald-200 bg-emerald-50 dark:border-emerald-400/30 dark:bg-emerald-500/10';
                return (
                  <div key={`${message}-${idx}`} className={`rounded-3xl border p-4 ${tone}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{message}</p>
                        <p className="mt-1 text-xs text-slate-600 capitalize dark:text-slate-300">{priority} priority</p>
                      </div>
                      <span className="inline-flex rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-950/60 dark:text-slate-100">
                        {priority}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recommended Therapists */}
        <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-6 shadow-xl backdrop-blur-xl transition-colors duration-300 dark:border-slate-700 dark:bg-slate-950/80">
          <div className="mb-6">
            <p className="text-sm uppercase tracking-[0.35em] text-sky-600">Therapists</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">Recommended Therapists</h2>
          </div>
          {!assessmentState.canBookTherapist ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
              {assessmentState.bookingMessage}
            </div>
          ) : recommendedDoctors.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
              Therapists from the backend will appear here when doctors are available.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {recommendedDoctors.map((doctor) => (
                <div key={doctor.id || doctor.doctor_id || doctor.username} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <Avatar src={doctor.photo || doctor.avatar} name={doctor.name || doctor.fullname || doctor.username} size="lg" className="border-2 border-cyan-100" />
                  <p className="mt-3 font-semibold text-slate-900 dark:text-slate-100">{doctor.name || doctor.fullname || 'Therapist'}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{doctor.specialty || doctor.specialization || 'Mental health specialist'}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span>{doctor.rating ? `${doctor.rating} rating` : 'Rating pending'}</span>
                    <span>{doctor.fee || doctor.consultation_fee ? `$${doctor.fee || doctor.consultation_fee}` : 'Fee unavailable'}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{doctor.hospital || doctor.clinic || 'Clinic details unavailable'}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Preview */}
        <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-6 shadow-xl backdrop-blur-xl transition-colors duration-300 dark:border-slate-700 dark:bg-slate-950/80">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-sky-600">Notifications</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">Latest Updates</h2>
            </div>
            <button onClick={() => navigate('/user/notifications')} className="text-sm font-semibold text-sky-600 hover:text-sky-700">
              View all
            </button>
          </div>
          {notifications.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
              Appointment, payment, and care updates from the backend will appear here.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {notifications.map((notification) => (
                <div key={notification.id || notification.created_at || notification.message} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{notification.title || notification.type || 'Notification'}</p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{notification.message || 'New update available.'}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-6 shadow-xl backdrop-blur-xl transition-colors duration-300 dark:border-slate-700 dark:bg-slate-950/80">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-sky-600">Prediction Trends</p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">Monthly Insights</h2>
              </div>
            </div>
            {loadingPredictions ? (
              <div className="flex h-[300px] items-center justify-center text-slate-500 dark:text-slate-300">Loading monthly insights...</div>
            ) : predictionData.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-slate-500 dark:text-slate-300">No prediction history available.</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={predictionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" />
                  <YAxis stroke="#64748b" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      border: 'none',
                      borderRadius: '1rem',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                      backdropFilter: 'blur(10px)',
                    }}
                  />
                  <Line type="monotone" dataKey="anxiety" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 6 }} />
                  <Line type="monotone" dataKey="neutral" stroke="#06b6d4" strokeWidth={3} dot={{ fill: '#06b6d4', strokeWidth: 2, r: 6 }} />
                  <Line type="monotone" dataKey="depression" stroke="#ec4899" strokeWidth={3} dot={{ fill: '#ec4899', strokeWidth: 2, r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-6 shadow-xl backdrop-blur-xl transition-colors duration-300 dark:border-slate-700 dark:bg-slate-950/80">
            <p className="text-sm uppercase tracking-[0.35em] text-sky-600 dark:text-sky-300">Distribution</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">Overall Results</h2>
            <div className="mt-8">
              {loadingPredictions ? (
                <div className="flex h-[200px] items-center justify-center text-slate-500 dark:text-slate-300">Loading distribution...</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [`${value} (${pieData.find((item) => item.name === name)?.percentage || 0}%)`, name]}
                        contentStyle={{
                          backgroundColor: 'rgba(255,255,255,0.9)',
                          border: 'none',
                          borderRadius: '1rem',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                          backdropFilter: 'blur(10px)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                      <div className="mt-4 space-y-2">
                        {pieData.map((item) => (
                          <div key={item.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                              <span className="text-sm text-slate-700 dark:text-slate-300">{item.name}</span>
                            </div>
                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.value} ({item.percentage}%)</span>
                          </div>
                        ))}
                      </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-6 shadow-xl backdrop-blur-xl transition-colors duration-300 dark:border-slate-700 dark:bg-slate-950/80">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-sky-600">Recent predictions</p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">Latest insights</h2>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { title: 'Anxiety detected', detail: 'Moderate risk during last assessment', label: 'Moderate' },
                { title: 'Sleep disturbance', detail: 'Higher alert in evening routines', label: 'Watch' },
              ].map((item) => (
                <div key={item.title} className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm transition-colors duration-200 dark:border-slate-700 dark:bg-slate-900/60">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{item.title}</h3>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.detail}</p>
                    </div>
                    <span className="rounded-full bg-gradient-to-r from-cyan-500 to-sky-500 px-3 py-1 text-sm text-white shadow-lg">{item.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
  );
}

export default UserDashboard;
