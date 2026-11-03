/* ============================================================
   NUBI CHINCHILA DAS NUVENS, em clay 3D (massinha/vinil).
   Uma criaturinha de fantasia inspirada na chinchila: lilás e creme,
   orelhas grandes e redondas (acompanham as emoções), topete e ponta da
   cauda em forma de nuvem (a assinatura dela), bracinhos e patinhas para
   pegar, acenar e comemorar, rosto simples e expressivo.
   Personalidade: pequena exploradora, carinhosa e um pouquinho atrapalhada.

   Estilo clay: sem contorno; volume só com degradês radiais (luz de cima à
   esquerda), brilho especular macio, sombra de contato e oclusão entre as
   partes. Nada de ctx.filter (blur pesa no celular): o "desfocado" vem de
   degradês com transparência.

   Coordenadas locais em r (raio do bichinho): origem no meio do corpo, pés
   em +r, topo da cabeça em -r, topete até ~-1.2r. Os mesmos pontos de
   antes servem para roupas e salão (ANCHORS em wear.js).

   Uso: paintBack (cauda e orelhas, atrás) -> paintBody (corpo, cabeça,
   braços, pés, topete) -> paintFace (rosto). bodyPath recorta roupas.
   ============================================================ */
import { lighten, darken, rgba, clamp } from "../core/anim.js";

export const CLAY = {
  body: "#c9b3ec",     // lilás
  cream: "#fbf1e3",    // creme (topete, cauda, focinho, barriga, patas)
  inner: "#f7a6b8",    // dentro das orelhas
  blush: "#ff92b0",
  eye: "#3a2350",
  nose: "#7a3c5c"
};

/* ---------- pincéis de massinha ---------- */
// degradê de volume para uma forma de caixa (x,y,w,h): luz em cima à esquerda
function vol(ctx, x, y, w, h, color, light = 0.42, shade = 0.2) {
  const cx = x + w / 2, cy = y + h / 2, R = Math.max(w, h) * 0.62;
  const g = ctx.createRadialGradient(cx - w * 0.2, cy - h * 0.24, R * 0.05, cx, cy, R);
  g.addColorStop(0, lighten(color, light));
  g.addColorStop(0.5, lighten(color, 0.06));
  g.addColorStop(0.86, darken(color, shade * 0.6));
  g.addColorStop(1, darken(color, shade));
  return g;
}
// mancha macia (brilho, sombra, blush): elipse com borda que some
function blob(ctx, x, y, rx, ry, color, a, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, rgba(color, a)); g.addColorStop(0.55, rgba(color, a * 0.6)); g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function ell(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); }
function fillEll(ctx, x, y, rx, ry, color, rot = 0, light, shade) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = vol(ctx, -rx, -ry, rx * 2, ry * 2, color, light, shade);
  ell(ctx, 0, 0, rx, ry); ctx.fill();
  ctx.restore();
}

/* ---------- geometria ---------- */
const HEAD = { y: -0.3, r: 0.7 };
const TORSO = { y: 0.5, rx: 0.56, ry: 0.48 };
export function earGeom(side, r) { return { x: side * r * 0.74, y: -r * 0.86, rx: r * 0.42, ry: r * 0.5, rot: side * 0.5 }; }
export function bodyPath(c, r) {
  c.beginPath();
  c.arc(0, HEAD.y * r, HEAD.r * r, 0, Math.PI * 2);
  c.moveTo(TORSO.rx * r, TORSO.y * r);
  c.ellipse(0, TORSO.y * r, TORSO.rx * r, TORSO.ry * r, 0, 0, Math.PI * 2);
}
// nuvem: círculos (x, y, raio) em r
const TUFT = [[-0.22, -0.98, 0.2], [0.04, -1.1, 0.25], [0.3, -1.0, 0.2], [0.08, -0.92, 0.22], [-0.04, -1.0, 0.2]];
const TAILTIP = [[-0.98, 0.06, 0.2], [-1.12, 0.2, 0.17], [-0.84, 0.18, 0.2], [-0.98, 0.3, 0.17]];
function cloud(ctx, list, r, k = 1, ox = 0, oy = 0) {
  ctx.beginPath();
  for (const [x, y, rr] of list) { ctx.moveTo((x + ox) * r + rr * r * k, (y + oy) * r); ctx.arc((x + ox) * r, (y + oy) * r, rr * r * k, 0, Math.PI * 2); }
}
function cloudBox(list, r, k) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y, rr] of list) { x0 = Math.min(x0, (x - rr * k) * r); y0 = Math.min(y0, (y - rr * k) * r); x1 = Math.max(x1, (x + rr * k) * r); y1 = Math.max(y1, (y + rr * k) * r); }
  return [x0, y0, x1 - x0, y1 - y0];
}

