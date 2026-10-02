/* Cômodo BANHEIRO - banho (Etapa 3). Objetos: esponja, chuveirinho, toalha,
   patinho. Esfregar a esponja gera espuma (azul se o Nubi estiver tingido);
   o chuveirinho enxágua (espuma some, cor volta à base); a toalha seca e deixa
   o pelo fofo; o patinho faz um som. Nunca há contagem, obrigação de limpar,
   nem erro.
   Visual: banheira em duas camadas (fundo atrás do Nubi, borda e água na
   frente), ferramentas que sobem ao pegar e voltam ao lugar com mola. */
import { Spring, Spring2, damp, clamp, Ease, Motion, CachedLayer, roundRect, softShadow, lighten, darken } from "../core/anim.js";
import { touchNubi } from "./nubi_touch.js";

export class BathroomRoom {
  constructor({ vp, bus, nubi }) {
    this.vp = vp; this.bus = bus; this.nubi = nubi;
    this.tools = [
      { id: "sponge",  x: 0.12, y: 0.45, color: "#ffd54a", label: "esponja" },
      { id: "shower",  x: 0.12, y: 0.65, color: "#9fd3ff", label: "chuveirinho" },
      { id: "towel",   x: 0.12, y: 0.85, color: "#ff9bc4", label: "toalha" },
      { id: "duck",    x: 0.9,  y: 0.82, color: "#ffe14d", label: "patinho" }
    ];
    for (const t of this.tools) {
      t.disp = null;                                         // Spring2 (criado no enter)
      t.lift = new Spring(0, { stiffness: 320, damping: 17 });
      t.squeeze = new Spring(0, { stiffness: 380, damping: 10 });
      t.tilt = 0;
    }
    this.held = null;
    this.heldPos = null;
    this.selected = null;
    this.rinseTimer = 0;
    this.streamT = 0;
    this.t = 0;
    this.unsub = [];
    this.back = new CachedLayer(vp, (c, w, h, m) => this._paintBack(c, w, h, m));
  }

  enter() {
    this.nubi.pos = { x: 0.55, y: 0.52 };
    this.nubi.arrive();
    for (const t of this.tools) { const p = this.toolPos(t); if (!t.disp) t.disp = new Spring2(p.x, p.y, { stiffness: 190, damping: 17 }); else t.disp.set(p.x, p.y); }
    this.unsub = [
      this.bus.on("pointer:down", (p) => this.onDown(p)),
      this.bus.on("pointer:move", (p) => this.onMove(p)),
      this.bus.on("pointer:up", (e) => this.onUp(e)),
      this.bus.on("tap", (p) => this.onTap(p))
    ];
  }
  exit() {
    this.unsub.forEach(u => u()); this.unsub = [];
    this.held = null; this.selected = null; this.rinseTimer = 0;
  }

  toolPos(t) { return { x: this.vp.dx(t.x), y: this.vp.dy(t.y) }; }
  toolR() { return this.vp.s(0.07); }
  overNubi(px, py, scale = 1.1) { return Math.hypot(px - this.nubi.px(), py - this.nubi.py()) <= this.nubi.radius() * scale; }
  topToolAt(px, py) {
    for (let i = this.tools.length - 1; i >= 0; i--) {
      const p = this.toolPos(this.tools[i]);
      if (Math.hypot(px - p.x, py - p.y) <= this.toolR() * 1.5) return this.tools[i];
    }
    return null;
  }

