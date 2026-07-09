import React, { useEffect, useState } from 'react';
import { superAdminApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Shield, Save, Lock } from 'lucide-react';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullname: '',
    username: '',
    email: '',
    phone: '',
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const { user } = useAuth();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await superAdminApi.getProfile();
      setProfile(data);
      setFormData({
        fullname: data.fullname || '',
        username: data.username || '',
        email: data.email || '',
        phone: data.phone || '',
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await superAdminApi.updateProfile({
        fullname: formData.fullname,
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
      });
      alert('Profile updated successfully');
      loadProfile();
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (formData.new_password !== formData.confirm_password) {
      alert('New passwords do not match');
      return;
    }
    setSaving(true);
    try {
      await superAdminApi.updateProfile({
        current_password: formData.current_password,
        new_password: formData.new_password,
      });
      alert('Password changed successfully');
      setFormData({
        ...formData,
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (error) {
      console.error('Failed to change password:', error);
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-gray-400">Loading profile...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Profile</h2>
        <p className="text-gray-400">Manage your account settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center space-x-2">
            <User className="w-5 h-5 text-primary" />
            <span>Personal Information</span>
          </h3>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
              <input
                type="text"
                value={formData.fullname}
                onChange={(e) => setFormData({ ...formData, fullname: e.target.value })}
                className="w-full px-4 py-2 bg-sidebar border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-2 bg-sidebar border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 bg-sidebar border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 bg-sidebar border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center space-x-2">
              <Shield className="w-5 h-5 text-accent" />
              <span>Account Information</span>
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-sidebar rounded-lg">
                <span className="text-gray-400">Role</span>
                <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium">
                  {user?.role || 'SUPER_ADMIN'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-sidebar rounded-lg">
                <span className="text-gray-400">Account ID</span>
                <span className="text-white font-mono text-sm">{user?.id || '-'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-sidebar rounded-lg">
                <span className="text-gray-400">Joined Date</span>
                <span className="text-white">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center space-x-2">
              <Lock className="w-5 h-5 text-warning" />
              <span>Change Password</span>
            </h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Current Password</label>
                <input
                  type="password"
                  value={formData.current_password}
                  onChange={(e) => setFormData({ ...formData, current_password: e.target.value })}
                  className="w-full px-4 py-2 bg-sidebar border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">New Password</label>
                <input
                  type="password"
                  value={formData.new_password}
                  onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                  className="w-full px-4 py-2 bg-sidebar border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={formData.confirm_password}
                  onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                  className="w-full px-4 py-2 bg-sidebar border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-warning hover:bg-warning/90 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Lock className="w-4 h-4" />
                <span>{saving ? 'Changing...' : 'Change Password'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
