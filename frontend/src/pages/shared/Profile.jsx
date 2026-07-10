import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../services/api.js';
import Avatar from '../../components/Avatar.jsx';
import SectionHeader from '../../components/SectionHeader.jsx';
import { useToast } from '../../context/ToastContext.jsx';

function Profile() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const [avatar, setAvatar] = useState(user?.avatar);
  const [profileData, setProfileData] = useState(user || null);
  const [form, setForm] = useState({
    fullname: user?.fullname || user?.name || '',
    username: user?.username || '',
    phone: user?.phone || '',
    gender: user?.gender || '',
    age: user?.age || '',
    hospital_name: user?.hospital_name || user?.hospital || '',
    specialty: user?.specialty || user?.specialization || '',
    experience_years: user?.experience_years || user?.experience || '',
    cons_fee: user?.cons_fee || user?.consultation_fee || user?.fee || '',
    date_of_birth: user?.date_of_birth || '',
    address: user?.address || '',
    district: user?.district || '',
    city: user?.city || '',
    clinic_name: user?.clinic_name || '',
    clinic_address: user?.clinic_address || '',
    license_number: user?.license_number || '',
    bio: user?.bio || '',
    availability_schedule: user?.availability_schedule || '',
    password: '',
    confirm: ''
  });
  const [viewMode, setViewMode] = useState(true);
  const [updated, setUpdated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setAvatar(user?.avatar || null);
  }, [user?.avatar]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const role = (user?.role || '').toLowerCase();
        const refreshedUser = role === 'doctor'
          ? (await api.getDoctorProfile()).doctor || {}
          : (await api.getProfile()).user || {};

        updateUser(refreshedUser);
        setProfileData(refreshedUser);
        setAvatar(refreshedUser.avatar || null);
        setForm((prev) => {
          return {
            ...prev,
            fullname: refreshedUser.fullname || prev.fullname,
            username: refreshedUser.username || prev.username,
            phone: refreshedUser.phone || prev.phone,
            gender: refreshedUser.gender || prev.gender,
            age: refreshedUser.age || prev.age,
            hospital_name: refreshedUser.hospital_name || refreshedUser.hospital || prev.hospital_name,
            specialty: refreshedUser.specialty || prev.specialty,
            experience_years: refreshedUser.experience_years || refreshedUser.experience || prev.experience_years,
            cons_fee: refreshedUser.cons_fee ?? refreshedUser.consultation_fee ?? refreshedUser.fee ?? prev.cons_fee,
            date_of_birth: refreshedUser.date_of_birth || prev.date_of_birth,
            address: refreshedUser.address || prev.address,
            district: refreshedUser.district || prev.district,
            city: refreshedUser.city || prev.city,
            clinic_name: refreshedUser.clinic_name || prev.clinic_name,
            clinic_address: refreshedUser.clinic_address || prev.clinic_address,
            license_number: refreshedUser.license_number || prev.license_number,
            bio: refreshedUser.bio || prev.bio,
            availability_schedule: refreshedUser.availability_schedule || prev.availability_schedule,
          };
        });
      } catch (fetchError) {
        console.error('Failed to load profile on mount:', fetchError);
      } finally {
        setIsFetchingProfile(false);
      }
    };

    if (user?.role) {
      loadProfile();
    }
  }, []); // Empty dependency array - only runs once on mount

  const validateForm = () => {
    const nextErrors = {};

    if (!form.fullname.trim()) {
      nextErrors.fullname = 'Full name is required.';
    }

    if (form.password && form.password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.';
    }

    if (form.password && form.password !== form.confirm) {
      nextErrors.confirm = 'Passwords do not match.';
    }

    return nextErrors;
  };

  const handleFieldChange = (field, value) => {
    setForm((prev) => {
      return { ...prev, [field]: value };
    });
    setError(null);
    setErrors((prev) => {
      const { [field]: removed, ...rest } = prev;
      return rest;
    });
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only JPG, JPEG, PNG, and WEBP are allowed.');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size too large. Maximum size is 5MB.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      await api.uploadAvatar(formData);
      const isDoctor = (user?.role || '').toLowerCase() === 'doctor';
      const refreshedResponse = isDoctor
        ? await api.getDoctorProfile()
        : await api.getProfile();
      const refreshedUser = isDoctor
        ? refreshedResponse.doctor || {}
        : refreshedResponse.user || {};
      updateUser(refreshedUser);
      setAvatar(refreshedUser.avatar || null);
      setForm((prev) => ({
        ...prev,
        fullname: refreshedUser.fullname || prev.fullname,
        phone: refreshedUser.phone || prev.phone,
        gender: refreshedUser.gender || prev.gender,
        date_of_birth: refreshedUser.date_of_birth || prev.date_of_birth,
        address: refreshedUser.address || prev.address,
        district: refreshedUser.district || prev.district,
        city: refreshedUser.city || prev.city,
        hospital_name: refreshedUser.hospital_name || prev.hospital_name,
        specialty: refreshedUser.specialty || prev.specialty,
        experience_years: refreshedUser.experience_years || prev.experience_years,
        cons_fee: refreshedUser.cons_fee ?? refreshedUser.consultation_fee ?? refreshedUser.fee ?? prev.cons_fee,
      }));
      setUpdated(true);
      setTimeout(() => setUpdated(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to upload avatar');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const nextErrors = validateForm();
      if (Object.keys(nextErrors).length) {
        setErrors(nextErrors);
        setError(null);
        setLoading(false);
        return;
      }

      const updateData = {
        fullname: form.fullname,
        username: form.username,
      };

      if (isAdmin && avatar) {
        updateData.avatar = avatar;
      }

      // For doctors, use the dedicated endpoint
      if (isDoctor) {
        updateData.phone = form.phone;
        updateData.hospital_name = form.hospital_name;
        updateData.age = form.age;
        updateData.specialty = form.specialty;
        updateData.gender = form.gender;
        updateData.experience_years = form.experience_years;
        if (avatar) {
          updateData.avatar = avatar;
        }
        try {
          const updateResponse = await api.updateDoctorProfile(updateData);
          const refreshedUser = updateResponse?.doctor || {};

          updateUser(refreshedUser);
          setProfileData(refreshedUser);
          setAvatar(refreshedUser.avatar || null);
          setForm((prev) => ({
            ...prev,
            fullname: refreshedUser.fullname || prev.fullname,
            username: refreshedUser.username || prev.username,
            phone: refreshedUser.phone || prev.phone,
            gender: refreshedUser.gender || prev.gender,
            age: refreshedUser.age || prev.age,
            hospital_name: refreshedUser.hospital_name || refreshedUser.hospital || prev.hospital_name,
            specialty: refreshedUser.specialty || prev.specialty,
            experience_years: refreshedUser.experience_years || refreshedUser.experience || prev.experience_years,
            cons_fee: refreshedUser.cons_fee ?? refreshedUser.consultation_fee ?? refreshedUser.fee ?? prev.cons_fee,
          }));
          setUpdated(true);
          setTimeout(() => setUpdated(false), 3000);
          setViewMode(true);
          showToast('Profile updated', 'Your profile information was saved successfully.');
          setForm((prev) => ({ ...prev, password: '', confirm: '' }));
          setLoading(false);
          return;
        } catch (err) {
          console.error('Doctor profile update error:', err);
          const responseData = err?.response?.data || {};
          if (responseData?.errors) {
            setErrors(responseData.errors);
          } else if (err.errors) {
            setErrors(err.errors);
          }
          if (responseData?.message) {
            setError(responseData.message);
          } else if (err.message) {
            setError(err.message);
          } else {
            setError('Failed to update doctor profile');
          }
          setLoading(false);
          return;
        }
      }

      // For regular users only; admin does not send these fields
      if (!isAdmin) {
        updateData.date_of_birth = form.date_of_birth;
        updateData.address = form.address;
        updateData.district = form.district;
        updateData.city = form.city;
        updateData.clinic_name = form.clinic_name;
        updateData.clinic_address = form.clinic_address;
        updateData.license_number = form.license_number;
        updateData.bio = form.bio;
        updateData.availability_schedule = form.availability_schedule;
      }

      if (avatar) {
        updateData.avatar = avatar;
      }
      if (form.password) {
        updateData.password = form.password;
      }

      const updateResponse = await api.updateProfile(updateData);
      const refreshedResponse = await api.getProfile();
      const refreshedUser = refreshedResponse.user || updateResponse.user || {};

      updateUser(refreshedUser);
      setProfileData(refreshedUser);
      setAvatar(refreshedUser.avatar || null);
      setForm((prev) => ({
        ...prev,
        fullname: refreshedUser.fullname || prev.fullname,
        username: refreshedUser.username || prev.username,
        phone: refreshedUser.phone || prev.phone,
        gender: refreshedUser.gender || prev.gender,
        age: refreshedUser.age || prev.age,
        hospital_name: refreshedUser.hospital_name || refreshedUser.hospital || prev.hospital_name,
        specialty: refreshedUser.specialty || prev.specialty,
        experience_years: refreshedUser.experience_years || refreshedUser.experience || prev.experience_years,
        cons_fee: refreshedUser.cons_fee ?? refreshedUser.consultation_fee ?? refreshedUser.fee ?? prev.cons_fee,
        date_of_birth: refreshedUser.date_of_birth || prev.date_of_birth,
        address: refreshedUser.address || prev.address,
        district: refreshedUser.district || prev.district,
        city: refreshedUser.city || prev.city,
        clinic_name: refreshedUser.clinic_name || prev.clinic_name,
        clinic_address: refreshedUser.clinic_address || prev.clinic_address,
        license_number: refreshedUser.license_number || prev.license_number,
        bio: refreshedUser.bio || prev.bio,
        availability_schedule: refreshedUser.availability_schedule || prev.availability_schedule,
      }));
      setUpdated(true);
      setTimeout(() => setUpdated(false), 3000);
      setViewMode(true);
      showToast('Profile updated', 'Your profile information was saved successfully.');
      setForm((prev) => ({ ...prev, password: '', confirm: '' }));
    } catch (err) {
      console.error('Profile update error:', err);
      const responseData = err?.response?.data || {};
      if (responseData?.errors) {
        setErrors(responseData.errors);
      } else if (err.errors) {
        setErrors(err.errors);
      }
      if (responseData?.message) {
        setError(responseData.message);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Failed to update profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const role = (profileData?.role || user?.role || '').toLowerCase();
  const isDoctor = role === 'doctor';
  const isAdmin = role === 'admin' || role === 'super_admin';
  const profile = profileData || user || {};
  const pageTitle = role === 'admin' ? 'Manage Account' : isDoctor ? 'Doctor Profile' : 'Profile';
  const pageSubtitle = isDoctor ? 'Maintain your professional doctor profile and personal details.' : 'Manage your personal account settings.';
  const displayValue = (value) => (value || value === 0 ? value : 'Not Provided');

  if (isFetchingProfile) {
    return <div className="p-8 text-center text-slate-600">Loading profile...</div>;
  }

  return (
      <div className="space-y-10">
        <SectionHeader subtitle={pageTitle} title={pageSubtitle} />
        
        {/* Error Banner */}
        {error && (
          <div className="rounded-[2rem] border border-red-200 bg-red-50 p-4 shadow-md">
            <p className="text-sm text-red-800">
              <span className="font-semibold">⚠ Error:</span> {error}
            </p>
          </div>
        )}
        
        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <div className="rounded-[2rem] border border-slate-200/60 bg-white/90 p-8 shadow-xl transition-colors duration-200 dark:border-slate-700 dark:bg-slate-900/80">
            <div className="flex flex-col items-center text-center gap-6">
              <div className="relative flex h-[120px] w-[120px] items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.5)]">
                <Avatar
                  src={avatar || user?.avatar}
                  name={user?.fullname || user?.name}
                  size="2xl"
                  className="h-[120px] w-[120px] object-cover"
                />
              </div>

              <div className="space-y-1">
                <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{user?.fullname || user?.name || 'User Name'}</p>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{user?.role ? user.role.toUpperCase() : 'USER'}</p>
              </div>

              <label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 px-6 py-3 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-sky-600 shadow-lg ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {loading ? 'Uploading...' : 'Upload Image'}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200/60 bg-white/90 p-8 shadow-sm transition-colors duration-200 dark:border-slate-700 dark:bg-slate-900/80">
            <p className="text-sm uppercase tracking-[0.35em] text-sky-600 dark:text-sky-300">Personal information</p>
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-slate-800 dark:text-slate-200">Full name</span>
                  <input
                    value={form.fullname}
                    onChange={(e) => handleFieldChange('fullname', e.target.value)}
                    className={`w-full rounded-3xl bg-white/90 px-4 py-4 text-slate-900 outline-none dark:bg-slate-900/80 dark:text-slate-100 ${errors.fullname ? 'border-red-300 ring-1 ring-red-200' : 'border-gray-200 dark:border-slate-700'}`}
                  />
                  {errors.fullname && <p className="text-sm text-red-600">{errors.fullname}</p>}
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-800 dark:text-slate-200">Username</span>
                  <input
                    value={form.username}
                    onChange={(e) => handleFieldChange('username', e.target.value)}
                    className="w-full rounded-3xl border border-gray-200 bg-white/90 px-4 py-4 text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                  />
                </label>
              </div>

              {!isAdmin && (
                <>
                  <div className="grid gap-6 md:grid-cols-2">
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-800 dark:text-slate-200">Phone number</span>
                      <input
                        value={form.phone}
                        onChange={(e) => handleFieldChange('phone', e.target.value)}
                        className="w-full rounded-3xl border border-gray-200 bg-white/90 px-4 py-4 text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                      />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-800 dark:text-slate-200">Hospital Name</span>
                      <input
                        value={form.hospital_name}
                        onChange={(e) => handleFieldChange('hospital_name', e.target.value)}
                        className="w-full rounded-3xl border border-gray-200 bg-white/90 px-4 py-4 text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                      />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-800 dark:text-slate-200">Age</span>
                      <input
                        type="number"
                        min="0"
                        value={form.age}
                        onChange={(e) => handleFieldChange('age', e.target.value)}
                        className="w-full rounded-3xl border border-gray-200 bg-white/90 px-4 py-4 text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                      />
                    </label>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-800 dark:text-slate-200">Specialty</span>
                      <input
                        value={form.specialty}
                        onChange={(e) => handleFieldChange('specialty', e.target.value)}
                        className="w-full rounded-3xl border border-gray-200 bg-white/90 px-4 py-4 text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                      />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-800 dark:text-slate-200">Gender</span>
                      <select
                        value={form.gender}
                        onChange={(e) => handleFieldChange('gender', e.target.value)}
                        className="w-full rounded-3xl border border-gray-200 bg-white/90 px-4 py-4 text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                      >
                        <option value="">Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                      {errors.gender && <p className="text-sm text-red-600">{errors.gender}</p>}
                    </label>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-800 dark:text-slate-200">Experience Years</span>
                      <input
                        type="number"
                        min="0"
                        value={form.experience_years}
                        onChange={(e) => handleFieldChange('experience_years', e.target.value)}
                        className="w-full rounded-3xl border border-gray-200 bg-white/90 px-4 py-4 text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                      />
                    </label>
                    {isDoctor && (
                      <label className="space-y-2 text-sm">
                        <span className="text-slate-800 dark:text-slate-200">Consultation Fee</span>
                        <input
                          value={`$${Number(form.cons_fee || 0).toFixed(2)} USD`}
                          readOnly
                          className="w-full rounded-3xl border border-gray-200 bg-slate-100 px-4 py-4 text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        />
                      </label>
                    )}
                  </div>
                </>
              )}

              {!isDoctor && !isAdmin && (
                <>
                  <div className="grid gap-6 md:grid-cols-2">
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-800 dark:text-slate-200">Gender</span>
                      <select
                        value={form.gender}
                        onChange={(e) => handleFieldChange('gender', e.target.value)}
                        className="w-full rounded-3xl border border-gray-200 bg-white/90 px-4 py-4 text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                      >
                        <option value="">Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                      {errors.gender && <p className="text-sm text-red-600">{errors.gender}</p>}
                    </label>
                  </div>
                  <div className="grid gap-6 md:grid-cols-3">
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-800 dark:text-slate-200">Date of birth</span>
                      <input
                        type="date"
                        value={form.date_of_birth}
                        onChange={(e) => handleFieldChange('date_of_birth', e.target.value)}
                        className="w-full rounded-3xl border border-gray-200 bg-white/90 px-4 py-4 text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                      />
                      {errors.date_of_birth && <p className="text-sm text-red-600">{errors.date_of_birth}</p>}
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-800 dark:text-slate-200">Address</span>
                      <input
                        value={form.address}
                        onChange={(e) => handleFieldChange('address', e.target.value)}
                        className="w-full rounded-3xl border border-gray-200 bg-white/90 px-4 py-4 text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                      />
                    </label>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-800 dark:text-slate-200">District</span>
                      <input
                        value={form.district}
                        onChange={(e) => handleFieldChange('district', e.target.value)}
                        className="w-full rounded-3xl border border-gray-200 bg-white/90 px-4 py-4 text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                      />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-800 dark:text-slate-200">City</span>
                      <input
                        value={form.city}
                        onChange={(e) => handleFieldChange('city', e.target.value)}
                        className="w-full rounded-3xl border border-gray-200 bg-white/90 px-4 py-4 text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                      />
                    </label>
                  </div>
                </>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 px-6 py-4 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving changes...' : 'Save changes'}
              </button>
              {updated && <p className="rounded-3xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">Profile updated successfully.</p>}
            </form>
          </div>
        </div>
      </div>
  );
}

export default Profile;
