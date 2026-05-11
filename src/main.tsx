import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { pingBackend } from './services/api';

// Wake up the backend on initial load to reduce Razorpay cold starts
pingBackend();

// Service Worker is now registered automatically by vite-plugin-pwa via PwaUpdatePrompt component

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