  onDown(p) {
    const t = this.topToolAt(p.x, p.y);
    if (t && t.id !== "duck") { this.held = t; this.heldPos = { x: p.x, y: p.y }; }
    // patinho é só toque (som), tratado em onTap
  }
  onMove(p) {
    if (!this.held) return;
    this.heldPos = { x: p.x, y: p.y };
    this.nubi.look({ x: p.x / this.vp.w, y: p.y / this.vp.h });
    if (!this.overNubi(p.x, p.y)) return;
    if (this.held.id === "sponge") {
      this.nubi.setFoam(Math.min(1, this.nubi.foam + 0.06));
      if (Math.random() < 0.35) this.bus.emit("fx:bubble", { x: p.x, y: p.y, color: this.nubi.tint ? "#cfe0ff" : "#ffffff" });
      if (this.nubi.foam >= 0.4 && !this._foamActed) this._actFoam();
    } else if (this.held.id === "shower") {
      this.rinseTimer += 16;
      if (this.rinseTimer > 300) { this._rinse(); }
    } else if (this.held.id === "towel") {
      if (this.nubi.wet > 0 || this.nubi.foam === 0) {
        this.nubi.dry(); this._discover("nubi_fofo");
        if (!this._dryActed) { this._dryActed = true; this.bus.emit("act", "dry"); }
      }
    }
  }
  _actFoam() {
    this._foamActed = true;
    this.bus.emit("act", "foam");
    if (this.nubi.tint) this.bus.emit("act", "foam:tinted");
  }
  onUp() {
    if (this.held) {
      this.nubi.stopLook();
      if (this.held.disp && this.heldPos) this.held.disp.set(this.heldPos.x, this.heldPos.y);
    }
    this.held = null; this.rinseTimer = 0;
    this._foamActed = false; this._dryActed = false;
  }
  onTap(p) {
    const t = this.topToolAt(p.x, p.y);
    if (t && t.id === "duck") {
      this.bus.emit("audio:duck");
      t.squeeze.kick(14);
      this.nubi.say("Quá!");
      this._discover("nubi_patinho");
      this.bus.emit("act", "duck");
    } else if (t) {
      this.selected = (this.selected === t) ? null : t;
    } else if (this.selected && this.overNubi(p.x, p.y)) {
      const id = this.selected.id;
      if (id === "sponge") {
        this.nubi.setFoam(1);
        for (let i = 0; i < 6; i++) this.bus.emit("fx:bubble", { x: this.nubi.px() + (Math.random() - 0.5) * 60, y: this.nubi.py(), color: this.nubi.tint ? "#cfe0ff" : "#ffffff" });
        this._actFoam(); this._foamActed = false;
      }
      else if (id === "shower") this._rinse();
      else if (id === "towel") { this.nubi.dry(); this._discover("nubi_fofo"); this.bus.emit("act", "dry"); }
      this.selected = null;
    } else touchNubi(this, p);
  }

  // ---- direcionamento (usado pelo sistema de pedidos) ----
  _toolForAct(act) {
    const id = { foam: "sponge", "foam:tinted": "sponge", rinse: "shower", dry: "towel", duck: "duck" }[act];
    return id ? this.tools.find(t => t.id === id) : null;
  }
  hintTarget(act) {
    const t = this._toolForAct(act);
    if (!t) return null;
    const from = this.toolPos(t);
    return { from, to: t.id === "duck" ? null : { x: this.nubi.px(), y: this.nubi.py() } };
  }
  nudge(act) {
    const t = this._toolForAct(act);
    if (!t) return;
    if (t.id === "duck") t.squeeze.kick(10); else t.lift.kick(10);
  }
  holdDest() {
    const t = this.held || this.selected;
    if (!t || t.id === "duck") return null;
    return { x: this.nubi.px(), y: this.nubi.py(), r: this.nubi.radius() * 1.15 };
  }
  hasSelection() { return !!this.selected; }

  _rinse() {
    const wasTinted = !!this.nubi.tint;
    this.nubi.rinse();
    this.bus.emit("save:tint", null);
    this.rinseTimer = 0;
    if (wasTinted) this._discover("nubi_enxague");
    this.bus.emit("act", "rinse");
  }
  _discover(id) { this.bus.emit("effect:discoveryOnly", { id }); }

  update(dt) {
    this.t += dt;
    for (const t of this.tools) {
      if (!t.disp) continue;
      const home = this.toolPos(t);
      const isHeld = this.held === t && t.id !== "duck";
      if (isHeld) {
        const prevX = t.disp.x;
        t.disp.set(this.heldPos.x, this.heldPos.y);
        t.tilt = damp(t.tilt, clamp((t.disp.x - prevX) * 0.03, -0.45, 0.45), 14, dt);
      } else {
        t.disp.to(home.x, home.y);
        t.disp.update(dt);
        t.tilt = damp(t.tilt, 0, 8, dt);
      }
      t.lift.target = isHeld || this.selected === t ? 1 : 0;
      t.lift.update(dt);
      t.squeeze.update(dt);
    }
    // jato do chuveirinho enquanto está na mão
    if (this.held && this.held.id === "shower" && this.heldPos) {
      this.streamT += dt;
      const r = this.toolR();
      while (this.streamT > 28) {
        this.streamT -= 28;
        this.bus.emit("fx:water", { x: this.heldPos.x + (Math.random() - 0.5) * r * 0.9, y: this.heldPos.y + r * 0.55 });
      }
    }
  }

