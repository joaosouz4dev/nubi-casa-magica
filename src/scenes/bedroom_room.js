/* Cômodo QUARTO - recepção + vestir (Etapa 4) + bola (Etapa 5).
   Guarda-roupa com 3 acessórios (chapéu, capa, botas): arrastar sobre o Nubi
   veste; trocar substitui só a peça do mesmo espaço; tocar no cabide remove.
   Bola macia + cesto: tocar quica, arrastar reposiciona, deslizar rola;
   cair no cesto comemora; nunca "derrota".
   A física da bola é a mesma de antes; a apresentação ganhou rotação,
   squash ao quicar, sombra no chão e um cesto com borda na frente da bola. */
import { Spring, Spring2, damp, clamp, Ease, Motion, CachedLayer, roundRect, softShadow, lighten, darken } from "../core/anim.js";
import { touchNubi } from "./nubi_touch.js";

const ACCESSORIES = {
  hat:   { slot: "hat",   color: "#8a3bff", label: "chapéu" },
  cape:  { slot: "cape",  color: "#e5484d", label: "capa" },
  boots: { slot: "boots", color: "#5b6ee8", label: "botas" }
};

export class BedroomRoom {
  constructor({ vp, bus, nubi }) {
    this.vp = vp; this.bus = bus; this.nubi = nubi;
    this.wardrobe = [
      { def: ACCESSORIES.hat,   x: 0.08, y: 0.3 },
      { def: ACCESSORIES.cape,  x: 0.08, y: 0.5 },
      { def: ACCESSORIES.boots, x: 0.08, y: 0.7 }
    ];
    for (const w of this.wardrobe) { w.disp = null; w.lift = new Spring(0, { stiffness: 320, damping: 17 }); w.tilt = 0; }
    this.ball = { x: 0.5, y: 0.8, vx: 0, vy: 0, r: 0.06 };
    this.basket = { x: 0.85, y: 0.78, r: 0.11 };
    this.held = null;
    this.dragPoint = null;
    this.lastMove = null;
    this.unsub = [];
    // apresentação da bola
    this.ballAngle = 0;
    this.ballSq = new Spring(0, { stiffness: 420, damping: 12 });
    this.ballPop = 1;
    this.basketWobble = new Spring(0, { stiffness: 260, damping: 7 });
    this.t = 0;
    this.back = new CachedLayer(vp, (c, w, h, m) => this._paintBack(c, w, h, m));
  }

  enter() {
    this.nubi.pos = { x: 0.5, y: 0.45 };
    this.nubi.arrive();
    this._ballPx();
    for (const w of this.wardrobe) { const p = this.wardrobePos(w); if (!w.disp) w.disp = new Spring2(p.x, p.y, { stiffness: 180, damping: 16 }); else w.disp.set(p.x, p.y); }
    this.unsub = [
      this.bus.on("pointer:down", (p) => this.onDown(p)),
      this.bus.on("pointer:move", (p) => this.onMove(p)),
      this.bus.on("pointer:up", (e) => this.onUp(e)),
      this.bus.on("tap", (p) => this.onTap(p))
    ];
  }
  exit() { this.unsub.forEach(u => u()); this.unsub = []; this.held = null; }

  _ballPx() {
    if (this.ball.px === undefined) { this.ball.px = this.vp.dx(this.ball.x); this.ball.py = this.vp.dy(this.ball.y); }
  }
  ballR() { return this.vp.s(this.ball.r); }
  basketPos() { return { x: this.vp.dx(this.basket.x), y: this.vp.dy(this.basket.y), r: this.vp.s(this.basket.r) }; }
  wardrobePos(w) { return { x: this.vp.dx(w.x), y: this.vp.dy(w.y) }; }
  accR() { return this.vp.s(0.06); }
  overNubi(px, py, s = 1.15) { return Math.hypot(px - this.nubi.px(), py - this.nubi.py()) <= this.nubi.radius() * s; }

  topWardrobeAt(px, py) {
    for (const w of this.wardrobe) {
      const p = this.wardrobePos(w);
      if (Math.hypot(px - p.x, py - p.y) <= this.accR() * 1.5) return w;
    }
    return null;
  }
  overBall(px, py) {
    this._ballPx();
    return Math.hypot(px - this.ball.px, py - this.ball.py) <= this.ballR() * 1.6;
  }

