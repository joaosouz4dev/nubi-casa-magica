/* Cena da cozinha - cenário de jogo (não um painel). Camada estática em
   cache (parede, janela, prateleira, piso, mesa, prato) + camada viva leve
   (nuvens passando na janela, raio de sol respirando). Mesa e prato ficam
   nas mesmas posições de antes, porque a lógica dos alimentos depende delas. */
import { CachedLayer, roundRect, softShadow, Motion } from "../core/anim.js";

export class KitchenScene {
  constructor(vp) {
    this.vp = vp;
    this.t = 0;
    this.layer = new CachedLayer(vp, (c, w, h, m) => this._paint(c, w, h, m));
  }

  update(dt) { this.t += dt; }

  window() { const w = this.vp.w, h = this.vp.h; return { x: w * 0.06, y: h * 0.1, w: w * 0.22, h: h * 0.34 }; }

  draw() {
    const ctx = this.vp.ctx, w = this.vp.w, h = this.vp.h, m = Math.min(w, h);
    this.layer.draw();

    // nuvens passando pela janela (recortadas no vidro)
    const win = this.window();
    ctx.save();
    roundRect(ctx, win.x + m * 0.012, win.y + m * 0.012, win.w - m * 0.024, win.h - m * 0.024, m * 0.03);
    ctx.clip();
    const speed = Motion.reduce ? 0.000004 : 0.000012;
    for (let i = 0; i < 3; i++) {
      const u = ((this.t * speed * w + i * 0.4 * win.w) % (win.w * 1.4)) - win.w * 0.2;
      const cx = win.x + u, cy = win.y + win.h * (0.25 + i * 0.22);
      const cr = m * (0.03 + (i % 2) * 0.012);
      ctx.fillStyle = "rgba(255,255,255,.95)";
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.arc(cx + cr * 1.1, cy + cr * 0.2, cr * 0.8, 0, Math.PI * 2);
      ctx.arc(cx - cr * 1.0, cy + cr * 0.25, cr * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // raio de sol suave entrando pela janela
    const a = 0.1 + (Motion.reduce ? 0 : Math.sin(this.t * 0.0009) * 0.03);
    const g = ctx.createLinearGradient(win.x, win.y, win.x + w * 0.35, h * 0.85);
    g.addColorStop(0, `rgba(255,250,220,${a})`);
    g.addColorStop(1, "rgba(255,250,220,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(win.x + win.w * 0.2, win.y + win.h);
    ctx.lineTo(win.x + win.w, win.y + win.h * 0.4);
    ctx.lineTo(w * 0.62, h * 0.86);
    ctx.lineTo(w * 0.2, h * 0.86);
    ctx.closePath(); ctx.fill();
  }

  _paint(c, w, h, m) {
    // parede quente com textura sutil de bolinhas
    const g = c.createLinearGradient(0, 0, 0, h * 0.82);
    g.addColorStop(0, "#fff1d6"); g.addColorStop(1, "#ffd9a6");
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = "rgba(255,255,255,.35)";
    const step = m * 0.07;
    for (let y = step * 0.5, row = 0; y < h * 0.8; y += step, row++) {
      for (let x = (row % 2) * step * 0.5; x < w; x += step) {
        c.beginPath(); c.arc(x, y, m * 0.006, 0, Math.PI * 2); c.fill();
      }
    }

    // janela com moldura, céu e cortinas
    const win = this.window();
    c.save();
    c.shadowColor = "rgba(120,70,30,.18)"; c.shadowBlur = m * 0.03; c.shadowOffsetY = m * 0.01;
    c.fillStyle = "#fffaf2";
    roundRect(c, win.x, win.y, win.w, win.h, m * 0.04); c.fill();
    c.restore();
    const sky = c.createLinearGradient(0, win.y, 0, win.y + win.h);
    sky.addColorStop(0, "#8fd3ff"); sky.addColorStop(1, "#d7f1ff");
    c.fillStyle = sky;
    roundRect(c, win.x + m * 0.012, win.y + m * 0.012, win.w - m * 0.024, win.h - m * 0.024, m * 0.03); c.fill();
    // colinas lá fora
    c.save();
    roundRect(c, win.x + m * 0.012, win.y + m * 0.012, win.w - m * 0.024, win.h - m * 0.024, m * 0.03); c.clip();
    c.fillStyle = "#9fdc8a";
    c.beginPath(); c.ellipse(win.x + win.w * 0.3, win.y + win.h, win.w * 0.5, win.h * 0.22, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#86cf74";
    c.beginPath(); c.ellipse(win.x + win.w * 0.85, win.y + win.h * 1.02, win.w * 0.45, win.h * 0.2, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#ffe27a";
    c.beginPath(); c.arc(win.x + win.w * 0.78, win.y + win.h * 0.25, m * 0.028, 0, Math.PI * 2); c.fill();
    c.restore();
    // cruz da janela
    c.fillStyle = "#fffaf2";
    c.fillRect(win.x + win.w / 2 - m * 0.006, win.y, m * 0.012, win.h);
    c.fillRect(win.x, win.y + win.h / 2 - m * 0.006, win.w, m * 0.012);
    // cortinas com ondinhas
    for (const side of [0, 1]) {
      const cx = side ? win.x + win.w + m * 0.005 : win.x - m * 0.005;
      const dir = side ? -1 : 1;
      c.fillStyle = "#ff9f9f";
      c.beginPath();
      c.moveTo(cx - dir * m * 0.03, win.y - m * 0.03);
      c.lineTo(cx + dir * m * 0.05, win.y - m * 0.03);
      c.quadraticCurveTo(cx + dir * m * 0.01, win.y + win.h * 0.5, cx + dir * m * 0.04, win.y + win.h + m * 0.02);
      c.lineTo(cx - dir * m * 0.03, win.y + win.h + m * 0.02);
      c.closePath(); c.fill();
      c.fillStyle = "rgba(255,255,255,.35)";
      for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(cx + dir * m * 0.005, win.y + win.h * (0.15 + i * 0.25), m * 0.007, 0, Math.PI * 2); c.fill(); }
    }
    c.fillStyle = "#c98a52";
    roundRect(c, win.x - m * 0.05, win.y - m * 0.045, win.w + m * 0.1, m * 0.02, m * 0.01); c.fill();

    // prateleira com potes
    const sx = w * 0.36, sy = h * 0.2, sw = w * 0.2;
    softShadow(c, sx + sw / 2, sy + m * 0.02, sw * 0.55, m * 0.015, 0.2);
    c.fillStyle = "#c98a52"; roundRect(c, sx, sy, sw, m * 0.022, m * 0.01); c.fill();
    const jars = [["#ffb36b", 0.12], ["#8fd18f", 0.42], ["#b49cff", 0.72]];
    for (const [col, k] of jars) {
      const jx = sx + sw * k, jw = m * 0.06, jh = m * 0.075;
      c.fillStyle = "rgba(255,255,255,.75)"; roundRect(c, jx, sy - jh, jw, jh, m * 0.015); c.fill();
      c.fillStyle = col; roundRect(c, jx + m * 0.006, sy - jh * 0.65, jw - m * 0.012, jh * 0.6, m * 0.01); c.fill();
      c.fillStyle = "#e97a5a"; roundRect(c, jx - m * 0.003, sy - jh - m * 0.012, jw + m * 0.006, m * 0.016, m * 0.006); c.fill();
    }

    // rodapé + piso de tábuas com leve perspectiva
    c.fillStyle = "#e7a96a"; c.fillRect(0, h * 0.8, w, h * 0.025);
    const fg = c.createLinearGradient(0, h * 0.82, 0, h);
    fg.addColorStop(0, "#f0bf86"); fg.addColorStop(1, "#d99a5c");
    c.fillStyle = fg; c.fillRect(0, h * 0.825, w, h * 0.175);
    c.strokeStyle = "rgba(150,90,40,.18)"; c.lineWidth = Math.max(1, m * 0.004);
    for (let i = 1; i < 4; i++) { const y = h * (0.825 + i * 0.045); c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    for (let i = 0; i < 4; i++) {
      for (let x = (i % 2) * w * 0.07; x < w; x += w * 0.14) {
        const y = h * (0.825 + i * 0.045);
        c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + h * 0.045); c.stroke();
      }
    }

    // mesa baixa (posição preservada) com sombra, tampo iluminado e pés
    const tx = w * 0.1, ty = h * 0.74, tw = w * 0.42, th = h * 0.1;
    softShadow(c, tx + tw / 2, h * 0.94, tw * 0.55, h * 0.03, 0.25);
    c.fillStyle = "#a9632a";
    roundRect(c, tx + w * 0.03, ty + th * 0.6, w * 0.035, h * 0.15, m * 0.012); c.fill();
    roundRect(c, tx + tw - w * 0.065, ty + th * 0.6, w * 0.035, h * 0.15, m * 0.012); c.fill();
    c.fillStyle = "#b8743a";
    roundRect(c, tx, ty + th * 0.35, tw, th * 0.75, m * 0.025); c.fill();
    const tg = c.createLinearGradient(0, ty, 0, ty + th * 0.6);
    tg.addColorStop(0, "#e2a465"); tg.addColorStop(1, "#cf8a4a");
    c.fillStyle = tg;
    roundRect(c, tx, ty, tw, th * 0.6, m * 0.025); c.fill();
    c.fillStyle = "rgba(255,255,255,.22)";
    roundRect(c, tx + m * 0.02, ty + m * 0.008, tw - m * 0.04, m * 0.012, m * 0.006); c.fill();

    // prato grande sob os alimentos (antes era só sob o primeiro)
    const px = w * 0.3, py = h * 0.775;
    softShadow(c, px, py + m * 0.012, w * 0.2, m * 0.03, 0.18);
    c.fillStyle = "#ffffff";
    c.beginPath(); c.ellipse(px, py, w * 0.2, m * 0.045, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = "#ffc6d6"; c.lineWidth = Math.max(2, m * 0.006);
    c.beginPath(); c.ellipse(px, py, w * 0.18, m * 0.035, 0, 0, Math.PI * 2); c.stroke();
  }
}
