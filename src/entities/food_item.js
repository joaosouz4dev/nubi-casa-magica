/* Item de comida arrastável, desenhado com formas 2D com contorno e volume.
   Comportamentos visuais:
     - parado: balança de leve (idle), com sombra de contato no prato;
     - pego: sobe, cresce um pouco e inclina conforme a velocidade do dedo;
     - solto fora do destino: volta ao lugar com mola (pequeno overshoot);
     - comido: voa em arco até a boca e encolhe; depois "brota" de novo no
       prato com um pop. Sem alarme nem mensagem de erro. */
import { Spring, damp, clamp, lerp, Ease, Motion, softShadow } from "../core/anim.js";
import { paintFood } from "./food_art.js";

export class FoodItem {
  constructor(def, vp, designX, designY) {
    this.def = def;
    this.vp = vp;
    this.home = { x: designX, y: designY };                 // design-space
    this.pos = { x: vp.dx(designX), y: vp.dy(designY) };   // pixels (lógico)
    this.vel = { x: 0, y: 0 };
    this.dragging = false;
    this.selected = false;
    this.returning = false;
    this.scale = 1;
    this.lift = new Spring(0, { stiffness: 300, damping: 16 });
    this.tilt = 0;
    this.pop = 1;            // 0..1 escala de "brotar"
    this.popT = 1;
    this.flight = null;      // { from, to(), t, dur, done }
    this.hidden = false;
    this.phase = Math.random() * Math.PI * 2;
    this.t = 0;
    this._last = { x: this.pos.x, y: this.pos.y };
  }

  relayout() {
    if (!this.dragging && !this.returning && !this.flight) {
      this.pos.x = this.vp.dx(this.home.x);
      this.pos.y = this.vp.dy(this.home.y);
    }
  }

  radius() { return this.vp.s(this.def.radius / 400); }
  hitRadius() { return this.radius() * 1.6; }

  contains(px, py) {
    if (this.hidden || this.flight) return false;
    const dx = px - this.pos.x, dy = py - this.pos.y;
    return dx * dx + dy * dy <= this.hitRadius() * this.hitRadius();
  }

  goHome() {
    this.returning = true;
    this.dragging = false;
    this.selected = false;
    this.vel.x = 0; this.vel.y = 0;
  }

  /* Voo em arco até um alvo (função, pois o Nubi pode se mexer). */
  flyTo(target, dur = 240) {
    this.flight = { from: { x: this.pos.x, y: this.pos.y }, to: target, t: 0, dur };
    this.dragging = false; this.selected = false; this.returning = false;
  }

  /* Reaparece no prato com um pop (depois de comido). */
  respawn() {
    this.flight = null; this.hidden = false; this.returning = false;
    this.dragging = false; this.selected = false;
    this.pos.x = this.vp.dx(this.home.x); this.pos.y = this.vp.dy(this.home.y);
    this.vel.x = 0; this.vel.y = 0;
    this.pop = 0; this.popT = 0;
  }

  update(dt) {
    this.t += dt;
    const hx = this.vp.dx(this.home.x), hy = this.vp.dy(this.home.y);

    if (this.flight) {
      const F = this.flight; F.t += dt;
      const u = clamp(F.t / F.dur);
      const to = F.to();
      const e = Ease.inQuad(u);
      const arc = Math.sin(u * Math.PI) * this.radius() * 1.6;
      this.pos.x = lerp(F.from.x, to.x, e);
      this.pos.y = lerp(F.from.y, to.y, e) - arc;
      if (u >= 1) { this.hidden = true; }
    } else if (this.returning) {
      // mola criticamente pouco amortecida: chega com um leve overshoot
      const k = 170, c = 19;
      const h = Math.min(dt, 50) / 1000;
      this.vel.x += (k * (hx - this.pos.x) - c * this.vel.x) * h;
      this.vel.y += (k * (hy - this.pos.y) - c * this.vel.y) * h;
      this.pos.x += this.vel.x * h;
      this.pos.y += this.vel.y * h;
      if (Math.hypot(hx - this.pos.x, hy - this.pos.y) < 1 && Math.hypot(this.vel.x, this.vel.y) < 20) {
        this.pos.x = hx; this.pos.y = hy; this.returning = false;
        this.lift.kick(-2);   // pequeno "pousar"
      }
    }

    // inclinação proporcional à velocidade do arraste
    const vx = (this.pos.x - this._last.x) / Math.max(1, dt);
    this._last.x = this.pos.x; this._last.y = this.pos.y;
    const targetTilt = (this.dragging || this.returning) ? clamp(vx * 0.35, -0.5, 0.5) : 0;
    this.tilt = damp(this.tilt, targetTilt, 12, dt);

    this.lift.target = (this.dragging || this.selected) ? 1 : 0;
    this.lift.update(dt);
    const targetScale = this.flight ? 1 - Ease.inQuad(clamp(this.flight.t / this.flight.dur)) * 0.65 : 1 + this.lift.x * 0.16;
    this.scale = this.flight ? targetScale : damp(this.scale, targetScale, 18, dt);

    if (this.popT < 1) { this.popT = Math.min(1, this.popT + dt / 420); this.pop = Ease.outBack(this.popT, 2.4); }
  }

  draw() {
    if (this.hidden) return;
    const ctx = this.vp.ctx;
    const base = this.radius();
    const r = base * this.scale * Math.max(0, this.pop);
    if (r <= 0.5) return;
    const atHome = !this.dragging && !this.returning && !this.flight;
    const bob = atHome && !Motion.reduce ? Math.sin(this.t * 0.0026 + this.phase) * base * 0.05 : 0;
    const lift = Math.max(0, this.lift.x) * base * 0.35;

    // sombra de contato (fica no "chão" e se afasta quando o item sobe)
    if (!this.flight) {
      const sh = atHome ? 1 : 0.6;
      softShadow(ctx, this.pos.x, this.pos.y + base * 0.95, base * 0.85 * sh * this.pop, base * 0.22, 0.22 - lift / base * 0.25);
    }

    ctx.save();
    ctx.translate(this.pos.x, this.pos.y - lift + bob);
    ctx.rotate(this.tilt + (atHome && !Motion.reduce ? Math.sin(this.t * 0.0019 + this.phase) * 0.04 : 0));

    // halo de seleção (esquema tocar-objeto -> tocar-destino): anel pulsante
    if (this.selected) {
      const p = (Math.sin(this.t * 0.008) + 1) * 0.5;
      ctx.strokeStyle = `rgba(255,255,255,${0.6 + p * 0.4})`;
      ctx.lineWidth = Math.max(3, r * 0.12);
      ctx.setLineDash([r * 0.35, r * 0.25]);
      ctx.lineDashOffset = -this.t * 0.03;
      ctx.beginPath(); ctx.arc(0, 0, r * (1.45 + p * 0.1), 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }

    // arte de cada comida: entities/food_art.js (um pintor por formato)
    paintFood(ctx, this.def, r);
    ctx.restore();
  }
}