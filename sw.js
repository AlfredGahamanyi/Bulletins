// Fonctionnement hors ligne : tous les fichiers de l'application sont gardés dans le téléphone.
// À chaque nouvelle version de l'application, changer le numéro ci-dessous.
const VERSION = "bulletins-2026-11-25-maj";
const FICHIERS = ["./", "index.html", "style.css", "moteur.js", "etablissement.js", "bulletin_css.js",
  "bulletin_css_domaines.js", "bulletin_css_etat.js", "bulletin_css_cartouche.js", "bulletin.js", "acces.js", "auth.js", "firebase-config.js", "synchro.js", "app.js", "admin.html", "admin.js", "pdfmini.js", "tableaux.js",
  "classes.json", "drapeau.png", "embleme.png", "manifest.webmanifest", "icon-192.png", "icon-512.png"];
// Chaque fichier est mis en cache séparément : si l'un d'eux manque sur le site, la mise à jour s'installe quand même
// (avec addAll, un seul fichier manquant bloquait TOUTE la mise à jour sur les téléphones).
self.addEventListener("install", (e) => e.waitUntil(caches.open(VERSION).then((c) => Promise.all(FICHIERS.map((f) => c.add(f).catch(() => null)))).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(
  caches.keys().then((cles) => Promise.all(cles.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((r) => r || fetch(e.request)));
});
