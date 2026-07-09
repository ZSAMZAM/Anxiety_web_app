import { useEffect, useState } from 'react';
import { networkDebug } from '../utils/networkDebug.js';

/**
 * Connection Status Banner
 * Displays network status and helps with debugging
 */
function ConnectionStatus() {
  const [status, setStatus] = useState('checking');
  const [details, setDetails] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const checkConnection = async () => {
      if (!networkDebug || typeof networkDebug.checkBackendConnection !== 'function') {
        setError('Connection debugger utility is unavailable.');
        setDetails({
          message: 'Missing or invalid networkDebug utility. Restart the app and verify src/utils/networkDebug.js.',
          solutions: [
            'Verify src/utils/networkDebug.js exports networkDebug.',
            'Restart Vite after editing frontend files.',
          ],
        });
        setStatus('disconnected');
        return;
      }

      try {
        const result = await networkDebug.checkBackendConnection();
        if (!isMounted) return;

        setError(null);
        setDetails(result);
        setStatus(result.connected ? 'connected' : 'disconnected');
      } catch (err) {
        if (!isMounted) return;

        setError(err?.message || 'Unable to check backend connection.');
        setDetails({
          message: err?.message || 'Unknown backend connection error.',
          solutions: [
            'Ensure Flask backend is running on the configured host and port.',
            'Check browser console for CORS or network errors.',
          ],
        });
        setStatus('disconnected');
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleRetry = async () => {
    try {
      if (!networkDebug || typeof networkDebug.checkBackendConnection !== 'function') {
        setError('Cannot retry because networkDebug utility is unavailable.');
        return;
      }

      const result = await networkDebug.checkBackendConnection();
      setError(null);
      setDetails(result);
      setStatus(result.connected ? 'connected' : 'disconnected');
    } catch (retryError) {
      setError(retryError?.message || 'Retry failed.');
    }
  };

  if (status === 'connected') {
    return null;
  }

  if (status === 'checking') {
    return (
      <div className="fixed bottom-4 right-4 rounded-lg bg-blue-50 border border-blue-200 p-3 shadow-lg">
        <p className="text-sm text-blue-700">Checking connection...</p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 max-w-xs rounded-lg bg-red-50 border border-red-200 p-4 shadow-lg z-50">
      <div className="flex items-start gap-3">
        <div className="text-2xl">⚠️</div>
        <div>
          <h3 className="font-semibold text-red-900 text-sm">Network Error</h3>
          <p className="text-xs text-red-800 mt-1">{details?.message || error}</p>

          {details?.solutions && (
            <div className="mt-2 pt-2 border-t border-red-200">
              <p className="text-xs font-semibold text-red-900 mb-1">Quick fixes:</p>
              <ul className="text-xs text-red-700 space-y-1">
                {details.solutions.slice(0, 2).map((solution, idx) => (
                  <li key={idx} className="list-item list-inside">
                    {solution}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={handleRetry}
            className="mt-2 text-xs font-semibold text-red-700 hover:text-red-900 underline"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConnectionStatus;
