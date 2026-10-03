/* Arte das comidas: um pintor por formato, todos centrados em (0,0) e
   dimensionados pelo raio r. Estilo comum (o mesmo do resto do jogo):
   contorno macio e escuro, gradiente com luz vinda do alto à esquerda,
   brilho especular e pequenos detalhes de textura (sementes, poros, gotas).
   Usado pelo FoodItem (mesa da cozinha) e pelos ícones (balão, álbum). */
import { lighten, darken } from "../core/anim.js";

function outlineFill(ctx, fill, edge, ow) {
  ctx.strokeStyle = edge; ctx.lineWidth = ow * 2; ctx.stroke();
  ctx.fillStyle = fill; ctx.fill();
}
function radial(ctx, r, color, cx = -0.35, cy = -0.4) {
  const g = ctx.createRadialGradient(r * cx, r * cy, r * 0.08, 0, 0, r * 1.25);
  g.addColorStop(0, lighten(color, 0.42)); g.addColorStop(0.55, color); g.addColorStop(1, darken(color, 0.22));
  return g;
}
function vertical(ctx, y0, y1, top, bottom) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, top); g.addColorStop(1, bottom);
  return g;
}
function shine(ctx, x, y, rx, ry, rot, a = 0.65) {
  ctx.fillStyle = `rgba(255,255,255,${a})`;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fill();
}
function dot(ctx, x, y, r, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
function leaf(ctx, x, y, rx, ry, rot, color, ow) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath(); ctx.moveTo(-rx, 0); ctx.quadraticCurveTo(0, -ry * 2, rx, 0); ctx.quadraticCurveTo(0, ry * 2, -rx, 0); ctx.closePath();
  outlineFill(ctx, vertical(ctx, -ry, ry, lighten(color, 0.25), darken(color, 0.1)), darken(color, 0.5), ow);
  ctx.strokeStyle = darken(color, 0.35); ctx.lineWidth = ow * 0.8;
  ctx.beginPath(); ctx.moveTo(-rx * 0.7, 0); ctx.lineTo(rx * 0.7, 0); ctx.stroke();
  ctx.restore();
}
function star(ctx, x, y, r, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = rot + (Math.PI * 2 * i) / 5 - Math.PI / 2;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    ctx.lineTo(x + Math.cos(a + Math.PI / 5) * r * 0.48, y + Math.sin(a + Math.PI / 5) * r * 0.48);
  }
  ctx.closePath();
}

