/* Cômodo SALÃO DE BELEZA - dividido em 3 estações, com ida e volta:
     recepção do salão (hub) -> Cabelo | Unhas | Maquiagem
   - na recepção, 3 portas grandes levam a cada estação (um toque);
   - em cada estação: balcão com as opções daquela parte, botão de página,
     e uma fileira embaixo com "voltar" + atalhos para as outras estações;
   - Unhas: close na patinha, pintando dedinho por dedinho, com adesivinhos;
   - Maquiagem: o bichinho fica maior, com o rosto em destaque;
   - "voltar" (aqui ou o botão do topo) sempre leva à recepção do salão.
   Tudo aberto a qualquer bichinho; o lencinho limpa sem custo.
   Sem erro: soltar fora só devolve o item ao balcão. */
import { Spring, Spring2, damp, clamp, Ease, Motion, CachedLayer, roundRect, softShadow, lighten, darken } from "../core/anim.js";
import { touchNubi } from "./nubi_touch.js";
import { drawIcon } from "../ui/icons.js";
import { SALON_PAGES, WIPE, STATIONS, STATION_ORDER, ACT_STATION } from "../data/salon.js";

const ROW_Y = [0.3, 0.5, 0.7];
const PAGE_BTN = { x: 0.09, y: 0.9 };
const BAR_Y = 0.9;
const BACK_X = 0.2, CHIP_X0 = 0.28, CHIP_DX = 0.08;
const DOORS = { hair: { x: 0.14, y: 0.25 }, nails: { x: 0.14, y: 0.5 }, makeup: { x: 0.14, y: 0.75 } };
const WIPE_AT = { makeup: { x: 0.8, y: 0.8 }, nails: { x: 0.66, y: 0.86 } };
const NUBI_AT = { null: { x: 0.52, y: 0.5, k: 1 }, hair: { x: 0.48, y: 0.5, k: 1 }, nails: { x: 0.83, y: 0.5, k: 0.68 }, makeup: { x: 0.5, y: 0.53, k: 1.22 } };
const PAW = { x: 0.45, y: 0.52, r: 0.22 };
const TOES = [[-0.62, -0.5], [-0.22, -0.82], [0.22, -0.82], [0.62, -0.5]];
const FLIP = { x: 0.56, y: 0.9 };

export class SalonRoom {
  constructor({ vp, bus, nubi }) {
    this.vp = vp; this.bus = bus; this.nubi = nubi;
    this.station = null;          // null = recepção do salão
    this.pageIdx = 0;
    this.pawSide = "R";           // patinha em close na estação de unhas
    this.pageBtn = new Spring(0, { stiffness: 320, damping: 12 });
    this.doorK = STATION_ORDER.map(() => new Spring(0, { stiffness: 320, damping: 11 }));
    this.chipK = [0, 1, 2, 3].map(() => new Spring(0, { stiffness: 320, damping: 11 }));
    this.flipK = new Spring(0, { stiffness: 320, damping: 11 });
    this.pawK = new Spring(1, { stiffness: 220, damping: 14 });
    this.toeFx = { L: [0, 0, 0, 0], R: [0, 0, 0, 0] };
    this.enterT = 1;
    this.wipe = { def: WIPE, x: 0.8, y: 0.8, disp: null, lift: new Spring(0, { stiffness: 320, damping: 15 }), tilt: 0, pop: 1 };
    this.slots = [];
    this.held = null; this.dragPoint = null; this.selected = null; this.last = null;
    this.wipeDist = 0;
    this.t = 0; this.unsub = [];
    this.back_ = new CachedLayer(vp, (c, w, h, m) => this._paintBack(c, w, h, m));
    this._buildPage();
  }

  // ---------------- estações / páginas ----------------
  stationPages() { return this.station ? SALON_PAGES.filter(p => p.station === this.station) : []; }
  page() { const p = this.stationPages(); return p.length ? p[this.pageIdx % p.length] : { id: "recepcao", items: [] }; }
  _buildPage() {
    this.slots = this.page().items.map((def, i) => ({ def, x: 0.09, y: ROW_Y[i], disp: null, lift: new Spring(0, { stiffness: 320, damping: 15 }), tilt: 0, pop: -i * 0.15 }));
    if (this.vp.w) for (const s of this.slots) { const p = this.slotPos(s); s.disp = new Spring2(p.x, p.y, { stiffness: 190, damping: 16 }); }
    this.selected = null;
  }
  nextPage() {
    const n = this.stationPages().length || 1;
    this.pageIdx = (this.pageIdx + 1) % n;
    this._buildPage(); this.pageBtn.kick(10);
    this.bus.emit("audio:bounce");
  }
  hasWipe() { return !!(this.station && STATIONS[this.station].wipe); }

