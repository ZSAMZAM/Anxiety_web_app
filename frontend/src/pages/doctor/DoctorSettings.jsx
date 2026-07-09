import { useEffect, useState } from 'react';
import { FiUser, FiBell, FiLock, FiMoon, FiSettings, FiMail, FiPhone, FiMapPin, FiCalendar } from 'react-icons/fi';
import { useTheme } from '../../context/ThemeContext.jsx';
import { loadDoctorSettings, saveDoctorSettings } from '../../services/doctorProfile.js';
import { api } from '../../services/api.js';

function DoctorSettings() {
  const { theme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState(loadDoctorSettings());
  const [changePassword, setChangePassword] = useState({ newPassword: '', confirm: '' });
  const [status, setStatus] = useState('');

  useEffect(() => {
    saveDoctorSettings(settings);
  }, [settings]);

  const handleSavePassword = async (event) => {
    event.preventDefault();
    if (changePassword.newPassword !== changePassword.confirm) {
      setStatus('Passwords do not match.');
      return;
    }
    if (changePassword.newPassword.length < 6) {
      setStatus('Password must be at least 6 characters.');
      return;
    }
    setStatus('Updating password...');
    try {
      await api.updateProfile({ password: changePassword.newPassword });
      setStatus('Password updated successfully.');
      setChangePassword({ newPassword: '', confirm: '' });
    } catch (error) {
      setStatus(error.message || 'Unable to update password.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Manage your account preferences and security settings.</p>
      </div>

      <div className="space-y-6">
        {/* Account Section */}
        <div className="rounded-xl bg-white border border-slate-200 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950">
          <div className="flex items-center gap-3 mb-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-slate-800">
              <FiUser className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Account</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">Edit Profile and Change Password</p>
            </div>
          </div>

          <div className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-700">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Full Name</label>
              <input
                type="text"
                value={settings.fullName || ''}
                onChange={(e) => setSettings({ ...settings, fullName: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email</label>
              <input
                type="email"
                value={settings.email || ''}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="rounded-xl bg-white border border-slate-200 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950">
          <div className="flex items-center gap-3 mb-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-50 dark:bg-slate-800">
              <FiLock className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Change Password</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">Update your password</p>
            </div>
          </div>

          <form onSubmit={handleSavePassword} className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-700">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">New Password</label>
              <input
                type="password"
                value={changePassword.newPassword}
                onChange={(e) => setChangePassword({ ...changePassword, newPassword: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Confirm Password</label>
              <input
                type="password"
                value={changePassword.confirm}
                onChange={(e) => setChangePassword({ ...changePassword, confirm: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
            >
              Update Password
            </button>
            {status && (
              <p className={`rounded-lg px-4 py-3 text-sm ${status.includes('successfully') ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                {status}
              </p>
            )}
          </form>
        </div>

        {/* Doctor Information */}
        <div className="rounded-xl bg-white border border-slate-200 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950">
          <div className="flex items-center gap-3 mb-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 dark:bg-slate-800">
              <FiSettings className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Doctor Information</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">Gender, Age, Specialty, Experience, Qualification, License Number, Bio</p>
            </div>
          </div>

          <div className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-700">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Gender</label>
                <select
                  value={settings.gender || ''}
                  onChange={(e) => setSettings({ ...settings, gender: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Age</label>
                <input
                  type="number"
                  value={settings.age || ''}
                  onChange={(e) => setSettings({ ...settings, age: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Specialty</label>
              <input
                type="text"
                value={settings.specialty || ''}
                onChange={(e) => setSettings({ ...settings, specialty: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Experience (Years)</label>
                <input
                  type="number"
                  value={settings.experience || ''}
                  onChange={(e) => setSettings({ ...settings, experience: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">License Number</label>
                <input
                  type="text"
                  value={settings.licenseNumber || ''}
                  onChange={(e) => setSettings({ ...settings, licenseNumber: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Qualification</label>
              <input
                type="text"
                value={settings.qualification || ''}
                onChange={(e) => setSettings({ ...settings, qualification: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Bio</label>
              <textarea
                value={settings.bio || ''}
                onChange={(e) => setSettings({ ...settings, bio: e.target.value })}
                rows="4"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="rounded-xl bg-white border border-slate-200 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950">
          <div className="flex items-center gap-3 mb-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 dark:bg-slate-800">
              <FiBell className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Preferences</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">Notifications and Dark Mode</p>
            </div>
          </div>

          <div className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-700">
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Notifications</p>
              {[
                { label: 'Appointment Notifications', key: 'appointmentAlerts' },
                { label: 'Patient Updates', key: 'patientUpdates' },
                { label: 'Email Notifications', key: 'emailPreferences' },
              ].map((item) => (
                <label key={item.key} className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition dark:border-slate-700 dark:hover:bg-slate-900/50">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{item.label}</span>
                  <input
                    type="checkbox"
                    checked={settings[item.key] || false}
                    onChange={(e) => setSettings({ ...settings, [item.key]: e.target.checked })}
                    className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </label>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Appearance</p>
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">Dark Mode</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Currently {theme === 'dark' ? 'enabled' : 'disabled'}</p>
                </div>
                <button
                  onClick={toggleTheme}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
                >
                  Toggle
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DoctorSettings;

