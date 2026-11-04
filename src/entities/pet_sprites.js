/* ============================================================
   NUBI EM IMAGENS (sprites em feltro/clay 3D).
   Cada bichinho tem as poses em assets/<especie>/<prefixo>_<pose>.webp e
   as medidas em assets/<especie>/sprites.json (scripts/pet-sprites.py):
   tamanho, centro dos pés e, por pose, o ponto entre os olhos e a meia
   distância entre eles. Todas as poses têm o MESMO recorte (pés na mesma
   linha). Enquanto as imagens de um bichinho não existem ou não carregaram,
   o jogo usa o desenho em código.

   O jogo anima por cima (respira, pula, estica, balança) e troca de pose
   conforme o que acontece. Roupas, salão e efeitos usam as transformações
   abaixo para se encaixar na cabeça, no pescoço, no corpo e nos pés (as
   artes deles foram feitas para o desenho antigo, em coordenadas de r).
   ============================================================ */

import { art, artMeta } from "../core/art.js";

const DRAW_H = 3.0;        // altura desenhada em r (do mesmo tamanho do desenho antigo)
const FEET_Y = 1.12;       // linha dos pés do desenho antigo (r)
// cabeça do desenho antigo: olhos em y=-0.14r, afastados 0.35r do centro
const OLD_EYE_Y = -0.14, OLD_EYE_DX = 0.35;
// cor do pelo (tufinhos da toalha) quando a imagem é usada
const FUR = { nubi: "#cbabe5" };

class PetSprites {
  constructor(species) {
    this.species = species;
    this.meta = null; this.img = {}; this.front = {}; this.feetImg = {}; this.noFeet = {}; this.bodyMask = {}; this.bodyCache = new Map();
    this.loaded = 0; this.total = -1;
    this.tintCache = new Map();
    fetch("assets/" + species + "/sprites.json").then(r => (r.ok ? r.json() : null)).then(meta => {
      if (!meta || !meta.poses) return;
      this.meta = meta;
      this.F = DRAW_H / meta.h;                       // px -> r
      this.left = -meta.feetX * this.F;
      this.top = FEET_Y - meta.bottom * this.F;
      const base = meta.poses.parada && meta.poses.parada.eyes;
      // pose com a cabeça no mesmo lugar da parada: usa a medida da parada
      // (olho fechado em arco mede torto e faria o chapéu tremer)
      this.eyes = {};
      for (const [p, d] of Object.entries(meta.poses)) {
        let e = d.eyes || base;
        if (base && e && Math.abs(e[0] - base[0]) < 26 && Math.abs(e[1] - base[1]) < 12) e = base;
        this.eyes[p] = e;
      }
      const names = Object.keys(meta.poses);
      this.total = names.length;
      for (const p of names) {
        const im = new Image();
        im.onload = () => { this.loaded++; };
        im.src = "assets/" + species + "/" + meta.prefix + "_" + p + ".webp";
        this.img[p] = im;
        // patinhas e pés da pose (vão por cima da roupa); não seguram o "pronto"
        if (meta.poses[p].front) {
          const f = new Image();
          f.onload = () => { f.ok = true; };
          f.src = "assets/" + species + "/" + meta.prefix + "_" + p + "_frente.webp";
          this.front[p] = f;
          const pe = new Image();
          pe.onload = () => { pe.ok = true; };
          pe.src = "assets/" + species + "/" + meta.prefix + "_" + p + "_pes.webp";
          this.feetImg[p] = pe;
          const bm = new Image();
          bm.onload = () => { bm.ok = true; };
          bm.src = "assets/" + species + "/" + meta.prefix + "_" + p + "_corpo.webp";
          this.bodyMask[p] = bm;
        }
      }
    }).catch(() => {});
  }

  ready() { return this.total > 0 && this.loaded === this.total; }
  has(pose) { return !!this.img[pose]; }
  get fur() { return FUR[this.species] || "#cbabe5"; }

  _e(pose) { return this.eyes[pose] || this.eyes.parada || [this.meta.feetX, this.meta.h * 0.36, 70]; }
  lx(px) { return this.left + px * this.F; }
  ly(py) { return this.top + py * this.F; }

