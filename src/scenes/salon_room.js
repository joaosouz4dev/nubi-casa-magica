/* Cômodo SALÃO DE BELEZA - cabelo, enfeites, unhas, maquiagem e pinturas
   de rosto de brincadeira. Tudo aberto a qualquer bichinho.
   - penteado / cor / enfeite: tocar (ou arrastar até o bichinho) aplica;
   - esmalte: arrastar até uma patinha pinta aquela patinha (ou tocar no
     vidrinho e depois na patinha);
   - maquiagem e pinturas: arrastar até o rosto;
   - lencinho: esfregar no rosto limpa a maquiagem; nas patinhas, o esmalte.
   Sem erro: soltar fora só devolve o item ao balcão. */
import { Spring, Spring2, damp, clamp, Ease, Motion, CachedLayer, roundRect, softShadow, lighten, darken } from "../core/anim.js";
import { touchNubi } from "./nubi_touch.js";
import { drawIcon } from "../ui/icons.js";
import { SALON_PAGES, WIPE } from "../data/salon.js";

const ROW_Y = [0.3, 0.5, 0.7];
const PAGE_BTN = { x: 0.09, y: 0.9 };
const WIPE_POS = { x: 0.8, y: 0.8 };

export class SalonRoom {
  constructor({ vp, bus, nubi }) {
    this.vp = vp; this.bus = bus; this.nubi = nubi;
    this.pageIdx = 0;
    this.pageBtn = new Spring(0, { stiffness: 320, damping: 12 });
    this.wipe = { def: WIPE, x: WIPE_POS.x, y: WIPE_POS.y, disp: null, lift: new Spring(0, { stiffness: 320, damping: 15 }), tilt: 0, pop: 1 };
    this.slots = [];
    this.held = null; this.dragPoint = null; this.selected = null; this.last = null;
    this.wipeDist = 0;
    this.t = 0; this.unsub = [];
    this.back = new CachedLayer(vp, (c, w, h, m) => this._paintBack(c, w, h, m));
    this._buildPage();
  }

  page() { return SALON_PAGES[this.pageIdx % SALON_PAGES.length]; }
  _buildPage() {
    this.slots = this.page().items.map((def, i) => ({ def, x: 0.09, y: ROW_Y[i], disp: null, lift: new Spring(0, { stiffness: 320, damping: 15 }), tilt: 0, pop: 0 }));
    if (this.vp.w) for (const s of this.slots) { const p = this.slotPos(s); s.disp = new Spring2(p.x, p.y, { stiffness: 190, damping: 16 }); }
    this.selected = null;
  }
  nextPage() {
    this.pageIdx = (this.pageIdx + 1) % SALON_PAGES.length;
    this._buildPage(); this.pageBtn.kick(10);
    this.bus.emit("audio:bounce");
  }

  enter() {
    this.nubi.pos = { x: 0.48, y: 0.5 };
    this.nubi.arrive();
    for (const s of [...this.slots, this.wipe]) { const p = this.slotPos(s); if (!s.disp) s.disp = new Spring2(p.x, p.y, { stiffness: 190, damping: 16 }); else s.disp.set(p.x, p.y); }
    this.unsub = [
      this.bus.on("pointer:down", (p) => this.onDown(p)),
      this.bus.on("pointer:move", (p) => this.onMove(p)),
      this.bus.on("pointer:up", (e) => this.onUp(e)),
      this.bus.on("tap", (p) => this.onTap(p))
    ];
  }
  exit() { this.unsub.forEach(u => u()); this.unsub = []; this.held = null; this.selected = null; }

