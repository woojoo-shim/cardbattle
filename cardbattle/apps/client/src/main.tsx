import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

// Register the service worker so the game can be installed as an app (PWA).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