  /* Cabeça: leva a "cabeça antiga" (chapéu, óculos, maquiagem, cabelo) para
     os olhos da pose. */
  headT(ctx, r, pose) {
    const [ex, ey, half] = this._e(pose);
    const k = (half * this.F) / OLD_EYE_DX;
    ctx.translate(this.lx(ex) * r, this.ly(ey) * r);
    ctx.scale(k, k);
    ctx.translate(0, -OLD_EYE_Y * r);
  }
  // pescoço (lacinho, medalha): logo abaixo do queixo
  neckT(ctx, r, pose) {
    const [ex, ey, half] = this._e(pose);
    const k = (half * this.F) / OLD_EYE_DX;
    ctx.translate(this.lx(ex) * r, this.ly(ey) * r + r * 0.62 * k);
    ctx.scale(k * 0.85, k * 0.85);
    ctx.translate(0, -0.6 * r);
  }
  // corpo inteiro (espuma, molhado, brilho, capa): o feijão antigo esticado
  // para a silhueta nova (mais alta e mais estreita)
  bodyT(ctx, r) { ctx.translate(0, -r * 0.08); ctx.scale(0.75, 1.12); }
  // tronco (do queixo até acima dos pés): onde a roupa do corpo é recortada
  torsoClip(ctx, r) { ctx.beginPath(); ctx.ellipse(0, r * 0.36, r * 0.62, r * 0.5, 0, 0, Math.PI * 2); ctx.clip(); }
  // roupa do corpo: a faixa antiga (0,48r a 1,18r) vai para o tronco novo
  bodyWearT(ctx, r) { ctx.translate(0, -r * 0.792); ctx.scale(0.7, 1.4); }
  // pés (botas, unhas)
  feetT(ctx, r) { ctx.translate(0, r * 1.0); ctx.scale(0.82, 0.82); ctx.translate(0, -r * 0.93); }
  // boca e centro do rosto (em r, relativo ao centro do corpo)
  mouth(pose) { const [ex, ey, half] = this._e(pose); return { x: this.lx(ex), y: this.ly(ey + half * 0.62) }; }
  face(pose) { const [ex, ey, half] = this._e(pose); return { x: this.lx(ex), y: this.ly(ey + half * 0.3) }; }

  /* Peça em feltro feita sobre a Nubi parada (roupa, acessório, penteado),
     com o recorte dela no quadro original (art.json) e o recorte das poses
     (sprites.json "box"). head: segue os olhos da pose (lugar e tamanho);
     senão só acompanha o quanto a cabeça desceu ou andou (sentada);
     "fixed": fica onde está na parada (calçados, no chão).
     k = escala em volta do centro da peça (aparecer); tint = cor (cabelo). */
  piece(ctx, r, pose, name, head, k = 1, tint = null, adj = null) {
    const im = art(name), pm = artMeta(name), B = this.meta.box;
    if (!im || !pm || !pm.box || !B) return false;
    const s = this.meta.h / (B[3] - B[1]);
    // caixa da peça sobre a Nubi parada (px da imagem da pose)
    let x = (pm.box[0] - B[0]) * s, y = (pm.box[1] - B[1]) * s, w = (pm.box[2] - pm.box[0]) * s, h = (pm.box[3] - pm.box[1]) * s;
    if (adj) {   // acerto fino da peça: escala pela base (chapéu assenta) e desloca
      const ka = adj.k || 1, w2 = w * ka, h2 = h * ka;
      x += (w - w2) / 2 + (adj.dx || 0); y += (h - h2) + (adj.dy || 0); w = w2; h = h2;
    }
    const P = this._e("parada"), E = head === "fixed" ? P : this._e(pose), q = head === true ? E[2] / P[2] : 1;
    x = E[0] + (x - P[0]) * q; y = E[1] + (y - P[1]) * q;
    const W = w * q * this.F * r, H = h * q * this.F * r;
    ctx.save();
    ctx.translate(this.lx(x) * r + W / 2, this.ly(y) * r + H / 2); ctx.scale(k, k);
    ctx.drawImage(tint ? this._tintedPiece(name, im, tint) : im, -W / 2, -H / 2, W, H);
    ctx.restore();
    return true;
  }
  /* Peça desenhada NA POSE (assets/poses/<pose>/<arquivo>.webp, recortada
     por scripts/pose-sprites.py da Nubi inteira vestindo a peça): vai por
     cima da Nubi da pose, no mesmo quadro. false = a pose não tem essa arte
     (quem chama usa o encaixe pela Nubi parada). */
  hasPoseArt(pose, name) { return !!art("poses/" + pose + "/" + name.split("/").pop()); }
  poseArt(ctx, r, pose, name, k = 1) {
    const key = "poses/" + pose + "/" + name.split("/").pop();
    const im = art(key), pm = artMeta(key), B = this.meta.box;
    if (!im || !pm || !pm.box || !B) return false;
    const s = this.meta.h / (B[3] - B[1]);
    const x = this.lx((pm.box[0] - B[0]) * s) * r, y = this.ly((pm.box[1] - B[1]) * s) * r;
    const w = (pm.box[2] - pm.box[0]) * s * this.F * r, h = (pm.box[3] - pm.box[1]) * s * this.F * r;
    ctx.save();
    if (k !== 1) { ctx.globalAlpha *= Math.max(0, Math.min(1, k)); ctx.translate(x + w / 2, y + h / 2); ctx.scale(0.9 + 0.1 * k, 0.9 + 0.1 * k); ctx.translate(-(x + w / 2), -(y + h / 2)); }
    ctx.drawImage(im, x, y, w, h);
    ctx.restore();
    return true;
  }

