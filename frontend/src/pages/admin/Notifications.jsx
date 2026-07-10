import { useEffect, useMemo, useState } from 'react';
import { FiSend, FiBell, FiMail, FiMessageSquare, FiInfo, FiDownload, FiPlus, FiAlertCircle, FiTrash2 } from 'react-icons/fi';
import SectionHeader from '../../components/SectionHeader.jsx';
import { api } from '../../services/api.js';

function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState(false);
  const [filters, setFilters] = useState({
    type: 'all',
    read: 'all',
    page: 1,
    limit: 10
  });
  const [formData, setFormData] = useState({
    message: '',
    type: 'general',
    recipientType: 'all',
    user_ids: []
  });
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadNotifications();
    const intervalId = window.setInterval(() => loadNotifications({ silent: true }), 30000);
    const onFocus = () => loadNotifications({ silent: true });
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, [filters]);

  const loadNotifications = async ({ silent = false } = {}) => {
    try {
      setLoadError('');
      if (!silent) setLoading(true);
      const data = await api.getAdminNotifications(filters);
      setNotifications(data.notifications || []);
      if (data.error) {
        setLoadError(data.error);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setLoadError(error?.message || 'Unable to load notifications.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!formData.message.trim()) {
      setErrors({ message: 'Message is required.' });
      return;
    }

    try {
      setSending(true);
      setErrors({});
      setSuccessMessage('');
      const result = await api.sendNotification(formData);
      setShowForm(false);
      setFormData({ message: '', type: 'general', recipientType: 'all', user_ids: [] });
      await loadNotifications(); // Refresh the list

      const sentCount = result?.sent_count ?? 0;
      const typeLabel = formData.recipientType === 'doctors'
        ? sentCount === 1 ? 'doctor' : 'doctors'
        : formData.recipientType === 'users'
          ? sentCount === 1 ? 'user' : 'users'
          : 'all users';

      setSuccessMessage(
        formData.recipientType === 'all'
          ? `Notification sent to all users`
          : `Notification sent to ${sentCount} ${typeLabel}`
      );
    } catch (error) {
      console.error('Failed to send notification:', error);
      setErrors({ submit: 'Failed to send notification. Please try again.' });
    } finally {
      setSending(false);
    }
  };

  const handleDeleteNotification = async () => {
    if (!confirmDelete) return;

    try {
      setDeleting(true);
      await api.deleteAdminNotification(confirmDelete);
      setNotifications(prev => prev.filter(n => n.id !== confirmDelete));
      setConfirmDelete(null);
    } catch (error) {
      console.error('Failed to delete notification:', error);
      setErrors({ submit: 'Failed to delete notification. Please try again.' });
    } finally {
      setDeleting(false);
    }
  };

  const exportData = () => {
    const csvContent = [
      ['ID', 'Recipient', 'Message', 'Type', 'Status', 'Date'],
      ...notifications.map(n => [
        n.id,
        n.recipient || n.user_phone || 'All Users',
        `"${n.message?.replace(/"/g, '""')}"`,
        n.type || 'general',
        n.status || 'Unread',
        n.created_at ? new Date(n.created_at).toLocaleDateString() : ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notifications.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'info': return 'bg-blue-100 text-blue-800';
      case 'alert': return 'bg-red-100 text-red-800';
      case 'general':
      default:
        return 'bg-sky-100 text-sky-800';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'info': return <FiInfo className="w-4 h-4" />;
      case 'alert': return <FiAlertCircle className="w-4 h-4" />;
      case 'general':
      default:
        return <FiMessageSquare className="w-4 h-4" />;
    }
  };

  const unreadCount = notifications.filter((n) => String(n.status).toLowerCase() !== 'read').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-slate-400">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <SectionHeader subtitle="Notification management" title="Send announcements and manage communication." />

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[2rem] border border-gray-200 bg-white/40 p-6 shadow-xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/40">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-950">
              <FiBell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">Total Sent</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-slate-100">{notifications.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-gray-200 bg-white/40 p-6 shadow-xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/40">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-red-100 dark:bg-red-950">
              <FiMail className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">Unread</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-slate-100">{unreadCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-gray-200 bg-white/40 p-6 shadow-xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/40">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-950">
              <FiMessageSquare className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">Announcements</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-slate-100">{notifications.filter((n) => n.type === 'general').length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-sky-100">
              <FiSend className="w-6 h-6 text-sky-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Send Rate</p>
              <p className="text-2xl font-semibold text-gray-900">
                {notifications.length > 0 ? Math.round(((notifications.length - unreadCount) / notifications.length) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Send Notification Form */}
      <div className="rounded-[2rem] border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-sky-600">Send notification</p>
            <h2 className="mt-3 text-2xl font-semibold text-gray-900">Broadcast to users</h2>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-sky-600 shadow-lg"
          >
            <FiPlus /> {showForm ? 'Cancel' : 'Send Notification'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSendNotification} className="space-y-4">
            {successMessage && (
              <div className="rounded-3xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                {successMessage}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Type</label>
              <select
                value={formData.recipientType}
                onChange={(e) => setFormData({ ...formData, recipientType: e.target.value })}
                className="w-full rounded-3xl border border-gray-200 bg-white/80 px-4 py-3 text-gray-900 outline-none backdrop-blur-sm"
              >
                <option value="all">All</option>
                <option value="users">Users</option>
                <option value="doctors">Doctors</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Enter your notification message..."
                className="w-full rounded-3xl border border-gray-200 bg-white/80 px-4 py-3 text-gray-900 outline-none backdrop-blur-sm resize-none"
                rows={4}
                required
              />
              {errors.message && (
                <p className="mt-1 text-sm text-red-600">{errors.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="rounded-3xl border border-gray-200 bg-white/80 px-4 py-3 text-gray-900 outline-none backdrop-blur-sm"
              >
                <option value="general">General</option>
                <option value="info">Info</option>
                <option value="alert">Alert</option>
              </select>
            </div>

            <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-xl">
              <p><strong>Note:</strong> Use the recipient type selector to target all users, only users, or only doctors. Choose General, Info, or Alert for the notification category.</p>
            </div>

            {errors.submit && (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {errors.submit}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={sending}
                className="flex-1 rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-sky-600 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg"
              >
                {sending ? 'Sending...' : 'Send Notification'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({ message: '', type: 'general', recipientType: 'all', user_ids: [] });
                  setErrors({});
                }}
                className="rounded-3xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 shadow-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Notifications Table */}
      <div className="rounded-[2rem] border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-xl">
        {loadError && (
          <div className="mb-4 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {loadError}
          </div>
        )}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-sky-600">Notification history</p>
            <h2 className="mt-3 text-2xl font-semibold text-gray-900">All sent notifications</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="rounded-3xl border border-gray-200 bg-white/80 px-4 py-3 text-gray-900 outline-none backdrop-blur-sm"
            >
              <option value="all">All Types</option>
              <option value="general">General</option>
              <option value="info">Info</option>
              <option value="alert">Alert</option>
            </select>
            <select
              value={filters.read}
              onChange={(e) => handleFilterChange('read', e.target.value)}
              className="rounded-3xl border border-gray-200 bg-white/80 px-4 py-3 text-gray-900 outline-none backdrop-blur-sm"
            >
              <option value="all">All Status</option>
              <option value="read">Read</option>
              <option value="unread">Unread</option>
            </select>
            <button
              onClick={exportData}
              className="inline-flex items-center gap-2 rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-sky-600 shadow-lg"
            >
              <FiDownload /> Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-gray-600">
            <thead className="border-b border-gray-200 text-gray-500">
              <tr>
                <th className="px-4 py-4">Recipient</th>
                <th className="px-4 py-4">Message</th>
                <th className="px-4 py-4">Type</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Date Sent</th>
                <th className="px-4 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((notification) => (
                <tr key={notification.id} className="border-b border-gray-200 hover:bg-slate-50">
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-semibold text-gray-900">{notification.recipient || notification.user_name || 'All Users'}</p>
                      <p className="text-xs text-gray-500">{notification.user_phone || 'Broadcast'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 max-w-xs">
                    <p className="text-gray-900 line-clamp-2">{notification.message}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs uppercase ${getTypeColor(notification.type)}`}>
                      {getTypeIcon(notification.type)}
                      {notification.type || 'general'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs uppercase ${
                      String(notification.status).toLowerCase() === 'read' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {notification.status || 'Unread'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {notification.created_at ? new Date(notification.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => setConfirmDelete(notification.id)}
                      className="inline-flex items-center gap-2 rounded-3xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 transition hover:bg-red-100"
                    >
                      <FiTrash2 /> Delete
                    </button>
                  </td>
                </tr>
              ))}
              {notifications.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                    No notifications found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-xl">
            <h2 className="text-xl font-semibold text-gray-900">Delete notification</h2>
            <p className="mt-4 text-gray-600">Are you sure you want to delete this notification? This action cannot be undone.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={handleDeleteNotification}
                disabled={deleting}
                className="rounded-3xl bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg"
              >
                {deleting ? 'Deleting...' : 'Confirm delete'}
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
    </div>
  );
}

export default AdminNotifications;
