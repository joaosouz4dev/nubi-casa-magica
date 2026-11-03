/* ============================================================
   NUBI CHINCHILA DAS NUVENS, em clay 3D (massinha/vinil).
   Uma criaturinha de fantasia inspirada na chinchila: lilás e creme,
   orelhas enormes em leque (acompanham as emoções), topete de chantilly e
   ponta da cauda em forma de nuvem (a assinatura dela), bracinhos e
   patinhas para pegar, acenar e comemorar, rosto creme simples e expressivo.
   Personalidade: pequena exploradora, carinhosa e um pouquinho atrapalhada.

   Estilo clay: sem contorno; volume com degradês radiais (luz de cima à
   esquerda), brilho especular, luz rebatida rosada na borda de baixo,
   sombra de contato e oclusão entre as partes. Nada de ctx.filter (blur
   pesa no celular): o "desfocado" vem de degradês com transparência.

   Coordenadas locais em r (raio do bichinho): origem no meio do corpo, pés
   em +r, topo da cabeça em -r, topete até ~-1.3r. Os mesmos pontos de
   antes servem para roupas e salão (ANCHORS em wear.js).

   Uso: paintBack (cauda e orelhas, atrás) -> paintBody (corpo, cabeça,
   braços, pés, topete) -> paintFace (rosto). bodyPath recorta roupas.
   ============================================================ */
import { lighten, darken, rgba, clamp } from "../core/anim.js";

export const CLAY = {
  body: "#cdb4ee",     // lilás
  cream: "#fdf2e3",    // creme (topete, cauda, rosto, barriga, patas)
  inner: "#f6abbb",    // dentro das orelhas
  blush: "#ff94b2",
  ink: "#3a2350",
  nose: "#7a3c5c",
  bounce: "#ffd6e6"    // luz rebatida (rosada) na borda de baixo
};

/* ---------- pincéis de massinha ---------- */
// degradê de volume para uma caixa (x,y,w,h): luz forte em cima à esquerda
function vol(ctx, x, y, w, h, color, light = 0.5, shade = 0.3) {
  const cx = x + w / 2, cy = y + h / 2, R = Math.max(w, h) * 0.64;
  const g = ctx.createRadialGradient(cx - w * 0.22, cy - h * 0.28, R * 0.04, cx + w * 0.04, cy + h * 0.06, R);
  g.addColorStop(0, lighten(color, light));
  g.addColorStop(0.42, lighten(color, 0.1));
  g.addColorStop(0.8, darken(color, shade * 0.45));
  g.addColorStop(1, darken(color, shade));
  return g;
}
// mancha macia (brilho, sombra, blush, luz rebatida)
function blob(ctx, x, y, rx, ry, color, a, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, rgba(color, a)); g.addColorStop(0.5, rgba(color, a * 0.62)); g.addColorStop(1, rgba(color, 0));
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
// brilho especular de massinha: mancha branca forte + pontinho
function spec(ctx, x, y, rx, ry, rot = -0.5) {
  blob(ctx, x, y, rx, ry, "#ffffff", 0.78, rot);
  blob(ctx, x - rx * 0.15, y - ry * 0.1, rx * 0.35, ry * 0.35, "#ffffff", 0.9, rot);
}

