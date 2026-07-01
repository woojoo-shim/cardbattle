import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';

// `beforeinstallprompt` fires before React mounts, so capture it here at startup
// and stash it globally; InstallButton reads it and also listens for later fires.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as unknown as { __installPrompt?: Event }).__installPrompt = e;
  window.dispatchEvent(new Event('pwa-installable'));
});

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

// Register the service worker so the game can be installed as an app (PWA).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
