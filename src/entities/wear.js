/* ============================================================
   ROUPAS E BELEZA - pintores procedurais no estilo do jogo.
   Um único lugar desenha cada peça: o personagem (vestida) e o
   guarda-roupa/balcão (ícone) usam as mesmas funções.

   Coordenadas: tudo em "coordenadas do corpo" (0,0 = centro do corpo,
   r = raio), exceto quando indicado. As âncoras dizem onde cada espaço
   fica no corpo; o personagem faz translate(âncora) antes de pintar.
   ============================================================ */
import { lighten, darken, roundRect, Motion } from "../core/anim.js";

export const ANCHORS = { hat: [0.06, -0.98], face: [0, -0.14], neck: [0, 0.6], boots: [0, 0.92] };
const OW = (r) => Math.max(1.6, r * 0.05);

function fs(ctx, fill, edge, w) { ctx.strokeStyle = edge; ctx.lineWidth = w * 2; ctx.stroke(); ctx.fillStyle = fill; ctx.fill(); }
function star(ctx, x, y, R, fill, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = rot + (Math.PI * 2 * i) / 5 - Math.PI / 2;
    ctx.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R);
    ctx.lineTo(x + Math.cos(a + Math.PI / 5) * R * 0.45, y + Math.sin(a + Math.PI / 5) * R * 0.45);
  }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}
function sparkle(ctx, x, y, R, fill) {
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    ctx.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R);
    ctx.lineTo(x + Math.cos(a + Math.PI / 4) * R * 0.3, y + Math.sin(a + Math.PI / 4) * R * 0.3);
  }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}
function flower(ctx, x, y, R, petal, center) {
  ctx.fillStyle = petal;
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * R * 0.55, y + Math.sin(a) * R * 0.55, R * 0.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = center; ctx.beginPath(); ctx.arc(x, y, R * 0.38, 0, Math.PI * 2); ctx.fill();
}

