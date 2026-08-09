import React from 'react';
import ReactDOM from 'react-dom/client';
import { Providers } from './app/providers';
import App from './app/App';
import './styles/global.css';
import { initAnalytics } from '@/shared/lib/analytics';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Providers>
      <App />
    </Providers>
  </React.StrictMode>,
);

// No-op unless VITE_POSTHOG_KEY is set at build time.
void initAnalytics();
