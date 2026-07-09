import React, { useEffect, useState } from 'react';
import { superAdminApi } from '../services/api';
import { Search, ScrollText, User, Shield, Activity, Clock } from 'lucide-react';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('');

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    try {
      const data = await superAdminApi.getAuditLogs();
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(
    (log) =>
      (log.actor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.description?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (filterAction === '' || log.action === filterAction)
  );

  if (loading) {
    return <div className="text-gray-400">Loading audit logs...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Audit Logs</h2>
        <p className="text-gray-400">System activity and security logs</p>
      </div>

      <div className="bg-card rounded-xl border border-gray-800 p-4">
        <div className="flex space-x-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-sidebar border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-4 py-2 bg-sidebar border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="LOGIN">Login</option>
            <option value="LOGOUT">Logout</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Actor</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Role</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Action</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Description</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">IP Address</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="py-3 px-4 text-white">{log.actor || '-'}</td>
                  <td className="py-3 px-4">
                    <span className="px-3 py-1 rounded-full text-sm bg-primary/20 text-primary">
                      {log.role || '-'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        log.action === 'CREATE'
                          ? 'bg-success/20 text-success'
                          : log.action === 'UPDATE'
                          ? 'bg-primary/20 text-primary'
                          : log.action === 'DELETE'
                          ? 'bg-danger/20 text-danger'
                          : log.action === 'LOGIN'
                          ? 'bg-accent/20 text-accent'
                          : 'bg-warning/20 text-warning'
                      }`}
                    >
                      {log.action || '-'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-white max-w-xs truncate">{log.description || '-'}</td>
                  <td className="py-3 px-4 text-white font-mono text-sm">{log.ip_address || '-'}</td>
                  <td className="py-3 px-4 text-gray-400">
                    {log.created_at ? new Date(log.created_at).toLocaleString() : '-'}
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

export default AuditLogs;
