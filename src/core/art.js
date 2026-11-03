/* ============================================================
   ARTES EM FELTRO (cenários, móveis, objetos, enfeites, roupas, ícones).
   As imagens ficam em assets/<grupo>/<nome>.webp e as medidas em
   assets/art.json (scripts/art-sprites.py): tamanho final e, nos objetos,
   o recorte (box) dentro do quadro original (canvas). O nome de uma arte é
   "<grupo>/<nome>", por exemplo "cozinha/cozinha_mesa".

   Tudo carrega no começo. Enquanto uma arte não carregou, art() devolve null
   e quem desenha usa o desenho em código. Cada arte que chega aumenta
   artVersion(), e as camadas em cache (CachedLayer) se repintam.
   ============================================================ */

const imgs = new Map();
let meta = {};
let version = 0;

function load(name) {
  if (imgs.has(name) || typeof Image === "undefined") return Promise.resolve();
  const im = new Image();
  imgs.set(name, im);
  return new Promise(res => {
    im.onload = () => { im.ok = true; version++; res(); };
    im.onerror = () => res();
    im.src = "assets/" + name + ".webp";
  });
}

const ready = typeof fetch === "undefined" ? Promise.resolve() :
  fetch("assets/art.json").then(r => (r.ok ? r.json() : {})).then(m => {
    meta = m || {};
    return Promise.all(Object.keys(meta).map(load));
  }).catch(() => {});

/* Resolve quando todas as artes terminaram de carregar (ou falharam). Para o
   que é desenhado uma vez só fora do quadro a quadro (ícones do HUD). */
export function artReady() { return ready; }
export function artVersion() { return version; }

/* A imagem carregada (ou null). */
export function art(name) {
  const im = imgs.get(name);
  return im && im.ok ? im : null;
}
/* Medidas do art.json: { w, h, box?, canvas? }. */
export function artMeta(name) { return meta[name] || null; }

/* Desenha a arte no retângulo (x, y, w, h). Sem h, mantém a proporção. */
export function drawArt(c, name, x, y, w, h) {
  const im = art(name);
  if (!im) return false;
  if (h == null) h = (w * im.naturalHeight) / im.naturalWidth;
  c.drawImage(im, x, y, w, h);
  return true;
}

/* Desenha a arte com a base no ponto (cx, bottom), com largura w (ou altura h
   quando w é null). Devolve o retângulo usado, ou null se não carregou. */
export function drawArtAt(c, name, cx, bottom, w, h) {
  const im = art(name);
  if (!im) return null;
  const k = w != null ? w / im.naturalWidth : h / im.naturalHeight;
  const dw = im.naturalWidth * k, dh = im.naturalHeight * k;
  const r = { x: cx - dw / 2, y: bottom - dh, w: dw, h: dh };
  c.drawImage(im, r.x, r.y, r.w, r.h);
  return r;
}

/* Desenha a arte inteira dentro da caixa (cx, cy, maxW, maxH), centrada. */
export function drawArtFit(c, name, cx, cy, maxW, maxH) {
  const im = art(name);
  if (!im) return null;
  const k = Math.min(maxW / im.naturalWidth, maxH / im.naturalHeight);
  const dw = im.naturalWidth * k, dh = im.naturalHeight * k;
  const r = { x: cx - dw / 2, y: cy - dh / 2, w: dw, h: dh };
  c.drawImage(im, r.x, r.y, r.w, r.h);
  return r;
}

/* Cenário cobrindo a tela toda (corta as sobras nas laterais ou em cima/
   embaixo, mantendo o centro). ay = qual parte da altura fica quando sobra
   altura (0 = topo, 1 = base). */
export function drawBackdrop(c, name, w, h, ay = 0.5) {
  const im = art(name);
  if (!im) return false;
  const k = Math.max(w / im.naturalWidth, h / im.naturalHeight);
  const dw = im.naturalWidth * k, dh = im.naturalHeight * k;
  c.drawImage(im, (w - dw) / 2, (h - dh) * ay, dw, dh);
  return true;
}
