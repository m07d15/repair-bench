const CACHE = 'repair-bench-v10';
const FILES = [
  './', './index.html', './style.css', './app.js', './db.js',
  './util.js', './images.js', './photos-ui.js', './finder.js',
  './backup.js', './view-backup.js',
  './view-list.js', './view-form.js',
  './view-detail.js', './view-repair-form.js',
  './manifest.webmanifest', './icon-180.png', './icon-512.png'
];

self.addEventListener('install', e => {
  // cache: 'reload' skips the browser's own cache, so we never save stale copies.
  e.waitUntil(caches.open(CACHE).then(c =>
    c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
