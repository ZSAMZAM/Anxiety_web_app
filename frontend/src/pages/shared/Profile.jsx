import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../services/api.js';
import Avatar from '../../components/Avatar.jsx';
import SectionHeader from '../../components/SectionHeader.jsx';

function Profile() {
  const { user, updateUser } = useAuth();
  const [avatar, setAvatar] = useState(user?.avatar);
  const [form, setForm] = useState({
    fullname: user?.fullname || user?.name || '',
    username: user?.username || '',
    phone: user?.phone || '',
    gender: user?.gender || '',
    date_of_birth: user?.date_of_birth || '',
    age: user?.age || '',
    address: user?.address || '',
    district: user?.district || '',
    city: user?.city || '',
    password: '',
    confirm: ''
  });
  const [updated, setUpdated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

      const response = await api.uploadAvatar(formData);
      setAvatar(response.avatar);
      updateUser({ ...user, avatar: response.avatar });
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
      // Validate password if provided
      if (form.password && form.password !== form.confirm) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }
      
      if (form.password && form.password.length < 8) {
        setError('Password must be at least 8 characters');
        setLoading(false);
        return;
      }
      
      const updateData = {
        fullname: form.fullname,
        phone: form.phone,
        gender: form.gender,
        date_of_birth: form.date_of_birth,
        age: form.age,
        address: form.address,
        district: form.district,
        city: form.city,
      };
      
      if (form.password) {
        updateData.password = form.password;
      }
      
      const response = await api.updateProfile(updateData);
      updateUser(response.user);
      setUpdated(true);
      setTimeout(() => setUpdated(false), 3000);
      
      // Clear password fields
      setForm({ ...form, password: '', confirm: '' });
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="space-y-10">
        <SectionHeader subtitle="Profile" title="Manage your personal account settings." />
        
        {/* Error Banner */}
        {error && (
          <div className="rounded-[2rem] border border-red-200 bg-red-50 p-4 shadow-md">
            <p className="text-sm text-red-800">
              <span className="font-semibold">⚠ Error:</span> {error}
            </p>
          </div>
        )}
        
        <div className="grid gap-6 xl:grid-cols-[0.9fr_0.9fr]">
          <div className="rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-xl backdrop-blur-xl">
            <div className="flex flex-col gap-6 text-gray-600">
              <div className="rounded-[2rem] border border-white/20 bg-white/80 p-6 backdrop-blur-sm">
                <p className="text-sm uppercase tracking-[0.35em] text-sky-600">Profile image</p>
                <div className="mt-5 flex flex-col items-center gap-4 text-center">
                  <Avatar src={avatar} name={user?.fullname || user?.name} size="2xl" className="border border-gray-200 shadow-lg" />
                  <label className={`inline-flex cursor-pointer items-center gap-2 rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-sky-600 shadow-lg ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {loading ? 'Uploading...' : 'Upload image'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={loading} />
                  </label>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-3xl bg-white/80 p-6 backdrop-blur-sm">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 text-white text-3xl font-semibold">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div>
                  <p className="text-xl font-semibold text-gray-900">{user?.name}</p>
                  <p className="text-sm text-sky-600">{user?.role.toUpperCase()}</p>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200/60 bg-white/90 p-6 transition-colors duration-200 dark:border-slate-700 dark:bg-slate-900/60">
                <p className="text-sm uppercase tracking-[0.35em] text-sky-600 dark:text-sky-300">Account summary</p>
                <div className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-300">
                  <p>Full Name: {user?.fullname || user?.name || 'Not set'}</p>
                  <p>Username: {user?.username || 'Not set'}</p>
                  <p>Phone: {user?.phone || 'Not set'}</p>
                  <p>Gender: {user?.gender || 'Not set'}</p>
                  <p>Date of Birth: {user?.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString() : 'Not set'}</p>
                  <p>Age: {user?.age || 'Not set'}</p>
                  <p>Address: {user?.address || 'Not set'}</p>
                  <p>District: {user?.district || 'Not set'}</p>
                  <p>City: {user?.city || 'Not set'}</p>
                  <p>Member since: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Not set'}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-[2rem] border border-slate-200/60 bg-white/90 p-8 shadow-sm transition-colors duration-200 dark:border-slate-700 dark:bg-slate-900/80">
            <p className="text-sm uppercase tracking-[0.35em] text-sky-600 dark:text-sky-300">Edit profile</p>
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <label className="space-y-2 text-sm">
                <span className="text-slate-800 dark:text-slate-200">Full name</span>
                <input
                  value={form.fullname}
                  onChange={(e) => setForm({ ...form, fullname: e.target.value })}
                  className="w-full rounded-3xl border border-gray-200 bg-white/90 px-4 py-4 text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-800 dark:text-slate-200">Username</span>
                <input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full rounded-3xl border border-gray-200 bg-white/90 px-4 py-4 text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                  disabled
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-800 dark:text-slate-200">Phone</span>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-3xl border border-gray-200 bg-white/90 px-4 py-4 text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-800 dark:text-slate-200">Gender</span>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="w-full rounded-3xl border border-gray-200 bg-white/90 px-4 py-4 text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-800 dark:text-slate-200">Date of Birth</span>
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                  className="w-full rounded-3xl border border-gray-200 bg-white/90 px-4 py-4 text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-800 dark:text-slate-200">Age</span>
                <input
                  type="number"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  className="w-full rounded-3xl border border-gray-200 bg-white/90 px-4 py-4 text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-800 dark:text-slate-200">Address</span>
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full rounded-3xl border border-gray-200 bg-white/90 px-4 py-4 text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-800 dark:text-slate-200">District</span>
                <input
                  value={form.district}
                  onChange={(e) => setForm({ ...form, district: e.target.value })}
                  className="w-full rounded-3xl border border-gray-200 bg-white/90 px-4 py-4 text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-800 dark:text-slate-200">City</span>
                <input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full rounded-3xl border border-gray-200 bg-white/90 px-4 py-4 text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-800 dark:text-slate-200">New password</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full rounded-3xl border border-gray-200 bg-white/90 px-4 py-4 text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-800 dark:text-slate-200">Confirm password</span>
                <input
                  type="password"
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  className="w-full rounded-3xl border border-gray-200 bg-white/90 px-4 py-4 text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                />
              </label>
              <button 
                type="submit"
                disabled={loading}
                className="w-full rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 px-6 py-4 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating...' : 'Update profile'}
              </button>
              {updated && <p className="rounded-3xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">Profile updated successfully.</p>}
            </form>
          </div>
        </div>
      </div>
  );
}

export default Profile;