  // ---------------- geometria ----------------
  slotPos(s) { return { x: this.vp.dx(s.x), y: this.vp.dy(s.y) }; }
  itemR() { return this.vp.s(0.06); }
  slotAt(px, py) { return [...this.slots, this.wipe].find(s => { const p = this.slotPos(s); return Math.hypot(px - p.x, py - p.y) <= this.itemR() * 1.5; }) || null; }
  pageBtnPos() { return { x: this.vp.dx(PAGE_BTN.x), y: this.vp.dy(PAGE_BTN.y), r: this.vp.s(0.055) }; }
  overPageBtn(px, py) { const b = this.pageBtnPos(); return Math.hypot(px - b.x, py - b.y) <= b.r * 1.35; }
  overNubi(px, py, s = 1.2) { return Math.hypot(px - this.nubi.px(), py - this.nubi.py()) <= this.nubi.radius() * s; }
  pawPos(side) { const r = this.nubi.radius(); return { x: this.nubi.px() + side * r * 0.46, y: this.nubi.py() + r * 0.95 }; }
  nearestPaw(px, py) {
    const L = this.pawPos(-1), R = this.pawPos(1);
    return Math.hypot(px - L.x, py - L.y) < Math.hypot(px - R.x, py - R.y) ? "L" : "R";
  }
  overPaws(px, py) { const r = this.nubi.radius(); return ["L", "R"].some(k => { const p = this.pawPos(k === "L" ? -1 : 1); return Math.hypot(px - p.x, py - p.y) <= r * 0.42; }); }
  faceCenter() { return { x: this.nubi.px(), y: this.nubi.py() + this.nubi.radius() * 0.05 }; }
  overFace(px, py) { const f = this.faceCenter(); return Math.hypot(px - f.x, py - f.y) <= this.nubi.radius() * 0.85; }

  // ---------------- entrada ----------------
  onDown(p) {
    const s = this.slotAt(p.x, p.y);
    if (s) { this.held = s; this.dragPoint = { x: p.x, y: p.y }; this.last = { x: p.x, y: p.y }; this.wipeDist = 0; }
  }
  onMove(p) {
    if (!this.held) return;
    const d = this.last ? Math.hypot(p.x - this.last.x, p.y - this.last.y) : 0;
    this.last = { x: p.x, y: p.y };
    this.dragPoint = { x: p.x, y: p.y };
    this.nubi.look({ x: p.x / this.vp.w, y: p.y / this.vp.h });
    if (this.held.def.kind === "wipe") {
      if (this.overFace(p.x, p.y) || this.overPaws(p.x, p.y)) {
        this.wipeDist += d;
        if (Math.random() < 0.3) this.bus.emit("fx:bubble", { x: p.x, y: p.y, color: "#ffffff" });
        if (this.wipeDist > 160) { this.wipeDist = 0; this._wipeAt(p.x, p.y); }
      }
    }
  }
  onUp(e) {
    const s = this.held; this.held = null; this.nubi.stopLook();
    if (!s) return;
    const p = e.point;
    if (p && s.def.kind !== "wipe") this._applyAt(s, p.x, p.y);
    if (s.disp && this.dragPoint) s.disp.set(this.dragPoint.x, this.dragPoint.y);
    this.dragPoint = null;
  }
  onTap(p) {
    const s = this.slotAt(p.x, p.y);
    if (s) {
      const k = s.def.kind;
      // penteado, cor e enfeite: um toque já aplica
      if (k === "hair" || k === "color" || k === "acc") { this._apply(s.def); s.lift.kick(10); s.pop = 0.4; return; }
      this.selected = this.selected === s ? null : s; s.lift.kick(8);
      return;
    }
    if (this.overPageBtn(p.x, p.y)) { this.nextPage(); return; }
    if (this.selected) {
      const sel = this.selected;
      if (sel.def.kind === "wipe") { if (this.overFace(p.x, p.y) || this.overPaws(p.x, p.y)) { this._wipeAt(p.x, p.y); this.selected = null; return; } }
      else if (this._applyAt(sel, p.x, p.y)) { this.selected = null; return; }
    }
    touchNubi(this, p);
  }

  /* Aplica um item solto/tocado em (x,y). Retorna true se aplicou. */
  _applyAt(s, x, y) {
    const k = s.def.kind;
    if (k === "polish") {
      if (!this.overPaws(x, y) && !this.overNubi(x, y)) return false;
      this._polish(this.nearestPaw(x, y), s.def.value);
      return true;
    }
    if (!this.overNubi(x, y, 1.3)) return false;
    this._apply(s.def);
    return true;
  }

  _cos() { return this.nubi.cosmetics; }
  _save() { this.bus.emit("save:cosmetics", JSON.parse(JSON.stringify(this.nubi.cosmetics))); }
  _sparkle(x, y, color) { this.bus.emit("fx:burst", { x, y, color, small: true }); this.bus.emit("audio:sparkle"); }