/* ---------- geometria ---------- */
const HEAD = { y: -0.28, rx: 0.76, ry: 0.66 };
const TORSO = { y: 0.52, rx: 0.6, ry: 0.5 };
export function earGeom(side, r) { return { x: side * r * 0.86, y: -r * 0.86, rx: r * 0.5, ry: r * 0.56, rot: side * 0.62 }; }
function headPath(c, r) { c.beginPath(); c.ellipse(0, HEAD.y * r, HEAD.rx * r, HEAD.ry * r, 0, 0, Math.PI * 2); }
// tronco em pera: mais largo embaixo
function torsoPath(c, r) {
  const y = TORSO.y * r, rx = TORSO.rx * r, ry = TORSO.ry * r;
  c.beginPath();
  c.moveTo(0, y - ry);
  c.bezierCurveTo(rx * 0.7, y - ry, rx * 1.02, y - ry * 0.1, rx, y + ry * 0.35);
  c.bezierCurveTo(rx * 0.98, y + ry * 0.85, rx * 0.55, y + ry, 0, y + ry);
  c.bezierCurveTo(-rx * 0.55, y + ry, -rx * 0.98, y + ry * 0.85, -rx, y + ry * 0.35);
  c.bezierCurveTo(-rx * 1.02, y - ry * 0.1, -rx * 0.7, y - ry, 0, y - ry);
  c.closePath();
}
export function bodyPath(c, r) {
  headPath(c, r);
  const y = TORSO.y * r, rx = TORSO.rx * r, ry = TORSO.ry * r;
  c.moveTo(0, y - ry);
  c.bezierCurveTo(rx * 0.7, y - ry, rx * 1.02, y - ry * 0.1, rx, y + ry * 0.35);
  c.bezierCurveTo(rx * 0.98, y + ry * 0.85, rx * 0.55, y + ry, 0, y + ry);
  c.bezierCurveTo(-rx * 0.55, y + ry, -rx * 0.98, y + ry * 0.85, -rx, y + ry * 0.35);
  c.bezierCurveTo(-rx * 1.02, y - ry * 0.1, -rx * 0.7, y - ry, 0, y - ry);
  c.closePath();
}
// nuvens: círculos (x, y, raio) em r
const TUFT = [[-0.22, -1.0, 0.2], [0.0, -1.16, 0.25], [0.27, -1.08, 0.21], [0.4, -0.94, 0.15], [0.14, -0.94, 0.22], [-0.12, -0.9, 0.18]];
const TAILTIP = [[-1.02, -0.02, 0.27], [-1.27, 0.12, 0.2], [-0.78, 0.1, 0.22], [-1.12, 0.3, 0.21], [-0.88, 0.32, 0.2]];
function cloud(ctx, list, r, k = 1) {
  ctx.beginPath();
  for (const [x, y, rr] of list) { ctx.moveTo(x * r + rr * r * k, y * r); ctx.arc(x * r, y * r, rr * r * k, 0, Math.PI * 2); }
}
function cloudBox(list, r, k) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y, rr] of list) { x0 = Math.min(x0, (x - rr * k) * r); y0 = Math.min(y0, (y - rr * k) * r); x1 = Math.max(x1, (x + rr * k) * r); y1 = Math.max(y1, (y + rr * k) * r); }
  return [x0, y0, x1 - x0, y1 - y0];
}
// nuvem de massinha: volume + sombra embaixo + brilho em cima
function clayCloud(ctx, list, r, k, cream) {
  const [bx, by, bw, bh] = cloudBox(list, r, k);
  ctx.fillStyle = vol(ctx, bx, by, bw, bh, cream, 0.55, 0.26);
  cloud(ctx, list, r, k); ctx.fill("nonzero");
  // dobrinhas entre os gomos (dão leitura de "nuvem" sem contorno)
  ctx.save(); cloud(ctx, list, r, k); ctx.clip();
  for (const [x, y, rr] of list) blob(ctx, x * r + rr * r * 0.35 * k, y * r + rr * r * 0.55 * k, rr * r * 0.6 * k, rr * r * 0.28 * k, darken(cream, 0.4), 0.22);
  ctx.restore();
}

