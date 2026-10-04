/* Cômodo COZINHA - alimentar. Encapsula o cenário, os 4 alimentos e a
   lógica de alimentação (arraste OU toque-e-destino). Assina os eventos de
   ponteiro só enquanto está ativo (enter/exit).
   Toda animação (voo até a boca, reaparecer no prato) roda dentro do loop
   principal; antes o voo usava um requestAnimationFrame paralelo. */
import { KitchenScene } from "./kitchen.js";
import { FoodItem } from "../entities/food_item.js";
import { FOODS, KITCHEN_FOOD_SLOTS, MOUTH_OFFSET, FOOD_TABS, SLOT_X, SLOT_Y, TAB_Y, TAB_X0, TAB_DX, tabOf } from "../data/foods.js";
import { drawIcon } from "../ui/icons.js";
import { touchNubi } from "./nubi_touch.js";
import { Spring, Spring2, clamp, Ease, Motion, softShadow, roundRect, darken } from "../core/anim.js";

// rotina de limpeza: cascas caem no chão depois de comer; vão para a lixeira;
// lixeira cheia -> o saquinho é levado até a janela, e o caminhão passa.
const PEEL_SPOTS = [{ x: 0.6, y: 0.9 }, { x: 0.68, y: 0.94 }, { x: 0.54, y: 0.95 }];
const BIN = { x: 0.86, y: 0.8 };
const BIN_FULL = 2;

export class KitchenRoom {
  constructor({ vp, bus, nubi, save }) {
    this.vp = vp; this.bus = bus; this.nubi = nubi; this.save = save;
    this.scene = new KitchenScene(vp);
    this.items = KITCHEN_FOOD_SLOTS.map(s => new FoodItem(FOODS[s.food], vp, s.x, s.y));
    this.tabIdx = 0;
    this.tabSprings = FOOD_TABS.map(() => new Spring(0, { stiffness: 320, damping: 11 }));
    this.prizeOwned = () => false;   // ligado pela lojinha (comidas especiais)
    this.held = null; this.selected = null; this.busy = false;
    this.unsub = [];
    const tr = (save && save.state.trash) || {};
    this.peels = (tr.peels || []).map((food, i) => this._makePeel(food, i));
    this.fill = tr.fill || 0;
    this.lid = new Spring(0, { stiffness: 300, damping: 9 });
    this.bagLift = new Spring(0, { stiffness: 240, damping: 12 });
    this.bagPos = null;           // arrastando o saquinho
    this.truckT = 0;
    this.t = 0;
  }
  _makePeel(food, i) {
    const spot = PEEL_SPOTS[i % PEEL_SPOTS.length];
    return { food, x: spot.x, y: spot.y, disp: null, pop: 0, held: false };
  }
  _persistTrash() {
    if (!this.save) return;
    this.save.state.trash = { peels: this.peels.map(p => p.food), fill: this.fill };
    this.save.persist();
  }
  peelPos(p) { return { x: this.vp.dx(p.x), y: this.vp.dy(p.y) }; }
  peelR() { return this.vp.s(0.045); }
  binPos() { return { x: this.vp.dx(BIN.x), y: this.vp.dy(BIN.y), r: this.vp.s(0.085) }; }
  bagReady() { return this.fill >= BIN_FULL; }
  bagHome() { const b = this.binPos(); return { x: b.x, y: b.y - b.r * 1.05 }; }
  overBin(px, py) { const b = this.binPos(); return Math.hypot(px - b.x, py - (b.y - b.r * 0.3)) <= b.r * 1.35; }
  overWindow(px, py) { const w = this.scene.window(); return px >= w.x - 20 && px <= w.x + w.w + 20 && py >= w.y - 20 && py <= w.y + w.h + 20; }
  peelAt(px, py) { return this.peels.find(p => { const q = p.disp || this.peelPos(p); return Math.hypot(px - q.x, py - q.y) <= this.peelR() * 1.7; }) || null; }
  overBag(px, py) { if (!this.bagReady()) return false; const h = this.bagHome(); return Math.hypot(px - h.x, py - h.y) <= this.peelR() * 2; }

