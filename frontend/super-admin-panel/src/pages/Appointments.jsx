import React, { useEffect, useState } from 'react';
import { superAdminApi } from '../services/api';
import { Search, Calendar, Clock, User, Stethoscope, Check, X, MoreVertical } from 'lucide-react';

const Appointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const data = await superAdminApi.getAppointments();
      setAppointments(data.appointments || []);
    } catch (error) {
      console.error('Failed to load appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAppointments = appointments.filter(
    (appointment) =>
      appointment.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.doctor_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-gray-400">Loading appointments...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Appointments</h2>
        <p className="text-gray-400">All platform appointments</p>
      </div>

      <div className="bg-card rounded-xl border border-gray-800 p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search appointments..."
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
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Doctor</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Time</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.map((appointment) => (
                <tr key={appointment.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="py-3 px-4 text-white font-mono text-sm">#{appointment.id}</td>
                  <td className="py-3 px-4 text-white">{appointment.user_name || '-'}</td>
                  <td className="py-3 px-4 text-white">{appointment.doctor_name || '-'}</td>
                  <td className="py-3 px-4 text-white">
                    {appointment.appointment_date ? new Date(appointment.appointment_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="py-3 px-4 text-white">{appointment.appointment_time || '-'}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        appointment.status === 'completed'
                          ? 'bg-success/20 text-success'
                          : appointment.status === 'confirmed'
                          ? 'bg-primary/20 text-primary'
                          : appointment.status === 'cancelled'
                          ? 'bg-danger/20 text-danger'
                          : 'bg-warning/20 text-warning'
                      }`}
                    >
                      {appointment.status || 'unknown'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-400">
                    {appointment.created_at ? new Date(appointment.created_at).toLocaleDateString() : '-'}
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

export default Appointments;
