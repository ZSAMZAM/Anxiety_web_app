import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import { Shield, Lock, User, Sun, Moon, Eye, EyeOff } from 'lucide-react';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const { t } = useLanguage();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ username, password });
      navigate('/super-admin/dashboard');
    } catch (err) {
      setError(err.message || `${t('signIn')} failed. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#F8FAFC] p-4 text-[#0F172A] dark:bg-slate-900 dark:text-slate-50">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute right-6 top-6 rounded-2xl border border-[#D6E4F0] bg-white p-3 text-[#0F172A] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#93C5FD] hover:text-[#2563EB] hover:shadow-soft dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
      >
        {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
      <div className="absolute top-6 left-6">
        <LanguageSelector />
      </div>

      <div className="w-full max-w-md">
        <div className="premium-card rounded-[24px] p-10 shadow-[0_28px_80px_-48px_rgba(15,23,42,.45)]">
          <div className="text-center mb-8">
            <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-[#EFF6FF] shadow-[0_18px_46px_-32px_rgba(37,99,235,.7)]">
              <Shield className="h-10 w-10 text-[#2563EB]" />
            </div>
            <h1 className="mb-3 text-[38px] font-bold leading-[1.1] tracking-normal text-[#0F172A] dark:text-slate-50">{t('itManagementPanel')}</h1>
            <p className="text-lg font-normal leading-7 text-[#64748B] dark:text-slate-400">{t('systemAdministration')}</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-danger/10 border border-danger/30 rounded-xl animate-fade-in">
              <p className="text-danger text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.03em] text-[#64748B] dark:text-slate-300">
                {t('username')}
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 h-[22px] w-[22px] -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="premium-input pl-12"
                  placeholder={t('enterUsername')}
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.03em] text-[#64748B] dark:text-slate-300">
                {t('password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-[22px] w-[22px] -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="premium-input pl-12 pr-12"
                  placeholder={t('enterPassword')}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:text-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[rgba(37,99,235,.12)] dark:hover:text-sky-300"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-[22px] w-[22px]" /> : <Eye className="h-[22px] w-[22px]" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="premium-button-primary w-full disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {loading ? t('signingIn') : t('signIn')}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-base leading-7 text-[#64748B] dark:text-slate-400">
              {t('secureItOnly')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