/* ---------- camadas ---------- */
/* st: { body, cream, inner, t, earL, earR, tailWag, fluffy } */
export function paintBack(ctx, r, st) {
  const body = st.body || CLAY.body, cream = st.cream || CLAY.cream;
  // cauda: gancho lilás que sobe pelas costas e termina numa nuvem grande
  const wag = st.tailWag || 0;
  ctx.save();
  ctx.translate(-r * 0.4, r * 0.85); ctx.rotate(wag); ctx.translate(r * 0.4, -r * 0.85);
  ctx.lineCap = "round";
  const tg = ctx.createLinearGradient(-r * 0.4, r * 0.9, -r * 1.05, r * 0.1);
  tg.addColorStop(0, darken(body, 0.2)); tg.addColorStop(0.6, body); tg.addColorStop(1, lighten(body, 0.2));
  ctx.strokeStyle = tg; ctx.lineWidth = r * 0.26;
  ctx.beginPath(); ctx.moveTo(-r * 0.3, r * 0.88); ctx.bezierCurveTo(-r * 0.95, r * 0.98, -r * 1.12, r * 0.6, -r * 0.98, r * 0.2); ctx.stroke();
  // brilho ao longo da cauda
  ctx.strokeStyle = rgba("#ffffff", 0.16); ctx.lineWidth = r * 0.09;
  ctx.beginPath(); ctx.moveTo(-r * 0.62, r * 0.84); ctx.bezierCurveTo(-r * 0.95, r * 0.8, -r * 1.02, r * 0.55, -r * 0.98, r * 0.32); ctx.stroke();
  const tk = 1 + (st.fluffy || 0) * 0.22;
  clayCloud(ctx, TAILTIP, r, tk, cream);
  spec(ctx, -r * 1.08, -r * 0.1, r * 0.12, r * 0.06, -0.4);
  ctx.restore();

  // orelhas enormes em leque, atrás da cabeça
  const inner = st.inner || CLAY.inner;
  for (const side of [-1, 1]) {
    const E = earGeom(side, r), tw = (side < 0 ? st.earL : st.earR) || 0;
    ctx.save(); ctx.translate(E.x, E.y); ctx.rotate(E.rot + tw);
    ctx.fillStyle = vol(ctx, -E.rx, -E.ry, E.rx * 2, E.ry * 2, body, 0.42, 0.3);
    ell(ctx, 0, 0, E.rx, E.ry); ctx.fill();
    // dentro: rosa em leque, com veinhas saindo da base
    const ig = ctx.createRadialGradient(0, E.ry * 0.55, 0, 0, E.ry * 0.1, E.ry * 0.95);
    ig.addColorStop(0, darken(inner, 0.12)); ig.addColorStop(0.55, inner); ig.addColorStop(1, lighten(inner, 0.28));
    ctx.fillStyle = ig; ell(ctx, side * E.rx * 0.03, E.ry * 0.06, E.rx * 0.8, E.ry * 0.82); ctx.fill();
    ctx.strokeStyle = rgba(lighten(inner, 0.45), 0.6); ctx.lineWidth = r * 0.02;
    for (const a of [-0.45, 0, 0.45]) {
      ctx.beginPath(); ctx.moveTo(0, E.ry * 0.7);
      ctx.quadraticCurveTo(a * E.rx * 0.35, E.ry * 0.1, a * E.rx * 0.78, -E.ry * 0.6); ctx.stroke();
    }
    // a borda lilás faz uma sombrinha sobre o rosa
    blob(ctx, 0, -E.ry * 0.62, E.rx * 0.7, E.ry * 0.16, darken(body, 0.35), 0.22);
    spec(ctx, -side * E.rx * 0.45, -E.ry * 0.6, E.rx * 0.22, E.ry * 0.12, -0.6 * side);
    ctx.restore();
  }
}