  /* Roupa do corpo (e capa/asas) moldada na pose: a peça, desenhada sobre a
     Nubi parada, vai da caixa do tronco da parada para a caixa do tronco da
     pose (sprites.json "torso") e, se clip, é cortada pelo molde do tronco da
     pose (nubi_<pose>_corpo.webp): nada sobra para fora do corpo, sentada ou
     dormindo. Pintada uma vez por pose e peça; k = aparecer (escala). */
  bodyPiece(ctx, r, pose, name, k = 1, clip = true) {
    if (!this.img[pose]) pose = "parada";
    const im = art(name), pm = artMeta(name), B = this.meta.box;
    const T0 = (this.meta.poses.parada || {}).torso, T1 = (this.meta.poses[pose] || {}).torso, bm = this.bodyMask[pose];
    if (!im || !pm || !pm.box || !B || !T0 || !T1 || (clip && !(bm && bm.ok))) return false;
    const key = pose + "|" + name + "|" + (clip ? 1 : 0);
    let c = this.bodyCache.get(key);
    if (!c) {
      const W = this.meta.w, H = this.meta.h, s = H / (B[3] - B[1]);
      const sx = (T1[2] - T1[0]) / (T0[2] - T0[0]), sy = (T1[3] - T1[1]) / (T0[3] - T0[1]);
      // a peça sobre a parada (px) levada para o tronco da pose
      const x = (pm.box[0] - B[0]) * s, y = (pm.box[1] - B[1]) * s, w = (pm.box[2] - pm.box[0]) * s, h = (pm.box[3] - pm.box[1]) * s;
      // folga para a capa/saia que passa do tronco
      const pad = Math.round(W * 0.25);
      c = document.createElement("canvas"); c.width = W + pad * 2; c.height = H + pad * 2;
      const g = c.getContext("2d");
      g.drawImage(im, pad + T1[0] + (x - T0[0]) * sx, pad + T1[1] + (y - T0[1]) * sy, w * sx, h * sy);
      if (clip) { g.globalCompositeOperation = "destination-in"; g.drawImage(bm, pad, pad, W, H); }
      c.pad = pad;
      if (this.bodyCache.size > 64) this.bodyCache.clear();
      this.bodyCache.set(key, c);
    }
    const F = this.F * r, x = this.left * r - c.pad * F, y = this.top * r - c.pad * F, w = c.width * F, h = c.height * F;
    ctx.save();
    if (k !== 1) {   // aparece crescendo a partir do meio do tronco
      const cx = this.lx((T1[0] + T1[2]) / 2) * r, cy = this.ly((T1[1] + T1[3]) / 2) * r;
      ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-cx, -cy);
    }
    ctx.drawImage(c, x, y, w, h);
    ctx.restore();
    return true;
  }

  /* Par de calçados: cada metade (art.json "parts") vai para o pé certo da
     pose (sprites.json "feet": [centro x, base, largura]), no tamanho do pé.
     Assim o pé some dentro do sapato também sentada e dormindo. */
  shoes(ctx, r, pose, name, k = 1) {
    const im = art(name), pm = artMeta(name), B = this.meta.box;
    const P = this.meta.poses.parada && this.meta.poses.parada.feet, E = (this.meta.poses[pose] || {}).feet || P;
    if (!im || !pm || !pm.parts || !P || !E) return this.piece(ctx, r, pose, name, "fixed", k);
    const s = this.meta.h / (B[3] - B[1]), c = (pm.box[2] - pm.box[0]) / im.naturalWidth;
    pm.parts.forEach((pt, i) => {
      // a metade sobre a Nubi parada (px da imagem da pose)
      const x0 = (pm.box[0] + pt[0] * c - B[0]) * s, x1 = (pm.box[0] + pt[2] * c - B[0]) * s;
      const y0 = (pm.box[1] + pt[1] * c - B[1]) * s, y1 = (pm.box[1] + pt[3] * c - B[1]) * s;
      const fp = P[i], fe = E[i], q = fe[2] / fp[2];
      // nunca mais estreito que o pé (senão a pontinha do pé aparece do lado)
      const wide = fe[2] * 1.05 > (x1 - x0) * q;
      const cx = wide ? fe[0] : fe[0] + ((x0 + x1) / 2 - fp[0]) * q, by = fe[1] + (y1 - fp[1]) * q;
      // pé mais alto que na parada (sentada mostra a sola): o calçado cresce
      // para cima até cobrir o pé inteiro, sem deixar os dedos aparecendo
      const fh = (this.meta.poses[pose] || {}).feetH || 0;
      const W = Math.max((x1 - x0) * q, fe[2] * 1.05) * this.F * r, H = Math.max((y1 - y0) * q, fh * 1.08) * this.F * r;
      ctx.save();
      ctx.translate(this.lx(cx) * r, this.ly(by) * r - H / 2); ctx.scale(k, k);
      ctx.drawImage(im, pt[0], pt[1], pt[2] - pt[0], pt[3] - pt[1], -W / 2, -H / 2, W, H);
      ctx.restore();
    });
    return true;
  }
  _tintedPiece(name, im, color) {
    const key = "p|" + name + "|" + color;
    let c = this.tintCache.get(key);
    if (c) return c;
    c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext("2d");
    g.drawImage(im, 0, 0);
    g.globalCompositeOperation = "color"; g.globalAlpha = 0.85; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
    g.globalAlpha = 1; g.globalCompositeOperation = "destination-in"; g.drawImage(im, 0, 0);
    this.tintCache.set(key, c);
    return c;
  }

  /* Cor das comidas (mirtilo, melancia): imagem tingida em cache por pose e cor. */
  _tinted(pose, im, color) {
    const key = pose + "|" + color;
    let c = this.tintCache.get(key);
    if (c) return c;
    c = document.createElement("canvas"); c.width = im.naturalWidth || im.width; c.height = im.naturalHeight || im.height;
    const g = c.getContext("2d");
    g.drawImage(im, 0, 0);
    g.globalCompositeOperation = "color"; g.globalAlpha = 0.75;
    g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
    g.globalAlpha = 1; g.globalCompositeOperation = "destination-in";
    g.drawImage(im, 0, 0);
    if (this.tintCache.size > 48) this.tintCache.clear();
    this.tintCache.set(key, c);
    return c;
  }

  /* Patinhas da pose por cima da roupa; feet = também os pés (sem sapato). */
  drawFront(ctx, r, pose, tint, tintK, feet = true) {
    if (!this.img[pose]) pose = "parada";
    const f = this.front[pose], pe = this.feetImg[pose];
    if (f && f.ok) this._blit(ctx, r, f, "f|" + pose, tint, tintK);
    if (feet && pe && pe.ok) this._blit(ctx, r, pe, "p|" + pose, tint, tintK);
  }
  /* A pose sem os pés (calçada): a imagem com os pés apagados, feita uma vez. */
  _withoutFeet(pose) {
    const pe = this.feetImg[pose], im = this.img[pose];
    if (!pe || !pe.ok) return null;
    let c = this.noFeet[pose];
    if (!c) {
      c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight;
      const g = c.getContext("2d");
      g.drawImage(im, 0, 0);
      g.globalCompositeOperation = "destination-out"; g.drawImage(pe, 0, 0, c.width, c.height);
      this.noFeet[pose] = c;
    }
    return c;
  }

  /* Desenha a pose (já no sistema local do bichinho). tintK 0..1 mistura a
     cor da comida por cima. shod = calçada (sem os pés da imagem). */
  draw(ctx, r, pose, tint, tintK, shod = false) {
    if (!this.img[pose]) pose = "parada";
    const nf = shod ? this._withoutFeet(pose) : null;
    if (nf) this._blit(ctx, r, nf, "s|" + pose, tint, tintK);
    else this._blit(ctx, r, this.img[pose], pose, tint, tintK);
  }
  _blit(ctx, r, im, key, tint, tintK) {
    const x = this.left * r, y = this.top * r, w = this.meta.w * this.F * r, h = this.meta.h * this.F * r;
    ctx.drawImage(im, x, y, w, h);
    if (tint && tintK > 0.01) {
      const a = ctx.globalAlpha;
      ctx.globalAlpha = a * Math.min(1, tintK);
      ctx.drawImage(this._tinted(key, im, tint), x, y, w, h);
      ctx.globalAlpha = a;
    }
  }
}

// bichinhos que têm imagens (buscar o que não existe gera erro no console)
export const WITH_SPRITES = ["nubi"];
const SETS = {};
/* Imagens do bichinho, ou null se ele ainda não tiver (ou não carregaram). */
export function petSprites(species) {
  if (!WITH_SPRITES.includes(species)) return null;
  if (!SETS[species]) SETS[species] = new PetSprites(species);
  return SETS[species].ready() ? SETS[species] : null;
}
// começa a carregar já (a Nubi aparece em imagem desde a abertura)
for (const s of WITH_SPRITES) petSprites(s);
