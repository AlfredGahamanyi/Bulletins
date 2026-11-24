// Page de l'administration : suivi en direct des classes transmises, résultats, téléchargement, impression, import.
// Réservée aux comptes « admin » (acces.js) qui ont aussi un compte en ligne.
(function () {
  "use strict";
  const M = window.Moteur, S = window.Synchro, A = window.Auth, B = window.Bulletin, ETAB = window.ETABLISSEMENT;
  const $app = document.getElementById("app");
  let classes = [], statuts = {}, abonnements = [], courant = null, colChoisie = null;

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const dateFr = (ts) => { try { const d = ts && ts.toDate ? ts.toDate() : new Date(ts); return isNaN(d) ? "" : d.toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; } };
  const coupe = () => { abonnements.forEach((f) => { try { f(); } catch (e) { /* ignoré */ } }); abonnements = []; };
  let minuterie;
  function toast(msg) { const t = document.getElementById("toast"); t.textContent = msg; t.className = "on"; clearTimeout(minuterie); minuterie = setTimeout(() => (t.className = ""), 2600); }
  const entete = (titre) => `<header class="haut"><p>${esc(ETAB.nom)} · ${esc(ETAB.annee_scolaire)}</p><h1>${titre}</h1></header>`;
  const aller = (h) => { location.hash = h; };
  const nomFichier = (t) => String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\\/:*?"<>|]+/g, " ").trim().replace(/\s+/g, "_");
  const jour = () => new Date().toISOString().slice(0, 10);

  function telecharger(nom, contenu, mime) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([contenu], { type: mime || "application/json" })); a.download = nom;
    document.body.appendChild(a); a.click(); a.remove();
  }
  const sauvegarde = (eleves, classe) => JSON.stringify({ application: "bulletins-scolaires", version: 1, date: new Date().toISOString(), ecole: ETAB.code_ecole, classe: classe || null, eleves }, null, 1);
  function ouvrirDocument(html) {
    const w = window.open(URL.createObjectURL(new Blob([html], { type: "text/html" })), "_blank");
    if (!w) alert("Le navigateur a bloqué l'ouverture. Autorisez les fenêtres pour ce site, puis réessayez.");
  }
  const erreurAffichee = (e) => `<p class="msg" role="alert">${esc(S.messageErreur(e))}</p>`;

  // ---------- Connexion
  function vueConnexion(note) {
    coupe();
    $app.innerHTML = entete("Administration") + `<main><h2>Code d'accès</h2><p class="aide">${esc(note || "Page réservée à l'administration.")}</p>
      <form id="f" novalidate><label for="code">Code d'accès</label>
      <input id="code" autocomplete="off" autocapitalize="characters" spellcheck="false" style="text-transform:uppercase" placeholder="ex. DE-XXXX-XXXX-XXXX">
      <p class="msg" id="err" role="alert"></p><button class="btn" type="submit" id="ok">Se connecter</button></form></main>`;
    const f = document.getElementById("f"), err = document.getElementById("err"), ok = document.getElementById("ok");
    f.addEventListener("submit", async (ev) => {
      ev.preventDefault(); err.textContent = ""; ok.disabled = true; ok.textContent = "Vérification…";
      const code = document.getElementById("code").value;
      const r = await A.connexion(code);
      if (!r.ok) { err.textContent = r.erreur; ok.disabled = false; ok.textContent = "Se connecter"; return; }
      const s = A.session();
      if (!s || s.role !== "admin") { A.deconnexion(); err.textContent = "Cette page est réservée à l'administration."; ok.disabled = false; ok.textContent = "Se connecter"; return; }
      ok.textContent = "Connexion en ligne…";
      const c = await S.connecter(code);
      if (!c.ok) { A.deconnexion(); err.textContent = c.erreur; ok.disabled = false; ok.textContent = "Se connecter"; return; }
      demarrerVue();
    });
    const c = document.getElementById("code"); if (c) c.focus();
  }

  // ---------- Liste des classes (mise à jour en direct)
  async function vueListe() {
    coupe(); courant = null;
    $app.innerHTML = entete("Suivi des classes") + `<main>
      <p class="aide"><span class="live"></span>Mise à jour en direct : une classe apparaît ici dès que son titulaire la transmet.</p>
      <div id="stats"></div><div id="liste"><p class="vide">Chargement…</p></div>
      <a class="btn" href="#/periode" style="display:block;text-align:center;text-decoration:none;margin-top:14px">Fin de période : tableaux comparatifs (PDF)</a>
      <div class="grille" style="margin-top:10px">
        <button class="btn second" id="tout">Télécharger toutes les classes (1 fichier)</button>
        <button class="btn second" id="imp">Importer une sauvegarde</button>
      </div>
      <input type="file" id="fichier" accept=".json,.txt,application/json,text/plain" hidden>
      <button class="btn danger" id="deco">Se déconnecter</button></main>`;
    document.getElementById("deco").addEventListener("click", async () => { A.deconnexion(); await S.deconnecter(); vueConnexion(); });
    document.getElementById("tout").addEventListener("click", toutTelecharger);
    const inp = document.getElementById("fichier");
    document.getElementById("imp").addEventListener("click", () => inp.click());
    inp.addEventListener("change", () => { if (inp.files[0]) importer(inp.files[0]); inp.value = ""; });
    try {
      const { db } = await S.demarrer();
      abonnements.push(db.collection("statuts").onSnapshot((snap) => { statuts = {}; snap.forEach((d) => { statuts[d.id] = d.data(); }); dessinerListe(); },
        (e) => { document.getElementById("liste").innerHTML = erreurAffichee(e); }));
    } catch (e) { document.getElementById("liste").innerHTML = erreurAffichee(e); }
  }
  function dessinerListe() {
    const liste = document.getElementById("liste"); if (!liste) return;
    const nbT = classes.filter((c) => statuts[c.code]).length;
    document.getElementById("stats").innerHTML = `<h2>${nbT} classe${nbT > 1 ? "s" : ""} transmise${nbT > 1 ? "s" : ""} sur ${classes.length}</h2>`;
    let html = "", option = null;
    for (const c of classes) {
      if (c.option !== option) { option = c.option; html += `<h3>${esc(option)}</h3>`; }
      const t = statuts[c.code];
      html += `<a class="carte" href="#/classe/${encodeURIComponent(c.code)}"><span class="etat ${t ? "ok" : "rien"}">${t ? "Transmise" : "—"}</span><b>${esc(c.nom_classe)}</b>
        <small>${t ? `${esc(t.nbEleves)} élève${t.nbEleves > 1 ? "s" : ""} · ${esc(dateFr(t.transmisLe))} · ${esc(t.transmisParNom || "")}${t.importe ? " (import)" : ""}` : "Pas encore transmise"}</small></a>`;
    }
    liste.innerHTML = html;
  }

  // ---------- Une classe : résultats en direct
  async function vueClasse(code) {
    coupe();
    const cl = classes.find((c) => c.code === code); if (!cl) return aller("#/");
    courant = null;
    $app.innerHTML = entete(esc(cl.nom_classe)) + `<main><a class="retour" href="#/">‹ Toutes les classes</a>
      <div id="corps"><p class="vide">Chargement…</p></div>
      <details id="histo" style="margin-top:14px"><summary class="aide" style="cursor:pointer">Versions précédentes de cette classe</summary><div id="histo-liste"></div></details></main>`;
    let histoCharge = false;
    document.getElementById("histo").addEventListener("toggle", (ev) => { if (ev.target.open && !histoCharge) { histoCharge = true; chargerHistorique(code); } });
    try {
      const { db } = await S.demarrer();
      abonnements.push(db.doc("classes/" + code).onSnapshot((doc) => {
        const corps = document.getElementById("corps"); if (!corps) return;
        if (!doc.exists) { corps.innerHTML = `<p class="vide">Cette classe n'a pas encore été transmise.</p>`; return; }
        try { dessinerClasse(cl, doc.data()); } catch (e) { corps.innerHTML = erreurAffichee(e); }
      }, (e) => { document.getElementById("corps").innerHTML = erreurAffichee(e); }));
    } catch (e) { document.getElementById("corps").innerHTML = erreurAffichee(e); }
  }
  function dessinerClasse(cl, d) {
    const els = JSON.parse(d.donnees || "[]");
    const act = M.colonnesActives(els);
    const res = M.calculerRangs(els.map((e) => M.calculerBulletin(cl, e, act)), M.CHAMPS_TOTAUX);
    const eff = M.effectifsParColonne(res, M.CHAMPS_TOTAUX);
    courant = { cl, res, eff, els, d };
    const choix = M.CHAMPS_TOTAUX.filter((c) => res.some((r) => r.rangs[c] != null));
    if (!choix.includes(colChoisie)) colChoisie = choix[choix.length - 1] || null;
    const col = colChoisie;
    const lignes = res.map((r, i) => ({ r, i })).sort((a, b) => {
      const x = col ? a.r.rangs[col] : null, y = col ? b.r.rangs[col] : null;
      const nx = typeof x === "number" ? x : 1e9, ny = typeof y === "number" ? y : 1e9;
      return nx - ny || a.r.eleve.nom.localeCompare(b.r.eleve.nom, "fr", { sensitivity: "base" });
    });
    const corps = document.getElementById("corps");
    corps.innerHTML = `
      <div class="carte"><b>${esc(d.nbEleves)} élève${d.nbEleves > 1 ? "s" : ""}${col ? ` · ${esc(eff[col] != null ? eff[col] : 0)} classé${(eff[col] || 0) > 1 ? "s" : ""}` : ""}</b>
        <small>Transmise le ${esc(dateFr(d.transmisLe))} par ${esc(d.transmisParNom || "")}${d.importe ? " (import)" : ""}</small></div>
      ${choix.length ? `<label for="col">Résultats pour</label><select id="col">${choix.map((c) => `<option value="${c}"${c === col ? " selected" : ""}>${esc(M.LIBELLES_COLONNES[c] || c)}</option>`).join("")}</select>
      <div class="tableau"><table><thead><tr><th class="num">Place</th><th>Nom</th><th class="num">Total</th><th class="num">%</th></tr></thead><tbody>
      ${lignes.map(({ r }) => { const p = r.rangs[col], nc = p === "NC";
        return `<tr><td class="num${nc ? " nc" : ""}">${p == null ? "" : esc(p)}</td><td>${esc(r.eleve.nom)}</td><td class="num">${esc(M.formatNote(r.totaux[col]))}</td><td class="num">${esc(M.formatPourcentage(r.pourcentages[col]))}</td></tr>`; }).join("")}
      </tbody></table></div>` : `<p class="vide">Aucune cote saisie dans cette classe.</p>`}
      <div class="grille">
        <button class="btn" id="imp-tous">Imprimer tous les bulletins</button>
        <button class="btn second" id="imp-cart">Imprimer le cartouche</button>
        <button class="btn second" id="dl">Télécharger la sauvegarde</button>
      </div>`;
    const sel = document.getElementById("col"); if (sel) sel.addEventListener("change", () => { colChoisie = sel.value; dessinerClasse(cl, d); });
    document.getElementById("imp-tous").addEventListener("click", () => imprimer(res.map((_, i) => i), true));
    document.getElementById("imp-cart").addEventListener("click", () => imprimer([], true));
    document.getElementById("dl").addEventListener("click", () => telecharger(`sauvegarde_${cl.code}_${jour()}.json`, sauvegarde({ [cl.code]: els }, cl.code)));
  }
  function imprimer(indices, avecCartouche) {
    const { cl, res, eff } = courant;
    const urls = { drapeau: new URL("drapeau.png", location.href).href, embleme: new URL("embleme.png", location.href).href };
    const feuilles = indices.map((i) => B.feuille(cl, res[i], ETAB, eff, urls));
    if (avecCartouche) feuilles.push(B.htmlCartouche(cl, res, ETAB));
    ouvrirDocument(B.documentBulletins(feuilles, (indices.length ? "Bulletins_" : "Cartouche_") + nomFichier(cl.nom_classe), B.cssPour(cl)));
  }
  async function chargerHistorique(code) {
    const zone = document.getElementById("histo-liste"); zone.innerHTML = `<p class="vide">Chargement…</p>`;
    try {
      const { db } = await S.demarrer();
      const snap = await db.collection("classes/" + code + "/historique").orderBy("transmisLe", "desc").limit(10).get();
      const versions = []; snap.forEach((d) => versions.push(d.data()));
      if (!versions.length) { zone.innerHTML = `<p class="vide">Aucune version.</p>`; return; }
      zone.innerHTML = versions.map((v, i) => `<div class="carte"><b>${esc(dateFr(v.transmisLe))}</b><small>${esc(v.nbEleves)} élèves · ${esc(v.transmisParNom || "")}</small>
        <button class="btn second" data-v="${i}" style="margin:8px 0 0;min-height:40px">Télécharger cette version</button></div>`).join("");
      zone.querySelectorAll("button[data-v]").forEach((b) => b.addEventListener("click", () => {
        const v = versions[Number(b.dataset.v)]; telecharger(`sauvegarde_${code}_${jour()}_version${Number(b.dataset.v) + 1}.json`, sauvegarde({ [code]: JSON.parse(v.donnees) }, code));
      }));
    } catch (e) { zone.innerHTML = erreurAffichee(e); }
  }

  // ---------- Toutes les classes dans un seul fichier / import d'une sauvegarde reçue
  async function toutTelecharger() {
    try {
      const { db } = await S.demarrer(), snap = await db.collection("classes").get(), eleves = {};
      snap.forEach((doc) => { try { eleves[doc.id] = JSON.parse(doc.data().donnees); } catch (e) { /* ignoré */ } });
      if (!Object.keys(eleves).length) return alert("Aucune classe transmise pour l'instant.");
      telecharger(`sauvegarde_toutes_les_classes_${jour()}.json`, sauvegarde(eleves, null));
    } catch (e) { alert(S.messageErreur(e)); }
  }
  function importer(fichier) {
    const lecteur = new FileReader();
    lecteur.onload = async () => {
      try {
        const d = JSON.parse(lecteur.result);
        if (!d || d.application !== "bulletins-scolaires" || !d.eleves || typeof d.eleves !== "object") throw new Error("Ce fichier n'est pas une sauvegarde de cette application.");
        const items = Object.entries(d.eleves).filter(([code, l]) => Array.isArray(l) && l.length && classes.some((c) => c.code === code));
        if (!items.length) throw new Error("Cette sauvegarde ne contient aucune classe reconnue.");
        const noms = items.map(([code, l]) => `${classes.find((c) => c.code === code).nom_classe} (${l.length})`).join("\n");
        if (!confirm(`Publier ces classes comme transmises ?\n\n${noms}\n\nElles remplaceront la version actuelle (l'ancienne reste dans l'historique).`)) return;
        const s = A.session();
        for (const [code, l] of items) await S.publier({ code, nom: classes.find((c) => c.code === code).nom_classe, eleves: l, par: { id: s.id, nom: s.nom + " (import)" }, hash: S.empreinte(JSON.stringify(l)) }, true);
        toast(items.length + " classe" + (items.length > 1 ? "s publiées" : " publiée"));
      } catch (e) { alert(e instanceof SyntaxError ? "Ce fichier n'est pas une sauvegarde de cette application." : (e.message || S.messageErreur(e))); }
    };
    lecteur.readAsText(fichier);
  }


  // ---------- Fin de période : tableaux comparatifs (analyse, synoptique, performance par branche) en PDF
  const T = window.Tableaux;
  let periode = { donnees: {}, abandons: {}, col: null, mesure: "moyenne", dispo: [] };
  const donneesTableaux = () => T.calculer({ M, classes, donnees: periode.donnees, col: periode.col, abandons: periode.abandons, mesure: periode.mesure,
    annee: ETAB.annee_scolaire, ecole: `${ETAB.nom} · Code ${ETAB.code_ecole}` });
  const COMPOSANTES = (col) => ({ TOT_S1: M.SEMESTRES.S1, TOT_S2: M.SEMESTRES.S2, TOT_GEN: M.COLONNES_NOTES }[col] || [col]);

  async function vuePeriode() {
    coupe(); courant = null;
    $app.innerHTML = entete("Fin de période") + `<main><a class="retour" href="#/">‹ Toutes les classes</a>
      <p class="aide">Tableaux comparatifs des classes transmises, à télécharger en PDF. Choisissez la période : les tableaux se calculent à partir des classes déjà transmises.</p>
      <div id="p-corps"><p class="vide">Chargement des classes…</p></div></main>`;
    const corps = document.getElementById("p-corps");
    try {
      const { db } = await S.demarrer(), snap = await db.collection("classes").get();
      periode.donnees = {};
      snap.forEach((doc) => { try { periode.donnees[doc.id] = JSON.parse(doc.data().donnees || "[]"); } catch (e) { /* ignoré */ } });
      const ab = await db.doc("reglages/abandons").get();
      periode.abandons = ab.exists ? (ab.data().valeurs || {}) : {};
    } catch (e) { corps.innerHTML = erreurAffichee(e); return; }
    const dispo = new Set();
    for (const code in periode.donnees) {
      if (!classes.some((c) => c.code === code)) continue;
      const act = M.colonnesActives(periode.donnees[code]);
      for (const [col] of T.COLONNES) if (COMPOSANTES(col).every((c) => act.includes(c))) dispo.add(col);
    }
    periode.dispo = T.COLONNES.map((c) => c[0]).filter((c) => dispo.has(c));
    if (!periode.dispo.length) { corps.innerHTML = `<p class="vide">Aucune classe transmise avec des cotes pour l'instant.</p>`; return; }
    if (!periode.dispo.includes(periode.col)) periode.col = ["P4", "P3", "P2", "P1"].find((c) => periode.dispo.includes(c)) || periode.dispo[periode.dispo.length - 1];
    dessinerPeriode();
  }
  function dessinerPeriode() {
    const d = donneesTableaux(), corps = document.getElementById("p-corps");
    const classesAvecDonnees = classes.filter((c) => periode.donnees[c.code] && periode.donnees[c.code].length);
    const labels = T.NIVEAUX.flatMap((n) => n.filter((c) => c[1] && periode.donnees[c[1]] && periode.donnees[c[1]].length).map((c) => c[0]));
    const ab = (lab, k) => (periode.abandons[periode.col + "|" + lab] || {})[k] || 0;
    corps.innerHTML = `
      <label for="p-col">Période</label>
      <select id="p-col">${periode.dispo.map((c) => `<option value="${c}"${c === periode.col ? " selected" : ""}>${esc(T.COLONNES.find((x) => x[0] === c)[2])}</option>`).join("")}</select>
      <label for="p-mes">Mesure du tableau « performance par branche »</label>
      <select id="p-mes"><option value="moyenne"${periode.mesure === "moyenne" ? " selected" : ""}>Moyenne de la classe par cours (% des points)</option>
        <option value="reussite"${periode.mesure === "reussite" ? " selected" : ""}>Taux de réussite par cours (% d'élèves à 50 % et plus)</option></select>
      ${d.manquantes.length ? `<div class="carte"><b>Lignes vides dans les tableaux</b><small>${esc(d.manquantes.join(" · "))}</small></div>` : ""}
      <div class="grille" style="margin:12px 0">
        <button class="btn" id="p-pdf">Télécharger les 3 tableaux (PDF)</button>
        <button class="btn second" id="p-pdf1">Analyse des résultats (PDF)</button>
        <button class="btn second" id="p-pdf2">Tableau synoptique (PDF)</button>
        <button class="btn second" id="p-pdf3">Performance par branche (PDF)</button>
      </div>
      <details id="p-ab" class="abs" style="margin-bottom:12px"><summary class="aide" style="cursor:pointer">Abandons (saisie à la main pour le tableau synoptique)</summary>
        <p class="aide">Nombre d'élèves qui ont abandonné, par classe, pour <b>${esc(T.COLONNES.find((x) => x[0] === periode.col)[2])}</b>. Ils ne sont plus comptés comme « non classés ».</p>
        ${labels.map((l) => `<div><b style="display:inline-block;min-width:48px">${esc(l)}</b> G <input inputmode="numeric" data-ab="${esc(l)}|g" value="${ab(l, "g")}"> F <input inputmode="numeric" data-ab="${esc(l)}|f" value="${ab(l, "f")}"></div>`).join("")}
        <button class="btn second" id="p-ab-ok" style="margin-top:8px">Enregistrer les abandons</button></details>
      <h2>Aperçu</h2>${T.html(d)}
      <h2>Bulletins des classes</h2>
      <p class="aide">Chaque bouton ouvre les bulletins et le cartouche de la classe ; dans la fenêtre d'impression, choisissez « Enregistrer au format PDF ».</p>
      ${classesAvecDonnees.map((c) => `<button class="btn second" data-b="${esc(c.code)}" style="margin-top:6px">${esc(c.nom_classe)}</button>`).join("")}`;
    document.getElementById("p-col").addEventListener("change", (ev) => { periode.col = ev.target.value; dessinerPeriode(); });
    document.getElementById("p-mes").addEventListener("change", (ev) => { periode.mesure = ev.target.value; dessinerPeriode(); });
    const pdf = (quoi, suffixe) => () => {
      const dd = donneesTableaux();
      telecharger(`${suffixe}_${nomFichier(dd.libelleColonne)}_${nomFichier(dd.annee)}.pdf`, T.pdf(dd, { quoi }), "application/pdf");
    };
    document.getElementById("p-pdf").addEventListener("click", pdf(["analyse", "synoptique", "performance"], "Tableaux"));
    document.getElementById("p-pdf1").addEventListener("click", pdf(["analyse"], "Analyse_des_resultats"));
    document.getElementById("p-pdf2").addEventListener("click", pdf(["synoptique"], "Tableau_synoptique"));
    document.getElementById("p-pdf3").addEventListener("click", pdf(["performance"], "Performance_par_branche"));
    document.getElementById("p-ab-ok").addEventListener("click", async () => {
      const entier = (v) => Math.max(0, Math.floor(Number(String(v).trim()) || 0));
      document.querySelectorAll("#p-ab input[data-ab]").forEach((inp) => {
        const [lab, k] = inp.dataset.ab.split("|"), cle = periode.col + "|" + lab;
        periode.abandons[cle] = Object.assign({ g: 0, f: 0 }, periode.abandons[cle]); periode.abandons[cle][k] = entier(inp.value);
      });
      try {
        const { db } = await S.demarrer(), s = A.session();
        await db.doc("reglages/abandons").set({ valeurs: periode.abandons, majPar: s ? s.id : "" });
        toast("Abandons enregistrés"); const ouvert = document.getElementById("p-ab").open; dessinerPeriode(); document.getElementById("p-ab").open = ouvert;
      } catch (e) { alert(S.messageErreur(e)); }
    });
    corps.querySelectorAll("button[data-b]").forEach((b) => b.addEventListener("click", () => imprimerClasse(b.dataset.b)));
  }
  function imprimerClasse(code) {
    const cl = classes.find((c) => c.code === code), els = periode.donnees[code]; if (!cl || !els) return;
    const act = M.colonnesActives(els), res = M.calculerRangs(els.map((e) => M.calculerBulletin(cl, e, act)), M.CHAMPS_TOTAUX);
    courant = { cl, res, eff: M.effectifsParColonne(res, M.CHAMPS_TOTAUX) };
    imprimer(res.map((_, i) => i), true);
  }

  // ---------- Démarrage
  let pret = false;
  function demarrerVue() {
    pret = true;
    const [, a, b] = location.hash.split("/").map((p) => decodeURIComponent(p || ""));
    return a === "classe" && b ? vueClasse(b) : a === "periode" ? vuePeriode() : vueListe();
  }
  async function init() {
    try { classes = await (await fetch("classes.json")).json(); } catch (e) { $app.innerHTML = entete("Administration") + `<main><p class="msg">Impossible de charger la liste des classes.</p></main>`; return; }
    if (!A.actif()) { $app.innerHTML = entete("Administration") + `<main><p class="aide">La connexion par code n'est pas activée (acces.js) : cette page est indisponible.</p></main>`; return; }
    if (!S.configOk()) { $app.innerHTML = entete("Administration") + `<main><p class="aide">La transmission en ligne n'est pas encore activée (firebase-config.js).</p></main>`; return; }
    if (!navigator.onLine) { $app.innerHTML = entete("Administration") + `<main><p class="aide">Cette page a besoin d'internet.</p></main>`; return; }
    const s = A.session();
    if (!s || s.role !== "admin") return vueConnexion();
    let u = null; try { u = await S.utilisateur(); } catch (e) { /* hors ligne */ }
    if (!u) return vueConnexion("Confirmez votre code pour la connexion en ligne.");
    demarrerVue();
  }
  window.addEventListener("hashchange", () => { const s = A.session(); if (pret && s && s.role === "admin") demarrerVue(); });
  init();
})();
