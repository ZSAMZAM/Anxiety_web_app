import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-sky-50 to-blue-50 px-6 text-gray-900">
      <div className="max-w-xl rounded-[2rem] border border-white/20 bg-white/10 p-10 text-center shadow-xl backdrop-blur-xl">
        <p className="text-sm uppercase tracking-[0.35em] text-sky-600">Page not found</p>
        <h1 className="mt-6 text-6xl font-semibold text-gray-900">404</h1>
        <p className="mt-4 text-gray-600">We couldn't find the page you were looking for. Return to the dashboard or home to continue your care journey.</p>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link to="/" className="rounded-3xl bg-white/80 px-6 py-3 text-sm font-semibold text-gray-900 transition hover:bg-white/90 shadow-sm">
            Back to home
          </Link>
          <Link to="/login" className="rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-500 px-6 py-3 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-sky-600 shadow-lg">
            Return to login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NotFound;
