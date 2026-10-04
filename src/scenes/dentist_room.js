/* Cômodo CONSULTÓRIO DOS DENTINHOS - mini-game de cuidado dentário.
   Close na boca do bichinho (lupa). Sem broca, sem dor, sem erro:
   - escova: esfregar remove as placas (o dente clareia e brilha) e faz espuma;
   - varinha brilhante: "bichinhos de açúcar" fofos vão embora ("Tchau!");
     a escova também os espanta, mais devagar;
   - dente torto: arrastar até o lugar dele, que encaixa com um clique;
   - copinho: enxágua a espuma.
   Tudo pronto: sorriso brilhante. Voltar ao consultório depois traz uma
   boca nova para cuidar (a brincadeira se repete sem travar).
   Alternativa de toque: tocar na ferramenta e depois no dente. */
import { Spring, Spring2, damp, clamp, Ease, Motion, CachedLayer, roundRect, softShadow, lighten, darken } from "../core/anim.js";
import { touchNubi } from "./nubi_touch.js";
import { drawIcon } from "../ui/icons.js";

const PLAQUE = [0, 2, 4, 7, 9, 11];       // dentes com placa (determinístico)
const BUGS = [1, 10];                     // dentes com bichinho de açúcar
const CROOKED = 8;                        // dente de baixo torto

export class DentistRoom {
  constructor({ vp, bus, nubi }) {
    this.vp = vp; this.bus = bus; this.nubi = nubi;
    this.tools = [
      { id: "brush", x: 0.83, y: 0.3 },
      { id: "wand",  x: 0.83, y: 0.52 },
      { id: "cup",   x: 0.83, y: 0.74 }
    ];
    for (const t of this.tools) { t.disp = null; t.lift = new Spring(0, { stiffness: 320, damping: 15 }); t.tilt = 0; }
    this.held = null; this.heldPos = null; this.selected = null; this.last = null;
    this.t = 0; this.unsub = [];
    this.scrubT = 0;
    this.bounce = new Spring(0, { stiffness: 260, damping: 9 });
    this.back = new CachedLayer(vp, (c, w, h, m) => this._paintBack(c, w, h, m));
    this._fresh();
  }

  /* Uma boca nova para cuidar. */
  _fresh() {
    this.teeth = [];
    for (let i = 0; i < 12; i++) {
      this.teeth.push({
        i, upper: i < 6, plaque: PLAQUE.includes(i) ? 1 : 0, glow: 0,
        bug: BUGS.includes(i) ? { hp: 1, k: 1, wob: Math.random() * 6, scared: 0 } : null,
        crooked: i === CROOKED, off: i === CROOKED ? { x: 0.32, y: -0.22, rot: 0.5 } : { x: 0, y: 0, rot: 0 }
      });
    }
    this.toothSpring = null;
    this.foam = 0;
    this.done = { plaque: false, bugs: false, align: false, rinse: false, all: false };
    this.brushedOnce = false;
    this.finishT = 0;
  }

  enter() {
    if (this.done.all) this._fresh();
    this.nubi.pos = { x: 0.15, y: 0.58 };
    this.nubi.arrive();
    for (const t of this.tools) { const p = this.toolPos(t); if (!t.disp) t.disp = new Spring2(p.x, p.y, { stiffness: 190, damping: 17 }); else t.disp.set(p.x, p.y); }
    this.unsub = [
      this.bus.on("pointer:down", (p) => this.onDown(p)),
      this.bus.on("pointer:move", (p) => this.onMove(p)),
      this.bus.on("pointer:up", (e) => this.onUp(e)),
      this.bus.on("tap", (p) => this.onTap(p))
    ];
  }
  exit() { this.unsub.forEach(u => u()); this.unsub = []; this.held = null; this.selected = null; }

