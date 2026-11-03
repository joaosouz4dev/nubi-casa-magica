/* ============================================================
   FELTRO DESENHADO (para a interface no canvas): cartões, discos e
   faixas no mesmo jeito das artes em feltro. Cor chapada com volume macio
   (luz em cima à esquerda), fibrinhas por cima e uma costura tracejada por
   dentro da borda, como peça de feltro costurada.

   feltCard(ctx, x, y, w, h, rad, cor, opções)  retângulo arredondado
   feltDisc(ctx, cx, cy, r, cor, opções)         círculo (botões, fichas)
   opções: { stitch: true, shadow: true, lift: 0..1 (apertado = 0) }
   ============================================================ */
import { lighten, darken, roundRect, Motion } from "../core/anim.js";
import { drawIcon } from "./icons.js";

/* Paleta da interface em feltro (pastéis + tinta quente). */
export const FELT = { cream: "#fff4dc", pink: "#ffc2d6", lilac: "#d9c6f5", mint: "#bfe8d4", yellow: "#ffe7a3", gold: "#ffd77a",
  blue: "#bfe0f7", peach: "#ffd2b0", ink: "#6b4a5a", ring: "#b07a9a" };

let fiber = null;
/* Textura de fibras (feita uma vez): risquinhos claros e escuros em várias direções. */
function fiberPattern(ctx) {
  if (!fiber) {
    const n = 160;
    fiber = document.createElement("canvas");
    fiber.width = fiber.height = n;
    const c = fiber.getContext("2d");
    let s = 1234567;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    c.lineCap = "round";
    for (let i = 0; i < 900; i++) {
      const x = rnd() * n, y = rnd() * n, a = rnd() * Math.PI, l = 2 + rnd() * 5;
      c.strokeStyle = rnd() < 0.5 ? `rgba(255,255,255,${0.06 + rnd() * 0.08})` : `rgba(60,30,40,${0.04 + rnd() * 0.06})`;
      c.lineWidth = 0.6 + rnd() * 0.6;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
    }
  }
  return ctx.createPattern(fiber, "repeat");
}

function body(ctx, path, x, y, w, h, color, o) {
  const lift = o.lift == null ? 1 : o.lift;
  const depth = Math.max(2, Math.min(w, h) * 0.07) * lift;
  ctx.save();
  if (o.shadow !== false) {
    ctx.shadowColor = "rgba(70,40,60,.22)"; ctx.shadowBlur = Math.min(w, h) * 0.12; ctx.shadowOffsetY = depth * 0.8;
  }
  // "espessura" do feltro: a mesma forma, mais escura, um pouco abaixo
  ctx.translate(0, depth); path(); ctx.fillStyle = darken(color, 0.16); ctx.fill();
  ctx.restore();
  ctx.save();
  // face: volume macio com luz no alto à esquerda
  path();
  const g = ctx.createRadialGradient(x + w * 0.3, y + h * 0.2, Math.min(w, h) * 0.05, x + w * 0.5, y + h * 0.55, Math.max(w, h) * 0.8);
  g.addColorStop(0, lighten(color, 0.22)); g.addColorStop(0.6, color); g.addColorStop(1, darken(color, 0.08));
  ctx.fillStyle = g; ctx.fill();
  ctx.clip();
  ctx.fillStyle = fiberPattern(ctx); ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function stitch(ctx, path, w, h, color) {
  const lw = Math.max(1.2, Math.min(w, h) * 0.022);
  ctx.save();
  path();
  ctx.setLineDash([lw * 2.6, lw * 2.2]); ctx.lineCap = "round";
  ctx.strokeStyle = darken(color, 0.28); ctx.globalAlpha = 0.55; ctx.lineWidth = lw;
  ctx.stroke();
  ctx.restore();
}

export function feltCard(ctx, x, y, w, h, rad, color, o = {}) {
  body(ctx, () => { ctx.beginPath(); roundRect(ctx, x, y, w, h, rad); }, x, y, w, h, color, o);
  if (o.stitch !== false) {
    const k = Math.max(4, Math.min(w, h) * 0.07);
    stitch(ctx, () => { ctx.beginPath(); roundRect(ctx, x + k, y + k, w - k * 2, h - k * 2, Math.max(2, rad - k)); }, w, h, color);
  }
}

export function feltDisc(ctx, cx, cy, r, color, o = {}) {
  body(ctx, () => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); }, cx - r, cy - r, r * 2, r * 2, color, o);
  if (o.stitch !== false) stitch(ctx, () => { ctx.beginPath(); ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2); }, r * 2, r * 2, color);
}