  _spawnPeel(food) {
    if (this.peels.length >= PEEL_SPOTS.length) return;
    const p = this._makePeel(food, this.peels.length);
    const used = new Set(this.peels.map(q => q.x + "," + q.y));
    const free = PEEL_SPOTS.find(s => !used.has(s.x + "," + s.y));
    if (free) { p.x = free.x; p.y = free.y; }
    this.peels.push(p);
    this._persistTrash();
  }
  /* Garante que o pedido de rotina tenha o que fazer (chamado pelo Guia). */
  ensure(act) {
    if (act === "trash:bin" && !this.peels.length) this._spawnPeel("banana");
    if (act === "trash:out" && !this.bagReady()) { this.fill = BIN_FULL; this._persistTrash(); }
  }

  // ---------------- abas da geladeira (grupos de comida) ----------------
  /* Abas visíveis: a de especiais só aparece com algum especial ganho. */
  tabs() { return FOOD_TABS.filter(t => !t.special || t.foods.some(f => this.prizeOwned("food:" + f))); }
  tab() { const v = this.tabs(); return v[Math.min(this.tabIdx, v.length - 1)]; }
  tabFoods(t) { return t.special ? t.foods.filter(f => this.prizeOwned("food:" + f)) : t.foods; }
  tabPos(i) { return { x: this.vp.dx(TAB_X0 + i * TAB_DX), y: this.vp.dy(TAB_Y), r: this.vp.s(0.045) }; }
  tabAt(px, py) {
    const v = this.tabs();
    for (let i = 0; i < v.length; i++) { const p = this.tabPos(i); if (Math.hypot(px - p.x, py - p.y) <= p.r * 1.3) return i; }
    return -1;
  }
  setTab(i) {
    const v = this.tabs();
    if (i < 0 || i >= v.length) return;
    const k = FOOD_TABS.indexOf(v[i]);
    this.tabSprings[k].kick(12);
    if (i === this.tabIdx) return;
    this.tabIdx = i;
    if (this.selected) this.selected.selected = false;
    this.selected = null;
    this.items = this.tabFoods(v[i]).map((f, j) => {
      const it = new FoodItem(FOODS[f], this.vp, SLOT_X[j], SLOT_Y);
      it.pop = 0; it.popT = -j * 0.18;   // brotam em sequência
      return it;
    });
    this.bus.emit("audio:bounce");
    this.nubi.look({ x: SLOT_X[1], y: SLOT_Y });
    setTimeout(() => this.nubi.stopLook(), 700);
    this.bus.emit("act", "tab:" + v[i].id);
  }

  enter() {
    this.nubi.pos = { x: 0.68, y: 0.52 };
    this.nubi.arrive();
    this.items.forEach(i => i.relayout());
    this.unsub = [
      this.bus.on("pointer:down", (p) => this.onDown(p)),
      this.bus.on("pointer:move", (p) => this.onMove(p)),
      this.bus.on("pointer:up", (e) => this.onUp(e)),
      this.bus.on("tap", (p) => this.onTap(p)),
      this.bus.on("viewport:resize", () => this.items.forEach(i => i.relayout()))
    ];
  }
  exit() {
    this.unsub.forEach(u => u()); this.unsub = [];
    if (this.held && this.held.goHome) { this.held.goHome(); }
    if (this.held && this.held.peel) this.held.peel.held = false;
    this.held = null; this.bagPos = null; this.selPeel = null; this.selBag = false;
    if (this.selected) this.selected.selected = false;
    this.selected = null;
  }

  mouthPoint() {
    const r = this.nubi.radius();
    return { x: this.nubi.px() + MOUTH_OFFSET.x * r, y: this.nubi.py() + MOUTH_OFFSET.y * r, r: MOUTH_OFFSET.r * r };
  }
  overMouth(px, py) { const m = this.mouthPoint(); return Math.hypot(px - m.x, py - m.y) <= m.r; }
  overNubi(px, py) { const r = this.nubi.radius() * 1.2; return Math.hypot(px - this.nubi.px(), py - this.nubi.py()) <= r; }
  topItemAt(px, py) { for (let i = this.items.length - 1; i >= 0; i--) if (this.items[i].contains(px, py)) return this.items[i]; return null; }

