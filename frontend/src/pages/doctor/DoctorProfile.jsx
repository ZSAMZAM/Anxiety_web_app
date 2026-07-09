import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import Avatar from '../../components/Avatar.jsx';
import SectionHeader from '../../components/SectionHeader.jsx';
import { api } from '../../services/api.js';

const personalFields = [
  { name: 'fullname', label: 'Full Name', type: 'text' },
  { name: 'username', label: 'Username', type: 'text', disabled: true },
  { name: 'phone', label: 'Phone Number', type: 'text' },
  { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'] },
  { name: 'age', label: 'Age', type: 'number' },
  { name: 'date_of_birth', label: 'Date of Birth', type: 'date' },
  { name: 'address', label: 'Address', type: 'text' },
  { name: 'district', label: 'District', type: 'text' },
  { name: 'city', label: 'City', type: 'text' },
];

const professionalFields = [
  { name: 'specialty', label: 'Specialty', type: 'text' },
  { name: 'clinic_name', label: 'Clinic Name', type: 'text' },
  { name: 'clinic_address', label: 'Clinic Address', type: 'text' },
  { name: 'experience_years', label: 'Experience Years', type: 'number' },
  { name: 'license_number', label: 'License Number', type: 'text' },
  { name: 'rating', label: 'Rating (0-5)', type: 'number', step: '0.1', min: 0, max: 5 },
  { name: 'availability_schedule', label: 'Availability Schedule (JSON)', type: 'textarea' },
];

function DoctorProfile() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState({
    fullname: '',
    username: '',
    phone: '',
    gender: '',
    age: '',
    date_of_birth: '',
    address: '',
    district: '',
    city: '',
    specialty: '',
    clinic_name: '',
    clinic_address: '',
    experience_years: '',
    license_number: '',
    bio: '',
    rating: 0,
    availability_schedule: '',
  });
  const [avatar, setAvatar] = useState(user?.avatar);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await api.get('/profile');
      if (response.user) {
        setProfile({
          fullname: response.user.fullname || '',
          username: response.user.username || user?.username || '',
          phone: response.user.phone || '',
          gender: response.user.gender || '',
          age: response.user.age || '',
          date_of_birth: response.user.date_of_birth || '',
          address: response.user.address || '',
          district: response.user.district || '',
          city: response.user.city || '',
          specialty: response.user.specialty || '',
          clinic_name: response.user.clinic_name || '',
          clinic_address: response.user.clinic_address || '',
          experience_years: response.user.experience_years || '',
          license_number: response.user.license_number || '',
          bio: response.user.bio || '',
          rating: response.user.rating || 0,
          availability_schedule: response.user.availability_schedule || '',
        });
        if (response.user.avatar) {
          setAvatar(response.user.avatar);
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      setStatus('Failed to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  const allFields = [...personalFields, ...professionalFields, { name: 'bio', label: 'Bio', type: 'textarea' }];

  const completion = useMemo(() => {
    const total = allFields.length + 1;
    const filled = allFields.reduce((count, field) => count + (profile[field.name] ? 1 : 0), 0) + (avatar ? 1 : 0);
    return Math.round((filled / total) * 100);
  }, [avatar, profile]);

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Frontend validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      setStatus('Invalid file type. Only JPG, JPEG, PNG, and WEBP are allowed.');
      return;
    }

    if (file.size > maxSize) {
      setStatus('File size exceeds 5MB limit.');
      return;
    }

    setStatus('Uploading avatar...');
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'}/api/profile/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });
      const data = await response.json();
      if (data.avatar) {
        setAvatar(data.avatar);
        updateUser({ avatar: data.avatar });
        setStatus('Avatar uploaded successfully.');
      } else if (data.error) {
        setStatus(data.error);
      }
    } catch (error) {
      setStatus('Failed to upload avatar.');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('Saving profile...');
    try {
      await api.put('/profile', {
        ...profile,
        password: password || undefined,
      });
      updateUser({ name: profile.fullname });
      setStatus('Profile updated successfully.');
      setPassword('');
    } catch (error) {
      setStatus(error.message || 'Unable to update profile.');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-600">Loading profile...</div>;
  }

  return (
    <div className="space-y-10">
      <SectionHeader subtitle="Doctor profile" title="Maintain your clinical identity and professional details." />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_0.9fr]">
        <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-8 shadow-xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-950/80">
          <div className="flex flex-col gap-6 text-slate-700 dark:text-slate-300">
            <div className="rounded-[2rem] border border-slate-200/80 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900/80">
              <p className="text-sm uppercase tracking-[0.35em] text-sky-600">Profile completion</p>
              <div className="mt-4 h-4 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400" style={{ width: `${completion}%` }} />
              </div>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{completion}% complete — keep your medical profile up to date.</p>
            </div>

            <div className="rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
              <p className="text-sm uppercase tracking-[0.35em] text-sky-600">Professional snapshot</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-slate-50 p-5 dark:bg-slate-950/70">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Specialty</p>
                  <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">{profile.specialty || 'Not set'}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-5 dark:bg-slate-950/70">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Clinic</p>
                  <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">{profile.clinic_name || 'Not set'}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-5 dark:bg-slate-950/70">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Experience</p>
                  <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">{profile.experience_years ? `${profile.experience_years} years` : 'Not set'}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-5 dark:bg-slate-950/70">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">License</p>
                  <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">{profile.license_number || 'Not set'}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
              <p className="text-sm uppercase tracking-[0.35em] text-sky-600">About you</p>
              <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">{profile.bio || 'No bio added yet.'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-8 shadow-xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-950/80">
          <div className="flex flex-col gap-6">
            <div className="rounded-[2rem] border border-slate-200/80 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900/80">
              <p className="text-sm uppercase tracking-[0.35em] text-sky-600">Profile photo</p>
              <div className="mt-5 flex flex-col items-center gap-4 text-center">
                <Avatar src={avatar} name={profile.fullname || user?.fullname || user?.name} size="2xl" className="border border-slate-200 shadow-lg dark:border-slate-700" />
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-3xl bg-gradient-to-r from-sky-500 to-cyan-500 px-5 py-3 text-sm font-semibold text-white transition hover:from-sky-600 hover:to-cyan-600">
                  Upload photo
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Personal Information</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {personalFields.map((field) => (
                    <label key={field.name} className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
                      <span>{field.label}</span>
                      {field.type === 'select' ? (
                        <select
                          value={profile[field.name] || ''}
                          onChange={(event) => setProfile({ ...profile, [field.name]: event.target.value })}
                          className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        >
                          <option value="">Select {field.label}</option>
                          {field.options?.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          value={profile[field.name] || ''}
                          onChange={(event) => setProfile({ ...profile, [field.name]: event.target.value })}
                          disabled={field.disabled}
                          className={`w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 ${field.disabled ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                        />
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Professional Information</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {professionalFields.map((field) => (
                    <label key={field.name} className={`space-y-2 text-sm text-slate-700 dark:text-slate-200 ${field.type === 'textarea' ? 'sm:col-span-2' : ''}`}>
                      <span>{field.label}</span>
                      {field.type === 'textarea' ? (
                        <textarea
                          value={profile[field.name] || ''}
                          onChange={(event) => setProfile({ ...profile, [field.name]: event.target.value })}
                          rows={4}
                          className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      ) : (
                        <input
                          type={field.type}
                          value={profile[field.name] || ''}
                          onChange={(event) => setProfile({ ...profile, [field.name]: event.target.value })}
                          step={field.step}
                          min={field.min}
                          max={field.max}
                          className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-700 dark:text-slate-200">Bio</label>
                <textarea
                  value={profile.bio || ''}
                  onChange={(event) => setProfile({ ...profile, bio: event.target.value })}
                  rows={4}
                  className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>

              <label className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
                <span>New password (leave blank to keep current)</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>

              <button className="inline-flex items-center justify-center rounded-3xl bg-gradient-to-r from-sky-500 to-cyan-500 px-6 py-4 text-sm font-semibold text-white transition hover:from-sky-600 hover:to-cyan-600">
                Save Doctor Profile
              </button>
              {status && <p className="rounded-3xl bg-slate-100 px-4 py-3 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200">{status}</p>}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DoctorProfile;