// ---------------- CABEÇA (âncora: alto da cabeça) ----------------
export function paintHat(ctx, def, r, t) {
  const c = def.color, e = darken(c, 0.5), ow = OW(r);
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  switch (def.shape) {
    case "crown": {
      const big = def.gems ? 1.15 : 1;
      ctx.save(); ctx.scale(big, big);
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, 0); ctx.lineTo(-r * 0.55, -r * 0.42); ctx.lineTo(-r * 0.27, -r * 0.2);
      ctx.lineTo(0, -r * 0.55); ctx.lineTo(r * 0.27, -r * 0.2); ctx.lineTo(r * 0.55, -r * 0.42); ctx.lineTo(r * 0.5, 0);
      ctx.quadraticCurveTo(0, r * 0.08, -r * 0.5, 0); ctx.closePath();
      const g = ctx.createLinearGradient(0, -r * 0.55, 0, 0);
      g.addColorStop(0, lighten(c, 0.45)); g.addColorStop(1, c);
      fs(ctx, g, e, ow);
      for (const [x, y] of [[-0.55, -0.42], [0, -0.55], [0.55, -0.42]]) { ctx.beginPath(); ctx.arc(x * r, y * r, r * 0.06, 0, Math.PI * 2); ctx.fillStyle = "#fff4c2"; ctx.fill(); }
      const gems = def.gems ? ["#e8426b", "#5b8def", "#62c370"] : ["#e8426b"];
      gems.forEach((gc, i) => { const x = gems.length === 1 ? 0 : (i - 1) * r * 0.27; ctx.beginPath(); ctx.ellipse(x, -r * 0.1, r * 0.07, r * 0.09, 0, 0, Math.PI * 2); fs(ctx, gc, darken(gc, 0.5), ow * 0.5); });
      if (def.gems && !Motion.reduce) sparkle(ctx, r * 0.42, -r * 0.62, r * 0.09 * (0.6 + 0.4 * Math.sin(t * 0.006)), "#fff");
      ctx.restore();
      break;
    }
    case "cap": {
      ctx.beginPath(); ctx.ellipse(r * 0.55, -r * 0.02, r * 0.55, r * 0.12, -0.08, 0, Math.PI * 2); fs(ctx, darken(c, 0.15), e, ow);
      ctx.beginPath(); ctx.moveTo(-r * 0.62, 0); ctx.bezierCurveTo(-r * 0.62, -r * 0.62, r * 0.62, -r * 0.62, r * 0.62, 0); ctx.closePath();
      const g = ctx.createLinearGradient(-r * 0.6, -r * 0.5, r * 0.6, 0);
      g.addColorStop(0, lighten(c, 0.3)); g.addColorStop(1, c);
      fs(ctx, g, e, ow);
      ctx.strokeStyle = darken(c, 0.25); ctx.lineWidth = ow * 0.8;
      ctx.beginPath(); ctx.moveTo(0, -r * 0.46); ctx.lineTo(0, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -r * 0.47, r * 0.06, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
      star(ctx, -r * 0.28, -r * 0.22, r * 0.12, "#ffe27a");
      break;
    }
    case "helmet": {
      // bolha de vidro em volta da cabeça inteira (o rosto continua visível)
      const cy = r * 0.9;
      ctx.beginPath(); ctx.arc(0, cy, r * 1.18, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(190,225,255,.22)"; ctx.fill();
      ctx.strokeStyle = "rgba(120,160,210,.85)"; ctx.lineWidth = ow * 1.6; ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.55)";
      ctx.beginPath(); ctx.ellipse(-r * 0.55, cy - r * 0.6, r * 0.14, r * 0.32, 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#9aa9bd"; ctx.lineWidth = ow * 1.4;
      ctx.beginPath(); ctx.moveTo(r * 0.3, cy - r * 1.15); ctx.lineTo(r * 0.45, cy - r * 1.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(r * 0.47, cy - r * 1.55, r * 0.08, 0, Math.PI * 2); fs(ctx, "#ff5a5f", "#8a2a2c", ow * 0.5);
      break;
    }
    case "pirate": {
      ctx.beginPath();
      ctx.moveTo(-r * 0.85, -r * 0.05);
      ctx.quadraticCurveTo(-r * 0.6, -r * 0.62, 0, -r * 0.6);
      ctx.quadraticCurveTo(r * 0.6, -r * 0.62, r * 0.85, -r * 0.05);
      ctx.quadraticCurveTo(0, -r * 0.28, -r * 0.85, -r * 0.05); ctx.closePath();
      fs(ctx, c, "#15111e", ow);
      ctx.strokeStyle = "#ffc93a"; ctx.lineWidth = ow * 1.2;
      ctx.beginPath(); ctx.moveTo(-r * 0.8, -r * 0.08); ctx.quadraticCurveTo(0, -r * 0.31, r * 0.8, -r * 0.08); ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(0, -r * 0.42, r * 0.09, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = ow;
      ctx.beginPath(); ctx.moveTo(-r * 0.14, -r * 0.3); ctx.lineTo(r * 0.14, -r * 0.18); ctx.moveTo(r * 0.14, -r * 0.3); ctx.lineTo(-r * 0.14, -r * 0.18); ctx.stroke();
      break;
    }
    case "unicorn": {
      flower(ctx, -r * 0.3, -r * 0.02, r * 0.13, "#ff9fc4", "#ffd54a");
      flower(ctx, r * 0.3, -r * 0.02, r * 0.13, "#b49cff", "#ffd54a");
      ctx.beginPath(); ctx.moveTo(-r * 0.16, 0); ctx.lineTo(0, -r * 0.8); ctx.lineTo(r * 0.16, 0); ctx.quadraticCurveTo(0, r * 0.06, -r * 0.16, 0); ctx.closePath();
      const g = ctx.createLinearGradient(0, -r * 0.8, 0, 0);
      g.addColorStop(0, "#fff7c9"); g.addColorStop(1, "#ffc93a");
      fs(ctx, g, "#a8791a", ow);
      ctx.strokeStyle = "rgba(168,121,26,.6)"; ctx.lineWidth = ow * 0.8;
      for (let i = 1; i < 4; i++) { const y = -r * 0.2 * i; const hw = r * 0.16 * (1 - (i * 0.2) / 0.8); ctx.beginPath(); ctx.moveTo(-hw, y + r * 0.05); ctx.lineTo(hw, y - r * 0.03); ctx.stroke(); }
      if (!Motion.reduce) sparkle(ctx, r * 0.22, -r * 0.7, r * 0.08 * (0.6 + 0.4 * Math.sin(t * 0.007)), "#fff");
      break;
    }
    default: break;
  }
}

// ---------------- ROSTO (âncora: linha dos olhos) ----------------
export function paintFace(ctx, def, r, t) {
  const c = def.color, ow = OW(r), dx = r * 0.35;
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  switch (def.shape) {
    case "sunglasses": {
      ctx.strokeStyle = darken(c, 0.4); ctx.lineWidth = ow * 1.4;
      ctx.beginPath(); ctx.moveTo(-dx + r * 0.2, -r * 0.02); ctx.quadraticCurveTo(0, -r * 0.1, dx - r * 0.2, -r * 0.02); ctx.stroke();
      for (const s of [-1, 1]) {
        roundRect(ctx, s * dx - r * 0.26, -r * 0.2, r * 0.52, r * 0.4, r * 0.16);
        const g = ctx.createLinearGradient(0, -r * 0.2, 0, r * 0.2);
        g.addColorStop(0, "#3a2f5a"); g.addColorStop(1, "#7d5cff");
        fs(ctx, g, c, ow);
        ctx.fillStyle = "rgba(255,255,255,.5)";
        ctx.beginPath(); ctx.ellipse(s * dx - r * 0.1, -r * 0.08, r * 0.06, r * 0.035, -0.5, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case "starglasses": {
      ctx.strokeStyle = darken(c, 0.4); ctx.lineWidth = ow * 1.2;
      ctx.beginPath(); ctx.moveTo(-dx + r * 0.2, 0); ctx.lineTo(dx - r * 0.2, 0); ctx.stroke();
      for (const s of [-1, 1]) {
        star(ctx, s * dx, 0, r * 0.32, c);
        ctx.strokeStyle = darken(c, 0.45); ctx.lineWidth = ow; ctx.stroke();
        star(ctx, s * dx, r * 0.01, r * 0.2, "rgba(255,120,190,.55)");
      }
      if (!Motion.reduce) sparkle(ctx, dx + r * 0.25, -r * 0.25, r * 0.07 * (0.6 + 0.4 * Math.sin(t * 0.008)), "#fff");
      break;
    }
    case "mask": {
      ctx.beginPath();
      ctx.moveTo(-r * 0.85, -r * 0.05);
      ctx.quadraticCurveTo(-r * 0.7, -r * 0.3, -dx, -r * 0.28);
      ctx.quadraticCurveTo(0, -r * 0.18, dx, -r * 0.28);
      ctx.quadraticCurveTo(r * 0.7, -r * 0.3, r * 0.85, -r * 0.05);
      ctx.quadraticCurveTo(r * 0.6, r * 0.2, dx, r * 0.2);
      ctx.quadraticCurveTo(0, r * 0.12, -dx, r * 0.2);
      ctx.quadraticCurveTo(-r * 0.6, r * 0.2, -r * 0.85, -r * 0.05);
      ctx.closePath();
      for (const s of [-1, 1]) { ctx.moveTo(s * dx + r * 0.2, 0); ctx.ellipse(s * dx, 0, r * 0.2, r * 0.22, 0, 0, Math.PI * 2); }
      ctx.strokeStyle = darken(c, 0.5); ctx.lineWidth = ow * 1.6; ctx.stroke();
      ctx.fillStyle = c; ctx.fill("evenodd");
      break;
    }
    case "eyepatch": {
      ctx.strokeStyle = "#2a2148"; ctx.lineWidth = ow * 1.1;
      ctx.beginPath(); ctx.moveTo(-r * 0.9, -r * 0.45); ctx.lineTo(r * 0.85, r * 0.15); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(dx, 0, r * 0.25, r * 0.27, 0, 0, Math.PI * 2); fs(ctx, c, "#0d0a14", ow);
      ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.beginPath(); ctx.ellipse(dx - r * 0.08, -r * 0.1, r * 0.07, r * 0.04, -0.5, 0, Math.PI * 2); ctx.fill();
      break;
    }
    default: break;
  }
}

// ---------------- PESCOÇO (âncora: abaixo da boca) ----------------
export function paintNeck(ctx, def, r, t) {
  const c = def.color, e = darken(c, 0.5), ow = OW(r);
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  switch (def.shape) {
    case "bowtie": {
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * r * 0.2, -r * 0.2, s * r * 0.36, -r * 0.14);
        ctx.quadraticCurveTo(s * r * 0.42, 0, s * r * 0.36, r * 0.14); ctx.quadraticCurveTo(s * r * 0.2, r * 0.2, 0, 0); ctx.closePath();
        fs(ctx, c, e, ow);
        ctx.fillStyle = "rgba(255,255,255,.6)";
        for (const [a, b] of [[0.22, -0.05], [0.3, 0.06]]) { ctx.beginPath(); ctx.arc(s * a * r, b * r, r * 0.035, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.08, r * 0.1, 0, 0, Math.PI * 2); fs(ctx, darken(c, 0.12), e, ow);
      break;
    }
    case "scarf": {
      ctx.beginPath(); ctx.moveTo(-r * 0.8, -r * 0.12); ctx.quadraticCurveTo(0, r * 0.12, r * 0.8, -r * 0.12);
      ctx.lineTo(r * 0.78, r * 0.06); ctx.quadraticCurveTo(0, r * 0.3, -r * 0.78, r * 0.06); ctx.closePath();
      fs(ctx, c, e, ow);
      const sway = Motion.reduce ? 0 : Math.sin(t * 0.003) * r * 0.04;
      ctx.beginPath(); ctx.moveTo(r * 0.3, r * 0.1); ctx.lineTo(r * 0.52 + sway, r * 0.55); ctx.lineTo(r * 0.3 + sway, r * 0.6); ctx.lineTo(r * 0.14, r * 0.15); ctx.closePath();
      fs(ctx, darken(c, 0.06), e, ow);
      ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.lineWidth = ow * 1.2;
      for (const x of [-0.5, -0.2, 0.1]) { ctx.beginPath(); ctx.moveTo(x * r, r * 0.02 + Math.abs(x) * r * 0.05); ctx.lineTo(x * r + r * 0.06, r * 0.18); ctx.stroke(); }
      break;
    }
    case "flowers": {
      for (let i = 0; i < 7; i++) {
        const u = i / 6 - 0.5;
        const x = u * r * 1.4, y = -r * 0.1 + (1 - (u * 2) ** 2) * r * 0.16;
        flower(ctx, x, y, r * 0.11, ["#ff9fc4", "#ffd54a", "#b49cff", "#7fd6ff"][i % 4], "#fff4c2");
      }
      break;
    }
    case "medal": {
      ctx.beginPath(); ctx.moveTo(-r * 0.35, -r * 0.12); ctx.lineTo(-r * 0.08, r * 0.24); ctx.lineTo(r * 0.08, r * 0.24); ctx.lineTo(r * 0.35, -r * 0.12); ctx.lineTo(r * 0.18, -r * 0.12); ctx.lineTo(0, r * 0.12); ctx.lineTo(-r * 0.18, -r * 0.12); ctx.closePath();
      fs(ctx, "#5b8def", "#2d4a8f", ow * 0.8);
      ctx.beginPath(); ctx.arc(0, r * 0.35, r * 0.17, 0, Math.PI * 2);
      const g = ctx.createRadialGradient(-r * 0.05, r * 0.3, r * 0.02, 0, r * 0.35, r * 0.17);
      g.addColorStop(0, "#fff1a8"); g.addColorStop(1, c);
      fs(ctx, g, "#a8791a", ow);
      star(ctx, 0, r * 0.36, r * 0.09, "#fff4c2");
      break;
    }
    default: break;
  }
}

// ---------------- CORPO (coordenadas do corpo; recorte feito por quem chama) ----------------
export function paintBody(ctx, def, r, t) {
  const c = def.color, ow = OW(r);
  switch (def.shape) {
    case "stripes": {
      ctx.fillStyle = c; ctx.fillRect(-r * 1.2, r * 0.5, r * 2.4, r * 0.7);
      ctx.fillStyle = "rgba(255,255,255,.9)";
      for (let i = 0; i < 4; i++) ctx.fillRect(-r * 1.2, r * (0.6 + i * 0.13), r * 2.4, r * 0.06);
      break;
    }
    case "pajama": {
      ctx.fillStyle = c; ctx.fillRect(-r * 1.2, r * 0.48, r * 2.4, r * 0.7);
      ctx.fillStyle = "rgba(255,255,255,.7)";
      for (let i = 0; i < 12; i++) { const x = ((i * 37) % 11 - 5) * r * 0.18, y = r * (0.58 + ((i * 7) % 4) * 0.1); ctx.beginPath(); ctx.arc(x, y, r * 0.035, 0, Math.PI * 2); ctx.fill(); }
      star(ctx, -r * 0.42, r * 0.66, r * 0.07, "#fff4c2"); star(ctx, r * 0.4, r * 0.8, r * 0.06, "#fff4c2");
      ctx.fillStyle = "#fff";
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, r * (0.6 + i * 0.13), r * 0.03, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    case "suit": {
      ctx.fillStyle = c; ctx.fillRect(-r * 1.2, r * 0.48, r * 2.4, r * 0.7);
      ctx.fillStyle = "#cfd6e3"; ctx.fillRect(-r * 1.2, r * 0.8, r * 2.4, r * 0.09);
      ctx.fillStyle = "#ffc93a"; roundRect(ctx, -r * 0.1, r * 0.79, r * 0.2, r * 0.11, r * 0.03); ctx.fill();
      ctx.beginPath(); ctx.arc(-r * 0.42, r * 0.63, r * 0.1, 0, Math.PI * 2); ctx.fillStyle = "#5b8def"; ctx.fill();
      star(ctx, -r * 0.42, r * 0.635, r * 0.06, "#fff");
      ctx.fillStyle = "#e5484d"; roundRect(ctx, r * 0.28, r * 0.58, r * 0.2, r * 0.1, r * 0.03); ctx.fill();
      break;
    }
    default: break;
  }
  // gola: borda superior da peça
  if (def.shape !== "tutu") {
    ctx.strokeStyle = darken(c, 0.35); ctx.lineWidth = ow * 1.1;
    ctx.beginPath(); ctx.moveTo(-r * 1.2, r * 0.5); ctx.quadraticCurveTo(0, r * 0.58, r * 1.2, r * 0.5); ctx.stroke();
  }
}

/* Saia de tule: anel em volta da cintura, sem recorte (sai do corpo). */
export function paintTutu(ctx, def, r, t) {
  const c = def.color;
  const wob = Motion.reduce ? 0 : Math.sin(t * 0.004) * 0.03;
  for (let layer = 0; layer < 2; layer++) {
    ctx.beginPath();
    const y0 = r * (0.62 + layer * 0.06), rx = r * (1.12 - layer * 0.06), ry = r * 0.2;
    for (let i = 0; i <= 14; i++) {
      const a = Math.PI * (i / 14);
      const x = -Math.cos(a) * rx * (1 + wob), y = y0 + Math.sin(a) * ry * (i % 2 ? 1.25 : 1);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.quadraticCurveTo(0, y0 - ry * 0.6, -rx * (1 + wob), y0);
    ctx.closePath();
    ctx.fillStyle = layer ? lighten(c, 0.25) : c; ctx.globalAlpha = layer ? 0.95 : 0.8; ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = darken(c, 0.25); ctx.lineWidth = OW(r) * 0.8; ctx.stroke();
  }
  ctx.fillStyle = "#fff";
  for (let i = 0; i < 5; i++) sparkle(ctx, (i - 2) * r * 0.38, r * 0.76 + (i % 2) * r * 0.06, r * 0.05, "rgba(255,255,255,.9)");
}

// ---------------- COSTAS: asas (cor e forma da capa arco-íris ficam no Nubi) ----------------
export function paintWings(ctx, def, r, t) {
  const flap = Motion.reduce ? 0 : Math.sin(t * 0.006) * 0.12;
  for (const s of [-1, 1]) {
    ctx.save(); ctx.translate(s * r * 0.7, -r * 0.1); ctx.rotate(s * (0.35 + flap));
    for (const [y, R] of [[-r * 0.25, r * 0.48], [r * 0.25, r * 0.34]]) {
      ctx.beginPath(); ctx.ellipse(s * R * 0.75, y, R, R * 0.62, 0, 0, Math.PI * 2);
      const g = ctx.createRadialGradient(s * R * 0.4, y, R * 0.1, s * R * 0.75, y, R);
      g.addColorStop(0, "rgba(255,255,255,.85)"); g.addColorStop(1, "rgba(160,215,255,.55)");
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = "rgba(90,150,210,.8)"; ctx.lineWidth = OW(r); ctx.stroke();
    }
    ctx.restore();
  }
}

// ---------------- PÉS (âncora: centro entre as patas; desenha o par) ----------------
export function paintFeet(ctx, def, r, t, step = 0) {
  const c = def.color, e = darken(c, 0.5), ow = OW(r);
  for (const s of [-1, 1]) {
    ctx.save(); ctx.translate(s * r * 0.46, s * step);
    switch (def.shape) {
      case "sneakers": {
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.3, r * 0.2, 0, 0, Math.PI * 2); fs(ctx, c, e, ow);
        ctx.fillStyle = "#fff"; roundRect(ctx, -r * 0.31, r * 0.06, r * 0.62, r * 0.12, r * 0.06); ctx.fill();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = ow * 0.9;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-r * 0.12 + i * r * 0.08, -r * 0.12); ctx.lineTo(-r * 0.06 + i * r * 0.08, -r * 0.02); ctx.stroke(); }
        break;
      }
      case "slippers": {
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.32, r * 0.22, 0, 0, Math.PI * 2); fs(ctx, c, darken(c, 0.35), ow);
        for (const k of [-1, 1]) { ctx.beginPath(); ctx.ellipse(k * r * 0.1, -r * 0.24, r * 0.06, r * 0.13, k * 0.25, 0, Math.PI * 2); fs(ctx, c, darken(c, 0.35), ow * 0.7); }
        ctx.fillStyle = "#3a2f4f";
        for (const k of [-1, 1]) { ctx.beginPath(); ctx.arc(k * r * 0.07, -r * 0.04, r * 0.025, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = "#ff7aa8"; ctx.beginPath(); ctx.arc(0, r * 0.02, r * 0.03, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case "ballet": {
        ctx.strokeStyle = c; ctx.lineWidth = ow * 1.1;
        ctx.beginPath(); ctx.moveTo(-r * 0.12, -r * 0.05); ctx.lineTo(r * 0.1, -r * 0.35); ctx.moveTo(r * 0.12, -r * 0.05); ctx.lineTo(-r * 0.1, -r * 0.35); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(0, r * 0.02, r * 0.27, r * 0.16, 0, 0, Math.PI * 2); fs(ctx, c, darken(c, 0.35), ow);
        ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.ellipse(-r * 0.08, -r * 0.02, r * 0.07, r * 0.035, -0.3, 0, Math.PI * 2); ctx.fill();
        flower(ctx, 0, -r * 0.08, r * 0.06, "#fff", "#ffd54a");
        break;
      }
      case "sparkle": {
        roundRect(ctx, -r * 0.27, -r * 0.2, r * 0.54, r * 0.38, r * 0.16); fs(ctx, c, e, ow);
        roundRect(ctx, -r * 0.3, -r * 0.24, r * 0.6, r * 0.12, r * 0.06); fs(ctx, lighten(c, 0.45), e, ow * 0.7);
        const tw = Motion.reduce ? 1 : 0.6 + 0.4 * Math.sin(t * 0.008 + s);
        sparkle(ctx, -r * 0.08, r * 0.02, r * 0.07 * tw, "#fff");
        sparkle(ctx, r * 0.12, -r * 0.06, r * 0.05 * (1.6 - tw), "#ffe27a");
        break;
      }
      default: break;
    }
    ctx.restore();
  }
}

// ---------------- BELEZA ----------------
function hairCap(ctx, r) {
  ctx.beginPath();
  ctx.moveTo(-r * 0.9, -r * 0.4);
  ctx.bezierCurveTo(-r * 0.95, -r * 0.95, -r * 0.4, -r * 1.12, 0, -r * 1.1);
  ctx.bezierCurveTo(r * 0.4, -r * 1.12, r * 0.95, -r * 0.95, r * 0.9, -r * 0.4);
  // franjinha ondulada
  for (let i = 5; i >= 0; i--) {
    const x = -r * 0.9 + (i / 5) * r * 1.8;
    ctx.quadraticCurveTo(x + r * 0.18, -r * 0.48 - (i % 2) * r * 0.06, x, -r * 0.62 + (i === 0 || i === 5 ? r * 0.2 : 0));
  }
  ctx.closePath();
}

/* Penteado em coordenadas do corpo. */
export function paintHair(ctx, style, color, r, t) {
  if (!style) return;
  const e = darken(color, 0.5), ow = OW(r);
  const g = ctx.createLinearGradient(0, -r * 1.3, 0, -r * 0.4);
  g.addColorStop(0, lighten(color, 0.3)); g.addColorStop(1, color);
  const shine = () => { ctx.fillStyle = "rgba(255,255,255,.3)"; ctx.beginPath(); ctx.ellipse(-r * 0.35, -r * 0.88, r * 0.18, r * 0.06, -0.4, 0, Math.PI * 2); ctx.fill(); };
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  const sway = Motion.reduce ? 0 : Math.sin(t * 0.003) * 0.12;
  switch (style) {
    case "ponytail": {
      ctx.save(); ctx.translate(r * 0.78, -r * 0.72); ctx.rotate(0.5 + sway);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(r * 0.45, r * 0.05, r * 0.4, r * 0.65, r * 0.12, r * 0.85);
      ctx.bezierCurveTo(r * 0.1, r * 0.5, -r * 0.12, r * 0.25, 0, 0); ctx.closePath();
      fs(ctx, g, e, ow); ctx.restore();
      hairCap(ctx, r); fs(ctx, g, e, ow); shine();
      ctx.beginPath(); ctx.arc(r * 0.78, -r * 0.72, r * 0.09, 0, Math.PI * 2); fs(ctx, "#ff6b9d", "#a8325c", ow * 0.6);
      break;
    }
    case "curls": {
      const pts = [[-0.78, -0.55], [-0.62, -0.85], [-0.32, -1.03], [0, -1.1], [0.32, -1.03], [0.62, -0.85], [0.78, -0.55], [-0.35, -0.72], [0.35, -0.72], [0, -0.82]];
      ctx.strokeStyle = e; ctx.lineWidth = ow * 2;
      for (const [x, y] of pts) { ctx.beginPath(); ctx.arc(x * r, y * r, r * 0.22, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = g;
      for (const [x, y] of pts) { ctx.beginPath(); ctx.arc(x * r, y * r, r * 0.22, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = darken(color, 0.25); ctx.lineWidth = ow * 0.8;
      for (const [x, y] of pts) { ctx.beginPath(); ctx.arc(x * r, y * r, r * 0.1, 0.3, 3.6); ctx.stroke(); }
      break;
    }
    case "braids": {
      for (const s of [-1, 1]) {
        for (let i = 0; i < 4; i++) {
          const x = s * r * (0.88 + i * 0.03), y = -r * 0.45 + i * r * 0.22;
          ctx.beginPath(); ctx.ellipse(x, y, r * 0.13, r * 0.12, s * 0.3, 0, Math.PI * 2); fs(ctx, g, e, ow);
        }
        ctx.beginPath(); ctx.arc(s * r * 0.98, r * 0.38, r * 0.08, 0, Math.PI * 2); fs(ctx, "#5bc0eb", "#2d6f8f", ow * 0.6);
      }
      hairCap(ctx, r); fs(ctx, g, e, ow); shine();
      break;
    }
    case "quiff": {
      hairCap(ctx, r); fs(ctx, g, e, ow);
      ctx.beginPath();
      ctx.moveTo(-r * 0.55, -r * 0.8);
      ctx.bezierCurveTo(-r * 0.6, -r * 1.45, r * 0.35, -r * 1.55, r * 0.5, -r * 1.2);
      ctx.bezierCurveTo(r * 0.2, -r * 1.32, -r * 0.05, -r * 1.2, r * 0.2, -r * 0.95);
      ctx.closePath(); fs(ctx, g, e, ow); shine();
      break;
    }
    case "mohawk": {
      ctx.beginPath(); ctx.moveTo(-r * 0.32, -r * 0.82);
      const n = 5;
      for (let i = 0; i < n; i++) {
        const x0 = -r * 0.32 + (i / n) * r * 0.64, x1 = -r * 0.32 + ((i + 1) / n) * r * 0.64;
        const h = r * (0.42 + Math.sin((i + 0.5) / n * Math.PI) * 0.22);
        ctx.lineTo((x0 + x1) / 2 + r * 0.05, -r * 0.92 - h); ctx.lineTo(x1, -r * 0.92);
      }
      ctx.lineTo(r * 0.32, -r * 0.82); ctx.quadraticCurveTo(0, -r * 0.9, -r * 0.32, -r * 0.82); ctx.closePath();
      fs(ctx, g, e, ow);
      break;
    }
    default: break;
  }
}

export function paintHairAcc(ctx, acc, r, t) {
  const ow = OW(r);
  switch (acc) {
    case "bow": {
      ctx.save(); ctx.translate(r * 0.5, -r * 0.92); ctx.rotate(0.25);
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * r * 0.2, -r * 0.22, s * r * 0.32, -r * 0.08); ctx.quadraticCurveTo(s * r * 0.3, r * 0.14, 0, 0); ctx.closePath(); fs(ctx, "#ff6b9d", "#a8325c", ow); }
      ctx.beginPath(); ctx.arc(0, 0, r * 0.07, 0, Math.PI * 2); fs(ctx, "#ff8fb1", "#a8325c", ow * 0.7);
      ctx.restore(); break;
    }
    case "flower": flower(ctx, -r * 0.55, -r * 0.88, r * 0.16, "#ffb3d9", "#ffd54a"); break;
    case "starclip": star(ctx, r * 0.55, -r * 0.8, r * 0.17, "#ffd54a", 0.2); ctx.strokeStyle = "#a8791a"; ctx.lineWidth = ow; ctx.stroke(); break;
    case "headband": {
      ctx.strokeStyle = "#7d5cff"; ctx.lineWidth = r * 0.12;
      ctx.beginPath(); ctx.arc(0, -r * 0.2, r * 0.82, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = r * 0.03;
      ctx.beginPath(); ctx.arc(0, -r * 0.22, r * 0.82, Math.PI * 1.25, Math.PI * 1.55); ctx.stroke();
      break;
    }
    default: break;
  }
}

/* Unhas: 3 unhinhas na frente de cada patinha. paws = [{x,y,color,k}] */
export function paintNails(ctx, paws, r) {
  for (const p of paws) {
    if (!p.color || p.k <= 0.01) continue;
    for (let i = -1; i <= 1; i++) {
      const x = p.x + i * r * 0.13, y = p.y + r * 0.1;
      ctx.beginPath(); ctx.ellipse(x, y, r * 0.055 * p.k, r * 0.048 * p.k, 0, 0, Math.PI * 2);
      ctx.fillStyle = p.color; ctx.fill();
      ctx.strokeStyle = darken(p.color, 0.4); ctx.lineWidth = Math.max(1, r * 0.015); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.beginPath(); ctx.arc(x - r * 0.015, y - r * 0.015, r * 0.015 * p.k, 0, Math.PI * 2); ctx.fill();
    }
  }
}

/* Maquiagem e pinturas. Camadas: "under" (antes dos olhos) e "over" (depois). */
export function paintMakeupUnder(ctx, mk, pt, r, t, colors) {
  if (mk.blush) {
    ctx.fillStyle = `rgba(255,105,160,${0.5 * mk.blush})`;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * r * 0.62, r * 0.17, r * 0.19, r * 0.12, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  if (pt.freckles) {
    ctx.fillStyle = `rgba(150,90,50,${0.8 * pt.freckles})`;
    for (const s of [-1, 1]) for (const [a, b] of [[0.5, 0.06], [0.62, 0.1], [0.55, 0.18], [0.7, 0.03]]) { ctx.beginPath(); ctx.arc(s * a * r, b * r, r * 0.025, 0, Math.PI * 2); ctx.fill(); }
  }
  if (pt.stars) {
    ctx.globalAlpha = pt.stars;
    star(ctx, -r * 0.6, r * 0.05, r * 0.1, "#ffd54a", 0.3); star(ctx, r * 0.62, r * 0.08, r * 0.08, "#ff6b9d", -0.2); star(ctx, r * 0.5, -r * 0.03, r * 0.05, "#5bc0eb");
    ctx.globalAlpha = 1;
  }
  if (pt.hero) {
    ctx.globalAlpha = pt.hero;
    ctx.lineCap = "round"; ctx.lineWidth = r * 0.06;
    for (const s of [-1, 1]) {
      ctx.strokeStyle = "#e5484d"; ctx.beginPath(); ctx.moveTo(s * r * 0.48, r * 0.02); ctx.lineTo(s * r * 0.78, r * 0.12); ctx.stroke();
      ctx.strokeStyle = "#4f7dff"; ctx.beginPath(); ctx.moveTo(s * r * 0.48, r * 0.14); ctx.lineTo(s * r * 0.78, r * 0.24); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  if (pt.beard) {
    ctx.globalAlpha = pt.beard;
    ctx.fillStyle = "#8a5a36";
    for (let i = 0; i < 9; i++) { const a = Math.PI * (0.15 + 0.7 * i / 8); ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.42, r * 0.42 + Math.sin(a) * r * 0.2, r * 0.1, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  if (mk.lips) {
    ctx.fillStyle = colors.lips; ctx.globalAlpha = mk.lips;
    ctx.beginPath(); ctx.ellipse(0, r * 0.37, r * 0.17, r * 0.075, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export function paintMakeupOver(ctx, mk, pt, r, t, colors) {
  const eyeY = -r * 0.14, dx = r * 0.35, ew = r * 0.21, eh = r * 0.25;
  if (mk.shadow) {
    ctx.strokeStyle = colors.shadow; ctx.globalAlpha = 0.75 * mk.shadow; ctx.lineWidth = r * 0.07; ctx.lineCap = "round";
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * dx, eyeY, ew * 1.08, eh * 1.08, 0, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  if (mk.glitter) {
    for (let i = 0; i < 7; i++) {
      const a = i * 2.1 + (Motion.reduce ? 0 : t * 0.0012);
      const x = Math.cos(a) * r * 0.7, y = r * 0.05 + Math.sin(a * 1.3) * r * 0.25;
      const tw = Motion.reduce ? 0.8 : 0.4 + 0.6 * Math.abs(Math.sin(t * 0.006 + i));
      ctx.globalAlpha = mk.glitter; sparkle(ctx, x, y, r * 0.05 * tw, i % 2 ? colors.glitter : "#ffffff");
    }
    ctx.globalAlpha = 1;
  }
  if (pt.mustache) {
    ctx.globalAlpha = pt.mustache;
    ctx.strokeStyle = "#3a2f4f"; ctx.lineWidth = r * 0.07; ctx.lineCap = "round";
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, r * 0.27); ctx.quadraticCurveTo(s * r * 0.14, r * 0.21, s * r * 0.24, r * 0.27); ctx.quadraticCurveTo(s * r * 0.32, r * 0.31, s * r * 0.3, r * 0.22); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
}

/* Ícone de qualquer peça do guarda-roupa, centrado em (x,y), tamanho s.
   Peças originais (sem shape) não passam por aqui. */
export function wearIcon(ctx, def, x, y, s, t = 0) {
  ctx.save();
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  if (def.slot === "hat") {
    const r = s * (def.shape === "helmet" ? 0.45 : 0.85);
    ctx.translate(x, y + (def.shape === "helmet" ? -r * 0.45 : r * 0.3));
    if (def.shape === "helmet") { ctx.scale(1, 1); }
    paintHat(ctx, def, r, t);
  } else if (def.slot === "face") {
    ctx.translate(x, y); paintFace(ctx, def, s * 0.85, t);
  } else if (def.slot === "neck") {
    const r = s * 1.0; ctx.translate(x, y - (def.shape === "medal" ? r * 0.15 : 0)); paintNeck(ctx, def, r, t);
  } else if (def.slot === "body") {
    const r = s * 0.95;
    ctx.translate(x, y - r * 0.75);
    if (def.shape === "tutu") paintTutu(ctx, def, r * 0.85, t);
    else {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-r * 0.45, r * 0.45); ctx.lineTo(-r * 0.85, r * 0.62); ctx.lineTo(-r * 0.7, r * 0.82); ctx.lineTo(-r * 0.5, r * 0.75);
      ctx.lineTo(-r * 0.5, r * 1.1); ctx.lineTo(r * 0.5, r * 1.1); ctx.lineTo(r * 0.5, r * 0.75); ctx.lineTo(r * 0.7, r * 0.82);
      ctx.lineTo(r * 0.85, r * 0.62); ctx.lineTo(r * 0.45, r * 0.45); ctx.quadraticCurveTo(0, r * 0.62, -r * 0.45, r * 0.45); ctx.closePath();
      ctx.strokeStyle = darken(def.color, 0.45); ctx.lineWidth = OW(r) * 2; ctx.stroke();
      ctx.clip();
      paintBody(ctx, def, r, t);
      ctx.restore();
    }
  } else if (def.slot === "cape") {
    const r = s * 0.7;
    ctx.translate(x, y);
    if (def.shape === "wings") paintWings(ctx, def, r * 0.75, t);
    else {
      // capa arco-íris
      ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.8);
      ctx.quadraticCurveTo(-r * 1.1, r * 0.2, -r * 0.95, r * 0.9); ctx.quadraticCurveTo(0, r * 0.75, r * 0.95, r * 0.9);
      ctx.quadraticCurveTo(r * 1.1, r * 0.2, r * 0.5, -r * 0.8); ctx.quadraticCurveTo(0, -r * 0.55, -r * 0.5, -r * 0.8); ctx.closePath();
      ctx.fillStyle = rainbowGradient(ctx, r); ctx.strokeStyle = "#7e1d20"; ctx.lineWidth = OW(r) * 2; ctx.stroke(); ctx.fill();
    }
  } else if (def.slot === "boots") {
    ctx.translate(x, y); paintFeet(ctx, def, s * 0.95, t);
  }
  ctx.restore();
}

export function rainbowGradient(ctx, r) {
  const g = ctx.createLinearGradient(-r, 0, r, 0);
  ["#ff6b6b", "#ffb36b", "#ffe36b", "#7fe08a", "#6bb8ff", "#b49cff"].forEach((c, i) => g.addColorStop(i / 5, c));
  return g;
}
