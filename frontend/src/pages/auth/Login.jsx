import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiActivity,
  FiAlertTriangle,
  FiBarChart2,
  FiCalendar,
  FiCheckCircle,
  FiEye,
  FiEyeOff,
  FiFileText,
  FiLock,
  FiShield,
  FiUser,
  FiUsers,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import LanguageSelector from '../../components/LanguageSelector.jsx';
import ThemeToggle from '../../components/ThemeToggle.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { api } from '../../services/api.js';

const validateStrongPassword = (password) => {
  if (!password) return 'New password is required.';
  if (password.length < 8) return 'New password must be at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'New password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'New password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(password)) return 'New password must contain at least one number.';
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'New password must contain at least one special character.';
  return '';
};

const FieldStatusIcon = ({ status }) => {
  if (status === 'success') return <FiCheckCircle className="h-4 w-4 text-emerald-500" aria-hidden="true" />;
  if (status === 'error') return <FiAlertTriangle className="h-4 w-4 text-rose-500" aria-hidden="true" />;
  return null;
};

function FloatingField({
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  icon: Icon,
  error,
  success,
  trailing,
  placeholder,
  onKeyUp,
  onKeyDown,
  autoFocus = false,
}) {
  const id = useId();
  const status = error ? 'error' : success ? 'success' : 'default';

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-[13px] font-medium text-slate-700 dark:text-slate-200"
      >
        {label}
      </label>
      <div
        className={`group relative h-14 rounded-2xl border bg-white transition duration-200 dark:bg-slate-900/72 ${
          error
            ? 'border-rose-300 focus-within:border-rose-400 focus-within:ring-4 focus-within:ring-rose-100/80 dark:border-rose-400/60 dark:focus-within:ring-rose-500/10'
            : 'border-slate-200 hover:border-slate-300 focus-within:border-sky-400 focus-within:shadow-[0_16px_32px_-24px_rgba(14,165,233,0.85)] focus-within:ring-4 focus-within:ring-sky-100/80 dark:border-white/12 dark:hover:border-slate-600 dark:focus-within:border-sky-300 dark:focus-within:ring-sky-400/10'
        }`}
      >
        {Icon && (
          <Icon
            className={`pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 transition ${
              error ? 'text-rose-500' : 'text-slate-400 group-focus-within:text-sky-500 dark:text-slate-500 dark:group-focus-within:text-sky-300'
            }`}
            aria-hidden="true"
          />
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onKeyUp={onKeyUp}
          onKeyDown={onKeyDown}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          placeholder={placeholder}
          className={`h-full w-full rounded-2xl bg-transparent text-base font-medium text-slate-950 outline-none transition placeholder:text-sm placeholder:font-normal placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500 ${
            Icon ? 'pl-12' : 'pl-4'
          } ${trailing ? 'pr-20' : 'pr-12'}`}
        />
        <div className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-2">
          <FieldStatusIcon status={status} />
          {trailing}
        </div>
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-2 flex items-center gap-2 text-sm font-semibold text-rose-600 dark:text-rose-300">
          <FiAlertTriangle className="h-4 w-4" aria-hidden="true" />
          {error}
        </p>
      )}
      {!error && success && (
        <span id={`${id}-success`} className="sr-only">{success}</span>
      )}
    </div>
  );
}

