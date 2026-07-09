import { useEffect, useState } from 'react';
import { FiPlus, FiEdit3, FiTrash2, FiX, FiEye, FiPause, FiPlay, FiMoreVertical } from 'react-icons/fi';
import SectionHeader from '../../components/SectionHeader.jsx';
import InputField from '../../components/InputField.jsx';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';

function AdminDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [viewProfileDoctor, setViewProfileDoctor] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    specialization: '',
    experience: '',
    rating: '',
    photo: '',
    status: 'Active',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const getStatusBadgeStyle = (status) => {
    const normalizedStatus = String(status || '').toLowerCase();
    switch (normalizedStatus) {
      case 'active':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200';
      case 'inactive':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
      case 'pending':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
      case 'verified':
        return 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
    }
  };

  const loadDoctors = async () => {
    try {
      setLoading(true);
      setError('');
      const doctorsList = await api.getAdminDoctors({
        search: query,
        status: statusFilter !== 'all' ? statusFilter : ''
      });
      console.log('✅ API Response - Doctors loaded:', doctorsList);
      console.log('📊 Total doctors from API:', Array.isArray(doctorsList) ? doctorsList.length : 'Not an array');
      setDoctors(doctorsList || []);
    } catch (error) {
      console.error('❌ Failed to load doctors:', error);
      console.error('Response data:', error?.response?.data);
      setError('Failed to load doctors');
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctors();
  }, [query, statusFilter]);

  const validateForm = () => {
    const nextErrors = {};
    if (!formData.name.trim()) nextErrors.name = 'Full name is required.';
    if (!editingId) {
      if (!formData.email.trim()) nextErrors.email = 'Email is required.';
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) nextErrors.email = 'Enter a valid email address.';
      if (!formData.password) nextErrors.password = 'Password is required.';
      if (formData.password && formData.password.length < 8) nextErrors.password = 'Use at least 8 characters.';
    }
    if (!formData.phone.trim()) nextErrors.phone = 'Phone number is required.';
    if (!formData.specialization.trim()) nextErrors.specialization = 'Specialization is required.';
    if (formData.rating !== '' && (isNaN(Number(formData.rating)) || Number(formData.rating) < 0 || Number(formData.rating) > 5)) {
      nextErrors.rating = 'Rating must be between 0 and 5.';
    }
    return nextErrors;
  };

  const handleReset = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      specialization: '',
      experience: '',
      rating: '',
      photo: '',
      status: 'Active',
    });
    setErrors({});
    setEditingId(null);
    setShowForm(false);
  };

  const handlePhotoFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, photo: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleEdit = (doctor) => {
    setFormData({
      name: doctor.name || '',
      email: doctor.email || '',
      password: '',
      phone: doctor.phone || '',
      specialization: doctor.specialization || '',
      experience: doctor.experience || '',
      rating: doctor.rating != null ? doctor.rating : '',
      photo: doctor.photo || '',
      status: doctor.status || 'Active',
    });
    setEditingId(doctor.id);
    setShowForm(true);
    setErrors({});
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;

    setSubmitting(true);
    setError('');

    try {
      await api.deleteDoctor(confirmDelete);
      setDoctors((prevDoctors) => prevDoctors.filter((doctor) => doctor.id !== confirmDelete));
      setConfirmDelete(null);
      if (editingId === confirmDelete) {
        handleReset();
      }
      showToast('Doctor deleted', 'Doctor removed successfully.');
    } catch (error) {
      console.error('❌ Delete doctor failed:', error);
      const message = error?.response?.data?.error || error?.message || 'Failed to delete doctor.';
      setError(message);
      showToast('Delete failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (doctor) => {
    const nextStatus = doctor.status === 'Active' ? 'Inactive' : 'Active';
    setSubmitting(true);
    try {
      await api.updateDoctor(doctor.id, { status: nextStatus });
      setDoctors((prevDoctors) => prevDoctors.map((item) => (
        item.id === doctor.id ? { ...item, status: nextStatus } : item
      )));
      showToast('Status updated', `Doctor status changed to ${nextStatus}.`);
    } catch (error) {
      console.error('❌ Failed to update doctor status:', error);
      setError(error?.response?.data?.error || error?.message || 'Unable to update doctor status.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddDoctor = async (event) => {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    const nextErrors = validateForm();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.createDoctor(formData);
      // Some API variants return { doctor: {...} } or the doctor object directly
      const newDoctor = response?.doctor || response?.data || response;
      // Optimistically update UI
      setDoctors((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        newDoctor,
      ]);
      handleReset();
      setShowForm(false);
      showToast('Doctor created', 'Doctor account created successfully.');
    } catch (error) {
      console.error('❌ Create doctor failed:', error);
      setErrors({ submit: error.response?.data?.error || error.message || 'Failed to save doctor.' });
      showToast('Create failed', error.response?.data?.error || error.message || 'Failed to create doctor.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      // Update path keeps previous behavior
      setSubmitting(true);
      try {
        await api.updateDoctor(editingId, formData);
        await loadDoctors(); // Reload the list
        handleReset();
        showToast('Doctor updated', 'Doctor profile updated successfully.');
      } catch (error) {
        setErrors({ submit: error.response?.data?.error || error.message || 'Failed to save doctor.' });
      } finally {
        setSubmitting(false);
      }
    } else {
      // Create via the new handler
      await handleAddDoctor(e);
    }
  };

  return (
    <>
      <div className="space-y-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <SectionHeader subtitle="Doctor management" title="Add, edit, and manage healthcare professionals." />
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-sky-600 shadow-lg">
            <FiPlus /> Add doctor
          </button>
        </div>

        <div className="rounded-[2rem] border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-xl">
          <div className="mb-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <div className="flex flex-col gap-2">
              <p className="text-sm text-gray-500">Manage doctors by name, specialization, or status.</p>
              {error && (
                <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-3xl border border-gray-200 bg-white/80 px-4 py-3 text-gray-900 outline-none backdrop-blur-sm"
                >
                  <option value="all">All statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
            <input
              type="search"
              placeholder="Search doctors"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-3xl border border-gray-200 bg-white/80 px-4 py-3 text-gray-900 outline-none backdrop-blur-sm md:max-w-sm"
            />
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading doctors...</p>
                </div>
              </div>
            ) : (
              <>
                <table className="min-w-full text-left text-sm text-gray-600">
                  <thead className="border-b border-gray-200 text-gray-500">
                    <tr>
                      <th className="px-4 py-4">Doctor</th>
                      <th className="px-4 py-4">Specialization</th>
                      <th className="px-4 py-4">Phone</th>
                      <th className="px-4 py-4">Experience</th>
                      <th className="px-4 py-4">Rating</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctors.map((doctor) => (
                      <tr key={doctor.id} className="border-b border-gray-200 hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            {(doctor.image || doctor.photo) && <img src={doctor.image || doctor.photo} alt={doctor.name} className="h-10 w-10 rounded-full object-cover shadow-lg" />}
                            <p className="font-semibold text-gray-900">{doctor.name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">{doctor.specialization}</td>
                        <td className="px-4 py-4">{doctor.phone || '-'}</td>
                        <td className="px-4 py-4">{doctor.experience ? doctor.experience : '-'}</td>
                        <td className="px-4 py-4">⭐ {(typeof doctor.rating === 'number' ? doctor.rating.toFixed(1) : doctor.rating) || 'N/A'}</td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getStatusBadgeStyle(doctor.status)}`}>
                            {doctor.status || 'Active'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => setViewProfileDoctor(doctor)}
                              className="inline-flex items-center gap-2 rounded-3xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                              title="View Details"
                            >
                              <FiEye />
                            </button>
                            <button
                              onClick={() => handleEdit(doctor)}
                              className="inline-flex items-center gap-2 rounded-3xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                              title="Edit"
                            >
                              <FiEdit3 />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(doctor)}
                              className={`inline-flex items-center gap-2 rounded-3xl px-3 py-2 text-xs font-semibold text-white transition shadow-sm ${
                                doctor.status === 'Active' 
                                  ? 'bg-amber-500 hover:bg-amber-600' 
                                  : 'bg-emerald-500 hover:bg-emerald-600'
                              }`}
                              title={doctor.status === 'Active' ? 'Suspend' : 'Activate'}
                            >
                              {doctor.status === 'Active' ? <FiPause /> : <FiPlay />}
                            </button>
                            <button
                              onClick={() => setConfirmDelete(doctor.id)}
                              className="inline-flex items-center gap-2 rounded-3xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-900/50"
                              title="Delete"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {doctors.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-gray-500">No doctors found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/20 bg-white/90 shadow-xl backdrop-blur-xl sm:max-h-[90vh]">
            <div className="flex h-full max-h-[90vh] flex-col overflow-hidden">
              <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-200/70 bg-white/90 px-5 py-4">
                <div className="min-w-0">
                  <h2 className="text-2xl font-semibold text-gray-900">
                    {editingId ? 'Edit Doctor' : 'Add New Doctor'}
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">Create and manage doctor accounts from the admin panel.</p>
                </div>
                <button
                  onClick={handleReset}
                  className="rounded-full border border-gray-200 bg-white px-3 py-3 text-gray-500 transition hover:text-gray-700"
                >
                  <FiX size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5 scroll-smooth">
                <form id="doctor-form" onSubmit={handleSubmit} className="space-y-4">
                  <InputField
                    label="Full Name"
                    placeholder="Dr. Jane Smith"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    error={errors.name}
                  />
                  <InputField
                    label="Email"
                    type="email"
                    placeholder="doctor@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    error={errors.email}
                  />
                  <InputField
                    label="Password"
                    type="password"
                    placeholder="Create password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    error={errors.password}
                  />
                  <InputField
                    label="Phone"
                    placeholder="123-456-7890"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    error={errors.phone}
                  />
                  <InputField
                    label="Specialty"
                    placeholder="Mental health specialist"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    required
                    error={errors.specialization}
                  />
                  <InputField
                    label="Experience"
                    placeholder="5 years"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    required
                    error={errors.experience}
                  />
                  <InputField
                    label="Rating"
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    placeholder="4.5"
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                    error={errors.rating}
                  />
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Doctor Photo</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoFileChange}
                      className="w-full rounded-3xl border border-gray-200 bg-white/90 px-4 py-3 text-gray-900 outline-none"
                    />
                    {formData.photo && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-500">Preview:</p>
                        <img src={formData.photo} alt="Doctor preview" className="mt-2 h-24 w-24 rounded-full object-cover shadow-sm" />
                      </div>
                    )}
                  </div>

                  {errors.submit && (
                    <p className="text-red-600 text-sm">{errors.submit}</p>
                  )}
                </form>
              </div>

              <div className="sticky bottom-0 z-10 border-t border-gray-200/70 bg-white/90 px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="rounded-3xl border border-gray-300 bg-white px-6 py-3 text-gray-700 font-semibold transition hover:bg-gray-50 shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="doctor-form"
                    disabled={submitting}
                    className="w-full sm:w-auto rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 px-6 py-3 text-white font-semibold transition hover:from-cyan-600 hover:to-sky-600 disabled:opacity-50 shadow-lg"
                  >
                    {submitting ? 'Saving...' : (editingId ? 'Update Doctor' : 'Add Doctor')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-xl">
            <h2 className="text-xl font-semibold text-gray-900">Delete doctor</h2>
            <p className="mt-4 text-gray-600">Are you sure you want to delete this doctor? This action cannot be undone.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={handleDelete}
                disabled={submitting}
                className="rounded-3xl bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg"
              >
                {submitting ? 'Deleting...' : 'Confirm delete'}
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-3xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 shadow-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Profile Modal */}
      {viewProfileDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[2rem] border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900">Doctor Profile</h2>
              <button onClick={() => setViewProfileDoctor(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {(viewProfileDoctor.image || viewProfileDoctor.photo) && (
                  <img src={viewProfileDoctor.image || viewProfileDoctor.photo} alt={viewProfileDoctor.name} className="h-20 w-20 rounded-full object-cover shadow-lg" />
                )}
                <div>
                  <p className="text-xl font-semibold text-gray-900">{viewProfileDoctor.name}</p>
                  <p className="text-sm text-gray-600">{viewProfileDoctor.specialization}</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-white/90 p-4">
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="mt-1 font-semibold text-gray-900">{viewProfileDoctor.email || 'N/A'}</p>
                </div>
                <div className="rounded-xl bg-white/90 p-4">
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="mt-1 font-semibold text-gray-900">{viewProfileDoctor.phone || 'N/A'}</p>
                </div>
                <div className="rounded-xl bg-white/90 p-4">
                  <p className="text-sm text-gray-500">Experience</p>
                  <p className="mt-1 font-semibold text-gray-900">{viewProfileDoctor.experience ? `${viewProfileDoctor.experience} years` : 'N/A'}</p>
                </div>
                <div className="rounded-xl bg-white/90 p-4">
                  <p className="text-sm text-gray-500">Rating</p>
                  <p className="mt-1 font-semibold text-gray-900">⭐ {(typeof viewProfileDoctor.rating === 'number' ? viewProfileDoctor.rating.toFixed(1) : viewProfileDoctor.rating) || 'N/A'}</p>
                </div>
                <div className="rounded-xl bg-white/90 p-4">
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="mt-1 font-semibold text-gray-900">{viewProfileDoctor.status || 'N/A'}</p>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setViewProfileDoctor(null)}
                  className="rounded-3xl border border-gray-300 bg-white px-6 py-3 text-gray-700 font-semibold transition hover:bg-gray-50 shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AdminDoctors;
