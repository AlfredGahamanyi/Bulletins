// Fonctionnement hors ligne : tous les fichiers de l'application sont gardés dans le téléphone.
// À chaque nouvelle version de l'application, changer le numéro ci-dessous.
const VERSION = "bulletins-2026-10-26-plat";
const FICHIERS = ["./", "index.html", "style.css", "moteur.js", "etablissement.js", "bulletin_css.js",
  "bulletin_css_domaines.js", "bulletin_css_etat.js", "bulletin_css_cartouche.js", "bulletin.js", "app.js",
  "classes.json", "drapeau.png", "embleme.png", "manifest.webmanifest", "icon-192.png", "icon-512.png"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(
  caches.keys().then((cles) => Promise.all(cles.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((r) => r || fetch(e.request)));
});
