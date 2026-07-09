import React, { useState } from 'react';
import { superAdminApi } from '../services/api';
import { Send, Users, Stethoscope, UserCog } from 'lucide-react';

const Notifications = () => {
  const [formData, setFormData] = useState({
    target: 'all',
    title: '',
    message: '',
  });
  const [sending, setSending] = useState(false);

  const handleSendNotification = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const result = await superAdminApi.sendNotification(formData);
      alert(`Notification sent successfully to ${result.sent_count || 0} recipient(s).`);
      setFormData({ target: 'all', title: '', message: '' });
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

      <div className="bg-card rounded-xl border border-gray-800 p-6">
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
    </div>
  );
};

export default Notifications;
