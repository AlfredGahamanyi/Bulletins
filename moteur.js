// Moteur de calcul des bulletins : portage fidèle de calculs.py + utils.py + config.py.
// Fonctionne dans le navigateur (window.Moteur) et sous Node (module.exports).
(function (racine) {
  "use strict";
  const COLONNES_NOTES = ["P1", "P2", "COMP_S1", "P3", "P4", "COMP_S2"];
  const LIBELLES_COLONNES = { P1: "1ère période", P2: "2e période", COMP_S1: "Examen du 1er semestre",
    P3: "3e période", P4: "4e période", COMP_S2: "Examen du 2e semestre" };
  const SEMESTRES = { S1: ["P1", "P2", "COMP_S1"], S2: ["P3", "P4", "COMP_S2"] };
  const COEF_COMPOSITION = 2;
  const NON_ETUDIE = "NE", TEXTE_NON_ETUDIE = "-";
  const SEUILS_APPRECIATION = [[80, "Excellent"], [70, "Très bien"], [60, "Bien"], [50, "Passable"], [0, "Insuffisant"]];
  const SEUILS_APPLICATION = [[80, "E"], [70, "TB"], [50, "B"], [0, "MA"]];
  const CHAMPS_TOTAUX = ["P1", "P2", "COMP_S1", "TOT_S1", "P3", "P4", "COMP_S2", "TOT_S2", "TOT_GEN"];
  const PERIODES = ["P1", "P2", "P3", "P4"];

  const estComposition = (c) => c.startsWith("COMP");
  const maxBranche = (b, c) => (!estComposition(c) ? b.max : (b.comp ? b.max * COEF_COMPOSITION : 0));
  const estNombre = (v) => typeof v === "number" && !Number.isNaN(v);

  // round() de Python : arrondi sur la valeur binaire EXACTE ; seules les égalités exactes vont vers le pair.
  function arrondirPy(x, d) {
    const exact = Math.abs(x).toFixed(d + 30); // développement décimal exact du flottant
    const reste = exact.slice(exact.length - 30);
    let r = Number(Math.abs(x).toFixed(d));
    if (/^50*$/.test(reste)) { // égalité exacte (ex. 0.125) : arrondi au pair
      const bas = Number(exact.slice(0, exact.length - 30));
      const dernier = Math.round(bas * Math.pow(10, d)) % 2;
      r = dernier === 0 ? bas : Number((bas + Math.pow(10, -d)).toFixed(d));
    }
    return x < 0 ? -r : r;
  }
  const arrondir = (v, d = 2) => arrondirPy(Number(v || 0), d);
  // f"{x:g}" de Python
  function formatG(x) { return String(Number(parseFloat(Number(x).toPrecision(6)))); }
  function formatNote(note) {
    if (note === null || note === undefined || note === "") return "";
    if (note === NON_ETUDIE) return TEXTE_NON_ETUDIE;
    const n = Number(note);
    return Number.isNaN(n) ? String(note) : formatG(n);
  }
  function formatPourcentage(p) {
    if (p === null || p === undefined || p === "") return "";
    return arrondir(p).toFixed(2) + " %";
  }
  const premierSeuil = (seuils, p) => (p === null || p === undefined ? "" : seuils.find(([s]) => p >= s)[1]);
  const getAppreciation = (p) => premierSeuil(SEUILS_APPRECIATION, p);
  const getApplication = (p) => premierSeuil(SEUILS_APPLICATION, p);

  function getDecision(totaux, maxAnnuel, seuil = 50) {
    const p = maxAnnuel ? (totaux.TOT_GEN / maxAnnuel) * 100 : 0;
    if (p >= seuil) return { code: "PASSE", texte: "L'élève passe dans la classe supérieure." };
    if (p >= 45) return { code: "REPECHAGE", texte: "L'élève doit réussir un examen de repêchage." };
    return { code: "DOUBLE", texte: "L'élève double la classe." };
  }

  function lireNote(notes, colonne) {
    let v = notes ? notes[colonne] : undefined;
    if (v === undefined || v === null) return null;
    if (typeof v === "string") {
      const t = v.trim();
      if (!t) return null;
      if (t === TEXTE_NON_ETUDIE) return NON_ETUDIE;
      v = t;
    }
    const n = Number(String(v).replace(",", "."));
    if (Number.isNaN(n) || String(v).trim() === "") throw new Error("note illisible");
    return n;
  }

  // Retourne [valeur, null] si acceptée, sinon [null, message].
  function validerCote(brut, maximum) {
    const t = String(brut === null || brut === undefined ? "" : brut).trim().replace(",", ".");
    if (t === "") return [null, `case vide : entrez une cote ou "${TEXTE_NON_ETUDIE}" si le cours n'a pas été étudié.`];
    if (t === TEXTE_NON_ETUDIE) return [TEXTE_NON_ETUDIE, null];
    const v = Number(t);
    if (Number.isNaN(v)) return [null, `entrez un nombre (ou "${TEXTE_NON_ETUDIE}" si non étudié).`];
    if (!(v >= 0 && v <= maximum)) return [null, `doit être entre 0 et ${formatG(maximum)}.`];
    return [v, null];
  }

  function somme(valeurs) {
    const p = valeurs.filter(estNombre);
    return p.length ? arrondirPy(p.reduce((a, b) => a + b, 0), 2) : null;
  }
  function sommeStricte(valeurs) {
    const retenues = valeurs.filter((v) => v !== NON_ETUDIE);
    if (!retenues.length) return valeurs.length ? NON_ETUDIE : null;
    if (retenues.some((v) => v === null || v === undefined)) return null;
    return arrondirPy(retenues.reduce((a, b) => a + b, 0), 2);
  }

  function colonnesActives(eleves) {
    const actives = new Set();
    for (const e of eleves)
      for (const notes of Object.values(e.notes || {}))
        for (const c of COLONNES_NOTES) {
          try { if (lireNote(notes, c) !== null) actives.add(c); } catch (err) { /* illisible : ignoré */ }
        }
    return COLONNES_NOTES.filter((c) => actives.has(c));
  }

  function maximaChamps(classe, actives) {
    const m = {};
    for (const c of COLONNES_NOTES)
      m[c] = actives.includes(c) ? (estComposition(c) ? classe.max_composition : classe.max_periode) : 0;
    m.TOT_S1 = SEMESTRES.S1.reduce((a, c) => a + m[c], 0);
    m.TOT_S2 = SEMESTRES.S2.reduce((a, c) => a + m[c], 0);
    m.TOT_GEN = m.TOT_S1 + m.TOT_S2;
    return m;
  }

  function calculerBulletin(classe, eleve, actives) {
    if (!actives) actives = colonnesActives([eleve]);
    const maximaClasse = maximaChamps(classe, actives);
    const maximaEleve = Object.assign({}, maximaClasse);
    const lignes = [];
    for (const groupe of classe.groupes)
      for (const branche of groupe.branches) {
        const notes = (eleve.notes || {})[branche.nom] || {};
        const ligne = { groupe: groupe.nom, nom: branche.nom, max: branche.max };
        for (const c of COLONNES_NOTES) {
          const plafond = maxBranche(branche, c);
          if (!plafond) { ligne[c] = null; continue; }
          const v = lireNote(notes, c);
          ligne[c] = v;
          if (v === NON_ETUDIE && actives.includes(c)) maximaEleve[c] -= plafond;
        }
        const c1 = SEMESTRES.S1.filter((c) => maxBranche(branche, c));
        const c2 = SEMESTRES.S2.filter((c) => maxBranche(branche, c));
        ligne.TOT_S1 = sommeStricte(c1.map((c) => ligne[c]));
        ligne.TOT_S2 = sommeStricte(c2.map((c) => ligne[c]));
        ligne.TOT_GEN = sommeStricte([ligne.TOT_S1, ligne.TOT_S2]);
        lignes.push(ligne);
      }
    maximaEleve.TOT_S1 = SEMESTRES.S1.reduce((a, c) => a + maximaEleve[c], 0);
    maximaEleve.TOT_S2 = SEMESTRES.S2.reduce((a, c) => a + maximaEleve[c], 0);
    maximaEleve.TOT_GEN = maximaEleve.TOT_S1 + maximaEleve.TOT_S2;

    const totaux = {};
    for (const c of COLONNES_NOTES) totaux[c] = somme(lignes.map((l) => l[c]));
    totaux.TOT_S1 = sommeStricte(lignes.map((l) => l.TOT_S1));
    totaux.TOT_S2 = sommeStricte(lignes.map((l) => l.TOT_S2));
    totaux.TOT_GEN = sommeStricte([totaux.TOT_S1, totaux.TOT_S2]);

    const pourcentages = {};
    for (const c of CHAMPS_TOTAUX)
      pourcentages[c] = maximaEleve[c] && estNombre(totaux[c]) ? arrondir((totaux[c] / maximaEleve[c]) * 100) : null;
    totaux.POURCENTAGE = pourcentages.TOT_GEN;
    const complet = maximaClasse.TOT_GEN === classe.max_annuel && estNombre(totaux.TOT_GEN);
    const application = {};
    for (const p of PERIODES) application[p] = getApplication(pourcentages[p]);
    return { eleve, lignes, totaux, pourcentages, appreciation: getAppreciation(totaux.POURCENTAGE), application,
      colonnes_actives: actives.slice(), complet, maxima_eleve: maximaEleve };
  }

  function calculerTotauxParGroupe(classe, resultat) {
    return classe.groupes.map((g) => {
      const periode = g.max_periode;
      const composition = g.branches.some((b) => b.comp) ? periode * 2 : 0;
      const semestre = 2 * periode + composition;
      return { nom: g.nom, branches: resultat.lignes.filter((l) => l.groupe === g.nom),
        max_groupe: { periode, semestre, annuel: semestre * 2 } };
    });
  }
  function calculerSousTotaux(classe, resultat) {
    return classe.groupes.map((g) => {
      const lignes = resultat.lignes.filter((l) => l.groupe === g.nom);
      const sous = { max: g.branches.reduce((a, b) => a + b.max, 0) };
      for (const c of CHAMPS_TOTAUX) sous[c] = somme(lignes.map((l) => l[c]));
      return { nom: g.nom, domaine: g.domaine, branches: lignes, sous_total: sous };
    });
  }

  function verifierMaxima(classe, eleve) {
    const erreurs = [], notesEleve = eleve.notes || {};
    const connues = new Set(classe.groupes.flatMap((g) => g.branches.map((b) => b.nom)));
    for (const nom of Object.keys(notesEleve))
      if (!connues.has(nom)) erreurs.push(`${nom} : branche inconnue pour ${classe.nom_classe} (faute de frappe ?)`);
    for (const g of classe.groupes) for (const b of g.branches) {
      const notes = notesEleve[b.nom] || {};
      for (const c of COLONNES_NOTES) {
        let v;
        try { v = lireNote(notes, c); } catch (err) { erreurs.push(`${b.nom} - ${c} : note invalide`); continue; }
        const mx = maxBranche(b, c);
        if (v === NON_ETUDIE && !mx) erreurs.push(`${b.nom} - ${c} : cette colonne n'existe pas pour cette branche`);
        else if (estNombre(v) && !(v >= 0 && v <= mx))
          erreurs.push(mx ? `${b.nom} - ${c} : ${formatG(v)} doit être entre 0 et ${mx}` : `${b.nom} - ${c} : pas d'examen pour cette branche`);
      }
    }
    return erreurs;
  }

  function notesManquantes(classe, eleve, actives) {
    const m = [];
    for (const g of classe.groupes) for (const b of g.branches) {
      const notes = (eleve.notes || {})[b.nom] || {};
      for (const c of actives) if (maxBranche(b, c)) {
        let vide = false;
        try { vide = lireNote(notes, c) === null; } catch (err) { vide = false; }
        if (vide) m.push(`${b.nom} - ${c}`);
      }
    }
    return m;
  }

  function rangsPourColonne(resultats, colonne) {
    const cl = resultats.map((r, i) => [i, r.totaux[colonne]]).filter(([, v]) => estNombre(v));
    cl.sort((a, b) => b[1] - a[1]); // tri stable : mêmes égalités que Python
    const rangs = {}; let prec = null, rang = 0;
    cl.forEach(([index, valeur], pos) => { if (valeur !== prec) { rang = pos + 1; prec = valeur; } rangs[index] = rang; });
    return rangs;
  }
  function calculerRangs(resultats, colonnes = ["TOT_GEN"]) {
    for (const r of resultats) r.rangs = r.rangs || {};
    for (const c of colonnes) {
      const rc = rangsPourColonne(resultats, c);
      resultats.forEach((r, i) => { r.rangs[c] = i in rc ? rc[i] : null; });
    }
    for (const r of resultats) r.rang = r.rangs.TOT_GEN === undefined ? null : r.rangs.TOT_GEN;
    return resultats;
  }
  function effectifsParColonne(resultats, colonnes = ["TOT_GEN"]) {
    const e = {};
    for (const c of colonnes) e[c] = resultats.filter((r) => estNombre(r.totaux[c])).length;
    return e;
  }

  const API = { COLONNES_NOTES, LIBELLES_COLONNES, SEMESTRES, NON_ETUDIE, TEXTE_NON_ETUDIE, CHAMPS_TOTAUX, PERIODES,
    estComposition, maxBranche, estNombre, arrondir, formatG, formatNote, formatPourcentage, getAppreciation,
    getApplication, getDecision, lireNote, validerCote, colonnesActives, maximaChamps, calculerBulletin,
    calculerTotauxParGroupe, calculerSousTotaux, verifierMaxima, notesManquantes, calculerRangs, effectifsParColonne };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else racine.Moteur = API;
})(typeof window !== "undefined" ? window : globalThis);
