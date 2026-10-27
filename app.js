// Interface de l'application : choix de la classe, élèves, saisie des cotes. Données dans le téléphone (localStorage).
(function () {
  "use strict";
  const M = window.Moteur, CLE = "bulletins_v1", $app = document.getElementById("app");
  let classes = [], etat = { classe: null, eleves: {} };

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const classe = () => classes.find((c) => c.code === etat.classe);
  const eleves = () => (etat.eleves[etat.classe] = (etat.eleves[etat.classe] || []).sort((x, y) => x.nom.localeCompare(y.nom, "fr", { sensitivity: "base" })));
  const trouver = (num) => eleves().find((e) => e.numero_perm === num);

  function charger() {
    try { const t = localStorage.getItem(CLE); if (t) etat = Object.assign(etat, JSON.parse(t)); } catch (e) { /* mémoire inaccessible */ }
  }
  function sauver() {
    try {
      const avant = localStorage.getItem(CLE);
      if (avant) localStorage.setItem(CLE + "_prec", avant); // copie automatique : permet d'annuler la dernière modification
      localStorage.setItem(CLE, JSON.stringify(etat)); return true;
    }
    catch (e) { alert("Enregistrement impossible : la mémoire du navigateur est pleine ou bloquée."); return false; }
  }
  let minuterie;
  function toast(msg) {
    const t = document.getElementById("toast"); t.textContent = msg; t.className = "on";
    clearTimeout(minuterie); minuterie = setTimeout(() => (t.className = ""), 2200);
  }
  const aller = (h) => { location.hash = h; };

  function page(titre, corps, onglet) {
    const c = classe();
    const nav = c ? `<nav class="bas">${[["eleves", "Élèves"], ["cotes", "Cotes"], ["bulletins", "Bulletins"], ["plus", "Plus"]]
      .map(([k, l]) => `<a href="#/${k}" class="${onglet === k ? "actif" : ""}">${l}</a>`).join("")}</nav>` : "";
    $app.innerHTML = `<header class="haut"><p>${esc(window.ETABLISSEMENT.nom)} · ${esc(window.ETABLISSEMENT.annee_scolaire)}</p><h1>${esc(c ? c.nom_classe : titre)}</h1></header><main>${corps}</main>${nav}`;
    window.scrollTo(0, 0);
  }

  // ---------- Choix de la classe (une seule fois)
  function vueChoix() {
    const options = [...new Set(classes.map((c) => c.option))];
    const corps = `<h2>Quelle est votre classe ?</h2>
      <p class="aide">Vous ne verrez que cette classe : vos cotes sont ainsi protégées contre toute modification par erreur dans une autre classe. Vous pourrez la changer plus tard dans « Ma classe ».</p>` +
      options.map((o) => `<h3>${esc(o)}</h3>` + classes.filter((c) => c.option === o)
        .map((c) => `<button class="carte" data-classe="${esc(c.code)}"><b>${esc(c.nom_classe)}</b></button>`).join("")).join("");
    page("Bulletins scolaires", corps, "");
    $app.querySelectorAll("[data-classe]").forEach((b) => b.addEventListener("click", () => {
      const c = classes.find((x) => x.code === b.dataset.classe);
      if (!confirm(`Travailler dans la classe « ${c.nom_classe} » ?`)) return;
      etat.classe = c.code; if (sauver()) aller("#/eleves");
    }));
  }

  // ---------- Élèves
  const initiales = (nom) => nom.trim().split(/\s+/).slice(0, 2).map((m) => m[0]).join("").toUpperCase();
  function vueEleves() {
    const liste = eleves(), g = liste.filter((e) => e.sexe === "M").length;
    const rappel = liste.length && !etat.sauvegarde ? `<p class="bandeau">Pensez à sauvegarder vos données : onglet « Plus ».</p>` : "";
    const corps = `${rappel}<div class="stats"><div><b>${liste.length}</b><span>élève${liste.length > 1 ? "s" : ""}</span></div><div><b>${g}</b><span>garçons</span></div><div><b>${liste.length - g}</b><span>filles</span></div></div>
      <a class="btn" href="#/eleves/nouveau" style="text-decoration:none;text-align:center">Ajouter un élève</a>` +
      (liste.length ? `<input type="search" id="rech" class="recherche" placeholder="Rechercher un élève…" aria-label="Rechercher un élève"><div id="liste">` + liste.map((e) => `<a class="carte eleve" data-n="${esc(e.nom.toLowerCase())}" href="#/eleves/${encodeURIComponent(e.numero_perm)}" style="text-decoration:none">
        <span class="avatar ${e.sexe === "F" ? "f" : ""}">${esc(initiales(e.nom))}</span><span><b>${esc(e.nom)}</b><small>${esc(e.sexe)} · matricule ${esc(e.numero_perm)}</small></span></a>`).join("") + "</div>"
        : `<p class="vide">Aucun élève pour l'instant. Touchez « Ajouter un élève » pour commencer.</p>`);
    page("", `<h2>Mes élèves</h2>` + corps, "eleves");
    const r = document.getElementById("rech");
    if (r) r.addEventListener("input", () => { const q = r.value.trim().toLowerCase(); $app.querySelectorAll(".eleve").forEach((el) => { el.style.display = el.dataset.n.includes(q) ? "" : "none"; }); });
  }

  function vueFormEleve(num) {
    const e = num === "nouveau" ? null : trouver(num);
    if (num !== "nouveau" && !e) return aller("#/eleves");
    const v = (k) => esc(e ? e[k] : "");
    const corps = `<a class="retour" href="#/eleves">‹ Élèves</a><h2>${e ? "Modifier l'élève" : "Nouvel élève"}</h2>
      <form id="f" novalidate>
        <label for="nom">Nom complet</label><input id="nom" value="${v("nom")}" autocomplete="off">
        <label for="sexe">Sexe</label><select id="sexe"><option value="">Choisir</option>
          <option value="M"${e && e.sexe === "M" ? " selected" : ""}>M (garçon)</option><option value="F"${e && e.sexe === "F" ? " selected" : ""}>F (fille)</option></select>
        <label for="dn">Date de naissance</label><input id="dn" type="date" value="${v("date_naissance")}">
        <label for="ln">Lieu de naissance</label><input id="ln" value="${v("lieu_naissance")}" autocomplete="off">
        <label for="mat">Matricule (5 chiffres)</label><input id="mat" inputmode="numeric" maxlength="5" value="${v("numero_perm")}" placeholder="ex. 34567">
        <p class="msg" id="err" role="alert"></p>
        <button class="btn" type="submit">Enregistrer</button>
        ${e ? '<button class="btn danger" type="button" id="sup">Supprimer cet élève</button>' : ""}
      </form>`;
    page("", corps, "eleves");
    const f = document.getElementById("f"), err = document.getElementById("err");
    f.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const val = { nom: f.nom.value.trim(), sexe: f.sexe.value, date_naissance: f.dn.value, lieu_naissance: f.ln.value.trim(), numero_perm: f.mat.value.trim() };
      const m = [];
      if (!val.nom) m.push("Le nom est obligatoire.");
      if (!val.sexe) m.push("Choisissez le sexe (M ou F).");
      if (!/^\d{5}$/.test(val.numero_perm)) m.push("Le matricule doit avoir exactement 5 chiffres.");
      else if (eleves().some((x) => x !== e && x.numero_perm === val.numero_perm)) m.push("Ce matricule existe déjà dans la classe.");
      if (m.length) { err.textContent = m.join(" "); return; }
      if (e) Object.assign(e, val); else eleves().push(Object.assign(val, { notes: {} }));
      if (sauver()) { toast(e ? "Élève modifié" : "Élève ajouté"); aller("#/eleves"); }
    });
    const sup = document.getElementById("sup");
    if (sup) sup.addEventListener("click", () => {
      if (!confirm(`Supprimer ${e.nom} et toutes ses cotes ? Cette action est définitive.`)) return;
      etat.eleves[etat.classe] = eleves().filter((x) => x !== e);
      if (sauver()) { toast("Élève supprimé"); aller("#/eleves"); }
    });
  }

  // ---------- Cotes
  const nbCases = (c, col) => c.groupes.reduce((a, g) => a + g.branches.filter((b) => M.maxBranche(b, col)).length, 0);
  const nbVides = (c, e, col) => M.notesManquantes(c, e, [col]).length;

  function vueCotes() {
    const c = classe(), liste = eleves();
    const cartes = M.COLONNES_NOTES.map((col) => {
      const complets = liste.filter((e) => nbVides(c, e, col) === 0).length;
      const cls = !liste.length ? "rien" : complets === liste.length ? "ok" : complets ? "partiel" : "rien";
      return `<a class="carte" href="#/cotes/${col}" style="text-decoration:none"><span class="etat ${cls}">${complets} / ${liste.length}</span><b>${esc(M.LIBELLES_COLONNES[col])}</b><small>élèves complets</small></a>`;
    }).join("");
    page("", `<h2>Saisie des cotes</h2><p class="aide">Choisissez la période ou l'examen à saisir.</p>${cartes}`, "cotes");
  }

  function vueListeCotes(col) {
    const c = classe(), total = nbCases(c, col);
    const corps = `<a class="retour" href="#/cotes">‹ Cotes</a><h2>${esc(M.LIBELLES_COLONNES[col])}</h2>` +
      (eleves().length ? eleves().map((e) => {
        const reste = nbVides(c, e, col), faites = total - reste;
        const cls = reste === 0 ? "ok" : faites ? "partiel" : "rien";
        return `<a class="carte" href="#/cotes/${col}/${encodeURIComponent(e.numero_perm)}" style="text-decoration:none"><span class="etat ${cls}">${faites} / ${total}</span><b>${esc(e.nom)}</b></a>`;
      }).join("") : `<p class="vide">Ajoutez d'abord des élèves dans l'onglet « Élèves ».</p>`);
    page("", corps, "cotes");
  }

  function vueFormCotes(col, num) {
    const c = classe(), e = trouver(num);
    if (!e) return aller("#/cotes/" + col);
    let dernierDomaine = null, html = "";
    c.groupes.forEach((g) => {
      const branches = g.branches.filter((b) => M.maxBranche(b, col));
      if (!branches.length) return;
      if (g.domaine && g.domaine !== dernierDomaine) { html += `<h3>${esc(g.domaine)}</h3>`; dernierDomaine = g.domaine; }
      html += `<h3>${esc(g.nom)}</h3>` + branches.map((b, i) => {
        const brut = ((e.notes || {})[b.nom] || {})[col];
        return `<div class="ligne-cote"><label for="c-${g.nom}-${i}"><span>${esc(b.nom)}</span> <em>/ ${M.formatG(M.maxBranche(b, col))}</em></label>
          <div class="saisie-cote"><input id="c-${g.nom}-${i}" data-b="${esc(b.nom)}" data-max="${M.maxBranche(b, col)}" inputmode="decimal" autocomplete="off" placeholder="cote ou -" value="${brut == null ? "" : esc(M.formatNote(brut))}"><button type="button" class="tiret" data-tiret="c-${g.nom}-${i}" aria-label="Non étudié (tiret)">-</button></div></div><p class="msg" data-m="${esc(b.nom)}"></p>`;
      }).join("");
    });
    page("", `<a class="retour" href="#/cotes/${col}">‹ ${esc(M.LIBELLES_COLONNES[col])}</a><h2>${esc(e.nom)}</h2>
      <p class="aide">Toutes les cases sont obligatoires : entrez une cote (de 0 au maximum indiqué) ou <b>-</b> si l'élève n'a pas étudié ce cours.</p>
      <form id="f" novalidate>${html}<button class="btn" type="submit" data-suite="1">Enregistrer et passer au suivant</button><button class="btn second" type="submit">Enregistrer les cotes</button></form>`, "cotes");
    // Le clavier numérique du téléphone n'a pas de tiret : ce bouton écrit (ou efface) « - » dans la case
    document.getElementById("f").addEventListener("click", (ev) => {
      const b = ev.target.closest("button[data-tiret]");
      if (!b) return;
      const inp = document.getElementById(b.dataset.tiret);
      inp.value = inp.value.trim() === "-" ? "" : "-";
      inp.focus();
    });
    document.getElementById("f").addEventListener("submit", (ev) => {
      ev.preventDefault();
      const suite = ev.submitter && ev.submitter.dataset.suite;
      const nouvelles = {}; let erreurs = 0, premier = null;
      $app.querySelectorAll("input[data-b]").forEach((inp) => {
        const [val, msg] = M.validerCote(inp.value, Number(inp.dataset.max));
        const zone = $app.querySelector(`[data-m="${CSS.escape(inp.dataset.b)}"]`);
        inp.classList.toggle("invalide", !!msg); zone.textContent = msg ? msg : "";
        if (msg) { erreurs++; premier = premier || inp; } else nouvelles[inp.dataset.b] = val;
      });
      if (erreurs) { toast(`${erreurs} case${erreurs > 1 ? "s" : ""} à corriger`); premier.focus(); return; }
      e.notes = e.notes || {};
      for (const nom in nouvelles) (e.notes[nom] = e.notes[nom] || {})[col] = nouvelles[nom];
      if (sauver()) {
        const liste = eleves(), k = liste.indexOf(e) + 1;
        if (suite && k < liste.length) { toast("Cotes enregistrées"); aller("#/cotes/" + col + "/" + encodeURIComponent(liste[k].numero_perm)); }
        else { toast(suite ? "Dernier élève : saisie terminée" : "Cotes enregistrées"); aller("#/cotes/" + col); }
      }
    });
  }

  // ---------- Bulletins
  const formatPret = () => true;
  function resultats() {
    const c = classe(), liste = eleves(), actives = M.colonnesActives(liste);
    const res = M.calculerRangs(liste.map((e) => M.calculerBulletin(c, e, actives)), M.CHAMPS_TOTAUX);
    return { res, eff: M.effectifsParColonne(res, M.CHAMPS_TOTAUX) };
  }
  const nomFichier = (t) => t.replace(/[\\/:*?"<>|]+/g, " ").trim().replace(/\s+/g, "_");
  function ouvrirDocument(html) {
    const w = window.open(URL.createObjectURL(new Blob([html], { type: "text/html" })), "_blank");
    if (!w) alert("Le navigateur a bloqué l'ouverture. Autorisez les fenêtres pour ce site, puis réessayez.");
  }
  function ouvrirBulletins(indices, avecCartouche) {
    const c = classe(), { res, eff } = resultats();
    const urls = { drapeau: new URL("drapeau.png", location.href).href, embleme: new URL("embleme.png", location.href).href };
    const feuilles = indices.map((i) => Bulletin.feuille(c, res[i], window.ETABLISSEMENT, eff, urls));
    if (avecCartouche) feuilles.push(Bulletin.htmlCartouche(c, res, window.ETABLISSEMENT));
    // Chrome propose le titre de la page comme nom du fichier PDF
    const titre = indices.length === 1 && !avecCartouche ? "Bulletin_" + nomFichier(res[indices[0]].eleve.nom) + "_" + nomFichier(c.nom_classe)
      : (indices.length ? "Bulletins_" : "Cartouche_") + nomFichier(c.nom_classe);
    ouvrirDocument(Bulletin.documentBulletins(feuilles, titre, Bulletin.cssPour(c)));
  }
  const CSS_LISTE = "body{font:12px Arial,sans-serif;margin:0}.sheet{padding:12mm}h1{font-size:15px;margin:0 0 2px}p{margin:0 0 8px;color:#444}table{border-collapse:collapse;width:100%}th,td{border:1px solid #000;padding:4px 6px;text-align:left}th{background:#e8edf3}td.n{text-align:center}";
  function vueClassement(colonne) {
    const c = classe(), { res } = resultats(), cols = M.CHAMPS_TOTAUX.filter((k) => res.some((r) => M.estNombre(r.totaux[k])));
    if (!res.length || !cols.length) return page("", `<a class="retour" href="#/bulletins">‹ Bulletins</a><h2>Classement</h2><p class="vide">Saisissez d'abord des cotes pour voir le classement.</p>`, "bulletins");
    const col = cols.includes(colonne) ? colonne : cols[cols.length - 1];
    const lib = (k) => M.LIBELLES_COLONNES[k] || { TOT_S1: "Total du 1er semestre", TOT_S2: "Total du 2e semestre", TOT_GEN: "Total général" }[k];
    const lignes = res.filter((r) => M.estNombre(r.totaux[col])).sort((x, y) => x.rangs[col] - y.rangs[col]);
    const dec = (r) => (col === "TOT_GEN" && r.complet ? { PASSE: "Passe", DOUBLE: "Double", REPECHAGE: "Repêchage" }[M.getDecision(r.totaux, r.maxima_eleve.TOT_GEN).code] : "");
    const tr = (r) => `<tr><td class="n">${r.rangs[col]}</td><td>${esc(r.eleve.nom)}</td><td class="n">${M.formatNote(r.totaux[col])} / ${M.formatG(r.maxima_eleve[col])}</td><td class="n">${M.formatPourcentage(r.pourcentages[col])}</td>${col === "TOT_GEN" ? `<td>${dec(r)}</td>` : ""}</tr>`;
    const tete = `<tr><th>Place</th><th>Élève</th><th>Total</th><th>%</th>${col === "TOT_GEN" ? "<th>Décision</th>" : ""}</tr>`;
    page("", `<a class="retour" href="#/bulletins">‹ Bulletins</a><h2>Classement de la classe</h2>
      <select id="colsel" aria-label="Période">${cols.map((k) => `<option value="${k}"${k === col ? " selected" : ""}>${esc(lib(k))}</option>`).join("")}</select>
      ${lignes.map((r) => `<div class="carte rang"><span class="place">${r.rangs[col]}</span><span><b>${esc(r.eleve.nom)}</b><small>${M.formatNote(r.totaux[col])} / ${M.formatG(r.maxima_eleve[col])} · ${M.formatPourcentage(r.pourcentages[col])}${dec(r) ? " · " + dec(r) : ""}</small></span></div>`).join("")}
      <button class="btn" id="pdfliste">Enregistrer la liste en PDF</button>`, "bulletins");
    document.getElementById("colsel").addEventListener("change", (ev) => aller("#/classement/" + ev.target.value));
    document.getElementById("pdfliste").addEventListener("click", () => ouvrirDocument(Bulletin.documentBulletins(
      [`<main class="sheet"><h1>${esc(window.ETABLISSEMENT.nom)} — ${esc(c.nom_classe)}</h1><p>${esc(lib(col))} · Année scolaire ${esc(window.ETABLISSEMENT.annee_scolaire)}</p><table>${tete}${lignes.map(tr).join("")}</table></main>`],
      "Classement_" + nomFichier(c.nom_classe) + "_" + col, CSS_LISTE)));
  }
  function vueBulletins() {
    const liste = eleves();
    const corps = liste.length
      ? `<p class="aide">Chaque bouton ouvre le document à l'écran. Touchez ensuite <b>« Enregistrer en PDF »</b> puis choisissez <b>« Enregistrer au format PDF »</b> : le fichier va dans les Téléchargements, déjà nommé.</p>
         <button class="btn" id="tous">Tous les bulletins en un seul PDF</button>
         <a class="btn second" href="#/classement" style="text-decoration:none;text-align:center">Classement de la classe</a>
         <button class="btn second" id="cart">Cartouche de la proclamation</button>
         <h3>Un PDF par élève</h3>` + liste.map((e, i) => `<button class="carte eleve" data-i="${i}"><span class="avatar ${e.sexe === "F" ? "f" : ""}">${esc(initiales(e.nom))}</span><span><b>${esc(e.nom)}</b><small>Ouvrir le bulletin</small></span></button>`).join("")
      : `<p class="vide">Ajoutez d'abord des élèves et leurs cotes.</p>`;
    page("", `<h2>Bulletins PDF</h2>${corps}`, "bulletins");
    $app.querySelectorAll("[data-i]").forEach((b) => b.addEventListener("click", () => ouvrirBulletins([Number(b.dataset.i)])));
    const t = document.getElementById("tous"); if (t) t.addEventListener("click", () => ouvrirBulletins(liste.map((_, i) => i), true));
    const k = document.getElementById("cart"); if (k) k.addEventListener("click", () => ouvrirBulletins([], true));
  }

  // ---------- Sauvegarde / restauration
  const jourFr = (iso) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  function contenuSauvegarde() {
    const eleves = {};
    for (const code in etat.eleves) if (etat.eleves[code].length) eleves[code] = etat.eleves[code];
    return JSON.stringify({ application: "bulletins-scolaires", version: 1, date: new Date().toISOString(), ecole: window.ETABLISSEMENT.code_ecole, classe: etat.classe, eleves }, null, 1);
  }
  const nomSauvegarde = () => `sauvegarde_${etat.classe}_${new Date().toISOString().slice(0, 10)}.json`;
  function marquerSauvegarde() { etat.sauvegarde = new Date().toISOString(); sauver(); }
  function enregistrerFichier() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([contenuSauvegarde()], { type: "application/json" })); a.download = nomSauvegarde();
    document.body.appendChild(a); a.click(); a.remove(); marquerSauvegarde();
    toast("Sauvegarde enregistrée dans les Téléchargements");
  }
  async function envoyerSauvegarde() {
    const f = new File([contenuSauvegarde()], nomSauvegarde(), { type: "text/plain" });
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      try { await navigator.share({ files: [f], title: "Sauvegarde des bulletins" }); marquerSauvegarde(); toast("Sauvegarde envoyée"); rendre(); }
      catch (e) { if (e.name !== "AbortError") enregistrerFichier(); }
    } else enregistrerFichier();
  }
  function verifierSauvegarde(d) {
    if (!d || d.application !== "bulletins-scolaires" || !d.eleves || typeof d.eleves !== "object") throw new Error("Ce fichier n'est pas une sauvegarde de cette application.");
    let total = 0;
    for (const code in d.eleves) {
      if (!classes.some((c) => c.code === code)) throw new Error("La sauvegarde contient une classe inconnue : " + code);
      const liste = d.eleves[code], vus = new Set();
      if (!Array.isArray(liste)) throw new Error("Sauvegarde abîmée (liste d'élèves illisible).");
      for (const e of liste) {
        if (!e || typeof e.nom !== "string" || !e.nom.trim() || typeof e.numero_perm !== "string" || vus.has(e.numero_perm)) throw new Error("Sauvegarde abîmée (élève invalide ou matricule en double).");
        vus.add(e.numero_perm);
        if (e.notes != null && typeof e.notes !== "object") throw new Error("Sauvegarde abîmée (cotes illisibles).");
        for (const b in e.notes || {}) for (const col in e.notes[b]) { try { M.lireNote(e.notes[b], col); } catch (x) { throw new Error("Sauvegarde abîmée (cote illisible : " + b + ")."); } }
        total++;
      }
    }
    return { nbClasses: Object.keys(d.eleves).length, total };
  }
  async function restaurer(fichier) {
    try {
      const d = JSON.parse(await fichier.text()), { nbClasses, total } = verifierSauvegarde(d);
      if (!confirm(`Remplacer les données actuelles par cette sauvegarde (${total} élève${total > 1 ? "s" : ""}, ${nbClasses} classe${nbClasses > 1 ? "s" : ""}${d.date ? ", du " + jourFr(d.date) : ""}) ?`)) return;
      for (const code in d.eleves) etat.eleves[code] = d.eleves[code];
      if (!classe() && d.classe && classes.some((c) => c.code === d.classe)) etat.classe = d.classe;
      if (sauver()) { toast("Sauvegarde restaurée"); rendre(); }
    } catch (e) { alert(e instanceof SyntaxError ? "Ce fichier n'est pas une sauvegarde de cette application." : e.message); }
  }
  function annulerDerniere() {
    const prec = localStorage.getItem(CLE + "_prec");
    if (!prec || !confirm("Annuler la dernière modification (ajout, suppression ou saisie de cotes) ?")) return;
    try { const avant = JSON.parse(prec), actuel = localStorage.getItem(CLE); etat = Object.assign({ classe: null, eleves: {} }, avant); localStorage.setItem(CLE, JSON.stringify(etat)); localStorage.setItem(CLE + "_prec", actuel); toast("Dernière modification annulée"); rendre(); }
    catch (e) { alert("Impossible d'annuler."); }
  }
  const sauvegardeRecenteHtml = () => etat.sauvegarde
    ? `<p class="aide">Dernière sauvegarde : ${jourFr(etat.sauvegarde)}.</p>`
    : `<p class="aide" style="color:var(--alerte)">Aucune sauvegarde faite pour l'instant. Pensez à en envoyer une régulièrement.</p>`;

  // ---------- Ma classe
  let donneesOuvertes = false;
  function vueClasse() {
    const c = classe();
    page("", `<h2>Plus</h2>
      <div class="carte"><b>Ma classe</b><small>${esc(c.nom_classe)} · ${esc(c.option)}</small></div>
      <button class="btn second" id="chg">Changer de classe</button>
      <details class="donnees"${donneesOuvertes ? " open" : ""}><summary>Mes données (changer de téléphone, copie de secours)</summary>
        <p class="aide">Vos élèves et vos cotes sont dans ce téléphone. Gardez une copie pour les retrouver si vous changez de téléphone ou si Chrome est réinitialisé.</p>${sauvegardeRecenteHtml()}
        <button class="btn second" id="envoi">Envoyer une copie (WhatsApp…)</button>
        <button class="btn second" id="fich">Enregistrer une copie dans le téléphone</button>
        <button class="btn second" id="rest">Retrouver mes données depuis une copie</button>
        <input type="file" id="fichier" accept=".json,.txt,application/json,text/plain" hidden>
        <button class="btn danger" id="prec">Annuler la dernière modification</button></details>
      <p class="aide" style="margin-top:20px;text-align:center">${esc(window.ETABLISSEMENT.nom)}<br>Chef d'établissement : ${esc(window.ETABLISSEMENT.chef_etablissement)}<br>Bulletins scolaires · fonctionne sans internet</p>`, "plus");
    document.getElementById("chg").addEventListener("click", () => {
      if (!confirm("Changer de classe ? Les données de la classe actuelle sont conservées.")) return;
      etat.classe = null; sauver(); aller("#/");
    });
    document.querySelector("details.donnees").addEventListener("toggle", (ev) => { donneesOuvertes = ev.target.open; });
    document.getElementById("envoi").addEventListener("click", envoyerSauvegarde);
    document.getElementById("fich").addEventListener("click", () => { enregistrerFichier(); rendre(); });
    const inp = document.getElementById("fichier");
    document.getElementById("rest").addEventListener("click", () => inp.click());
    inp.addEventListener("change", () => { if (inp.files[0]) restaurer(inp.files[0]); });
    document.getElementById("prec").addEventListener("click", annulerDerniere);
  }

  // ---------- Routeur
  function rendre() {
    const [, a, b, c2] = location.hash.split("/").map((p) => decodeURIComponent(p || ""));
    if (!classe()) return vueChoix();
    if (!a || a === "eleves") return b ? vueFormEleve(b) : vueEleves();
    if (a === "cotes") {
      if (b && !M.COLONNES_NOTES.includes(b)) return aller("#/cotes");
      return c2 ? vueFormCotes(b, c2) : b ? vueListeCotes(b) : vueCotes();
    }
    if (a === "bulletins") return vueBulletins();
    if (a === "classement") return vueClassement(b);
    if (a === "plus" || a === "classe") return vueClasse();
    aller("#/eleves");
  }

  async function demarrer() {
    charger();
    try { classes = await (await fetch("classes.json")).json(); }
    catch (e) { $app.innerHTML = '<main><p class="vide">Impossible de charger les classes. Ouvrez l\'application depuis son lien web (pas depuis un fichier).</p></main>'; return; }
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
    window.addEventListener("hashchange", rendre);
    rendre();
  }
  demarrer();
})();
