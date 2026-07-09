import { useEffect, useState, useRef } from 'react';
import { FiBell } from 'react-icons/fi';
import { api } from '../services/api.js';
import { Link } from 'react-router-dom';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      try {
        const list = await api.getUserNotifications();
        if (mounted) setNotifications(list);
      } catch (e) {
        console.error('Unable to load notifications', e);
      }
    };
    fetch();

    const t = setInterval(fetch, 30 * 1000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const unreadCount = notifications.filter(n => (n.status || 'Unread') !== 'Read').length;
  const latest = notifications.slice(0, 5);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(s => !s)} className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
        <FiBell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-5 w-5 rounded-full bg-rose-500 text-xs text-white">{unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-sm rounded-2xl bg-white shadow-lg border border-slate-100 z-50 dark:bg-slate-950 dark:border-slate-800">
          <div className="p-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifications</h4>
              <Link to="/user/notifications" className="text-xs text-sky-600">View all</Link>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {latest.length === 0 && <div className="p-4 text-sm text-slate-500 dark:text-slate-400">No notifications</div>}
            {latest.map(n => (
              <div key={n.id} className={`p-3 border-b border-slate-50 dark:border-slate-800 ${n.status === 'Read' ? 'bg-slate-50 dark:bg-slate-900/80' : 'bg-white dark:bg-slate-950'}`}>
                <p className="text-sm text-slate-800 dark:text-slate-100">{n.message}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
