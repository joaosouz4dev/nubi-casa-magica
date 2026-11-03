/* ============================================================
   NUBI EM IMAGENS (sprites da chinchila das nuvens, em feltro/clay 3D).
   As poses ficam em assets/nubi/nubi_<pose>.webp (geradas por
   scripts/nubi-sprites.py, todas com o MESMO recorte: pés na mesma linha).
   O jogo continua animando por cima (respira, pula, estica, balança) e
   troca de pose conforme o que acontece; roupas, salão e efeitos usam as
   transformações abaixo para se encaixar na cabeça, no pescoço, no corpo
   e nos pés da Nubi nova (as artes deles foram feitas para o desenho
   antigo, em coordenadas de r).
   ============================================================ */

// tamanho das imagens e onde ficam os pés (px), medidos pelo script
const W = 692, H = 720;
const FEET_X = 397, BOTTOM = 708;
// altura desenhada em r: a Nubi fica do mesmo tamanho do desenho antigo
const DRAW_H = 3.0;
const F = DRAW_H / H;                 // px -> r
const FEET_Y = 1.12;                  // pés do desenho antigo (r)
const LEFT = -FEET_X * F, TOP = FEET_Y - BOTTOM * F;
// centro entre os olhos (px) de cada pose; a cabeça desce nas poses sentadas
const EYES = {
  parada: [400, 254], piscando: [402, 256], falando: [401, 256], acenando: [401, 252],
  comemorando: [401, 258], comendo: [403, 254], dormindo: [398, 328], sentada: [401, 313]
};
export const POSES = Object.keys(EYES);
export const LILAC = "#cbabe5";

const IMG = {};
let loaded = 0;
for (const p of POSES) {
  const im = new Image();
  im.onload = () => { loaded++; };
  im.src = "assets/nubi/nubi_" + p + ".webp";
  IMG[p] = im;
}
export function spritesReady() { return loaded === POSES.length; }

// px da imagem -> coordenada local (r)
const lx = (px) => LEFT + px * F, ly = (py) => TOP + py * F;

/* Cabeça: o desenho antigo tinha olhos em y=-0.14r e afastados 0.35r;
   na Nubi nova os olhos ficam mais altos e mais juntos. Esta transformação
   leva a "cabeça antiga" (chapéu, óculos, maquiagem, cabelo) para a nova. */
const HEAD_K = 0.563;
export function headT(ctx, r, pose) {
  const [ex, ey] = EYES[pose] || EYES.parada;
  ctx.translate(lx(ex) * r, ly(ey) * r);
  ctx.scale(HEAD_K, HEAD_K);
  ctx.translate(0, r * 0.14);
}
// pescoço (lacinho, medalha): logo abaixo do queixo
export function neckT(ctx, r, pose) {
  const [, ey] = EYES[pose] || EYES.parada;
  const dy = (ey - EYES.parada[1]) * F;
  ctx.translate(0, r * (0.02 + dy));
  ctx.scale(0.7, 0.7);
  ctx.translate(0, -r * 0.6);
}
// corpo inteiro (espuma, molhado, brilho, capa): o feijão antigo esticado
// para a silhueta nova (mais alta e mais estreita)
export function bodyT(ctx, r) {
  ctx.translate(0, -r * 0.08);
  ctx.scale(0.75, 1.12);
}
// tronco: onde a roupa do corpo é recortada
export function torsoClip(ctx, r) {
  ctx.beginPath(); ctx.ellipse(0, r * 0.5, r * 0.64, r * 0.56, 0, 0, Math.PI * 2); ctx.clip();
}
// pés (botas, unhas)
export function feetT(ctx, r) {
  ctx.translate(0, r * 1.0);
  ctx.scale(0.82, 0.82);
  ctx.translate(0, -r * 0.93);
}
// boca e centro do rosto (em r, relativo ao centro do corpo)
export function mouthOffset(pose) {
  const [ex, ey] = EYES[pose] || EYES.parada;
  return { x: lx(ex), y: ly(ey + 52) };
}
export function faceOffset(pose) {
  const [ex, ey] = EYES[pose] || EYES.parada;
  return { x: lx(ex), y: ly(ey + 25) };
}

/* Cor das comidas (mirtilo, melancia): a imagem tingida fica em cache por
   pose e cor (não pinta a cada quadro). */
const TINTED = new Map();
function tinted(pose, color) {
  const key = pose + "|" + color;
  let c = TINTED.get(key);
  if (c) return c;
  const im = IMG[pose];
  c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight;
  const g = c.getContext("2d");
  g.drawImage(im, 0, 0);
  g.globalCompositeOperation = "color"; g.globalAlpha = 0.75;
  g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  g.globalAlpha = 1; g.globalCompositeOperation = "destination-in";
  g.drawImage(im, 0, 0);
  if (TINTED.size > 24) TINTED.clear();
  TINTED.set(key, c);
  return c;
}

/* Desenha a pose (já no sistema local do bichinho). tintK 0..1 mistura a
   cor da comida por cima. */
export function drawPose(ctx, r, pose, tint, tintK) {
  const im = IMG[pose] || IMG.parada;
  const x = LEFT * r, y = TOP * r, w = W * F * r, h = H * F * r;
  ctx.drawImage(im, x, y, w, h);
  if (tint && tintK > 0.01) {
    const a = ctx.globalAlpha;
    ctx.globalAlpha = a * Math.min(1, tintK);
    ctx.drawImage(tinted(pose in EYES ? pose : "parada", tint), x, y, w, h);
    ctx.globalAlpha = a;
  }
}
