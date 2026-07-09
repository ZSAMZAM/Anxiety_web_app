import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import InputField from '../../components/InputField.jsx';

function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const fromPath = location.state?.from || '';
      const platform = fromPath.startsWith('/admin')
        ? 'admin_web'
        : fromPath.startsWith('/doctor')
          ? 'doctor_web'
          : 'web';
      const user = await login({ ...form, platform });
      showToast('Welcome back', 'Login successful.');
      
      // Redirect based on role from backend
      const role = user.role || 'user';
      const roleRoutes = {
        'admin': '/admin/dashboard',
        'super_admin': '/admin/dashboard',
        'doctor': '/doctor/dashboard',
      };
      
      const requestedPath = location.state?.from;
      const next = requestedPath && requestedPath.startsWith(roleRoutes[role] || '__never__')
        ? requestedPath
        : roleRoutes[role] || '/login';
      navigate(next, { replace: true });
    } catch (error) {
      showToast('Login failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    showToast('Coming soon', 'Password reset feature will be available soon.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-6 py-16 text-slate-900 dark:text-white">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/20 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-8 shadow-xl sm:p-10">
        <div className="mb-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-sky-600 dark:text-sky-400">Member access</p>
            <h1 className="mt-4 text-4xl font-semibold text-slate-900 dark:text-white">Secure login for patients and professionals.</h1>
            <p className="mt-4 text-slate-600 dark:text-slate-300">Access your account to manage your mental health journey. Your role is automatically detected.</p>
          </div>
          <div className="rounded-[2rem] bg-white/90 dark:bg-slate-800/90 p-6 shadow-inner shadow-slate-200/20 dark:shadow-slate-700/20 backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="space-y-5">
              <InputField
                label="Username"
                type="text"
                placeholder="Enter your username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
              <div className="relative">
                <InputField
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-300">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 font-medium"
                >
                  Forgot Password?
                </button>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-3xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-4 text-base font-semibold text-white transition hover:from-sky-600 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg"
              >
                {loading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border border-white/20 border-t-white" />
                    Signing in...
                  </span>
                ) : (
                  'Login'
                )}
              </button>
            </form>
            <p className="mt-5 text-center text-sm text-slate-600 dark:text-slate-300">
              Web access is for administrators and doctors. Patients register from the mobile app.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
