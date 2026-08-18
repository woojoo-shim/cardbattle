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
  // When a freshly deployed service worker takes control (our sw.js calls
  // skipWaiting + clients.claim on activate), reload once so the page runs the
  // NEW bundle immediately instead of the stale cached one — otherwise a shipped
  // UI change (e.g. the menu guide) only shows up after a manual hard-refresh.
  // Guarded so first install (no prior controller) and repeat fires don't loop.
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded) return;
    reloaded = true;
    window.location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
