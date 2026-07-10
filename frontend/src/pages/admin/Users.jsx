import { useEffect, useMemo, useState } from 'react';
import { FiEdit3, FiTrash2, FiX } from 'react-icons/fi';
import SectionHeader from '../../components/SectionHeader.jsx';
import { api } from '../../services/api.js';

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [userFormData, setUserFormData] = useState({
    name: '',
    username: '',
    phone: '',
    role: 'user',
    status: 'Active',
    password: '',
  });
  const [editingUserId, setEditingUserId] = useState(null);
  const [userErrors, setUserErrors] = useState({});
  const [error, setError] = useState(null);
  const [submittingUser, setSubmittingUser] = useState(false);
  const [confirmUser, setConfirmUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewProfileUser, setViewProfileUser] = useState(null);

  const handleUserReset = () => {
    setUserFormData({
      name: '',
      username: '',
      phone: '',
      role: 'user',
      status: 'Active',
      password: '',
    });
    setUserErrors({});
    setShowForm(false);
    setEditingUserId(null);
  };

  const validateUserForm = () => {
    const nextErrors = {};
    if (!userFormData.name.trim()) nextErrors.name = 'Name is required.';
    if (!userFormData.username.trim()) nextErrors.username = 'Username is required.';
    if (!userFormData.phone.trim()) nextErrors.phone = 'Phone number is required.';
    if (!/^[+0-9\s-]{7,20}$/.test(userFormData.phone.trim())) nextErrors.phone = 'Enter a valid phone number.';
    if (!userFormData.role.trim()) nextErrors.role = 'Role is required.';
    return nextErrors;
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validateUserForm();
    if (Object.keys(nextErrors).length) {
      setUserErrors(nextErrors);
      return;
    }

    setSubmittingUser(true);
    try {
      if (editingUserId) {
        await api.updateAdminUser(editingUserId, userFormData);
      } else {
        await api.createAdminUser(userFormData);
      }
      await loadUsers();
      handleUserReset();
    } catch (error) {
      setUserErrors({ submit: error.response?.data?.error || editingUserId ? 'Failed to update user.' : 'Failed to create user.' });
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleEditUser = (user) => {
    setUserFormData({
      name: user.name || '',
      username: user.username || '',
      phone: user.phone || '',
      role: user.role || 'user',
      status: user.status || 'Active',
      password: '',
    });
    setEditingUserId(user.id);
    setShowForm(true);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setError(null);
    try {
      setLoading(true);
      const data = await api.getAdminUsers({
        page,
        limit: 10,
        search: query,
        status: statusFilter !== 'all' ? statusFilter : '',
        role: roleFilter !== 'all' ? roleFilter : ''
      });
      setUsers(data.users || []);
    } catch (loadError) {
      console.error('Failed to load users:', loadError);
      setUsers([]);

      // Better error messages based on error type
      if (loadError.response?.status === 403) {
        setError('Admin access required. Please ensure you are logged in as an admin.');
      } else if (loadError.message === 'Network Error' || loadError.code === 'ECONNREFUSED') {
        setError('Unable to connect to the backend. Check the configured API URL and try again.');
      } else if (loadError.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
      } else {
        setError(`Error: ${loadError.response?.data?.error || loadError.message || 'Unable to load users.'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, query, statusFilter, roleFilter]);

  const filtered = useMemo(() => {
    return users
      .filter((user) => {
        if (statusFilter !== 'all' && String(user.status || '').toLowerCase() !== statusFilter) return false;
        if (roleFilter !== 'all' && user.role !== roleFilter) return false;
        return Object.values(user)
          .some((value) => String(value).toLowerCase().includes(query.toLowerCase()));
      });
  }, [users, query, statusFilter, roleFilter]);

  const pageSize = 5;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleStatus = async (id) => {
    try {
      const user = users.find((u) => u.id === id);
      if (!user) return;

      const isActive = String(user.status || '').toLowerCase() === 'active';
      const newStatus = isActive ? 'Inactive' : 'Active';
      await api.updateUserStatus(id, newStatus);
      await loadUsers();
    } catch (statusError) {
      console.error('Failed to update user status:', statusError);
      setError('Unable to update user status. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!confirmUser || isDeleting) return;
    setError(null);
    setIsDeleting(true);

    try {
      await api.deleteUser(confirmUser);
      setConfirmUser(null);
      await loadUsers();
    } catch (deleteError) {
      console.error('Failed to delete user:', deleteError);
      setError(deleteError.response?.data?.error || deleteError.message || 'Unable to delete user. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="space-y-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <SectionHeader subtitle="User management" title="View, edit, and manage platform users." />
        </div>
        <div className="rounded-[2rem] border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-xl">
          <div className="mb-6 grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-center">
            <div className="flex flex-col gap-2">
              <p className="text-sm text-gray-500">Manage users by name, phone number, role, status, or registration date.</p>
              <div className="flex flex-wrap gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-3xl border border-gray-200 bg-white/80 px-4 py-3 text-gray-900 outline-none backdrop-blur-sm"
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="rounded-3xl border border-gray-200 bg-white/80 px-4 py-3 text-gray-900 outline-none backdrop-blur-sm"
                >
                  <option value="all">All roles</option>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <input
              type="search"
              placeholder="Search users"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-3xl border border-gray-200 bg-white/80 px-4 py-3 text-gray-900 outline-none backdrop-blur-sm md:max-w-sm"
            />
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex min-h-[220px] items-center justify-center py-16 text-gray-500">
                <div className="text-center">
                  <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-cyan-500"></div>
                  <p className="text-sm font-medium">Loading users...</p>
                </div>
              </div>
            ) : (
              <table className="min-w-full text-left text-sm text-gray-600">
                <thead className="border-b border-gray-200 text-gray-500">
                  <tr>
                    <th className="px-4 py-4">ID</th>
                    <th className="px-4 py-4">Name</th>
                    <th className="px-4 py-4">Phone</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Created Date</th>
                    <th className="px-4 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((user) => (
                    <tr key={user.id} className="border-b border-gray-200 hover:bg-slate-50">
                      <td className="px-4 py-4 font-semibold text-gray-900">{user.id}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700 shadow-sm">
                            {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{user.name}</p>
                            <p className="text-xs text-gray-500">{user.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">{user.phone || '-'}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs uppercase ${user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => toggleStatus(user.id)}
                            className="inline-flex items-center rounded-3xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 transition hover:bg-gray-50 shadow-sm"
                          >
                            {String(user.status || '').toLowerCase() === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                          <button 
                            onClick={() => handleEditUser(user)}
                            className="inline-flex items-center gap-2 rounded-3xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 transition hover:bg-gray-50 shadow-sm"
                          >
                            <FiEdit3 /> Edit
                          </button>
                          <button
                            onClick={() => setViewProfileUser(user)}
                            className="inline-flex items-center gap-2 rounded-3xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 transition hover:bg-gray-50 shadow-sm"
                          >
                            View Profile
                          </button>
                          <button
                            onClick={() => setConfirmUser(user.id)}
                            className="inline-flex items-center gap-2 rounded-3xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 transition hover:bg-red-100"
                          >
                            <FiTrash2 /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!pageItems.length && !error && (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-gray-500">No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
          {error && (
            <div className="mt-4 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
            <p>Showing {pageItems.length} of {filtered.length} users</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="rounded-3xl border border-gray-200 bg-white px-4 py-2 text-gray-700 disabled:cursor-not-allowed disabled:opacity-60 shadow-sm"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((prev) => Math.min(pages, prev + 1))}
                disabled={page === pages}
                className="rounded-3xl border border-gray-200 bg-white px-4 py-2 text-gray-700 disabled:cursor-not-allowed disabled:opacity-60 shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">{editingUserId ? 'Edit User' : 'Add New User'}</h2>
              <button
                type="button"
                onClick={handleUserReset}
                className="rounded-full p-2 text-gray-500 hover:bg-slate-100 hover:text-gray-700"
                aria-label="Close"
              >
                <FiX />
              </button>
            </div>
            <form onSubmit={handleUserSubmit} className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    value={userFormData.name}
                    onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                    className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-gray-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                  {userErrors.name && <p className="mt-1 text-sm text-red-600">{userErrors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <input
                    type="text"
                    value={userFormData.username}
                    onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                    disabled={!!editingUserId}
                    className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-gray-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                  />
                  {userErrors.username && <p className="mt-1 text-sm text-red-600">{userErrors.username}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                  <input
                    type="tel"
                    value={userFormData.phone}
                    onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                    placeholder="0612345167"
                    className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-gray-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                  {userErrors.phone && <p className="mt-1 text-sm text-red-600">{userErrors.phone}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                    disabled={!!editingUserId}
                    className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-gray-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                  >
                    {editingUserId ? (
                      <option value={userFormData.role}>{userFormData.role.charAt(0).toUpperCase() + userFormData.role.slice(1)}</option>
                    ) : (
                      <option value="user">User</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={userFormData.status}
                    onChange={(e) => setUserFormData({ ...userFormData, status: e.target.value })}
                    className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-gray-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password {editingUserId ? '(leave blank to keep current)' : ''}</label>
                  <input
                    type="password"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    placeholder={editingUserId ? 'Optional' : 'Required for new users'}
                    className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-gray-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                </div>
              </div>
              {userErrors.submit && <p className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{userErrors.submit}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submittingUser}
                  className="h-11 flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 px-5 text-sm font-semibold text-white shadow-lg transition hover:from-cyan-600 hover:to-sky-600 disabled:opacity-50"
                >
                  {submittingUser ? 'Saving...' : (editingUserId ? 'Update User' : 'Create User')}
                </button>
                <button
                  type="button"
                  onClick={handleUserReset}
                  className="h-11 rounded-xl border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-xl">
            <h2 className="text-xl font-semibold text-gray-900">Delete user</h2>
            <p className="mt-4 text-gray-600">Are you sure you want to delete this user? This action cannot be undone.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-3xl bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg"
              >
                {isDeleting ? 'Deleting...' : 'Confirm delete'}
              </button>
              <button
                onClick={() => setConfirmUser(null)}
                className="rounded-3xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 shadow-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {viewProfileUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[2rem] border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900">User Profile</h2>
              <button onClick={() => setViewProfileUser(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-white/90 p-4">
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="mt-1 font-semibold text-gray-900">{viewProfileUser.name || 'N/A'}</p>
                </div>
                <div className="rounded-xl bg-white/90 p-4">
                  <p className="text-sm text-gray-500">Username</p>
                  <p className="mt-1 font-semibold text-gray-900">{viewProfileUser.username || 'N/A'}</p>
                </div>
                <div className="rounded-xl bg-white/90 p-4">
                  <p className="text-sm text-gray-500">Phone Number</p>
                  <p className="mt-1 font-semibold text-gray-900">{viewProfileUser.phone || 'N/A'}</p>
                </div>
                <div className="rounded-xl bg-white/90 p-4">
                  <p className="text-sm text-gray-500">Role</p>
                  <p className="mt-1 font-semibold text-gray-900">{viewProfileUser.role || 'N/A'}</p>
                </div>
                <div className="rounded-xl bg-white/90 p-4">
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="mt-1 font-semibold text-gray-900">{viewProfileUser.status || 'N/A'}</p>
                </div>
                <div className="rounded-xl bg-white/90 p-4">
                  <p className="text-sm text-gray-500">Created Date</p>
                  <p className="mt-1 font-semibold text-gray-900">{viewProfileUser.createdAt ? new Date(viewProfileUser.createdAt).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setViewProfileUser(null)}
                  className="rounded-3xl border border-gray-300 bg-white px-6 py-3 text-gray-700 font-semibold transition hover:bg-gray-50 shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>

  );
}

export default AdminUsers;