  onDown(p) {
    const w = this.topWardrobeAt(p.x, p.y);
    if (w) { this.held = { kind: "acc", w }; this.dragPoint = { x: p.x, y: p.y }; return; }
    if (this.overBall(p.x, p.y)) { this.held = { kind: "ball" }; this.ball.vx = 0; this.ball.vy = 0; this.lastMove = { x: p.x, y: p.y, t: performance.now() }; return; }
  }
  onMove(p) {
    if (!this.held) return;
    if (this.held.kind === "acc") { this.dragPoint = { x: p.x, y: p.y }; this.nubi.look({ x: p.x / this.vp.w, y: p.y / this.vp.h }); }
    else if (this.held.kind === "ball") {
      this.ball.px = p.x; this.ball.py = p.y;
      const now = performance.now();
      if (this.lastMove) { this.ball.vx = (p.x - this.lastMove.x); this.ball.vy = (p.y - this.lastMove.y); }
      this.lastMove = { x: p.x, y: p.y, t: now };
      this.nubi.look({ x: p.x / this.vp.w, y: p.y / this.vp.h });
    }
  }
  onUp(e) {
    if (!this.held) { return; }
    const p = e.point;
    if (this.held.kind === "acc") {
      const w = this.held.w;
      if (p && this.overNubi(p.x, p.y)) {
        this.nubi.equip(w.def.slot, w.def);
        this.bus.emit("save:accessories", this.nubi.accessories);
        this._discover("nubi_" + w.def.slot);
        this.nubi.say(w.def.slot === "cape" ? "Super Nubi!" : "Olha eu!");
        this.nubi.startHop(0.18, 420);
        this.bus.emit("fx:burst", { x: this.nubi.px(), y: this.nubi.py() - this.nubi.radius() * 0.6, color: w.def.color, small: true });
        this.bus.emit("act", "equip:" + w.def.slot);
        if (w.def.slot === "hat" && this.nubi.fluffy > 0) this.bus.emit("act", "equip:hat:fluffy");
        // a peça "entra" no Nubi: o ícone reaparece no cabide com pop
        if (w.disp) { const hp = this.wardrobePos(w); w.disp.set(hp.x, hp.y); w.pop = 0; }
      } else if (w.disp && this.dragPoint) {
        w.disp.set(this.dragPoint.x, this.dragPoint.y);   // volta ao cabide com mola
      }
      this.nubi.stopLook();
    } else if (this.held.kind === "ball") {
      this.nubi.stopLook();
    }
    this.held = null;
  }
  onTap(p) {
    if (this.overBall(p.x, p.y) && !this.held) {
      this.ball.vy = -this.vp.s(0.02);
      this.ballSq.kick(-6);
      this.bus.emit("audio:bounce");
      this.bus.emit("act", "bounce");
      // combinação capa + bola: o Nubi faz pose de herói
      if (this.nubi.accessories.cape) { this.nubi.pose(); this.nubi.say("Super!"); }
      return;
    }
    const w = this.topWardrobeAt(p.x, p.y);
    if (w) {
      this.nubi.unequip(w.def.slot);
      this.bus.emit("save:accessories", this.nubi.accessories);
      w.lift.kick(10);
      return;
    }
    touchNubi(this, p);
  }

  _discover(id) { this.bus.emit("effect:discoveryOnly", { id }); }

  // ---- direcionamento (usado pelo sistema de pedidos) ----
  hintTarget(act) {
    const n = this.nubi, r = n.radius();
    const head = { x: n.px(), y: n.py() - r * 0.55 };
    if (act === "wake" || act === "pet") return { from: head, to: null };
    if (act === "tummy") return { from: { x: n.px(), y: n.py() + r * 0.4 }, to: null };
    if (act.startsWith("equip:")) {
      const slot = act.split(":")[1];
      const w = this.wardrobe.find(x => x.def.slot === slot);
      return w ? { from: this.wardrobePos(w), to: { x: n.px(), y: n.py() } } : null;
    }
    this._ballPx();
    const ball = { x: this.ball.px, y: this.ball.py };
    if (act === "bounce") return { from: ball, to: null };
    if (act.startsWith("basket")) { const b = this.basketPos(); return { from: ball, to: { x: b.x, y: b.y - b.r * 0.4 } }; }
    return null;
  }
  nudge(act) {
    if (act.startsWith("equip:")) {
      const w = this.wardrobe.find(x => x.def.slot === act.split(":")[1]);
      if (w) w.lift.kick(10);
    } else if (act === "bounce" || act.startsWith("basket")) this.ballSq.kick(-7);
    else if (act === "wake" || act === "pet" || act === "tummy") this.nubi.earL.kick(8);
  }
  holdDest() {
    if (!this.held) return null;
    if (this.held.kind === "acc") return { x: this.nubi.px(), y: this.nubi.py(), r: this.nubi.radius() * 1.2 };
    const b = this.basketPos();
    return { x: b.x, y: b.y - b.r * 0.2, r: b.r * 1.15 };
  }
  hasSelection() { return !!this.held; }