/* st: { body, cream, t, wave (0..1 braço direito acenando), step, fluffy, moon } */
export function paintBody(ctx, r, st) {
  const body = st.body || CLAY.body, cream = st.cream || CLAY.cream;
  const step = st.step || 0;
  const wave = clamp(st.wave || 0), wob = Math.sin((st.t || 0) * 0.014) * 0.3 * wave;
  // pés creme grandes, com dedinhos
  for (const side of [-1, 1]) {
    const fx = side * r * 0.32, fy = r * 0.95 + side * step;
    fillEll(ctx, fx, fy, r * 0.25, r * 0.14, cream, 0, 0.55, 0.26);
    ctx.strokeStyle = rgba(darken(cream, 0.4), 0.55); ctx.lineWidth = r * 0.02; ctx.lineCap = "round";
    for (const d of [-0.07, 0.07]) { ctx.beginPath(); ctx.moveTo(fx + d * r, fy + r * 0.03); ctx.lineTo(fx + d * r, fy + r * 0.11); ctx.stroke(); }
  }
  // tronco em pera
  ctx.fillStyle = vol(ctx, -TORSO.rx * r, (TORSO.y - TORSO.ry) * r, TORSO.rx * 2 * r, TORSO.ry * 2 * r, body, 0.38, 0.32);
  torsoPath(ctx, r); ctx.fill();
  ctx.save(); torsoPath(ctx, r); ctx.clip();
  blob(ctx, r * 0.38, r * 0.9, r * 0.35, r * 0.16, CLAY.bounce, 0.4);           // luz rebatida do chão
  fillEll(ctx, 0, r * 0.62, r * 0.4, r * 0.38, cream, 0, 0.55, 0.2);              // barriga creme
  const fl = st.fluffy || 0;                                                     // pelo fofinho (toalha)
  if (fl > 0.02) for (let i = 0; i < 6; i++) for (const side of [-1, 1]) {
    blob(ctx, side * r * (0.54 + (i % 2) * 0.05), r * (0.18 + i * 0.13), r * 0.11 * fl, r * 0.09 * fl, lighten(body, 0.5), 0.85);
  }
  blob(ctx, 0, r * 0.12, r * 0.6, r * 0.16, darken(body, 0.55), 0.42);              // sombra da cabeça no corpo
  ctx.restore();

  // braços: o esquerdo segura a barriga; o direito acena (na frente da cabeça)
  const arm = (side, a, len) => {
    ctx.save(); ctx.translate(side * r * 0.46, r * 0.3); ctx.rotate(a);
    fillEll(ctx, 0, len * 0.5, r * 0.14, len * 0.56, body, 0, 0.42, 0.3);
    fillEll(ctx, 0, len, r * 0.14, r * 0.12, cream, 0, 0.55, 0.22);
    ctx.restore();
  };
  arm(-1, 0.55, r * 0.34);
  if (wave < 0.3) arm(1, -0.45, r * 0.34);

  // cabeça larga, com tufinhos de pelo nas bochechas
  const hy = HEAD.y * r, hrx = HEAD.rx * r, hry = HEAD.ry * r;
  for (const side of [-1, 1]) {
    ctx.fillStyle = vol(ctx, side * r * 0.6 - r * 0.14, hy, r * 0.28, r * 0.36, body, 0.3, 0.3);
    ctx.beginPath();
    ctx.moveTo(side * r * 0.66, hy + r * 0.0);
    ctx.quadraticCurveTo(side * r * 0.86, hy + r * 0.02, side * r * 0.84, hy + r * 0.11);
    ctx.quadraticCurveTo(side * r * 0.74, hy + r * 0.15, side * r * 0.82, hy + r * 0.24);
    ctx.quadraticCurveTo(side * r * 0.78, hy + r * 0.32, side * r * 0.66, hy + r * 0.3);
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = vol(ctx, -hrx, hy - hry, hrx * 2, hry * 2, body, 0.45, 0.28);
  headPath(ctx, r); ctx.fill();
  ctx.save(); headPath(ctx, r); ctx.clip();
  blob(ctx, hrx * 0.45, hy + hry * 0.75, hrx * 0.5, hry * 0.2, CLAY.bounce, 0.35);   // luz rebatida
  blob(ctx, r * 0.05, hy - hry * 0.92, hrx * 0.55, hry * 0.2, darken(body, 0.5), 0.3); // sombra do topete
  ctx.restore();
  spec(ctx, -hrx * 0.5, hy - hry * 0.45, hrx * 0.24, hry * 0.13, -0.6);

  if (wave >= 0.3) {
    ctx.save(); ctx.translate(r * 0.52, r * 0.28); ctx.rotate(-2.62 + wob);
    fillEll(ctx, 0, r * 0.25, r * 0.14, r * 0.27, body, 0, 0.42, 0.3);
    fillEll(ctx, 0, r * 0.5, r * 0.15, r * 0.13, cream, 0, 0.55, 0.22);
    ctx.restore();
  }

  // topete de chantilly (ou lua crescente, da banana)
  const moon = clamp(st.moon || 0);
  if (moon < 0.98) {
    const k = (1 - moon) * (1 + fl * 0.22);
    clayCloud(ctx, TUFT, r, k, cream);
    // redemoinho do chantilly
    blob(ctx, r * 0.12, -r * 1.0, r * 0.16, r * 0.05, darken(cream, 0.45), 0.25 * (1 - moon), -0.3);
    spec(ctx, -r * 0.08, -r * 1.24, r * 0.13, r * 0.06, -0.3);
  }
  if (moon > 0.02) {
    ctx.save(); ctx.translate(0, -r * 1.1); ctx.rotate(-0.35); ctx.scale(moon, moon);
    const mg = ctx.createRadialGradient(-r * 0.12, -r * 0.12, 0, 0, 0, r * 0.4);
    mg.addColorStop(0, "#fff8c8"); mg.addColorStop(1, "#eec440");
    ctx.fillStyle = mg; ctx.beginPath();
    ctx.arc(0, 0, r * 0.34, Math.PI * 0.15, Math.PI * 1.85);
    ctx.arc(r * 0.19, -r * 0.05, r * 0.27, Math.PI * 1.7, Math.PI * 0.3, true);
    ctx.closePath(); ctx.fill();
    spec(ctx, -r * 0.18, -r * 0.14, r * 0.07, r * 0.04, -0.6);
    ctx.restore();
  }
}

/* st: { t, gaze{x,y}, blink 0..1, mood: idle|happy|sleep|chew, mouthOpen 0..1,
         cheeks 0..1, cream } */
export function paintFace(ctx, r, st) {
  const cream = st.cream || CLAY.cream;
  const hy = HEAD.y * r;
  // máscara creme do rosto: começa logo abaixo do topete e desce até o queixo
  ctx.save(); headPath(ctx, r); ctx.clip();
  const mk = (c) => {
    c.beginPath();
    c.moveTo(0, hy - r * 0.02);
    c.bezierCurveTo(r * 0.1, hy + r * 0.1, r * 0.32, hy + r * 0.16, r * 0.5, hy + r * 0.1);
    c.bezierCurveTo(r * 0.76, hy + r * 0.04, r * 0.72, hy + r * 0.44, r * 0.4, hy + r * 0.62);
    c.bezierCurveTo(r * 0.2, hy + r * 0.72, -r * 0.2, hy + r * 0.72, -r * 0.4, hy + r * 0.62);
    c.bezierCurveTo(-r * 0.72, hy + r * 0.44, -r * 0.76, hy + r * 0.04, -r * 0.5, hy + r * 0.1);
    c.bezierCurveTo(-r * 0.32, hy + r * 0.16, -r * 0.1, hy + r * 0.1, 0, hy - r * 0.02);
    c.closePath();
  };
  ctx.fillStyle = vol(ctx, -r * 0.72, hy - r * 0.05, r * 1.44, r * 0.8, cream, 0.5, 0.18);
  mk(ctx); ctx.fill();
  blob(ctx, r * 0.4, hy + r * 0.5, r * 0.3, r * 0.12, CLAY.bounce, 0.35);
  ctx.restore();

  const gx = (st.gaze ? st.gaze.x : 0) * r * 0.045, gy = (st.gaze ? st.gaze.y : 0) * r * 0.035;
  const mood = st.mood || "idle";
  const ey = hy + r * 0.0;
  const ink = CLAY.ink;

  // bochechas: blush sempre; infladas quando come a pera
  const ch = clamp(st.cheeks || 0);
  for (const side of [-1, 1]) {
    if (ch > 0.02) fillEll(ctx, side * r * 0.42, hy + r * 0.32, r * (0.14 + 0.13 * ch), r * (0.12 + 0.11 * ch), cream, 0, 0.55, 0.18);
    blob(ctx, side * r * 0.45, hy + r * 0.26, r * 0.15, r * 0.095, CLAY.blush, 0.8);
  }

  // olhos grandes e brilhantes
  ctx.lineCap = "round";
  for (const side of [-1, 1]) {
    const ex = side * r * 0.28 + gx, eyy = ey + gy;
    if (mood === "happy" || mood === "sleep") {
      ctx.strokeStyle = ink; ctx.lineWidth = r * 0.048;
      ctx.beginPath();
      if (mood === "happy") ctx.arc(ex, eyy + r * 0.05, r * 0.095, Math.PI * 1.15, Math.PI * 1.85);   // ^ ^
      else ctx.arc(ex, eyy - r * 0.02, r * 0.09, Math.PI * 0.15, Math.PI * 0.85);                    // u u
      ctx.stroke();
      if (mood === "happy") { ctx.lineWidth = r * 0.024; ctx.beginPath(); ctx.moveTo(ex + side * r * 0.1, eyy + r * 0.0); ctx.lineTo(ex + side * r * 0.15, eyy - r * 0.035); ctx.stroke(); }
      continue;
    }
    const open = 1 - clamp(st.blink || 0);
    if (open < 0.15) { ctx.strokeStyle = ink; ctx.lineWidth = r * 0.044; ctx.beginPath(); ctx.arc(ex, eyy - r * 0.02, r * 0.09, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); continue; }
    ctx.save(); ctx.translate(ex, eyy); ctx.scale(1, open);
    blob(ctx, 0, r * 0.03, r * 0.17, r * 0.19, darken(cream, 0.5), 0.25);                 // olho "afundado" na massinha
    ctx.fillStyle = "#ffffff"; ell(ctx, 0, 0, r * 0.14, r * 0.168); ctx.fill();
    const ig = ctx.createLinearGradient(0, -r * 0.16, 0, r * 0.16);
    ig.addColorStop(0, "#1f1029"); ig.addColorStop(0.55, "#432657"); ig.addColorStop(1, "#8a5cb8");
    ctx.fillStyle = ig; ell(ctx, side * r * 0.01, r * 0.012, r * 0.122, r * 0.152); ctx.fill();
    ctx.fillStyle = "#140a1d"; ell(ctx, side * r * 0.008, r * 0.02, r * 0.066, r * 0.085); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(-r * 0.042, -r * 0.06, r * 0.047, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.04, r * 0.058, r * 0.02, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // dois cílios no canto de fora
    ctx.strokeStyle = ink; ctx.lineWidth = r * 0.024;
    for (const [a, b] of [[0.11, 0.08], [0.135, 0.02]]) {
      ctx.beginPath(); ctx.moveTo(ex + side * r * (a - 0.02), eyy - r * b * open - r * 0.06 * open);
      ctx.lineTo(ex + side * r * (a + 0.045), eyy - r * (b + 0.05) * open - r * 0.06 * open); ctx.stroke();
    }
  }
  // sobrancelhas em arco (sobem quando feliz)
  const lift = mood === "happy" ? r * 0.04 : 0;
  ctx.strokeStyle = rgba(ink, 0.9); ctx.lineWidth = r * 0.03;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(side * r * 0.3 + gx * 0.5, ey - r * 0.2 - lift, r * 0.09, Math.PI * (side < 0 ? 1.18 : 1.36), Math.PI * (side < 0 ? 1.64 : 1.82));
    ctx.stroke();
  }

  // narizinho de massinha
  const ny = hy + r * 0.2;
  ctx.fillStyle = CLAY.nose;
  ctx.beginPath(); ctx.moveTo(-r * 0.06, ny - r * 0.028); ctx.quadraticCurveTo(0, ny - r * 0.06, r * 0.06, ny - r * 0.028);
  ctx.quadraticCurveTo(r * 0.025, ny + r * 0.045, 0, ny + r * 0.045); ctx.quadraticCurveTo(-r * 0.025, ny + r * 0.045, -r * 0.06, ny - r * 0.028); ctx.fill();
  blob(ctx, -r * 0.02, ny - r * 0.022, r * 0.022, r * 0.012, "#ffffff", 0.85);

  // boca: lábio em "w" de gatinho; aberta com linguinha quando fala/ri
  const my = ny + r * 0.08;
  const open = clamp(st.mouthOpen || 0);
  ctx.strokeStyle = ink; ctx.lineWidth = r * 0.028;
  ctx.beginPath(); ctx.moveTo(0, ny + r * 0.045); ctx.lineTo(0, my); ctx.stroke();
  if (mood === "chew") {
    const c = (Math.sin((st.t || 0) * 0.028) + 1) / 2;
    ctx.fillStyle = "#6a2742"; ell(ctx, 0, my + r * 0.035, r * (0.04 + c * 0.02), r * (0.028 + c * 0.032)); ctx.fill();
  } else if (open > 0.05) {
    const w = r * 0.14, h = r * (0.07 + 0.11 * open);
    ctx.fillStyle = "#62233d";
    ctx.beginPath(); ctx.moveTo(-w, my - r * 0.005);
    ctx.quadraticCurveTo(-w * 0.5, my + r * 0.035, 0, my); ctx.quadraticCurveTo(w * 0.5, my + r * 0.035, w, my - r * 0.005);
    ctx.quadraticCurveTo(w * 0.85, my + h * 1.2, 0, my + h * 1.3); ctx.quadraticCurveTo(-w * 0.85, my + h * 1.2, -w, my - r * 0.005); ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = "#ff8aa6"; ell(ctx, 0, my + h * 1.2, w * 0.62, h * 0.6); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = ink; ctx.lineWidth = r * 0.026;
    ctx.beginPath(); ctx.moveTo(-w, my - r * 0.005); ctx.quadraticCurveTo(-w * 0.5, my + r * 0.035, 0, my); ctx.quadraticCurveTo(w * 0.5, my + r * 0.035, w, my - r * 0.005); ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, my - r * 0.01); ctx.quadraticCurveTo(-r * 0.05, my + r * 0.055, 0, my);
    ctx.quadraticCurveTo(r * 0.05, my + r * 0.055, r * 0.1, my - r * 0.01); ctx.stroke();
  }
}

/* Desenha a criaturinha inteira (galeria e telas simples). */
export function paintClayPet(ctx, r, st) {
  paintBack(ctx, r, st);
  paintBody(ctx, r, st);
  paintFace(ctx, r, st);
}
