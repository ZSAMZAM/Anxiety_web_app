/**
 * Network Debugging Utilities
 * Helps diagnose API connection issues
 */

const defaultApiUrl = import.meta.env.DEV ? '/api' : 'http://127.0.0.1:5000/api';
const API_BASE_URL = (import.meta.env.DEV ? '/api' : import.meta.env.VITE_API_BASE_URL || defaultApiUrl).replace(/\/$/, '');
const buildUrl = (path) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

export const networkDebug = {
  /**
   * Check if backend is reachable
   */
  checkBackendConnection: async () => {
    try {
      const response = await fetch(buildUrl('/health'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Backend connection: OK', data);
        return {
          connected: true,
          status: data,
          message: 'Backend is reachable and healthy.',
        };
      }

      console.warn(`⚠ Backend returned status ${response.status}`);
      return {
        connected: false,
        status: response.status,
        message: `Backend error: ${response.status}`,
      };
    } catch (error) {
      console.error('❌ Backend connection failed:', error);
      return {
        connected: false,
        error: error?.message,
        message: `Cannot reach backend at ${API_BASE_URL}. Error: ${error?.message}`,
        solutions: [
          'Ensure Flask backend is running: python app.py',
          `Verify VITE_API_BASE_URL in frontend/.env is ${API_BASE_URL}`,
          'Check browser console (F12) for CORS or network errors',
          'Restart Vite if you recently changed .env values',
        ],
      };
    }
  },

  /**
   * Test a specific API endpoint
   */
  testEndpoint: async (endpoint) => {
    try {
      const url = buildUrl(endpoint);
      console.log(`🧪 Testing endpoint: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('anxiety-token') || ''}`,
        },
      });

      const data = await response.json();

      console.log(`Response: ${response.status}`, data);
      return {
        success: response.ok,
        status: response.status,
        data,
      };
    } catch (error) {
      console.error(`❌ Endpoint test failed: ${error?.message}`);
      return {
        success: false,
        error: error?.message,
      };
    }
  },

  /**
   * Get environment configuration info
   */
  getConfig: () => {
    return {
      apiBaseUrl: API_BASE_URL,
      environment: import.meta.env.MODE,
      isProduction: import.meta.env.PROD,
      isDevelopment: import.meta.env.DEV,
    };
  },

  /**
   * Log all debug info for troubleshooting
   */
  logDebugInfo: async () => {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 Network Debug Info');
    console.log('='.repeat(60));
    
    console.log('\n📋 Configuration:');
    const config = networkDebug.getConfig();
    console.table(config);

    console.log('\n🧪 Backend Connection:');
    const connectionStatus = await networkDebug.checkBackendConnection();
    console.table(connectionStatus);

    if (connectionStatus.solutions) {
      console.log('\n💡 Suggested fixes:');
      connectionStatus.solutions.forEach((solution) => console.log(solution));
    }

    console.log('\n' + '='.repeat(60) + '\n');
    return connectionStatus;
  },
};

export const parseApiError = (error) => {
  if (!error) return 'Unknown error';

  if (error.response) {
    return error.response.data?.error || `Server error: ${error.response.status}`;
  }

  if (error.request && !error.response) {
    return 'Network Error: Cannot connect to backend server';
  }

  return error.message || 'Unknown error occurred';
};

export const isNetworkError = (error) => {
  if (!error) return false;
  if (!error.response && error.request) return true;
  if (error.message?.includes('Network') || error.message?.includes('CORS')) return true;
  if (error.code === 'ERR_NETWORK') return true;
  return false;
};

export default networkDebug;