  // ---------------- geometria ----------------
  mouth() {
    const w = this.vp.w, h = this.vp.h;
    return { x: w * 0.5, y: h * 0.5, W: w * 0.44, H: h * 0.64 };
  }
  toothSize() { const m = this.mouth(); return { w: m.W * 0.125, h: m.H * 0.22 }; }
  toothHome(t) {
    const m = this.mouth(), s = this.toothSize();
    const col = t.upper ? t.i : t.i - 6;
    const arc = (col - 2.5) / 2.5;                      // -1..1 (arco da arcada)
    const x = m.x + (col - 2.5) * s.w * 1.02;
    const y = m.y + (t.upper ? -1 : 1) * (m.H * 0.17 - Math.abs(arc) ** 2 * m.H * 0.05);
    return { x, y };
  }
  toothPos(t) {
    const h = this.toothHome(t), s = this.toothSize();
    if (this.toothSpring && t.crooked === "drag") return { x: this.toothSpring.x, y: this.toothSpring.y, rot: t.off.rot };
    return { x: h.x + t.off.x * s.w, y: h.y + t.off.y * s.h, rot: t.off.rot };
  }
  toothAt(px, py) {
    const s = this.toothSize();
    let best = null, bd = Infinity;
    for (const t of this.teeth) {
      const p = this.toothPos(t);
      const d = Math.hypot(px - p.x, (py - p.y) * 0.8);
      if (d < s.w * 0.75 && d < bd) { bd = d; best = t; }
    }
    return best;
  }
  toolPos(t) { return { x: this.vp.dx(t.x), y: this.vp.dy(t.y) }; }
  toolR() { return this.vp.s(0.075); }
  toolAt(px, py) { return this.tools.find(t => { const p = this.toolPos(t); return Math.hypot(px - p.x, py - p.y) <= this.toolR() * 1.4; }) || null; }
  overMouth(px, py) { const m = this.mouth(); return ((px - m.x) / (m.W * 0.5)) ** 2 + ((py - m.y) / (m.H * 0.5)) ** 2 <= 1; }

  // ---------------- entrada ----------------
  onDown(p) {
    const tool = this.toolAt(p.x, p.y);
    if (tool) { this.held = { kind: "tool", tool }; this.heldPos = { x: p.x, y: p.y }; this.last = { x: p.x, y: p.y }; return; }
    const t = this.toothAt(p.x, p.y);
    if (t && t.crooked === true) {
      const pos = this.toothPos(t);
      t.crooked = "drag";
      this.toothSpring = new Spring2(pos.x, pos.y, { stiffness: 260, damping: 18 });
      this.held = { kind: "tooth", t, grab: { x: p.x - pos.x, y: p.y - pos.y } };
      this.bus.emit("audio:bounce");
    }
  }
  onMove(p) {
    if (!this.held) return;
    const dist = this.last ? Math.hypot(p.x - this.last.x, p.y - this.last.y) : 0;
    this.last = { x: p.x, y: p.y };
    this.heldPos = { x: p.x, y: p.y };
    if (this.held.kind === "tooth") {
      const t = this.held.t;
      this.toothSpring.set(p.x - this.held.grab.x, p.y - this.held.grab.y);
      const home = this.toothHome(t);
      const s = this.toothSize();
      t.off.rot = damp(t.off.rot, 0, 6, 16);
      if (Math.hypot(this.toothSpring.x - home.x, this.toothSpring.y - home.y) < s.w * 0.4) this._snap(t);
      return;
    }
    this._useTool(this.held.tool.id, p.x, p.y, dist);
  }
  onUp() {
    if (this.held && this.held.kind === "tooth" && this.held.t.crooked === "drag") {
      const t = this.held.t; t.crooked = true; t.off.rot = 0.5; this.toothSpring = null;
    }
    if (this.held && this.held.kind === "tool" && this.held.tool.disp && this.heldPos) this.held.tool.disp.set(this.heldPos.x, this.heldPos.y);
    this.held = null; this.last = null;
  }
  onTap(p) {
    const tool = this.toolAt(p.x, p.y);
    if (tool) { this.selected = this.selected === tool ? null : tool; tool.lift.kick(8); return; }
    if (this.selected && this.overMouth(p.x, p.y)) {
      // toque-e-destino: cada toque faz um bom pedaço do trabalho
      for (let i = 0; i < 6; i++) this._useTool(this.selected.id, p.x + (i % 2 ? 8 : -8), p.y, 30);
      return;
    }
    touchNubi(this, p);
  }

