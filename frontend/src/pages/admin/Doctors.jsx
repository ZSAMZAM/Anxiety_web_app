import { useEffect, useState } from 'react';
import { FiPlus, FiEdit3, FiTrash2, FiX, FiEye, FiEyeOff, FiPause, FiPlay, FiCopy, FiRefreshCw } from 'react-icons/fi';
import SectionHeader from '../../components/SectionHeader.jsx';
import Avatar from '../../components/Avatar.jsx';
import InputField from '../../components/InputField.jsx';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';

const generateDoctorPassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let randomPart = '';
  for (let index = 0; index < 8; index += 1) {
    randomPart += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `Dr@${randomPart}9`;
};

const SOMALIA_PHONE_PREFIXES = ['61', '62', '63', '65', '66', '67', '68', '69', '77', '90'];

const normalizeSomaliaPhone = (value) => {
  const raw = String(value || '').trim();
  const digits = raw.replace(/\D/g, '');
  if (raw.startsWith('+252')) return `+252${digits.slice(3)}`;
  if (digits.startsWith('252')) return `+${digits}`;
  if (digits.startsWith('0')) return `+252${digits.slice(1)}`;
  if (digits.length === 9) return `+252${digits}`;
  return raw.replace(/[^\d+]/g, '');
};

const validateSomaliaPhone = (value) => {
  const phone = normalizeSomaliaPhone(value);
  if (!phone) return 'Phone number is required.';
  if (!/^\+252\d{9}$/.test(phone)) return 'Use Somalia format: +25261XXXXXXX.';
  if (!SOMALIA_PHONE_PREFIXES.includes(phone.slice(4, 6))) {
    return 'Use a supported Somalia mobile prefix: 61, 62, 63, 65, 66, 67, 68, 69, 77, or 90.';
  }
  return '';
};

