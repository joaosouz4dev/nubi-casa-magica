/* Service worker — joga 100% offline. Precache de todos os módulos e assets.
   Estratégia cache-first: ótimo para um jogo estático que não muda em runtime. */
const CACHE = "nubi-v7";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./src/main.js",
  "./src/core/anim.js",
  "./src/core/events.js",
  "./src/core/viewport.js",
  "./src/core/input.js",
  "./src/core/scene_manager.js",
  "./src/systems/audio.js",
  "./src/systems/save.js",
  "./src/systems/effects.js",
  "./src/entities/nubi.js",
  "./src/entities/food_item.js",
  "./src/scenes/kitchen_room.js",
  "./src/scenes/kitchen.js",
  "./src/scenes/bathroom_room.js",
  "./src/scenes/bedroom_room.js",
  "./src/scenes/dentist_room.js",
  "./src/scenes/salon_room.js",
  "./src/scenes/hub_room.js",
  "./src/entities/food_art.js",
  "./src/systems/progress.js",
  "./src/ui/progress_ui.js",
  "./src/ui/title.js",
  "./src/data/prizes.js",
  "./src/scenes/nubi_touch.js",
  "./src/systems/quests.js",
  "./src/entities/wear.js",
  "./src/ui/pets.js",
  "./src/data/pets.js",
  "./src/data/wardrobe.js",
  "./src/data/salon.js",
  "./src/ui/album.js",
  "./src/ui/parent_gate.js",
  "./src/ui/hand_demo.js",
  "./src/ui/icons.js",
  "./src/ui/guide.js",
  "./src/data/foods.js",
  "./src/data/chapters.js",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/icon-maskable-512.png",
  "./assets/nubi.svg"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match("./index.html")))
  );
});
