/* GUIA: direciona a atenção e celebra, sem texto obrigatório.
   - Balão de pensamento do Nubi com o desenho do que ele quer agora.
   - Destaque pulsante no objeto do pedido; ao segurar algo, o destino brilha.
   - Ajuda escalonada por inatividade (o modo dos responsáveis estica os tempos):
       olhar do Nubi -> objeto pula + "plim" -> mãozinha demonstra -> repete, espaçado.
   - Pedido em outro cômodo: o botão daquele cômodo pulsa e o balão mostra o cômodo.
   - Reforço positivo: nota que sobe a cada passo, elogio variado, brilho;
     fim de capítulo: dança, confete, adesivo voando até o álbum e enfeite novo
     no varal do quarto (meta de longo prazo visível, sem contagem).
   Nada aqui bloqueia a brincadeira nem pune a criança por ignorar um pedido. */
import { HINT_TIMING, MODE_PATIENCE, PRAISE, CHAPTER_PRAISE } from "../data/chapters.js";
import { drawIcon, drawSticker } from "./icons.js";
import { HandDemo } from "./hand_demo.js";
import { Ease, clamp, damp, Motion } from "../core/anim.js";

const NUBI_ACTS = { wake: "head", pet: "head", tummy: "belly" };

function pick(list, avoid) {
  let i;
  do { i = Math.floor(Math.random() * list.length); } while (list.length > 1 && list[i] === avoid);
  return list[i];
}

export class Guide {
  constructor({ vp, bus, nubi, scenes, quests, audio }) {
    this.vp = vp; this.bus = bus; this.nubi = nubi; this.scenes = scenes; this.quests = quests; this.audio = audio;
    this.wish = null;
    this.idle = 0;
    this.phase = 0;            // 0 nada, 1 olhou, 2 cutucou, 3 demonstrou
    this.nextDemoAt = 0;
    this.demo = null;
    this.demoLeft = 0;
    this.lookLeft = 0;
    this.bubbleK = 0;
    this.bubbleShow = 0;
    this.t = 0;
    this.praiseIn = 0;
    this.lastPraise = null;
    this.flights = [];         // adesivos voando até o álbum
    this.garlandPop = {};      // capítulo -> 0..1 (enfeite novo entra com pop)
    this._navWish = null;
    for (const c of quests.completed()) this.garlandPop[c.id] = 1;

    bus.on("pointer:down", () => this._activity());
    bus.on("room:changed", () => { this._activity(); this.bubbleK = 0; });
    bus.on("quest:changed", (w) => { this.wish = w; this._activity(); this.bubbleK = 0; });
    bus.on("quest:step", (e) => this._onStep(e));
    bus.on("quest:chapter", (e) => this._onChapter(e));
    this.wish = quests.current();
  }

  _activity() {
    this.idle = 0; this.phase = 0; this.nextDemoAt = 0;
    if (this.demo) this.demo.dismiss();
    if (this.lookLeft > 0) { this.nubi.stopLook(); this.lookLeft = 0; }
  }

  get patience() { return MODE_PATIENCE[this.quests.mode] || 1; }

  room() { return this.scenes.rooms.get(this.scenes.currentId); }
  inRoom(w) { return !!w && (!w.room || w.room === this.scenes.currentId); }

  /* Onde fica o alvo do pedido em pixels: { from, to }. */
  target(w) {
    if (!w) return null;
    const n = this.nubi, r = n.radius();
    const part = NUBI_ACTS[w.act];
    if (part === "head") return { from: { x: n.px(), y: n.py() - r * 0.5 }, to: null, nubi: true };
    if (part === "belly") return { from: { x: n.px(), y: n.py() + r * 0.45 }, to: null, nubi: true };
    const room = this.room();
    return room && room.hintTarget ? room.hintTarget(w.act) : null;
  }

  _design(p) { return { x: p.x / this.vp.w, y: p.y / this.vp.h }; }

