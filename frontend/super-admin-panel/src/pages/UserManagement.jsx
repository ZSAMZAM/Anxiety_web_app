import React, { useEffect, useState } from 'react';
import { superAdminApi } from '../services/api';
import {
  Search,
  Download,
  Trash2,
  ShieldAlert,
  Check,
  MoreVertical,
} from 'lucide-react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await superAdminApi.getUsers();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await superAdminApi.deleteUser(userId);
      loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert(error.message);
    }
  };

  const handleSuspendUser = async (userId) => {
    try {
      await superAdminApi.updateUserStatus(userId, 'suspended');
      loadUsers();
    } catch (error) {
      console.error('Failed to suspend user:', error);
      alert(error.message);
    }
  };

  const handleActivateUser = async (userId) => {
    try {
      await superAdminApi.updateUserStatus(userId, 'active');
      loadUsers();
    } catch (error) {
      console.error('Failed to activate user:', error);
      alert(error.message);
    }
  };

  const handleExportUsers = async () => {
    try {
      const blob = await superAdminApi.exportUsers();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'users_export.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export users:', error);
      alert(error.message);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-slate-600 dark:text-slate-400">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-2">Users</h2>
          <p className="text-slate-500 dark:text-slate-400">Manage platform users</p>
        </div>
        <button
          onClick={handleExportUsers}
          className="flex items-center space-x-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors"
        >
          <Download className="w-5 h-5" />
          <span>Export Users</span>
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-slate-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50 dark:placeholder-slate-400"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Avatar</th>
                <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Full Name</th>
                <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Username</th>
                <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Email</th>
                <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Phone</th>
                <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Status</th>
                <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Joined Date</th>
                <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50">
                  <td className="py-3 px-4">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                      <span className="text-primary font-semibold">
                        {user.fullname?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-900 dark:text-slate-50">{user.fullname || '-'}</td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-200">{user.username || '-'}</td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-200">{user.email || '-'}</td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-200">{user.phone || '-'}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        user.status === 'active'
                          ? 'bg-success/20 text-success'
                          : user.status === 'suspended'
                          ? 'bg-warning/20 text-warning'
                          : 'bg-danger/20 text-danger'
                      }`}
                    >
                      {user.status || 'unknown'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 hover:bg-danger/20 rounded-lg text-slate-500 hover:text-danger transition-colors dark:text-slate-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {user.status === 'active' ? (
                        <button
                          onClick={() => handleSuspendUser(user.id)}
                          className="p-2 hover:bg-warning/20 rounded-lg text-slate-500 hover:text-warning transition-colors dark:text-slate-400"
                        >
                          <ShieldAlert className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivateUser(user.id)}
                          className="p-2 hover:bg-success/20 rounded-lg text-slate-500 hover:text-success transition-colors dark:text-slate-400"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