  _placeNubi(kick = true) {
    const a = NUBI_AT[this.station] || NUBI_AT.null;
    this.nubi.pos = { x: a.x, y: a.y };
    this.nubi.sizeK = a.k;
    if (kick) this.nubi.arrive();
  }
  openStation(id) {
    if (!STATIONS[id]) return;
    const same = this.station === id;
    this.station = id; this.pageIdx = 0; this.held = null;
    this._buildPage();
    const w = WIPE_AT[id]; if (w) { this.wipe.x = w.x; this.wipe.y = w.y; const p = this.slotPos(this.wipe); this.wipe.disp = new Spring2(p.x, p.y, { stiffness: 190, damping: 16 }); }
    this._placeNubi(!same);
    this.enterT = 0;
    if (id === "nails") this.pawK.kick(8);
    this.bus.emit("audio:pop");
    this.bus.emit("act", "salon:station:" + id);
    this.bus.emit("room:sub", "salon");
  }
  closeStation() {
    if (!this.station) return false;
    this.station = null; this.held = null; this.selected = null;
    this._buildPage(); this._placeNubi(); this.enterT = 0;
    this.bus.emit("audio:pop");
    return true;
  }
  canBack() { return !!this.station; }
  back() { return this.closeStation(); }

  enter() {
    // ao chegar no salão, sempre a recepção (as 3 portas): é o ponto de partida
    if (this.station) { this.station = null; this._buildPage(); }
    this.enterT = 0;
    this._placeNubi();
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
  _slotsLive() { return this.hasWipe() ? [...this.slots, this.wipe] : this.slots; }
  slotAt(px, py) { return this._slotsLive().find(s => { const p = this.slotPos(s); return Math.hypot(px - p.x, py - p.y) <= this.itemR() * 1.5; }) || null; }
  pageBtnPos() { return { x: this.vp.dx(PAGE_BTN.x), y: this.vp.dy(PAGE_BTN.y), r: this.vp.s(0.055) }; }
  overPageBtn(px, py) { if (!this.station) return false; const b = this.pageBtnPos(); return Math.hypot(px - b.x, py - b.y) <= b.r * 1.35; }
  doorPos(id) { const d = DOORS[id]; return { x: this.vp.dx(d.x), y: this.vp.dy(d.y), r: this.vp.s(0.085) }; }
  doorAt(px, py) { if (this.station) return null; return STATION_ORDER.find(id => { const d = this.doorPos(id); return Math.hypot(px - d.x, py - d.y) <= d.r * 1.25; }) || null; }
  chipPos(i) { return { x: this.vp.dx(i === 0 ? BACK_X : CHIP_X0 + (i - 1) * CHIP_DX), y: this.vp.dy(BAR_Y), r: this.vp.s(0.042) }; }
  chipAt(px, py) {
    if (!this.station) return -1;
    for (let i = 0; i < 4; i++) { const c = this.chipPos(i); if (Math.hypot(px - c.x, py - c.y) <= c.r * 1.3) return i; }
    return -1;
  }
  flipPos() { return { x: this.vp.dx(FLIP.x), y: this.vp.dy(FLIP.y), r: this.vp.s(0.045) }; }
  overFlip(px, py) { if (this.station !== "nails") return false; const f = this.flipPos(); return Math.hypot(px - f.x, py - f.y) <= f.r * 1.3; }

  overNubi(px, py, s = 1.2) { return Math.hypot(px - this.nubi.px(), py - this.nubi.py()) <= this.nubi.radius() * s; }
  pawPos(side) {
    if (this.station === "nails") return this.toePos(side === -1 || side === "L" ? "L" : "R", 1);
    const r = this.nubi.radius(); const k = side === "L" ? -1 : side === "R" ? 1 : side;
    return { x: this.nubi.px() + k * r * 0.46, y: this.nubi.py() + r * 0.95 };
  }
  nearestPaw(px, py) {
    const L = this.pawPos(-1), R = this.pawPos(1);
    return Math.hypot(px - L.x, py - L.y) < Math.hypot(px - R.x, py - R.y) ? "L" : "R";
  }
  overPaws(px, py) {
    if (this.station === "nails") return this.overBigPaw(px, py);
    const r = this.nubi.radius();
    return ["L", "R"].some(k => { const p = this.pawPos(k === "L" ? -1 : 1); return Math.hypot(px - p.x, py - p.y) <= r * 0.42; });
  }
  bigPaw() { return { x: this.vp.dx(PAW.x), y: this.vp.dy(PAW.y), r: this.vp.s(PAW.r) }; }
  overBigPaw(px, py) { const p = this.bigPaw(); return Math.hypot(px - p.x, py - (p.y - p.r * 0.2)) <= p.r * 1.15; }
  /* Centro do dedinho i da patinha em close (a patinha esquerda é espelhada). */
  toePos(side, i) {
    const p = this.bigPaw(), m = side === "L" ? -1 : 1;
    const [tx, ty] = TOES[i];
    return { x: p.x + tx * p.r * m, y: p.y + ty * p.r, r: p.r * 0.27 };
  }
  toeAt(px, py) {
    let best = -1, bd = Infinity;
    for (let i = 0; i < 4; i++) { const t = this.toePos(this.pawSide, i); const d = Math.hypot(px - t.x, py - t.y); if (d < bd) { bd = d; best = i; } }
    const t = this.toePos(this.pawSide, 0);
    return bd <= t.r * 1.7 ? best : -1;
  }
  faceCenter() { return { x: this.nubi.px(), y: this.nubi.py() + this.nubi.radius() * 0.05 }; }
  overFace(px, py) { const f = this.faceCenter(); return Math.hypot(px - f.x, py - f.y) <= this.nubi.radius() * 0.85; }

  // ---------------- entrada ----------------
  onDown(p) {
    const d = this.doorAt(p.x, p.y);
    if (d) { this.doorK[STATION_ORDER.indexOf(d)].target = 1; return; }
    const s = this.slotAt(p.x, p.y);
    if (s) { this.held = s; this.dragPoint = { x: p.x, y: p.y }; this.last = { x: p.x, y: p.y }; this.wipeDist = 0; }
  }
  onMove(p) {
    if (!this.held) return;
    const d = this.last ? Math.hypot(p.x - this.last.x, p.y - this.last.y) : 0;
    this.last = { x: p.x, y: p.y };
    this.dragPoint = { x: p.x, y: p.y };
    if (this.station !== "nails") this.nubi.look({ x: p.x / this.vp.w, y: p.y / this.vp.h });
    if (this.held.def.kind === "wipe") {
      if (this.overFace(p.x, p.y) || this.overPaws(p.x, p.y)) {
        this.wipeDist += d;
        if (Math.random() < 0.3) this.bus.emit("fx:bubble", { x: p.x, y: p.y, color: "#ffffff" });
        if (this.wipeDist > 160) { this.wipeDist = 0; this._wipeAt(p.x, p.y); }
      }
    }
  }
  onUp(e) {
    this.doorK.forEach(k => { k.target = 0; });
    const s = this.held; this.held = null; this.nubi.stopLook();
    if (!s) return;
    const p = e.point;
    if (p && s.def.kind !== "wipe") this._applyAt(s, p.x, p.y);
    if (s.disp && this.dragPoint) s.disp.set(this.dragPoint.x, this.dragPoint.y);
    this.dragPoint = null;
  }
  onTap(p) {
    const d = this.doorAt(p.x, p.y);
    if (d) { this.doorK[STATION_ORDER.indexOf(d)].kick(-12); this.openStation(d); return; }
    const ci = this.chipAt(p.x, p.y);
    if (ci >= 0) {
      this.chipK[ci].kick(-12);
      if (ci === 0) { this.closeStation(); this.bus.emit("room:sub", "salon"); }
      else this.openStation(STATION_ORDER[ci - 1]);
      return;
    }
    if (this.overFlip(p.x, p.y)) { this.pawSide = this.pawSide === "R" ? "L" : "R"; this.flipK.kick(12); this.pawK.kick(-10); this.bus.emit("audio:bounce"); return; }
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
    if (this.station === "nails" && this.overBigPaw(p.x, p.y)) { this.pawK.kick(-6); this.nubi.giggle(); this.bus.emit("audio:giggle"); return; }
    touchNubi(this, p);
  }

  /* Aplica um item solto/tocado em (x,y). Retorna true se aplicou. */
  _applyAt(s, x, y) {
    const k = s.def.kind;
    if (k === "polish" || k === "nailart") {
      if (this.station === "nails") {
        if (!this.overBigPaw(x, y)) return false;
        let i = this.toeAt(x, y);
        if (i < 0) i = this._nextToe(k);
        if (k === "polish") this._paintToe(this.pawSide, i, s.def.value);
        else this._nailArt(this.pawSide, s.def.value);
        return true;
      }
      if (!this.overPaws(x, y) && !this.overNubi(x, y)) return false;
      this._polish(this.nearestPaw(x, y), s.def.value);
      return true;
    }
    if (!this.overNubi(x, y, 1.3)) return false;
    this._apply(s.def);
    return true;
  }
  _toes() {
    const c = this._cos();
    if (!c.toes) c.toes = { L: [null, null, null, null], R: [null, null, null, null] };
    if (!c.nailArt) c.nailArt = { L: null, R: null };
    return c.toes;
  }
  _nextToe() { const t = this._toes()[this.pawSide]; const i = t.findIndex(v => !v); return i < 0 ? 0 : i; }

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
    const t = this._toes(); t[side] = [color, color, color, color];
    const p = this.pawPos(side === "L" ? -1 : 1);
    this._sparkle(p.x, p.y, color);
    this.nubi.say("Unhas lindas!");
    this.nubi.giggle();
    if (c.nails.L && c.nails.R) this.bus.emit("effect:discoveryOnly", { id: "unhas_coloridas" });
    this.bus.emit("act", "nails");
    this._save();
  }
  /* Pinta UM dedinho (close da patinha). A cor da unha que aparece no
     bichinho inteiro é a do último dedinho pintado daquela patinha. */
  _paintToe(side, i, color) {
    const c = this._cos(), t = this._toes();
    t[side][i] = color;
    c.nails[side] = color;
    this.toeFx[side][i] = 1;
    const p = this.toePos(side, i);
    this._sparkle(p.x, p.y - p.r * 0.4, color);
    this.pawK.kick(4);
    const full = t[side].every(Boolean);
    if (full) { this.nubi.say("Patinha prontinha!"); this.nubi.giggle(); this.bus.emit("fx:burst", { x: this.bigPaw().x, y: this.bigPaw().y, color, small: false }); }
    else if (Math.random() < 0.4) this.nubi.say(["Que cor!", "Lindo!", "Mais um!"][i % 3]);
    if (c.nails.L && c.nails.R) this.bus.emit("effect:discoveryOnly", { id: "unhas_coloridas" });
    this.bus.emit("act", "nails");
    if (full) this.bus.emit("act", "nails:full");
    this._save();
  }
  _nailArt(side, value) {
    const c = this._cos(); this._toes();
    c.nailArt[side] = value;
    const p = this.bigPaw();
    this._sparkle(p.x, p.y - p.r * 0.6, "#ffd54a");
    this.nubi.say(value === "heart" ? "Coraçõezinhos!" : "Estrelinhas!");
    this.bus.emit("effect:discoveryOnly", { id: "unhas_arte" });
    this.bus.emit("act", "nailart"); this.bus.emit("act", "nails");
    this._save();
  }