  draw() {
    const ctx = this.vp.ctx, w = this.vp.w, h = this.vp.h, m = Math.min(w, h);
    this.back.draw();

    // fundo interno da banheira (atrás do Nubi)
    const tb = this._tub();
    ctx.fillStyle = "#e3f3ff";
    roundRect(ctx, tb.x + m * 0.02, tb.y - m * 0.01, tb.w - m * 0.04, tb.h * 0.5, m * 0.06); ctx.fill();

    this.nubi.draw();

    // água na frente do Nubi, com superfície ondulando
    const wy = tb.y + tb.h * 0.12;
    const amp = Motion.reduce ? m * 0.002 : m * 0.007;
    ctx.save();
    roundRect(ctx, tb.x, tb.y, tb.w, tb.h, m * 0.08); ctx.clip();
    ctx.fillStyle = "rgba(140,205,255,.55)";
    ctx.beginPath();
    ctx.moveTo(tb.x, tb.y + tb.h);
    for (let x = 0; x <= tb.w; x += tb.w / 24) {
      ctx.lineTo(tb.x + x, wy + Math.sin(x * 0.035 + this.t * 0.003) * amp + Math.sin(x * 0.08 - this.t * 0.002) * amp * 0.4);
    }
    ctx.lineTo(tb.x + tb.w, tb.y + tb.h);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    // corpo da banheira (frente) com brilho
    ctx.save();
    ctx.shadowColor = "rgba(40,90,140,.18)"; ctx.shadowBlur = m * 0.03; ctx.shadowOffsetY = m * 0.01;
    const tg = ctx.createLinearGradient(0, tb.y, 0, tb.y + tb.h);
    tg.addColorStop(0, "#ffffff"); tg.addColorStop(1, "#dfeefa");
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.moveTo(tb.x, wy + m * 0.02);
    ctx.lineTo(tb.x + tb.w, wy + m * 0.02);
    ctx.lineTo(tb.x + tb.w, tb.y + tb.h - m * 0.08);
    ctx.quadraticCurveTo(tb.x + tb.w, tb.y + tb.h, tb.x + tb.w - m * 0.08, tb.y + tb.h);
    ctx.lineTo(tb.x + m * 0.08, tb.y + tb.h);
    ctx.quadraticCurveTo(tb.x, tb.y + tb.h, tb.x, tb.y + tb.h - m * 0.08);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, tb.x - m * 0.01, wy + m * 0.005, tb.w + m * 0.02, m * 0.03, m * 0.015); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.7)";
    roundRect(ctx, tb.x + m * 0.05, wy + m * 0.06, tb.w * 0.3, m * 0.012, m * 0.006); ctx.fill();
    // pézinhos da banheira
    ctx.fillStyle = "#ffcf5a";
    for (const fx of [tb.x + m * 0.07, tb.x + tb.w - m * 0.07]) { ctx.beginPath(); ctx.ellipse(fx, tb.y + tb.h + m * 0.01, m * 0.025, m * 0.018, 0, 0, Math.PI * 2); ctx.fill(); }

    // ferramentas (a segurada é desenhada por último)
    const order = this.tools.filter(t => t !== this.held).concat(this.held ? [this.held] : []);
    for (const t of order) this._drawTool(ctx, t);
  }

  _tub() { const w = this.vp.w, h = this.vp.h; return { x: w * 0.3, y: h * 0.645, w: w * 0.46, h: h * 0.28 }; }

  _drawTool(ctx, t) {
    if (!t.disp) return;
    const r = this.toolR();
    const lift = Math.max(0, t.lift.x) * r * 0.3;
    const home = this.toolPos(t);
    const atHome = this.held !== t && Math.hypot(t.disp.x - home.x, t.disp.y - home.y) < 2;
    let bob = 0;
    if (t.id === "duck" && !Motion.reduce) bob = Math.sin(this.t * 0.003) * r * 0.06;

    if (atHome || this.held !== t) softShadow(ctx, t.disp.x, t.disp.y + r * 0.85, r * 0.8 * (1 - lift / r * 0.6), r * 0.18, 0.2);

    ctx.save();
    ctx.translate(t.disp.x, t.disp.y - lift + bob);
    ctx.rotate(t.tilt + (t.id === "duck" && !Motion.reduce ? Math.sin(this.t * 0.0024) * 0.06 : 0));
    const sq = t.squeeze.x * 0.02;
    ctx.scale((1 + lift / r * 0.4) * (1 + sq), (1 + lift / r * 0.4) * (1 - sq));

    if (this.selected === t) {
      const p = (Math.sin(this.t * 0.008) + 1) * 0.5;
      ctx.strokeStyle = `rgba(80,80,140,${0.5 + p * 0.4})`; ctx.lineWidth = 4;
      ctx.setLineDash([9, 7]); ctx.lineDashOffset = -this.t * 0.03;
      ctx.beginPath(); ctx.arc(0, 0, r * (1.35 + p * 0.08), 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    const ow = Math.max(2, r * 0.07);
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    const fs = (fill, edge) => { ctx.strokeStyle = edge; ctx.lineWidth = ow * 2; ctx.stroke(); ctx.fillStyle = fill; ctx.fill(); };

    if (t.id === "sponge") {
      roundRect(ctx, -r, -r * 0.65, r * 2, r * 1.3, r * 0.35);
      const g = ctx.createLinearGradient(0, -r * 0.65, 0, r * 0.65);
      g.addColorStop(0, "#ffe57a"); g.addColorStop(1, "#f4c13a");
      fs(g, "#a8791a");
      ctx.fillStyle = "rgba(200,140,20,.45)";
      const holes = [[-0.55, -0.2, 0.12], [0.1, -0.3, 0.09], [0.55, 0.05, 0.13], [-0.15, 0.25, 0.1], [0.35, 0.35, 0.07], [-0.65, 0.3, 0.07]];
      for (const [hx, hy, hr] of holes) { ctx.beginPath(); ctx.arc(hx * r, hy * r, hr * r, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "#7ed3a2";
      roundRect(ctx, -r, -r * 0.65, r * 2, r * 0.38, r * 0.2); ctx.fill();
    } else if (t.id === "shower") {
      // mangueira + cabeça do chuveirinho
      ctx.strokeStyle = "#9aa9bd"; ctx.lineWidth = r * 0.22;
      ctx.beginPath(); ctx.moveTo(0, r * 0.2); ctx.quadraticCurveTo(-r * 0.6, r * 0.9, -r * 0.2, r * 1.35); ctx.stroke();
      ctx.save(); ctx.rotate(-0.2);
      roundRect(ctx, -r * 0.18, -r * 0.2, r * 0.36, r * 0.75, r * 0.15); fs("#cfd8e3", "#6c7a8f");
      ctx.beginPath(); ctx.ellipse(0, -r * 0.35, r * 0.62, r * 0.42, 0, 0, Math.PI * 2);
      const g = ctx.createLinearGradient(0, -r * 0.8, 0, r * 0.1);
      g.addColorStop(0, "#e6f5ff"); g.addColorStop(1, t.color);
      fs(g, "#4c7ea6");
      ctx.fillStyle = "#4c7ea6";
      for (let i = -2; i <= 2; i++) for (let j = 0; j < 2; j++) { ctx.beginPath(); ctx.arc(i * r * 0.18, -r * 0.42 + j * r * 0.18, r * 0.045, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    } else if (t.id === "towel") {
      roundRect(ctx, -r, -r * 0.85, r * 2, r * 1.7, r * 0.3);
      const g = ctx.createLinearGradient(-r, 0, r, 0);
      g.addColorStop(0, lighten(t.color, 0.2)); g.addColorStop(1, t.color);
      fs(g, darken(t.color, 0.45));
      ctx.fillStyle = "rgba(255,255,255,.75)";
      roundRect(ctx, -r, r * 0.35, r * 2, r * 0.16, r * 0.05); ctx.fill();
      roundRect(ctx, -r, r * 0.58, r * 2, r * 0.08, r * 0.04); ctx.fill();
      ctx.strokeStyle = darken(t.color, 0.25); ctx.lineWidth = ow * 0.6;
      ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.85); ctx.quadraticCurveTo(-r * 0.4, 0, -r * 0.6, r * 0.85); ctx.stroke();
    } else if (t.id === "duck") {
      const edge = "#b8860b";
      ctx.beginPath(); ctx.ellipse(0, r * 0.15, r * 0.85, r * 0.55, 0, 0, Math.PI * 2);
      const g = ctx.createRadialGradient(-r * 0.3, -r * 0.1, r * 0.1, 0, r * 0.1, r);
      g.addColorStop(0, "#fff3a6"); g.addColorStop(1, t.color);
      fs(g, edge);
      ctx.beginPath(); ctx.arc(r * 0.4, -r * 0.45, r * 0.42, 0, Math.PI * 2); fs(g, edge);
      // asa
      ctx.fillStyle = "#ffd21f";
      ctx.beginPath(); ctx.ellipse(-r * 0.15, r * 0.15, r * 0.4, r * 0.22, -0.3, 0, Math.PI * 2); ctx.fill();
      // bico
      ctx.beginPath(); ctx.moveTo(r * 0.72, -r * 0.5); ctx.quadraticCurveTo(r * 1.2, -r * 0.42, r * 0.74, -r * 0.28); ctx.closePath();
      fs("#ff9a2e", "#b3550f");
      // olho
      ctx.fillStyle = "#2a2148"; ctx.beginPath(); ctx.arc(r * 0.5, -r * 0.55, r * 0.07, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(r * 0.48, -r * 0.58, r * 0.025, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  _paintBack(c, w, h, m) {
    // parede de azulejos com rejunte e brilho
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#e2f4ff"); g.addColorStop(1, "#b9e3ff");
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const tile = m * 0.11;
    for (let y = 0; y < h * 0.6; y += tile) {
      for (let x = 0; x < w; x += tile) {
        c.fillStyle = (Math.floor(x / tile) + Math.floor(y / tile)) % 2 ? "rgba(255,255,255,.28)" : "rgba(255,255,255,.12)";
        roundRect(c, x + 2, y + 2, tile - 4, tile - 4, m * 0.012); c.fill();
      }
    }
    // faixa decorativa
    c.fillStyle = "#7cc8f0"; c.fillRect(0, h * 0.6, w, m * 0.025);
    c.fillStyle = "#ffffff";
    for (let x = m * 0.03; x < w; x += m * 0.06) { c.beginPath(); c.arc(x, h * 0.6 + m * 0.0125, m * 0.006, 0, Math.PI * 2); c.fill(); }
    // piso
    const fg = c.createLinearGradient(0, h * 0.62, 0, h);
    fg.addColorStop(0, "#a6d4f2"); fg.addColorStop(1, "#86bfe6");
    c.fillStyle = fg; c.fillRect(0, h * 0.6 + m * 0.025, w, h);
    // espelho redondo
    const mx = w * 0.53, my = h * 0.24, mr = m * 0.13;
    c.save(); c.shadowColor = "rgba(40,90,140,.2)"; c.shadowBlur = m * 0.03; c.shadowOffsetY = m * 0.01;
    c.fillStyle = "#ffd98a"; c.beginPath(); c.arc(mx, my, mr * 1.12, 0, Math.PI * 2); c.fill(); c.restore();
    const mg = c.createLinearGradient(mx - mr, my - mr, mx + mr, my + mr);
    mg.addColorStop(0, "#f3fbff"); mg.addColorStop(1, "#bfe2f7");
    c.fillStyle = mg; c.beginPath(); c.arc(mx, my, mr, 0, Math.PI * 2); c.fill();
    c.strokeStyle = "rgba(255,255,255,.9)"; c.lineWidth = m * 0.012;
    c.beginPath(); c.moveTo(mx - mr * 0.5, my - mr * 0.1); c.lineTo(mx - mr * 0.1, my - mr * 0.5); c.stroke();
    c.beginPath(); c.moveTo(mx - mr * 0.3, my + mr * 0.15); c.lineTo(mx + mr * 0.15, my - mr * 0.3); c.stroke();
    // prateleira das ferramentas
    c.fillStyle = "rgba(255,255,255,.55)";
    roundRect(c, w * 0.035, h * 0.3, w * 0.17, h * 0.66, m * 0.04); c.fill();
    // tapetinho do patinho
    softShadow(c, w * 0.9, h * 0.92, m * 0.12, m * 0.025, 0.15);
    c.fillStyle = "#ffffff";
    c.beginPath(); c.ellipse(w * 0.9, h * 0.9, m * 0.12, m * 0.035, 0, 0, Math.PI * 2); c.fill();
    // sombra da banheira no piso
    const tb = this._tub();
    softShadow(c, tb.x + tb.w / 2, tb.y + tb.h + m * 0.02, tb.w * 0.55, m * 0.035, 0.22);
  }
}