/* ---------- camadas ---------- */
/* st: { body, cream, inner, t, earL, earR, tailWag, fluffy, moon } */
export function paintBack(ctx, r, st) {
  const body = st.body || CLAY.body, cream = st.cream || CLAY.cream;
  // cauda: um gancho lilás que termina em nuvem creme (balança devagar)
  const wag = st.tailWag || 0;
  ctx.save();
  ctx.translate(-r * 0.4, r * 0.72); ctx.rotate(wag); ctx.translate(r * 0.4, -r * 0.72);
  ctx.lineCap = "round";
  const tg = ctx.createLinearGradient(-r * 0.4, r * 0.8, -r * 1.0, r * 0.1);
  tg.addColorStop(0, darken(body, 0.12)); tg.addColorStop(1, lighten(body, 0.15));
  ctx.strokeStyle = tg; ctx.lineWidth = r * 0.24;
  ctx.beginPath(); ctx.moveTo(-r * 0.35, r * 0.8); ctx.quadraticCurveTo(-r * 1.02, r * 0.78, -r * 0.96, r * 0.2); ctx.stroke();
  const tk = 1 + (st.fluffy || 0) * 0.25;
  const [bx, by, bw, bh] = cloudBox(TAILTIP, r, tk);
  ctx.fillStyle = vol(ctx, bx, by, bw, bh, cream, 0.5, 0.16);
  cloud(ctx, TAILTIP, r, tk); ctx.fill("nonzero");
  blob(ctx, -r * 1.02, r * 0.06, r * 0.1, r * 0.06, "#ffffff", 0.75, -0.4);
  ctx.restore();

  // orelhas grandes e redondas, atrás da cabeça
  for (const side of [-1, 1]) {
    const E = earGeom(side, r), tw = (side < 0 ? st.earL : st.earR) || 0;
    ctx.save(); ctx.translate(E.x, E.y); ctx.rotate(E.rot + tw);
    ctx.fillStyle = vol(ctx, -E.rx, -E.ry, E.rx * 2, E.ry * 2, body, 0.38, 0.22);
    ell(ctx, 0, 0, E.rx, E.ry); ctx.fill();
    // dentro: rosa com veinhas (ar de orelha de verdade)
    const inner = st.inner || CLAY.inner;
    const ig = ctx.createRadialGradient(-E.rx * 0.1, -E.ry * 0.15, 0, 0, E.ry * 0.05, E.ry * 0.78);
    ig.addColorStop(0, lighten(inner, 0.35)); ig.addColorStop(0.7, inner); ig.addColorStop(1, darken(inner, 0.12));
    ctx.fillStyle = ig; ell(ctx, side * E.rx * 0.04, E.ry * 0.06, E.rx * 0.7, E.ry * 0.74); ctx.fill();
    ctx.strokeStyle = rgba(lighten(inner, 0.5), 0.7); ctx.lineWidth = r * 0.018;
    for (const a of [-0.35, 0, 0.35]) {
      ctx.beginPath(); ctx.moveTo(side * E.rx * 0.05, E.ry * 0.62);
      ctx.quadraticCurveTo(side * E.rx * 0.05 + a * E.rx * 0.9, E.ry * 0.05, a * E.rx * 0.7, -E.ry * 0.5); ctx.stroke();
    }
    blob(ctx, -E.rx * 0.4, -E.ry * 0.5, E.rx * 0.3, E.ry * 0.18, "#ffffff", 0.55, -0.5);
    ctx.restore();
  }
}

