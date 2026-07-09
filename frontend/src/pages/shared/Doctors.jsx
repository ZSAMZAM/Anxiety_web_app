import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiPlus, FiTrash2, FiEdit3, FiCheckCircle } from 'react-icons/fi';
import SectionHeader from '../../components/SectionHeader.jsx';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

function Doctors() {
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const loadDoctors = async (params = {}) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getDoctors(params);
      setDoctors(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load doctors:', err);
      setError('Failed to load doctors');
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = {};
    if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
    if (search) params.search = search;
    loadDoctors(params);
  }, [statusFilter, search]);

  const filtered = useMemo(() => {
    const s = (search || '').toLowerCase();
    return (doctors || []).filter((doctor) => {
      const name = (doctor.name || '').toLowerCase();
      const spec = (doctor.specialization || '').toLowerCase();
      const matchesSearch = !s || name.includes(s) || spec.includes(s);
      const status = (doctor.status || '').toString().toUpperCase();
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && status === 'ACTIVE') || (statusFilter === 'inactive' && (status === 'INACTIVE' || status === 'DEACTIVE'));
      return matchesSearch && matchesStatus;
    });
  }, [doctors, search, statusFilter]);

  return (
      <div className="space-y-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeader subtitle="Doctor network" title="Find licensed professionals and manage your care." />
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
            {user.role === 'admin' && (
              <button className="inline-flex items-center gap-2 rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-sky-600 shadow-lg">
                <FiPlus /> Add new doctor
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
            className={`rounded-full px-4 py-2 text-sm font-semibold transition shadow-sm ${statusFilter === 'active' ? 'bg-gradient-to-r from-green-400 to-green-600 text-white' : 'bg-white/80 text-gray-700 hover:bg-gray-100'}`}
          >
            Active only
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition shadow-sm ${statusFilter === 'inactive' ? 'bg-gradient-to-r from-red-400 to-red-600 text-white' : 'bg-white/80 text-gray-700 hover:bg-gray-100'}`}
          >
            Inactive only
          </button>
        </div>
        {loading ? (
          <div className="rounded-[2rem] border border-white/20 bg-white/10 p-8 text-gray-600 shadow-xl backdrop-blur-xl">Loading doctors...</div>
        ) : error ? (
          <div className="rounded-[2rem] border border-red-200 bg-red-50 p-8 text-red-700 shadow-xl backdrop-blur-xl">{error}</div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((doctor) => (
              <div key={doctor.id} className="rounded-[2rem] border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-xl">
                <div className="flex items-center gap-4">
                  <img src={doctor.photo || doctor.image || ''} alt={doctor.name} className="h-16 w-16 rounded-3xl object-cover shadow-lg" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{doctor.name}</h3>
                    <p className="text-sm text-gray-500">{doctor.specialization}</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3 text-sm text-gray-600">
                  <p><span className="font-semibold text-gray-900">Experience:</span> {doctor.experience || '-'}</p>
                  <p><span className="font-semibold text-gray-900">Rating:</span> {(doctor.rating != null ? doctor.rating : 'N/A')} / 5</p>
                  <p>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs ${((doctor.status||'').toString().toUpperCase() === 'ACTIVE') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {((doctor.status||'').toString().toUpperCase() === 'ACTIVE') ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={() => navigate(`/user/booking/${doctor.id}`, { state: { doctor } })}
                    className="inline-flex flex-1 items-center justify-center rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-sky-600 shadow-lg"
                  >
                    Book Appointment
                  </button>
                  {user?.role === 'admin' && (
                    <>
                      <button className="inline-flex items-center gap-2 rounded-3xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 shadow-sm">
                        <FiEdit3 /> Update
                      </button>
                      <button className="inline-flex items-center gap-2 rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100">
                        <FiTrash2 /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="rounded-[2rem] border border-white/20 bg-white/10 p-8 text-gray-600 shadow-xl backdrop-blur-xl">No doctors match your criteria.</div>
            )}
          </div>
        )}
      </div>
  );
}

export default Doctors;