const validateName = (value) => {
  const name = String(value || '').trim();
  if (!name) return 'Full name is required.';
  if (name.length < 3) return 'Full name must be at least 3 characters.';
  if (name.length > 80) return 'Full name must be 80 characters or less.';
  if (!/^[A-Za-z][A-Za-z.' -]*$/.test(name)) return 'Full name can only contain letters, spaces, apostrophes, periods, and hyphens.';
  if (/\s{2,}/.test(name)) return 'Full name cannot contain repeated spaces.';
  return '';
};

const validateUsername = (value) => {
  const username = String(value || '').trim();
  if (!username) return 'Username is required.';
  if (username.length < 4 || username.length > 30) return 'Username must be between 4 and 30 characters.';
  if (!/^[A-Za-z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers, and underscores.';
  return '';
};

const validatePassword = (value) => {
  const password = String(value || '');
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Password must contain at least one special character.';
  return '';
};

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
    username: '',
    password: '',
    phone: '',
    hospital: '',
    age: '',
    gender: '',
    specialization: '',
    experience: '',
    cons_fee: '',
    status: 'Active',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { showToast } = useToast();

  const openAddDoctorForm = () => {
    handleReset();
    setFormData((prev) => ({ ...prev, password: generateDoctorPassword() }));
    setShowPassword(true);
    setShowForm(true);
  };

  const regeneratePassword = () => {
    setFormData((prev) => ({ ...prev, password: generateDoctorPassword() }));
    setShowPassword(true);
  };

  const copyGeneratedPassword = async () => {
    try {
      await navigator.clipboard.writeText(formData.password);
      showToast('Password copied', 'Generated password copied to clipboard.');
    } catch (error) {
      showToast('Copy failed', 'Select and copy the generated password manually.');
    }
  };

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
    const nameError = validateName(formData.name);
    const usernameError = validateUsername(formData.username);
    const phoneError = validateSomaliaPhone(formData.phone);
    if (nameError) nextErrors.name = nameError;
    if (usernameError) nextErrors.username = usernameError;
    if (!editingId) {
      const passwordError = validatePassword(formData.password);
      if (passwordError) nextErrors.password = passwordError;
    } else if (formData.password) {
      const passwordError = validatePassword(formData.password);
      if (passwordError) nextErrors.password = passwordError;
    }
    if (phoneError) nextErrors.phone = phoneError;
    if (!formData.hospital.trim()) nextErrors.hospital = 'Hospital name is required.';
    if (formData.hospital.trim().length > 120) nextErrors.hospital = 'Hospital name must be 120 characters or less.';
    if (!formData.gender.trim()) nextErrors.gender = 'Gender is required.';
    if (!formData.age.toString().trim()) {
      nextErrors.age = 'Age is required.';
    } else {
      const ageValue = Number(formData.age);
      if (!Number.isInteger(ageValue) || ageValue <= 0) {
        nextErrors.age = 'Age must be a positive whole number.';
      } else if (ageValue < 25 || ageValue > 80) {
        nextErrors.age = 'Age must be between 25 and 80.';
      }
    }
    if (!formData.specialization.trim()) nextErrors.specialization = 'Specialization is required.';
    if (formData.specialization.trim().length > 120) nextErrors.specialization = 'Specialization must be 120 characters or less.';
    if (!formData.experience.toString().trim()) {
      nextErrors.experience = 'Experience is required.';
    } else {
      const experienceValue = Number(formData.experience);
      if (!Number.isInteger(experienceValue) || experienceValue < 0 || experienceValue > 60) {
        nextErrors.experience = 'Experience must be a whole number between 0 and 60.';
      }
    }
    if (!formData.cons_fee.toString().trim()) {
      nextErrors.cons_fee = 'Consultation fee is required.';
    } else {
      const feeValue = Number(formData.cons_fee);
      if (!Number.isFinite(feeValue) || feeValue <= 0) {
        nextErrors.cons_fee = 'Consultation fee must be greater than 0.';
      }
    }
    
    return nextErrors;
  };

  const handleReset = () => {
    setFormData({
      name: '',
      username: '',
      password: '',
      phone: '',
      hospital: '',
      age: '',
      gender: '',
      specialization: '',
      experience: '',
      cons_fee: '',
      status: 'Active',
    });
    setErrors({});
    setEditingId(null);
    setShowForm(false);
  };

  // Photo upload removed as part of username-only migration

  const handleEdit = (doctor) => {
    setFormData({
      name: doctor.name || '',
      username: doctor.username || '',
      password: '',
      phone: doctor.phone || '',
      hospital: doctor.hospital || doctor.hospital_name || '',
      age: doctor.age || '',
      gender: doctor.gender || '',
      specialization: doctor.specialization || '',
      experience: doctor.experience || '',
      cons_fee: doctor.cons_fee ?? doctor.consultation_fee ?? doctor.fee ?? '',
      status: doctor.status || 'Active',
    });
    setEditingId(doctor.id);
    setShowForm(true);
    setShowPassword(false);
    setErrors({});
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;

    setSubmitting(true);
    setError('');

    try {
      await api.deleteDoctor(confirmDelete);
      setConfirmDelete(null);
      if (editingId === confirmDelete) {
        handleReset();
      }
      showToast('Doctor deleted', 'Doctor removed successfully.');
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || 'Unable to delete doctor.';
      setError(message);
      showToast('Delete failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (doctor) => {
    const currentStatus = String(doctor.status || '').toLowerCase();
    const nextStatus = currentStatus === 'active' ? 'Inactive' : 'Active';

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
      const payload = {
        name: formData.name.trim().replace(/\s+/g, ' '),
        username: formData.username.trim(),
        password: formData.password,
        phone: normalizeSomaliaPhone(formData.phone),
        hospital: formData.hospital.trim(),
        age: formData.age,
        gender: formData.gender,
        specialization: formData.specialization.trim(),
        experience: formData.experience,
        cons_fee: Number(formData.cons_fee),
        status: formData.status,
      };
      const response = await api.createDoctor(payload);
      const newDoctor = response?.doctor || response?.data || response;
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
      const nextErrors = validateForm();
      if (Object.keys(nextErrors).length) {
        setErrors(nextErrors);
        return;
      }
      // Update path keeps previous behavior
      setSubmitting(true);
      try {
        await api.updateDoctor(editingId, {
          ...formData,
          name: formData.name.trim().replace(/\s+/g, ' '),
          username: formData.username.trim(),
          phone: normalizeSomaliaPhone(formData.phone),
          hospital: formData.hospital.trim(),
          specialization: formData.specialization.trim(),
        });
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
            onClick={openAddDoctorForm}
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
                      <th className="px-4 py-4">Hospital</th>
                      <th className="px-4 py-4">Age</th>
                      <th className="px-4 py-4">Gender</th>
                      <th className="px-4 py-4">Experience</th>
                      <th className="px-4 py-4">Fee</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctors.map((doctor) => (
                      <tr key={doctor.id} className="border-b border-gray-200 hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={doctor.image || doctor.avatar}
                              name={doctor.name}
                              role="doctor"
                              size="md"
                              className="shadow-lg"
                            />
                            <div className="space-y-1">
                              <p className="font-semibold text-gray-900">{doctor.name}</p>
                              {doctor.username && <p className="text-xs text-gray-500">@{doctor.username}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">{doctor.specialization}</td>
                        <td className="px-4 py-4">{doctor.phone || '-'}</td>
                        <td className="px-4 py-4">{doctor.hospital || doctor.hospital_name || '-'}</td>
                        <td className="px-4 py-4">{doctor.age || '-'}</td>
                        <td className="px-4 py-4">{doctor.gender || '-'}</td>
                        <td className="px-4 py-4">{doctor.experience ? doctor.experience : '-'}</td>
                        <td className="px-4 py-4 font-semibold text-slate-900 dark:text-slate-100">${Number(doctor.cons_fee ?? doctor.consultation_fee ?? doctor.fee ?? 0).toFixed(2)}</td>
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
                      <td colSpan="10" className="px-4 py-8 text-center text-gray-500">No doctors found.</td>
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
        <div className="fixed inset-0 z-50 flex min-h-screen items-start justify-center overflow-hidden bg-black/50 px-4 pb-4 pt-5 backdrop-blur-sm">
          <div
            className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            style={{ height: 'min(620px, calc(100vh - 2rem))' }}
          >
            <div className="flex h-full flex-col overflow-hidden">
              <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-2">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {editingId ? 'Edit Doctor' : 'Add New Doctor'}
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-600">{editingId ? 'Update doctor account details.' : 'Use the generated password for first login.'}</p>
                </div>
                <button
                  onClick={handleReset}
                  className="rounded-full border border-gray-200 bg-white p-2 text-gray-500 transition hover:bg-slate-50 hover:text-gray-700"
                >
                  <FiX size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-hidden px-5 py-2">
                <form id="doctor-form" onSubmit={handleSubmit} className="space-y-2">
                  {!editingId && (
                    <div className="rounded-lg border border-sky-100 bg-sky-50 p-2">
                      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end">
                        <div className="min-w-0 flex-1">
                          <label className="mb-0.5 block text-[11px] font-semibold uppercase tracking-[0.03em] text-slate-600">Generated Password</label>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={formData.password}
                            readOnly
                            className="h-8 w-full rounded-lg border border-sky-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setShowPassword((p) => !p)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-sky-200 bg-white text-slate-600 hover:bg-sky-100" title={showPassword ? 'Hide password' : 'Show password'}>
                            {showPassword ? <FiEyeOff /> : <FiEye />}
                          </button>
                          <button type="button" onClick={regeneratePassword} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-sky-200 bg-white text-slate-600 hover:bg-sky-100" title="Generate new password">
                            <FiRefreshCw />
                          </button>
                          <button type="button" onClick={copyGeneratedPassword} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-sky-200 bg-white text-slate-600 hover:bg-sky-100" title="Copy password">
                            <FiCopy />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="grid gap-x-2.5 gap-y-1.5 md:grid-cols-2">
                  <InputField
                    label="Full Name"
                    placeholder="Enter doctor's full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    error={errors.name}
                    compact
                  />
                  <InputField
                    label="Username"
                    type="text"
                    placeholder="Enter login username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                    error={errors.username}
                    compact
                  />
                  {editingId && (
                  <div className="relative">
                    <InputField
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Leave blank to keep current"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      error={errors.password}
                      compact
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    >
                      {showPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                  )}
                  <InputField
                    label="Phone"
                    placeholder="Enter phone number, e.g. +25261XXXXXXX"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: normalizeSomaliaPhone(e.target.value) })}
                    required
                    inputMode="tel"
                    maxLength={13}
                    error={errors.phone}
                    compact
                  />
                  <InputField
                    label="Hospital"
                    placeholder="Enter hospital or clinic name"
                    value={formData.hospital}
                    onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
                    required
                    error={errors.hospital}
                    compact
                  />
                    <InputField
                      label="Age"
                      type="number"
                      placeholder="Enter doctor's age"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      required
                      min={25}
                      max={80}
                      error={errors.age}
                      compact
                    />
                    <InputField
                      label="Gender"
                      type="select"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      options={[
                        { label: 'Select gender', value: '' },
                        { label: 'Male', value: 'Male' },
                        { label: 'Female', value: 'Female' },
                      ]}
                      required
                      error={errors.gender}
                      compact
                    />
                  <InputField
                    label="Specialty"
                    placeholder="Enter medical specialty"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    required
                    error={errors.specialization}
                    compact
                  />
                  <InputField
                    label="Experience"
                    placeholder="Enter years of experience"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    required
                    type="number"
                    min="0"
                    max="60"
                    error={errors.experience}
                    compact
                  />
                  <InputField
                    label="Consultation Fee (USD)"
                    type="number"
                    placeholder="Enter consultation fee"
                    value={formData.cons_fee}
                    onChange={(e) => setFormData({ ...formData, cons_fee: e.target.value })}
                    required
                    min="0.01"
                    step="0.01"
                    error={errors.cons_fee}
                    compact
                  />
                  </div>
                  {/* Rating and doctor photo removed per spec */}

                  {errors.submit && (
                    <p className="text-red-600 text-sm">{errors.submit}</p>
                  )}
                </form>
              </div>

              <div className="border-t border-gray-200 bg-white px-5 py-2.5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="h-10 rounded-xl border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="doctor-form"
                    disabled={submitting}
                    className="h-10 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 px-5 text-sm font-semibold text-white shadow-lg transition hover:from-cyan-600 hover:to-sky-600 disabled:opacity-50 sm:w-auto"
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
                <Avatar
                  src={viewProfileDoctor.image || viewProfileDoctor.avatar}
                  name={viewProfileDoctor.name}
                  role="doctor"
                  size="2xl"
                  className="h-20 w-20 shadow-lg"
                />
                <div>
                  <p className="text-xl font-semibold text-gray-900">{viewProfileDoctor.name}</p>
                  <p className="text-sm text-gray-600">{viewProfileDoctor.specialization}</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-white/90 p-4">
                  <p className="text-sm text-gray-500">Username</p>
                  <p className="mt-1 font-semibold text-gray-900">{viewProfileDoctor.username || 'N/A'}</p>
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
                  <p className="text-sm text-gray-500">Consultation Fee</p>
                  <p className="mt-1 font-semibold text-gray-900">${Number(viewProfileDoctor.cons_fee ?? viewProfileDoctor.consultation_fee ?? viewProfileDoctor.fee ?? 0).toFixed(2)} USD</p>
                </div>
                {/* Rating removed */}
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