const P = {
  berry(ctx, d, r, ow) {
    // cachinho de 3 frutinhas: a da frente maior, com coroinha
    const c = d.color, e = darken(c, 0.55);
    leaf(ctx, r * 0.25, -r * 0.95, r * 0.32, r * 0.16, -0.5, d.leaf || "#4caf6a", ow);
    for (const [x, y, k] of [[-0.42, -0.25, 0.55], [0.42, -0.3, 0.52], [0, 0.12, 0.82]]) {
      ctx.beginPath(); ctx.arc(x * r, y * r, r * k, 0, Math.PI * 2);
      outlineFill(ctx, radial(ctx, r * k, c), e, ow);
      ctx.save(); ctx.translate(x * r, y * r);
      ctx.strokeStyle = darken(c, 0.45); ctx.lineWidth = ow * 0.9;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
        ctx.moveTo(0, -r * k * 0.55); ctx.lineTo(Math.cos(a) * r * k * 0.2, -r * k * 0.55 + Math.sin(a) * r * k * 0.2);
      }
      ctx.stroke();
      shine(ctx, -r * k * 0.35, -r * k * 0.2, r * k * 0.18, r * k * 0.28, -0.5);
      ctx.restore();
    }
  },
  strawberry(ctx, d, r, ow) {
    ctx.beginPath();
    ctx.moveTo(0, r * 1.02);
    ctx.bezierCurveTo(-r * 1.15, r * 0.25, -r * 0.98, -r * 0.78, 0, -r * 0.62);
    ctx.bezierCurveTo(r * 0.98, -r * 0.78, r * 1.15, r * 0.25, 0, r * 1.02);
    ctx.closePath();
    outlineFill(ctx, radial(ctx, r, d.color), darken(d.color, 0.55), ow);
    // sementinhas em fileiras alternadas
    for (let row = 0; row < 4; row++) {
      const y = -r * 0.32 + row * r * 0.3, n = 4 - (row === 3 ? 2 : row === 2 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const x = (i - (n - 1) / 2) * r * 0.38 + (row % 2 ? r * 0.08 : 0);
        ctx.fillStyle = "rgba(120,20,40,.35)"; ctx.beginPath(); ctx.ellipse(x + r * 0.02, y + r * 0.03, r * 0.05, r * 0.08, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff1b0"; ctx.beginPath(); ctx.ellipse(x, y, r * 0.045, r * 0.075, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    for (let i = -2; i <= 2; i++) leaf(ctx, i * r * 0.2, -r * 0.7, r * 0.22, r * 0.1, i * 0.45, d.leaf || "#4caf6a", ow * 0.9);
    ctx.strokeStyle = "#3e7d3a"; ctx.lineWidth = ow * 1.4;
    ctx.beginPath(); ctx.moveTo(0, -r * 0.75); ctx.lineTo(r * 0.05, -r * 1.02); ctx.stroke();
    shine(ctx, -r * 0.42, -r * 0.15, r * 0.12, r * 0.22, -0.4);
  },
  banana(ctx, d, r, ow) {
    // banana gordinha em meia-lua: barriga cheia embaixo, curva interna em
    // cima, cabinho verde-marrom à direita e pontinha escura à esquerda
    const c = d.color, edge = darken(c, 0.6);
    ctx.save(); ctx.rotate(-0.12);
    // cabinho (atrás do corpo)
    ctx.beginPath();
    ctx.moveTo(r * 0.7, -r * 0.42); ctx.lineTo(r * 0.98, -r * 0.82); ctx.lineTo(r * 1.1, -r * 0.74); ctx.lineTo(r * 0.88, -r * 0.3); ctx.closePath();
    outlineFill(ctx, vertical(ctx, -r * 0.8, -r * 0.3, "#9bb04a", "#7a6a2a"), "#4a3a14", ow);
    // corpo
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(-r * 0.96, -r * 0.5);
      ctx.bezierCurveTo(-r * 0.95, r * 0.55, r * 0.55, r * 0.95, r * 0.92, -r * 0.36);
      ctx.bezierCurveTo(r * 0.8, -r * 0.28, r * 0.7, -r * 0.32, r * 0.66, -r * 0.42);
      ctx.bezierCurveTo(r * 0.4, r * 0.25, -r * 0.5, r * 0.2, -r * 0.72, -r * 0.6);
      ctx.quadraticCurveTo(-r * 0.86, -r * 0.62, -r * 0.96, -r * 0.5);
      ctx.closePath();
    };
    body();
    outlineFill(ctx, vertical(ctx, -r * 0.4, r * 0.6, lighten(c, 0.3), darken(c, 0.1)), edge, ow);
    // faceta de baixo mais escura (dá volume)
    ctx.save(); body(); ctx.clip();
    ctx.beginPath();
    ctx.moveTo(-r * 1.0, -r * 0.3);
    ctx.bezierCurveTo(-r * 0.8, r * 0.42, r * 0.5, r * 0.62, r * 0.95, -r * 0.3);
    ctx.lineTo(r * 1.2, r * 1.2); ctx.lineTo(-r * 1.2, r * 1.2); ctx.closePath();
    ctx.fillStyle = "rgba(200,130,20,.28)"; ctx.fill();
    ctx.restore();
    // aresta da faceta
    ctx.strokeStyle = darken(c, 0.28); ctx.lineWidth = ow * 0.8;
    ctx.beginPath(); ctx.moveTo(-r * 0.86, -r * 0.42); ctx.bezierCurveTo(-r * 0.74, r * 0.36, r * 0.48, r * 0.56, r * 0.84, -r * 0.32); ctx.stroke();
    // pontinha escura e pintinhas de banana madura
    ctx.beginPath(); ctx.ellipse(-r * 0.86, -r * 0.56, r * 0.11, r * 0.08, -0.6, 0, Math.PI * 2);
    ctx.fillStyle = "#5a3a18"; ctx.fill();
    for (const [x, y] of [[-0.35, 0.3], [0.1, 0.42], [0.45, 0.2]]) dot(ctx, x * r, y * r, r * 0.035, "rgba(110,70,20,.45)");
    // brilho ao longo da curva interna
    ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = ow * 1.3;
    ctx.beginPath(); ctx.moveTo(-r * 0.62, -r * 0.3); ctx.bezierCurveTo(-r * 0.45, r * 0.12, r * 0.1, r * 0.2, r * 0.4, r * 0.02); ctx.stroke();
    ctx.restore();
  },
  pear(ctx, d, r, ow) {
    ctx.strokeStyle = "#6b4a24"; ctx.lineWidth = Math.max(2, r * 0.12);
    ctx.beginPath(); ctx.moveTo(0, -r * 0.7); ctx.quadraticCurveTo(r * 0.05, -r * 0.95, r * 0.15, -r * 1.08); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.78);
    ctx.bezierCurveTo(r * 0.45, -r * 0.78, r * 0.4, -r * 0.2, r * 0.7, r * 0.2);
    ctx.bezierCurveTo(r * 1.0, r * 0.75, r * 0.5, r * 1.05, 0, r * 1.05);
    ctx.bezierCurveTo(-r * 0.5, r * 1.05, -r * 1.0, r * 0.75, -r * 0.7, r * 0.2);
    ctx.bezierCurveTo(-r * 0.4, -r * 0.2, -r * 0.45, -r * 0.78, 0, -r * 0.78);
    ctx.closePath();
    outlineFill(ctx, radial(ctx, r, d.color, -0.3, 0.1), darken(d.color, 0.55), ow);
    // bochecha rosada e pintinhas
    ctx.fillStyle = "rgba(255,140,110,.28)"; ctx.beginPath(); ctx.ellipse(r * 0.35, r * 0.45, r * 0.28, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    for (const [x, y] of [[-0.3, 0.5], [0.1, 0.7], [0.4, 0.2], [-0.1, 0.1]]) dot(ctx, x * r, y * r, r * 0.03, "rgba(90,110,30,.45)");
    leaf(ctx, r * 0.38, -r * 0.92, r * 0.24, r * 0.11, -0.6, d.leaf || "#4caf6a", ow);
    shine(ctx, -r * 0.32, r * 0.18, r * 0.13, r * 0.28, -0.3);
  },
  watermelon(ctx, d, r, ow) {
    // fatia em meia-lua: casca verde, faixa clara, polpa vermelha com sementes
    ctx.save(); ctx.translate(0, r * 0.15);
    const R = r * 1.08;
    ctx.beginPath(); ctx.moveTo(-R, -r * 0.35); ctx.arc(0, -r * 0.35, R, 0, Math.PI, false); ctx.closePath();
    outlineFill(ctx, vertical(ctx, -r * 0.35, R, "#5fc46a", "#2f8a3d"), "#1f5a28", ow);
    ctx.beginPath(); ctx.moveTo(-R * 0.86, -r * 0.35); ctx.arc(0, -r * 0.35, R * 0.86, 0, Math.PI, false); ctx.closePath();
    ctx.fillStyle = "#e9ffd8"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-R * 0.78, -r * 0.35); ctx.arc(0, -r * 0.35, R * 0.78, 0, Math.PI, false); ctx.closePath();
    ctx.fillStyle = vertical(ctx, -r * 0.35, R * 0.7, lighten(d.color, 0.25), darken(d.color, 0.08)); ctx.fill();
    ctx.fillStyle = "#3a2420";
    for (const [x, y] of [[-0.45, -0.1], [0, 0.05], [0.45, -0.1], [-0.22, 0.32], [0.22, 0.32]]) {
      ctx.beginPath(); ctx.ellipse(x * r, y * r, r * 0.05, r * 0.09, x * 0.8, 0, Math.PI * 2); ctx.fill();
    }
    shine(ctx, -r * 0.4, -r * 0.25, r * 0.22, r * 0.06, 0, 0.45);
    ctx.restore();
  },
  grapes(ctx, d, r, ow) {
    ctx.strokeStyle = "#6b4a24"; ctx.lineWidth = Math.max(2, r * 0.12);
    ctx.beginPath(); ctx.moveTo(0, -r * 0.7); ctx.quadraticCurveTo(-r * 0.05, -r * 0.95, r * 0.1, -r * 1.05); ctx.stroke();
    leaf(ctx, r * 0.42, -r * 0.85, r * 0.3, r * 0.15, -0.3, "#6fbf55", ow);
    const balls = [[-0.45, -0.45], [0, -0.5], [0.45, -0.45], [-0.25, -0.05], [0.25, -0.05], [-0.48, 0.32], [0.48, 0.32], [0, 0.35], [-0.2, 0.72], [0.2, 0.72]];
    for (const [x, y] of balls) {
      ctx.beginPath(); ctx.arc(x * r, y * r, r * 0.27, 0, Math.PI * 2);
      outlineFill(ctx, radial(ctx, r * 0.27, d.color), darken(d.color, 0.55), ow * 0.8);
      shine(ctx, x * r - r * 0.09, y * r - r * 0.09, r * 0.06, r * 0.09, -0.5, 0.7);
    }
  },
  orange(ctx, d, r, ow) {
    ctx.beginPath(); ctx.arc(0, r * 0.05, r * 0.95, 0, Math.PI * 2);
    outlineFill(ctx, radial(ctx, r, d.color), darken(d.color, 0.55), ow);
    // poros da casca
    for (let i = 0; i < 14; i++) {
      const a = i * 2.4, k = 0.25 + (i % 5) * 0.14;
      dot(ctx, Math.cos(a) * r * k, r * 0.05 + Math.sin(a) * r * k, r * 0.025, "rgba(180,80,0,.28)");
    }
    dot(ctx, 0, -r * 0.82, r * 0.08, "#7a5a20");
    leaf(ctx, r * 0.3, -r * 0.95, r * 0.3, r * 0.14, -0.4, "#4caf6a", ow);
    shine(ctx, -r * 0.38, -r * 0.3, r * 0.18, r * 0.3, -0.6);
  },
  apple(ctx, d, r, ow) {
    ctx.strokeStyle = "#6b4a24"; ctx.lineWidth = Math.max(2, r * 0.13);
    ctx.beginPath(); ctx.moveTo(0, -r * 0.62); ctx.quadraticCurveTo(r * 0.02, -r * 0.92, r * 0.14, -r * 1.05); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.6);
    ctx.bezierCurveTo(r * 0.55, -r * 0.95, r * 1.1, -r * 0.5, r * 0.95, r * 0.2);
    ctx.bezierCurveTo(r * 0.85, r * 0.8, r * 0.45, r * 1.05, r * 0.2, r * 0.95);
    ctx.quadraticCurveTo(0, r * 0.88, -r * 0.2, r * 0.95);
    ctx.bezierCurveTo(-r * 0.45, r * 1.05, -r * 0.85, r * 0.8, -r * 0.95, r * 0.2);
    ctx.bezierCurveTo(-r * 1.1, -r * 0.5, -r * 0.55, -r * 0.95, 0, -r * 0.6);
    ctx.closePath();
    outlineFill(ctx, radial(ctx, r, d.color), darken(d.color, 0.55), ow);
    leaf(ctx, -r * 0.3, -r * 0.88, r * 0.28, r * 0.13, 0.5, "#4caf6a", ow);
    shine(ctx, -r * 0.45, -r * 0.2, r * 0.13, r * 0.3, -0.35);
    shine(ctx, -r * 0.2, -r * 0.55, r * 0.07, r * 0.05, 0, 0.5);
  },
  sandwich(ctx, d, r, ow) {
    // pão triangular com recheio aparecendo
    const tri = (dy, k) => { ctx.beginPath(); ctx.moveTo(-r * k, r * 0.55 + dy); ctx.lineTo(0, -r * 0.85 * k + dy); ctx.lineTo(r * k, r * 0.55 + dy); ctx.closePath(); };
    tri(r * 0.18, 1.0); outlineFill(ctx, "#e9b46a", "#8a5a24", ow);
    // alface ondulada
    ctx.beginPath(); ctx.moveTo(-r * 1.02, r * 0.5);
    for (let i = 0; i <= 8; i++) ctx.quadraticCurveTo(-r * 1.02 + (i - 0.5) * r * 0.255, r * (i % 2 ? 0.66 : 0.42), -r * 1.02 + i * r * 0.255, r * 0.52);
    ctx.lineTo(r * 0.9, r * 0.38); ctx.lineTo(-r * 0.9, r * 0.38); ctx.closePath();
    outlineFill(ctx, "#7fd06a", "#3c8a30", ow * 0.8);
    // queijo e tomate
    ctx.fillStyle = "#ffd54a"; ctx.beginPath(); ctx.moveTo(-r * 0.85, r * 0.32); ctx.lineTo(r * 0.85, r * 0.32); ctx.lineTo(r * 0.55, r * 0.5); ctx.lineTo(r * 0.3, r * 0.4); ctx.lineTo(-r * 0.6, r * 0.5); ctx.closePath(); ctx.fill();
    dot(ctx, -r * 0.35, r * 0.3, r * 0.16, "#e8424b"); dot(ctx, r * 0.3, r * 0.3, r * 0.15, "#e8424b");
    // fatia de cima mais alta: o recheio aparece por baixo dela
    const up = -r * 0.24;
    tri(up, 0.95); outlineFill(ctx, vertical(ctx, -r * 0.8 + up, r * 0.5 + up, "#fff1d0", "#f2d29a"), "#8a5a24", ow);
    ctx.strokeStyle = "#d9a056"; ctx.lineWidth = ow * 1.6;
    ctx.beginPath(); ctx.moveTo(-r * 0.8, r * 0.5 + up); ctx.lineTo(0, -r * 0.72 + up); ctx.lineTo(r * 0.8, r * 0.5 + up); ctx.stroke();
    for (const [x, y] of [[-0.15, 0.05], [0.12, -0.2], [0.2, 0.25]]) dot(ctx, x * r, y * r + up, r * 0.03, "rgba(170,120,60,.5)");
  },
  pizza(ctx, d, r, ow) {
    ctx.save(); ctx.rotate(0.15);
    ctx.beginPath(); ctx.moveTo(0, r * 1.0); ctx.lineTo(-r * 0.8, -r * 0.6); ctx.quadraticCurveTo(0, -r * 0.98, r * 0.8, -r * 0.6); ctx.closePath();
    outlineFill(ctx, vertical(ctx, -r * 0.8, r, "#ffd86b", "#f3b23a"), "#9a5a1a", ow);
    // borda de pão
    ctx.beginPath(); ctx.moveTo(-r * 0.86, -r * 0.62); ctx.quadraticCurveTo(0, -r * 1.08, r * 0.86, -r * 0.62);
    ctx.strokeStyle = "#9a5a1a"; ctx.lineWidth = r * 0.3; ctx.stroke();
    ctx.strokeStyle = "#e3a14f"; ctx.lineWidth = r * 0.2; ctx.stroke();
    // queijo escorrendo
    ctx.fillStyle = "#ffe48a";
    ctx.beginPath(); ctx.ellipse(-r * 0.22, r * 0.32, r * 0.08, r * 0.18, 0.3, 0, Math.PI * 2); ctx.fill();
    for (const [x, y, k] of [[-0.3, -0.35, 0.16], [0.28, -0.3, 0.15], [0.02, 0.1, 0.14], [-0.1, 0.55, 0.1]]) {
      dot(ctx, x * r, y * r, r * k, "#d8434a"); dot(ctx, x * r - r * k * 0.3, y * r - r * k * 0.3, r * k * 0.3, "rgba(255,255,255,.4)");
    }
    leaf(ctx, r * 0.3, r * 0.2, r * 0.12, r * 0.06, 0.6, "#4caf6a", ow * 0.7);
    ctx.restore();
  },
  carrot(ctx, d, r, ow) {
    ctx.save(); ctx.rotate(-0.5);
    for (const a of [-0.45, 0, 0.45]) leaf(ctx, Math.sin(a) * r * 0.25, -r * 0.95, r * 0.3, r * 0.1, -Math.PI / 2 + a, "#5cbf4a", ow * 0.8);
    ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.62); ctx.quadraticCurveTo(0, -r * 0.82, r * 0.4, -r * 0.62);
    ctx.quadraticCurveTo(r * 0.3, r * 0.3, 0, r * 1.05); ctx.quadraticCurveTo(-r * 0.3, r * 0.3, -r * 0.4, -r * 0.62); ctx.closePath();
    const g = ctx.createLinearGradient(-r * 0.4, 0, r * 0.4, 0);
    g.addColorStop(0, lighten(d.color, 0.3)); g.addColorStop(1, darken(d.color, 0.15));
    outlineFill(ctx, g, darken(d.color, 0.55), ow);
    ctx.strokeStyle = darken(d.color, 0.3); ctx.lineWidth = ow * 0.8;
    for (const y of [-0.3, 0.05, 0.4]) { ctx.beginPath(); ctx.moveTo(-r * 0.22, y * r); ctx.lineTo(r * 0.02, y * r + r * 0.04); ctx.stroke(); }
    shine(ctx, -r * 0.15, -r * 0.25, r * 0.06, r * 0.25, 0, 0.55);
    ctx.restore();
  },
  broccoli(ctx, d, r, ow) {
    ctx.beginPath(); ctx.moveTo(-r * 0.22, r * 0.05); ctx.lineTo(-r * 0.28, r * 1.0); ctx.lineTo(r * 0.28, r * 1.0); ctx.lineTo(r * 0.22, r * 0.05); ctx.closePath();
    outlineFill(ctx, vertical(ctx, 0, r, "#b8e08a", "#8cc45a"), "#3c7a2a", ow);
    for (const [x, y, k] of [[-0.55, -0.15, 0.42], [0.55, -0.15, 0.42], [-0.25, -0.55, 0.45], [0.25, -0.55, 0.45], [0, -0.15, 0.5]]) {
      ctx.beginPath(); ctx.arc(x * r, y * r, r * k, 0, Math.PI * 2);
      outlineFill(ctx, radial(ctx, r * k, d.color), "#2d6a22", ow);
    }
    for (const [x, y] of [[-0.5, -0.25], [0.45, -0.3], [-0.2, -0.65], [0.3, -0.6], [0.05, -0.25]]) dot(ctx, x * r, y * r, r * 0.06, "rgba(255,255,255,.35)");
  },
  cupcake(ctx, d, r, ow) {
    // forminha listrada
    ctx.beginPath(); ctx.moveTo(-r * 0.75, -r * 0.05); ctx.lineTo(r * 0.75, -r * 0.05); ctx.lineTo(r * 0.55, r * 1.0); ctx.lineTo(-r * 0.55, r * 1.0); ctx.closePath();
    outlineFill(ctx, vertical(ctx, 0, r, "#7fd0ff", "#4fa8e0"), "#2a6a9a", ow);
    ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = ow * 1.2;
    for (const x of [-0.45, -0.15, 0.15, 0.45]) { ctx.beginPath(); ctx.moveTo(x * r * 1.25, 0); ctx.lineTo(x * r * 0.95, r * 0.95); ctx.stroke(); }
    // cobertura em 3 ondas
    for (const [y, k] of [[-0.12, 0.85], [-0.42, 0.65], [-0.68, 0.42]]) {
      ctx.beginPath(); ctx.ellipse(0, y * r, r * k, r * 0.26, 0, 0, Math.PI * 2);
      outlineFill(ctx, vertical(ctx, (y - 0.26) * r, (y + 0.26) * r, lighten(d.color, 0.3), d.color), darken(d.color, 0.45), ow);
    }
    // confeitos e cereja
    const cols = ["#ffd54a", "#5bc0eb", "#9be564", "#ffffff"];
    [[-0.45, -0.18], [0.35, -0.2], [-0.15, -0.45], [0.25, -0.5], [0.0, -0.15]].forEach(([x, y], i) => {
      ctx.save(); ctx.translate(x * r, y * r); ctx.rotate(i * 0.9);
      ctx.fillStyle = cols[i % 4]; ctx.fillRect(-r * 0.07, -r * 0.025, r * 0.14, r * 0.05); ctx.restore();
    });
    ctx.beginPath(); ctx.arc(0, -r * 0.92, r * 0.17, 0, Math.PI * 2); outlineFill(ctx, radial(ctx, r * 0.17, "#e5384d"), "#8a1f2a", ow);
    shine(ctx, -r * 0.05, -r * 0.97, r * 0.04, r * 0.06, -0.5, 0.8);
    shine(ctx, -r * 0.35, -r * 0.5, r * 0.15, r * 0.06, -0.2, 0.5);
  },
  popsicle(ctx, d, r, ow) {
    ctx.beginPath(); roundTop(ctx, -r * 0.12, r * 0.55, r * 0.24, r * 0.5, r * 0.1); outlineFill(ctx, "#f2d29a", "#9a6a2a", ow);
    ctx.beginPath(); roundTop(ctx, -r * 0.58, -r * 1.0, r * 1.16, r * 1.62, r * 0.55);
    const g = ctx.createLinearGradient(0, -r, 0, r * 0.6);
    g.addColorStop(0, "#ff7aa8"); g.addColorStop(0.5, "#ffd54a"); g.addColorStop(1, "#7fd0ff");
    outlineFill(ctx, g, "#7a3a6a", ow);
    // mordidinha e gotinha derretendo
    ctx.fillStyle = "#7fd0ff"; ctx.beginPath(); ctx.ellipse(r * 0.35, r * 0.66, r * 0.07, r * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    shine(ctx, -r * 0.3, -r * 0.3, r * 0.09, r * 0.45, 0, 0.5);
  },
  milk(ctx, d, r, ow) {
    // copo de leite com bigodinho de espuma na borda
    ctx.beginPath(); ctx.moveTo(-r * 0.62, -r * 0.85); ctx.lineTo(r * 0.62, -r * 0.85); ctx.lineTo(r * 0.5, r * 1.0); ctx.lineTo(-r * 0.5, r * 1.0); ctx.closePath();
    outlineFill(ctx, "rgba(220,240,255,.9)", "#5a7a9a", ow);
    ctx.beginPath(); ctx.moveTo(-r * 0.58, -r * 0.6); ctx.lineTo(r * 0.58, -r * 0.6); ctx.lineTo(r * 0.47, r * 0.92); ctx.lineTo(-r * 0.47, r * 0.92); ctx.closePath();
    ctx.fillStyle = vertical(ctx, -r * 0.6, r, "#ffffff", "#eef3ff"); ctx.fill();
    for (const x of [-0.42, -0.14, 0.14, 0.42]) dot(ctx, x * r, -r * 0.62, r * 0.16, "#ffffff");
    ctx.strokeStyle = "#5a7a9a"; ctx.lineWidth = ow;
    ctx.beginPath(); ctx.moveTo(-r * 0.58, -r * 0.6); ctx.lineTo(r * 0.58, -r * 0.6); ctx.stroke();
    shine(ctx, -r * 0.32, r * 0.1, r * 0.06, r * 0.5, 0.05, 0.75);
    // rotulinho azul com coração (as manchas de vaquinha pareciam sujeira)
    ctx.beginPath(); ctx.ellipse(r * 0.02, r * 0.42, r * 0.3, r * 0.22, 0, 0, Math.PI * 2);
    outlineFill(ctx, "#bfe6ff", "#5a7a9a", ow * 0.7);
    ctx.fillStyle = "#ff6b9d"; ctx.beginPath();
    const hx = r * 0.02, hy = r * 0.36, hs = r * 0.12;
    ctx.moveTo(hx, hy + hs * 1.1);
    ctx.bezierCurveTo(hx - hs * 1.6, hy, hx - hs * 0.7, hy - hs * 1.1, hx, hy - hs * 0.2);
    ctx.bezierCurveTo(hx + hs * 0.7, hy - hs * 1.1, hx + hs * 1.6, hy, hx, hy + hs * 1.1);
    ctx.fill();
  },
  juice(ctx, d, r, ow) {
    // canudinho
    ctx.strokeStyle = "#ff6b9d"; ctx.lineWidth = r * 0.14; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(r * 0.12, r * 0.2); ctx.lineTo(r * 0.3, -r * 1.0); ctx.lineTo(r * 0.6, -r * 1.12); ctx.stroke();
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = r * 0.05; ctx.setLineDash([r * 0.1, r * 0.1]);
    ctx.beginPath(); ctx.moveTo(r * 0.12, r * 0.2); ctx.lineTo(r * 0.3, -r * 1.0); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(-r * 0.62, -r * 0.75); ctx.lineTo(r * 0.62, -r * 0.75); ctx.lineTo(r * 0.48, r * 1.0); ctx.lineTo(-r * 0.48, r * 1.0); ctx.closePath();
    outlineFill(ctx, "rgba(230,245,255,.85)", "#5a7a9a", ow);
    ctx.beginPath(); ctx.moveTo(-r * 0.57, -r * 0.45); ctx.lineTo(r * 0.57, -r * 0.45); ctx.lineTo(r * 0.45, r * 0.92); ctx.lineTo(-r * 0.45, r * 0.92); ctx.closePath();
    ctx.fillStyle = vertical(ctx, -r * 0.45, r, lighten(d.color, 0.2), darken(d.color, 0.1)); ctx.fill();
    // rodela de laranja na borda
    ctx.beginPath(); ctx.arc(-r * 0.55, -r * 0.75, r * 0.3, 0, Math.PI * 2); outlineFill(ctx, "#ffd36b", "#c27a14", ow * 0.8);
    ctx.strokeStyle = "#f5a623"; ctx.lineWidth = ow * 0.8;
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(-r * 0.55, -r * 0.75); ctx.lineTo(-r * 0.55 + Math.cos(a) * r * 0.24, -r * 0.75 + Math.sin(a) * r * 0.24); ctx.stroke(); }
    for (const [x, y] of [[-0.1, 0.1], [0.2, 0.5], [-0.25, 0.6]]) { ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = ow * 0.7; ctx.beginPath(); ctx.arc(x * r, y * r, r * 0.06, 0, Math.PI * 2); ctx.stroke(); }
    shine(ctx, -r * 0.32, r * 0.15, r * 0.05, r * 0.42, 0.05, 0.6);
  },
  rainbowcake(ctx, d, r, ow) {
    // fatia de bolo com camadas de arco-íris e estrela no topo
    const cols = ["#ff6b6b", "#ffb04a", "#ffe14d", "#7fd88a", "#5bc0eb", "#b49cff"];
    const x0 = -r * 0.9, x1 = r * 0.9, top = -r * 0.5, bot = r * 0.95;
    ctx.beginPath(); ctx.moveTo(x0, top); ctx.lineTo(x1, top - r * 0.25); ctx.lineTo(x1, bot - r * 0.25); ctx.lineTo(x0, bot); ctx.closePath();
    outlineFill(ctx, "#fff", "#8a5a7a", ow);
    const hh = (bot - top) / cols.length;
    cols.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(x0, top + i * hh); ctx.lineTo(x1, top - r * 0.25 + i * hh); ctx.lineTo(x1, top - r * 0.25 + (i + 1) * hh - r * 0.04); ctx.lineTo(x0, top + (i + 1) * hh - r * 0.04); ctx.closePath(); ctx.fill();
    });
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.moveTo(x0, top); ctx.lineTo(x1, top - r * 0.25); ctx.lineTo(x1 - r * 0.1, top - r * 0.45); ctx.lineTo(x0 + r * 0.2, top - r * 0.25); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#8a5a7a"; ctx.lineWidth = ow; ctx.stroke();
    star(ctx, 0, -r * 0.82, r * 0.26, 0.2); outlineFill(ctx, "#ffd54a", "#a8791a", ow * 0.8);
  },
  starcookie(ctx, d, r, ow) {
    star(ctx, 0, 0, r, 0); outlineFill(ctx, radial(ctx, r, "#e9b46a"), "#8a5a24", ow);
    star(ctx, 0, 0, r * 0.78, 0); ctx.fillStyle = "#ffe48a"; ctx.fill();
    for (const [x, y, c] of [[-0.2, -0.15, "#ff6b9d"], [0.22, -0.05, "#5bc0eb"], [0, 0.25, "#9be564"], [-0.05, -0.45, "#b49cff"]]) dot(ctx, x * r, y * r, r * 0.07, c);
    shine(ctx, -r * 0.25, -r * 0.3, r * 0.1, r * 0.05, -0.6, 0.6);
  },
  icecream(ctx, d, r, ow) {
    const cone = () => { ctx.beginPath(); ctx.moveTo(-r * 0.55, -r * 0.1); ctx.lineTo(r * 0.55, -r * 0.1); ctx.lineTo(0, r * 1.05); ctx.closePath(); };
    cone(); outlineFill(ctx, vertical(ctx, 0, r, "#f2c27a", "#c98a3a"), "#7a4a14", ow);
    // xadrez da casquinha, recortado pelo próprio cone
    ctx.save(); cone(); ctx.clip();
    ctx.strokeStyle = "rgba(122,74,20,.5)"; ctx.lineWidth = ow * 0.8;
    for (let k = -1; k <= 1; k += 0.32) {
      ctx.beginPath(); ctx.moveTo(k * r - r * 0.5, -r * 0.1); ctx.lineTo(k * r + r * 0.5, r * 1.1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(k * r + r * 0.5, -r * 0.1); ctx.lineTo(k * r - r * 0.5, r * 1.1); ctx.stroke();
    }
    ctx.restore();
    // bola de cima (menor, atrás) e bola de baixo (maior, na frente)
    ctx.beginPath(); ctx.arc(0, -r * 0.78, r * 0.38, 0, Math.PI * 2); outlineFill(ctx, radial(ctx, r * 0.38, "#bfe6ff"), darken("#bfe6ff", 0.45), ow);
    ctx.beginPath(); ctx.arc(0, -r * 0.28, r * 0.5, 0, Math.PI * 2); outlineFill(ctx, radial(ctx, r * 0.5, "#ff9fc4"), darken("#ff9fc4", 0.45), ow);
    // gotinha escorrendo na casquinha
    ctx.fillStyle = "#ff9fc4"; ctx.beginPath(); ctx.ellipse(r * 0.28, r * 0.08, r * 0.07, r * 0.13, 0, 0, Math.PI * 2); ctx.fill();
    star(ctx, 0, -r * 1.18, r * 0.17, 0.3); outlineFill(ctx, "#ffd54a", "#a8791a", ow * 0.7);
    shine(ctx, -r * 0.18, -r * 0.42, r * 0.12, r * 0.07, -0.5, 0.6);
    shine(ctx, -r * 0.14, -r * 0.9, r * 0.08, r * 0.05, -0.5, 0.7);
  },
  donut(ctx, d, r, ow) {
    ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2); ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2, true);
    outlineFill(ctx, radial(ctx, r, "#e9b46a"), "#8a5a24", ow);
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI * 2, k = 0.82 + (i % 2) * 0.06; ctx.lineTo(Math.cos(a) * r * k, Math.sin(a) * r * k); }
    ctx.closePath(); ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2, true);
    ctx.fillStyle = vertical(ctx, -r, r, lighten(d.color, 0.3), d.color); ctx.fill("evenodd");
    const cols = ["#ffd54a", "#5bc0eb", "#9be564", "#ffffff", "#b49cff"];
    for (let i = 0; i < 10; i++) {
      const a = i * 0.63, k = 0.6 + (i % 3) * 0.08;
      ctx.save(); ctx.translate(Math.cos(a) * r * k, Math.sin(a) * r * k); ctx.rotate(a * 2);
      ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(-r * 0.07, -r * 0.022, r * 0.14, r * 0.044); ctx.restore();
    }
    shine(ctx, -r * 0.45, -r * 0.45, r * 0.15, r * 0.07, -0.7, 0.55);
  }
};

function roundTop(ctx, x, y, w, h, rad) {
  ctx.moveTo(x, y + h); ctx.lineTo(x, y + rad); ctx.arc(x + rad, y + rad, rad, Math.PI, Math.PI * 1.5);
  ctx.lineTo(x + w - rad, y); ctx.arc(x + w - rad, y + rad, rad, Math.PI * 1.5, 0); ctx.lineTo(x + w, y + h); ctx.closePath();
}

/* Pinta a comida def centrada em (0,0). r = raio visual. */
export function paintFood(ctx, def, r) {
  const ow = Math.max(1.8, r * 0.085);
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  const fn = P[def.shape];
  if (fn) { fn(ctx, def, r, ow); return; }
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
  outlineFill(ctx, radial(ctx, r, def.color || "#ccc"), darken(def.color || "#ccc", 0.55), ow);
}
export const FOOD_SHAPES = Object.keys(P);