  _apply(def) {
    const c = this._cos(), n = this.nubi, r = n.radius();
    const head = { x: n.px(), y: n.py() - r * 0.9 };
    switch (def.kind) {
      case "hair":
        c.hair = def.value;
        n.say(def.value ? "Que penteado!" : "Cabelinho fora!");
        n.startHop(0.2, 420);
        this._sparkle(head.x, head.y, "#ffd54a");
        this.bus.emit("effect:discoveryOnly", { id: def.value ? "penteado" : "sem_penteado" });
        if (def.value) { this.bus.emit("act", "hair"); this.bus.emit("act", "hair:" + def.value); }
        break;
      case "color":
        c.hairColor = def.value;
        if (!c.hair) c.hair = "curls";
        n.pulse.kick(1.4);
        this._sparkle(head.x, head.y, def.value);
        this.bus.emit("act", "haircolor"); this.bus.emit("act", "hair");
        break;
      case "acc":
        c.hairAcc = c.hairAcc === def.value ? null : def.value;
        this._sparkle(head.x + r * 0.4, head.y, "#ff9fc4");
        if (c.hairAcc) { n.say("Que lindo!"); this.bus.emit("act", "hairacc"); }
        break;
      case "makeup":
        c.makeup[def.value] = true;
        n.say(["Que lindeza!", "Que brilho!", "Arrasei!"][Object.keys(c.makeup).length % 3]);
        this._sparkle(n.px(), n.py(), "#ff9fc4");
        this.bus.emit("effect:discoveryOnly", { id: "maquiagem" });
        this.bus.emit("act", "makeup"); this.bus.emit("act", "beauty"); this.bus.emit("act", "makeup:" + def.value);
        break;
      case "paint":
        c.paint[def.value] = true;
        n.say(def.value === "mustache" ? "Bigodudo!" : def.value === "hero" ? "Herói!" : "Olha só!");
        n.pose();
        this._sparkle(n.px(), n.py(), "#5bc0eb");
        this.bus.emit("effect:discoveryOnly", { id: "pintura" });
        this.bus.emit("act", "paint"); this.bus.emit("act", "beauty"); this.bus.emit("act", "paint:" + def.value);
        break;
      default: break;
    }
    this._save();
  }

  _polish(side, color) {
    const c = this._cos();
    c.nails[side] = color;
    const p = this.pawPos(side === "L" ? -1 : 1);
    this._sparkle(p.x, p.y, color);
    this.nubi.say("Unhas lindas!");
    this.nubi.giggle();
    if (c.nails.L && c.nails.R) this.bus.emit("effect:discoveryOnly", { id: "unhas_coloridas" });
    this.bus.emit("act", "nails");
    this._save();
  }

  _wipeAt(x, y) {
    const c = this._cos();
    let did = false;
    if (this.overPaws(x, y)) { const s = this.nearestPaw(x, y); if (c.nails[s]) { c.nails[s] = null; did = true; } }
    else if (Object.keys(c.makeup).length || Object.keys(c.paint).length) { c.makeup = {}; c.paint = {}; did = true; }
    if (!did) return;
    this.bus.emit("fx:burst", { x, y, color: "#ffffff", small: true });
    this.bus.emit("audio:scrub");
    this.nubi.say("Limpinho!");
    this.bus.emit("act", "wipe");
    this._save();
  }

  // ---------------- direcionamento ----------------
  _findPage(pred) {
    const cur = this.slots.find(s => pred(s.def));
    return cur ? { slot: cur } : { page: true };
  }
  hintTarget(act) {
    const n = this.nubi, r = n.radius();
    const btn = this.pageBtnPos();
    const pred = {
      hair: (d) => d.kind === "hair" && d.value, haircolor: (d) => d.kind === "color", hairacc: (d) => d.kind === "acc",
      nails: (d) => d.kind === "polish", beauty: (d) => d.kind === "makeup" || d.kind === "paint",
      makeup: (d) => d.kind === "makeup", paint: (d) => d.kind === "paint"
    }[act];
    if (act === "wipe") return { from: this.slotPos(this.wipe), to: this.faceCenter() };
    if (!pred) return null;
    const f = this._findPage(pred);
    if (f.page) return { from: { x: btn.x, y: btn.y }, to: null };
    const from = this.slotPos(f.slot);
    if (act === "nails") return { from, to: this.pawPos(1) };
    if (act === "hair" || act === "haircolor" || act === "hairacc") return { from, to: null };
    return { from, to: this.faceCenter() };
    void r;
  }
  nudge(act) {
    const t = this.hintTarget(act);
    const s = t && [...this.slots, this.wipe].find(x => { const p = this.slotPos(x); return Math.hypot(p.x - t.from.x, p.y - t.from.y) < 2; });
    if (s) s.lift.kick(10); else this.pageBtn.kick(12);
  }
  holdDest() {
    const s = this.held || this.selected;
    if (!s) return null;
    const r = this.nubi.radius();
    if (s.def.kind === "polish") { const p = this.pawPos(1); const q = this.pawPos(-1); return { x: (p.x + q.x) / 2, y: p.y, r: r * 0.85 }; }
    if (s.def.kind === "hair" || s.def.kind === "color" || s.def.kind === "acc") return { x: this.nubi.px(), y: this.nubi.py() - r * 0.6, r: r * 0.8 };
    return { x: this.faceCenter().x, y: this.faceCenter().y, r: r * 0.9 };
  }
  hasSelection() { return !!this.selected; }

