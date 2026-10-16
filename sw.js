
"use strict";

const CACHE_NAME = "ice-dragon-birthday-v1";

const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./icon.png",
  "./background.png",
  "./birthday-song.mp3",
  "./images/present.png",
  "./images/cake.png",
  "./images/mail.png",
  "./images/photo1.jpg",
  "./images/photo2.jpg",
  "./images/photo3.jpg",
  "./images/photo4.jpg",
  "./images/photo5.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.all(
        APP_FILES.map(async (url) => {
          try {
            await cache.add(url);
          } catch (error) {
            // Continue installing if an optional file is missing.
            console.warn("Could not cache:", url);
          }
        })
      );

      await self.skipWaiting();
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );

      await self.clients.claim();
    })
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Only cache requests from this website.
  if (url.origin !== self.location.origin) return;

  // HTML: prefer the latest version, then use cache offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put("./index.html", copy);
          });
          return response;
        })
        .catch(async () => {
          return (
            await caches.match(request) ||
            await caches.match("./index.html")
          );
        })
    );
    return;
  }

  // Other files: cache first, then fetch and save.
  event.respondWith(
    caches.match(request).then(async (cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      const response = await fetch(request);

      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, copy);
        });
      }

      return response;
    })
  );
});
