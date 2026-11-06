// Authentification hors connexion : code d'accès personnel → compte (titulaire d'une ou plusieurs classes, ou admin).
// Les codes ne sont jamais stockés : acces.js ne contient que des empreintes PBKDF2-SHA256 (avec « sel »).
// Ce module ne touche JAMAIS aux élèves ni aux cotes : il utilise ses propres clés de stockage.
(function (racine) {
  "use strict";
  const CLE_SESSION = "bulletins_auth_session", CLE_ESSAIS = "bulletins_auth_essais";
  const cfg = () => racine.ACCES || { actif: false, comptes: [] };
  const lire = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const ecrire = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* mémoire pleine : ignoré */ } };
  const effacer = (k) => { try { localStorage.removeItem(k); } catch (e) { /* ignoré */ } };
  const hexVersOctets = (h) => new Uint8Array(h.match(/../g).map((x) => parseInt(x, 16)));
  const octetsVersHex = (b) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  const normaliser = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  async function empreinte(code, selHex, iterations) {
    const cle = await crypto.subtle.importKey("raw", new TextEncoder().encode(code), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: hexVersOctets(selHex), iterations }, cle, 256);
    return octetsVersHex(new Uint8Array(bits));
  }

  // La connexion n'est active que si acces.js le demande ET contient au moins un compte (évite tout blocage par erreur).
  const actif = () => !!cfg().actif && Array.isArray(cfg().comptes) && cfg().comptes.length > 0;
  const modeTransition = () => actif() && !!cfg().modeTransition;

  function session() {
    if (!actif()) return null;
    const s = lire(CLE_SESSION); if (!s) return null;
    if (Date.now() - (s.derniere || 0) > (cfg().inactiviteMinutes || 30) * 60000) { effacer(CLE_SESSION); return null; }
    if (s.invite) {
      if (!modeTransition()) { effacer(CLE_SESSION); return null; }
      return { id: null, nom: "Sans code (période de transition)", role: "invite", classes: ["*"] };
    }
    const c = cfg().comptes.find((x) => x.id === s.id);
    return c ? { id: c.id, nom: c.nom, role: c.role, classes: c.role === "admin" ? ["*"] : (c.classes || []) } : null;
  }
  // Admin ou invité de transition : toutes les classes. Titulaire : seulement ses classes.
  const accesTotal = () => { const s = session(); return !!s && s.classes.includes("*"); };
  const estAdmin = () => !actif() || accesTotal();
  const peut = (codeClasse) => { if (!actif()) return true; const s = session(); return !!s && (s.classes.includes("*") || s.classes.includes(codeClasse)); };
  const classesAutorisees = (toutes) => toutes.filter((c) => peut(c.code));
  const peutChanger = (toutes) => classesAutorisees(toutes).length > 1;

  let dernierTouch = 0;
  function touch() {
    const t = Date.now(); if (t - dernierTouch < 10000) return; dernierTouch = t;
    const s = lire(CLE_SESSION); if (s && session()) { s.derniere = t; ecrire(CLE_SESSION, s); }
  }

  async function connexion(saisie) {
    const lim = lire(CLE_ESSAIS) || { n: 0, jusqua: 0 };
    if (Date.now() < lim.jusqua) return { ok: false, erreur: `Trop d'essais. Réessayez dans ${Math.ceil((lim.jusqua - Date.now()) / 1000)} secondes.` };
    const code = normaliser(saisie);
    if (code.length < 8) return { ok: false, erreur: "Code incomplet : recopiez-le en entier." };
    if (!(racine.crypto && racine.crypto.subtle)) return { ok: false, erreur: "Connexion impossible sur ce navigateur : ouvrez l'application depuis son lien web (https)." };
    const candidats = cfg().comptes.filter((c) => code.startsWith(c.id)).sort((a, b) => b.id.length - a.id.length);
    for (const c of candidats) {
      if (await empreinte(code, c.sel, c.iter || cfg().iterations || 100000) === c.hash) {
        effacer(CLE_ESSAIS); ecrire(CLE_SESSION, { id: c.id, derniere: Date.now() }); return { ok: true };
      }
    }
    const n = (lim.n || 0) + 1, attente = n >= 5 ? Math.min(30 * Math.pow(2, n - 5), 600) : 0;
    ecrire(CLE_ESSAIS, { n, jusqua: attente ? Date.now() + attente * 1000 : 0 });
    return { ok: false, erreur: attente ? `Code incorrect. Patientez ${attente} secondes avant de réessayer.` : `Code incorrect. (${5 - n} essai${5 - n > 1 ? "s" : ""} avant une attente)` };
  }
  function inviter() { if (!modeTransition()) return false; ecrire(CLE_SESSION, { invite: true, derniere: Date.now() }); return true; }
  const deconnexion = () => effacer(CLE_SESSION);

  // Copie de sécurité unique des données actuelles, faite au tout premier démarrage de la version avec connexion.
  function copieDeSecurite(cleDonnees) {
    try {
      const nom = cleDonnees + "_avant_auth", donnees = localStorage.getItem(cleDonnees);
      if (donnees && !localStorage.getItem(nom)) localStorage.setItem(nom, donnees);
    } catch (e) { /* mémoire pleine : on ne bloque pas l'application */ }
  }

  racine.Auth = { actif, modeTransition, session, estAdmin, peut, classesAutorisees, peutChanger, touch, connexion, inviter, deconnexion, copieDeSecurite, empreinte, normaliser };
})(window);
