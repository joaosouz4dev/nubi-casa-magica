/* Sistema visual dos cenários (v1.1): passadas de "atmosfera" e peças de
   decoração reutilizáveis. Tudo é desenhado UMA vez dentro de um
   CachedLayer, então nada aqui pesa no quadro a quadro.

   atmosphere(): luz ambiente + oclusão na junção parede/piso + vinheta
   + grão fino. É o que dá volume e um ar "ilustrado" a fundos que antes
   eram só gradientes chapados. */
import { roundRect, softShadow, lighten, darken } from "../core/anim.js";

let grainCanvas = null;
function grain(c) {
  if (!grainCanvas) {
    const n = 128;
    grainCanvas = document.createElement("canvas");
    grainCanvas.width = grainCanvas.height = n;
    const x = grainCanvas.getContext("2d");
    const img = x.createImageData(n, n);
    let s = 987654321;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < img.data.length; i += 4) {
      const v = rnd() < 0.5 ? 40 : 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = Math.floor(rnd() * 12);
    }
    x.putImageData(img, 0, 0);
  }
  return c.createPattern(grainCanvas, "repeat");
}

/* o = { floorY, light: { x, y, r, color }, tint, vignette } (frações da tela) */
export function atmosphere(c, w, h, m, o) {
  o = o || {};
  const tint = o.tint || "60,30,90";
  c.save();
  // oclusão onde a parede encontra o piso: o chão "assenta" no cenário
  if (o.floorY) {
    const fy = h * o.floorY;
    let g = c.createLinearGradient(0, fy - m * 0.08, 0, fy);
    g.addColorStop(0, `rgba(${tint},0)`); g.addColorStop(1, `rgba(${tint},.10)`);
    c.fillStyle = g; c.fillRect(0, fy - m * 0.08, w, m * 0.08);
    g = c.createLinearGradient(0, fy, 0, fy + m * 0.06);
    g.addColorStop(0, `rgba(${tint},.14)`); g.addColorStop(1, `rgba(${tint},0)`);
    c.fillStyle = g; c.fillRect(0, fy, w, m * 0.06);
  }
  // poça de luz quente (janela/abajur)
  if (o.light) {
    const L = o.light, lx = w * L.x, ly = h * L.y, lr = m * (L.r || 0.9);
    const g = c.createRadialGradient(lx, ly, 0, lx, ly, lr);
    const col = L.color || "255,246,220";
    g.addColorStop(0, `rgba(${col},.38)`); g.addColorStop(0.5, `rgba(${col},.14)`); g.addColorStop(1, `rgba(${col},0)`);
    c.globalCompositeOperation = "screen";
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = "source-over";
  }
  // vinheta suave: bordas um pouco mais escuras puxam o olhar para o centro
  const vg = c.createRadialGradient(w * 0.5, h * 0.55, m * 0.45, w * 0.5, h * 0.55, Math.max(w, h) * 0.78);
  vg.addColorStop(0, `rgba(${tint},0)`); vg.addColorStop(1, `rgba(${tint},${o.vignette != null ? o.vignette : 0.2})`);
  c.fillStyle = vg; c.fillRect(0, 0, w, h);
  // grão fino (textura de papel)
  c.fillStyle = grain(c); c.fillRect(0, 0, w, h);
  c.restore();
}

/* brilho especular em faixa sobre um retângulo arredondado */
export function gloss(c, x, y, w, h, r, a) {
  const g = c.createLinearGradient(0, y, 0, y + h * 0.5);
  g.addColorStop(0, `rgba(255,255,255,${a != null ? a : 0.45})`); g.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = g; roundRect(c, x + h * 0.06, y + h * 0.05, w - h * 0.12, h * 0.45, r); c.fill();
}

/* luminária pendente: fio + cúpula + halo */
export function pendantLamp(c, x, topY, botY, m, color) {
  color = color || "#ffb86b";
  c.strokeStyle = "rgba(90,60,40,.55)"; c.lineWidth = Math.max(1, m * 0.004);
  c.beginPath(); c.moveTo(x, topY); c.lineTo(x, botY - m * 0.04); c.stroke();
  const halo = c.createRadialGradient(x, botY, 0, x, botY, m * 0.22);
  halo.addColorStop(0, "rgba(255,240,190,.55)"); halo.addColorStop(1, "rgba(255,240,190,0)");
  c.fillStyle = halo; c.beginPath(); c.arc(x, botY, m * 0.22, 0, Math.PI * 2); c.fill();
  const r = m * 0.06;
  const g = c.createLinearGradient(x - r, 0, x + r, 0);
  g.addColorStop(0, darken(color, 0.12)); g.addColorStop(0.4, lighten(color, 0.25)); g.addColorStop(1, darken(color, 0.2));
  c.fillStyle = g;
  c.beginPath(); c.moveTo(x - r * 0.35, botY - r * 0.75); c.lineTo(x + r * 0.35, botY - r * 0.75);
  c.quadraticCurveTo(x + r * 1.05, botY - r * 0.3, x + r, botY); c.lineTo(x - r, botY);
  c.quadraticCurveTo(x - r * 1.05, botY - r * 0.3, x - r * 0.35, botY - r * 0.75); c.fill();
  c.fillStyle = "#fff6c8"; c.beginPath(); c.ellipse(x, botY, r * 0.9, r * 0.22, 0, 0, Math.PI); c.fill();
}

