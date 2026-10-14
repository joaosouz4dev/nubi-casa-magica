/* JARDIM (v1.1 Stage 2) - um cômodo ao ar livre, de cuidado calmo:
   - 4 canteiros com brotos; tocar com o regador faz a planta crescer em 3
     passos (broto -> folhas -> flor com fruta);
   - quando a fruta amadurece, tocar nela colhe (vai "para a cozinha": marca
     uma frutinha extra no prato) e dá estrelinhas;
   - borboletas passeiam e reagem ao toque (voam um pouquinho);
   - o bichinho fica no gramado e aceita carinho/cócegas (touchNubi).
   Design 3-5/4+: nada se perde; regar de novo uma planta já florida só
   solta um "plim" e algumas gotas. As plantas voltam a brotar depois de
   colhidas, então sempre há o que fazer. */
import { Spring, clamp, Motion, CachedLayer, roundRect, softShadow, lighten, darken } from "../core/anim.js";
import { drawIcon } from "../ui/icons.js";
import { atmosphere } from "../ui/scenery.js";
import { touchNubi } from "./nubi_touch.js";

const FRUITS = ["strawberry", "blueberry", "grapes", "orange"];
const GROW_STEPS = 3;        // broto -> folhas -> flor/fruta

export class GardenRoom {
  constructor({ vp, bus, nubi, save }) {
    this.vp = vp; this.bus = bus; this.nubi = nubi; this.save = save;
    this.t = 0; this.unsub = [];
    this.beds = FRUITS.map((f, i) => ({ fruit: f, stage: 0, ripe: false, pop: new Spring(0, { stiffness: 320, damping: 13 }) }));
    this.butterflies = [];
    this.bg = new CachedLayer(vp, (c, w, h, m) => { this._paintBack(c, w, h, m); atmosphere(c, w, h, m, { floorY: 0.72, light: { x: 0.15, y: 0.14, r: 1.1, color: "255,246,200" }, tint: "60,110,70", vignette: 0.14 }); });
  }

  // ---- interface do cômodo ----
  get held() { return false; }
  quiet() { return false; }
  canBack() { return false; }
  hintTarget(act) {
    // "garden:water" -> aponta um canteiro ainda não florido; "garden:harvest" -> fruta madura
    if (act === "garden:harvest") { const b = this.beds.find(b => b.ripe); if (b) { const r = this.bedRect(this.beds.indexOf(b)); return { from: { x: r.x, y: r.y - r.h * 0.5 }, to: null }; } }
    const b = this.beds.find(b => b.stage < GROW_STEPS); if (b) { const r = this.bedRect(this.beds.indexOf(b)); return { from: { x: r.x, y: r.y }, to: null }; }
    return null;
  }
  nudge(act) { const i = act === "garden:harvest" ? this.beds.findIndex(b => b.ripe) : this.beds.findIndex(b => b.stage < GROW_STEPS); if (i >= 0) this.beds[i].pop.kick(14); }
  holdDest() { return null; }
  hasSelection() { return false; }

  bedRect(i) {
    const vp = this.vp, w = vp.w, h = vp.h;
    const x = w * (0.2 + i * 0.17);
    return { x, y: h * 0.82, w: w * 0.12, h: h * 0.2 };
  }

  enter() {
    this.nubi.sizeK = 0.9;
    this.nubi.pos = { x: 0.82, y: 0.7 };
    this.nubi.arrive();
    // restaura o jardim salvo (quais plantas já cresceram), se houver
    const g = this.save.state.garden;
    if (g && Array.isArray(g.beds)) this.beds.forEach((b, i) => { if (g.beds[i]) { b.stage = g.beds[i].stage | 0; b.ripe = !!g.beds[i].ripe; } });
    this.butterflies = [0, 1, 2].map((i) => this._newButterfly(i));
    this.unsub = [
      this.bus.on("tap", (p) => this.onTap(p)),
    ];
    this.bus.emit("act", "garden:visit");
  }
  exit() { this.unsub.forEach(u => u()); this.unsub = []; this._persist(); }

  _persist() {
    this.save.state.garden = { beds: this.beds.map(b => ({ stage: b.stage, ripe: b.ripe })) };
    this.save.persist();
  }

  _newButterfly(i) {
    return { x: Math.random(), y: 0.2 + Math.random() * 0.35, ph: Math.random() * 6.28, sp: 0.6 + Math.random() * 0.5, hue: ["#ff8fb8", "#ffd54a", "#b49cff"][i % 3], flee: 0 };
  }