  // ---------------- loop / desenho ----------------
  update(dt) {
    this.t += dt;
    this.pageBtn.update(dt);
    for (const s of [...this.slots, this.wipe]) {
      if (!s.disp) continue;
      const isHeld = this.held === s;
      if (isHeld && this.dragPoint) {
        const px = s.disp.x; s.disp.set(this.dragPoint.x, this.dragPoint.y);
        s.tilt = damp(s.tilt, clamp((s.disp.x - px) * 0.04, -0.5, 0.5), 14, dt);
      } else { const h = this.slotPos(s); s.disp.to(h.x, h.y); s.disp.update(dt); s.tilt = damp(s.tilt, 0, 8, dt); }
      s.lift.target = isHeld || this.selected === s ? 1 : 0;
      s.lift.update(dt);
      if (s.pop < 1) s.pop = Math.min(1, s.pop + dt / 380);
    }
  }

  draw() {
    const ctx = this.vp.ctx;
    this.back.draw();
    this._mirrorLights(ctx);
    for (const s of this.slots) if (s !== this.held) this._drawSlot(ctx, s);
    this._drawPageBtn(ctx);
    this.nubi.draw();
    if (this.held !== this.wipe) this._drawSlot(ctx, this.wipe);
    if (this.held) this._drawSlot(ctx, this.held);
  }

  _mirrorLights(ctx) {
    const w = this.vp.w, h = this.vp.h, m = Math.min(w, h);
    const cx = w * 0.48, cy = h * 0.42, rx = m * 0.42, ry = m * 0.47;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const on = Motion.reduce ? 1 : 0.6 + 0.4 * Math.sin(this.t * 0.004 + i * 0.9);
      const x = cx + Math.cos(a) * rx * 1.06, y = cy + Math.sin(a) * ry * 1.06;
      const g = ctx.createRadialGradient(x, y, 0, x, y, m * 0.035);
      g.addColorStop(0, `rgba(255,245,200,${0.9 * on})`); g.addColorStop(1, "rgba(255,245,200,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, m * 0.035, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fffbe6"; ctx.beginPath(); ctx.arc(x, y, m * 0.011, 0, Math.PI * 2); ctx.fill();
    }
  }

