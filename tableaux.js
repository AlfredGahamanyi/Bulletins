// Tableaux comparatifs de fin de période (modèle « TABLEAU_DES_RESULTATS ») :
//   1. Tableau d'analyse des résultats (tranches de pourcentage par classe)
//   2. Tableau synoptique des résultats (inscrits, participants, réussites, échecs, non classés, abandons ; garçons / filles)
//   3. Tableau de performance par branche (cours × classes)
// Mêmes règles que le cartouche des bulletins : réussite = 50 % et plus ; participant = élève classé ; G = garçons, F = filles.
(function (racine) {
  "use strict";

  // ---------- Classes du modèle (code de l'application -> libellé du modèle). null = classe qui n'existe pas dans l'école.
  const NIVEAUX = [
    [["7A", "7eme_edubase_a", "7e A"], ["7B", "7eme_edubase_b", "7e B"], ["7C", "7eme_edubase_c", "7e C"]],
    [["8A", "8eme_edubase_a", "8A"], ["8B", "8eme_edubase_b", "8B"], ["8C", "8eme_edubase_c", "8C"]],
    [["1HTE", "1ere_electricite", "1E"], ["1HTN", "1ere_nutrition", "1N"], ["1HTS", "1ere_social", "1S"]],
    [["2HTE", null, "2E"], ["2HTN", "2eme_nutrition", "2N"], ["2HTS", "2eme_social", "2S"]],
    [["3HTE", null, "3E"], ["3HTN", "3eme_nutrition", "3N"], ["3HTS", "3eme_social", "3S"]],
    [["4HTE", null, "4E"], ["4HTN", "4eme_nutrition", "4N"], ["4HTS", "4eme_social", "4S"]]
  ];
  // Colonnes proposées (comme le cartouche) : [colonne, « de la … » pour les titres, libellé court, composantes nécessaires]
  const COLONNES = [
    ["P1", "DE LA 1ère PÉRIODE", "1ère période"], ["P2", "DE LA 2e PÉRIODE", "2e période"],
    ["COMP_S1", "DE L'EXAMEN DU 1er SEMESTRE", "Examen du 1er semestre"], ["TOT_S1", "DU 1er SEMESTRE", "Total du 1er semestre"],
    ["P3", "DE LA 3e PÉRIODE", "3e période"], ["P4", "DE LA 4e PÉRIODE", "4e période"],
    ["COMP_S2", "DE L'EXAMEN DU 2e SEMESTRE", "Examen du 2e semestre"], ["TOT_S2", "DU 2e SEMESTRE", "Total du 2e semestre"],
    ["TOT_GEN", "DE L'ANNÉE", "Total général"]
  ];
  const COMPOSANTES = (M, col) => ({ TOT_S1: M.SEMESTRES.S1, TOT_S2: M.SEMESTRES.S2, TOT_GEN: M.COLONNES_NOTES }[col] || [col]);

  // ---------- Lignes du tableau de performance par branche (ordre et libellés du modèle)
  const MODELE_COURS = [
    ["LANGUES", ["Anglais", "Français"]],
    ["COURS GENERAUX", ["Biologie", "Chimie", "Dessin", "Education à la Vie Familiale", "Education civique et Morale", "Education Physique", "Géographie/Démographie", "Histoire/Histoire du travail", "Musique", "Religion"]],
    ["DOMAINE D'APPRENT. SCIENCES", ["Anatomie/Anatomie Physiologie", "Botanique", "Zoologie", "Technologie", "Sciences Physiques/Physiques", "Technologie d'information et de Com."]],
    ["MATHEMATIQUES", ["Algèbre", "Arithmétique", "Statistique", "Géométrie", "Mathématiques"]],
    ["COURS D'OPTION", ["Atelier électrique", "Atelier mécanique", "Dessin Technique", "Electricité Générale", "Mécanique", "Schémas électriques", "Technologie électrique", "Technologie mécanique", "Électronique numérique",
      "Comptabilité/Entrepreneuriat/Droit Fiscal", "Développement Communautaire", "Droit Const/DCP/Droit Administratif", "Economie politique /ECODEV", "Institution Sociales/Doctrine sociale",
      "Méthodologie de l'Elève", "Principe d'Education/Protection d'Enfant", "Psychologie Générale/OST", "Psychologie Sociale/Psycho Appliquée", "Sciences sociales/ Sociologie/Déontologie",
      "Technique d'Animation/EDUPOP/MAS/DECO", "Agriculture/Zootechnie", "Economie Alimentaire", "Education Nutritionnelle /Micro alimentaire", "Enquêtes nutritionnelles/Techn. D'Enq.",
      "HYGIENE Indi/ Alimentaire/ Familiale", "Nutrition Générale", "Pathologie/Diététique", "Technologie Alimentaire/Secourisme", "Technologie Culinaire", "Pratique Professionnelle", "Stage"]]
  ];
  // Nom du cours dans classes.json -> ligne du modèle. À compléter ici si un nouveau cours apparaît (sinon il va dans « AUTRES COURS »).
  const ALIAS = {
    "Anglais": "Anglais", "Français": "Français", "Biologie": "Biologie", "Chimie": "Chimie", "Dessin": "Dessin",
    "Educ à la vie": "Education à la Vie Familiale", "Education à la vie": "Education à la Vie Familiale", "Education à la Vie": "Education à la Vie Familiale", "Éducation à la vie": "Education à la Vie Familiale",
    "Ed. civ. & morale": "Education civique et Morale", "Education civ. Et Mor.": "Education civique et Morale", "Education Civique et Morale": "Education civique et Morale", "Éd. Civique et Morale": "Education civique et Morale",
    "Educ. Phys": "Education Physique", "Education phys. & sportive": "Education Physique", "Education physique": "Education Physique",
    "Géographie": "Géographie/Démographie", "Démographie": "Géographie/Démographie", "Histoire": "Histoire/Histoire du travail", "Hist. du travail org. Profes.": "Histoire/Histoire du travail",
    "Musique": "Musique", "Religion": "Religion",
    "Anatomie": "Anatomie/Anatomie Physiologie", "Anatomie & physiologie": "Anatomie/Anatomie Physiologie", "Anatomie & Physiologie": "Anatomie/Anatomie Physiologie",
    "Botanique": "Botanique", "Zoologie": "Zoologie", "Technologie": "Technologie",
    "Sciences Phys": "Sciences Physiques/Physiques", "Sciences Physiques": "Sciences Physiques/Physiques", "Physique": "Sciences Physiques/Physiques",
    "Tech d'Info & Com (TIC)": "Technologie d'information et de Com.", "Informatique": "Technologie d'information et de Com.",
    "Algèbre": "Algèbre", "Arithmétique": "Arithmétique", "Statistique": "Statistique", "Statistiques": "Statistique", "Géométrie": "Géométrie", "Mathématiques": "Mathématiques",
    "Atelier Élec": "Atelier électrique", "Atelier Méca": "Atelier mécanique", "Dessin Industriel": "Dessin Technique", "Dessin Élec": "Schémas électriques",
    "Élec Générale": "Electricité Générale", "Mécanique Générale": "Mécanique", "Techno Élec": "Technologie électrique", "Techno Méca": "Technologie mécanique", "Électronique numérique": "Électronique numérique",
    "Comptabilité": "Comptabilité/Entrepreneuriat/Droit Fiscal", "Entreprenariat": "Comptabilité/Entrepreneuriat/Droit Fiscal", "Entrepreneuriat": "Comptabilité/Entrepreneuriat/Droit Fiscal", "Fiscalité": "Comptabilité/Entrepreneuriat/Droit Fiscal",
    "Dév. communautaire": "Développement Communautaire",
    "Droit": "Droit Const/DCP/Droit Administratif", "Droit administratif": "Droit Const/DCP/Droit Administratif", "Droit pénal & civil": "Droit Const/DCP/Droit Administratif", "Législation du travail": "Droit Const/DCP/Droit Administratif",
    "Economie politique": "Economie politique /ECODEV", "Economie du développement": "Economie politique /ECODEV",
    "Institutions": "Institution Sociales/Doctrine sociale", "Institutions internationales": "Institution Sociales/Doctrine sociale", "Doctrine sociale": "Institution Sociales/Doctrine sociale", "Intro. aux inst. sociales (I.I.S)": "Institution Sociales/Doctrine sociale",
    "Méthode de l'étudiant": "Méthodologie de l'Elève",
    "Principe de l'éducation": "Principe d'Education/Protection d'Enfant", "Protection de l'enfant": "Principe d'Education/Protection d'Enfant",
    "Psychologie générale": "Psychologie Générale/OST", "Organ. du travail et gestion": "Psychologie Générale/OST",
    "Psychologie sociale": "Psychologie Sociale/Psycho Appliquée", "Psychologie appliquée": "Psychologie Sociale/Psycho Appliquée",
    "Sociologie africaine": "Sciences sociales/ Sociologie/Déontologie", "Sociologie générale": "Sciences sociales/ Sociologie/Déontologie", "Déontologie": "Sciences sociales/ Sociologie/Déontologie", "Intro. aux sciences sociales (I.S.S)": "Sciences sociales/ Sociologie/Déontologie",
    "Technique animation": "Technique d'Animation/EDUPOP/MAS/DECO", "Education populaire": "Technique d'Animation/EDUPOP/MAS/DECO", "Trav. soc. ind. & de groupe": "Technique d'Animation/EDUPOP/MAS/DECO",
    "Agriculture": "Agriculture/Zootechnie", "Zootechnie (élevage)": "Agriculture/Zootechnie",
    "Economie alimentaire": "Economie Alimentaire", "Education nutritionnelle": "Education Nutritionnelle /Micro alimentaire", "Microbiologie alimentaire": "Education Nutritionnelle /Micro alimentaire",
    "Enquête nutritionnelle": "Enquêtes nutritionnelles/Techn. D'Enq.", "Technique d'enquête": "Enquêtes nutritionnelles/Techn. D'Enq.",
    "Hygiène alimentaire": "HYGIENE Indi/ Alimentaire/ Familiale", "Hygiène de la famille": "HYGIENE Indi/ Alimentaire/ Familiale", "Hygiène individuelle & collective": "HYGIENE Indi/ Alimentaire/ Familiale", "Hygiène gestion du travail": "HYGIENE Indi/ Alimentaire/ Familiale",
    "Nutrition générale": "Nutrition Générale", "Pathologie de la nutrition": "Pathologie/Diététique", "Diététique": "Pathologie/Diététique",
    "Technologie alimentaire": "Technologie Alimentaire/Secourisme", "Secourisme": "Technologie Alimentaire/Secourisme", "Technologie culinaire": "Technologie Culinaire",
    "Pratique professionnelle": "Pratique Professionnelle", "Stage": "Stage"
  };
  const norm = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const ALIAS_N = {}; for (const k in ALIAS) ALIAS_N[norm(k)] = ALIAS[k];
  const AUTRES = "AUTRES COURS";

  const BANDES = ["b90", "b80", "b70", "b60", "b50", "b40", "b30", "b20"];
  const bande = (p) => (p >= 90 ? "b90" : p >= 80 ? "b80" : p >= 70 ? "b70" : p >= 60 ? "b60" : p >= 50 ? "b50" : p >= 40 ? "b40" : p >= 30 ? "b30" : "b20");
  const pct = (a, b) => (b ? (a / b) * 100 : null);
  const fmt1 = (x) => (x == null || Number.isNaN(x) ? "" : (Math.round(x * 10) / 10).toFixed(1).replace(".", ","));
  const entier = (x) => (x == null ? "" : String(x));

  // ---------- Calcul des statistiques d'une classe pour une colonne
  function statsClasse(M, cl, els, col) {
    const act = M.colonnesActives(els);
    const dispo = COMPOSANTES(M, col).every((c) => act.includes(c));
    const res = M.calculerRangs(els.map((e) => M.calculerBulletin(cl, e, act)), M.CHAMPS_TOTAUX);
    const s = { dispo, res, inscr: [0, 0], part: [0, 0], reuss: [0, 0], ech: [0, 0], b: {} };
    BANDES.forEach((k) => (s.b[k] = 0));
    if (!dispo) return s;
    for (const r of res) {
      const i = String(r.eleve.sexe || "").trim().toUpperCase().startsWith("F") ? 1 : 0;
      s.inscr[i]++;
      const participe = M.estNombre(r.totaux[col]) && (!M.COLONNES_NOTES.includes(col) || M.notesManquantes(cl, r.eleve, [col], r.exclus).length === 0);
      if (!participe) continue;
      s.part[i]++;
      const mx = r.maxima_eleve[col], p = mx ? (r.totaux[col] / mx) * 100 : 0;
      (p >= 50 ? s.reuss : s.ech)[i]++;
      s.b[bande(p)]++;
    }
    return s;
  }

  // ---------- Performance de chaque cours (moyenne en % ou taux de réussite), regroupée par ligne du modèle
  function performanceClasse(M, cl, res, col, mesure) {
    const cols = COMPOSANTES(M, col), acc = {};
    const brs = []; for (const g of cl.groupes) for (const b of g.branches) brs.push(b);
    for (const b of brs) {
      const ligneNom = ALIAS_N[norm(b.nom)] || b.nom, cle = ALIAS_N[norm(b.nom)] ? ligneNom : "\u0000" + b.nom;
      const exc = (res[0] && res[0].exclus) || new Set();
      const possible = cols.reduce((a, c) => a + (exc.has(b.nom + "|" + c) ? 0 : M.maxBranche(b, c)), 0);
      if (!possible) continue;
      const a = acc[cle] || (acc[cle] = { somme: 0, poss: 0, n: 0, ok: 0, nom: ligneNom, hors: !ALIAS_N[norm(b.nom)] });
      for (const r of res) {
        const l = r.lignes.find((x) => x.nom === b.nom), v = l ? l[col] : null;
        if (!M.estNombre(v)) continue;
        a.somme += v; a.poss += possible; a.n++; if (v / possible >= 0.5) a.ok++;
      }
    }
    const out = {};
    for (const k in acc) { const a = acc[k]; out[k] = !a.n ? null : (mesure === "reussite" ? (a.ok / a.n) * 100 : (a.somme / a.poss) * 100); out[k + "#nom"] = a.nom; out[k + "#hors"] = a.hors; }
    return out;
  }

  // ---------- Calcul général
  function calculer(o) {
    const M = o.M, classes = o.classes, donnees = o.donnees || {}, col = o.col, ab = o.abandons || {}, mesure = o.mesure === "reussite" ? "reussite" : "moyenne";
    const info = COLONNES.find((c) => c[0] === col) || COLONNES[0];
    const annee = String(o.annee || "").replace(/\s*[-–/]\s*/g, "-");
    // Classes de l'application absentes du modèle : ajoutées à la fin pour ne rien perdre.
    const connus = new Set(); NIVEAUX.forEach((n) => n.forEach((c) => c[1] && connus.add(c[1])));
    const niveaux = NIVEAUX.map((n) => n.map((c) => c.slice()));
    const inconnues = classes.filter((c) => !connus.has(c.code));
    if (inconnues.length) niveaux.push(inconnues.map((c) => [c.nom_classe.slice(0, 10), c.code, c.nom_classe.slice(0, 8)]));
    const parCode = {}, manquantes = [];
    for (const n of niveaux) for (const [lab, code] of n) {
      if (!code) continue;
      const cl = classes.find((c) => c.code === code), els = donnees[code];
      if (!cl) continue;
      if (!els || !els.length) { manquantes.push(lab + " (non transmise)"); continue; }
      const s = statsClasse(M, cl, els, col);
      if (!s.dispo) { manquantes.push(lab + " (" + info[2].toLowerCase() + " pas encore saisie)"); continue; }
      parCode[code] = { cl, s, lab };
    }
    const vide = () => ({ partic: 0, b: {}, reuss: [0, 0], ech: [0, 0], inscr: [0, 0], part: [0, 0], ncl: [0, 0], ab: [0, 0] });
    const ajoute = (t, v) => { t.partic += v.partic; BANDES.forEach((k) => (t.b[k] = (t.b[k] || 0) + (v.b[k] || 0))); for (const k of ["reuss", "ech", "inscr", "part", "ncl", "ab"]) { t[k][0] += v[k][0]; t[k][1] += v[k][1]; } };
    const analyse = [], syno = [], total = vide();
    const resume = (v) => {
      const t = (a) => a[0] + a[1], R = t(v.reuss), E = t(v.ech);
      return { partic: v.partic, b: v.b, reussTot: R, reussPct: pct(R, v.partic), echTot: E, echPct: pct(E, v.partic) };
    };
    for (const n of niveaux) {
      const sous = vide(); let aDonnees = false;
      for (const [lab, code] of n) {
        const d = code && parCode[code];
        if (!d) { analyse.push({ type: "classe", libelle: lab, vide: true }); syno.push({ type: "classe", libelle: lab, vide: true }); continue; }
        aDonnees = true;
        const a = ab[col + "|" + lab] || {}, abG = Number(a.g) || 0, abF = Number(a.f) || 0;
        const v = vide(); v.partic = d.s.part[0] + d.s.part[1]; BANDES.forEach((k) => (v.b[k] = d.s.b[k]));
        v.reuss = d.s.reuss.slice(); v.ech = d.s.ech.slice(); v.inscr = d.s.inscr.slice(); v.part = d.s.part.slice();
        v.ab = [abG, abF]; v.ncl = [Math.max(0, d.s.inscr[0] - d.s.part[0] - abG), Math.max(0, d.s.inscr[1] - d.s.part[1] - abF)];
        ajoute(sous, v);
        analyse.push({ type: "classe", libelle: lab, v: resume(v) }); syno.push({ type: "classe", libelle: lab, v });
      }
      analyse.push({ type: "sous", libelle: "S/TOT", vide: !aDonnees, v: aDonnees ? resume(sous) : null }); syno.push({ type: "sous", libelle: "S/TOT", vide: !aDonnees, v: aDonnees ? sous : null });
      ajoute(total, sous);
    }
    const aucune = !Object.keys(parCode).length;
    analyse.push({ type: "total", libelle: "TOT GEN", vide: aucune, v: aucune ? null : resume(total) }); syno.push({ type: "total", libelle: "TOT GEN", vide: aucune, v: aucune ? null : total });

    // Performance par branche
    const colonnesPerf = []; niveaux.forEach((n) => n.forEach(([lab, code, court]) => { if (code) colonnesPerf.push({ code, libelle: court, lab }); }));
    const perfParClasse = {}; for (const c of colonnesPerf) { const d = parCode[c.code]; perfParClasse[c.code] = d ? performanceClasse(M, d.cl, d.s.res, col, mesure) : {}; }
    const lignesPerf = [];
    for (const [section, cours] of MODELE_COURS) {
      lignesPerf.push({ type: "section", libelle: section });
      for (const c of cours) lignesPerf.push({ type: "cours", libelle: c.replace(/\/\s*$/, "").trim(), valeurs: colonnesPerf.map((k) => (perfParClasse[k.code][c] == null ? null : perfParClasse[k.code][c])) });
    }
    const hors = new Set(); for (const code in perfParClasse) for (const k in perfParClasse[code]) if (k.startsWith("\u0000") && !k.includes("#")) hors.add(k);
    if (hors.size) {
      lignesPerf.push({ type: "section", libelle: AUTRES });
      for (const k of [...hors].sort()) lignesPerf.push({ type: "cours", libelle: k.slice(1), valeurs: colonnesPerf.map((c) => (perfParClasse[c.code][k] == null ? null : perfParClasse[c.code][k])) });
    }
    return { col, de: info[1], libelleColonne: info[2], annee, mesure, analyse, synoptique: syno, performance: { classes: colonnesPerf, lignes: lignesPerf }, manquantes, ecole: o.ecole || "" };
  }

  // ---------- Aperçu à l'écran (HTML)
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function lignesAnalyse(l) {
    if (l.vide) return Array(13).fill("");
    const v = l.v, b = v.b; return [entier(v.partic), ...["b90", "b80", "b70", "b60", "b50"].map((k) => entier(b[k])), entier(v.reussTot), fmt1(v.reussPct), ...["b40", "b30", "b20"].map((k) => entier(b[k])), entier(v.echTot), fmt1(v.echPct)];
  }
  function lignesSyno(l) {
    if (l.vide) return Array(20).fill("");
    const v = l.v, t = (a) => a[0] + a[1], tr = (a) => [a[0], a[1], t(a)].map(entier), R = t(v.reuss), E = t(v.ech), P = t(v.part);
    return [...tr(v.inscr), ...tr(v.part), ...tr(v.reuss), fmt1(pct(R, P)), ...tr(v.ech), fmt1(pct(E, P)), ...tr(v.ncl), ...tr(v.ab)];
  }
  const fmtPerf = (v) => (v == null ? "" : fmt1(v));
  function html(d) {
    const tb = (tete, corps) => `<div class="tableau"><table><thead>${tete}</thead><tbody>${corps}</tbody></table></div>`;
    const cl = (t) => (t === "total" ? ' class="tot"' : t === "sous" ? ' class="sous"' : "");
    const h1 = `<tr><th rowspan="2">CLASSE</th><th rowspan="2" class="num">PARTIC</th><th colspan="7">RÉUSSITES</th><th colspan="4">ÉCHECS</th><th rowspan="2" class="num">%</th></tr>
      <tr>${["90%", "80%", "70%", "60%", "50%", "TOT", "%", "40%", "30%", "20%", "TOT"].map((x) => `<th class="num">${x}</th>`).join("")}</tr>`;
    const a = d.analyse.map((l) => { const c = lignesAnalyse(l); return `<tr${cl(l.type)}><td>${esc(l.libelle)}</td>${c.slice(0, 12).map((x) => `<td class="num">${esc(x)}</td>`).join("")}<td class="num">${esc(c[12])}</td></tr>`; }).join("");
    const h2 = `<tr><th rowspan="2">CLASSE</th><th colspan="3">INSCR</th><th colspan="3">PART</th><th colspan="4">RÉUSSITES</th><th colspan="4">ÉCHECS</th><th colspan="3">N-Cl</th><th colspan="3">ABANDONS</th></tr>
      <tr>${["G", "F", "T", "G", "F", "T", "G", "F", "T", "%", "G", "F", "T", "%", "G", "F", "T", "G", "F", "T"].map((x) => `<th class="num">${x}</th>`).join("")}</tr>`;
    const s = d.synoptique.map((l) => `<tr${cl(l.type)}><td>${esc(l.libelle)}</td>${lignesSyno(l).map((x) => `<td class="num">${esc(x)}</td>`).join("")}</tr>`).join("");
    const h3 = `<tr><th>BRANCHE</th>${d.performance.classes.map((c) => `<th class="num">${esc(c.libelle)}</th>`).join("")}</tr>`;
    const p = d.performance.lignes.map((l) => l.type === "section" ? `<tr class="sect"><td colspan="${d.performance.classes.length + 1}">${esc(l.libelle)}</td></tr>`
      : `<tr><td>${esc(l.libelle)}</td>${l.valeurs.map((v) => `<td class="num">${esc(fmtPerf(v))}</td>`).join("")}</tr>`).join("");
    const mes = d.mesure === "reussite" ? "Taux de réussite par cours (% d'élèves à 50 % et plus)" : "Moyenne de la classe par cours (% des points obtenus)";
    return `<h3>Tableau d'analyse des résultats</h3>${tb(h1, a)}<h3>Tableau synoptique des résultats</h3>${tb(h2, s)}<h3>Tableau de performance par branche</h3><p class="aide">${esc(mes)}</p>${tb(h3, p)}`;
  }

  // ---------- PDF
  const GRIS = [0.9, 0.9, 0.9], GRIS2 = [0.95, 0.95, 0.95], GRIS3 = [0.82, 0.86, 0.92];
  function dateFr() { return new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }); }
  function entetePage(P, page, d, titre, soustitre) {
    const W = page.l;
    page.texte(d.ecole, 28, 24, { taille: 7, police: "F1", couleur: [0.35, 0.35, 0.35] });
    page.texte(titre, W / 2, 44, { taille: 13, police: "F2", align: "c" });
    let y = 58;
    for (const l of soustitre) { page.texte(l, W / 2, y, { taille: 9.5, police: "F2", align: "c" }); y += 12.5; }
    return y + 4;
  }
  function piedPage(page, d, n, total) {
    page.texte("Édité le " + dateFr() + " · " + d.ecole, 28, page.h - 16, { taille: 6.5, couleur: [0.4, 0.4, 0.4] });
    page.texte("Page " + n + "/" + total, page.l - 28, page.h - 16, { taille: 6.5, align: "d", couleur: [0.4, 0.4, 0.4] });
  }
  // Dessine un en-tête à cellules fusionnées : cellules = [{t, c0, c1, l0 (ligne), l1}] ; colX = positions de colonnes.
  function dessinerEntete(page, colX, y, hLigne, cellules, taille) {
    for (const c of cellules) {
      const x = colX[c.c0], w = colX[c.c1 + 1] - colX[c.c0], yy = y + c.l0 * hLigne, h = (c.l1 - c.l0 + 1) * hLigne;
      page.rect(x, yy, w, h, { fond: GRIS });
      page.boite(c.t, x, yy, w, h, { taille: taille || 7.5, police: "F2", marge: 1.5 });
    }
  }
  const positions = (largeurs, x0, total) => { const s = largeurs.reduce((a, b) => a + b, 0), f = total / s, X = [x0]; for (const w of largeurs) X.push(X[X.length - 1] + w * f); return X; };
  function ligneCorps(page, colX, y, h, cellules, type, taille) {
    const fond = type === "total" ? GRIS3 : type === "sous" ? GRIS2 : null, police = type === "total" ? "F2" : type === "sous" ? "F3" : "F1";
    cellules.forEach((t, i) => {
      page.rect(colX[i], y, colX[i + 1] - colX[i], h, { fond });
      if (t !== "") page.boite(String(t), colX[i], y, colX[i + 1] - colX[i], h, { taille: taille || 8, police: i === 0 ? (type === "classe" ? "F2" : police) : police, align: i === 0 ? "g" : "c", marge: 2.5 });
    });
  }

  // Note de bas de page avec retour à la ligne automatique ; renvoie la position y suivante.
  function note(P, page, texte, x, y, wmax, taille, couleur) {
    for (const l of P.couper(texte, wmax, taille, "F3")) { page.texte(l, x, y, { taille, police: "F3", couleur }); y += taille * 1.35; }
    return y;
  }
  const NOTE_GRIS = [0.35, 0.35, 0.35], NOTE_ROUGE = [0.6, 0.2, 0.2];
  const vides = (d) => "Lignes vides (classe non transmise, ou période pas encore saisie) : " + d.manquantes.join(", ") + ".";

  function pdf(d, o) {
    const P = racine.PdfMini, doc = new P.Document("Tableaux de résultats — " + d.libelleColonne + " " + d.annee), quoi = (o && o.quoi) || ["analyse", "synoptique", "performance"];
    const pagesDoc = []; const nouvelle = (l, h) => { const p = doc.page(l, h); pagesDoc.push(p); return p; };
    const sousTitre = [d.de, d.annee];
    const A4 = P.A4;

    if (quoi.includes("analyse")) {
      const p = nouvelle(A4.l, A4.h), y0 = entetePage(P, p, d, "TABLEAU D'ANALYSE DES RESULTATS", sousTitre);
      const colX = positions([46, 36, 29, 29, 29, 29, 29, 31, 35, 29, 29, 29, 31, 36], 28, A4.l - 56), hL = 21;
      dessinerEntete(p, colX, y0 + 4, hL, [{ t: "CLASSE", c0: 0, c1: 0, l0: 0, l1: 1 }, { t: "PARTIC", c0: 1, c1: 1, l0: 0, l1: 1 }, { t: "REUSSITES", c0: 2, c1: 8, l0: 0, l1: 0 }, { t: "ECHECS", c0: 9, c1: 12, l0: 0, l1: 0 }, { t: "%", c0: 13, c1: 13, l0: 0, l1: 1 },
        ...["90%", "80%", "70%", "60%", "50%", "TOT", "%", "40%", "30%", "20%", "TOT"].map((t, i) => ({ t, c0: 2 + i, c1: 2 + i, l0: 1, l1: 1 }))]);
      let y = y0 + 4 + 2 * hL; const hR = 19.5;
      for (const l of d.analyse) { ligneCorps(p, colX, y, hR, [l.libelle, ...lignesAnalyse(l)], l.type, 8); y += hR; }
      y = note(P, p, "Réussite : 50 % et plus. Tranches : 90 % = 90 à 100 ; 80 % = 80 à 89 ; … ; 50 % = 50 à 59 ; 40 % = 40 à 49 ; 30 % = 30 à 39 ; 20 % = moins de 30. Pourcentages calculés sur les participants.", 28, y + 12, A4.l - 56, 6.8, NOTE_GRIS);
      if (d.manquantes.length) note(P, p, vides(d), 28, y + 3, A4.l - 56, 6.5, NOTE_ROUGE);
    }
    if (quoi.includes("synoptique")) {
      const p = nouvelle(A4.h, A4.l), y0 = entetePage(P, p, d, "TABLEAU SYNOPTIQUE DES RESULTATS", sousTitre);
      const colX = positions([44, 30, 30, 30, 30, 30, 30, 30, 30, 30, 34, 30, 30, 30, 34, 30, 30, 30, 30, 30, 30], 28, A4.h - 56), hL = 19;
      const G = ["G", "F", "T"];
      const cell = (t, c0, c1, l0, l1) => ({ t, c0, c1, l0, l1 });
      dessinerEntete(p, colX, y0 + 4, hL, [cell("CLASSE", 0, 0, 0, 1), cell("INSCR", 1, 3, 0, 0), cell("PART", 4, 6, 0, 0), cell("REUSSITES", 7, 10, 0, 0), cell("ECHECS", 11, 14, 0, 0), cell("N-Cl", 15, 17, 0, 0), cell("ABANDONS", 18, 20, 0, 0),
        ...[1, 4, 7, 11, 15, 18].flatMap((c0) => G.map((t, i) => cell(t, c0 + i, c0 + i, 1, 1))), cell("%", 10, 10, 1, 1), cell("%", 14, 14, 1, 1)], 7.5);
      let y = y0 + 4 + 2 * hL; const hR = 14.5;
      for (const l of d.synoptique) { ligneCorps(p, colX, y, hR, [l.libelle, ...lignesSyno(l)], l.type, 7.8); y += hR; }
      y = note(P, p, "INSCR = inscrits · PART = participants (classés) · N-Cl = non classés (inscrits - participants - abandons) · G = garçons, F = filles, T = total · % = part des participants.", 28, y + 11, A4.h - 56, 6.5, NOTE_GRIS);
      if (d.manquantes.length) note(P, p, vides(d), 28, y + 3, A4.h - 56, 6.5, NOTE_ROUGE);
    }
    if (quoi.includes("performance")) {
      const mes = d.mesure === "reussite" ? "Taux de réussite par cours (% d'élèves à 50 % et plus)" : "Moyenne de la classe par cours (% des points obtenus)";
      const cls = d.performance.classes, colX = positions([142, ...cls.map(() => 38)], 28, A4.h - 56), hR = 10.6, hautMax = A4.l - 30;
      let page = null, y = 0, idx = 0;
      const debut = (suite) => {
        page = nouvelle(A4.h, A4.l);
        y = suite ? 34 : entetePage(P, page, d, "TABLEAU DE PERFORMANCE PAR BRANCHE", ["RESULTATS " + d.de + " " + d.annee]);
        if (!suite) { page.texte(mes, A4.h / 2, y - 2, { taille: 7.5, police: "F3", align: "c", couleur: [0.3, 0.3, 0.3] }); y += 8; }
        page.rect(colX[0], y, colX[1] - colX[0], 17, { fond: GRIS }); page.boite("BRANCHES", colX[0], y, colX[1] - colX[0], 17, { taille: 7.5, police: "F2" });
        cls.forEach((c, i) => { page.rect(colX[i + 1], y, colX[i + 2] - colX[i + 1], 17, { fond: GRIS }); page.boite(c.libelle, colX[i + 1], y, colX[i + 2] - colX[i + 1], 17, { taille: 7.5, police: "F2", marge: 1 }); });
        y += 17;
      };
      debut(false);
      for (const l of d.performance.lignes) {
        if (y + hR > hautMax) debut(true);
        if (l.type === "section") { page.rect(colX[0], y, colX[colX.length - 1] - colX[0], hR, { fond: GRIS3 }); page.boite(l.libelle, colX[0], y, 300, hR, { taille: 6.8, police: "F2", align: "g" }); }
        else ligneCorps(page, colX, y, hR, [l.libelle, ...l.valeurs.map(fmtPerf)], "cours", 6.6);
        y += hR; idx++;
      }
      if (d.manquantes.length) note(P, page, "Colonnes vides (classe non transmise, ou période pas encore saisie) : " + d.manquantes.join(", ") + ".", 28, Math.min(y + 10, A4.l - 40), A4.h - 56, 6.5, NOTE_ROUGE);
    }
    pagesDoc.forEach((p, i) => piedPage(p, d, i + 1, pagesDoc.length));
    return doc.octets();
  }

  racine.Tableaux = { COLONNES, NIVEAUX, MODELE_COURS, ALIAS, calculer, html, pdf, norm };
})(typeof window !== "undefined" ? window : globalThis);