/* st: { body, cream, t, wave (0..1 braço direito acenando), step, fluffy, moon } */
export function paintBody(ctx, r, st) {
  const body = st.body || CLAY.body, cream = st.cream || CLAY.cream;
  const step = st.step || 0;
  // pés creme com dedinhos
  for (const side of [-1, 1]) {
    const fx = side * r * 0.3, fy = r * 0.94 + side * step;
    fillEll(ctx, fx, fy, r * 0.22, r * 0.13, cream, 0, 0.45, 0.18);
    ctx.strokeStyle = rgba(darken(cream, 0.35), 0.55); ctx.lineWidth = r * 0.018;
    for (const d of [-0.06, 0.06]) { ctx.beginPath(); ctx.moveTo(fx + d * r, fy + r * 0.02); ctx.lineTo(fx + d * r, fy + r * 0.1); ctx.stroke(); }
  }
  // tronco
  ctx.fillStyle = vol(ctx, -TORSO.rx * r, (TORSO.y - TORSO.ry) * r, TORSO.rx * 2 * r, TORSO.ry * 2 * r, body, 0.32, 0.24);
  ell(ctx, 0, TORSO.y * r, TORSO.rx * r, TORSO.ry * r); ctx.fill();
  // barriga creme
  ctx.save(); ell(ctx, 0, TORSO.y * r, TORSO.rx * r, TORSO.ry * r); ctx.clip();
  fillEll(ctx, 0, r * 0.62, r * 0.34, r * 0.34, cream, 0, 0.5, 0.14);
  // pelo fofinho (depois da toalha): tufinhos nas laterais
  const fl = st.fluffy || 0;
  if (fl > 0.02) for (let i = 0; i < 6; i++) for (const side of [-1, 1]) {
    blob(ctx, side * r * (0.5 + (i % 2) * 0.04), r * (0.18 + i * 0.13), r * 0.1 * fl, r * 0.08 * fl, lighten(body, 0.45), 0.8);
  }
  ctx.restore();
  // sombra da cabeça sobre o corpo (oclusão)
  blob(ctx, 0, r * 0.36, r * 0.52, r * 0.12, darken(body, 0.5), 0.35);

  // braços: o esquerdo junto ao corpo; o direito acena quando feliz
  const wave = clamp(st.wave || 0), wob = Math.sin((st.t || 0) * 0.014) * 0.35 * wave;
  const arm = (side, a, len) => {
    ctx.save(); ctx.translate(side * r * 0.42, r * 0.32); ctx.rotate(a);
    fillEll(ctx, 0, len * 0.5, r * 0.13, len * 0.55, body, 0, 0.38, 0.22);
    fillEll(ctx, 0, len, r * 0.13, r * 0.11, cream, 0, 0.5, 0.15);   // patinha
    ctx.restore();
  };
  arm(-1, 0.35, r * 0.34);
  // braço direito: parado fica atrás da cabeça; acenando vem para a frente
  if (wave < 0.3) arm(1, -0.35 - wave * 2.3 + wob, r * 0.34);

  // cabeça
  const hy = HEAD.y * r, hr = HEAD.r * r;
  ctx.fillStyle = vol(ctx, -hr, hy - hr, hr * 2, hr * 2, body, 0.36, 0.22);
  ctx.beginPath(); ctx.arc(0, hy, hr, 0, Math.PI * 2); ctx.fill();
  blob(ctx, -hr * 0.42, hy - hr * 0.5, hr * 0.32, hr * 0.17, "#ffffff", 0.6, -0.55);    // brilho especular
  blob(ctx, -hr * 0.62, hy - hr * 0.2, hr * 0.06, hr * 0.06, "#ffffff", 0.7);
  // acenando: o braço sobe pela lateral da cabeça, na frente
  if (wave >= 0.3) {
    ctx.save(); ctx.translate(r * 0.5, r * 0.3); ctx.rotate(-2.6 + wob);
    fillEll(ctx, 0, r * 0.25, r * 0.13, r * 0.27, body, 0, 0.38, 0.22);
    fillEll(ctx, 0, r * 0.5, r * 0.14, r * 0.12, cream, 0, 0.5, 0.15);
    ctx.restore();
  }

  // topete de nuvem (ou lua crescente, da banana)
  const moon = clamp(st.moon || 0);
  if (moon < 0.98) {
    const k = (1 - moon) * (1 + fl * 0.25);
    const [bx, by, bw, bh] = cloudBox(TUFT, r, k);
    ctx.fillStyle = vol(ctx, bx, by, bw, bh, cream, 0.5, 0.18);
    cloud(ctx, TUFT, r, k); ctx.fill("nonzero");
    blob(ctx, r * -0.06, r * -1.18, r * 0.14, r * 0.07, "#ffffff", 0.8, -0.3);
  }
  if (moon > 0.02) {
    ctx.save(); ctx.translate(0, -r * 1.08); ctx.rotate(-0.35); ctx.scale(moon, moon);
    const mg = ctx.createRadialGradient(-r * 0.12, -r * 0.12, 0, 0, 0, r * 0.4);
    mg.addColorStop(0, "#fff8c8"); mg.addColorStop(1, "#f2cf4f");
    ctx.fillStyle = mg; ctx.beginPath();
    ctx.arc(0, 0, r * 0.32, Math.PI * 0.15, Math.PI * 1.85);
    ctx.arc(r * 0.18, -r * 0.05, r * 0.25, Math.PI * 1.7, Math.PI * 0.3, true);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

/* st: { t, gaze{x,y}, blink 0..1, mood: idle|happy|sleep|chew, mouthOpen 0..1,
         cheeks 0..1, cream } */
export function paintFace(ctx, r, st) {
  const cream = st.cream || CLAY.cream;
  const hy = HEAD.y * r;
  // focinho/bochechas creme na metade de baixo do rosto
  ctx.save(); ctx.beginPath(); ctx.arc(0, hy, HEAD.r * r, 0, Math.PI * 2); ctx.clip();
  fillEll(ctx, 0, hy + r * 0.3, r * 0.5, r * 0.32, cream, 0, 0.45, 0.12);
  ctx.restore();

  const gx = (st.gaze ? st.gaze.x : 0) * r * 0.045, gy = (st.gaze ? st.gaze.y : 0) * r * 0.035;
  const mood = st.mood || "idle";
  const ey = hy - r * 0.02;
  const ink = CLAY.eye;

  // bochechas (blush) e bochechas infladas (pera)
  const ch = clamp(st.cheeks || 0);
  for (const side of [-1, 1]) {
    if (ch > 0.02) fillEll(ctx, side * r * 0.4, hy + r * 0.28, r * (0.14 + 0.12 * ch), r * (0.12 + 0.1 * ch), cream, 0, 0.5, 0.12);
    blob(ctx, side * r * 0.43, hy + r * 0.22, r * 0.15, r * 0.09, CLAY.blush, 0.75);
  }

  // olhos
  ctx.lineCap = "round";
  for (const side of [-1, 1]) {
    const ex = side * r * 0.26 + gx, eyy = ey + gy;
    if (mood === "happy" || mood === "sleep") {
      // feliz: ^ ^ ; dormindo: u u
      ctx.strokeStyle = ink; ctx.lineWidth = r * 0.045;
      ctx.beginPath();
      if (mood === "happy") ctx.arc(ex, eyy + r * 0.04, r * 0.085, Math.PI * 1.15, Math.PI * 1.85);
      else ctx.arc(ex, eyy - r * 0.02, r * 0.08, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
      continue;
    }
    const open = 1 - clamp(st.blink || 0);
    if (open < 0.15) { ctx.strokeStyle = ink; ctx.lineWidth = r * 0.04; ctx.beginPath(); ctx.arc(ex, eyy - r * 0.02, r * 0.08, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); continue; }
    ctx.save(); ctx.translate(ex, eyy); ctx.scale(1, open);
    // branco do olho (um fiozinho em volta, como na referência)
    ctx.fillStyle = "#ffffff"; ell(ctx, 0, 0, r * 0.122, r * 0.15); ctx.fill();
    const ig = ctx.createLinearGradient(0, -r * 0.14, 0, r * 0.14);
    ig.addColorStop(0, "#241431"); ig.addColorStop(0.6, "#4b2c6e"); ig.addColorStop(1, "#8a63c4");
    ctx.fillStyle = ig; ell(ctx, side * r * 0.006, r * 0.008, r * 0.105, r * 0.135); ctx.fill();
    ctx.fillStyle = "#170c22"; ell(ctx, 0, r * 0.01, r * 0.058, r * 0.075); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(-r * 0.035, -r * 0.055, r * 0.038, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.035, r * 0.05, r * 0.018, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // cílio no canto de fora
    ctx.strokeStyle = ink; ctx.lineWidth = r * 0.022;
    ctx.beginPath(); ctx.moveTo(ex + side * r * 0.09, eyy - r * 0.1 * open); ctx.lineTo(ex + side * r * 0.14, eyy - r * 0.15 * open); ctx.stroke();
  }
  // sobrancelhas (sobem quando feliz)
  const lift = mood === "happy" ? r * 0.035 : 0;
  ctx.strokeStyle = rgba(ink, 0.85); ctx.lineWidth = r * 0.026;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(side * r * 0.27 + gx * 0.5, ey - r * 0.2 - lift, r * 0.075, Math.PI * (side < 0 ? 1.2 : 1.35), Math.PI * (side < 0 ? 1.65 : 1.8));
    ctx.stroke();
  }

  // nariz
  const ny = hy + r * 0.17;
  ctx.fillStyle = CLAY.nose;
  ctx.beginPath(); ctx.moveTo(-r * 0.05, ny - r * 0.025); ctx.quadraticCurveTo(0, ny - r * 0.05, r * 0.05, ny - r * 0.025);
  ctx.quadraticCurveTo(r * 0.02, ny + r * 0.04, 0, ny + r * 0.04); ctx.quadraticCurveTo(-r * 0.02, ny + r * 0.04, -r * 0.05, ny - r * 0.025); ctx.fill();
  blob(ctx, -r * 0.015, ny - r * 0.02, r * 0.018, r * 0.01, "#ffffff", 0.8);

  // boca
  const my = ny + r * 0.07;
  const open = clamp(st.mouthOpen || 0);
  ctx.strokeStyle = ink; ctx.lineWidth = r * 0.026;
  ctx.beginPath(); ctx.moveTo(0, ny + r * 0.04); ctx.lineTo(0, my); ctx.stroke();   // risquinho do nariz à boca
  if (mood === "chew") {
    const c = (Math.sin((st.t || 0) * 0.028) + 1) / 2;
    ctx.fillStyle = "#6a2742"; ell(ctx, 0, my + r * 0.03, r * (0.035 + c * 0.02), r * (0.025 + c * 0.03)); ctx.fill();
  } else if (open > 0.05) {
    // boca aberta, sorrindo, com linguinha
    const w = r * 0.13, h = r * (0.06 + 0.1 * open);
    ctx.fillStyle = "#6a2742";
    ctx.beginPath(); ctx.moveTo(-w, my - r * 0.01); ctx.quadraticCurveTo(0, my + r * 0.025, w, my - r * 0.01);
    ctx.quadraticCurveTo(w * 0.85, my + h * 1.2, 0, my + h * 1.25); ctx.quadraticCurveTo(-w * 0.85, my + h * 1.2, -w, my - r * 0.01); ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = "#ff8fa8"; ell(ctx, 0, my + h * 1.15, w * 0.6, h * 0.55); ctx.fill();
    ctx.restore();
  } else {
    // sorrisinho fechado (w)
    ctx.beginPath();
    ctx.moveTo(-r * 0.09, my - r * 0.005); ctx.quadraticCurveTo(-r * 0.045, my + r * 0.05, 0, my);
    ctx.quadraticCurveTo(r * 0.045, my + r * 0.05, r * 0.09, my - r * 0.005); ctx.stroke();
  }
}

/* Desenha a criaturinha inteira (galeria e telas simples). */
export function paintClayPet(ctx, r, st) {
  paintBack(ctx, r, st);
  paintBody(ctx, r, st);
  paintFace(ctx, r, st);
}
