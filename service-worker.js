const retire = async () => {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
  await self.registration.unregister();

  const clientsList = await self.clients.matchAll({
    includeUncontrolled: true,
    type: "window"
  });

  await Promise.all(clientsList.map((client) => client.navigate(client.url)));
};

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(retire());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(retire());
});
