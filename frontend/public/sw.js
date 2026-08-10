const CACHE_NAME = "vendor-portal-cache-v2";

const PRECACHE_ASSETS = ["/", "/index.html", "/manifest.json", "/icon.svg"];

// Install Event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

// Activate Event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Fetch Event
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. API Data (network-first, GET-only)
  if (url.pathname.includes("/api/")) {
    if (request.method === "GET") {
      event.respondWith(
        fetch(request)
          .then((response) => {
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          })
          .catch(() => caches.match(request)),
      );
    } else {
      // Non-GET API calls (POST/PUT/DELETE) bypass cache
      event.respondWith(fetch(request));
    }
    return;
  }

  // 2. Static Assets (Cache-First, update cache in background)
  const isStatic =
    url.pathname.startsWith("/assets/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".woff");

  if (isStatic) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          // Serve cached, but fetch fresh in background to update cache
          fetch(request)
            .then((fresh) => {
              if (fresh.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(request, fresh));
              }
            })
            .catch(() => {});
          return cached;
        }
        return fetch(request).then((fresh) => {
          if (fresh.status === 200) {
            const clone = fresh.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return fresh;
        });
      }),
    );
    return;
  }

  // 3. Navigation Requests (App Shell SPA support)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", clone));
          return response;
        })
        .catch(() => caches.match("/index.html") || caches.match("/")),
    );
    return;
  }

  // 4. Fallback default strategy
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
