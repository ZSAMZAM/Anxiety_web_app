import React, { useEffect, useState } from 'react';
import { superAdminApi } from '../services/api';
import { Settings, Save, RefreshCw } from 'lucide-react';

const SystemSettings = () => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await superAdminApi.getSystemSettings();
      setSettings(data.settings || {});
    } catch (error) {
      console.error('Failed to load system settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await superAdminApi.updateSystemSettings(settings);
      alert('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  if (loading) {
    return <div className="text-gray-400">Loading system settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">System Settings</h2>
          <p className="text-gray-400">Configure system-wide settings</p>
        </div>
        <button
          onClick={loadSettings}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="bg-card rounded-xl border border-gray-800 p-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Site Name</label>
            <input
              type="text"
              value={settings.site_name || ''}
              onChange={(e) => handleSettingChange('site_name', e.target.value)}
              className="w-full px-4 py-2 bg-sidebar border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Site Description</label>
            <textarea
              value={settings.site_description || ''}
              onChange={(e) => handleSettingChange('site_description', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-sidebar border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Contact Email</label>
            <input
              type="email"
              value={settings.contact_email || ''}
              onChange={(e) => handleSettingChange('contact_email', e.target.value)}
              className="w-full px-4 py-2 bg-sidebar border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Contact Phone</label>
            <input
              type="text"
              value={settings.contact_phone || ''}
              onChange={(e) => handleSettingChange('contact_phone', e.target.value)}
              className="w-full px-4 py-2 bg-sidebar border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Maintenance Mode</label>
            <select
              value={settings.maintenance_mode || 'false'}
              onChange={(e) => handleSettingChange('maintenance_mode', e.target.value)}
              className="w-full px-4 py-2 bg-sidebar border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="false">Disabled</option>
              <option value="true">Enabled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Max Users</label>
            <input
              type="number"
              value={settings.max_users || ''}
              onChange={(e) => handleSettingChange('max_users', e.target.value)}
              className="w-full px-4 py-2 bg-sidebar border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Session Timeout (minutes)</label>
            <input
              type="number"
              value={settings.session_timeout || ''}
              onChange={(e) => handleSettingChange('session_timeout', e.target.value)}
              className="w-full px-4 py-2 bg-sidebar border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="pt-4 border-t border-gray-800">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