  _snap(t) {
    t.crooked = false; t.off = { x: 0, y: 0, rot: 0 }; this.toothSpring = null; t.glow = 1;
    this.held = null;
    const h = this.toothHome(t);
    this.bus.emit("audio:click");
    this.bus.emit("fx:burst", { x: h.x, y: h.y, color: "#ffffff", small: true });
    this.bounce.kick(8);
    this.nubi.say("Clique!");
  }

  _useTool(id, x, y, dist) {
    const s = this.toothSize();
    const work = Math.min(60, dist) / (s.w * 2.2);
    if (id === "brush" || id === "wand") {
      const t = this.toothAt(x, y);
      if (!t) return;
      if (id === "brush" && t.plaque > 0) {
        t.plaque = Math.max(0, t.plaque - work);
        this.foam = Math.min(1, this.foam + work * 0.25);
        this.brushedOnce = true;
        if (Math.random() < 0.45) this.bus.emit("fx:bubble", { x: x + (Math.random() - 0.5) * s.w, y, color: "#ffffff" });
        this.scrubT -= dist;
        if (this.scrubT <= 0) { this.bus.emit("audio:scrub"); this.scrubT = 70; }
        if (t.plaque <= 0.04 && t.plaque !== -1) { t.plaque = 0; t.glow = 1; this.bus.emit("audio:sparkle"); this.bus.emit("fx:burst", { x, y, color: "#ffe27a", small: true }); }
      } else if (id === "brush") {
        this.foam = Math.min(1, this.foam + work * 0.08);
      }
      if (t.bug) {
        t.bug.hp -= work * (id === "wand" ? 1.6 : 0.5);
        t.bug.scared = 1;
        if (id === "wand" && Math.random() < 0.4) this.bus.emit("fx:burst", { x, y, color: "#ffd54a", small: true });
        if (t.bug.hp <= 0) this._popBug(t);
      }
    } else if (id === "cup") {
      if (!this.overMouth(x, y)) return;
      this.foam = Math.max(0, this.foam - work * 0.9);
      if (Math.random() < 0.6) this.bus.emit("fx:water", { x: x + (Math.random() - 0.5) * 30, y });
    }
  }

  _popBug(t) {
    const p = this.toothPos(t);
    t.bug = null; t.glow = 1;
    this.bus.emit("audio:pop");
    this.bus.emit("fx:burst", { x: p.x, y: p.y, color: "#9be564" });
    this.nubi.say("Tchau, bichinho!");
  }

