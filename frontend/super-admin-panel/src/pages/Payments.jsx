import React, { useEffect, useState } from 'react';
import { superAdminApi } from '../services/api';
import {
  Search,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CreditCard,
} from 'lucide-react';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [paymentsData, statsData] = await Promise.all([
        superAdminApi.getPayments(),
        superAdminApi.getPaymentStats(),
      ]);
      setPayments(paymentsData.payments || []);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load payments data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter(
    (payment) =>
      payment.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.doctor_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-gray-400">Loading payments...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Payments</h2>
        <p className="text-gray-400">Transaction history and revenue</p>
      </div>

      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-primary/20">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
          </div>
          <h3 className="text-gray-400 text-sm font-medium mb-1">Today Revenue</h3>
          <p className="text-2xl font-bold text-white">${stats?.todayRevenue || 0}</p>
        </div>

        <div className="bg-card rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-accent/20">
              <TrendingUp className="w-6 h-6 text-accent" />
            </div>
          </div>
          <h3 className="text-gray-400 text-sm font-medium mb-1">Monthly Revenue</h3>
          <p className="text-2xl font-bold text-white">${stats?.monthlyRevenue || 0}</p>
        </div>

        <div className="bg-card rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-success/20">
              <CreditCard className="w-6 h-6 text-success" />
            </div>
          </div>
          <h3 className="text-gray-400 text-sm font-medium mb-1">Total Revenue</h3>
          <p className="text-2xl font-bold text-white">${stats?.totalRevenue || 0}</p>
        </div>

        <div className="bg-card rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-danger/20">
              <AlertCircle className="w-6 h-6 text-danger" />
            </div>
          </div>
          <h3 className="text-gray-400 text-sm font-medium mb-1">Failed Transactions</h3>
          <p className="text-2xl font-bold text-white">{stats?.failedTransactions || 0}</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-gray-800 p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-sidebar border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Transaction ID</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">User</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Doctor</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Amount</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Method</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="py-3 px-4 text-white font-mono text-sm">
                    {payment.transaction_id || '-'}
                  </td>
                  <td className="py-3 px-4 text-white">{payment.user_name || '-'}</td>
                  <td className="py-3 px-4 text-white">{payment.doctor_name || '-'}</td>
                  <td className="py-3 px-4 text-white font-semibold">${payment.amount || 0}</td>
                  <td className="py-3 px-4 text-white">{payment.method || '-'}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        payment.status === 'completed'
                          ? 'bg-success/20 text-success'
                          : payment.status === 'pending'
                          ? 'bg-warning/20 text-warning'
                          : 'bg-danger/20 text-danger'
                      }`}
                    >
                      {payment.status || 'unknown'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-400">
                    {payment.created_at ? new Date(payment.created_at).toLocaleDateString() : '-'}
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

export default Payments;
