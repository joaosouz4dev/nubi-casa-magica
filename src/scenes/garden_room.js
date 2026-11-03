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
import { art, drawArtAt } from "../core/art.js";
import { touchNubi } from "./nubi_touch.js";

const FRUITS = ["strawberry", "blueberry", "grapes", "orange"];
const GROW_STEPS = 3;        // broto -> folhas -> flor/fruta
// artes em feltro de cada estágio (as três têm o mesmo recorte e a base do
// caule fica embaixo, no meio); o estágio 3 é a flor com a fruta pendurada
const PLANT_ART = ["jardim/jardim_broto", "jardim/jardim_folhas", "jardim/jardim_flor", "jardim/jardim_flor"];
const POUR_MS = 900;         // regador em feltro despejando água no canteiro

export class GardenRoom {
  constructor({ vp, bus, nubi, save }) {
    this.vp = vp; this.bus = bus; this.nubi = nubi; this.save = save;
    this.t = 0; this.unsub = [];
    this.beds = FRUITS.map((f, i) => ({ fruit: f, stage: 0, ripe: false, pop: new Spring(0, { stiffness: 320, damping: 13 }) }));
    this.butterflies = [];
    this.bg = new CachedLayer(vp, (c, w, h, m) => {
      if (this._paintArt(c, w, h, m)) return;
      this._paintBack(c, w, h, m); atmosphere(c, w, h, m, { floorY: 0.72, light: { x: 0.15, y: 0.14, r: 1.1, color: "255,246,200" }, tint: "60,110,70", vignette: 0.14 });
    });
    this.pour = null;            // { i, t }: o regador indo regar o canteiro i (só desenho)
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
          this.pour = { i, t: POUR_MS };
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
    if (this.pour && (this.pour.t -= dt) <= 0) this.pour = null;
    for (const bf of this.butterflies) { if (bf.flee > 0) bf.flee -= dt; else bf.y = clamp(bf.y + (Math.random() - 0.5) * 0.0006 * dt, 0.12, 0.5); }
  }