  // ---------------- direcionamento ----------------
  _nextGoal() {
    if (!this.done.plaque) return "teeth:plaque";
    if (!this.done.bugs) return "teeth:bugs";
    if (!this.done.align) return "teeth:align";
    if (!this.done.rinse) return "teeth:rinse";
    return null;
  }
  hintTarget(act) {
    if (act === "teeth:all") act = this._nextGoal() || act;
    const tool = (id) => this.toolPos(this.tools.find(t => t.id === id));
    if (act === "teeth:plaque") { const t = this.teeth.find(x => x.plaque > 0); return t ? { from: tool("brush"), to: this.toothPos(t) } : null; }
    if (act === "teeth:bugs") { const t = this.teeth.find(x => x.bug); return t ? { from: tool("wand"), to: this.toothPos(t) } : null; }
    if (act === "teeth:align") { const t = this.teeth.find(x => x.crooked); return t ? { from: this.toothPos(t), to: this.toothHome(t) } : null; }
    if (act === "teeth:rinse") { const m = this.mouth(); return { from: tool("cup"), to: { x: m.x, y: m.y } }; }
    return null;
  }
  nudge(act) {
    const id = { "teeth:plaque": "brush", "teeth:bugs": "wand", "teeth:rinse": "cup" }[act === "teeth:all" ? this._nextGoal() : act];
    const t = this.tools.find(x => x.id === id);
    if (t) t.lift.kick(10); else this.bounce.kick(6);
  }
  holdDest() {
    if (!this.held && !this.selected) return null;
    const s = this.toothSize();
    if (this.held && this.held.kind === "tooth") { const h = this.toothHome(this.held.t); return { x: h.x, y: h.y, r: s.w * 0.7 }; }
    const id = (this.held && this.held.tool.id) || this.selected.id;
    if (id === "cup") { const m = this.mouth(); return { x: m.x, y: m.y, r: m.H * 0.42 }; }
    const t = id === "wand" ? this.teeth.find(x => x.bug) : this.teeth.find(x => x.plaque > 0);
    if (!t) return null;
    const p = this.toothPos(t);
    return { x: p.x, y: p.y, r: s.w * 0.75 };
  }
  hasSelection() { return !!this.selected; }

  // ---------------- loop ----------------
  update(dt) {
    this.t += dt;
    this.bounce.update(dt);
    if (this.toothSpring) this.toothSpring.update(dt);
    for (const t of this.teeth) {
      if (t.glow > 0) t.glow = Math.max(0, t.glow - dt / 1200);
      if (t.bug) { t.bug.wob += dt * 0.006; t.bug.scared = Math.max(0, t.bug.scared - dt / 500); }
    }
    for (const tl of this.tools) {
      if (!tl.disp) continue;
      const isHeld = this.held && this.held.kind === "tool" && this.held.tool === tl;
      if (isHeld && this.heldPos) {
        const px = tl.disp.x; tl.disp.set(this.heldPos.x, this.heldPos.y);
        tl.tilt = damp(tl.tilt, clamp((tl.disp.x - px) * 0.04, -0.5, 0.5), 14, dt);
      } else { const h = this.toolPos(tl); tl.disp.to(h.x, h.y); tl.disp.update(dt); tl.tilt = damp(tl.tilt, 0, 8, dt); }
      tl.lift.target = isHeld || this.selected === tl ? 1 : 0;
      tl.lift.update(dt);
    }
    this._checkGoals();
    if (this.finishT > 0) this.finishT -= dt;
  }

  _checkGoals() {
    const D = this.done;
    const emit = (k, act, disc) => {
      D[k] = true;
      this.bus.emit("act", act);
      if (disc) this.bus.emit("effect:discoveryOnly", { id: disc });
      this.bus.emit("audio:sparkle");
    };
    if (!D.plaque && this.teeth.every(t => t.plaque <= 0)) emit("plaque", "teeth:plaque", "dente_limpo");
    if (!D.bugs && this.teeth.every(t => !t.bug)) emit("bugs", "teeth:bugs", "dente_bichinho");
    if (!D.align && this.teeth.every(t => !t.crooked)) emit("align", "teeth:align", "dente_alinhado");
    if (!D.rinse && D.plaque && this.foam <= 0.02 && this.brushedOnce) { this.foam = 0; emit("rinse", "teeth:rinse"); }
    if (!D.all && D.plaque && D.bugs && D.align && D.rinse) {
      D.all = true;
      this.finishT = 2600;
      for (const t of this.teeth) t.glow = 1;
      this.nubi.celebrate(); this.nubi.say("Sorriso brilhante!");
      this.bus.emit("audio:magic");
      const m = this.mouth();
      this.bus.emit("fx:burst", { x: m.x, y: m.y, color: "#ffe27a" });
      this.bus.emit("effect:discoveryOnly", { id: "sorriso_brilhante" });
      this.bus.emit("act", "teeth:all");
    }
  }

