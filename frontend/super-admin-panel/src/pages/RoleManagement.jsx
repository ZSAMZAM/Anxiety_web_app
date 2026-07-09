import React, { useEffect, useState } from 'react';
import { superAdminApi } from '../services/api';
import { ShieldCheck, Save, Check, X } from 'lucide-react';

const RoleManagement = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState(null);
  const [permissions, setPermissions] = useState({});

  const availablePermissions = [
    'view_users',
    'manage_users',
    'view_doctors',
    'manage_doctors',
    'view_admins',
    'manage_admins',
    'view_appointments',
    'manage_appointments',
    'view_payments',
    'manage_payments',
    'view_predictions',
    'view_reports',
    'generate_reports',
    'view_audit_logs',
    'manage_system_settings',
    'manage_backups',
    'send_notifications',
    'view_security',
  ];

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const data = await superAdminApi.getRoles();
      setRoles(data.roles || []);
    } catch (error) {
      console.error('Failed to load roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setPermissions(role.permissions || {});
  };

  const handleTogglePermission = (permission) => {
    setPermissions((prev) => ({
      ...prev,
      [permission]: !prev[permission],
    }));
  };

  const handleSavePermissions = async () => {
    try {
      await superAdminApi.updateRolePermissions(editingRole.id, permissions);
      setEditingRole(null);
      setPermissions({});
      loadRoles();
    } catch (error) {
      console.error('Failed to update role permissions:', error);
      alert(error.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingRole(null);
    setPermissions({});
  };

  if (loading) {
    return <div className="text-gray-400">Loading roles...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Roles & Permissions</h2>
        <p className="text-gray-400">Manage system roles and their permissions</p>
      </div>

      <div className="grid gap-6">
        {roles.map((role) => (
          <div key={role.id} className="bg-card rounded-xl border border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-lg bg-primary/20">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{role.name}</h3>
                  <p className="text-gray-400 text-sm">{role.description || ''}</p>
                </div>
              </div>
              {!editingRole || editingRole.id !== role.id ? (
                <button
                  onClick={() => handleEditRole(role)}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Edit Permissions</span>
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handleSavePermissions}
                    className="flex items-center space-x-2 px-4 py-2 bg-success hover:bg-success/90 text-white rounded-lg transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save</span>
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancel</span>
                  </button>
                </div>
              )}
            </div>

            {editingRole && editingRole.id === role.id && (
              <div className="mt-4 pt-4 border-t border-gray-800">
                <h4 className="text-lg font-semibold text-white mb-4">Permissions</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {availablePermissions.map((permission) => (
                    <label
                      key={permission}
                      className="flex items-center space-x-3 p-3 bg-sidebar rounded-lg cursor-pointer hover:bg-gray-800 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={permissions[permission] || false}
                        onChange={() => handleTogglePermission(permission)}
                        className="w-5 h-5 rounded border-gray-600 text-primary focus:ring-primary focus:ring-offset-0"
                      />
                      <span className="text-white capitalize">
                        {permission.replace(/_/g, ' ')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {!editingRole || editingRole.id !== role.id ? (
              <div className="mt-4 pt-4 border-t border-gray-800">
                <h4 className="text-lg font-semibold text-white mb-3">Current Permissions</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(role.permissions || {}).map(
                    (permission) =>
                      role.permissions[permission] && (
                        <span
                          key={permission}
                          className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm capitalize"
                        >
                          {permission.replace(/_/g, ' ')}
                        </span>
                      )
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoleManagement;