/* plantinha em vaso (base no chão em x,y; s = altura total) */
export function plant(c, x, y, s, pot) {
  pot = pot || "#ff9f7a";
  softShadow(c, x, y + s * 0.02, s * 0.32, s * 0.06, 0.18);
  const leaves = [[-0.5, -0.95, -0.5], [0.45, -0.9, 0.5], [-0.15, -1.15, -0.1], [0.2, -1.05, 0.25], [-0.7, -0.7, -0.9], [0.65, -0.68, 0.9]];
  for (let i = 0; i < leaves.length; i++) {
    const [dx, dy, rot] = leaves[i];
    c.save(); c.translate(x + dx * s * 0.25, y - s * 0.45 + dy * s * 0.3); c.rotate(rot);
    const g = c.createLinearGradient(0, -s * 0.2, 0, s * 0.2);
    g.addColorStop(0, i % 2 ? "#7fd67a" : "#6cc96e"); g.addColorStop(1, "#3f9e55");
    c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, s * 0.09, s * 0.22, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = Math.max(1, s * 0.012);
    c.beginPath(); c.moveTo(0, -s * 0.16); c.lineTo(0, s * 0.16); c.stroke();
    c.restore();
  }
  const pw = s * 0.42, ph = s * 0.34;
  const g = c.createLinearGradient(x - pw / 2, 0, x + pw / 2, 0);
  g.addColorStop(0, darken(pot, 0.08)); g.addColorStop(0.35, lighten(pot, 0.18)); g.addColorStop(1, darken(pot, 0.18));
  c.fillStyle = g;
  c.beginPath(); c.moveTo(x - pw / 2, y - ph); c.lineTo(x + pw / 2, y - ph); c.lineTo(x + pw * 0.38, y); c.lineTo(x - pw * 0.38, y); c.closePath(); c.fill();
  c.fillStyle = darken(pot, 0.1); roundRect(c, x - pw * 0.56, y - ph - s * 0.05, pw * 1.12, s * 0.08, s * 0.03); c.fill();
}

/* quadrinho na parede; art(c, x, y, w, h) desenha o conteúdo */
export function frame(c, x, y, fw, fh, m, art, color) {
  color = color || "#ffffff";
  c.save(); c.shadowColor = "rgba(60,30,80,.22)"; c.shadowBlur = m * 0.025; c.shadowOffsetY = m * 0.008;
  c.fillStyle = color; roundRect(c, x, y, fw, fh, m * 0.014); c.fill(); c.restore();
  const b = m * 0.012;
  c.save(); roundRect(c, x + b, y + b, fw - b * 2, fh - b * 2, m * 0.008); c.clip();
  art(c, x + b, y + b, fw - b * 2, fh - b * 2);
  c.restore();
  c.fillStyle = "rgba(255,255,255,.25)";
  c.beginPath(); c.moveTo(x + b, y + b); c.lineTo(x + fw * 0.5, y + b); c.lineTo(x + b, y + fh * 0.55); c.closePath(); c.fill();
}

/* arte pronta para quadros: paisagem de colinas com sol */
export function artHills(c, x, y, w, h) {
  const sky = c.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, "#ffd9c2"); sky.addColorStop(1, "#ffeedd");
  c.fillStyle = sky; c.fillRect(x, y, w, h);
  c.fillStyle = "#ffb35c"; c.beginPath(); c.arc(x + w * 0.7, y + h * 0.38, h * 0.16, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#9bd88a"; c.beginPath(); c.ellipse(x + w * 0.25, y + h, w * 0.55, h * 0.42, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#74c27a"; c.beginPath(); c.ellipse(x + w * 0.85, y + h * 1.05, w * 0.5, h * 0.4, 0, 0, Math.PI * 2); c.fill();
}

/* arte pronta: coração */
export function artHeart(bg, fg) {
  return (c, x, y, w, h) => {
    c.fillStyle = bg; c.fillRect(x, y, w, h);
    const cx = x + w / 2, cy = y + h * 0.52, r = Math.min(w, h) * 0.3;
    c.fillStyle = fg;
    c.beginPath(); c.moveTo(cx, cy + r);
    c.bezierCurveTo(cx - r * 1.6, cy - r * 0.2, cx - r * 0.6, cy - r * 1.3, cx, cy - r * 0.4);
    c.bezierCurveTo(cx + r * 0.6, cy - r * 1.3, cx + r * 1.6, cy - r * 0.2, cx, cy + r);
    c.fill();
  };
}