  update(dt) {
    this.t += dt;
    this._ballPx();
    this._updateWardrobe(dt);
    this.ballSq.update(dt);
    this.basketWobble.update(dt);
    if (this.ballPop < 1) this.ballPop = Math.min(1, this.ballPop + dt / 380);
    if (this.held && this.held.kind === "ball") return;

    // ---- física (inalterada) ----
    const r = this.ballR();
    const floorY = this.vp.dy(0.9);
    const prevX = this.ball.px;
    this.ball.vy += this.vp.s(0.0012) * dt;
    this.ball.px += this.ball.vx * dt * 0.06;
    this.ball.py += this.ball.vy * dt * 0.06;
    if (this.ball.py > floorY) {
      const impact = Math.abs(this.ball.vy);
      this.ball.py = floorY; this.ball.vy *= -0.55; this.ball.vx *= 0.9; if (Math.abs(this.ball.vy) < 1) this.ball.vy = 0;
      if (impact > 2) this.ballSq.kick(Math.min(9, impact * 0.5));   // amassa ao bater no chão
    }
    if (this.ball.px < r) { this.ball.px = r; this.ball.vx *= -0.7; }
    if (this.ball.px > this.vp.w - r) { this.ball.px = this.vp.w - r; this.ball.vx *= -0.7; }
    this.ball.vx *= 0.985;
    const bk = this.basketPos();
    const mouth = bk.r * 1.3;
    const dxb = bk.x - this.ball.px;
    const dyb = (bk.y + bk.r * 0.5) - this.ball.py;
    const distB = Math.hypot(dxb, dyb);
    if (distB < bk.r * 2.2 && this.ball.vx > 0) {
      this.ball.vx += (dxb) * 0.004 * dt * 0.06;
    }
    if (distB < mouth) {
      this.bus.emit("audio:magic");
      this.nubi.celebrate();
      this._discover("nubi_cesto");
      this.bus.emit("fx:burst", { x: bk.x, y: bk.y - bk.r * 0.3, color: "#ffd54a" });
      this.basketWobble.kick(8);
      this.ball.px = this.vp.dx(0.5); this.ball.py = this.vp.dy(0.6); this.ball.vx = 0; this.ball.vy = 0;
      this.ballPop = 0;
      this.bus.emit("act", "basket");
      if (this.nubi.accessories.cape) { this.nubi.pose(); this.nubi.say("Super Nubi!"); this.bus.emit("act", "basket:cape"); }
    }
    // rotação coerente com o deslocamento (rolar de verdade)
    this.ballAngle += (this.ball.px - prevX) / Math.max(1, r);
  }

  _updateWardrobe(dt) {
    for (const w of this.wardrobe) {
      if (!w.disp) continue;
      const isHeld = this.held && this.held.kind === "acc" && this.held.w === w;
      if (isHeld && this.dragPoint) {
        const prevX = w.disp.x;
        w.disp.set(this.dragPoint.x, this.dragPoint.y);
        w.tilt = damp(w.tilt, clamp((w.disp.x - prevX) * 0.03, -0.45, 0.45), 14, dt);
      } else {
        const p = this.wardrobePos(w);
        w.disp.to(p.x, p.y); w.disp.update(dt);
        w.tilt = damp(w.tilt, 0, 8, dt);
      }
      w.lift.target = isHeld ? 1 : 0;
      w.lift.update(dt);
      if (w.pop !== undefined && w.pop < 1) w.pop = Math.min(1, w.pop + dt / 380);
    }
  }

