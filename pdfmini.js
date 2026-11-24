// Mini-générateur de PDF (sans bibliothèque) : texte, traits et rectangles, pages A4 portrait ou paysage.
// Polices standard du PDF (Helvetica, Helvetica gras, Helvetica italique) : rien à charger, rien à héberger d'autre.
(function (racine) {
  "use strict";
  // Largeurs des caractères (millièmes de la taille) pour les codes 32 à 255 (encodage Windows-1252).
  const LARGEURS = {"F1": [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584, 761, 556, 0, 222, 556, 333, 1000, 556, 556, 333, 1000, 667, 333, 1000, 0, 611, 0, 0, 222, 222, 333, 333, 350, 556, 1000, 333, 1000, 500, 333, 944, 0, 500, 667, 278, 333, 556, 556, 556, 556, 260, 556, 333, 737, 370, 556, 584, 333, 737, 333, 400, 584, 333, 333, 333, 556, 537, 278, 333, 333, 365, 556, 834, 834, 834, 611, 667, 667, 667, 667, 667, 667, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278, 722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611, 556, 556, 556, 556, 556, 556, 889, 500, 556, 556, 556, 556, 278, 278, 278, 278, 556, 556, 556, 556, 556, 556, 556, 584, 611, 556, 556, 556, 556, 500, 556, 500], "F2": [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584, 761, 556, 0, 278, 556, 500, 1000, 556, 556, 333, 1000, 667, 333, 1000, 0, 611, 0, 0, 278, 278, 500, 500, 350, 556, 1000, 333, 1000, 556, 333, 944, 0, 500, 667, 278, 333, 556, 556, 556, 556, 280, 556, 333, 737, 370, 556, 584, 333, 737, 333, 400, 584, 333, 333, 333, 611, 556, 278, 333, 333, 365, 556, 834, 834, 834, 611, 722, 722, 722, 722, 722, 722, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278, 722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611, 556, 556, 556, 556, 556, 556, 889, 556, 556, 556, 556, 556, 278, 278, 278, 278, 611, 611, 611, 611, 611, 611, 611, 584, 611, 611, 611, 611, 611, 556, 611, 556], "F3": [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584, 761, 556, 0, 222, 556, 333, 1000, 556, 556, 333, 1000, 667, 333, 1000, 0, 611, 0, 0, 222, 222, 333, 333, 350, 556, 1000, 333, 1000, 500, 333, 944, 0, 500, 667, 278, 333, 556, 556, 556, 556, 260, 556, 333, 737, 370, 556, 584, 333, 737, 333, 400, 584, 333, 333, 333, 556, 537, 278, 333, 333, 365, 556, 834, 834, 834, 611, 667, 667, 667, 667, 667, 667, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278, 722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611, 556, 556, 556, 556, 556, 556, 889, 500, 556, 556, 556, 556, 278, 278, 278, 278, 556, 556, 556, 556, 556, 556, 556, 584, 611, 556, 556, 556, 556, 500, 556, 500]};
  const SPECIAUX = { "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85, "†": 0x86, "‡": 0x87, "ˆ": 0x88, "‰": 0x89, "Š": 0x8A, "‹": 0x8B, "Œ": 0x8C, "Ž": 0x8E,
    "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97, "˜": 0x98, "™": 0x99, "š": 0x9A, "›": 0x9B, "œ": 0x9C, "ž": 0x9E, "Ÿ": 0x9F };
  const codeCp = (ch) => { const c = ch.charCodeAt(0); if (c >= 32 && c < 256 && !(c >= 0x80 && c < 0xA0)) return c; return SPECIAUX[ch] || (c === 0x202F || c === 0x00A0 ? 32 : 63); };
  const largeur = (s, taille, police) => { const t = LARGEURS[police || "F1"]; let w = 0; for (const ch of String(s)) w += t[codeCp(ch) - 32] || 0; return (w * taille) / 1000; };
  const echappe = (s) => {
    let o = "";
    for (const ch of String(s)) { const c = codeCp(ch); o += c === 0x28 ? "\\(" : c === 0x29 ? "\\)" : c === 0x5C ? "\\\\" : (c < 32 || c > 126) ? "\\" + c.toString(8).padStart(3, "0") : ch; }
    return o;
  };
  const num = (x) => (Math.round(x * 100) / 100).toString();
  // Coupe un texte en lignes qui tiennent dans la largeur donnée.
  function couper(s, wmax, taille, police) {
    const lignes = []; let cur = "";
    for (const mot of String(s).split(/\s+/).filter(Boolean)) {
      const essai = cur ? cur + " " + mot : mot;
      if (!cur || largeur(essai, taille, police) <= wmax) cur = essai; else { lignes.push(cur); cur = mot; }
    }
    if (cur) lignes.push(cur);
    return lignes.length ? lignes : [""];
  }
  const couleur = (c, op) => (c ? c.map(num).join(" ") + " " + op + " " : "");

  class Page {
    constructor(l, h) { this.l = l; this.h = h; this.c = []; }
    // Origine en HAUT à gauche (comme à l'écran) ; y vers le bas.
    rect(x, y, w, h, o) {
      o = o || {};
      if (o.fond) this.c.push(couleur(o.fond, "rg") + [x, this.h - y - h, w, h].map(num).join(" ") + " re f");
      if (o.trait !== false) this.c.push(couleur([0, 0, 0], "RG") + num(o.ep || 0.5) + " w " + [x, this.h - y - h, w, h].map(num).join(" ") + " re S");
    }
    ligne(x1, y1, x2, y2, ep) { this.c.push(num(ep || 0.5) + " w " + num(x1) + " " + num(this.h - y1) + " m " + num(x2) + " " + num(this.h - y2) + " l S"); }
    // Texte posé sur la ligne de base y. align : "g" (gauche), "c" (centre), "d" (droite) par rapport à x.
    texte(s, x, y, o) {
      o = o || {}; const taille = o.taille || 9, police = o.police || "F1", w = largeur(s, taille, police);
      const xx = o.align === "c" ? x - w / 2 : o.align === "d" ? x - w : x;
      this.c.push("BT " + couleur(o.couleur || [0, 0, 0], "rg") + "/" + police + " " + num(taille) + " Tf 1 0 0 1 " + num(xx) + " " + num(this.h - y) + " Tm (" + echappe(s) + ") Tj ET");
    }
    // Texte centré verticalement dans une boîte, avec retour à la ligne automatique.
    boite(s, x, y, w, h, o) {
      o = o || {}; const taille = o.taille || 8, police = o.police || "F1", marge = o.marge == null ? 2.5 : o.marge;
      const lignes = couper(s, w - 2 * marge, taille, police), interl = taille * 1.15, haut = lignes.length * interl;
      let base = y + (h - haut) / 2 + taille * 0.88;
      for (const l of lignes) {
        const px = o.align === "g" ? x + marge : o.align === "d" ? x + w - marge : x + w / 2;
        this.texte(l, px, base, { taille, police, align: o.align === "g" ? "g" : o.align === "d" ? "d" : "c", couleur: o.couleur }); base += interl;
      }
    }
  }
  class Document {
    constructor(titre) { this.titre = titre || "Document"; this.pages = []; }
    page(l, h) { const p = new Page(l, h); this.pages.push(p); return p; }
    octets() {
      let out = "%PDF-1.4\n%\u00E2\u00E3\u00CF\u00D3\n"; const off = [];
      const ajoute = (id, corps) => { off[id] = out.length; out += id + " 0 obj\n" + corps + "\nendobj\n"; };
      const n = this.pages.length, premier = 7, kids = this.pages.map((_, i) => (premier + 2 * i) + " 0 R").join(" ");
      ajoute(1, "<< /Type /Catalog /Pages 2 0 R >>");
      ajoute(2, "<< /Type /Pages /Kids [" + kids + "] /Count " + n + " >>");
      ["Helvetica", "Helvetica-Bold", "Helvetica-Oblique"].forEach((f, i) => ajoute(3 + i, "<< /Type /Font /Subtype /Type1 /BaseFont /" + f + " /Encoding /WinAnsiEncoding >>"));
      ajoute(6, "<< /Title (" + echappe(this.titre) + ") /Creator (Bulletins scolaires) >>");
      this.pages.forEach((p, i) => {
        const flux = p.c.join("\n"), id = premier + 2 * i;
        ajoute(id, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + num(p.l) + " " + num(p.h) + "] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents " + (id + 1) + " 0 R >>");
        ajoute(id + 1, "<< /Length " + flux.length + " >>\nstream\n" + flux + "\nendstream");
      });
      const total = premier + 2 * n, debutXref = out.length;
      out += "xref\n0 " + total + "\n0000000000 65535 f \n";
      for (let i = 1; i < total; i++) out += String(off[i]).padStart(10, "0") + " 00000 n \n";
      out += "trailer\n<< /Size " + total + " /Root 1 0 R /Info 6 0 R >>\nstartxref\n" + debutXref + "\n%%EOF\n";
      const b = new Uint8Array(out.length); for (let i = 0; i < out.length; i++) b[i] = out.charCodeAt(i) & 255;
      return b;
    }
  }
  racine.PdfMini = { Document, largeur, couper, A4: { l: 595.28, h: 841.89 } };
})(typeof window !== "undefined" ? window : globalThis);
