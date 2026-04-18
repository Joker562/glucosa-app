const CACHE = "glucosa-v5";
const STATIC = [
  "./manifest.json",
  "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  const url = e.request.url;
  if (url.includes(".html")) {
    e.respondWith(
      fetch(e.request)
        .then(res => { caches.open(CACHE).then(c => c.put(e.request, res.clone())); return res; })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      });
    })
  );
});

// ── Recibir mensajes desde la app para programar notificaciones ──
self.addEventListener("message", e => {
  if (e.data && e.data.type === "SCHEDULE_REMINDERS") {
    scheduleFromSW(e.data.reminders);
  }
  if (e.data && e.data.type === "SHOW_TEST") {
    self.registration.showNotification("DREAD SUIT // GLUCOSA", {
      body: "✓ Notificaciones funcionando correctamente",
      icon: "./icon-192.png",
      badge: "./icon-192.png",
      vibrate: [200, 100, 200]
    });
  }
});

// ── Programar alarmas con setTimeout dentro del SW ──────────────
let swTimers = [];
function scheduleFromSW(reminders) {
  swTimers.forEach(t => clearTimeout(t));
  swTimers = [];
  const now = new Date();
  reminders.filter(r => r.active).forEach(r => {
    const [h, m] = r.time.split(":").map(Number);
    const next = new Date(now);
    next.setHours(h, m, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const ms = next - now;
    const t = setTimeout(() => {
      self.registration.showNotification("DREAD SUIT // GLUCOSA", {
        body: r.label,
        icon: "./icon-192.png",
        badge: "./icon-192.png",
        vibrate: [300, 100, 300],
        tag: r.id,
        renotify: true
      });
      // Re-schedule for next day
      scheduleFromSW(reminders);
    }, ms);
    swTimers.push(t);
  });
}

// ── Al tocar la notificación, abrir la app ─────────────────────
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      if (list.length > 0) {
        list[0].focus();
        list[0].postMessage({ type: "PLAY_SOUND" });
        return;
      }
      return clients.openWindow("./glucosa_tracker_app.html");
    })
  );
});
