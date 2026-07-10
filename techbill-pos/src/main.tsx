// Synchronous Circuit-Breaker for Explicit Logouts
if (typeof window !== 'undefined' && window.location.search.includes('logout=true')) {
    localStorage.removeItem('et-auth');
    sessionStorage.clear();
    // Also invalidate shared wild-card tracking cookies if applicable
    document.cookie = "auth_token=; max-age=0; path=/; domain=." + window.location.hostname.replace(/^[^\.]+\./, '');
    
    // Strip the query parameters cleanly so refreshes don't stall state initialization
    const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { api } from './api/client';
import { processPendingSales } from './db/offline.db';
import ErrorBoundary from './components/common/ErrorBoundary';

function syncOfflineSales() {
  processPendingSales((payload) => api.post('/sales', payload)).catch(() => {});
}

window.addEventListener('online', syncOfflineSales);
window.addEventListener('focus', syncOfflineSales);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
