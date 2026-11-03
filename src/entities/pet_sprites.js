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
    this.meta = null; this.img = {}; this.loaded = 0; this.total = -1;
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
  piece(ctx, r, pose, name, head, k = 1, tint = null) {
    const im = art(name), pm = artMeta(name), B = this.meta.box;
    if (!im || !pm || !pm.box || !B) return false;
    const s = this.meta.h / (B[3] - B[1]);
    const P = this._e("parada"), E = head === "fixed" ? P : this._e(pose), q = head === true ? E[2] / P[2] : 1;
    const x = E[0] + ((pm.box[0] - B[0]) * s - P[0]) * q, y = E[1] + ((pm.box[1] - B[1]) * s - P[1]) * q;
    const W = (pm.box[2] - pm.box[0]) * s * q * this.F * r, H = (pm.box[3] - pm.box[1]) * s * q * this.F * r;
    ctx.save();
    ctx.translate(this.lx(x) * r + W / 2, this.ly(y) * r + H / 2); ctx.scale(k, k);
    ctx.drawImage(tint ? this._tintedPiece(name, im, tint) : im, -W / 2, -H / 2, W, H);
    ctx.restore();
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
  _tinted(pose, color) {
    const key = pose + "|" + color;
    let c = this.tintCache.get(key);
    if (c) return c;
    const im = this.img[pose];
    c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext("2d");
    g.drawImage(im, 0, 0);
    g.globalCompositeOperation = "color"; g.globalAlpha = 0.75;
    g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
    g.globalAlpha = 1; g.globalCompositeOperation = "destination-in";
    g.drawImage(im, 0, 0);
    if (this.tintCache.size > 24) this.tintCache.clear();
    this.tintCache.set(key, c);
    return c;
  }

  /* Desenha a pose (já no sistema local do bichinho). tintK 0..1 mistura a
     cor da comida por cima. */
  draw(ctx, r, pose, tint, tintK) {
    if (!this.img[pose]) pose = "parada";
    const im = this.img[pose];
    const x = this.left * r, y = this.top * r, w = this.meta.w * this.F * r, h = this.meta.h * this.F * r;
    ctx.drawImage(im, x, y, w, h);
    if (tint && tintK > 0.01) {
      const a = ctx.globalAlpha;
      ctx.globalAlpha = a * Math.min(1, tintK);
      ctx.drawImage(this._tinted(pose, tint), x, y, w, h);
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