  onTap(p) {
    const vp = this.vp;
    // borboleta por perto? ela voa um pouquinho
    for (const bf of this.butterflies) {
      const bp = this.butterflyPos(bf);
      if (Math.hypot(p.x - bp.x, p.y - bp.y) < vp.s(0.06)) { bf.flee = 500; bf.y = clamp(bf.y - 0.08, 0.1, 0.5); this.bus.emit("audio:pop"); return; }
    }
    // canteiro?
    for (let i = 0; i < this.beds.length; i++) {
      const r = this.bedRect(i), b = this.beds[i];
      if (p.x >= r.x - r.w * 0.7 && p.x <= r.x + r.w * 0.7 && p.y >= r.y - r.h * 1.4 && p.y <= r.y + r.h * 0.3) {
        b.pop.kick(-16);
        if (b.ripe) {                       // COLHER
          b.ripe = false; b.stage = 0;
          this.bus.emit("audio:sparkle");
          this.bus.emit("fx:burst", { x: r.x, y: r.y - r.h, color: "#ff8fb8" });
          this.bus.emit("fx:hearts", { x: r.x, y: r.y - r.h });
          this.bus.emit("game:reward", { stars: 2, at: { x: r.x, y: r.y - r.h } });
          this.nubi.celebrate(); this.nubi.say(["Que delícia!", "Colhi!", "Pra cozinha!"][Math.floor(Math.random() * 3)]);
          // "vai para a cozinha": marca uma frutinha extra no prato
          try { const k = this.save.state; k.pantry = (k.pantry || 0) + 1; } catch (e) { void e; }
          this.bus.emit("act", "garden:harvest:" + b.fruit);
          this.bus.emit("act", "garden:harvest");
          this._persist();
        } else if (b.stage < GROW_STEPS) {  // REGAR / CRESCER
          b.stage++;
          this.bus.emit("audio:water");
          this.bus.emit("fx:burst", { x: r.x, y: r.y - r.h * 0.4, color: "#8fd3ff", small: true });
          if (b.stage >= GROW_STEPS) { b.ripe = true; this.bus.emit("audio:note", 4); this.bus.emit("fx:burst", { x: r.x, y: r.y - r.h, color: "#ffd54a" }); }
          this.bus.emit("act", "garden:water");
          this._persist();
        } else {                            // já florida, ainda não madura (não ocorre, mas seguro)
          this.bus.emit("audio:pop");
        }
        return;
      }
    }
    touchNubi(this, p);
  }

  butterflyPos(bf) {
    const vp = this.vp;
    const drift = Motion.reduce ? 0 : Math.sin(this.t * 0.001 * bf.sp + bf.ph) * 0.12;
    const bob = Motion.reduce ? 0 : Math.sin(this.t * 0.004 + bf.ph) * 0.03;
    return { x: vp.dx(clamp(bf.x + drift, 0.05, 0.95)), y: vp.dy(bf.y + bob) };
  }

  update(dt) {
    this.t += dt;
    for (const b of this.beds) b.pop.update(dt);
    for (const bf of this.butterflies) { if (bf.flee > 0) bf.flee -= dt; else bf.y = clamp(bf.y + (Math.random() - 0.5) * 0.0006 * dt, 0.12, 0.5); }
  }

