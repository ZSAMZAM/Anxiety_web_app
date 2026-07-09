import React, { useEffect, useState } from 'react';
import { superAdminApi } from '../services/api';
import { Search, FileText, Download, Plus, Calendar } from 'lucide-react';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    type: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const data = await superAdminApi.getReports();
      setReports(data.reports || []);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    try {
      await superAdminApi.generateReport(formData);
      setShowGenerateModal(false);
      setFormData({ title: '', type: '', start_date: '', end_date: '' });
      loadReports();
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert(error.message);
    }
  };

  const filteredReports = reports.filter(
    (report) =>
      report.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-gray-400">Loading reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Reports</h2>
          <p className="text-gray-400">System analytics and reports</p>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Generate Report</span>
        </button>
      </div>

      <div className="bg-card rounded-xl border border-gray-800 p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-sidebar border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Title</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Type</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Period</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Generated</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => (
                <tr key={report.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="py-3 px-4 text-white">{report.title || '-'}</td>
                  <td className="py-3 px-4 text-white">{report.type || '-'}</td>
                  <td className="py-3 px-4 text-white">
                    {report.start_date && report.end_date
                      ? `${new Date(report.start_date).toLocaleDateString()} - ${new Date(report.end_date).toLocaleDateString()}`
                      : '-'}
                  </td>
                  <td className="py-3 px-4 text-gray-400">
                    {report.created_at ? new Date(report.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <button className="p-2 hover:bg-primary/20 rounded-lg text-gray-400 hover:text-primary transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 w-full max-w-md border border-gray-800">
            <h3 className="text-xl font-bold text-white mb-4">Generate Report</h3>
            <form onSubmit={handleGenerateReport} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 bg-sidebar border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2 bg-sidebar border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="">Select type</option>
                  <option value="users">Users</option>
                  <option value="appointments">Appointments</option>
                  <option value="payments">Payments</option>
                  <option value="predictions">Predictions</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-4 py-2 bg-sidebar border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">End Date</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-4 py-2 bg-sidebar border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
                >
                  Generate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
