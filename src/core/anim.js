/* Base de animação compartilhada: easing, amortecimento independente de FPS,
   molas e utilidades de cor. Tudo que anima no jogo passa por aqui, para que
   o timing seja consistente e o "Reduzir movimento" valha em todo lugar. */

// Preferência global de acessibilidade (ligada pela área dos responsáveis).
export const Motion = { reduce: false };

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => clamp((v - a) / (b - a));

export const Ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  outElastic: (t) => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1)
};

/* Aproxima `a` de `b` de forma exponencial, com a MESMA velocidade em 30 ou
   120 fps (o antigo `a += (b-a)*dt*k` acelerava/atrasava conforme o FPS).
   `lambda` = quão rápido (1/s). */
export function damp(a, b, lambda, dt) {
  return b + (a - b) * Math.exp(-lambda * (dt / 1000));
}

/* Mola amortecida 1D (integração semi-implícita com subpassos para ficar
   estável mesmo com dt grande). Dá overshoot natural: chegadas "com vida". */
export class Spring {
  constructor(value = 0, { stiffness = 260, damping = 18 } = {}) {
    this.x = value; this.v = 0; this.target = value;
    this.k = stiffness; this.c = damping;
  }
  set(v) { this.x = v; this.v = 0; this.target = v; }
  kick(impulse) { this.v += impulse; }
  update(dt) {
    let rest = Math.min(dt, 64) / 1000;
    while (rest > 0) {
      const h = Math.min(rest, 1 / 120);
      const a = -this.k * (this.x - this.target) - this.c * this.v;
      this.v += a * h;
      this.x += this.v * h;
      rest -= h;
    }
    return this.x;
  }
  settled(eps = 0.002) { return Math.abs(this.x - this.target) < eps && Math.abs(this.v) < eps * 10; }
}

/* Mola 2D (para objetos que voltam ao lugar). */
export class Spring2 {
  constructor(x, y, opts) { this.sx = new Spring(x, opts); this.sy = new Spring(y, opts); }
  get x() { return this.sx.x; }
  get y() { return this.sy.x; }
  set(x, y) { this.sx.set(x); this.sy.set(y); }
  to(x, y) { this.sx.target = x; this.sy.target = y; }
  update(dt) { this.sx.update(dt); this.sy.update(dt); }
}

// ---- cor ----
export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbToHex([r, g, b]) {
  return "#" + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1);
}
export function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex([lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)]);
}
export const lighten = (hex, t) => mix(hex, "#ffffff", t);
export const darken = (hex, t) => mix(hex, "#2a2238", t);
export function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// ---- desenho ----
export function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* Sombra de contato macia (elipse com gradiente radial). */
export function softShadow(ctx, x, y, rx, ry, alpha = 0.18) {
  if (rx <= 0 || ry <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(50,30,70,${alpha})`);
  g.addColorStop(0.6, `rgba(50,30,70,${alpha * 0.55})`);
  g.addColorStop(1, "rgba(50,30,70,0)");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/* Camada estática em cache: o cenário é desenhado UMA vez num canvas
   offscreen e só refeito quando o tamanho da tela muda. Antes cada quadro
   recriava gradientes e formas do fundo inteiro. */
export class CachedLayer {
  constructor(vp, paint) { this.vp = vp; this.paint = paint; this.canvas = null; this.key = ""; }
  draw() {
    const vp = this.vp;
    const key = `${vp.w}x${vp.h}@${vp.dpr}`;
    if (key !== this.key || !this.canvas) {
      this.canvas = this.canvas || document.createElement("canvas");
      this.canvas.width = Math.max(1, Math.floor(vp.w * vp.dpr));
      this.canvas.height = Math.max(1, Math.floor(vp.h * vp.dpr));
      const c = this.canvas.getContext("2d");
      c.setTransform(vp.dpr, 0, 0, vp.dpr, 0, 0);
      c.clearRect(0, 0, vp.w, vp.h);
      this.paint(c, vp.w, vp.h, Math.min(vp.w, vp.h));
      this.key = key;
    }
    vp.ctx.drawImage(this.canvas, 0, 0, vp.w, vp.h);
  }
}
