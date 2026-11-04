/* Ajuda por DEMONSTRAÇÃO: a patinha de feltro da Nubi mostra o gesto (arrastar o
   alimento até o Nubi). Ciclo: aparece -> pressiona (onda de toque) ->
   arrasta em arco com easing -> solta (onda) -> some -> pausa. Some quando a
   criança começa a agir. Sem texto obrigatório. */
import { Ease, clamp, lerp, Motion } from "../core/anim.js";
import { art } from "../core/art.js";

/* Cores das ondas de toque e da trilha (linha de bordado). */
const GLOVE = "#fff4dc", GLOVE_EDGE = "#8a5a6a", THREAD = "#b07a9a";

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

    // patinha de feltro da Nubi apertando o ponto (no lugar de uma mão com
    // dedo, que podia parecer um gesto feio). A almofada grande fica sobre o
    // ponto de toque; ao apertar ela afunda um pouco.
    ctx.save();
    ctx.globalAlpha = alpha;
    const paw = art("hud/hud_patinha");
    const s = lerp(1, 0.84, press);
    ctx.translate(p.x, p.y);
    ctx.rotate(-0.18);
    ctx.scale(s, s);
    if (paw) {
      const w = r * 2, h = w * (paw.naturalHeight / paw.naturalWidth);
      ctx.shadowColor = "rgba(90,50,70,.28)"; ctx.shadowBlur = r * 0.25; ctx.shadowOffsetY = r * 0.12 * (1 - press);
      ctx.drawImage(paw, -w / 2, -h * 0.62, w, h);
    } else {
      // reserva: almofada + 4 dedinhos
      ctx.fillStyle = "#d9a6e0"; ctx.strokeStyle = GLOVE_EDGE; ctx.lineWidth = Math.max(1.5, r * 0.06);
      ctx.beginPath(); ctx.ellipse(0, r * 0.05, r * 0.42, r * 0.34, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      for (const [x, y] of [[-0.5, -0.38], [-0.18, -0.62], [0.18, -0.62], [0.5, -0.38]]) {
        ctx.beginPath(); ctx.ellipse(x * r, y * r, r * 0.16, r * 0.19, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}