  // ---------------- celebração ----------------
  _onStep(e) {
    this.audio.chime(e.free ? 2 : e.step + 1);   // a nota sobe a cada passo do capítulo
    const n = this.nubi, r = n.radius();
    const b = this.bubblePos();
    // o balão "estoura" em brilhos: o desejo foi realizado
    if (this.bubbleK > 0.3) this.bus.emit("fx:burst", { x: b.x, y: b.y, color: "#ffd54a", small: true });
    else this.bus.emit("fx:burst", { x: n.px(), y: n.py() - r * 1.1, color: "#ffd54a", small: true });
    this.bubbleK = 0;
    this.praiseIn = 950;     // deixa a fala da própria reação aparecer primeiro
  }

  _onChapter({ chapter, finale }) {
    this.praiseIn = 0;
    this.audio.fanfare();
    this.nubi.dance();
    this.nubi.say(finale ? "Que festa!" : pick(CHAPTER_PRAISE));
    this.bus.emit("fx:confetti", { amount: finale ? 2 : 1 });
    const n = this.nubi;
    const to = this._albumPoint();
    this.flights.push({ chapter, t: -500, from: { x: n.px(), y: n.py() - n.radius() * 1.4 }, to });
    this.garlandPop[chapter.id] = 0;
    if (finale) setTimeout(() => { this.audio.fanfare(); this.bus.emit("fx:confetti", { amount: 1.5 }); }, 1600);
  }

  _albumPoint() {
    const btn = document.getElementById("btnAlbum");
    const cv = this.vp.ctx.canvas.getBoundingClientRect();
    if (!btn) return { x: this.vp.w - 40, y: 40 };
    const b = btn.getBoundingClientRect();
    return { x: b.left + b.width / 2 - cv.left, y: b.top + b.height / 2 - cv.top };
  }

  // ---------------- loop ----------------
  update(dt) {
    this.t += dt;
    const w = this.wish;
    const room = this.room();
    const inRoom = this.inRoom(w);

    // botão do cômodo do pedido pulsa quando o pedido é em outro lugar
    const navWish = w && !inRoom ? w.room : null;
    if (navWish !== this._navWish) {
      this._navWish = navWish;
      document.querySelectorAll("[data-room]").forEach(b => b.classList.toggle("wish", b.getAttribute("data-room") === navWish));
    }

    // fala de elogio (depois da fala da reação)
    if (this.praiseIn > 0) {
      this.praiseIn -= dt;
      if (this.praiseIn <= 0) { this.lastPraise = pick(PRAISE, this.lastPraise); this.nubi.say(this.lastPraise); }
    }

    // criança agindo (segurando ou com objeto selecionado) = não está perdida
    const busy = room && ((room.hasSelection && room.hasSelection()) || room.held);
    if (busy) this._activity();
    else this.idle += dt;

    const k = this.patience;
    if (w) {
      if (inRoom) {
        const tg = this.target(w);
        if (tg) {
          if (this.phase < 1 && this.idle > HINT_TIMING.look * k && !this.nubi.sleeping) {
            this.phase = 1;
            if (!tg.nubi) { this.nubi.look(this._design(tg.from)); this.lookLeft = 1600; }
          }
          if (this.phase < 2 && this.idle > HINT_TIMING.nudge * k) {
            this.phase = 2;
            if (tg.nubi) { this.nubi.earL.kick(9); this.nubi.earR.kick(-9); }
            else if (room && room.nudge) room.nudge(w.act);
            this.audio.hint();
          }
          if (this.idle > HINT_TIMING.demo * k && this.idle >= this.nextDemoAt) {
            this.phase = 3;
            this.demo = new HandDemo(this.vp, this._design(tg.from), tg.to ? this._design(tg.to) : null);
            this.demo.t = 0;
            this.demoLeft = 2 * 2600;
            this.nextDemoAt = this.idle + this.demoLeft + HINT_TIMING.demoRepeat * k;
            if (room && room.nudge && !tg.nubi) room.nudge(w.act);
          }
        }
      } else if (this.phase < 2 && this.idle > HINT_TIMING.nudge * k) {
        this.phase = 2;
        this.audio.hint();
      }
    }

    if (this.lookLeft > 0) { this.lookLeft -= dt; if (this.lookLeft <= 0 && !busy) this.nubi.stopLook(); }
    if (this.demo) {
      this.demo.update(dt);
      if (this.demoLeft > 0) { this.demoLeft -= dt; if (this.demoLeft <= 0) this.demo.dismiss(); }
    }

    // balão de pensamento: some enquanto ele fala ou dorme
    const show = !!w && !this.nubi.sleeping && !(this.nubi.sayT > 0) && !this.scenes.transitioning;
    this.bubbleShow = show ? 1 : 0;
    this.bubbleK = clamp(this.bubbleK + (show ? dt / 420 : -dt / 160));

    for (const f of this.flights) f.t += dt;
    const arrived = this.flights.filter(f => f.t >= 900);
    if (arrived.length) {
      const btn = document.getElementById("btnAlbum");
      if (btn) { btn.classList.remove("bump"); void btn.offsetWidth; btn.classList.add("bump"); }
      this.audio.chime(4);
    }
    this.flights = this.flights.filter(f => f.t < 900);
    for (const id of Object.keys(this.garlandPop)) this.garlandPop[id] = Math.min(1, this.garlandPop[id] + dt / 700);
  }

