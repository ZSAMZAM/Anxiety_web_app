import { useEffect, useState } from 'react';
import SectionHeader from '../../components/SectionHeader.jsx';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { FiDownload, FiPrinter } from 'react-icons/fi';

function History() {
  const [predictions, setPredictions] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [query, setQuery] = useState('');
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState('');
  const { user } = useAuth();

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // Create a simple text report for download
    const reportText = `
ANXIETYCARE - USER REPORT
Generated: ${new Date().toLocaleDateString()}

=== PREDICTION HISTORY ===
${predictions.map(p => `Date: ${p.date}\nLevel: ${p.anxietyLevel}\nConfidence: ${p.confidence}%\nSummary: ${p.summary}\n`).join('\n')}

=== APPOINTMENT HISTORY ===
${appointments.map(a => `Date: ${a.appointment_date}\nDoctor: ${a.doctor_name}\nStatus: ${a.status}\nNotes: ${a.notes || 'N/A'}\n`).join('\n')}

=== PAYMENT HISTORY ===
${payments.map(p => `Date: ${p.createdAt || p.date}\nDescription: ${p.description}\nAmount: ${p.amount}\nStatus: ${p.status}\n`).join('\n')}
    `;

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `anxietycare-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    api.getPredictionHistory().then(setPredictions);
    if (user?.id) {
      setAppointmentsLoading(true);
      setAppointmentsError('');
      api.getUserAppointments(user.id)
        .then(setAppointments)
        .catch((error) => setAppointmentsError(error?.message || 'Unable to load appointment history.'))
        .finally(() => setAppointmentsLoading(false));
      api.getPayments(user.id).then(setPayments);
    }
  }, [user]);

  const filterRecords = (items) => items.filter((item) => Object.values(item).some((value) => String(value).toLowerCase().includes(query.toLowerCase())));

  return (
      <div className="space-y-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <SectionHeader subtitle="History" title="Review your predictions, bookings, and payments." />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="search"
              placeholder="Search history"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white/80 px-4 py-3 text-gray-900 outline-none shadow-sm backdrop-blur-sm"
            />
            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-2 rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-sky-600 shadow-lg"
            >
              <FiDownload className="h-4 w-4" /> Download Report
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-3xl border border-gray-200 bg-white/80 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 shadow-sm backdrop-blur-sm"
            >
              <FiPrinter className="h-4 w-4" /> Print
            </button>
          </div>
        </div>
        <section className="space-y-6 rounded-[2rem] border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-xl">
          <h3 className="text-lg font-semibold text-gray-900">Prediction history</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-gray-600">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">Summary</th>
                </tr>
              </thead>
              <tbody>
                {filterRecords(predictions).map((item) => (
                  <tr key={item.id} className="border-b border-gray-200 hover:bg-slate-50">
                    <td className="px-4 py-4">{item.date}</td>
                    <td className="px-4 py-4">{item.anxietyLevel}</td>
                    <td className="px-4 py-4">{item.confidence}%</td>
                    <td className="px-4 py-4">{item.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        
        {/* Anxiety Trends */}
        <section className="rounded-[2rem] border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-xl">
          <h3 className="text-lg font-semibold text-gray-900">Anxiety trends</h3>
          <div className="mt-5 space-y-4">
            {predictions.length > 0 ? (
              <div className="space-y-3">
                {predictions.slice(0, 10).map((prediction, index) => {
                  const level = prediction.anxietyLevel?.toLowerCase() || 'neutral';
                  const levelColors = {
                    'anxiety': 'bg-red-500',
                    'depression': 'bg-orange-500',
                    'neutral': 'bg-green-500',
                  };
                  const barColor = levelColors[level] || 'bg-gray-500';
                  const barWidth = Math.min(prediction.confidence || 50, 100);
                  
                  return (
                    <div key={prediction.id || index} className="flex items-center gap-4">
                      <div className="w-24 text-xs text-gray-600">{prediction.date}</div>
                      <div className="flex-1 h-6 rounded-full bg-gray-200 overflow-hidden">
                        <div 
                          className={`h-full ${barColor} transition-all duration-300`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <div className="w-20 text-xs font-semibold text-gray-700">{prediction.anxietyLevel}</div>
                      <div className="w-16 text-xs text-gray-500">{prediction.confidence}%</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-600">No prediction data available for trends.</p>
            )}
          </div>
        </section>

        {/* Recommendations */}
        <section className="rounded-[2rem] border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-xl">
          <h3 className="text-lg font-semibold text-gray-900">Recommendations</h3>
          <div className="mt-5 space-y-4">
            {predictions.length > 0 ? (
              <div className="space-y-3">
                {predictions.slice(0, 5).map((prediction, index) => (
                  <div key={prediction.id || index} className="rounded-3xl bg-white/80 p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{prediction.anxietyLevel}</p>
                        <p className="text-xs text-gray-500">{prediction.date}</p>
                      </div>
                      <div className="text-xs text-gray-600">
                        {prediction.summary}
                      </div>
                    </div>
                    {prediction.recommendedActions && prediction.recommendedActions.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {prediction.recommendedActions.slice(0, 3).map((action, actionIndex) => (
                          <div key={actionIndex} className="rounded-2xl bg-sky-50 p-3 text-xs text-sky-800 dark:bg-sky-950/30 dark:text-sky-300">
                            • {action}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No recommendations available.</p>
            )}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-[2rem] border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-xl">
            <h3 className="text-lg font-semibold text-gray-900">Booking history</h3>
            <div className="mt-5 overflow-x-auto">
            {appointmentsLoading ? (
              <p className="text-gray-600">Loading appointment history...</p>
            ) : appointmentsError ? (
              <p className="text-red-600">{appointmentsError}</p>
            ) : filterRecords(appointments).length === 0 ? (
              <div className="rounded-3xl border border-gray-200 bg-white/80 p-8 text-gray-600 shadow-sm">No booking history found.</div>
            ) : (
              <table className="min-w-full text-left text-sm text-gray-600">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="px-4 py-3">Appointment Date</th>
                    <th className="px-4 py-3">Doctor</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created On</th>
                    <th className="px-4 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filterRecords(appointments).map((appointment) => (
                    <tr key={appointment.id} className="border-b border-gray-200 hover:bg-slate-50">
                      <td className="px-4 py-4">{appointment.appointment_date}</td>
                      <td className="px-4 py-4">{appointment.doctor_name}</td>
                      <td className="px-4 py-4">{appointment.status}</td>
                      <td className="px-4 py-4">{appointment.created_at || '—'}</td>
                      <td className="px-4 py-4">{appointment.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          </div>
          <div className="rounded-[2rem] border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-xl">
            <h3 className="text-lg font-semibold text-gray-900">Payment history</h3>
            <div className="mt-5 space-y-4">
              {filterRecords(payments).map((payment) => (
                <div key={payment.id} className="rounded-3xl bg-white/80 p-4 text-gray-600 shadow-sm">
                  <p className="font-semibold text-gray-900">{payment.description}</p>
                  <p>{payment.createdAt || payment.date}</p>
                  <p className="mt-2 text-sm text-gray-500">Amount: {payment.amount} • {payment.status}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
  );
}

export default History;