  _wipeAt(x, y) {
    const c = this._cos();
    let did = false;
    if (this.overPaws(x, y)) {
      const s = this.station === "nails" ? this.pawSide : this.nearestPaw(x, y);
      const t = this._toes();
      if (c.nails[s] || t[s].some(Boolean) || c.nailArt[s]) { c.nails[s] = null; t[s] = [null, null, null, null]; c.nailArt[s] = null; did = true; }
    } else if (Object.keys(c.makeup).length || Object.keys(c.paint).length) { c.makeup = {}; c.paint = {}; did = true; }
    if (!did) return;
    this.bus.emit("fx:burst", { x, y, color: "#ffffff", small: true });
    this.bus.emit("audio:scrub");
    this.nubi.say("Limpinho!");
    this.bus.emit("act", "wipe");
    this._save();
  }

  // ---------------- direcionamento ----------------
  hintTarget(act) {
    const want = act === "wipe" ? (this.station || "makeup") : ACT_STATION[act];
    if (!want) return null;
    if (this.station !== want) {
      // a dica aponta a porta da estação (na recepção) ou o atalho (na fileira de baixo)
      if (!this.station) { const d = this.doorPos(want); return { from: { x: d.x, y: d.y }, to: null, door: want }; }
      const c = this.chipPos(1 + STATION_ORDER.indexOf(want));
      return { from: { x: c.x, y: c.y }, to: null, chip: want };
    }
    const btn = this.pageBtnPos();
    if (act === "wipe") return { from: this.slotPos(this.wipe), to: this.station === "nails" ? this.bigPaw() : this.faceCenter() };
    const pred = {
      hair: (d) => d.kind === "hair" && d.value, haircolor: (d) => d.kind === "color", hairacc: (d) => d.kind === "acc",
      nails: (d) => d.kind === "polish", nailart: (d) => d.kind === "nailart", beauty: (d) => d.kind === "makeup" || d.kind === "paint",
      makeup: (d) => d.kind === "makeup", paint: (d) => d.kind === "paint"
    }[act];
    const slot = this.slots.find(s => pred(s.def));
    if (!slot) return { from: { x: btn.x, y: btn.y }, to: null };
    const from = this.slotPos(slot);
    if (act === "nails" || act === "nailart") { const t = this.toePos(this.pawSide, this._nextToe()); return { from, to: { x: t.x, y: t.y } }; }
    if (act === "hair" || act === "haircolor" || act === "hairacc") return { from, to: null };
    return { from, to: this.faceCenter() };
  }
  nudge(act) {
    const t = this.hintTarget(act);
    if (!t) return;
    if (t.door) { this.doorK[STATION_ORDER.indexOf(t.door)].kick(14); return; }
    if (t.chip) { this.chipK[1 + STATION_ORDER.indexOf(t.chip)].kick(14); return; }
    const s = this._slotsLive().find(x => { const p = this.slotPos(x); return Math.hypot(p.x - t.from.x, p.y - t.from.y) < 2; });
    if (s) s.lift.kick(10); else this.pageBtn.kick(12);
  }
  holdDest() {
    const s = this.held || this.selected;
    if (!s) return null;
    const r = this.nubi.radius();
    if (s.def.kind === "polish" || s.def.kind === "nailart") {
      if (this.station === "nails") { const p = this.bigPaw(); return { x: p.x, y: p.y - p.r * 0.35, r: p.r * 1.05 }; }
      const p = this.pawPos(1); const q = this.pawPos(-1); return { x: (p.x + q.x) / 2, y: p.y, r: r * 0.85 };
    }
    if (s.def.kind === "wipe" && this.station === "nails") { const p = this.bigPaw(); return { x: p.x, y: p.y - p.r * 0.35, r: p.r * 1.05 }; }
    if (s.def.kind === "hair" || s.def.kind === "color" || s.def.kind === "acc") return { x: this.nubi.px(), y: this.nubi.py() - r * 0.6, r: r * 0.8 };
    return { x: this.faceCenter().x, y: this.faceCenter().y, r: r * 0.9 };
  }
  hasSelection() { return !!this.selected; }