  draw() {
    const ctx = this.vp.ctx, w = this.vp.w, h = this.vp.h, m = Math.min(w, h);
    this.back.draw();
    if (this.decor) this.decor(ctx, w, h);   // varal de conquistas (meta de longo prazo)

    // ícones no guarda-roupa (o que está na mão vai por cima de tudo, no fim)
    const heldW = this.held && this.held.kind === "acc" ? this.held.w : null;
    for (const wd of this.wardrobe) if (wd !== heldW) this._drawWardrobeItem(ctx, wd);

    // cesto: parte de trás
    const b = this.basketPos();
    const wob = this.basketWobble.x * 0.012;
    softShadow(ctx, b.x, b.y + b.r * 0.95, b.r * 1.15, b.r * 0.22, 0.22);
    ctx.save(); ctx.translate(b.x, b.y + b.r * 0.9); ctx.rotate(wob); ctx.translate(-b.x, -(b.y + b.r * 0.9));
    this._drawBasketBack(ctx, b);
    ctx.restore();

    // indicação suave quando uma peça está sobre o Nubi
    if (heldW && this.dragPoint && this.overNubi(this.dragPoint.x, this.dragPoint.y)) {
      const p = (Math.sin(this.t * 0.01) + 1) * 0.5;
      ctx.fillStyle = `rgba(255,255,255,${0.18 + p * 0.12})`;
      ctx.beginPath(); ctx.arc(this.nubi.px(), this.nubi.py(), this.nubi.radius() * (1.35 + p * 0.06), 0, Math.PI * 2); ctx.fill();
    }

    this.nubi.draw();

    // bola
    this._ballPx();
    this._drawBall(ctx, m);

    // cesto: frente (cobre a bola quando ela cai dentro)
    ctx.save(); ctx.translate(b.x, b.y + b.r * 0.9); ctx.rotate(wob); ctx.translate(-b.x, -(b.y + b.r * 0.9));
    this._drawBasketFront(ctx, b);
    ctx.restore();

    if (heldW) this._drawWardrobeItem(ctx, heldW);
  }