  // ---------------- desenho ----------------
  draw() {
    const ctx = this.vp.ctx, m = Math.min(this.vp.w, this.vp.h);
    this.back.draw();
    this.nubi.draw();
    this._bib(ctx);
    this._mouthView(ctx, m);
    const order = this.tools.filter(t => !(this.held && this.held.tool === t)).concat(this.held && this.held.kind === "tool" ? [this.held.tool] : []);
    for (const t of order) this._drawTool(ctx, t);
  }

  _bib(ctx) {
    const n = this.nubi, r = n.radius();
    const x = n.px(), y = n.py() + r * 0.55;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(x - r * 0.55, y - r * 0.05); ctx.quadraticCurveTo(x, y + r * 0.08, x + r * 0.55, y - r * 0.05);
    ctx.lineTo(x + r * 0.35, y + r * 0.42); ctx.quadraticCurveTo(x, y + r * 0.55, x - r * 0.35, y + r * 0.42); ctx.closePath();
    ctx.fillStyle = "#9fe7d1"; ctx.fill(); ctx.strokeStyle = "#3f9c86"; ctx.lineWidth = Math.max(2, r * 0.04); ctx.stroke();
    drawIcon(ctx, "tooth", x, y + r * 0.22, r * 0.14);
    ctx.restore();
  }