  draw() {
    const ctx = this.vp.ctx, w = this.vp.w, h = this.vp.h, m = Math.min(w, h);
    this.bg.draw();
    this._wateringCan(ctx, m);
    // canteiros + plantas
    this.beds.forEach((b, i) => this._bed(ctx, b, i, m));
    this._pouring(ctx, m);
    this.nubi.draw();
    // borboletas por cima
    for (const bf of this.butterflies) { const p = this.butterflyPos(bf); const fl = Motion.reduce ? 1 : (Math.sin(this.t * 0.02 + bf.ph) * 0.3 + 1); ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, fl); drawIcon(ctx, "butterfly", 0, 0, m * 0.04); ctx.restore(); }
  }

  _bed(ctx, b, i, m) {
    const r = this.bedRect(i);
    const k = 1 - clamp(b.pop.x, -1, 1) * 0.06;
    ctx.save(); ctx.translate(r.x, r.y); ctx.scale(k, k); ctx.translate(-r.x, -r.y);
    if (this._bedArt(ctx, b, i, r, m)) { ctx.restore(); return; }
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

  /* Canteiro e planta em feltro. O canteiro (caixa de madeira) fica com o
     meio da terra em (r.x, r.y), onde o caule nasce; a planta cresce dali. */
  _bedArt(ctx, b, i, r, m) {
    const box = art("jardim/jardim_canteiro"), plant = art(PLANT_ART[b.stage] || PLANT_ART[0]);
    if (!box || !plant) return false;
    const bw = r.w * 1.3, bh = bw * (box.naturalHeight / box.naturalWidth);
    const by = r.y - bh * 0.17;                       // terra a ~17% do alto da caixa
    softShadow(ctx, r.x, by + bh * 0.97, bw * 0.55, m * 0.014, 0.22);
    ctx.drawImage(box, r.x - bw / 2, by, bw, bh);
    const ph = Math.min(r.h * 1.3, r.w * 1.32);       // altura do quadro da planta
    const sway = Motion.reduce ? 0 : Math.sin(this.t * 0.0016 + i * 1.7) * 0.03;
    ctx.save(); ctx.translate(r.x, r.y + bh * 0.02); ctx.rotate(sway);
    const pr = drawArtAt(ctx, PLANT_ART[b.stage] || PLANT_ART[0], 0, 0, null, ph);
    ctx.restore();
    if (b.stage >= GROW_STEPS && b.ripe && pr) {
      const bob = Motion.reduce ? 0 : Math.sin(this.t * 0.004 + i) * m * 0.006;
      const fx = r.x + pr.w * 0.36, fy = r.y - ph * 0.5;
      drawIcon(ctx, "food:" + b.fruit, fx, fy - bob, m * 0.06);
      // brilho de "pode colher"
      const p = Motion.reduce ? 0.6 : (Math.sin(this.t * 0.006) + 1) / 2;
      ctx.save(); ctx.globalAlpha = 0.4 + p * 0.3; drawIcon(ctx, "star", fx + m * 0.05, fy - m * 0.06, m * 0.025); ctx.restore();
    }
    return true;
  }

  /* Regador em feltro: descansa no gramado, à esquerda dos canteiros (fora
     das áreas de toque), e voa até o canteiro regado, inclinado, soltando
     gotinhas. É só enfeite: regar continua sendo tocar no canteiro. */
  _canSize(m) { const w = this.vp.w; return Math.min(w * 0.09, m * 0.2); }
  _wateringCan(ctx, m) {
    if (this.pour || !art("jardim/jardim_regador")) return;
    const vp = this.vp, cw = this._canSize(m);
    softShadow(ctx, vp.dx(0.065), vp.dy(0.93), cw * 0.45, m * 0.012, 0.2);
    drawArtAt(ctx, "jardim/jardim_regador", vp.dx(0.065), vp.dy(0.935), cw);
  }
  _pouring(ctx, m) {
    const P = this.pour, im = art("jardim/jardim_regador");
    if (!P || !im) return;
    const r = this.bedRect(P.i), u = 1 - P.t / POUR_MS;
    const cw = this._canSize(m) * 0.9, ch = cw * (im.naturalHeight / im.naturalWidth);
    const tilt = Motion.reduce ? 0.45 : 0.55 * Math.sin(Math.min(1, u * 1.4) * Math.PI * 0.5) * (u > 0.85 ? (1 - u) / 0.15 : 1);
    const x = r.x - r.w * 0.55, y = r.y - r.h * 1.05;
    ctx.save();
    ctx.globalAlpha = u < 0.12 ? u / 0.12 : u > 0.88 ? (1 - u) / 0.12 : 1;
    ctx.translate(x, y); ctx.rotate(tilt);
    ctx.drawImage(im, -cw / 2, -ch / 2, cw, ch);
    ctx.restore();
    // gotinhas saindo do bico (na ponta direita do regador)
    if (u > 0.2 && u < 0.85) {
      const sx = x + Math.cos(tilt) * cw * 0.46 - Math.sin(tilt) * -ch * 0.2;
      const sy = y + Math.sin(tilt) * cw * 0.46 + Math.cos(tilt) * -ch * 0.2;
      ctx.save(); ctx.fillStyle = "rgba(120,190,255,.85)";
      for (let k = 0; k < 5; k++) {
        const q = ((u * 4 + k / 5) % 1);
        ctx.beginPath(); ctx.ellipse(sx + (k - 2) * m * 0.006 + q * m * 0.01, sy + q * (r.y - sy), m * 0.005, m * 0.008, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }

  /* Cenário em feltro (céu com nuvens, cerca branca, gramado vazio). */
  _paintArt(c, w, h, m) {
    const im = art("jardim/fundo_jardim");
    if (!im) return false;
    const k = Math.max(w / im.naturalWidth, h / im.naturalHeight);
    const dw = im.naturalWidth * k, dh = im.naturalHeight * k;
    c.drawImage(im, (w - dw) / 2, (h - dh) * 0.75, dw, dh);
    return true;
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
