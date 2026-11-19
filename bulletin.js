// Bulletins : portage de generateur_pdf.py (N° PERM / N° ID) et du modèle bulletin.html (format « groupes »).
(function (racine) {
  "use strict";
  const M = racine.Moteur;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const PREFIXE_ID = "6109", CHIFFRE_FIXE_ID = "3", LONGUEUR_MATRICULE = 5;

  function construireNumeros(classe, eleve, etab) {
    const code = String(etab.code_ecole || "").trim(), court = code.split("-").pop();
    const saisi = String(eleve.numero_perm || "").trim();
    let matricule = saisi;
    if (saisi.length > LONGUEUR_MATRICULE)
      for (const pre of [code, court]) if (pre && saisi.startsWith(pre)) { matricule = saisi.slice(pre.length); break; }
    const chiffre = (String(classe.code).match(/^\d+/) || [""])[0];
    const annees = String(etab.annee_scolaire || "").match(/\d{4}/g);
    return { numero_perm: code + matricule,
      numero_id: PREFIXE_ID + code + (matricule || "-".repeat(LONGUEUR_MATRICULE)) + chiffre + CHIFFRE_FIXE_ID + (annees ? annees[annees.length - 1] : "") };
  }

  const cases = (valeur, min) => {
    const s = String(valeur || "");
    return `<span class="cases">${[...s].map((c) => `<span class="case">${esc(c)}</span>`).join("")}${'<span class="case"></span>'.repeat(Math.max(0, min - s.length))}</span>`;
  };
  const n = (v) => esc(M.formatNote(v));
  const r = (v) => esc(v == null ? "" : v);
  const pc = (v) => esc(M.formatPourcentage(v));
  const COLS = ["P1", "P2", "COMP_S1", "TOT_S1", "P3", "P4", "COMP_S2", "TOT_S2", "TOT_GEN"];

  // Feuille « groupes » d'un élève (équivalent de <main class="sheet"> de bulletin.html).
  function feuilleGroupes(classe, resultat, etab, effectifs, urls) {
    const bl = classe.bulletin || {}, etat = bl.gabarit === "etat", nums = construireNumeros(classe, resultat.eleve, etab);
    const eleve = Object.assign({}, resultat.eleve, { numero_perm: nums.numero_perm, id_national: nums.numero_id });
    const code = resultat.complet ? M.getDecision(resultat.totaux, resultat.maxima_eleve.TOT_GEN).code : null;
    const tot = resultat.totaux, pct = resultat.pourcentages, rg = resultat.rangs || {}, eff = effectifs || {};
    const app = resultat.application, cond = eleve.conduite || {};
    const groupes = M.calculerTotauxParGroupe(classe, resultat);
    let corps = "";
    groupes.forEach((groupe, gi0) => {
      const mg = groupe.max_groupe, compMax = mg.semestre - 2 * mg.periode, gi = gi0 + 1;
      const mx = (v) => `<td class="mx">${v}</td>`, dk = '<td class="dk"></td>';
      const cm = compMax ? mx(compMax) : dk;
      corps += `<tr class="m" title="${esc(groupe.nom)}"><th>MAXIMA</th>${mx(mg.periode)}${mx(mg.periode)}${cm}${mx(mg.semestre)}${mx(mg.periode)}${mx(mg.periode)}${cm}${mx(mg.semestre)}${mx(mg.annuel)}<td class="gp"></td><td class="gp" colspan="2"></td></tr>\n`;
      groupe.branches.forEach((l, i) => {
        const rep = compMax && !(gi === 1 && i !== 0), cl = rep ? "" : "rn";
        const cc = (k) => (compMax ? `<td>${n(l[k])}</td>` : dk);
        corps += `<tr><th>${esc(l.nom)}</th><td>${n(l.P1)}</td><td>${n(l.P2)}</td>${cc("COMP_S1")}<td>${n(l.TOT_S1)}</td><td>${n(l.P3)}</td><td>${n(l.P4)}</td>${cc("COMP_S2")}<td>${n(l.TOT_S2)}</td><td>${n(l.TOT_GEN)}</td><td class="gp"></td><td class="${cl}"></td><td class="${cl}"></td></tr>\n`;
      });
    });
    const mp = classe.max_periode, ms = classe.max_semestre, mc = ms - 2 * mp, g2 = '<td class="gp2"></td>';
    const mxg = (v) => `<td class="mx">${v}</td>`;
    const ligneCols = (f, cls = "") => COLS.map((c) => `<td${cls}>${f(c)}</td>`).join("");
    const gris = '<td class="gy" colspan="2"></td>';
    const periodes = (src) => `<td>${n(src.P1)}</td><td>${n(src.P2)}</td>${gris}<td>${n(src.P3)}</td><td>${n(src.P4)}</td>${gris}<td class="gy"></td>`;
    const barre = (c, liste) => (liste.includes(code) ? "biff" : "");
    const chefLigne = bl.echoue
      ? `<div class="rr"><span class="${code && code !== "ECHEC" ? "biff" : ""}">-L'élève a échoué et est à reorienter vers ……………….. (1)</span><span>${esc(etab.chef_etablissement)}</span></div>`
      : `<div class="rr"><span></span><span>${esc(etab.chef_etablissement)}</span></div>`;
    const sig = (bl.signature_ligne || []).map((it, i, a) => `<span${i ? ` style="margin-right:${i === a.length - 1 ? 10 : 28}%"` : ""}>${esc(it)}</span>`).join("");
    const hors = code && code !== "REPECHAGE" ? "biff" : "";
    return `<main class="sheet">
<table class="top"><colgroup><col style="width:110px"><col><col style="width:88px"></colgroup>
<tr><td><img src="${urls.drapeau}" alt="Drapeau RDC"></td>
<td class="republic"><h1>REPUBLIQUE DEMOCRATIQUE DU CONGO</h1><p>${(bl.ministere_lignes || []).join("<br>")}</p></td>
<td><img src="${urls.embleme}" alt="Armoiries RDC"></td></tr></table>
<table class="id">
<colgroup><col style="width:44%"><col style="width:12%"><col style="width:25%"><col style="width:6%"><col style="width:13%"></colgroup>
<tr><th colspan="5" class="t14">N° ID. ${cases(eleve.id_national || eleve.numero_perm, 27)}</th></tr>
<tr><th colspan="5" style="border-top:2px solid #000">PROVINCE : <span class="v">${esc(etab.province)}</span></th></tr>
<tr><th>VILLE : <span class="v">${esc(etab.ville)}</span></th><td class="i">ÉLÈVE :</td><td>${esc(eleve.nom)}</td><td class="rt">SEXE :</td><td>${esc(eleve.sexe)}</td></tr>
<tr><th>COMMUNE/TER(1) : <span class="v">${esc(etab.commune)}</span></th><td class="i">NE (E) à :</td><td>${esc(eleve.lieu_naissance)}</td><td class="rt">LE</td><td>${esc(eleve.date_naissance)}</td></tr>
<tr><th>ÉCOLE : <span class="v">${esc(etab.nom)}</span></th><td class="i">CLASSE :</td><td colspan="3">${esc(classe.nom_classe)}</td></tr>
<tr><th>CODE : ${cases(etab.code_ecole, 9)}</th><td class="i">N° PERM. :</td><td colspan="3">${cases(eleve.numero_perm, 13)}</td></tr>
</table>
<div class="ttl"><span>${esc(bl.titre)}</span><span>ANNEE SCOLAIRE ${esc(etab.annee_scolaire)}</span></div>
<table class="g">
<colgroup><col style="width:20%">${'<col style="width:6.1%">'.repeat(9)}<col style="width:3.3%"><col style="width:4%"><col style="width:17.8%"></colgroup>
<thead>
<tr><th rowspan="3" class="big" style="border-top:0">BRANCHES</th><th colspan="4">PREMIER SEMESTRE</th><th colspan="4">DEUXIÈME SEMESTRE</th><th>TOT</th><th rowspan="3" class="gp"></th><th colspan="2">${etat ? "EXAMEN D'ETAT" : "EXAMEN DE REPECHAGE"}</th></tr>
<tr><th colspan="2" class="sm">TRAV. JOURN.</th><th rowspan="2" class="sm">COMP.</th><th rowspan="2" class="sm">TOT.</th><th colspan="2" class="sm">TRAV. JOURN.</th><th rowspan="2" class="sm">COMP.</th><th rowspan="2" class="sm">TOT.</th><th rowspan="2">GEN</th>${etat ? '<th rowspan="2" class="sm">Points<br>Obtenus</th><th rowspan="2" class="sm">MAX</th>' : '<th rowspan="2">%</th><th rowspan="2">SIGNATURE PROF</th>'}</tr>
<tr><th>1<sup>è</sup>P</th><th>2<sup>è</sup>P</th><th>3<sup>è</sup>P</th><th>4<sup>è</sup>P</th></tr>
</thead>
<tbody>
${corps}
<tr class="m"><th>MAXIMA GÉNÉRAUX</th>${mxg(mp)}${mxg(mp)}${mxg(mc)}${mxg(ms)}${mxg(mp)}${mxg(mp)}${mxg(mc)}${mxg(ms)}${mxg(classe.max_annuel)}<td class="gp"></td><td class="gp" colspan="2"></td></tr>
<tr><th>TOTAUX</th>${ligneCols((c) => n(tot[c]))}${g2}
${etat ? `<td colspan="2" rowspan="7" class="side">
%<br>
<b>Pour le contrôle</b> Le……………<br>
<b>Nom et signature du Chef de Centre</b><br>……………………<br>
<b>Code du Centre</b> ${cases("", 5)}<br>
<b>RESULTAT FINAL</b><br>
Diplôme (1) — Avec………% — A échoué (1)<br>
<b>Pour témoignage</b> Le……/……/…….<br>
<b>Le Chef d'Etablissement</b> — Sceau de l'école</td></tr>` : `<td colspan="2" rowspan="7" class="side">
<span class="${barre(0, ["DOUBLE", "ECHEC"])}">-Passe&nbsp;&nbsp;&nbsp;(1)</span><br><br>
<span class="${barre(0, ["PASSE", "ECHEC"])}">- Double&nbsp;&nbsp;(1)</span><br><br>
${bl.echoue ? `<span class="${barre(0, ["PASSE", "DOUBLE"])}">-A échoué (1)</span><br><br>` : ""}${bl.date_dans_boite ? "LE ……/……/20……<br><br>" : ""}-Le Chef d'Etablissement<br>Sceau de l'école</td></tr>`}
<tr><th>POURCENTAGE</th>${ligneCols((c) => pc(pct[c]), ' class="pc"')}${g2}</tr>
<tr><th>PLACE</th>${ligneCols((c) => r(rg[c]))}${g2}</tr>
<tr><th>NBRE D'ELEVES</th>${ligneCols((c) => r(eff[c]))}${g2}</tr>
<tr><th>APPLICATION</th>${periodes(app)}${g2}</tr>
<tr><th>CONDUITE</th>${periodes(cond)}${g2}</tr>
<tr><th>SIGN, DU RESPONSABLE</th><td colspan="3"></td><td class="gy"></td><td colspan="4"></td>${g2}<td style="font-size:7px;font-style:italic;text-align:right">${esc(bl.reference_table || "")}</td></tr>
</tbody></table>
${etat ? `<div class="rr" style="padding:6px 5px 0;font-size:9px;font-weight:bold"><span></span><span>Fait à ${esc(etab.ville)}, le ………………</span></div>
<div class="rr" style="padding:2px 5px 0;font-size:9px;font-weight:bold"><span></span><span>Le Chef d'Etablissement,</span></div>
<div class="rr" style="padding:2px 5px 0;font-size:9px;font-weight:bold"><span></span><span>${esc(etab.chef_etablissement)}</span></div>
<div class="sig">${sig}</div>
<div class="foot"><span>(1) Biffer la mention inutile .</span>${bl.interdiction ? "" : `<i>${esc(bl.reference)}</i>`}</div>
<div class="note"><span>Note importante : Le bulletin est sans valeur s'il est raturé ou surchargé .</span><span></span></div>
${bl.interdiction ? `<div class="note" style="justify-content:space-between">
<i style="font-weight:bold;text-align:center;flex:1">Interdiction formelle de reproduire ce bulletin sous peine des sanctions prévues par la loi</i>
<span style="font-style:italic;font-weight:normal">${esc(bl.reference)}</span>
</div>` : ""}
` : `<section class="txt">
<div class="${hors}">-L'élève ne pourra passer dans la classe supérieure s'il n'a subi avec succès un examen de repêchage en ………………………………….</div>
<div class="rr ${hors}"><span>………………………………………………………………………………………………………………………………………………………………………</span><span>(1)</span></div>
<div class="rr"><span class="n ${code && code !== "PASSE" ? "biff" : ""}">-L'élève passe dans la classe supérieure (1)</span><span>Fait à ${esc(etab.ville)}, le ………………</span></div>
<div class="rr"><span class="n ${code && code !== "DOUBLE" ? "biff" : ""}">-L'élève double la classe (1)</span><span>Le Chef d'Etablissement,</span></div>
${chefLigne}
<div class="rr" style="margin-top:6px">${sig}</div>
</section>
<div class="foot"${bl.echoue ? "" : ' style="margin-top:0"'}><span>(1) Biffer la mention inutile .</span>${bl.interdiction ? "" : `<i>${esc(bl.reference)}</i>`}</div>
<div class="note"><span>Note importante : Le bulletin est sans valeur s'il est raturé ou surchargé .</span><span></span></div>
${bl.interdiction ? `<div class="note" style="border-top:0;justify-content:space-between">
<i style="font-weight:bold;text-align:center;flex:1">Interdiction formelle de reproduire ce bulletin sous peine des sanctions prévues par la loi</i>
<span style="font-style:italic;font-weight:normal">${esc(bl.reference)}</span>
</div>` : ""}
`}
</main>`;
  }


  // Feuille « domaines » (éducation de base, 7e/8e) : équivalent de <main class="sheet"> de bulletin_domaines.html.
  function feuilleDomaines(classe, resultat, etab, effectifs, urls) {
    const nums = construireNumeros(classe, resultat.eleve, etab);
    const eleve = Object.assign({}, resultat.eleve, { numero_perm: nums.numero_perm, id_national: nums.numero_id });
    const code = resultat.complet ? M.getDecision(resultat.totaux, resultat.maxima_eleve.TOT_GEN).code : null;
    const tot = resultat.totaux, pct = resultat.pourcentages, rg = resultat.rangs || {}, eff = effectifs || {};
    const app = resultat.application, cond = eleve.conduite || {}, bl = classe.bulletin || {};
    const mx = (v) => `<td class="mx">${v}</td>`, gy = '<td class="gy"></td>', g2 = '<td class="gp2"></td>', fin = '<td class="gp"></td><td class="gp" colspan="2"></td>';
    // ordre des colonnes : MAX, P1, P2, MAX, COMP_S1, MAX, TOT_S1, MAX, P3, P4, MAX, COMP_S2, MAX, TOT_S2, TOT_GEN
    const ligne15 = (m, f) => `${m(1)}${f("P1")}${f("P2")}${m(2)}${f("COMP_S1")}${m(4)}${f("TOT_S1")}${m(1)}${f("P3")}${f("P4")}${m(2)}${f("COMP_S2")}${m(4)}${f("TOT_S2")}${f("TOT_GEN")}`;
    const ligneBas = (f) => `${gy}${f("P1")}${f("P2")}${gy}${f("COMP_S1")}${gy}${f("TOT_S1")}${gy}${f("P3")}${f("P4")}${gy}${f("COMP_S2")}${gy}${f("TOT_S2")}${f("TOT_GEN")}${g2}`;
    let corps = "", precedent = null;
    for (const g of M.calculerSousTotaux(classe, resultat)) {
      if (g.domaine !== precedent) { corps += `<tr class="dom"><th colspan="19">${esc(g.domaine)}</th></tr>\n`; precedent = g.domaine; }
      if (g.nom !== g.domaine) corps += `<tr class="sdom"><th colspan="19">${esc(g.nom)}</th></tr>\n`;
      for (const l of g.branches) corps += `<tr><th>${esc(l.nom)}</th>${ligne15((k) => `<td class="mx">${l.max * k}</td>`, (c) => `<td>${n(l[c])}</td>`)}${fin}</tr>\n`;
      const st = g.sous_total;
      corps += `<tr class="st"><th>SOUS TOTAL</th>${ligne15((k) => `<td>${st.max * k}</td>`, (c) => `<td>${n(st[c])}</td>`)}${fin}</tr>\n`;
    }
    const mp = classe.max_periode, ms = classe.max_semestre, m2 = mp ? mp * 2 : "";
    const biff = (liste) => (liste.includes(code) ? "biff" : "");
    const hors = code && code !== "REPECHAGE" ? "biff" : "";
    const cell = (obj) => (c) => `<td>${n(obj[c])}</td>`;
    const periodes = (src) => `${gy}<td>${n(src.P1)}</td><td>${n(src.P2)}</td><td class="gy" colspan="4"></td>${gy}<td>${n(src.P3)}</td><td>${n(src.P4)}</td><td class="gy" colspan="4"></td>${gy}${g2}`;
    return `<main class="sheet">
<table class="top"><colgroup><col style="width:100px"><col><col style="width:80px"></colgroup>
<tr><td><img src="${urls.drapeau}" alt="Drapeau RDC"></td>
<td class="republic"><h1>REPUBLIQUE DEMOCRATIQUE DU CONGO</h1><p>MINISTERE DE L'ENSEIGNEMENT PRIMAIRE, SECONDAIRE<br>ET TECHNIQUE</p></td>
<td><img src="${urls.embleme}" alt="Armoiries RDC"></td></tr></table>
<table class="id">
<colgroup><col style="width:44%"><col style="width:12%"><col style="width:25%"><col style="width:6%"><col style="width:13%"></colgroup>
<tr><th colspan="5" class="t14">N° ID. ${cases(eleve.id_national || eleve.numero_perm, 27)}</th></tr>
<tr><th colspan="5" style="border-top:2px solid #000">PROVINCE : <span class="v">${esc(etab.province)}</span></th></tr>
<tr><th>ÉCOLE : <span class="v">${esc(etab.nom)}</span></th><td class="i">ÉLÈVE :</td><td>${esc(eleve.nom)}</td><td class="rt">SEXE :</td><td>${esc(eleve.sexe)}</td></tr>
<tr><th>VILLE : <span class="v">${esc(etab.ville)}</span></th><td class="i">NE (E) à :</td><td>${esc(eleve.lieu_naissance)}</td><td class="rt">LE</td><td>${esc(eleve.date_naissance)}</td></tr>
<tr><th>COMMUNE/TER(1) : <span class="v">${esc(etab.commune)}</span></th><td class="i">CLASSE :</td><td colspan="3">${esc(classe.nom_classe)}</td></tr>
<tr><th>CODE ECOLE : ${cases(etab.code_ecole, 9)}</th><td class="i">N° PERM. :</td><td colspan="3">${cases(eleve.numero_perm, 13)}</td></tr>
</table>
<div class="ttl">BULLETIN DE LA ${esc(classe.nom_classe.toUpperCase())}<span class="annee">Année scolaire ${esc(etab.annee_scolaire)}</span></div>
${racine.BULLETIN_TETE_DOMAINES}<tbody>
${corps}
<tr class="st"><th>MAX GEN/TOT.</th><td>${mp}</td><td colspan="2"></td><td>${m2}</td><td></td><td>${ms}</td><td></td><td>${mp}</td><td colspan="2"></td><td>${m2}</td><td></td><td>${ms}</td><td></td><td>${classe.max_annuel}</td>${fin}</tr>
<tr><th>TOTAUX</th>${ligneBas(cell(tot))}
<td colspan="2" rowspan="7" class="side">
<span class="${biff(["DOUBLE", "ECHEC"])}">PASSE (1)</span><br>
<span class="${biff(["PASSE", "ECHEC"])}">Double (1)</span><br>
LE ……/……/20……<br>
Le Chef d'Etablissement<br>Sceau de l'école
</td></tr>
<tr><th>pourcentage</th>${ligneBas((c) => `<td>${pc(pct[c])}</td>`)}</tr>
<tr><th>PLACE</th>${ligneBas((c) => `<td>${r(rg[c])}</td>`)}</tr>
<tr><th>NBRE D'ELEVES</th>${ligneBas((c) => `<td>${r(eff[c])}</td>`)}</tr>
<tr><th>APPLICATION</th>${periodes(app)}</tr>
<tr><th>CONDUITE</th>${periodes(cond)}</tr>
<tr><th>Sign. du respo.</th><td colspan="7"></td><td class="gy"></td><td colspan="6"></td>${g2}<td style="font-size:7px;font-style:italic;text-align:right">${esc(bl.reference_table || "")}</td></tr>
</tbody></table>
<section class="txt">
<div class="${hors}">L'élève ne pourra passer dans la classe supérieure s'il n'a subi avec succès un examen de repêchage en ………………………………….</div>
<div class="rr ${hors}"><span>………………………………………………………………………………………………………………………………………………………………………</span><span>(1)</span></div>
<div class="rr"><span class="n ${code && code !== "PASSE" ? "biff" : ""}">L'élève passe dans la classe supérieure (1)</span><span>Fait à ${esc(etab.ville)}, le ………………</span></div>
<div class="rr"><span class="n ${code && code !== "DOUBLE" ? "biff" : ""}">L'élève double sa classe (1)</span><span>Le Chef d'Etablissement,</span></div>
<div class="rr"><span class="${code && code !== "ECHEC" ? "biff" : ""}">L'élève a échoué et est à réorienter vers ……………….. (1)</span><span>${esc(etab.chef_etablissement)}</span></div>
<div class="rr" style="margin-top:6px"><span>Signature de l'élève</span><span style="margin-right:36%">Sceau de l'école</span></div>
</section>
<div class="foot"><span>(1) Biffer la mention inutile .</span><i>IGE/P.S/011</i></div>
<div class="note"><span>Note importante : Le bulletin est sans valeur s'il est raturé ou surchargé .</span><span></span></div>
</main>`;
  }

  const feuille = (classe, resultat, etab, effectifs, urls) =>
    (classe.type === "domaine" ? feuilleDomaines : feuilleGroupes)(classe, resultat, etab, effectifs, urls);
  const cssPour = (classe) => (classe.type === "domaine" ? racine.BULLETIN_CSS_DOMAINES : (classe.bulletin || {}).gabarit === "etat" ? racine.BULLETIN_CSS_ETAT : racine.BULLETIN_CSS_GROUPES);

  // ---------- Cartouche de la liste de proclamation (portage de calculer_cartouche / cartouche_proclamation.html)
  const COLONNES_CARTOUCHE = [["P1", "1ère période"], ["P2", "2e période"], ["COMP_S1", "Examen du 1er semestre"], ["TOT_S1", "Total du 1er semestre"],
    ["P3", "3e période"], ["P4", "4e période"], ["COMP_S2", "Examen du 2e semestre"], ["TOT_S2", "Total du 2e semestre"], ["TOT_GEN", "Total général"]];
  function calculerCartouche(classe, resultats) {
    const actives = new Set(resultats.length ? resultats[0].colonnes_actives : []);
    const sortie = [];
    for (const [colonne, libelle] of COLONNES_CARTOUCHE) {
      const comp = { TOT_S1: M.SEMESTRES.S1, TOT_S2: M.SEMESTRES.S2, TOT_GEN: M.COLONNES_NOTES }[colonne] || [colonne];
      if (!comp.every((c) => actives.has(c))) continue;
      const ligne = (nom) => ({ libelle: nom, inscrit: 0, participant: 0, reussis: 0, echoues: 0, non_classe: 0 });
      const garcons = ligne("Garçons"), filles = ligne("Filles");
      for (const r of resultats) {
        const cible = String(r.eleve.sexe || "").trim().toUpperCase().startsWith("F") ? filles : garcons;
        cible.inscrit++;
        const participe = M.estNombre(r.totaux[colonne]) && (!M.COLONNES_NOTES.includes(colonne) || M.notesManquantes(classe, r.eleve, [colonne]).length === 0);
        if (!participe) { cible.non_classe++; continue; }
        cible.participant++;
        const maximum = r.maxima_eleve[colonne], p = maximum ? (r.totaux[colonne] / maximum) * 100 : 0;
        cible[p >= 50 ? "reussis" : "echoues"]++;
      }
      const total = ligne("Total");
      for (const k of ["inscrit", "participant", "reussis", "echoues", "non_classe"]) total[k] = garcons[k] + filles[k];
      sortie.push({ colonne, libelle, lignes: [garcons, filles, total],
        pct_reussis: total.participant ? (total.reussis / total.participant) * 100 : null,
        pct_echoues: total.participant ? (total.echoues / total.participant) * 100 : null });
    }
    return sortie;
  }
  function htmlCartouche(classe, resultats, etab) {
    const cartouches = calculerCartouche(classe, resultats);
    if (!cartouches.length) return "";
    const blocs = cartouches.map((c) => `<section class="bloc">
<h3>${esc(c.libelle)}</h3>
<table>
<thead><tr><th></th><th>Inscrit</th><th>Participant</th><th>Réussis</th><th>Échoué</th><th>Non classé</th></tr></thead>
<tbody>
${c.lignes.map((l) => `<tr><th>${esc(l.libelle)}</th><td>${l.inscrit}</td><td>${l.participant}</td><td>${l.reussis}</td><td>${l.echoues}</td><td>${l.non_classe}</td></tr>`).join("\n")}
<tr><th>Pourcentage</th><td class="hachure"></td><td class="hachure"></td><td>${esc(M.formatPourcentage(c.pct_reussis))}</td><td>${esc(M.formatPourcentage(c.pct_echoues))}</td><td class="hachure"></td></tr>
</tbody>
</table>
</section>`).join("\n");
    return `<main class="cartouche-page">
<style>${racine.BULLETIN_CSS_CARTOUCHE}</style>
<h1>${esc(etab.nom)}</h1>
<h2>Cartouche de la liste de proclamation</h2>
<p class="sous">${esc(classe.nom_classe)} — Année scolaire ${esc(etab.annee_scolaire)}</p>
${blocs}
<p class="legende">Participant = inscrit dont la colonne est complète. Non classé = inscrit dont il manque des cotes dans la colonne.
Réussis = 50 % ou plus de son maximum ; Échoué = moins de 50 %. Pourcentages calculés sur les participants.</p>
</main>`;
  }

  // Document complet (à ouvrir dans un onglet) avec barre « Enregistrer en PDF » non imprimée.
  function documentBulletins(feuilles, titre, css) {
    const barre = `<style>@media print{.outil{display:none!important}}.outil{position:sticky;top:0;z-index:9;display:flex;gap:8px;padding:10px;background:#17365d;font:600 15px system-ui,sans-serif}.outil button{flex:1;min-height:46px;border:0;border-radius:8px;font:inherit}.outil .p{background:#fff;color:#17365d}.sheet+.sheet{break-before:page}</style><div class="outil"><button class="p" onclick="window.print()">Enregistrer en PDF</button><button onclick="window.close()">Fermer</button></div>`;
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=900"><title>${esc(titre)}</title><style>${css}</style></head><body>${barre}${feuilles.join("\n")}</body></html>`;
  }

  const API = { construireNumeros, feuilleGroupes, feuilleDomaines, feuille, cssPour, documentBulletins, calculerCartouche, htmlCartouche };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else racine.Bulletin = API;
})(typeof window !== "undefined" ? window : globalThis);
