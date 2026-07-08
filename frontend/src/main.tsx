import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Global error catcher to display runtime crashes directly on screen
window.addEventListener('error', (event) => {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 24px; background: #FEF2F2; border: 2px solid #EF4444; color: #991B1B; font-family: monospace; border-radius: 8px; margin: 20px; text-align: left;">
        <h2 style="margin-top: 0; color: #DC2626;">🔴 Application Runtime Crash</h2>
        <p><strong>Error Message:</strong> ${event.message}</p>
        <p><strong>Filename:</strong> ${event.filename}:${event.lineno}:${event.colno}</p>
        <pre style="background: #FEE2E2; padding: 12px; border-radius: 4px; overflow: auto; max-height: 300px;">${event.error?.stack || 'No stack trace available'}</pre>
        <button onclick="window.location.reload()" style="background: #DC2626; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">Reload Page</button>
      </div>
    `;
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
