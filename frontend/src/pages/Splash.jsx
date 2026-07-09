import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function Splash() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  const float = {
    animate: {
      y: [0, -18, 0],
      rotate: [0, 6, -6, 0],
      transition: { duration: 8, repeat: Infinity, ease: "easeInOut" },
    },
  };

  const pulse = {
    animate: {
      scale: [1, 1.03, 1],
      opacity: [0.9, 1, 0.9],
      transition: { duration: 2.6, repeat: Infinity, ease: "easeInOut" },
    },
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-gradient-to-br from-[#04142e] via-[#042a52] to-[#05f6ff]">
      {/* Animated SVG background shapes */}
      <motion.svg
        variants={float}
        initial="animate"
        animate="animate"
        className="pointer-events-none absolute -left-48 -top-24 w-96 h-96 md:w-[540px] md:h-[540px] opacity-30 blur-2xl mix-blend-screen"
        viewBox="0 0 600 600"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <linearGradient id="g1" x1="0" x2="1">
            <stop offset="0%" stopColor="#06c7ff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#042a52" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <g fill="url(#g1)">
          <path d="M421.6,342.9Q397,435,309,453.1Q221,471.2,145.9,422.6Q70.8,374,58.7,286.8Q46.6,199.6,118.6,136.8Q190.6,74,278.7,69.3Q366.7,64.6,432.4,133Q498,201.4,421.6,342.9Z" />
        </g>
      </motion.svg>

      <motion.svg
        variants={pulse}
        initial="animate"
        animate="animate"
        className="pointer-events-none absolute right-[-6rem] top-20 w-72 h-72 md:w-[420px] md:h-[420px] opacity-20 mix-blend-overlay blur-xl"
        viewBox="0 0 600 600"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <radialGradient id="g2" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#06c7ff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#042a52" stopOpacity="0.05" />
          </radialGradient>
        </defs>
        <circle cx="300" cy="300" r="200" fill="url(#g2)" />
      </motion.svg>

      <motion.svg
        variants={{ animate: { rotate: [0, 360], transition: { duration: 40, repeat: Infinity, ease: "linear" } } }}
        initial="animate"
        animate="animate"
        className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 w-80 h-80 opacity-10 blur-3xl"
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <linearGradient id="g3" x1="0" x2="1">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <g fill="none" stroke="url(#g3)" strokeWidth="6">
          <circle cx="100" cy="100" r="64" strokeOpacity="0.12" />
          <circle cx="100" cy="100" r="44" strokeOpacity="0.08" />
        </g>
      </motion.svg>

      <div className="relative z-20 min-h-screen flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-5xl">
          <AnimatePresence>
            {loading ? (
              <motion.div
                key="loader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-6 py-24"
              >
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-400 shadow-[0_30px_80px_rgba(5,246,255,0.16)] flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.6, ease: "linear" }}
                    className="w-20 h-20 rounded-full bg-white/6 backdrop-blur flex items-center justify-center"
                  >
                    <svg className="w-10 h-10 text-white/95" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2v20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      <path d="M2 12h20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </motion.div>
                </div>

                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                  <p className="text-sm text-slate-200/80">Preparing your secure workspace…</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="bg-white/6 backdrop-blur-md border border-white/8 rounded-3xl shadow-2xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8"
              >
                <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
                  <div className="relative">
                    <div className="rounded-full p-1 md:p-2 bg-gradient-to-br from-indigo-500 to-cyan-400 shadow-[0_30px_80px_rgba(5,246,255,0.18)]">
                      <div className="rounded-full w-44 h-44 md:w-56 md:h-56 bg-gradient-to-br from-[#0b2948] via-[#043a66] to-[#06c7ff] flex items-center justify-center shadow-[0_20px_60px_rgba(3,102,214,0.22)]">
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-white/6 backdrop-blur-md flex items-center justify-center">
                          <svg viewBox="0 0 64 64" className="w-14 h-14 md:w-18 md:h-18 text-white/95" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                            <rect x="12" y="10" width="40" height="44" rx="8" stroke="currentColor" strokeWidth="2" />
                            <path d="M20 28h24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M32 20v24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <circle cx="44" cy="18" r="2.5" fill="currentColor" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="absolute -inset-6 rounded-full opacity-30 blur-3xl bg-cyan-400/20 pointer-events-none" />
                  </div>

                  <h1 className="mt-6 text-3xl md:text-5xl font-extrabold leading-tight text-white tracking-tight">Anxiety Prediction</h1>
                  <p className="mt-3 max-w-xl text-sm md:text-lg text-slate-200/85">AI-powered mental wellness support</p>

                  <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate("/login")}
                      className="px-6 py-3 rounded-lg bg-white/10 backdrop-blur-sm border border-white/8 text-white hover:bg-white/14 transition-shadow shadow-md hover:shadow-xl flex items-center gap-3"
                      aria-label="Login"
                    >
                      <svg className="w-4 h-4 text-white/95" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                        <path d="M15 3h6v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M10 14L21 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M21 21H3V3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="font-medium">Login</span>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate("/login")}
                      className="px-6 py-3 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 text-slate-900 font-semibold shadow-lg hover:brightness-105 transition"
                      aria-label="Open web login"
                    >
                      Web Login
                    </motion.button>
                  </div>
                </div>

                <div className="flex-1 flex items-center justify-center md:justify-end">
                  <div className="w-full max-w-sm p-5 rounded-xl bg-white/4 backdrop-blur-sm border border-white/6 shadow-lg">
                    <h3 className="text-white font-semibold text-lg">Premium clinical grade</h3>
                    <p className="mt-2 text-sm text-slate-200/80">Designed for clinicians and patients — secure, explainable, and fast.</p>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-white/6 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-white/8 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white/95" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                            <path d="M5 11h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                            <path d="M12 22v-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">Fast Insights</div>
                          <div className="text-xs text-slate-200/70"><span>Latency-optimized</span></div>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-white/6 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-white/8 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white/95" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 3c4.97 0 9 4.03 9 9s-4.03 9-9 9-9-4.03-9-9 4.03-9 9-9z" stroke="currentColor" strokeWidth="1.4" />
                            <path d="M12 8v5l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">Explainable</div>
                          <div className="text-xs text-slate-200/70"><span>Transparent scores</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
    </div>
  );
}

/* Notes:
 - This file uses Tailwind utility classes heavily. If you want a small helper for the subtle glow effect, add to your global CSS:
   .shadow-glow { box-shadow: 0 20px 50px rgba(3,102,214,0.22); }
 - Ensure `framer-motion` and `react-router-dom` are installed in your project:
     npm install framer-motion react-router-dom
 - Paste this file to [frontend/src/pages/Splash.jsx](frontend/src/pages/Splash.jsx) and import it into your routes.
*/