/* arte pronta: estrela */
export function artStar(bg, fg) {
  return (c, x, y, w, h) => {
    c.fillStyle = bg; c.fillRect(x, y, w, h);
    const cx = x + w / 2, cy = y + h / 2, R = Math.min(w, h) * 0.34, r = R * 0.45;
    c.fillStyle = fg; c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R;
      c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    c.closePath(); c.fill();
  };
}

/* relógio de parede (estático, ponteiros "10 para as 2", a pose clássica) */
export function wallClock(c, x, y, r, m, color) {
  color = color || "#ffb7c8";
  c.save(); c.shadowColor = "rgba(60,30,80,.22)"; c.shadowBlur = m * 0.02; c.shadowOffsetY = m * 0.006;
  c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.restore();
  c.fillStyle = "#fffdf7"; c.beginPath(); c.arc(x, y, r * 0.8, 0, Math.PI * 2); c.fill();
  c.fillStyle = darken(color, 0.25);
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    c.beginPath(); c.arc(x + Math.cos(a) * r * 0.66, y + Math.sin(a) * r * 0.66, r * (i % 3 ? 0.035 : 0.06), 0, Math.PI * 2); c.fill();
  }
  c.strokeStyle = "#4a3f5c"; c.lineCap = "round";
  c.lineWidth = r * 0.09; c.beginPath(); c.moveTo(x, y); c.lineTo(x - r * 0.3, y - r * 0.22); c.stroke();
  c.lineWidth = r * 0.06; c.beginPath(); c.moveTo(x, y); c.lineTo(x + r * 0.32, y - r * 0.38); c.stroke();
  c.fillStyle = "#ff6f91"; c.beginPath(); c.arc(x, y, r * 0.08, 0, Math.PI * 2); c.fill();
}

/* janelinha redonda (escotilha) com céu e uma nuvem */
export function roundWindow(c, x, y, r, m, frameCol) {
  frameCol = frameCol || "#ffffff";
  c.save(); c.shadowColor = "rgba(40,90,140,.22)"; c.shadowBlur = m * 0.03; c.shadowOffsetY = m * 0.008;
  c.fillStyle = frameCol; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.restore();
  const ir = r * 0.84;
  c.save(); c.beginPath(); c.arc(x, y, ir, 0, Math.PI * 2); c.clip();
  const sky = c.createLinearGradient(0, y - ir, 0, y + ir);
  sky.addColorStop(0, "#7fcaff"); sky.addColorStop(1, "#d8f1ff");
  c.fillStyle = sky; c.fillRect(x - ir, y - ir, ir * 2, ir * 2);
  c.fillStyle = "#fff";
  c.beginPath(); c.arc(x - ir * 0.2, y + ir * 0.15, ir * 0.24, 0, Math.PI * 2); c.arc(x + ir * 0.15, y + ir * 0.05, ir * 0.3, 0, Math.PI * 2); c.arc(x + ir * 0.48, y + ir * 0.2, ir * 0.2, 0, Math.PI * 2); c.fill();
  c.fillStyle = "rgba(255,255,255,.35)";
  c.beginPath(); c.moveTo(x - ir, y - ir * 0.2); c.lineTo(x - ir * 0.2, y - ir); c.lineTo(x + ir * 0.1, y - ir); c.lineTo(x - ir, y + ir * 0.1); c.fill();
  c.restore();
  c.strokeStyle = darken(frameCol, 0.08); c.lineWidth = r * 0.06;
  c.beginPath(); c.arc(x, y, ir, 0, Math.PI * 2); c.stroke();
}

/* tapete oval com borda e estampa de bolinhas */
export function rug(c, cx, cy, rx, ry, col, dot) {
  softShadow(c, cx, cy + ry * 0.15, rx * 1.02, ry * 1.1, 0.12);
  c.fillStyle = darken(col, 0.08); c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = col; c.beginPath(); c.ellipse(cx, cy - ry * 0.06, rx * 0.97, ry * 0.9, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = Math.max(1, ry * 0.05); c.setLineDash([ry * 0.12, ry * 0.12]);
  c.beginPath(); c.ellipse(cx, cy - ry * 0.06, rx * 0.86, ry * 0.76, 0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
  if (dot) {
    c.fillStyle = dot;
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2;
      c.beginPath(); c.arc(cx + Math.cos(a) * rx * 0.55, cy - ry * 0.06 + Math.sin(a) * ry * 0.45, ry * 0.07, 0, Math.PI * 2); c.fill();
    }
  }
}
