import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes.jsx';
import { useToast } from './context/ToastContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import ConnectionStatus from './components/ConnectionStatus.jsx';

function App() {
  const location = useLocation();
  const toastContext = useToast();
  const toast = toastContext?.toast;

  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason || event);
    };

    const handleWindowError = (event) => {
      console.error('Unhandled error:', event.error || event.message || event);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleWindowError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleWindowError);
    };
  }, []);

  return (
    <div className="min-h-screen bg-sky-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
      <ErrorBoundary>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            <AppRoutes />
          </motion.div>
        </AnimatePresence>
      </ErrorBoundary>
      
      {/* Connection Status Indicator */}
      <ConnectionStatus />

      {/* Toast Notifications */}
      {toast && (
        <div className="fixed right-4 top-4 z-50">
          <div className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
            <p className="text-sm font-semibold text-sky-700 dark:text-sky-300">{toast.title}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