  bubblePos() {
    const n = this.nubi, r = n.radius();
    const br = r * 0.56;
    const right = n.px() + r * 1.3;
    const limit = this.vp.w * 0.86 - br;
    const left = right > limit;
    let x = left ? n.px() - r * 1.3 : right;
    x = clamp(x, br + 8, limit);
    const hatUp = n.accessories && n.accessories.hat ? r * 0.35 : 0;
    const y = Math.max(br + 10, n.py() - n.hopY - r * 1.45 - hatUp);
    return { x, y, r: br, left };
  }

  // ---------------- desenho ----------------
  draw() {
    const ctx = this.vp.ctx;
    const w = this.wish;
    const room = this.room();
    const inRoom = this.inRoom(w);
    const k = this.patience;

    // destino brilha enquanto a criança segura um objeto
    const dest = room && room.holdDest ? room.holdDest() : null;
    if (dest) this._destGlow(ctx, dest);

    // destaque pulsante no alvo do pedido (aparece cedo e cresce com a espera)
    if (w && inRoom && !dest) {
      const tg = this.target(w);
      const start = 1200 * k;
      if (tg && this.idle > start) {
        const strength = clamp((this.idle - start) / (HINT_TIMING.nudge * k));
        this._targetGlow(ctx, tg, 0.35 + strength * 0.65);
      }
    }

    if (this.bubbleK > 0.01 && w) this._bubble(ctx, w, inRoom);
    if (this.demo) this.demo.draw();
    for (const f of this.flights) this._flight(ctx, f);
  }

  _targetGlow(ctx, tg, s) {
    const p = tg.from;
    const base = tg.nubi ? this.nubi.radius() * 0.55 : this.vp.s(0.075);
    const pulse = Motion.reduce ? 0.5 : (Math.sin(this.t * 0.006) + 1) / 2;
    ctx.save();
    const rr = base * (1.05 + pulse * 0.18);
    const g = ctx.createRadialGradient(p.x, p.y, rr * 0.55, p.x, p.y, rr * 1.35);
    g.addColorStop(0, `rgba(255,240,170,${0.0})`);
    g.addColorStop(0.55, `rgba(255,232,140,${0.32 * s})`);
    g.addColorStop(1, "rgba(255,232,140,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, rr * 1.35, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${0.55 * s})`; ctx.lineWidth = Math.max(2, base * 0.07);
    ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, Math.PI * 2); ctx.stroke();
    // brilhinhos girando em volta
    if (!Motion.reduce) {
      ctx.fillStyle = `rgba(255,214,90,${0.9 * s})`;
      for (let i = 0; i < 3; i++) {
        const a = this.t * 0.0025 + (i * Math.PI * 2) / 3;
        this._spark(ctx, p.x + Math.cos(a) * rr * 1.15, p.y + Math.sin(a) * rr * 1.15, base * 0.11);
      }
    }
    ctx.restore();
  }

