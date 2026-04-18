const CACHE = 'glucosa-v2';
const BASE = '/glucosa-app/';
const ASSETS = [
  BASE,
  BASE + 'index.html',
  BASE + 'manifest.json',
  BASE + 'icon-192.png',
  BASE + 'icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() =>
      caches.match(BASE + 'index.html')
    ))
  );
});

self.addEventListener('message', e => {
  if (e.data?.type === 'SCHEDULE_REMINDERS') {
    self.reminders = e.data.reminders;
  }
  if (e.data?.type === 'SHOW_TEST') {
    self.registration.showNotification('🔵 DREAD SUIT', {
      body: 'Sistema de recordatorios activo ✓',
      icon: BASE + 'icon-192.png',
      vibrate: [200, 100, 200]
    });
  }
});

async function checkReminders() {
  if (!self.reminders) return;
  const now = new Date();
  const hm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  for (const r of self.reminders) {
    if (r.active && r.time === hm) {
      await self.registration.showNotification('💉 DREAD SUIT — Recordatorio', {
        body: r.label,
        icon: BASE + 'icon-192.png',
        vibrate: [300, 100, 300],
        tag: r.id,
        renotify: true
      });
    }
  }
}

self.addEventListener('periodicsync', e => {
  if (e.tag === 'check-reminders') e.waitUntil(checkReminders());
});
