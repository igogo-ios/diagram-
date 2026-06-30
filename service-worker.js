const CACHE='atlas-pwa-v3';
const ASSETS=['./','./index.html','./style.css','./app.js','./manifest.json','./data/diagrams.json','./icons/icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
