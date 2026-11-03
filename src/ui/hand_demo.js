/* Ajuda por DEMONSTRAÇÃO: uma mãozinha ilustrada mostra o gesto (arrastar o
   alimento até o Nubi). Ciclo: aparece -> pressiona (onda de toque) ->
   arrasta em arco com easing -> solta (onda) -> some -> pausa. Some quando a
   criança começa a agir. Sem texto obrigatório. */
import { Ease, clamp, lerp, Motion, roundRect } from "../core/anim.js";
import { feltFibers } from "./felt.js";

/* Luvinha de feltro: creme com punho rosa, contorno quente e costura. */
const GLOVE = "#fff4dc", GLOVE_EDGE = "#8a5a6a", CUFF = "#ffc2d6", THREAD = "#b07a9a";

const CYCLE = 2600;

export class HandDemo {
  constructor(vp, fromDesign, toDesign) {
    this.vp = vp;
    this.from = fromDesign;
    this.to = toDesign || fromDesign;
    this.tap = !toDesign;   // sem destino: demonstra um toque (aperta e solta no lugar)
    this.active = true;
    this.fade = 0;      // 0..1 visibilidade geral (entra/sai suave)
    this.t = -500;      // pequeno atraso inicial
  }
  dismiss() { this.active = false; }
  reopen() { this.active = true; this.t = 0; }

  update(dt) {
    this.t += dt;
    this.fade = clamp(this.fade + (this.active ? dt / 400 : -dt / 250));
  }

  draw() {
    if (this.fade <= 0 || this.t < 0) return;
    const ctx = this.vp.ctx;
    const c = this.t % CYCLE;
    const fx = this.vp.dx(this.from.x), fy = this.vp.dy(this.from.y);
    const tx = this.vp.dx(this.to.x), ty = this.vp.dy(this.to.y);
    const mx = (fx + tx) / 2, my = this.tap ? fy : Math.min(fy, ty) - this.vp.s(0.18);   // ponto de controle do arco
    const bez = (u) => ({
      x: (1 - u) * (1 - u) * fx + 2 * (1 - u) * u * mx + u * u * tx,
      y: (1 - u) * (1 - u) * fy + 2 * (1 - u) * u * my + u * u * ty
    });

    // fases (ms dentro do ciclo)
    let u = 0, press = 0, alpha = 1;
    if (c < 250) { alpha = Ease.outQuad(c / 250); }
    else if (c < 550) { press = Ease.inOutSine((c - 250) / 300); }
    else if (c < 1650) { press = 1; u = Ease.inOutCubic((c - 550) / 1100); }
    else if (c < 1900) { u = 1; press = 1 - Ease.outQuad((c - 1650) / 250); }
    else if (c < 2200) { u = 1; alpha = 1 - (c - 1900) / 300; }
    else { return; }
    alpha *= this.fade;

    // trilha pontilhada em arco (aparece conforme a mão anda)
    ctx.save();
    ctx.globalAlpha = this.tap ? 0 : 0.45 * this.fade;
    // trilha como pontos de costura (linha de bordado)
    ctx.strokeStyle = THREAD;
    ctx.lineWidth = Math.max(2.5, this.vp.s(0.009));
    ctx.lineCap = "round";
    ctx.setLineDash([this.vp.s(0.016), this.vp.s(0.02)]);
    ctx.lineDashOffset = Motion.reduce ? 0 : -this.t * 0.02;
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.quadraticCurveTo(mx, my, tx, ty); ctx.stroke();
    ctx.restore();

    const p = bez(u);
    const r = this.vp.s(0.05);

    // ondas de toque (ao pressionar e ao soltar)
    const ripple = (x, y, k) => {
      if (k <= 0 || k >= 1) return;
      // onda macia: aro creme com costurinha por dentro
      const R = r * (0.4 + k * 1.1);
      ctx.save();
      ctx.globalAlpha = (1 - k) * 0.7 * this.fade;
      ctx.strokeStyle = GLOVE; ctx.lineWidth = Math.max(3, r * 0.16);
      ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = THREAD; ctx.lineWidth = Math.max(1.2, r * 0.035); ctx.setLineDash([r * 0.08, r * 0.07]); ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    };
    ripple(fx, fy, (c - 400) / 450);
    ripple(tx, ty, (c - 1700) / 450);

    // mãozinha: indicador apontando, ponta no ponto de toque
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y + r * 0.15);
    const s = lerp(1, 0.86, press);
    ctx.scale(s, s);
    ctx.rotate(-0.25);
    const lw = Math.max(1.8, r * 0.07);
    const hand = () => {
      ctx.beginPath();
      ctx.moveTo(-r * 0.16, r * 0.1);
      ctx.lineTo(-r * 0.16, -r * 0.0);
      ctx.quadraticCurveTo(-r * 0.16, -r * 0.18, 0, -r * 0.18);
      ctx.quadraticCurveTo(r * 0.16, -r * 0.18, r * 0.16, 0);
      ctx.lineTo(r * 0.16, r * 0.55);
      ctx.quadraticCurveTo(r * 0.55, r * 0.45, r * 0.62, r * 0.75);
      ctx.quadraticCurveTo(r * 0.7, r * 1.35, r * 0.1, r * 1.45);
      ctx.quadraticCurveTo(-r * 0.55, r * 1.45, -r * 0.6, r * 0.85);
      ctx.quadraticCurveTo(-r * 0.62, r * 0.5, -r * 0.16, r * 0.55);
      ctx.closePath();
    };
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    // punho rosa (por baixo da mão)
    ctx.save(); ctx.rotate(0.05);
    roundRect(ctx, -r * 0.5, r * 1.18, r * 0.98, r * 0.42, r * 0.16);
    ctx.fillStyle = CUFF; ctx.fill(); ctx.strokeStyle = GLOVE_EDGE; ctx.lineWidth = lw; ctx.stroke();
    ctx.setLineDash([r * 0.07, r * 0.06]); ctx.strokeStyle = "rgba(138,90,106,.6)"; ctx.lineWidth = lw * 0.55;
    ctx.beginPath(); ctx.moveTo(-r * 0.4, r * 1.5); ctx.lineTo(r * 0.38, r * 1.5); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    // luvinha: volume macio (luz no alto à esquerda) + fibrinhas
    hand();
    const g = ctx.createRadialGradient(-r * 0.2, r * 0.4, r * 0.1, 0, r * 0.8, r * 0.9);
    g.addColorStop(0, "#fffaf0"); g.addColorStop(0.6, GLOVE); g.addColorStop(1, "#f1dcc0");
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip(); feltFibers(ctx, -r * 0.7, -r * 0.25, r * 1.45, r * 1.8); ctx.restore();
    ctx.strokeStyle = GLOVE_EDGE; ctx.lineWidth = lw; ctx.stroke();
    // costura por dentro da borda (o mesmo desenho, um pouco menor)
    ctx.save();
    ctx.translate(0, r * 0.62); ctx.scale(0.82, 0.86); ctx.translate(0, -r * 0.62);
    hand();
    ctx.setLineDash([r * 0.07, r * 0.065]); ctx.strokeStyle = "rgba(176,122,154,.75)"; ctx.lineWidth = lw * 0.6;
    ctx.stroke();
    ctx.restore();
    // dobrinha do dedo (sem brilho de unha)
    ctx.strokeStyle = "rgba(138,90,106,.45)"; ctx.lineWidth = lw * 0.6;
    ctx.beginPath(); ctx.moveTo(-r * 0.08, r * 0.3); ctx.quadraticCurveTo(0, r * 0.34, r * 0.08, r * 0.3); ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}
