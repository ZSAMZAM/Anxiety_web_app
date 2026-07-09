import React, { useEffect, useState } from 'react';
import { superAdminApi } from '../services/api';
import { Search, Brain, Activity, TrendingUp, AlertTriangle } from 'lucide-react';

const Predictions = () => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadPredictions();
  }, []);

  const loadPredictions = async () => {
    try {
      const data = await superAdminApi.getPredictions();
      setPredictions(data.predictions || []);
    } catch (error) {
      console.error('Failed to load predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPredictions = predictions.filter(
    (prediction) =>
      prediction.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prediction.result?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-gray-400">Loading predictions...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Predictions</h2>
        <p className="text-gray-400">AI anxiety prediction results</p>
      </div>

      <div className="bg-card rounded-xl border border-gray-800 p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search predictions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-sidebar border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">ID</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">User</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Result</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Confidence</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredPredictions.map((prediction) => (
                <tr key={prediction.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="py-3 px-4 text-white font-mono text-sm">#{prediction.id}</td>
                  <td className="py-3 px-4 text-white">{prediction.user_name || '-'}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        prediction.result === 'anxiety'
                          ? 'bg-danger/20 text-danger'
                          : prediction.result === 'depression'
                          ? 'bg-warning/20 text-warning'
                          : 'bg-success/20 text-success'
                      }`}
                    >
                      {prediction.result || 'unknown'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-white">{prediction.confidence || 0}%</td>
                  <td className="py-3 px-4 text-gray-400">
                    {prediction.created_at ? new Date(prediction.created_at).toLocaleDateString() : '-'}
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

export default Predictions;
