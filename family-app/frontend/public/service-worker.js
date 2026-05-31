/* eslint-disable no-restricted-globals */
// No-op service worker — clears caches and unregisters itself.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => {
  self.registration.unregister();
  caches.keys().then(n => n.forEach(k => caches.delete(k)));
});
