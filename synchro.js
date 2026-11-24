// Transmission des classes à l'administration (Firebase) : facultative, hors ligne d'abord.
// Le téléphone garde ses données comme avant ; « Transmettre » en envoie une copie. Sans réseau, l'envoi attend et part plus tard.
// Ce module ne touche JAMAIS aux élèves ni aux cotes du téléphone : il a ses propres clés de stockage.
(function (racine) {
  "use strict";
  const CLE = "bulletins_synchro", VERSION_SDK = "10.14.1";
  const SDK = ["firebase-app-compat.js", "firebase-auth-compat.js", "firebase-firestore-compat.js"]
    .map((f) => `https://www.gstatic.com/firebasejs/${VERSION_SDK}/${f}`);
  const cfg = () => racine.FIREBASE_CONFIG || {};
  const configOk = () => { const c = cfg(); return !!(c.actif && c.apiKey && c.projectId && c.appId); };
  // Côté application des titulaires : il faut aussi que la connexion par code soit active (c'est elle qui identifie la personne).
  const actif = () => configOk() && !!(racine.Auth && racine.Auth.actif && racine.Auth.actif());

  const lire = () => { try { return JSON.parse(localStorage.getItem(CLE)) || {}; } catch (e) { return {}; } };
  const ecrire = (o) => { try { localStorage.setItem(CLE, JSON.stringify(o)); } catch (e) { /* mémoire pleine : ignoré */ } };

  // Empreinte courte (cyrb53) : sert à savoir si la classe a changé depuis la dernière transmission.
  function empreinte(s) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }

  // Le code d'accès devient le mot de passe du compte en ligne : rien ne change pour l'utilisateur.
  const courriel = (id) => String(id).toLowerCase().replace(/[^a-z0-9]/g, "") + "@" + (cfg().domaineCourriel || "comptes-bulletins.com");
  const motDePasse = (code) => String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  const avecDelai = (p, ms) => Promise.race([p, new Promise((_, ko) => setTimeout(() => ko(Object.assign(new Error("délai dépassé"), { code: "delai" })), ms))]);

  function messageErreur(e) {
    const c = String((e && (e.code || e.message)) || "");
    if (/invalid-credential|wrong-password|user-not-found|invalid-login/.test(c)) return "Compte en ligne introuvable ou code différent. Contactez l'administration.";
    if (/network|hors-ligne|delai|unavailable/.test(c)) return "Connexion internet insuffisante.";
    if (/too-many/.test(c)) return "Trop d'essais. Réessayez dans quelques minutes.";
    if (/permission-denied/.test(c)) return "Accès refusé par le serveur : ce compte n'est pas autorisé pour cette classe.";
    return "Erreur : " + ((e && e.message) || c || "inconnue");
  }

  // ---------- Chargement de la bibliothèque Firebase (seulement quand on en a besoin et qu'il y a du réseau)
  const chargerScript = (src) => new Promise((ok, ko) => {
    const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => ko(Object.assign(new Error("hors-ligne"), { code: "hors-ligne" }));
    document.head.appendChild(s);
  });
  let promesse = null, services = null;
  function demarrer() {
    if (services) return Promise.resolve(services);
    if (!promesse) promesse = (async () => {
      const pret = [() => racine.firebase, () => racine.firebase && racine.firebase.auth, () => racine.firebase && racine.firebase.firestore];
      for (let i = 0; i < SDK.length; i++) if (!pret[i]()) await chargerScript(SDK[i]);
      const c = cfg(), fb = racine.firebase;
      if (!fb.apps.length) fb.initializeApp({ apiKey: c.apiKey, authDomain: c.authDomain, projectId: c.projectId, appId: c.appId });
      services = { auth: fb.auth(), db: fb.firestore() };
      return services;
    })().catch((e) => { promesse = null; throw e; });
    return promesse;
  }
  // Utilisateur en ligne actuel (attend que la bibliothèque ait relu la session enregistrée).
  const utilisateur = () => demarrer().then(({ auth }) => new Promise((ok) => { const off = auth.onAuthStateChanged((u) => { off(); ok(u); }); }));

  async function connecter(code) {
    const s = racine.Auth && racine.Auth.session && racine.Auth.session();
    if (!actif() || !s || !s.id) return { ok: false, erreur: "inactif" };
    try {
      const { auth } = await demarrer(), mail = courriel(s.id), u = await utilisateur();
      if (!(u && u.email === mail)) await avecDelai(auth.signInWithEmailAndPassword(mail, motDePasse(code)), 20000);
      vider();
      return { ok: true };
    } catch (e) { return { ok: false, erreur: messageErreur(e) }; }
  }
  async function deconnecter() {
    if (!actif() || !navigator.onLine) return;
    try { const { auth } = await demarrer(); await auth.signOut(); } catch (e) { /* ignoré */ }
  }

  // ---------- Écriture d'une classe : état courant + statut + une version dans l'historique (tout ou rien)
  async function ecrireClasse(db, it, importe) {
    const FV = racine.firebase.firestore.FieldValue;
    const meta = { code: it.code, nom_classe: it.nom, nbEleves: it.eleves.length, transmisPar: it.par.id, transmisParNom: it.par.nom, transmisLe: FV.serverTimestamp(), hash: it.hash, importe: !!importe };
    const complet = Object.assign({}, meta, { ecole: (racine.ETABLISSEMENT || {}).code_ecole || "", donnees: JSON.stringify(it.eleves) });
    const b = db.batch();
    b.set(db.doc("statuts/" + it.code), meta);
    b.set(db.doc("classes/" + it.code), complet);
    b.set(db.collection("classes/" + it.code + "/historique").doc(), complet);
    await avecDelai(b.commit(), 30000);
  }
  async function publier(it, importe) { const { db } = await demarrer(); return ecrireClasse(db, it, importe); }

  // ---------- Transmission : d'abord mise en file dans le téléphone (rien ne se perd), puis envoi
  let enCours = false;
  async function vider() {
    const e0 = lire(), codes = Object.keys(e0.file || {});
    if (!codes.length) return { ok: true, envoyes: 0 };
    if (!navigator.onLine) return { ok: false, attente: true, erreur: "Pas de réseau : l'envoi partira dès que le téléphone sera connecté." };
    if (enCours) return { ok: false, attente: true, erreur: "Une transmission est déjà en cours." };
    enCours = true;
    try {
      const { db } = await demarrer(), u = await utilisateur();
      if (!u) return { ok: false, attente: true, erreur: "Déconnectez-vous puis reconnectez-vous avec votre code pour activer la transmission." };
      for (const code of codes) {
        const it = (lire().file || {})[code]; if (!it) continue;
        await ecrireClasse(db, it, false);
        const f = lire(); if (f.file) delete f.file[code];
        (f.transmis = f.transmis || {})[code] = { le: new Date().toISOString(), hash: it.hash }; ecrire(f);
      }
      return { ok: true, envoyes: codes.length };
    } catch (e) { return { ok: false, attente: true, erreur: messageErreur(e) }; }
    finally { enCours = false; }
  }
  async function transmettre(d) {
    const s = racine.Auth && racine.Auth.session && racine.Auth.session();
    if (!s || !s.id) return { ok: false, erreur: "Connectez-vous d'abord avec votre code." };
    const e = lire(); e.file = e.file || {};
    e.file[d.code] = { code: d.code, nom: d.nom, eleves: d.eleves, par: { id: s.id, nom: s.nom }, hash: empreinte(JSON.stringify(d.eleves)) };
    ecrire(e);
    return vider();
  }
  if (typeof window !== "undefined") window.addEventListener("online", () => { if (actif()) vider(); });

  // ---------- Carte « Transmission à l'administration » (onglet Plus des titulaires)
  const dateFr = (iso) => { try { return new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; } };
  function statutHtml(code, eleves) {
    const e = lire(), t = (e.transmis || {})[code];
    if ((e.file || {})[code]) return "En attente d'envoi : la copie partira dès que le téléphone aura du réseau.";
    if (!t) return "Pas encore transmise.";
    if (t.hash !== empreinte(JSON.stringify(eleves))) return `Dernière transmission : ${dateFr(t.le)}. <b>Des modifications n'ont pas encore été transmises.</b>`;
    return `Transmise le ${dateFr(t.le)}. ✓`;
  }
  function carteHtml(code, eleves) {
    if (!actif()) return "";
    return `<div class="carte"><b>Transmission à l'administration</b><small id="synchro-statut">${statutHtml(code, eleves)}</small></div>
      <button class="btn" id="transmettre">Transmettre à l'administration</button><p class="aide" id="synchro-msg" role="status"></p>`;
  }
  function lier(getDonnees) {
    const b = document.getElementById("transmettre"); if (!b) return;
    const msg = document.getElementById("synchro-msg"), st = document.getElementById("synchro-statut");
    b.addEventListener("click", async () => {
      const d = getDonnees();
      if (!d.eleves.length) { msg.textContent = "Aucun élève à transmettre."; return; }
      if (!confirm(`Transmettre la classe ${d.nom} (${d.eleves.length} élève${d.eleves.length > 1 ? "s" : ""}) à l'administration ?`)) return;
      b.disabled = true; msg.textContent = "Transmission en cours…";
      const r = await transmettre(d);
      b.disabled = false;
      msg.textContent = r.ok ? "Transmis à l'administration. Merci." : (r.attente ? r.erreur + " (copie gardée dans le téléphone)" : r.erreur);
      st.innerHTML = statutHtml(d.code, d.eleves);
    });
  }

  racine.Synchro = { actif, configOk, demarrer, utilisateur, connecter, deconnecter, transmettre, vider, publier, carteHtml, lier,
    courriel, motDePasse, messageErreur, empreinte, dateFr };
})(typeof window !== "undefined" ? window : globalThis);