  _drawSlot(ctx, s) {
    if (!s.disp) return;
    const r = this.itemR();
    const lift = Math.max(0, s.lift.x) * r * 0.35;
    const pop = Ease.outBack(clamp(s.pop), 2.4);
    if (this.held !== s) softShadow(ctx, s.disp.x, s.disp.y + r * 0.95, r * 0.75, r * 0.15, 0.18);
    ctx.save();
    ctx.translate(s.disp.x, s.disp.y - lift); ctx.rotate(s.tilt);
    const k = pop * (1 + lift / r * 0.35); ctx.scale(k, k);
    if (this.selected === s) {
      ctx.strokeStyle = "rgba(150,60,120,.7)"; ctx.lineWidth = 4; ctx.setLineDash([9, 7]); ctx.lineDashOffset = -this.t * 0.03;
      ctx.beginPath(); ctx.arc(0, 0, r * 1.35, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.beginPath(); ctx.arc(0, 0, r * 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#f3b6d3"; ctx.lineWidth = Math.max(2, r * 0.06); ctx.stroke();
    drawIcon(ctx, this._iconKey(s.def), 0, 0, r * 0.85);
    // aplicado agora: selinho verde
    if (this._isActive(s.def)) {
      ctx.fillStyle = "#62c370"; ctx.beginPath(); ctx.arc(r * 0.8, -r * 0.75, r * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = Math.max(2, r * 0.07); ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(r * 0.7, -r * 0.75); ctx.lineTo(r * 0.78, -r * 0.66); ctx.lineTo(r * 0.92, -r * 0.85); ctx.stroke();
    }
    ctx.restore();
  }

  _iconKey(def) {
    switch (def.kind) {
      case "hair": return def.value ? "hair:" + def.value : "wipe";
      case "color": return "color:" + def.value;
      case "acc": return "acc:" + def.value;
      case "polish": return "polish:" + def.value;
      case "makeup": return "makeup:" + def.value;
      case "paint": return "paint:" + def.value;
      case "wipe": return "wipe";
      default: return "star";
    }
  }
  _isActive(def) {
    const c = this.nubi.cosmetics;
    switch (def.kind) {
      case "hair": return def.value ? c.hair === def.value : false;
      case "color": return !!c.hair && c.hairColor === def.value;
      case "acc": return c.hairAcc === def.value;
      case "polish": return c.nails.L === def.value || c.nails.R === def.value;
      case "makeup": return !!c.makeup[def.value];
      case "paint": return !!c.paint[def.value];
      default: return false;
    }
  }

  _drawPageBtn(ctx) {
    const b = this.pageBtnPos();
    const next = SALON_PAGES[(this.pageIdx + 1) % SALON_PAGES.length];
    const s = 1 + this.pageBtn.x * 0.03;
    ctx.save(); ctx.translate(b.x, b.y); ctx.scale(s, s);
    ctx.shadowColor = "rgba(110,40,80,.25)"; ctx.shadowBlur = b.r * 0.3; ctx.shadowOffsetY = b.r * 0.12;
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "#f3b6d3"; ctx.lineWidth = Math.max(2, b.r * 0.1); ctx.stroke();
    drawIcon(ctx, next.icon, -b.r * 0.12, -b.r * 0.08, b.r * 0.5);
    ctx.strokeStyle = "#e0559a"; ctx.lineWidth = Math.max(2.5, b.r * 0.13); ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(b.r * 0.42, b.r * 0.25); ctx.lineTo(b.r * 0.62, b.r * 0.45); ctx.lineTo(b.r * 0.82, b.r * 0.25); ctx.stroke();
    ctx.restore();
  }

  _paintBack(c, w, h, m) {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#fff0f7"); g.addColorStop(1, "#ffd6ea");
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    // listras verticais suaves
    c.fillStyle = "rgba(255,255,255,.35)";
    for (let x = 0; x < w; x += m * 0.12) c.fillRect(x, 0, m * 0.05, h * 0.84);
    // espelho oval grande atrás do bichinho
    const cx = w * 0.48, cy = h * 0.42, rx = m * 0.42, ry = m * 0.47;
    c.save(); c.shadowColor = "rgba(150,60,110,.2)"; c.shadowBlur = m * 0.04;
    c.fillStyle = "#ffe08a"; c.beginPath(); c.ellipse(cx, cy, rx * 1.1, ry * 1.1, 0, 0, Math.PI * 2); c.fill(); c.restore();
    const mg = c.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
    mg.addColorStop(0, "#e8f6ff"); mg.addColorStop(1, "#c9e6f7");
    c.fillStyle = mg; c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "rgba(255,255,255,.55)";
    c.beginPath(); c.ellipse(cx - rx * 0.45, cy - ry * 0.4, rx * 0.1, ry * 0.35, 0.5, 0, Math.PI * 2); c.fill();
    // balcão à esquerda (onde ficam os itens)
    c.fillStyle = "#ffb3d4"; roundRect(c, w * 0.015, h * 0.16, w * 0.15, h * 0.7, m * 0.04); c.fill();
    c.fillStyle = "#fff4fa"; roundRect(c, w * 0.025, h * 0.19, w * 0.13, h * 0.64, m * 0.03); c.fill();
    // carrinho do lencinho à direita
    c.fillStyle = "#ffb3d4"; roundRect(c, w * 0.74, h * 0.7, w * 0.12, h * 0.18, m * 0.03); c.fill();
    // piso
    const fg = c.createLinearGradient(0, h * 0.86, 0, h);
    fg.addColorStop(0, "#f7c9df"); fg.addColorStop(1, "#eab0cc");
    c.fillStyle = fg; c.fillRect(0, h * 0.86, w, h * 0.14);
    c.fillStyle = "rgba(255,255,255,.4)";
    for (let x = 0; x < w; x += m * 0.1) for (let y = h * 0.88; y < h; y += m * 0.05) { c.beginPath(); c.arc(x + ((y / (m * 0.05)) % 2) * m * 0.05, y, m * 0.005, 0, Math.PI * 2); c.fill(); }
    void lighten; void darken;
  }
}
