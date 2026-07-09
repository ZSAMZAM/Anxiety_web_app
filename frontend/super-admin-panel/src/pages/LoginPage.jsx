import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Shield, Lock, User, Sun, Moon } from 'lucide-react';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ username, password });
      navigate('/super-admin/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen dark:bg-slate-900 bg-slate-50 flex items-center justify-center p-4 relative">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-3 rounded-xl dark:bg-slate-800 bg-white dark:border dark:border-slate-700 border-slate-200 dark:text-slate-50 text-slate-900 hover:shadow-soft transition-all duration-300"
      >
        {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <div className="w-full max-w-md">
        <div className="premium-card p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/20 rounded-full mb-6 shadow-glow">
              <Shield className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-4xl font-bold dark:text-slate-50 text-slate-900 mb-3">IT Management Panel</h1>
            <p className="dark:text-slate-400 text-slate-600 text-lg">AnxietyCare System Administration</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-danger/10 border border-danger/30 rounded-xl animate-fade-in">
              <p className="text-danger text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold dark:text-slate-50 text-slate-900 mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 dark:text-slate-400 text-slate-600" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="premium-input pl-12"
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold dark:text-slate-50 text-slate-900 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 dark:text-slate-400 text-slate-600" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="premium-input pl-12"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="premium-button-primary w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="dark:text-slate-400 text-slate-600 text-sm">
              Secure access for IT administrators only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