/* Fibrinhas por cima de algo já pintado (para quem desenha a própria forma). */
export function feltFibers(ctx, x, y, w, h) {
  ctx.save(); ctx.fillStyle = fiberPattern(ctx); ctx.fillRect(x, y, w, h); ctx.restore();
}

/* ---------- peças prontas, guardadas em canvas ----------
   Peças de feltro (gradiente + textura + sombra) ficam guardadas em canvas:
   refazer isso a cada quadro pesa. A chave inclui o tamanho, então a peça é
   refeita sozinha quando a tela muda. */
const feltCache = new Map();
export function feltPiece(ctx, key, x, y, w, h, paint) {
  const dpr = Math.min((typeof window !== "undefined" && window.devicePixelRatio) || 1, 2);
  const pad = Math.ceil(Math.min(w, h) * 0.3 + 6);
  const id = key + "|" + w.toFixed(1) + "x" + h.toFixed(1) + "@" + dpr;
  let cv = feltCache.get(id);
  if (cv === undefined) {
    if (feltCache.size > 160) feltCache.clear();
    cv = typeof document !== "undefined" ? document.createElement("canvas") : null;
    if (cv) {
      cv.width = Math.max(1, Math.ceil((w + pad * 2) * dpr)); cv.height = Math.max(1, Math.ceil((h + pad * 2) * dpr));
      const c = cv.getContext("2d");
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint(c, pad, pad, w, h);
    }
    feltCache.set(id, cv);
  }
  if (cv) ctx.drawImage(cv, x - pad, y - pad, w + pad * 2, h + pad * 2);
  else paint(ctx, x, y, w, h);
}
/* Disco de feltro costurado centrado em (cx, cy). */
export function feltDot(ctx, cx, cy, r, color, o = {}) {
  const lift = o.lift == null ? 1 : o.lift;
  feltPiece(ctx, "dot|" + color + "|" + lift + "|" + (o.shadow === false ? 0 : 1) + "|" + (o.stitch === false ? 0 : 1), cx - r, cy - r, r * 2, r * 2,
    (c, x, y, w) => feltDisc(c, x + w / 2, y + w / 2, w / 2, color, { lift, shadow: o.shadow, stitch: o.stitch }));
}
/* Anel de seleção: fita de feltro grossa em tom quente, com pontinhos de
   costura claros andando devagar e uma respiração suave (sem brilho). */
export function feltRing(ctx, R, t, color = FELT.ring) {
  const p = Motion.reduce ? 0.5 : (Math.sin(t * 0.006) + 1) / 2;
  const rr = R * (1 + p * 0.05), lw = Math.max(4, R * 0.16);
  ctx.save();
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(90,50,70,.22)"; ctx.shadowBlur = lw * 0.8; ctx.shadowOffsetY = lw * 0.25;
  ctx.strokeStyle = color; ctx.globalAlpha = 0.78 + p * 0.17; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.stroke();
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "#fff0e6"; ctx.globalAlpha = 0.8; ctx.lineWidth = Math.max(1.2, lw * 0.2);
  ctx.setLineDash([lw * 0.55, lw * 0.6]); ctx.lineDashOffset = Motion.reduce ? 0 : -t * 0.012;
  ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
/* Selinho de "ok" em feltro verde-menta com o tique costurado. */
export function feltCheck(ctx, x, y, r) {
  feltDot(ctx, x, y, r, "#9fdcae", { lift: 0.6, stitch: false });
  ctx.save();
  ctx.strokeStyle = "#3f7a52"; ctx.lineWidth = Math.max(2, r * 0.32); ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(x - r * 0.45, y); ctx.lineTo(x - r * 0.1, y + r * 0.38); ctx.lineTo(x + r * 0.5, y - r * 0.4); ctx.stroke();
  ctx.restore();
}
/* Botão de página em feltro: disco creme com o desenho da próxima página e
   uma etiquetinha rosa com a "dobrinha" (seta macia) no canto. */
export function feltPageBtn(ctx, r, icon, badge) {
  feltDot(ctx, 0, 0, r, FELT.cream);
  drawIcon(ctx, icon, -r * 0.1, -r * 0.08, r * 0.5);
  const bx = r * 0.66, by = r * 0.52, br = r * 0.34;
  feltDot(ctx, bx, by, br, badge, { lift: 0.7, stitch: false });
  ctx.save();
  ctx.strokeStyle = FELT.ink; ctx.lineWidth = Math.max(2, br * 0.3); ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(bx - br * 0.42, by - br * 0.16); ctx.lineTo(bx, by + br * 0.26); ctx.lineTo(bx + br * 0.42, by - br * 0.16); ctx.stroke();
  ctx.restore();
}
