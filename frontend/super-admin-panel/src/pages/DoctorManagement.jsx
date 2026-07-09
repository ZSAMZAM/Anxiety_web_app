import React, { useEffect, useState } from 'react';
import { superAdminApi } from '../services/api';
import {
  Search,
  Trash2,
  ShieldAlert,
  Check,
  Star,
  Calendar,
  Users as UsersIcon,
  DollarSign,
} from 'lucide-react';

const DoctorManagement = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    try {
      const data = await superAdminApi.getDoctors();
      setDoctors(data.doctors || []);
    } catch (error) {
      console.error('Failed to load doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDoctor = async (doctorId) => {
    if (!window.confirm('Are you sure you want to delete this doctor?')) return;
    try {
      await superAdminApi.deleteDoctor(doctorId);
      loadDoctors();
    } catch (error) {
      console.error('Failed to delete doctor:', error);
      alert(error.message);
    }
  };

  const handleSuspendDoctor = async (doctorId) => {
    try {
      await superAdminApi.suspendDoctor(doctorId);
      loadDoctors();
    } catch (error) {
      console.error('Failed to suspend doctor:', error);
      alert(error.message);
    }
  };

  const handleActivateDoctor = async (doctorId) => {
    try {
      await superAdminApi.activateDoctor(doctorId);
      loadDoctors();
    } catch (error) {
      console.error('Failed to activate doctor:', error);
      alert(error.message);
    }
  };

  const handleApproveDoctor = async (doctorId) => {
    try {
      await superAdminApi.approveDoctor(doctorId);
      loadDoctors();
    } catch (error) {
      console.error('Failed to approve doctor:', error);
      alert(error.message);
    }
  };

  const filteredDoctors = doctors.filter(
    (doctor) =>
      doctor.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-gray-400">Loading doctors...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Doctors</h2>
        <p className="text-gray-400">Manage platform doctors</p>
      </div>

      <div className="bg-card rounded-xl border border-gray-800 p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search doctors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-sidebar border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Avatar</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Full Name</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Specialization</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Rating</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Appointments</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Patients</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Revenue</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDoctors.map((doctor) => (
                <tr key={doctor.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="py-3 px-4">
                    <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
                      <span className="text-accent font-semibold">
                        {doctor.fullname?.charAt(0).toUpperCase() || 'D'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-white">{doctor.fullname || '-'}</td>
                  <td className="py-3 px-4 text-white">{doctor.specialization || '-'}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-warning fill-warning" />
                      <span className="text-white">{doctor.rating || '0.0'}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-white">{doctor.appointments_count || 0}</td>
                  <td className="py-3 px-4 text-white">{doctor.patients_count || 0}</td>
                  <td className="py-3 px-4 text-white">${doctor.revenue || 0}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        doctor.status === 'active'
                          ? 'bg-success/20 text-success'
                          : doctor.status === 'suspended'
                          ? 'bg-warning/20 text-warning'
                          : doctor.status === 'pending'
                          ? 'bg-primary/20 text-primary'
                          : 'bg-danger/20 text-danger'
                      }`}
                    >
                      {doctor.status || 'unknown'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleDeleteDoctor(doctor.id)}
                        className="p-2 hover:bg-danger/20 rounded-lg text-gray-400 hover:text-danger transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {doctor.status === 'pending' && (
                        <button
                          onClick={() => handleApproveDoctor(doctor.id)}
                          className="p-2 hover:bg-success/20 rounded-lg text-gray-400 hover:text-success transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      {doctor.status === 'active' && (
                        <button
                          onClick={() => handleSuspendDoctor(doctor.id)}
                          className="p-2 hover:bg-warning/20 rounded-lg text-gray-400 hover:text-warning transition-colors"
                        >
                          <ShieldAlert className="w-4 h-4" />
                        </button>
                      )}
                      {doctor.status === 'suspended' && (
                        <button
                          onClick={() => handleActivateDoctor(doctor.id)}
                          className="p-2 hover:bg-success/20 rounded-lg text-gray-400 hover:text-success transition-colors"
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

export default DoctorManagement;
