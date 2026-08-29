import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setApiBaseUrl } from './utils/api';

// Initialize API base URL for Vercel/remote deployments
// Check multiple sources in order of priority:
// 1. Query parameter: ?apiUrl=https://backend.railway.app
// 2. Window global config
// 3. Meta tag with api-url attribute
const initializeApiUrl = () => {
  // Try query parameter first
  const params = new URLSearchParams(window.location.search);
  const queryApiUrl = params.get('apiUrl');
  if (queryApiUrl) {
    setApiBaseUrl(queryApiUrl);
    return;
  }

  // Try window global config
  if ((window as any).__APP_CONFIG__?.apiBase) {
    setApiBaseUrl((window as any).__APP_CONFIG__.apiBase);
    return;
  }

  // Try meta tag
  const metaTag = document.querySelector('meta[name="api-url"]');
  if (metaTag?.getAttribute('content')) {
    setApiBaseUrl(metaTag.getAttribute('content') || '');
    return;
  }

  // Log for debugging
  console.log('Using default API URL (current origin)');
};

// Initialize before rendering
initializeApiUrl();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