  draw() {
    const ctx = this.vp.ctx, w = this.vp.w, h = this.vp.h, m = Math.min(w, h);
    this.bg.draw();
    // canteiros + plantas
    this.beds.forEach((b, i) => this._bed(ctx, b, i, m));
    this.nubi.draw();
    // borboletas por cima
    for (const bf of this.butterflies) { const p = this.butterflyPos(bf); const fl = Motion.reduce ? 1 : (Math.sin(this.t * 0.02 + bf.ph) * 0.3 + 1); ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, fl); drawIcon(ctx, "butterfly", 0, 0, m * 0.04); ctx.restore(); }
  }

  _bed(ctx, b, i, m) {
    const r = this.bedRect(i);
    const k = 1 - clamp(b.pop.x, -1, 1) * 0.06;
    ctx.save(); ctx.translate(r.x, r.y); ctx.scale(k, k); ctx.translate(-r.x, -r.y);
    // vaso de terra
    softShadow(ctx, r.x, r.y + r.h * 0.5, r.w * 0.9, m * 0.012, 0.2);
    ctx.fillStyle = "#9a6a3a"; roundRect(ctx, r.x - r.w * 0.6, r.y, r.w * 1.2, r.h * 0.6, m * 0.012); ctx.fill();
    ctx.fillStyle = "#7a4a24"; ctx.beginPath(); ctx.ellipse(r.x, r.y, r.w * 0.6, m * 0.012, 0, 0, Math.PI * 2); ctx.fill();
    // planta por estágio
    const stemTop = r.y - r.h * (0.3 + b.stage * 0.35);
    if (b.stage >= 1) { ctx.strokeStyle = "#3f9a56"; ctx.lineWidth = Math.max(2, m * 0.006); ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x, stemTop); ctx.stroke(); }
    if (b.stage === 0) { drawIcon(ctx, "sprout", r.x, r.y - r.h * 0.2, m * 0.05); }
    else if (b.stage === 1) { drawIcon(ctx, "sprout", r.x, r.y - r.h * 0.45, m * 0.06); }
    else if (b.stage === 2) { drawIcon(ctx, "flower", r.x, stemTop, m * 0.07); }
    else { // florida com fruta
      drawIcon(ctx, "flower", r.x - r.w * 0.3, stemTop + r.h * 0.1, m * 0.05);
      if (b.ripe) {
        const bob = Motion.reduce ? 0 : Math.sin(this.t * 0.004 + i) * m * 0.006;
        drawIcon(ctx, "food:" + b.fruit, r.x + r.w * 0.1, stemTop - bob, m * 0.06);
        // brilho de "pode colher"
        const p = Motion.reduce ? 0.6 : (Math.sin(this.t * 0.006) + 1) / 2;
        ctx.save(); ctx.globalAlpha = 0.4 + p * 0.3; drawIcon(ctx, "star", r.x + r.w * 0.4, stemTop - r.h * 0.2, m * 0.025); ctx.restore();
      }
    }
    ctx.restore();
  }

  _paintBack(c, w, h, m) {
    // céu de jardim
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#bfe9ff"); g.addColorStop(0.55, "#e4f7ff"); g.addColorStop(1, "#cdeeb0");
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    // sol
    const sx = w * 0.14, sy = h * 0.15;
    const sg = c.createRadialGradient(sx, sy, 0, sx, sy, m * 0.16);
    sg.addColorStop(0, "rgba(255,240,170,.95)"); sg.addColorStop(1, "rgba(255,230,130,0)");
    c.fillStyle = sg; c.beginPath(); c.arc(sx, sy, m * 0.16, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#ffe066"; c.beginPath(); c.arc(sx, sy, m * 0.05, 0, Math.PI * 2); c.fill();
    // cerca branca ao fundo
    const fy = h * 0.6;
    c.strokeStyle = "#ffffff"; c.lineWidth = m * 0.02;
    c.beginPath(); c.moveTo(0, fy + m * 0.02); c.lineTo(w, fy + m * 0.02); c.moveTo(0, fy + m * 0.07); c.lineTo(w, fy + m * 0.07); c.stroke();
    c.fillStyle = "#ffffff"; for (let x = w * 0.04; x < w; x += w * 0.1) { c.beginPath(); c.moveTo(x, fy - m * 0.04); c.lineTo(x + m * 0.02, fy - m * 0.06); c.lineTo(x + m * 0.04, fy - m * 0.04); c.lineTo(x + m * 0.04, fy + m * 0.1); c.lineTo(x, fy + m * 0.1); c.closePath(); c.fill(); }
    // gramado
    const lg = c.createLinearGradient(0, h * 0.62, 0, h);
    lg.addColorStop(0, "#8fd36f"); lg.addColorStop(1, "#5fa847");
    c.fillStyle = lg; c.fillRect(0, h * 0.62, w, h * 0.38);
    // tufos de grama
    c.strokeStyle = "rgba(60,120,50,.4)"; c.lineWidth = Math.max(1, m * 0.003);
    for (let i = 0; i < 40; i++) { const x = (i * 0.137 % 1) * w, y = h * (0.66 + (i * 0.07 % 1) * 0.3); c.beginPath(); c.moveTo(x, y); c.lineTo(x - m * 0.01, y - m * 0.03); c.moveTo(x, y); c.lineTo(x + m * 0.008, y - m * 0.035); c.stroke(); }
  }
}
