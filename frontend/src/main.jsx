import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { LandingThemeProvider } from './contexts/LandingThemeContext.jsx';

// Global error handlers to surface uncaught errors in DevTools
// and avoid silent white screens during development/production.
window.addEventListener('error', (event) => {
  try {
    // event.error may be undefined for some script errors
    console.error('[Global error] ', event.error || event.message || event, event);
    // persist a short copy for debugging across reloads
    try { localStorage.setItem('frontend-last-error', JSON.stringify({ message: String(event.message || event.error || ''), time: Date.now() })); } catch {};
  } catch (e) {
    // swallow to avoid secondary errors
    console.error('Error in global error handler', e);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  try {
    console.error('[Unhandled promise rejection] ', event.reason);
    try { localStorage.setItem('frontend-last-unhandled-rejection', JSON.stringify({ reason: String(event.reason || ''), time: Date.now() })); } catch {};
  } catch (e) {
    console.error('Error in unhandledrejection handler', e);
  }
});
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LandingThemeProvider>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </LandingThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