  onDown(p) {
    if (this.busy) return;
    if (this.tabAt(p.x, p.y) >= 0) return;   // aba: tratada no toque
    const it = this.topItemAt(p.x, p.y);
    if (it) {
      this.held = it; it.dragging = true; it.returning = false;
      this.nubi.look({ x: it.pos.x / this.vp.w, y: it.pos.y / this.vp.h });
      return;
    }
    const pl = this.peelAt(p.x, p.y);
    if (pl) { this.held = { peel: pl }; pl.held = true; if (!pl.disp) { const q = this.peelPos(pl); pl.disp = new Spring2(q.x, q.y, { stiffness: 200, damping: 16 }); } pl.disp.set(p.x, p.y); this.lid.target = 0.6; return; }
    if (this.overBag(p.x, p.y)) { this.held = { bag: true }; this.bagPos = { x: p.x, y: p.y }; }
  }
  onMove(p) {
    if (this.held && this.held.peel) { this.held.peel.disp.set(p.x, p.y); this.lid.target = this.overBin(p.x, p.y) ? 1 : 0.6; return; }
    if (this.held && this.held.bag) { this.bagPos = { x: p.x, y: p.y }; return; }
    if (this.held) { this.held.pos.x = p.x; this.held.pos.y = p.y; this.nubi.look({ x: p.x / this.vp.w, y: p.y / this.vp.h }); }
  }
  onUp(e) {
    if (!this.held) return;
    const p = e.point;
    if (this.held.peel) {
      const pl = this.held.peel; this.held = null; pl.held = false; this.lid.target = 0;
      if (p && this.overBin(p.x, p.y)) this._binPeel(pl);
      return;
    }
    if (this.held.bag) {
      this.held = null;
      if (p && this.overWindow(p.x, p.y)) this._bagOut();
      this.bagPos = null;
      return;
    }
    const it = this.held; this.held = null; it.dragging = false;
    if (p && e.moved && this.overMouth(p.x, p.y)) this.feed(it);
    else if (p && e.moved) { it.goHome(); this.nubi.stopLook(); }
  }

  _binPeel(pl) {
    this.peels = this.peels.filter(q => q !== pl);
    this.fill = Math.min(BIN_FULL, this.fill + 1);
    this._persistTrash();
    this.lid.kick(14);
    const b = this.binPos();
    this.bus.emit("audio:plop");
    this.bus.emit("fx:burst", { x: b.x, y: b.y - b.r, color: "#7fd88a", small: true });
    this.nubi.say("Lixo no lixo!");
    this.bus.emit("effect:discoveryOnly", { id: "lixeira" });
    this.bus.emit("act", "trash:bin");
    if (this.bagReady()) this.bagLift.kick(10);
  }
  _bagOut() {
    this.fill = 0;
    this._persistTrash();
    this.truckT = 3200;
    this.bus.emit("audio:honk");
    this.nubi.celebrate(); this.nubi.say("Tchau, lixo!");
    this.bus.emit("effect:discoveryOnly", { id: "caminhao" });
    this.bus.emit("act", "trash:out");
  }
  onTap(p) {
    if (this.busy) return;
    const ti = this.tabAt(p.x, p.y);
    if (ti >= 0) { this.setTab(ti); return; }
    // toque-e-destino também na rotina de limpeza
    const pl = this.peelAt(p.x, p.y);
    if (pl) { this.selPeel = this.selPeel === pl ? null : pl; this.lid.target = this.selPeel ? 0.6 : 0; return; }
    if (this.selPeel && this.overBin(p.x, p.y)) { const s = this.selPeel; this.selPeel = null; this.lid.target = 0; this._binPeel(s); return; }
    if (this.overBag(p.x, p.y)) { this.selBag = !this.selBag; this.bagLift.kick(8); return; }
    if (this.selBag && this.overWindow(p.x, p.y)) { this.selBag = false; this._bagOut(); return; }
    const it = this.topItemAt(p.x, p.y);
    if (it) {
      if (this.selected && this.selected !== it) this.selected.selected = false;
      this.selected = (this.selected === it) ? null : it;
      it.selected = !!this.selected && this.selected === it;
      if (it.selected) this.nubi.look({ x: it.pos.x / this.vp.w, y: it.pos.y / this.vp.h });
      return;
    }
    if (this.selected && this.overNubi(p.x, p.y)) {
      const sel = this.selected; this.selected = null; sel.selected = false; this.feed(sel);
      return;
    }
    touchNubi(this, p);
  }