  _mouthView(ctx, m) {
    const M = this.mouth(), s = this.toothSize();
    const b = 1 + this.bounce.x * 0.006;
    ctx.save();
    ctx.translate(M.x, M.y); ctx.scale(b, b); ctx.translate(-M.x, -M.y);
    // lupa
    softShadow(ctx, M.x, M.y + M.H * 0.53, M.W * 0.45, M.H * 0.06, 0.2);
    ctx.beginPath(); ctx.ellipse(M.x, M.y, M.W * 0.56, M.H * 0.56, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff"; ctx.fill(); ctx.strokeStyle = "#7fd0bd"; ctx.lineWidth = Math.max(4, m * 0.018); ctx.stroke();
    // lábios (cor do bichinho)
    const lip = this.nubi.bodyColor();
    ctx.beginPath(); ctx.ellipse(M.x, M.y, M.W * 0.5, M.H * 0.46, 0, 0, Math.PI * 2);
    ctx.fillStyle = darken(lip, 0.05); ctx.fill();
    ctx.strokeStyle = darken(lip, 0.45); ctx.lineWidth = Math.max(3, m * 0.01); ctx.stroke();
    // boca aberta
    ctx.save();
    ctx.beginPath(); ctx.ellipse(M.x, M.y, M.W * 0.44, M.H * 0.38, 0, 0, Math.PI * 2); ctx.clip();
    const g = ctx.createRadialGradient(M.x, M.y + M.H * 0.05, M.H * 0.05, M.x, M.y, M.H * 0.45);
    g.addColorStop(0, "#7a2c45"); g.addColorStop(1, "#b84a6a");
    ctx.fillStyle = g; ctx.fillRect(M.x - M.W, M.y - M.H, M.W * 2, M.H * 2);
    // língua
    ctx.fillStyle = "#ff8fa8";
    ctx.beginPath(); ctx.ellipse(M.x, M.y + M.H * 0.2, M.W * 0.24, M.H * 0.13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(180,60,90,.4)"; ctx.lineWidth = Math.max(1.5, m * 0.004);
    ctx.beginPath(); ctx.moveTo(M.x, M.y + M.H * 0.12); ctx.lineTo(M.x, M.y + M.H * 0.26); ctx.stroke();
    // gengivas
    ctx.fillStyle = "#ff9fb8";
    ctx.beginPath(); ctx.ellipse(M.x, M.y - M.H * 0.36, M.W * 0.44, M.H * 0.14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(M.x, M.y + M.H * 0.36, M.W * 0.44, M.H * 0.14, 0, 0, Math.PI * 2); ctx.fill();
    // dentes
    const dragging = this.teeth.find(t => t.crooked === "drag");
    for (const t of this.teeth) if (t !== dragging) this._tooth(ctx, t, s);
    // espuma da escovação
    if (this.foam > 0.01) {
      for (let i = 0; i < 26; i++) {
        const a = i * 2.39, d = (i % 7) / 7;
        const x = M.x + Math.cos(a) * M.W * 0.38 * d, y = M.y + Math.sin(a) * M.H * 0.2 * d;
        const rr = m * (0.018 + (i % 3) * 0.008) * clamp(this.foam * 1.6 - i / 40);
        if (rr <= 0) continue;
        ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
    // lugar do dente torto (contorno pontilhado) e o dente arrastado por cima
    const crooked = this.teeth.find(t => t.crooked);
    if (crooked) {
      const h = this.toothHome(crooked);
      ctx.save(); ctx.setLineDash([6, 6]); ctx.lineDashOffset = Motion.reduce ? 0 : -this.t * 0.02;
      ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 2.5;
      this._toothPath(ctx, h.x, h.y, s.w, s.h, crooked.upper); ctx.stroke(); ctx.restore();
    }
    if (dragging) this._tooth(ctx, dragging, s, true);
    // sorriso final brilhando
    if (this.finishT > 0) {
      const k = clamp(this.finishT / 2600);
      for (let i = 0; i < 8; i++) {
        const a = i * 0.8 + this.t * 0.002;
        const x = M.x + Math.cos(a) * M.W * 0.42, y = M.y + Math.sin(a) * M.H * 0.4;
        ctx.globalAlpha = k; this._spark(ctx, x, y, m * 0.03 * (0.6 + 0.4 * Math.sin(this.t * 0.01 + i)), "#ffe27a");
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  _toothPath(ctx, x, y, w, h, upper) {
    ctx.beginPath();
    const d = upper ? 1 : -1;
    // coroa arredondada virada para o meio da boca
    ctx.moveTo(x - w * 0.45, y - d * h * 0.5);
    ctx.lineTo(x + w * 0.45, y - d * h * 0.5);
    ctx.quadraticCurveTo(x + w * 0.5, y + d * h * 0.35, x + w * 0.2, y + d * h * 0.5);
    ctx.quadraticCurveTo(x, y + d * h * 0.56, x - w * 0.2, y + d * h * 0.5);
    ctx.quadraticCurveTo(x - w * 0.5, y + d * h * 0.35, x - w * 0.45, y - d * h * 0.5);
    ctx.closePath();
  }

  _tooth(ctx, t, s, lifted) {
    const p = this.toothPos(t);
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(p.rot); if (lifted) ctx.scale(1.12, 1.12); ctx.translate(-p.x, -p.y);
    if (lifted) { ctx.shadowColor = "rgba(0,0,0,.3)"; ctx.shadowBlur = 12; ctx.shadowOffsetY = 6; }
    this._toothPath(ctx, p.x, p.y, s.w, s.h, t.upper);
    const g = ctx.createLinearGradient(p.x - s.w / 2, 0, p.x + s.w / 2, 0);
    g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#e4edf5");
    ctx.fillStyle = g; ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "#a9bccd"; ctx.lineWidth = Math.max(1.5, s.w * 0.04); ctx.stroke();
    // placa: manchas amareladas que somem ao escovar
    if (t.plaque > 0.01) {
      ctx.save(); this._toothPath(ctx, p.x, p.y, s.w, s.h, t.upper); ctx.clip();
      ctx.fillStyle = `rgba(222,196,92,${0.75 * t.plaque})`;
      for (const [a, b, c] of [[-0.18, 0.1, 0.22], [0.15, -0.12, 0.18], [0.05, 0.28, 0.15], [-0.25, -0.25, 0.12]]) {
        ctx.beginPath(); ctx.arc(p.x + a * s.w, p.y + b * s.h, c * s.w * (0.6 + 0.4 * t.plaque), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    // brilho de limpinho
    ctx.fillStyle = "rgba(255,255,255,.9)";
    ctx.beginPath(); ctx.ellipse(p.x - s.w * 0.18, p.y - (t.upper ? 1 : -1) * s.h * 0.15, s.w * 0.07, s.h * 0.14, 0, 0, Math.PI * 2); ctx.fill();
    if (t.glow > 0) this._spark(ctx, p.x + s.w * 0.2, p.y - s.h * 0.2, s.w * 0.28 * Ease.outBack(clamp(t.glow)), `rgba(255,236,140,${t.glow})`);
    ctx.restore();
    if (t.bug) this._bug(ctx, t, p, s);
  }

  /* Bichinho de açúcar: fofo, nunca assustador. */
  _bug(ctx, t, p, s) {
    const B = t.bug, k = clamp(0.35 + B.hp * 0.65);
    const wob = Motion.reduce ? 0 : Math.sin(B.wob) * s.w * 0.06;
    const x = p.x + wob + (B.scared ? Math.sin(this.t * 0.06) * s.w * 0.04 : 0), y = p.y + (t.upper ? s.h * 0.15 : -s.h * 0.15);
    const R = s.w * 0.32 * k;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = "#9be564"; ctx.strokeStyle = "#4f8a2a"; ctx.lineWidth = Math.max(1.5, R * 0.12);
    ctx.beginPath(); ctx.ellipse(0, 0, R, R * 0.85, 0, 0, Math.PI * 2); ctx.stroke(); ctx.fill();
    for (const sx of [-1, 1]) {
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(sx * R * 0.35, -R * 0.15, R * 0.26, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#2a2148"; ctx.beginPath(); ctx.arc(sx * R * 0.35, -R * 0.1, R * 0.13, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#4f8a2a"; ctx.beginPath(); ctx.moveTo(sx * R * 0.3, -R * 0.75); ctx.lineTo(sx * R * 0.5, -R * 1.2); ctx.stroke();
      ctx.fillStyle = "#ff9fc4"; ctx.beginPath(); ctx.arc(sx * R * 0.5, -R * 1.25, R * 0.14, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = "#2a2148"; ctx.lineWidth = Math.max(1.2, R * 0.1);
    ctx.beginPath();
    if (B.scared > 0.2) ctx.arc(0, R * 0.45, R * 0.15, 0, Math.PI * 2); else ctx.arc(0, R * 0.25, R * 0.22, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.restore();
  }

  _spark(ctx, x, y, R, fill) {
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      ctx.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R);
      ctx.lineTo(x + Math.cos(a + Math.PI / 4) * R * 0.3, y + Math.sin(a + Math.PI / 4) * R * 0.3);
    }
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  }

  _drawTool(ctx, t) {
    if (!t.disp) return;
    const r = this.toolR();
    const lift = Math.max(0, t.lift.x) * r * 0.3;
    softShadow(ctx, t.disp.x, t.disp.y + r * 0.9, r * 0.75, r * 0.16, 0.18);
    ctx.save();
    ctx.translate(t.disp.x, t.disp.y - lift); ctx.rotate(t.tilt);
    const k = 1 + lift / r * 0.35; ctx.scale(k, k);
    if (this.selected === t) {
      ctx.strokeStyle = "rgba(60,120,110,.7)"; ctx.lineWidth = 4; ctx.setLineDash([9, 7]); ctx.lineDashOffset = -this.t * 0.03;
      ctx.beginPath(); ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    // base redonda da bandeja
    ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.beginPath(); ctx.arc(0, 0, r * 1.05, 0, Math.PI * 2); ctx.fill();
    if (t.id === "brush") drawIcon(ctx, "brush", 0, 0, r * 0.95);
    else if (t.id === "cup") drawIcon(ctx, "cup", 0, 0, r * 0.8);
    else {
      // varinha brilhante
      ctx.rotate(-0.5);
      ctx.strokeStyle = "#8a3bff"; ctx.lineWidth = r * 0.18; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(0, r * 0.75); ctx.lineTo(0, -r * 0.2); ctx.stroke();
      ctx.fillStyle = "#ffd54a"; ctx.beginPath();
      for (let i = 0; i < 5; i++) { const a = (Math.PI * 2 * i) / 5 - Math.PI / 2; ctx.lineTo(Math.cos(a) * r * 0.5, -r * 0.45 + Math.sin(a) * r * 0.5); ctx.lineTo(Math.cos(a + 0.63) * r * 0.22, -r * 0.45 + Math.sin(a + 0.63) * r * 0.22); }
      ctx.closePath(); ctx.fill(); ctx.strokeStyle = "#a8791a"; ctx.lineWidth = Math.max(1.5, r * 0.06); ctx.stroke();
      if (!Motion.reduce) this._spark(ctx, r * 0.45, -r * 0.85, r * 0.15 * (0.6 + 0.4 * Math.sin(this.t * 0.01)), "#fff");
    }
    ctx.restore();
  }

  _paintBack(c, w, h, m) {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#e6fbf5"); g.addColorStop(1, "#c4efe3");
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    // papel de parede com dentinhos e estrelas
    c.globalAlpha = 0.18;
    for (let i = 0; i < 18; i++) {
      const x = ((i * 0.137) % 1) * w, y = ((i * 0.293) % 0.8) * h;
      c.fillStyle = i % 2 ? "#ffffff" : "#7fd0bd";
      c.beginPath(); c.arc(x, y, m * 0.02, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
    // luminária
    c.fillStyle = "#ffffff"; c.strokeStyle = "#7fd0bd"; c.lineWidth = Math.max(2, m * 0.008);
    c.beginPath(); c.moveTo(w * 0.15, 0); c.lineTo(w * 0.15, h * 0.08); c.stroke();
    c.beginPath(); c.ellipse(w * 0.15, h * 0.11, m * 0.07, m * 0.035, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    const lg = c.createRadialGradient(w * 0.15, h * 0.13, 0, w * 0.15, h * 0.13, m * 0.4);
    lg.addColorStop(0, "rgba(255,250,210,.55)"); lg.addColorStop(1, "rgba(255,250,210,0)");
    c.fillStyle = lg; c.beginPath(); c.moveTo(w * 0.1, h * 0.13); c.lineTo(w * 0.2, h * 0.13); c.lineTo(w * 0.3, h * 0.85); c.lineTo(0, h * 0.85); c.closePath(); c.fill();
    // cadeira reclinada (atrás do bichinho)
    c.fillStyle = "#5bc0a8";
    roundRect(c, w * 0.04, h * 0.32, w * 0.07, h * 0.48, m * 0.04); c.fill();
    roundRect(c, w * 0.05, h * 0.68, w * 0.24, h * 0.1, m * 0.04); c.fill();
    c.fillStyle = "#3f9c86"; roundRect(c, w * 0.14, h * 0.78, w * 0.04, h * 0.1, m * 0.01); c.fill();
    roundRect(c, w * 0.09, h * 0.87, w * 0.14, h * 0.025, m * 0.01); c.fill();
    // piso
    c.fillStyle = "#9fdcca"; c.fillRect(0, h * 0.89, w, h * 0.11);
    c.fillStyle = "rgba(255,255,255,.35)";
    for (let x = 0; x < w; x += m * 0.12) c.fillRect(x, h * 0.89, m * 0.006, h * 0.11);
    // bandeja das ferramentas
    c.fillStyle = "rgba(255,255,255,.55)";
    roundRect(c, w * 0.765, h * 0.17, w * 0.13, h * 0.7, m * 0.05); c.fill();
  }
}