  _destGlow(ctx, d) {
    const pulse = Motion.reduce ? 0.5 : (Math.sin(this.t * 0.008) + 1) / 2;
    ctx.save();
    ctx.globalAlpha = 0.55 + pulse * 0.3;
    ctx.strokeStyle = "#ffd54a"; ctx.lineWidth = Math.max(3, d.r * 0.06);
    ctx.setLineDash([d.r * 0.18, d.r * 0.12]);
    ctx.lineDashOffset = Motion.reduce ? 0 : -this.t * 0.03;
    ctx.beginPath(); ctx.arc(d.x, d.y, d.r * (1 + pulse * 0.05), 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  _spark(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      ctx.lineTo(x + Math.cos(a + Math.PI / 4) * r * 0.35, y + Math.sin(a + Math.PI / 4) * r * 0.35);
    }
    ctx.closePath(); ctx.fill();
  }

  _bubble(ctx, w, inRoom) {
    const n = this.nubi, r = n.radius();
    const b = this.bubblePos();
    const pop = Ease.outBack(this.bubbleK, 2.2);
    const bob = Motion.reduce ? 0 : Math.sin(this.t * 0.003) * r * 0.04;
    const x = b.x, y = b.y + bob, br = b.r * pop;
    if (br < 1) return;
    ctx.save();
    ctx.globalAlpha = clamp(this.bubbleK * 1.5);
    // bolinhas de pensamento saindo da cabeça
    const hx = n.px() + (b.left ? -r * 0.55 : r * 0.55), hy = n.py() - n.hopY - r * 0.95;
    for (const [u, s] of [[0.3, 0.09], [0.6, 0.14]]) {
      const tx = hx + (x - hx) * u, ty = hy + (y + br * 0.6 - hy) * u;
      ctx.beginPath(); ctx.arc(tx, ty, r * s * pop, 0, Math.PI * 2);
      ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = "#b9a6e0"; ctx.lineWidth = Math.max(1.5, r * 0.03); ctx.stroke();
    }
    // nuvem do pensamento
    ctx.shadowColor = "rgba(70,40,110,.18)"; ctx.shadowBlur = br * 0.3; ctx.shadowOffsetY = br * 0.08;
    ctx.beginPath();
    const lobes = 7;
    for (let i = 0; i < lobes; i++) {
      const a = (i / lobes) * Math.PI * 2;
      ctx.moveTo(x + Math.cos(a) * br * 0.78 + br * 0.36, y + Math.sin(a) * br * 0.7);
      ctx.arc(x + Math.cos(a) * br * 0.78, y + Math.sin(a) * br * 0.7, br * 0.36, 0, Math.PI * 2);
    }
    ctx.moveTo(x + br * 0.8, y); ctx.arc(x, y, br * 0.8, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff"; ctx.fill();
    ctx.shadowColor = "transparent";
    // desenho do desejo (respira de leve para chamar atenção)
    const breathe = Motion.reduce ? 1 : 1 + Math.sin(this.t * 0.005) * 0.05;
    drawIcon(ctx, w.icon, x, y, br * 0.6 * breathe);
    // pedido em outro cômodo: selo com o desenho do cômodo
    if (!inRoom && w.room) {
      const sx = x + br * 0.78, sy = y + br * 0.62, sr = br * 0.36;
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fillStyle = "#ffe680"; ctx.fill(); ctx.strokeStyle = "#e0a21c"; ctx.lineWidth = Math.max(1.5, sr * 0.1); ctx.stroke();
      drawIcon(ctx, "room:" + w.room, sx, sy, sr * 0.7);
    }
    // modo Resolver: a pequena sequência fica visível (próximos passos, apagadinhos)
    if (this.quests.mode === "solve" && w.chapter) {
      const list = this.quests.steps(w.chapter);
      const rest = list.slice(w.index + 1);
      ctx.globalAlpha *= 0.55;
      rest.forEach((s, i) => drawIcon(ctx, s.icon, x - br * 0.3 + i * br * 0.6, y + br * 1.25, br * 0.22));
    }
    ctx.restore();
  }

  _flight(ctx, f) {
    if (f.t < 0) {
      // aparece em cima do Nubi antes de voar
      const k = Ease.outBack(clamp((f.t + 500) / 350), 2.4);
      drawSticker(ctx, f.chapter.sticker, f.chapter.color, f.from.x, f.from.y, this.vp.s(0.07) * k);
      return;
    }
    const u = Ease.inOutCubic(clamp(f.t / 900));
    const cx = (f.from.x + f.to.x) / 2, cy = Math.min(f.from.y, f.to.y) - this.vp.s(0.25);
    const x = (1 - u) * (1 - u) * f.from.x + 2 * (1 - u) * u * cx + u * u * f.to.x;
    const y = (1 - u) * (1 - u) * f.from.y + 2 * (1 - u) * u * cy + u * u * f.to.y;
    const r = this.vp.s(0.07) * (1 - u * 0.55);
    ctx.save(); ctx.translate(x, y); ctx.rotate(Motion.reduce ? 0 : u * Math.PI * 2); ctx.translate(-x, -y);
    drawSticker(ctx, f.chapter.sticker, f.chapter.color, x, y, r);
    ctx.restore();
  }

  /* Varal do quarto: cada capítulo concluído pendura um adesivo. Sem ganchos
     vazios nem contagem: o varal só cresce. Depois da festa, luzinhas piscam. */
  drawGarland(ctx, w, h) {
    const done = this.quests.completed();
    const x0 = w * 0.17, x1 = w * 0.6, y0 = h * 0.05, sag = h * 0.07;
    const at = (u) => ({ x: x0 + (x1 - x0) * u, y: y0 + Math.sin(u * Math.PI) * sag });
    ctx.save();
    ctx.strokeStyle = "#a98bd6"; ctx.lineWidth = Math.max(2, this.vp.s(0.006));
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, y0 + sag * 2, x1, y0); ctx.stroke();
    // pinos nas pontas
    ctx.fillStyle = "#8a3bff";
    for (const x of [x0, x1]) { ctx.beginPath(); ctx.arc(x, y0, this.vp.s(0.008), 0, Math.PI * 2); ctx.fill(); }
    const party = this.quests.state.finaleDone;
    if (party) {
      const cols = ["#ff6b9d", "#ffd54a", "#5bc0eb", "#9be564"];
      for (let i = 1; i < 12; i++) {
        const p = at(i / 12);
        const on = Motion.reduce ? 1 : (Math.sin(this.t * 0.004 + i * 1.7) + 1) / 2;
        ctx.globalAlpha = 0.45 + on * 0.55;
        ctx.fillStyle = cols[i % cols.length];
        ctx.beginPath(); ctx.arc(p.x, p.y + this.vp.s(0.008), this.vp.s(0.007), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    const n = done.length;
    done.forEach((c, i) => {
      const u = (i + 1) / (Math.max(n, 3) + 1);
      const p = at(u);
      const k = Ease.outBack(clamp(this.garlandPop[c.id] === undefined ? 1 : this.garlandPop[c.id]), 2.6);
      const sway = Motion.reduce ? 0 : Math.sin(this.t * 0.0016 + i) * 0.08;
      const rr = this.vp.s(0.042) * k;
      if (rr < 1) return;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(sway);
      ctx.strokeStyle = "#a98bd6"; ctx.lineWidth = Math.max(1.5, this.vp.s(0.004));
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, rr * 0.9); ctx.stroke();
      drawSticker(ctx, c.sticker, c.color, 0, rr * 1.9, rr);
      ctx.restore();
    });
    ctx.restore();
  }
}