  feed(item) {
    if (this.busy) return;
    this.busy = true;
    this.bus.emit("audio:chew");
    // o Nubi abre a boca enquanto a fruta voa em arco até ela
    item.flyTo(() => this.mouthPoint(), 240);
    this.nubi.eat(() => {
      const mouth = this.mouthPoint();
      this.bus.emit("effect:apply", { effect: item.def.effect, at: mouth, nubi: this.nubi });
      this.nubi.celebrate();
      this.nubi.stopLook();
      item.respawn();          // brota de novo no prato: pode oferecer outra vez
      this.busy = false;
      this._spawnPeel(item.def.id);
      this.bus.emit("act", "feed:" + item.def.id);
      const t = tabOf(item.def.id);
      if (t) this.bus.emit("act", "feedgroup:" + t.id);
      if (item.def.special) this.bus.emit("act", "feed:special");
    });
  }

  // ---- direcionamento (usado pelo sistema de pedidos) ----
  hintTarget(act) {
    if (act === "trash:bin") {
      const pl = this.peels[0]; const b = this.binPos();
      return pl ? { from: this.peelPos(pl), to: { x: b.x, y: b.y - b.r * 0.3 } } : null;
    }
    if (act === "trash:out") {
      if (!this.bagReady()) return null;
      const w = this.scene.window();
      return { from: this.bagHome(), to: { x: w.x + w.w / 2, y: w.y + w.h / 2 } };
    }
    if (act.startsWith("feedgroup:") || act === "feed:special") {
      const id = act === "feed:special" ? "especiais" : act.slice(10);
      const v = this.tabs(), i = v.findIndex(t => t.id === id);
      if (i < 0) return null;
      if (i !== this.tabIdx) { const tp = this.tabPos(i); return { from: { x: tp.x, y: tp.y }, to: null, tab: i }; }
      const it = this.items[0]; if (!it) return null;
      const m = this.mouthPoint();
      return { from: { x: it.pos.x, y: it.pos.y }, to: { x: m.x, y: m.y } };
    }
    if (!act.startsWith("feed:")) return null;
    const it = this.items.find(i => i.def.id === act.slice(5));
    if (!it) {
      // a comida pedida está em outra aba: a dica aponta a aba certa
      const t = tabOf(act.slice(5)); const v = this.tabs(); const i = t ? v.indexOf(t) : -1;
      if (i < 0) return null;
      const tp = this.tabPos(i);
      return { from: { x: tp.x, y: tp.y }, to: null, tab: i };
    }
    const m = this.mouthPoint();
    return { from: { x: it.pos.x, y: it.pos.y }, to: { x: m.x, y: m.y } };
  }
  nudge(act) {
    if (act === "trash:bin") { this.lid.kick(10); return; }
    if (act === "trash:out") { this.bagLift.kick(12); return; }
    const tg = this.hintTarget(act);
    if (tg && tg.tab !== undefined) { this.tabSprings[FOOD_TABS.indexOf(this.tabs()[tg.tab])].kick(14); return; }
    const it = this.items.find(i => "feed:" + i.def.id === act) || (act.startsWith("feedgroup:") || act === "feed:special" ? this.items[0] : null);
    if (it) it.lift.kick(9);
  }
  holdDest() {
    if ((this.held && this.held.peel) || this.selPeel) { const b = this.binPos(); return { x: b.x, y: b.y - b.r * 0.3, r: b.r * 1.2 }; }
    if ((this.held && this.held.bag) || this.selBag) { const w = this.scene.window(); return { x: w.x + w.w / 2, y: w.y + w.h / 2, r: Math.max(w.w, w.h) * 0.58 }; }
    if (!this.held && !this.selected) return null;
    const m = this.mouthPoint();
    return { x: m.x, y: m.y, r: this.nubi.radius() * 0.55 };
  }
  hasSelection() { return !!this.selected || !!this.selPeel || this.selBag; }

  update(dt) {
    this.t += dt;
    this.scene.update(dt); this.items.forEach(i => i.update(dt));
    this.lid.update(dt); this.bagLift.update(dt);
    for (const s of this.tabSprings) s.update(dt);
    for (const p of this.peels) {
      if (p.pop < 1) p.pop = Math.min(1, p.pop + dt / 420);
      if (p.disp && !p.held) { const h = this.peelPos(p); p.disp.to(h.x, h.y); p.disp.update(dt); }
    }
    if (this.truckT > 0) this.truckT -= dt;
  }
  draw() {
    this.scene.draw();
    this._tabs(this.vp.ctx);
    this._truck(this.vp.ctx);
    this._bin(this.vp.ctx);
    // itens no prato atrás; item pego/voando por cima do Nubi
    const front = this.items.filter(i => i.dragging || i.flight || i.returning || i.selected);
    this.items.filter(i => !front.includes(i)).forEach(i => i.draw());
    this.nubi.draw();
    for (const p of this.peels) this._peel(this.vp.ctx, p);
    front.forEach(i => i.draw());
    this._bag(this.vp.ctx);
  }

