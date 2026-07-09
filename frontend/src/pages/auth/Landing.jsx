import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiShield, FiTrendingUp, FiHeart, FiUsers } from 'react-icons/fi';

function Landing() {
  return (
    <div className="min-h-screen bg-hero-gradient bg-cover bg-center px-6 py-12 text-slate-900 dark:text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-16 lg:flex-row lg:items-center lg:justify-between">
        <motion.section
          initial={{ opacity: 0, x: -32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          <span className="inline-flex rounded-full bg-brand-500/15 px-4 py-2 text-sm font-semibold text-brand-200">
            Deep Learning for mental wellness
          </span>
          <div className="space-y-5">
            <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-white sm:text-6xl">
              Anxiety Prediction System with a modern medical dashboard.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">
              Analyze emotional patterns, compare mental health predictions, and schedule expert care through a polished medical experience.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link to="/login" className="inline-flex items-center justify-center rounded-3xl bg-brand-500 px-7 py-4 text-base font-semibold text-white shadow-glass transition hover:bg-brand-400">
              Admin login
            </Link>
            <Link to="/login" className="inline-flex items-center justify-center rounded-3xl border border-white/10 bg-white/5 px-7 py-4 text-base font-semibold text-slate-100 transition hover:bg-white/10">
              Doctor login
            </Link>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="relative w-full max-w-2xl rounded-[2.5rem] border border-white/10 bg-white/90 p-8 shadow-glass backdrop-blur-xl transition-colors duration-200 dark:bg-slate-950/80"
        >
          <div className="mb-8 grid gap-6 sm:grid-cols-2">
            {[
              { icon: FiShield, title: 'Safe & private' },
              { icon: FiTrendingUp, title: 'Accurate insights' },
              { icon: FiHeart, title: 'Trusted care' },
              { icon: FiUsers, title: '24/7 support' },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="rounded-3xl bg-white/80 p-5 transition-colors duration-200 dark:bg-slate-900/80">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-brand-500/10 text-brand-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{feature.title}</p>
                </div>
              );
            })}
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-white/90 p-6 transition-colors duration-200 dark:bg-slate-900/90">
            <p className="text-sm uppercase tracking-[0.3em] text-sky-600 dark:text-sky-300">About system</p>
            <h2 className="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">Predict anxiety trends and personalize care plans.</h2>
            <p className="mt-3 text-slate-700 dark:text-slate-300">
              The platform combines deep learning with patient-centric dashboards so both users and administrators can manage mental health journeys clearly.
            </p>
            <div className="mt-6 space-y-4 text-sm text-slate-400">
              <p>• Adaptive prediction analysis with confidence scoring.</p>
              <p>• Doctor booking, payment flow, and history tracking.</p>
              <p>• Admin controls for user management, appointments, and reports.</p>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}

export default Landing;
