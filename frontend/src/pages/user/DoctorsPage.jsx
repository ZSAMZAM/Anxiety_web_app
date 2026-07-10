import { useEffect, useMemo, useState } from 'react';
import { FiSearch, FiPlus } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import SectionHeader from '../../components/SectionHeader.jsx';
import DoctorCard from '../../components/DoctorCard.jsx';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

function DoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // default to active
  const [specializationFilter, setSpecializationFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name'); // name, rating
  const [loading, setLoading] = useState(true);
  const [assessmentChecked, setAssessmentChecked] = useState(false);
  const [assessmentState, setAssessmentState] = useState({
    hasAssessment: false,
    canBookTherapist: false,
    bookingMessage: 'Please complete your mental health assessment before booking a therapist.',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  const loadDoctors = async (params = {}) => {
    if (!assessmentState.canBookTherapist) {
      setDoctors([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await api.getDoctors(params);
      setDoctors(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load doctors:', err);
      setError('Unable to load available doctors.');
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.getAssessmentBookingState()
      .then((state) => {
        setAssessmentState(state);
        setAssessmentChecked(true);
      })
      .catch(() => {
        setAssessmentState({
          hasAssessment: false,
          canBookTherapist: false,
          bookingMessage: 'Please complete your mental health assessment before booking a therapist.',
        });
        setAssessmentChecked(true);
      });
  }, []);

  useEffect(() => {
    if (!assessmentChecked) return;
    if (!assessmentState.canBookTherapist) {
      setDoctors([]);
      setLoading(false);
      return;
    }
    const params = {};
    if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
    if (search) params.search = search;
    loadDoctors(params);
  }, [assessmentChecked, assessmentState.canBookTherapist, statusFilter, search]);

  const handleBook = (doctor) => {
    if (!assessmentState.canBookTherapist) {
      const target = assessmentState.hasAssessment ? '/user/history' : '/user/assessment';
      navigate(target, {
        state: { message: assessmentState.bookingMessage },
      });
      return;
    }
    navigate(`/user/booking/${doctor.id}`, { state: { doctor } });
  };

  const filtered = useMemo(() => {
    const s = (search || '').toLowerCase();
    let result = (doctors || []).filter((doctor) => {
      const name = (doctor.name || '').toLowerCase();
      const spec = (doctor.specialization || '').toLowerCase();
      const matchesSearch = !s || name.includes(s) || spec.includes(s);
      const status = (doctor.status || '').toString().toUpperCase();
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && status === 'ACTIVE') || (statusFilter === 'inactive' && (status === 'INACTIVE' || status === 'DEACTIVE'));
      const matchesSpecialization = specializationFilter === 'all' || spec === specializationFilter.toLowerCase();
      return matchesSearch && matchesStatus && matchesSpecialization;
    });

    // Sort by rating or name
    if (sortBy === 'rating') {
      result = result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else {
      result = result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return result;
  }, [doctors, search, statusFilter, specializationFilter, sortBy]);

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <SectionHeader subtitle="Doctor network" title="Choose a licensed mental health provider." />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex items-center gap-3 rounded-3xl border border-gray-200 bg-white/80 px-4 py-3 text-gray-700 shadow-sm backdrop-blur-sm">
            <FiSearch className="h-5 w-5" />
            <input
              className="w-full bg-transparent text-sm text-gray-900 outline-none"
              placeholder="Search doctors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          {user?.role === 'admin' && (
            <button className="inline-flex items-center gap-2 rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-sky-600 shadow-lg">
              <FiPlus /> Add doctor
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={() => setStatusFilter('all')}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition shadow-sm ${statusFilter === 'all' ? 'bg-gradient-to-r from-cyan-500 to-sky-500 text-white' : 'bg-white/80 text-gray-700 hover:bg-gray-100'}`}
        >
          Show all doctors
        </button>
        <button
          onClick={() => setStatusFilter('active')}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition shadow-sm ${statusFilter === 'active' ? 'bg-gradient-to-r from-emerald-400 to-emerald-600 text-white' : 'bg-white/80 text-gray-700 hover:bg-gray-100'}`}
        >
          Active only
        </button>
        <button
          onClick={() => setStatusFilter('inactive')}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition shadow-sm ${statusFilter === 'inactive' ? 'bg-gradient-to-r from-red-400 to-red-600 text-white' : 'bg-white/80 text-gray-700 hover:bg-gray-100'}`}
        >
          Inactive only
        </button>
        
        {/* Specialization Filter */}
        <select
          value={specializationFilter}
          onChange={(e) => setSpecializationFilter(e.target.value)}
          className="rounded-full border border-gray-200 bg-white/80 px-4 py-2 text-sm text-gray-700 shadow-sm outline-none hover:bg-gray-100"
        >
          <option value="all">All Specializations</option>
          <option value="psychiatry">Psychiatry</option>
          <option value="psychology">Psychology</option>
          <option value="counseling">Counseling</option>
          <option value="therapy">Therapy</option>
          <option value="neurology">Neurology</option>
        </select>
        
        {/* Sort Options */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-full border border-gray-200 bg-white/80 px-4 py-2 text-sm text-gray-700 shadow-sm outline-none hover:bg-gray-100"
        >
          <option value="name">Sort by Name</option>
          <option value="rating">Sort by Rating</option>
        </select>
      </div>

      {!assessmentChecked || loading ? (
        <div className="rounded-[2rem] border border-white/20 bg-white/10 p-8 text-gray-600 shadow-xl backdrop-blur-xl">Loading doctors…</div>
      ) : !assessmentState.canBookTherapist ? (
        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-amber-800 shadow-xl backdrop-blur-xl">
          <p className="text-lg font-semibold">Booking is not available yet</p>
          <p className="mt-2 text-sm">{assessmentState.bookingMessage}</p>
          <button
            type="button"
            onClick={() => navigate(assessmentState.hasAssessment ? '/user/history' : '/user/assessment')}
            className="mt-5 rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 px-5 py-3 text-sm font-semibold text-white shadow-lg"
          >
            {assessmentState.hasAssessment ? 'View History' : 'Start Assessment'}
          </button>
        </div>
      ) : error ? (
        <div className="rounded-[2rem] border border-red-200 bg-red-50 p-8 text-red-700 shadow-xl backdrop-blur-xl">{error}</div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-3">
          {filtered.length > 0 ? (
            filtered.map((doctor) => (
              <DoctorCard
                key={doctor.id}
                doctor={doctor}
                canBook={assessmentState.canBookTherapist}
                disabledReason={assessmentState.bookingMessage}
                onBook={() => handleBook(doctor)}
              />
            ))
          ) : (
            <div className="rounded-[2rem] border border-white/20 bg-white/10 p-8 text-gray-600 shadow-xl backdrop-blur-xl">
              No doctors match your search. Adjust your keywords or clear the filter.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DoctorsPage;