  _drawBall(ctx, m) {
    const r = this.ballR() * Ease.outBack(clamp(this.ballPop), 2.4);
    if (r <= 0.5) return;
    const floorY = this.vp.dy(0.9);
    const height = Math.max(0, floorY - this.ball.py);
    const near = clamp(1 - height / (this.vp.h * 0.5));
    softShadow(ctx, this.ball.px, floorY + this.ballR() * 0.95, r * (0.6 + near * 0.45), r * 0.18, 0.12 + near * 0.12);
    const s = clamp(this.ballSq.x * 0.025, -0.25, 0.3);
    ctx.save();
    ctx.translate(this.ball.px, this.ball.py + r * s * 0.8);
    ctx.scale(1 + s, 1 - s);
    // contorno
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = "#a83a22"; ctx.lineWidth = Math.max(2, r * 0.12); ctx.stroke();
    ctx.save(); ctx.clip();
    ctx.rotate(this.ballAngle);
    // gomos coloridos que deixam a rotação visível
    const cols = ["#ff7a59", "#ffd54a", "#5bc0eb", "#ffffff", "#ff7a59", "#9be564"];
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = cols[i];
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r * 1.05, (i * Math.PI) / 3, ((i + 1) * Math.PI) / 3); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // volume (sombreado fixo, não gira)
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.05, 0, 0, r * 1.05);
    g.addColorStop(0, "rgba(255,255,255,.55)"); g.addColorStop(0.45, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(60,20,40,.28)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    void m;
  }

  /* Fundo do cesto: interior aberto e escuro (profundidade), parede de trás
     trançada e a metade de trás da borda. Antes era uma elipse marrom chapada
     que parecia uma tampa. */
  _drawBasketBack(ctx, b) {
    const top = b.y - b.r * 0.4;
    const rx = b.r * 1.02, ry = b.r * 0.26;
    // parede de trás aparecendo acima da boca
    ctx.save();
    ctx.beginPath(); ctx.ellipse(b.x, top, rx, ry, 0, Math.PI, Math.PI * 2); ctx.closePath(); ctx.clip();
    const wg = ctx.createLinearGradient(0, top - ry, 0, top);
    wg.addColorStop(0, "#c98845"); wg.addColorStop(1, "#9a5a24");
    ctx.fillStyle = wg; ctx.fillRect(b.x - rx, top - ry, rx * 2, ry);
    ctx.restore();
    // interior: escurece para o fundo
    const ig = ctx.createRadialGradient(b.x, top + ry * 0.35, ry * 0.2, b.x, top, rx);
    ig.addColorStop(0, "#3d2410"); ig.addColorStop(0.6, "#5e3818"); ig.addColorStop(1, "#7a4a1f");
    ctx.fillStyle = ig;
    ctx.beginPath(); ctx.ellipse(b.x, top, rx * 0.92, ry * 0.78, 0, 0, Math.PI * 2); ctx.fill();
    // trama interna da parede de trás
    ctx.save();
    ctx.beginPath(); ctx.ellipse(b.x, top, rx * 0.92, ry * 0.78, 0, Math.PI, Math.PI * 2); ctx.clip();
    ctx.strokeStyle = "rgba(255,210,150,.18)"; ctx.lineWidth = Math.max(1.2, b.r * 0.035);
    for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(b.x + i * b.r * 0.22, top - ry); ctx.lineTo(b.x + i * b.r * 0.2, top + ry * 0.2); ctx.stroke(); }
    ctx.restore();
    // metade de trás da borda (a da frente é desenhada depois da bola)
    ctx.strokeStyle = "#d29457"; ctx.lineWidth = Math.max(3, b.r * 0.13);
    ctx.beginPath(); ctx.ellipse(b.x, top, rx, ry, 0, Math.PI, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "rgba(255,235,200,.45)"; ctx.lineWidth = Math.max(1, b.r * 0.035);
    ctx.beginPath(); ctx.ellipse(b.x, top - b.r * 0.02, rx * 0.97, ry * 0.9, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  }

  _drawBasketFront(ctx, b) {
    const top = b.y - b.r * 0.4;
    ctx.beginPath();
    ctx.moveTo(b.x - b.r * 1.02, top);
    ctx.lineTo(b.x - b.r * 0.85, b.y + b.r * 0.9);
    ctx.quadraticCurveTo(b.x, b.y + b.r * 1.05, b.x + b.r * 0.85, b.y + b.r * 0.9);
    ctx.lineTo(b.x + b.r * 1.02, top);
    ctx.quadraticCurveTo(b.x, top + b.r * 0.28, b.x - b.r * 1.02, top);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, top, 0, b.y + b.r);
    g.addColorStop(0, "#d4924e"); g.addColorStop(1, "#a9662d");
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = "#6e3f14"; ctx.lineWidth = Math.max(2, b.r * 0.06); ctx.stroke();
    // trama
    ctx.save(); ctx.clip();
    ctx.strokeStyle = "rgba(110,63,20,.45)"; ctx.lineWidth = Math.max(1.5, b.r * 0.05);
    for (let i = 1; i < 4; i++) { const y = top + (b.r * 1.3 * i) / 4 + b.r * 0.1; ctx.beginPath(); ctx.moveTo(b.x - b.r * 1.1, y); ctx.quadraticCurveTo(b.x, y + b.r * 0.15, b.x + b.r * 1.1, y); ctx.stroke(); }
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(b.x + i * b.r * 0.28, top); ctx.lineTo(b.x + i * b.r * 0.24, b.y + b.r); ctx.stroke(); }
    ctx.restore();
    // borda
    ctx.strokeStyle = "#e6a86a"; ctx.lineWidth = Math.max(3, b.r * 0.13);
    ctx.beginPath(); ctx.ellipse(b.x, top, b.r * 1.02, b.r * 0.26, 0, 0, Math.PI); ctx.stroke();
  }

  _drawWardrobeItem(ctx, wd) {
    if (!wd.disp) return;
    const r = this.accR();
    const lift = Math.max(0, wd.lift.x) * r * 0.35;
    const pop = wd.pop === undefined ? 1 : Ease.outBack(clamp(wd.pop), 2.4);
    const sway = Motion.reduce ? 0 : Math.sin(this.t * 0.002 + wd.y * 9) * 0.05;
    const p = this.wardrobePos(wd);
    // cabide fixo no lugar
    ctx.strokeStyle = "#a2763f"; ctx.lineWidth = Math.max(2, r * 0.08); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(p.x, p.y - r * 1.05); ctx.lineTo(p.x, p.y - r * 0.8); ctx.stroke();
    ctx.save();
    ctx.translate(wd.disp.x, wd.disp.y - lift);
    ctx.rotate(wd.tilt + sway);
    const k = pop * (1 + lift / r * 0.35);
    ctx.scale(k, k);
    this._drawAccessoryIcon(ctx, 0, 0, r, wd.def);
    ctx.restore();
  }

  _drawAccessoryIcon(ctx, x, y, r, def) {
    ctx.save(); ctx.translate(x, y);
    const edge = darken(def.color, 0.55);
    const ow = Math.max(2, r * 0.08);
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    const fs = (fill) => { ctx.strokeStyle = edge; ctx.lineWidth = ow * 2; ctx.stroke(); ctx.fillStyle = fill; ctx.fill(); };
    if (def.slot === "hat") {
      // mesmo desenho do chapéu vestido: aba com espessura, copa de ponta mole, estrelas e pompom
      ctx.beginPath(); ctx.ellipse(0, r * 0.45, r * 0.95, r * 0.22, 0, 0, Math.PI * 2); fs(darken(def.color, 0.2));
      ctx.beginPath();
      ctx.moveTo(-r * 0.58, r * 0.4);
      ctx.bezierCurveTo(-r * 0.48, -r * 0.1, -r * 0.2, -r * 0.55, r * 0.08, -r * 0.66);
      ctx.quadraticCurveTo(r * 0.38, -r * 0.74, r * 0.62, -r * 0.5);
      ctx.quadraticCurveTo(r * 0.3, -r * 0.42, r * 0.26, -r * 0.18);
      ctx.bezierCurveTo(r * 0.36, r * 0.05, r * 0.52, r * 0.25, r * 0.58, r * 0.4);
      ctx.closePath();
      fs(lighten(def.color, 0.1));
      ctx.fillStyle = "#ffe27a";
      for (const [sx, sy, sr] of [[-0.18, 0.0, 0.1], [0.12, -0.38, 0.07]]) {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          ctx.lineTo(sx * r + Math.cos(a) * sr * r, sy * r + Math.sin(a) * sr * r);
          ctx.lineTo(sx * r + Math.cos(a + Math.PI / 5) * sr * r * 0.45, sy * r + Math.sin(a + Math.PI / 5) * sr * r * 0.45);
        }
        ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = "#ffc93a";
      roundRect(ctx, -r * 0.56, r * 0.2, r * 1.12, r * 0.16, r * 0.06); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.64, -r * 0.5, r * 0.15, 0, Math.PI * 2); fs("#fff4c2");
    } else if (def.slot === "cape") {
      ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.7);
      ctx.quadraticCurveTo(-r * 1.0, r * 0.2, -r * 0.85, r * 0.85);
      ctx.quadraticCurveTo(0, r * 0.7, r * 0.85, r * 0.85);
      ctx.quadraticCurveTo(r * 1.0, r * 0.2, r * 0.5, -r * 0.7);
      ctx.quadraticCurveTo(0, -r * 0.45, -r * 0.5, -r * 0.7); ctx.closePath();
      fs(def.color);
      ctx.fillStyle = "#ffd54a"; ctx.beginPath(); ctx.arc(0, -r * 0.55, r * 0.12, 0, Math.PI * 2); ctx.fill();
    } else if (def.slot === "boots") {
      for (const side of [-1, 1]) {
        roundRect(ctx, side * r * 0.45 - r * 0.3, -r * 0.4, r * 0.6, r * 0.95, r * 0.25); fs(def.color);
        roundRect(ctx, side * r * 0.45 - r * 0.34, -r * 0.5, r * 0.68, r * 0.2, r * 0.1); fs(lighten(def.color, 0.45));
      }
    }
    ctx.restore();
  }

  _paintBack(c, w, h, m) {
    // parede lilás com estrelinhas
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#f3e9ff"); g.addColorStop(1, "#dccbf7");
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = "rgba(255,255,255,.55)";
    for (let i = 0; i < 28; i++) {
      const x = ((i * 137.5) % 100) / 100 * w, y = ((i * 61.8) % 70) / 100 * h;
      const s = m * (0.008 + (i % 3) * 0.004);
      c.save(); c.translate(x, y); c.rotate(i);
      c.beginPath();
      for (let k = 0; k < 5; k++) { const a = (k * Math.PI * 2) / 5; c.lineTo(Math.cos(a) * s, Math.sin(a) * s); c.lineTo(Math.cos(a + 0.63) * s * 0.45, Math.sin(a + 0.63) * s * 0.45); }
      c.closePath(); c.fill(); c.restore();
    }
    // janela com lua
    const wx = w * 0.62, wy = h * 0.1, ww = w * 0.16, wh = h * 0.26;
    c.save(); c.shadowColor = "rgba(90,60,140,.2)"; c.shadowBlur = m * 0.03;
    c.fillStyle = "#fffaf2"; roundRect(c, wx, wy, ww, wh, ww * 0.5); c.fill(); c.restore();
    const sky = c.createLinearGradient(0, wy, 0, wy + wh);
    sky.addColorStop(0, "#9bb8ff"); sky.addColorStop(1, "#d6c7ff");
    c.fillStyle = sky; roundRect(c, wx + m * 0.012, wy + m * 0.012, ww - m * 0.024, wh - m * 0.024, ww * 0.45); c.fill();
    c.fillStyle = "#fff6c9"; c.beginPath(); c.arc(wx + ww * 0.62, wy + wh * 0.35, m * 0.03, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#b7a6ff"; c.beginPath(); c.arc(wx + ww * 0.7, wy + wh * 0.31, m * 0.026, 0, Math.PI * 2); c.fill();
    // cama ao fundo (direita)
    const bx = w * 0.66, by = h * 0.58;
    c.fillStyle = "#b98ee6"; roundRect(c, bx, by - h * 0.12, w * 0.05, h * 0.3, m * 0.02); c.fill();
    c.fillStyle = "#ffffff"; roundRect(c, bx + w * 0.03, by, w * 0.3, h * 0.12, m * 0.03); c.fill();
    c.fillStyle = "#8fd3ff"; roundRect(c, bx + w * 0.1, by - h * 0.01, w * 0.25, h * 0.15, m * 0.035); c.fill();
    c.fillStyle = "rgba(255,255,255,.5)";
    for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(bx + w * (0.14 + i * 0.055), by + h * 0.06, m * 0.012, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = "#fff1a8"; roundRect(c, bx + w * 0.045, by - h * 0.03, w * 0.07, h * 0.06, m * 0.025); c.fill();
    // rodapé + piso de madeira
    c.fillStyle = "#c7a3ee"; c.fillRect(0, h * 0.84, w, h * 0.02);
    const fg = c.createLinearGradient(0, h * 0.86, 0, h);
    fg.addColorStop(0, "#d9b98f"); fg.addColorStop(1, "#c39a6c");
    c.fillStyle = fg; c.fillRect(0, h * 0.86, w, h * 0.14);
    // tapete redondo listrado
    for (let i = 0; i < 3; i++) {
      c.fillStyle = ["#ff9fc4", "#ffd0e3", "#ff9fc4"][i];
      c.beginPath(); c.ellipse(w * 0.5, h * 0.925, w * (0.38 - i * 0.09), h * (0.06 - i * 0.014), 0, 0, Math.PI * 2); c.fill();
    }
    // guarda-roupa (móvel de madeira com portas abertas)
    const gx = w * 0.015, gy = h * 0.16, gw = w * 0.13, gh = h * 0.7;
    softShadow(c, gx + gw / 2, gy + gh, gw * 0.6, m * 0.02, 0.22);
    c.fillStyle = "#c98a52"; roundRect(c, gx, gy, gw, gh, m * 0.03); c.fill();
    c.fillStyle = "#fbe9d4"; roundRect(c, gx + m * 0.012, gy + m * 0.03, gw - m * 0.024, gh - m * 0.05, m * 0.02); c.fill();
    c.fillStyle = "#b5773f"; roundRect(c, gx - m * 0.01, gy - m * 0.02, gw + m * 0.02, m * 0.035, m * 0.015); c.fill();
    c.strokeStyle = "#a2763f"; c.lineWidth = Math.max(2, m * 0.008);
    c.beginPath(); c.moveTo(gx + m * 0.02, gy + gh * 0.08); c.lineTo(gx + gw - m * 0.02, gy + gh * 0.08); c.stroke();
  }
}
