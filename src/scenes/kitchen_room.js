/* Cômodo COZINHA - alimentar. Encapsula o cenário, os 4 alimentos e a
   lógica de alimentação (arraste OU toque-e-destino). Assina os eventos de
   ponteiro só enquanto está ativo (enter/exit).
   Toda animação (voo até a boca, reaparecer no prato) roda dentro do loop
   principal; antes o voo usava um requestAnimationFrame paralelo. */
import { KitchenScene } from "./kitchen.js";
import { FoodItem } from "../entities/food_item.js";
import { FOODS, KITCHEN_FOOD_SLOTS, MOUTH_OFFSET } from "../data/foods.js";
import { touchNubi } from "./nubi_touch.js";

export class KitchenRoom {
  constructor({ vp, bus, nubi }) {
    this.vp = vp; this.bus = bus; this.nubi = nubi;
    this.scene = new KitchenScene(vp);
    this.items = KITCHEN_FOOD_SLOTS.map(s => new FoodItem(FOODS[s.food], vp, s.x, s.y));
    this.held = null; this.selected = null; this.busy = false;
    this.unsub = [];
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
    if (this.held) { this.held.goHome(); }
    this.held = null;
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
    const it = this.topItemAt(p.x, p.y);
    if (it) {
      this.held = it; it.dragging = true; it.returning = false;
      this.nubi.look({ x: it.pos.x / this.vp.w, y: it.pos.y / this.vp.h });
    }
  }
  onMove(p) {
    if (this.held) { this.held.pos.x = p.x; this.held.pos.y = p.y; this.nubi.look({ x: p.x / this.vp.w, y: p.y / this.vp.h }); }
  }
  onUp(e) {
    if (!this.held) return;
    const it = this.held; this.held = null; it.dragging = false;
    const p = e.point;
    if (p && e.moved && this.overMouth(p.x, p.y)) this.feed(it);
    else if (p && e.moved) { it.goHome(); this.nubi.stopLook(); }
  }
  onTap(p) {
    if (this.busy) return;
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
      this.bus.emit("act", "feed:" + item.def.id);
    });
  }

  // ---- direcionamento (usado pelo sistema de pedidos) ----
  hintTarget(act) {
    if (!act.startsWith("feed:")) return null;
    const it = this.items.find(i => i.def.id === act.slice(5));
    if (!it) return null;
    const m = this.mouthPoint();
    return { from: { x: it.pos.x, y: it.pos.y }, to: { x: m.x, y: m.y } };
  }
  nudge(act) {
    const it = this.items.find(i => "feed:" + i.def.id === act);
    if (it) it.lift.kick(9);
  }
  holdDest() {
    if (!this.held && !this.selected) return null;
    const m = this.mouthPoint();
    return { x: m.x, y: m.y, r: this.nubi.radius() * 0.55 };
  }
  hasSelection() { return !!this.selected; }

  update(dt) { this.scene.update(dt); this.items.forEach(i => i.update(dt)); }
  draw() {
    this.scene.draw();
    // itens no prato atrás; item pego/voando por cima do Nubi
    const front = this.items.filter(i => i.dragging || i.flight || i.returning || i.selected);
    this.items.filter(i => !front.includes(i)).forEach(i => i.draw());
    this.nubi.draw();
    front.forEach(i => i.draw());
  }
}
