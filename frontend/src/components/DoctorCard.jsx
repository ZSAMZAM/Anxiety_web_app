import { FiStar } from 'react-icons/fi';

function DoctorCard({ doctor, onBook, actionLabel = 'Book Appointment' }) {
  return (
    <div className="rounded-[2rem] border border-slate-200/70 bg-white p-6 shadow-xl backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-2xl dark:border-slate-700 dark:bg-slate-900/80">
      <div className="flex items-center gap-4">
        <img
          src={doctor.photo || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80'}
          alt={doctor.name}
          className="h-16 w-16 rounded-3xl object-cover shadow-lg"
        />
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{doctor.name}</h3>
            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${((doctor.status||'').toString().toUpperCase() === 'ACTIVE') ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
              {((doctor.status||'').toString().toUpperCase() === 'ACTIVE') ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{doctor.specialization}</p>
        </div>
      </div>
      <div className="mt-5 space-y-2 text-sm text-slate-600 dark:text-slate-300">
        <p><span className="font-semibold text-slate-900 dark:text-slate-100">Experience:</span> {doctor.experience || 'N/A'}</p>
        <p><span className="font-semibold text-slate-900 dark:text-slate-100">Consultation fee:</span> ${doctor.fee?.toFixed(2) ?? '5.00'}</p>
        <p className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:bg-slate-800 dark:text-sky-300">
          <FiStar className="h-4 w-4" /> {doctor.rating?.toFixed(1) ?? '0.0'}
        </p>
        <p><span className="font-semibold text-slate-900 dark:text-slate-100">Availability:</span> {doctor.availability_schedule ? 'Available' : 'Contact for availability'}</p>
      </div>
      <button
        type="button"
        onClick={onBook}
        className="mt-6 w-full rounded-3xl bg-gradient-to-r from-sky-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-white transition hover:from-sky-600 hover:to-cyan-500 shadow-lg"
      >
        {actionLabel}
      </button>
    </div>
  );
}

export default DoctorCard;