  // ---------------- desenho das abas da geladeira ----------------
  _tabs(ctx) {
    const v = this.tabs();
    if (v.length < 2) return;
    // trilho de madeira atrás das abas
    const a = this.tabPos(0), b = this.tabPos(v.length - 1);
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,.45)";
    roundRect(ctx, a.x - a.r * 1.35, a.y - a.r * 1.3, b.x - a.x + a.r * 2.7, a.r * 2.6, a.r * 1.3); ctx.fill();
    v.forEach((t, i) => {
      const p = this.tabPos(i), k = FOOD_TABS.indexOf(t);
      const on = i === this.tabIdx;
      const s = 1 + this.tabSprings[k].x * 0.025 + (on ? 0.12 : 0);
      ctx.save(); ctx.translate(p.x, p.y - (on ? p.r * 0.12 : 0)); ctx.scale(s, s);
      ctx.shadowColor = "rgba(90,50,20,.25)"; ctx.shadowBlur = p.r * 0.4; ctx.shadowOffsetY = p.r * 0.15;
      ctx.fillStyle = on ? t.color : "#ffffff";
      ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.strokeStyle = on ? darken(t.color, 0.35) : "#e6cfae"; ctx.lineWidth = Math.max(2, p.r * (on ? 0.14 : 0.09)); ctx.stroke();
      drawIcon(ctx, t.icon, 0, 0, p.r * 0.72);
      ctx.restore();
    });
    ctx.restore();
  }

  // ---------------- desenho da rotina de limpeza ----------------
  _peel(ctx, p) {
    const WRAP = { sandwich: "#fff1d0", pizza: "#f2d29a", cupcake: "#7fd0ff", popsicle: null, milk: "#ffffff", juice: "#ffb347", rainbowcake: "#ffd6ea", starcookie: "#ffe48a", icecream: "#f2c27a", donut: "#ffd6ea" };
    if (p.food in WRAP) return this._wrapper(ctx, p, WRAP[p.food]);
    const q = p.disp || this.peelPos(p);
    const r = this.peelR() * Ease.outBack(clamp(p.pop), 2.2) * (p.held ? 1.15 : 1);
    if (r < 0.5) return;
    if (!p.held) softShadow(ctx, q.x, q.y + r * 0.6, r * 0.9, r * 0.2, 0.18);
    ctx.save(); ctx.translate(q.x, q.y);
    if (this.selPeel === p) {
      ctx.strokeStyle = "rgba(80,80,140,.7)"; ctx.lineWidth = 3; ctx.setLineDash([7, 6]); ctx.lineDashOffset = -this.t * 0.03;
      ctx.beginPath(); ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    const ow = Math.max(1.5, r * 0.09);
    if (p.food === "banana") {
      ctx.fillStyle = "#f6cf3f"; ctx.strokeStyle = "#a8791a"; ctx.lineWidth = ow;
      for (const a of [-0.9, 0, 0.9]) { ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, -r * 0.45, r * 0.22, r * 0.55, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore(); }
      ctx.fillStyle = "#8a6a2a"; ctx.beginPath(); ctx.arc(0, r * 0.05, r * 0.16, 0, Math.PI * 2); ctx.fill();
    } else if (p.food === "pear") {
      ctx.fillStyle = "#f4f0c8"; ctx.strokeStyle = "#9ad24a"; ctx.lineWidth = ow * 1.4;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.3, r * 0.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#5e3818"; for (const y of [-0.1, 0.12]) { ctx.beginPath(); ctx.ellipse(0, y * r, r * 0.06, r * 0.1, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = "#5e3818"; ctx.lineWidth = ow; ctx.beginPath(); ctx.moveTo(0, -r * 0.6); ctx.lineTo(r * 0.1, -r * 0.85); ctx.stroke();
    } else if (p.food === "strawberry") {
      ctx.fillStyle = "#4caf6a"; ctx.strokeStyle = "#2f7a3d"; ctx.lineWidth = ow;
      for (let i = 0; i < 5; i++) { ctx.save(); ctx.rotate((i * Math.PI * 2) / 5); ctx.beginPath(); ctx.ellipse(0, -r * 0.4, r * 0.16, r * 0.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore(); }
      ctx.fillStyle = "#e8426b"; ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeStyle = "#4caf6a"; ctx.lineWidth = ow * 2;
      ctx.beginPath(); ctx.moveTo(-r * 0.4, r * 0.2); ctx.quadraticCurveTo(0, -r * 0.5, r * 0.4, r * 0.1); ctx.stroke();
      ctx.fillStyle = "#4caf6a"; ctx.beginPath(); ctx.ellipse(r * 0.1, -r * 0.3, r * 0.28, r * 0.14, -0.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  /* Embalagem amassada (doces/bebidas) ou palito de picolé, no lugar da casca. */
  _wrapper(ctx, p, color) {
    const q = p.disp || this.peelPos(p);
    const r = this.peelR() * Ease.outBack(clamp(p.pop), 2.2) * (p.held ? 1.15 : 1);
    if (r < 0.5) return;
    if (!p.held) softShadow(ctx, q.x, q.y + r * 0.6, r * 0.9, r * 0.2, 0.18);
    ctx.save(); ctx.translate(q.x, q.y);
    if (this.selPeel === p) {
      ctx.strokeStyle = "rgba(80,80,140,.7)"; ctx.lineWidth = 3; ctx.setLineDash([7, 6]); ctx.lineDashOffset = -this.t * 0.03;
      ctx.beginPath(); ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.lineJoin = "round"; const ow = Math.max(1.5, r * 0.09);
    if (!color) {
      ctx.rotate(0.6); roundRect(ctx, -r * 0.16, -r * 0.7, r * 0.32, r * 1.4, r * 0.16);
      ctx.fillStyle = "#f2d29a"; ctx.fill(); ctx.strokeStyle = "#9a6a2a"; ctx.lineWidth = ow; ctx.stroke();
    } else {
      ctx.beginPath();
      const pts = [[-0.7, -0.3], [-0.3, -0.65], [0.15, -0.5], [0.65, -0.6], [0.7, -0.05], [0.55, 0.5], [0.05, 0.62], [-0.45, 0.55], [-0.65, 0.15]];
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * r, y * r) : ctx.moveTo(x * r, y * r)));
      ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = darken(color, 0.45); ctx.lineWidth = ow; ctx.stroke();
      ctx.strokeStyle = "rgba(0,0,0,.18)"; ctx.lineWidth = ow * 0.7;
      ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.4); ctx.lineTo(r * 0.1, r * 0.1); ctx.lineTo(r * 0.45, -r * 0.2); ctx.moveTo(-r * 0.4, r * 0.3); ctx.lineTo(r * 0.05, r * 0.15); ctx.stroke();
    }
    ctx.restore();
  }

  _bin(ctx) {
    const b = this.binPos(), r = b.r;
    softShadow(ctx, b.x, b.y + r * 0.95, r * 0.95, r * 0.2, 0.22);
    ctx.save(); ctx.translate(b.x, b.y);
    ctx.lineJoin = "round";
    // corpo
    ctx.beginPath(); ctx.moveTo(-r * 0.75, -r * 0.6); ctx.lineTo(r * 0.75, -r * 0.6); ctx.lineTo(r * 0.6, r * 0.9); ctx.lineTo(-r * 0.6, r * 0.9); ctx.closePath();
    const g = ctx.createLinearGradient(-r, 0, r, 0); g.addColorStop(0, "#7fd88a"); g.addColorStop(1, "#4fb565");
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = "#2f7a3d"; ctx.lineWidth = Math.max(2, r * 0.07); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.45)"; ctx.lineWidth = Math.max(2, r * 0.06);
    for (const x of [-0.32, 0, 0.32]) { ctx.beginPath(); ctx.moveTo(x * r, -r * 0.4); ctx.lineTo(x * r * 0.85, r * 0.75); ctx.stroke(); }
    // símbolo de reciclagem simplificado: três setinhas em círculo
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = Math.max(2, r * 0.07);
    ctx.beginPath(); ctx.arc(0, r * 0.2, r * 0.22, 0.3, Math.PI * 1.7); ctx.stroke();
    // tampa que abre (dobradiça na direita)
    const open = clamp(this.lid.x) * 1.1 + (this.lid.x > 1 ? 0 : 0);
    ctx.save(); ctx.translate(r * 0.8, -r * 0.62); ctx.rotate(-open);
    roundRect(ctx, -r * 1.65, -r * 0.18, r * 1.7, r * 0.22, r * 0.1);
    ctx.fillStyle = "#62c370"; ctx.fill(); ctx.strokeStyle = "#2f7a3d"; ctx.lineWidth = Math.max(2, r * 0.07); ctx.stroke();
    roundRect(ctx, -r * 1.0, -r * 0.34, r * 0.4, r * 0.18, r * 0.08); ctx.fillStyle = "#2f7a3d"; ctx.fill();
    ctx.restore();
    // nível de cheio: casquinhas aparecendo na boca da lixeira
    if (this.fill > 0 && !this.bagReady()) {
      ctx.fillStyle = "#f6cf3f"; ctx.beginPath(); ctx.ellipse(-r * 0.2, -r * 0.62, r * 0.18, r * 0.07, 0.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  _bag(ctx) {
    if (!this.bagReady()) return;
    const home = this.bagHome();
    const p = this.bagPos || home;
    const r = this.peelR() * 1.3;
    const lift = Math.max(0, this.bagLift.x) * r * 0.15;
    ctx.save(); ctx.translate(p.x, p.y - lift);
    const pulse = this.bagPos || Motion.reduce ? 0 : Math.sin(this.t * 0.005) * 0.04;
    ctx.scale(1 + pulse, 1 - pulse);
    if (this.selBag) {
      ctx.strokeStyle = "rgba(80,80,140,.7)"; ctx.lineWidth = 3; ctx.setLineDash([7, 6]); ctx.lineDashOffset = -this.t * 0.03;
      ctx.beginPath(); ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.beginPath(); ctx.moveTo(-r * 0.15, -r * 0.55); ctx.quadraticCurveTo(-r * 0.8, -r * 0.2, -r * 0.65, r * 0.55); ctx.quadraticCurveTo(0, r * 0.9, r * 0.65, r * 0.55);
    ctx.quadraticCurveTo(r * 0.8, -r * 0.2, r * 0.15, -r * 0.55); ctx.closePath();
    ctx.fillStyle = "#5a6478"; ctx.fill(); ctx.strokeStyle = "#1d2330"; ctx.lineWidth = Math.max(2, r * 0.08); ctx.stroke();
    ctx.strokeStyle = "#ffd54a"; ctx.lineWidth = Math.max(2, r * 0.12); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-r * 0.25, -r * 0.6); ctx.quadraticCurveTo(0, -r * 0.45, r * 0.25, -r * 0.6); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.22)"; ctx.beginPath(); ctx.ellipse(-r * 0.3, r * 0.05, r * 0.1, r * 0.25, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  /* Caminhão do lixo passando pela janela depois de levar o saquinho. */
  _truck(ctx) {
    if (this.truckT <= 0) return;
    const w = this.scene.window(), m = Math.min(this.vp.w, this.vp.h);
    const u = 1 - this.truckT / 3200;
    const x = w.x - w.w * 0.4 + u * w.w * 1.8, y = w.y + w.h * 0.72;
    const s = m * 0.05;
    ctx.save();
    roundRect(ctx, w.x + m * 0.012, w.y + m * 0.012, w.w - m * 0.024, w.h - m * 0.024, m * 0.03); ctx.clip();
    ctx.translate(x, y + (Motion.reduce ? 0 : Math.sin(u * 40) * s * 0.03));
    ctx.fillStyle = "#62c370"; roundRect(ctx, -s * 1.6, -s * 0.9, s * 2.0, s * 1.0, s * 0.2); ctx.fill();
    ctx.fillStyle = "#ffd54a"; roundRect(ctx, s * 0.45, -s * 0.7, s * 0.8, s * 0.8, s * 0.2); ctx.fill();
    ctx.fillStyle = "#bfe6ff"; roundRect(ctx, s * 0.65, -s * 0.6, s * 0.45, s * 0.35, s * 0.08); ctx.fill();
    ctx.fillStyle = "#2a2148";
    for (const wx of [-s * 1.1, s * 0.85]) { ctx.beginPath(); ctx.arc(wx, s * 0.15, s * 0.25, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#5a6478"; ctx.beginPath(); ctx.ellipse(-s * 0.6, -s * 1.0, s * 0.35, s * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    void darken;
  }
}
