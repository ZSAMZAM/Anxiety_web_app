import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { FiCircle, FiCheckCircle, FiTrash2 } from 'react-icons/fi';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const list = await api.getUserNotifications();
      setNotifications(list);
    } catch (e) {
      console.error('Failed to load notifications', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(n => n.map(x => x.id === id ? { ...x, status: 'Read' } : x));
    } catch (e) { console.error(e); }
  };

  const markUnread = async (id) => {
    try {
      await api.markNotificationUnread(id);
      setNotifications(n => n.map(x => x.id === id ? { ...x, status: 'Unread' } : x));
    } catch (e) { console.error(e); }
  };

  const markAll = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(n => n.map(x => ({ ...x, status: 'Read' })));
    } catch (e) { console.error(e); }
  };

  const deleteNotification = async (id) => {
    if (!confirm('Are you sure you want to delete this notification?')) {
      return;
    }
    try {
      await api.deleteNotification(id);
      setNotifications(n => n.filter(x => x.id !== id));
    } catch (e) {
      console.error('Failed to delete notification', e);
    }
  };

  const unreadCount = notifications.filter(n => n.status === 'Unread' || !n.is_read).length;

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Notifications</h2>
          {unreadCount > 0 && (
            <p className="text-sm text-sky-600 mt-1">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={markAll} className="rounded-3xl bg-cyan-600 px-4 py-2 text-white text-sm">Mark all read</button>
        </div>
      </div>

      <div className="space-y-3">
        {loading && <div className="text-sm text-gray-500">Loading...</div>}
        {!loading && notifications.length === 0 && <div className="text-sm text-gray-500">No notifications.</div>}
        {notifications.map(n => (
          <div key={n.id} className={`p-4 rounded-2xl border ${n.status === 'Read' || n.is_read ? 'bg-white border-gray-100' : 'bg-sky-50 border-sky-200'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm text-gray-800">{n.message || n.title}</p>
                <p className="text-xs text-gray-500 mt-1">{new Date(n.created_at).toLocaleString()}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button 
                  onClick={() => deleteNotification(n.id)} 
                  className="text-xs text-red-600 hover:text-red-800"
                  title="Delete notification"
                >
                  <FiTrash2 className="h-4 w-4" />
                </button>
                {n.status === 'Read' || n.is_read ? (
                  <button onClick={() => markUnread(n.id)} className="text-xs text-sky-600">Mark unread</button>
                ) : (
                  <button onClick={() => markRead(n.id)} className="text-xs text-sky-600">Mark read</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