function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [touched, setTouched] = useState({ username: false, password: false });
  const [serverError, setServerError] = useState('');
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [forcedPasswordForm, setForcedPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [forcedPasswordError, setForcedPasswordError] = useState('');
  const [pendingDoctorUser, setPendingDoctorUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showForcedPassword, setShowForcedPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, updateUser } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const usernameError = touched.username && !form.username.trim() ? t('usernameRequired', 'Username is required.') : '';
  const passwordError = touched.password && !form.password ? t('passwordRequired', 'Password is required.') : '';
  const features = [
    {
      icon: FiActivity,
      title: t('loginFeatureAssessmentTitle', 'AI-powered Mental Health Assessment'),
      description: t('loginFeatureAssessmentDescription', 'Review structured assessments and prediction signals.'),
    },
    {
      icon: FiUsers,
      title: t('loginFeaturePatientsTitle', 'Secure Patient Management'),
      description: t('loginFeaturePatientsDescription', 'Access patient records with role-based permissions.'),
    },
    {
      icon: FiCalendar,
      title: t('loginFeatureAppointmentsTitle', 'Appointment Scheduling'),
      description: t('loginFeatureAppointmentsDescription', 'Coordinate visits, schedules, and follow-up care.'),
    },
    {
      icon: FiFileText,
      title: t('loginFeatureRecordsTitle', 'Protected Medical Records'),
      description: t('loginFeatureRecordsDescription', 'Keep reports, payments, and notifications organized.'),
    },
  ];

  const updateField = (field, value) => {
    setServerError('');
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched({ username: true, password: true });
    setServerError('');

    if (!form.username.trim() || !form.password) {
      return;
    }

    setLoading(true);
    try {
      const user = await login({ ...form, platform: 'web' });
      if ((user.role || '').toLowerCase() === 'doctor' && user.must_change_password) {
        setPendingDoctorUser(user);
        setForcedPasswordForm({ newPassword: '', confirmPassword: '' });
        setForcedPasswordError('');
        showToast(t('passwordChangeRequired', 'Password change required'), t('setNewPasswordBeforeDashboard', 'Please set a new password before opening your dashboard.'));
        return;
      }

      showToast(t('welcomeBack'), t('loginSuccessful'));
      navigateAfterLogin(user);
    } catch (error) {
      const message = error?.message || t('serverUnavailable', 'Server unavailable. Please try again.');
      setServerError(message);
      showToast(t('loginFailed'), message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    showToast(t('comingSoon'), t('passwordResetSoon'));
  };

  const navigateAfterLogin = (user) => {
    const role = (user.role || '').toLowerCase();
    const roleRoutes = {
      admin: '/admin/dashboard',
      super_admin: '/admin/dashboard',
      doctor: '/doctor/dashboard',
      user: '/user/dashboard',
    };
    navigate(roleRoutes[role] || '/login', { replace: true });
  };

  const handleForcedPasswordSubmit = async (event) => {
    event.preventDefault();
    setForcedPasswordError('');

    const passwordError = validateStrongPassword(forcedPasswordForm.newPassword);
    if (passwordError) {
      setForcedPasswordError(passwordError);
      return;
    }
    if (forcedPasswordForm.newPassword !== forcedPasswordForm.confirmPassword) {
      setForcedPasswordError(t('passwordsDoNotMatch', 'Passwords do not match.'));
      return;
    }
    if (forcedPasswordForm.newPassword === form.password) {
      setForcedPasswordError(t('chooseDifferentPassword', 'Choose a password different from the generated password.'));
      return;
    }

    setLoading(true);
    try {
      const result = await api.forcePasswordChange({
        token: pendingDoctorUser?.token || window.localStorage.getItem('anxiety-token') || window.sessionStorage.getItem('anxiety-token'),
        current_password: form.password,
        password: forcedPasswordForm.newPassword,
      });
      const updatedUser = {
        ...pendingDoctorUser,
        ...(result?.user || {}),
        must_change_password: false,
      };
      const token = result?.token || pendingDoctorUser?.token;
      window.localStorage.setItem('anxiety-user', JSON.stringify(updatedUser));
      if (token) {
        window.localStorage.setItem('anxiety-token', token);
      }
      window.localStorage.setItem('anxiety-role', (updatedUser.role || '').toLowerCase());
      updateUser(updatedUser);
      showToast(t('welcomeBack'), t('passwordUpdatedSuccessfully', 'Password updated successfully.'));
      setPendingDoctorUser(null);
      navigateAfterLogin(updatedUser);
    } catch (error) {
      setForcedPasswordError(error.message || t('unableToUpdatePassword', 'Unable to update password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[linear-gradient(135deg,#F8FBFF_0%,#EAF5FF_44%,#F7FFFC_100%)] text-slate-950 transition-colors duration-500 dark:bg-[linear-gradient(135deg,#05111F_0%,#071B31_48%,#06151F_100%)] dark:text-white">
      <div className="mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden min-h-screen overflow-hidden px-10 py-10 lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(14,165,233,0.20),transparent_28%),radial-gradient(circle_at_74%_12%,rgba(20,184,166,0.18),transparent_24%),radial-gradient(circle_at_50%_80%,rgba(99,102,241,0.16),transparent_30%)] dark:bg-[radial-gradient(circle_at_18%_18%,rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_78%_20%,rgba(45,212,191,0.12),transparent_24%),radial-gradient(circle_at_48%_82%,rgba(99,102,241,0.16),transparent_34%)]" />
          <div className="relative z-10 flex w-full flex-col justify-between rounded-[28px] border border-white/75 bg-white/50 p-8 shadow-[0_30px_120px_-80px_rgba(15,23,42,0.50)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.05]">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-teal-400 text-white shadow-[0_18px_36px_-24px_rgba(14,165,233,0.9)]">
                  <FiShield className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-lg font-black tracking-tight">AnxietyCare</p>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                    {t('healthcareAccess', 'Healthcare Access')}
                  </p>
                </div>
              </div>

              <div className="mt-14 max-w-2xl">
                <p className="text-sm font-bold uppercase tracking-[0.28em] text-sky-700 dark:text-sky-300">
                  {t('secureClinicalWorkspace', 'Secure clinical workspace')}
                </p>
                <h1 className="mt-5 text-5xl font-black leading-[1.02] tracking-tight text-slate-950 dark:text-white">
                  {t('loginHeroTitle', 'Professional Mental Healthcare Platform')}
                </h1>
                <p className="mt-5 max-w-xl text-base leading-8 text-slate-600 dark:text-slate-300">
                  {t('loginHeroSubtitle', 'Securely sign in to manage appointments, assessments, predictions, reports, and patient care.')}
                </p>
              </div>
            </div>

            <div className="relative mt-10">
              <div className="absolute -right-4 -top-8 h-40 w-40 rounded-full border border-sky-200/70 dark:border-sky-300/10" />
              <div className="absolute right-16 top-8 h-24 w-24 rounded-full border border-teal-200/80 dark:border-teal-300/10" />
              <div className="relative grid gap-4 xl:grid-cols-2">
                {features.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <article
                      key={feature.title}
                      className="group rounded-2xl border border-white/80 bg-white/72 p-5 shadow-[0_20px_50px_-42px_rgba(15,23,42,0.45)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:bg-white/90 dark:border-white/10 dark:bg-slate-950/28 dark:hover:border-sky-300/30 dark:hover:bg-slate-900/46"
                    >
                      <div className="flex items-start gap-4">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-teal-50 text-sky-700 transition group-hover:scale-105 dark:from-sky-400/14 dark:to-teal-400/10 dark:text-sky-200">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div>
                          <h2 className="text-sm font-black text-slate-950 dark:text-white">{feature.title}</h2>
                          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{feature.description}</p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 lg:px-10" aria-labelledby="login-title">
          <div className="w-full max-w-[520px] animate-[loginCardIn_560ms_ease-out]">
            <div className="mb-5 flex items-center justify-between lg:hidden">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-teal-400 text-white">
                  <FiShield className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-lg font-black">AnxietyCare</span>
              </div>
              <ThemeToggle />
            </div>

            <div className="rounded-[28px] border border-white/80 bg-white/78 p-5 shadow-[0_32px_120px_-72px_rgba(15,23,42,0.65)] backdrop-blur-2xl transition-colors duration-500 dark:border-white/10 dark:bg-slate-950/58 dark:shadow-black/30 sm:p-7">
              <div className="flex flex-col gap-4 border-b border-slate-200/70 pb-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-teal-400 text-white shadow-[0_18px_40px_-26px_rgba(14,165,233,0.9)] sm:flex">
                    <FiLock className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-300">
                      {t('memberAccess', 'Member access')}
                    </p>
                    <h2 id="login-title" className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                      {t('signIn', 'Sign In')}
                    </h2>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <LanguageSelector compact />
                  <ThemeToggle className="hidden sm:inline-flex" />
                </div>
              </div>

              <div className="pt-7">
                <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                  {t('loginCardTitle', 'Secure Access to AnxietyCare')}
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {t('loginCardSubtitle', 'Continue securely to your account.')}
                </p>

                {serverError && (
                  <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200" role="alert">
                    {serverError}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
                  <FloatingField
                    label={t('username', 'Username')}
                    value={form.username}
                    onChange={(event) => updateField('username', event.target.value)}
                    onKeyDown={() => setTouched((current) => ({ ...current, username: true }))}
                    autoComplete="username"
                    placeholder={t('enterUsername', 'Enter your username')}
                    icon={FiUser}
                    error={usernameError}
                    success={touched.username && form.username.trim() ? t('usernameReady', 'Username ready') : ''}
                    autoFocus
                  />

                  <div>
                    <FloatingField
                      label={t('password', 'Password')}
                      value={form.password}
                      onChange={(event) => updateField('password', event.target.value)}
                      onKeyDown={(event) => {
                        setTouched((current) => ({ ...current, password: true }));
                        setCapsLockOn(Boolean(event.getModifierState?.('CapsLock')));
                      }}
                      onKeyUp={(event) => setCapsLockOn(Boolean(event.getModifierState?.('CapsLock')))}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder={t('enterPassword', 'Enter your password')}
                      icon={FiLock}
                      error={passwordError}
                      success={touched.password && form.password ? t('passwordEntered', 'Password entered') : ''}
                      trailing={
                        <button
                          type="button"
                          onClick={() => setShowPassword((current) => !current)}
                          className="rounded-xl p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-100 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-sky-200 dark:focus:ring-sky-400/10"
                          aria-label={showPassword ? t('hidePassword', 'Hide password') : t('showPassword', 'Show password')}
                        >
                          {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                        </button>
                      }
                    />
                    {capsLockOn && (
                      <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
                        <FiAlertTriangle className="h-4 w-4" aria-hidden="true" />
                        {t('capsLockWarning', 'Caps Lock is on.')}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex cursor-pointer items-center gap-3 font-semibold text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(event) => setRememberMe(event.target.checked)}
                        className="h-5 w-5 rounded-lg border-slate-300 text-sky-600 outline-none transition focus:ring-4 focus:ring-sky-100 dark:border-white/20 dark:bg-slate-950 dark:focus:ring-sky-400/10"
                      />
                      {t('rememberMe', 'Remember me')}
                    </label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-left font-black text-sky-700 transition hover:text-sky-900 hover:underline focus:outline-none focus:ring-4 focus:ring-sky-100 dark:text-sky-300 dark:hover:text-sky-100 dark:focus:ring-sky-400/10 sm:text-right"
                    >
                      {t('forgotPassword', 'Forgot Password?')}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="group flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-teal-500 px-6 text-base font-black text-white shadow-[0_24px_44px_-28px_rgba(37,99,235,0.85)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_30px_58px_-32px_rgba(37,99,235,0.95)] focus:outline-none focus:ring-4 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 dark:focus:ring-sky-400/20"
                  >
                    {loading ? (
                      <>
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/25 border-t-white" aria-hidden="true" />
                        {t('signingIn', 'Signing in...')}
                      </>
                    ) : (
                      <>
                        {t('signIn', 'Sign In')}
                        <FiShield className="h-5 w-5 transition group-hover:scale-110" aria-hidden="true" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-7 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm font-semibold text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                  {t('authorizedAccessNotice', 'Authorized access for administrators and doctors.')}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {pendingDoctorUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-semibold text-slate-950 dark:text-white">{t('changePassword', 'Change Password')}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {t('setNewPasswordBeforeDashboard', 'Please set a new password before opening your dashboard.')}
            </p>
            <form onSubmit={handleForcedPasswordSubmit} className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('newPassword', 'New Password')}</label>
                <div className="relative">
                  <input
                    type={showForcedPassword ? 'text' : 'password'}
                    value={forcedPasswordForm.newPassword}
                    onChange={(e) => setForcedPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 pr-10 text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowForcedPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                    aria-label={showForcedPassword ? t('hidePassword', 'Hide password') : t('showPassword', 'Show password')}
                  >
                    {showForcedPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('confirmPassword', 'Confirm Password')}</label>
                <input
                  type={showForcedPassword ? 'text' : 'password'}
                  value={forcedPasswordForm.confirmPassword}
                  onChange={(e) => setForcedPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
              {forcedPasswordError && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{forcedPasswordError}</p>}
              <button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-xl bg-[#2563EB] text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:opacity-60"
              >
                {loading ? t('saving', 'Saving...') : t('saveAndContinue', 'Save and Continue')}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default Login;