  // ---------------- loop ----------------
  update(dt) {
    this.t += dt;
    if (this.enterT < 1) this.enterT = Math.min(1, this.enterT + dt / 420);
    this.pageBtn.update(dt); this.flipK.update(dt); this.pawK.update(dt);
    for (const k of this.doorK) k.update(dt);
    for (const k of this.chipK) k.update(dt);
    for (const s of ["L", "R"]) for (let i = 0; i < 4; i++) this.toeFx[s][i] = Math.max(0, this.toeFx[s][i] - dt / 500);
    for (const s of this._slotsLive()) {
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

  // ---------------- desenho ----------------
  draw() {
    const ctx = this.vp.ctx;
    this.back_.draw();
    if (this.station !== "nails") this._mirrorLights(ctx);
    if (!this.station) { this._doors(ctx); this.nubi.draw(); return; }
    this._stationTint(ctx);
    if (this.station === "nails") this._bigPaw(ctx);
    for (const s of this.slots) if (s !== this.held) this._drawSlot(ctx, s);
    this._drawPageBtn(ctx);
    this._bar(ctx);
    if (this.station === "nails") this._flip(ctx);
    this.nubi.draw();
    if (this.hasWipe() && this.held !== this.wipe) this._drawSlot(ctx, this.wipe);
    if (this.held) this._drawSlot(ctx, this.held);
  }

  _stationTint(ctx) {
    const st = STATIONS[this.station];
    ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = st.color; ctx.fillRect(0, 0, this.vp.w, this.vp.h); ctx.restore();
  }

  /* Recepção do salão: 3 portas redondas grandes, cada uma com sua cor. */
  _doors(ctx) {
    const k = Ease.outBack(clamp(this.enterT), 1.8);
    STATION_ORDER.forEach((id, i) => {
      const d = this.doorPos(id), st = STATIONS[id];
      const idle = Motion.reduce ? 0 : Math.sin(this.t * 0.003 + i * 1.3) * d.r * 0.04;
      const press = clamp(this.doorK[i].x, -1, 1);
      const s = Math.max(0, k) * (1 - press * 0.08);
      ctx.save(); ctx.translate(d.x, d.y + idle); ctx.scale(s, s);
      ctx.shadowColor = "rgba(110,40,80,.28)"; ctx.shadowBlur = d.r * 0.35; ctx.shadowOffsetY = d.r * 0.12;
      const g = ctx.createRadialGradient(-d.r * 0.3, -d.r * 0.35, d.r * 0.1, 0, 0, d.r * 1.1);
      g.addColorStop(0, lighten(st.color, 0.55)); g.addColorStop(1, st.color);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, d.r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = Math.max(3, d.r * 0.1); ctx.stroke();
      ctx.strokeStyle = darken(st.color, 0.3); ctx.lineWidth = Math.max(2, d.r * 0.05);
      ctx.beginPath(); ctx.arc(0, 0, d.r * 1.06, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.beginPath(); ctx.arc(0, 0, d.r * 0.72, 0, Math.PI * 2); ctx.fill();
      drawIcon(ctx, st.icon, 0, 0, d.r * 0.55);
      // setinha "entrar"
      ctx.fillStyle = darken(st.color, 0.25);
      ctx.beginPath(); ctx.moveTo(d.r * 1.18, -d.r * 0.16); ctx.lineTo(d.r * 1.42, 0); ctx.lineTo(d.r * 1.18, d.r * 0.16); ctx.closePath(); ctx.fill();
      ctx.restore();
    });
  }

  /* Fileira de baixo: voltar + atalhos para as 3 estações. */
  _bar(ctx) {
    const c0 = this.chipPos(0), c3 = this.chipPos(3);
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,.6)";
    roundRect(ctx, c0.x - c0.r * 1.4, c0.y - c0.r * 1.35, c3.x - c0.x + c0.r * 2.8, c0.r * 2.7, c0.r * 1.35); ctx.fill();
    for (let i = 0; i < 4; i++) {
      const c = this.chipPos(i);
      const id = i ? STATION_ORDER[i - 1] : null;
      const on = id === this.station;
      const s = 1 - clamp(this.chipK[i].x, -1, 1) * 0.08 + (on ? 0.1 : 0);
      ctx.save(); ctx.translate(c.x, c.y); ctx.scale(s, s);
      ctx.fillStyle = i === 0 ? "#fff1a8" : on ? STATIONS[id].color : "#ffffff";
      ctx.shadowColor = "rgba(110,40,80,.22)"; ctx.shadowBlur = c.r * 0.35; ctx.shadowOffsetY = c.r * 0.12;
      ctx.beginPath(); ctx.arc(0, 0, c.r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.strokeStyle = i === 0 ? "#c49a1a" : on ? darken(STATIONS[id].color, 0.35) : "#f3b6d3"; ctx.lineWidth = Math.max(2, c.r * 0.1); ctx.stroke();
      drawIcon(ctx, i === 0 ? "back" : STATIONS[id].icon, 0, 0, c.r * 0.62);
      ctx.restore();
    }
    ctx.restore();
  }

  _flip(ctx) {
    const f = this.flipPos();
    const s = 1 + this.flipK.x * 0.03;
    ctx.save(); ctx.translate(f.x, f.y); ctx.scale(s * (this.pawSide === "L" ? -1 : 1), s);
    ctx.fillStyle = "#ffffff"; ctx.shadowColor = "rgba(110,40,80,.22)"; ctx.shadowBlur = f.r * 0.35;
    ctx.beginPath(); ctx.arc(0, 0, f.r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = "transparent"; ctx.strokeStyle = "#f3b6d3"; ctx.lineWidth = Math.max(2, f.r * 0.1); ctx.stroke();
    drawIcon(ctx, "paw", -f.r * 0.1, f.r * 0.05, f.r * 0.55);
    ctx.strokeStyle = "#e0559a"; ctx.lineWidth = Math.max(2, f.r * 0.1); ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(0, 0, f.r * 0.78, -0.4, 0.9); ctx.stroke();
    ctx.restore();
  }

  /* Close da patinha: almofadinha, 4 dedinhos e as unhas pintadas. */
  _bigPaw(ctx) {
    const p = this.bigPaw(), c = this.nubi.cosmetics, t = this._toes();
    const side = this.pawSide, m = side === "L" ? -1 : 1;
    const body = this.nubi.tint || this.nubi.baseBody || "#cdb8f0";
    const inner = (this.nubi.petDef && this.nubi.petDef.inner) || "#ffd0e3";
    const k = Ease.outBack(clamp(this.enterT), 1.6) * (1 + this.pawK.x * 0.02);
    const breathe = Motion.reduce ? 0 : Math.sin(this.t * 0.003) * 0.01;
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(m * k * (1 + breathe), k * (1 - breathe));
    softShadow(ctx, 0, p.r * 0.85, p.r * 0.95, p.r * 0.18, 0.2);
    const ow = Math.max(2, p.r * 0.035);
    const blob = (x, y, rx, ry, fill) => {
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.strokeStyle = darken(body, 0.45); ctx.lineWidth = ow * 2; ctx.stroke();
      ctx.fillStyle = fill; ctx.fill();
    };
    // braço vindo de baixo + palma
    ctx.fillStyle = body; roundRect(ctx, -p.r * 0.5, p.r * 0.3, p.r, p.r * 0.9, p.r * 0.3); ctx.fill();
    const g = ctx.createRadialGradient(-p.r * 0.3, -p.r * 0.2, p.r * 0.1, 0, 0, p.r * 1.1);
    g.addColorStop(0, lighten(body, 0.35)); g.addColorStop(1, body);
    blob(0, p.r * 0.12, p.r * 0.82, p.r * 0.66, g);
    // dedinhos
    TOES.forEach(([tx, ty], i) => blob(tx * p.r, ty * p.r, p.r * 0.27, p.r * 0.3, g));
    // almofadinhas
    ctx.fillStyle = inner;
    ctx.beginPath(); ctx.ellipse(0, p.r * 0.22, p.r * 0.42, p.r * 0.32, 0, 0, Math.PI * 2); ctx.fill();
    // unhas
    TOES.forEach(([tx, ty], i) => {
      const x = tx * p.r, y = ty * p.r - p.r * 0.16;
      const col = t[side][i];
      const fx = this.toeFx[side][i];
      ctx.save(); ctx.translate(x, y); ctx.rotate(tx * 0.35);
      const sc = 1 + fx * 0.25;
      ctx.scale(sc, sc);
      ctx.beginPath(); ctx.ellipse(0, 0, p.r * 0.14, p.r * 0.17, 0, 0, Math.PI * 2);
      ctx.fillStyle = col || "rgba(255,255,255,.85)"; ctx.fill();
      ctx.strokeStyle = col ? darken(col, 0.35) : "rgba(180,150,190,.8)"; ctx.lineWidth = ow; ctx.stroke();
      if (col) {
        ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.ellipse(-p.r * 0.05, -p.r * 0.06, p.r * 0.035, p.r * 0.07, -0.3, 0, Math.PI * 2); ctx.fill();
        if (c.nailArt && c.nailArt[side]) drawIcon(ctx, c.nailArt[side] === "heart" ? "heartLevel" : "star", 0, p.r * 0.03, p.r * 0.08);
      } else if (!Motion.reduce) {
        // unha ainda sem cor: pontinho que brilha convidando
        const a = 0.35 + 0.35 * Math.sin(this.t * 0.006 + i);
        ctx.fillStyle = `rgba(255,214,90,${a})`; ctx.beginPath(); ctx.arc(0, 0, p.r * 0.05, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    });
    ctx.restore();
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
    if (pop <= 0) return;
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
      case "nailart": return def.value === "heart" ? "heartLevel" : "star";
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
      case "nailart": return !!c.nailArt && (c.nailArt.L === def.value || c.nailArt.R === def.value);
      case "makeup": return !!c.makeup[def.value];
      case "paint": return !!c.paint[def.value];
      default: return false;
    }
  }

  _drawPageBtn(ctx) {
    const pages = this.stationPages();
    if (pages.length < 2) return;
    const b = this.pageBtnPos();
    const next = pages[(this.pageIdx + 1) % pages.length];
    const s = 1 + this.pageBtn.x * 0.03;
    ctx.save(); ctx.translate(b.x, b.y); ctx.scale(s, s);
    ctx.shadowColor = "rgba(110,40,80,.25)"; ctx.shadowBlur = b.r * 0.3; ctx.shadowOffsetY = b.r * 0.12;
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "#f3b6d3"; ctx.lineWidth = Math.max(2, b.r * 0.1); ctx.stroke();
    drawIcon(ctx, next.icon, -b.r * 0.12, -b.r * 0.08, b.r * 0.5);
    ctx.strokeStyle = "#e0559a"; ctx.lineWidth = Math.max(2.5, b.r * 0.13); ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(b.r * 0.42, b.r * 0.25); ctx.lineTo(b.r * 0.62, b.r * 0.45); ctx.lineTo(b.r * 0.82, b.r * 0.25); ctx.stroke();
    // bolinhas de página (onde estou)
    const n = pages.length, i0 = this.pageIdx % n;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i === i0 ? "#e0559a" : "rgba(224,85,154,.3)";
      ctx.beginPath(); ctx.arc((i - (n - 1) / 2) * b.r * 0.34, -b.r * 1.35, b.r * 0.1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  _paintBack(c, w, h, m) {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#fff0f7"); g.addColorStop(1, "#ffd6ea");
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = "rgba(255,255,255,.35)";
    for (let x = 0; x < w; x += m * 0.12) c.fillRect(x, 0, m * 0.05, h * 0.84);
    const cx = w * 0.48, cy = h * 0.42, rx = m * 0.42, ry = m * 0.47;
    c.save(); c.shadowColor = "rgba(150,60,110,.2)"; c.shadowBlur = m * 0.04;
    c.fillStyle = "#ffe08a"; c.beginPath(); c.ellipse(cx, cy, rx * 1.1, ry * 1.1, 0, 0, Math.PI * 2); c.fill(); c.restore();
    const mg = c.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
    mg.addColorStop(0, "#e8f6ff"); mg.addColorStop(1, "#c9e6f7");
    c.fillStyle = mg; c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "rgba(255,255,255,.55)";
    c.beginPath(); c.ellipse(cx - rx * 0.45, cy - ry * 0.4, rx * 0.1, ry * 0.35, 0.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#ffb3d4"; roundRect(c, w * 0.015, h * 0.16, w * 0.15, h * 0.7, m * 0.04); c.fill();
    c.fillStyle = "#fff4fa"; roundRect(c, w * 0.025, h * 0.19, w * 0.13, h * 0.64, m * 0.03); c.fill();
    const fg = c.createLinearGradient(0, h * 0.86, 0, h);
    fg.addColorStop(0, "#f7c9df"); fg.addColorStop(1, "#eab0cc");
    c.fillStyle = fg; c.fillRect(0, h * 0.86, w, h * 0.14);
    c.fillStyle = "rgba(255,255,255,.4)";
    for (let x = 0; x < w; x += m * 0.1) for (let y = h * 0.88; y < h; y += m * 0.05) { c.beginPath(); c.arc(x + ((y / (m * 0.05)) % 2) * m * 0.05, y, m * 0.005, 0, Math.PI * 2); c.fill(); }
  }
}
