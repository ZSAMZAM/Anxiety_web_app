import React, { useEffect, useState } from 'react';
import { superAdminApi } from '../services/api';
import { Send, Users, Stethoscope, UserCog, Bell, Shield, Activity } from 'lucide-react';

const Notifications = () => {
  const [formData, setFormData] = useState({
    target: 'all',
    title: '',
    message: '',
  });
  const [sending, setSending] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCenter = async () => {
    try {
      const [notificationData, securityData] = await Promise.all([
        superAdminApi.getNotifications(),
        superAdminApi.getSecurityStats(),
      ]);
      setNotifications(notificationData.notifications || []);
      setSecurityEvents([
        ...(securityData.recentLogins || []),
        ...(securityData.suspiciousActivity || []),
      ].slice(0, 8));
    } catch (error) {
      console.error('Failed to load notification center:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCenter();
    const intervalId = window.setInterval(loadCenter, 30000);
    const onFocus = () => loadCenter();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const handleSendNotification = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const result = await superAdminApi.sendNotification(formData);
      alert(`Notification sent successfully to ${result.sent_count || 0} recipient(s).`);
      setFormData({ target: 'all', title: '', message: '' });
      await loadCenter();
    } catch (error) {
      console.error('Failed to send notification:', error);
      alert(error.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Send Notifications</h2>
        <p className="text-gray-400">Broadcast notifications to users</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="bg-card rounded-xl border border-gray-800 p-6 xl:col-span-1">
        <form onSubmit={handleSendNotification} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Target Audience</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <label className="flex items-center space-x-3 p-4 bg-sidebar rounded-lg cursor-pointer hover:bg-gray-800 transition-colors border-2 border-transparent has-[:checked]:border-primary">
                <input
                  type="radio"
                  name="target"
                  value="all"
                  checked={formData.target === 'all'}
                  onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                  className="w-5 h-5 text-primary focus:ring-primary focus:ring-offset-0"
                />
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-gray-400" />
                  <span className="text-white">Everyone</span>
                </div>
              </label>

              <label className="flex items-center space-x-3 p-4 bg-sidebar rounded-lg cursor-pointer hover:bg-gray-800 transition-colors border-2 border-transparent has-[:checked]:border-primary">
                <input
                  type="radio"
                  name="target"
                  value="users"
                  checked={formData.target === 'users'}
                  onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                  className="w-5 h-5 text-primary focus:ring-primary focus:ring-offset-0"
                />
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-gray-400" />
                  <span className="text-white">Patients</span>
                </div>
              </label>

              <label className="flex items-center space-x-3 p-4 bg-sidebar rounded-lg cursor-pointer hover:bg-gray-800 transition-colors border-2 border-transparent has-[:checked]:border-primary">
                <input
                  type="radio"
                  name="target"
                  value="doctors"
                  checked={formData.target === 'doctors'}
                  onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                  className="w-5 h-5 text-primary focus:ring-primary focus:ring-offset-0"
                />
                <div className="flex items-center space-x-2">
                  <Stethoscope className="w-5 h-5 text-gray-400" />
                  <span className="text-white">Doctors</span>
                </div>
              </label>

              <label className="flex items-center space-x-3 p-4 bg-sidebar rounded-lg cursor-pointer hover:bg-gray-800 transition-colors border-2 border-transparent has-[:checked]:border-primary">
                <input
                  type="radio"
                  name="target"
                  value="admins"
                  checked={formData.target === 'admins'}
                  onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                  className="w-5 h-5 text-primary focus:ring-primary focus:ring-offset-0"
                />
                <div className="flex items-center space-x-2">
                  <UserCog className="w-5 h-5 text-gray-400" />
                  <span className="text-white">Admins</span>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 bg-sidebar border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter notification title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={6}
              className="w-full px-4 py-2 bg-sidebar border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter notification message"
              required
            />
          </div>

          <button
            type="submit"
            disabled={sending}
            className="flex items-center space-x-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
            <span>{sending ? 'Sending...' : 'Send Notification'}</span>
          </button>
        </form>
        </div>

        <div className="bg-card rounded-xl border border-gray-800 p-6 xl:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-white">All Platform Notifications</h3>
            </div>
            <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">Live</span>
          </div>
          {loading ? (
            <p className="text-sm text-gray-400">Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-gray-400">No database notifications yet.</p>
          ) : (
            <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
              {notifications.map((item) => (
                <div key={item.id} className="rounded-lg border border-gray-800 bg-sidebar p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">{item.type || 'SYSTEM'}</span>
                    <span className="rounded-full bg-gray-800 px-2.5 py-1 text-xs text-gray-300">{item.role_target || item.recipient_type || 'all'}</span>
                    <span className="ml-auto text-xs text-gray-500">{item.created_at || ''}</span>
                  </div>
                  <p className="mt-3 font-semibold text-white">{item.title || 'Notification'}</p>
                  <p className="mt-1 text-sm text-gray-300">{item.message || '-'}</p>
                  <p className="mt-2 text-xs text-gray-500">Recipient: {item.recipient || item.user_name || 'All'} {item.reference_id ? `Reference #${item.reference_id}` : ''}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-card rounded-xl border border-gray-800 p-6">
          <div className="mb-5 flex items-center gap-3">
            <Shield className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-semibold text-white">Security & Login Events</h3>
          </div>
          {securityEvents.length === 0 ? (
            <p className="text-sm text-gray-400">No recent security events.</p>
          ) : (
            <div className="space-y-3">
              {securityEvents.map((event, index) => (
                <div key={`${event.id || event.created_at || index}`} className="rounded-lg border border-gray-800 bg-sidebar p-4">
                  <p className="text-sm font-semibold text-white">{event.action || event.event || event.status || 'Security event'}</p>
                  <p className="mt-1 text-xs text-gray-400">{event.username || event.actor || 'Unknown account'} {event.created_at || event.timestamp || ''}</p>
                  <p className="mt-2 text-sm text-gray-300">{event.description || event.message || event.ip_address || ''}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl border border-gray-800 p-6">
          <div className="mb-5 flex items-center gap-3">
            <Activity className="h-5 w-5 text-emerald-500" />
            <h3 className="text-lg font-semibold text-white">System Events</h3>
          </div>
          <div className="space-y-3">
            {notifications
              .filter((item) => ['SYSTEM', 'SECURITY'].includes(String(item.type || '').toUpperCase()))
              .slice(0, 6)
              .map((item) => (
                <div key={`system-${item.id}`} className="rounded-lg border border-gray-800 bg-sidebar p-4">
                  <p className="text-sm font-semibold text-white">{item.title || item.type}</p>
                  <p className="mt-1 text-sm text-gray-300">{item.message || '-'}</p>
                </div>
              ))}
            {notifications.filter((item) => ['SYSTEM', 'SECURITY'].includes(String(item.type || '').toUpperCase())).length === 0 && (
              <p className="text-sm text-gray-400">System notifications will appear here.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
