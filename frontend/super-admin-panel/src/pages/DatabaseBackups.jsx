import React, { useEffect, useState } from 'react';
import { superAdminApi } from '../services/api';
import { Database, Download, Trash2, Plus, HardDrive, Calendar } from 'lucide-react';

const DatabaseBackups = () => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      const data = await superAdminApi.getBackups();
      setBackups(data.backups || []);
    } catch (error) {
      console.error('Failed to load backups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      await superAdminApi.createBackup();
      loadBackups();
    } catch (error) {
      console.error('Failed to create backup:', error);
      alert(error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadBackup = async (backupId) => {
    try {
      const blob = await superAdminApi.downloadBackup(backupId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${backupId}.sql`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download backup:', error);
      alert(error.message);
    }
  };

  const handleDeleteBackup = async (backupId) => {
    if (!window.confirm('Are you sure you want to delete this backup?')) return;
    try {
      await superAdminApi.deleteBackup(backupId);
      loadBackups();
    } catch (error) {
      console.error('Failed to delete backup:', error);
      alert(error.message);
    }
  };

  if (loading) {
    return <div className="text-gray-400">Loading backups...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Database Backups</h2>
          <p className="text-gray-400">Manage database backups</p>
        </div>
        <button
          onClick={handleCreateBackup}
          disabled={creating}
          className="flex items-center space-x-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          <span>{creating ? 'Creating...' : 'Create Backup'}</span>
        </button>
      </div>

      <div className="grid gap-4">
        {backups.length === 0 ? (
          <div className="bg-card rounded-xl border border-gray-800 p-8 text-center">
            <Database className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No backups found</p>
          </div>
        ) : (
          backups.map((backup) => (
            <div key={backup.id} className="bg-card rounded-xl border border-gray-800 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-lg bg-accent/20">
                    <HardDrive className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{backup.name || `Backup #${backup.id}`}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-400 mt-1">
                      <span className="flex items-center space-x-1">
                        <Database className="w-4 h-4" />
                        <span>{backup.size || 'Unknown size'}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{backup.created_at ? new Date(backup.created_at).toLocaleString() : '-'}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDownloadBackup(backup.id)}
                    className="p-2 hover:bg-primary/20 rounded-lg text-gray-400 hover:text-primary transition-colors"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteBackup(backup.id)}
                    className="p-2 hover:bg-danger/20 rounded-lg text-gray-400 hover:text-danger transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DatabaseBackups;
