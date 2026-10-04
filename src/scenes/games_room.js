/* BRINCADEIRAS - espaço dos minijogos, com 4 jogos curtos para brincar com o
   bichinho e ganhar estrelinhas:
     - catch   (Pega-frutas):   o bichinho corre para pegar frutas que caem;
     - bubbles (Estoura-bolhas): tocar nas bolhas que sobem;
     - memory  (Memória):        achar os pares de cartas;
     - music   (Música):         repetir a melodia que o bichinho toca.
   Regras de design (3-5 anos):
   - não existe perder: fruta que cai no chão e erro na memória/música não
     tiram nada; o jogo sempre termina em festa e sempre dá estrelinhas;
   - a "nova marca!" é pessoal (só compara com a própria criança, sem ranking);
   - partidas curtas (cerca de 30s) e sem texto obrigatório.
   Tela inicial do espaço: 4 cartões grandes. Dentro de um jogo, "voltar"
   sai para os cartões (e as estrelinhas já ganhas são entregues). */
import { Spring, clamp, Ease, Motion, CachedLayer, roundRect, softShadow, lighten, darken, damp } from "../core/anim.js";
import { drawIcon } from "../ui/icons.js";
import { FOODS } from "../data/foods.js";
import { paintFood } from "../entities/food_art.js";
import { touchNubi } from "./nubi_touch.js";

export const GAMES = [
  { id: "catch",   icon: "game:catch",   color: "#ff9a5b" },
  { id: "bubbles", icon: "game:bubbles", color: "#5bc0eb" },
  { id: "memory",  icon: "game:memory",  color: "#b49cff" },
  { id: "music",   icon: "game:music",   color: "#7fd88a" }
];
const CATCH_FOODS = ["apple", "banana", "strawberry", "pear", "orange", "grapes", "watermelon", "blueberry"].filter(id => FOODS[id]);
const MEMORY_ICONS = ["food:apple", "food:banana", "food:strawberry", "food:watermelon", "food:grapes", "food:orange"];
const BUBBLE_COLORS = ["#ff8fb8", "#8fd3ff", "#b49cff", "#9be564", "#ffb04a"];
const KEY_COLORS = ["#ff6b6b", "#ffb04a", "#ffd54a", "#62c370", "#5bc0eb"];
const PLAY_MS = 30000;
const INTRO_MS = 900;
const RESULT_MS = 3200;

/* Estrelinhas por partida: sempre um mínimo (não existe perder). */
export function starsFor(score) { return clamp(Math.ceil(score / 2), 3, 12); }

export class GamesRoom {
  constructor({ vp, bus, nubi, save }) {
    this.vp = vp; this.bus = bus; this.nubi = nubi; this.save = save;
    this.t = 0; this.unsub = [];
    this.game = null;            // partida em andamento
    this.result = null;          // festa do fim da partida
    this.press = GAMES.map(() => new Spring(0, { stiffness: 340, damping: 14 }));
    this.cardIn = 0;
    this.floaters = [];          // "+1" subindo
    this.bg = new CachedLayer(vp, (c, w, h, m) => this._paintBack(c, w, h, m));
  }

  // ---------------- interface do cômodo ----------------
  get held() { return !!(this.game || this.result); }    // jogando = criança ocupada (sem dicas)
  quiet() { return !!(this.game || this.result); }
  canBack() { return !!(this.game || this.result); }
  back() { return this.goBack(); }   // SceneManager: sai do jogo/festa antes de sair do cômodo
  hintTarget(act) {
    const i = GAMES.findIndex(g => "game:" + g.id === act);
    if (this.game || this.result || i < 0) return null;
    const r = this.cardRect(i);
    return { from: { x: r.x + r.w / 2, y: r.y + r.h / 2 }, to: null };
  }
  nudge(act) { const i = GAMES.findIndex(g => "game:" + g.id === act); if (i >= 0) this.press[i].kick(14); }
  holdDest() { return null; }
  hasSelection() { return false; }

  best(id) { const g = this.save.state.games; return (g && g.best && g.best[id]) || 0; }

  enter() {
    this.game = null; this.result = null; this.cardIn = 0;
    this._menuPose();
    this.unsub = [
      this.bus.on("tap", (p) => this.onTap(p)),
      this.bus.on("pointer:down", (p) => this.onDown(p)),
      this.bus.on("pointer:move", (p) => this.onMove(p)),
      this.bus.on("pointer:up", () => this.press.forEach(s => { s.target = 0; }))
    ];
  }
  exit() {
    if (this.game) this._finish({ quick: true });
    this.result = null;
    this.unsub.forEach(u => u()); this.unsub = [];
    this.nubi.stopLook();
  }

  _menuPose() {
    this.nubi.sizeK = 0.85;
    this.nubi.pos = { x: 0.15, y: 0.66 };
    this.nubi.arrive();
  }

  /* SceneManager.back(): primeiro sai do jogo / da festa. */
  goBack() {
    if (this.game) { this._finish({ quick: true }); this._menuPose(); this.bus.emit("room:sub", "games"); return true; }
    if (this.result) { this.result = null; this._menuPose(); return true; }
    return false;
  }

  // ---------------- cartões ----------------
  cardRect(i) {
    const vp = this.vp, col = i % 2, row = Math.floor(i / 2);
    const x0 = 0.31, y0 = 0.2, cw = 0.26, ch = 0.33, gx = 0.025, gy = 0.04;
    return { x: vp.dx(x0 + col * (cw + gx)), y: vp.dy(y0 + row * (ch + gy)), w: vp.w * cw, h: vp.h * ch };
  }
  cardAt(px, py) {
    return GAMES.findIndex((g, i) => { const r = this.cardRect(i); return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h; });
  }

  onDown(p) {
    if (this.game) { this._gameDown(p); return; }
    if (this.result) return;
    const i = this.cardAt(p.x, p.y);
    if (i >= 0) this.press[i].target = 1;
  }
  onMove(p) { if (this.game && this.game.id === "catch") this.game.targetX = clamp(p.x / this.vp.w, 0.1, 0.84); }

  onTap(p) {
    if (this.result) {
      if (this.result.t > 900) { this.result = null; this._menuPose(); }
      return;
    }
    if (this.game) { this._gameTap(p); return; }
    const i = this.cardAt(p.x, p.y);
    if (i >= 0) { this.press[i].kick(-16); this.bus.emit("audio:pop"); this.start(GAMES[i].id); return; }
    touchNubi(this, p);
  }

  // ---------------- partida ----------------
  start(id) {
    const mode = this.save.state.mode || "explore";
    const g = { id, t: -INTRO_MS, score: 0, spawn: 0, items: [], mode };
    if (id === "catch") {
      g.targetX = 0.47; g.every = mode === "solve" ? 650 : mode === "experiment" ? 760 : 900;
      this.nubi.sizeK = 0.62; this.nubi.pos = { x: 0.47, y: 0.8 };
    } else if (id === "bubbles") {
      g.every = mode === "solve" ? 420 : 520;
      this.nubi.sizeK = 0.6; this.nubi.pos = { x: 0.1, y: 0.8 };
    } else if (id === "memory") {
      const pairs = mode === "solve" ? 6 : mode === "experiment" ? 4 : 3;
      const icons = MEMORY_ICONS.slice(0, pairs);
      const deck = icons.concat(icons).map((icon, k) => ({ icon, k, open: false, matched: false, flip: new Spring(0, { stiffness: 260, damping: 20 }) }));
      for (let k = deck.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [deck[k], deck[j]] = [deck[j], deck[k]]; }
      g.cards = deck; g.pairs = pairs; g.misses = 0; g.lock = 0; g.first = null;
      g.cols = pairs === 3 ? 3 : 4;
      this.nubi.sizeK = 0.6; this.nubi.pos = { x: 0.1, y: 0.8 };
    } else if (id === "music") {
      g.maxLen = mode === "solve" ? 6 : mode === "experiment" ? 5 : 4;
      g.seq = [this._rnd5(), this._rnd5()];
      g.phase = "listen"; g.idx = 0; g.wait = 600; g.lit = -1; g.litT = 0; g.round = 0;
      g.keys = KEY_COLORS.map(() => new Spring(0, { stiffness: 380, damping: 16 }));
      this.nubi.sizeK = 0.62; this.nubi.pos = { x: 0.14, y: 0.62 };
    }
    this.game = g;
    this.nubi.arrive();
    this.nubi.say(["Vamos lá!", "Bora brincar!", "Já!"][Math.floor(Math.random() * 3)]);
    this.bus.emit("audio:sparkle");
    this.bus.emit("room:sub", "games");
  }
  _rnd5() { return Math.floor(Math.random() * KEY_COLORS.length); }

  _score(n, at, color) {
    const g = this.game; if (!g) return;
    g.score += n;
    this.floaters.push({ x: at.x, y: at.y, n, t: 0, color: color || "#ffb800" });
    this.bus.emit("fx:burst", { x: at.x, y: at.y, color: color || "#ffd54a", small: true });
  }

  /* Fim da partida: sempre festa e estrelinhas. quick = saiu pelo "voltar". */
  _finish({ quick = false } = {}) {
    const g = this.game; if (!g) return;
    this.game = null;
    const best = this.best(g.id);
    const played = g.t > 1500 || g.score > 0;
    if (!played) return;                       // saiu antes de começar: nada a entregar
    const stars = starsFor(g.score);
    const newBest = g.score > best;
    const st = this.save.state.games = this.save.state.games || { best: {}, plays: {} };
    st.best = st.best || {}; st.plays = st.plays || {};
    if (newBest) st.best[g.id] = g.score;
    st.plays[g.id] = (st.plays[g.id] || 0) + 1;
    this.save.persist();
    this.bus.emit("game:reward", { id: g.id, score: g.score, stars, newBest, at: { x: this.vp.w / 2, y: this.vp.h * 0.45 } });
    this.bus.emit("effect:discoveryOnly", { id: "jogo_" + g.id });
    this.bus.emit("act", "game:" + g.id);
    this.bus.emit("act", "game:any");
    if (quick) return;
    this.result = { id: g.id, score: g.score, stars, newBest, t: 0 };
    this.nubi.sizeK = 0.85; this.nubi.pos = { x: 0.2, y: 0.66 };
    this.nubi.dance();
    this.nubi.say(newBest ? "Nova marca!" : ["Muito bem!", "Que demais!", "Arrasou!"][Math.floor(Math.random() * 3)]);
    this.bus.emit("fx:confetti", { amount: newBest ? 1.2 : 0.7 });
    this.bus.emit("audio:tada");
  }

  _gameDown(p) {
    const g = this.game;
    if (g.id === "catch") g.targetX = clamp(p.x / this.vp.w, 0.1, 0.84);
  }

  _gameTap(p) {
    const g = this.game;
    if (g.t < 0) return;
    if (g.id === "catch") { g.targetX = clamp(p.x / this.vp.w, 0.1, 0.84); return; }   // toque simples também leva o bichinho
    if (g.id === "bubbles") {
      for (let i = g.items.length - 1; i >= 0; i--) {
        const b = g.items[i];
        const dx = p.x - this.vp.dx(b.x), dy = p.y - this.vp.dy(b.y), rr = this.vp.s(b.r) * 1.25;
        if (dx * dx + dy * dy <= rr * rr) {
          g.items.splice(i, 1);
          this._score(b.gold ? 3 : 1, { x: this.vp.dx(b.x), y: this.vp.dy(b.y) }, b.gold ? "#ffd54a" : b.color);
          this.bus.emit(b.gold ? "audio:sparkle" : "audio:pop");
          this.nubi.look({ x: b.x, y: b.y }); this.nubi.sq.kick(0.6);
          return;
        }
      }
      return;
    }
    if (g.id === "memory") { const i = this.memoryCardAt(p.x, p.y); if (i >= 0) this.flipCard(i); return; }
    if (g.id === "music") { const i = this.keyAt(p.x, p.y); if (i >= 0) this.pressKey(i); }
  }

  // ---------- memória ----------
  memoryRect(i) {
    const g = this.game, vp = this.vp;
    const rows = Math.ceil(g.cards.length / g.cols);
    const x0 = 0.24, x1 = 0.86, y0 = 0.22, y1 = 0.9;
    const gap = 0.018;
    const cw = (x1 - x0 - gap * (g.cols - 1)) / g.cols, ch = (y1 - y0 - gap * (rows - 1)) / rows;
    // cartas quase quadradas
    const side = Math.min(vp.w * cw, vp.h * ch);
    const col = i % g.cols, row = Math.floor(i / g.cols);
    const totalW = side * g.cols + vp.w * gap * (g.cols - 1), totalH = side * rows + vp.w * gap * (rows - 1);
    const ox = vp.dx((x0 + x1) / 2) - totalW / 2, oy = vp.dy((y0 + y1) / 2) - totalH / 2;
    return { x: ox + col * (side + vp.w * gap), y: oy + row * (side + vp.w * gap), w: side, h: side };
  }
  memoryCardAt(px, py) {
    const g = this.game;
    return g.cards.findIndex((c, i) => { const r = this.memoryRect(i); return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h; });
  }
  flipCard(i) {
    const g = this.game;
    if (!g || g.id !== "memory" || g.lock > 0) return false;
    const c = g.cards[i];
    if (!c || c.open || c.matched) return false;
    c.open = true; c.flip.target = 1;
    this.bus.emit("audio:click");
    if (g.first === null) { g.first = i; return true; }
    const a = g.cards[g.first];
    g.first = null;
    if (a.icon === c.icon) {
      a.matched = c.matched = true;
      const r = this.memoryRect(i);
      this._score(3, { x: r.x + r.w / 2, y: r.y + r.h / 2 }, "#b49cff");
      this.bus.emit("audio:sparkle");
      this.nubi.celebrate();
      if (g.cards.every(k => k.matched)) {
        g.score += Math.max(0, g.pairs - g.misses);          // bônus por poucas tentativas
        g.endIn = 900;
      }
    } else {
      g.misses++;
      g.lock = 900;
      g.closeA = a; g.closeB = c;
      this.nubi.say(["Quase!", "Hmm...", "Tenta outra!"][g.misses % 3]);
    }
    return true;
  }

  // ---------- música ----------
  keyRect(i) {
    const vp = this.vp, n = KEY_COLORS.length;
    const x0 = 0.3, x1 = 0.86, w = (x1 - x0) / n;
    const arc = Math.sin((i + 0.5) / n * Math.PI) * 0.05;
    return { x: vp.dx(x0 + i * w + w * 0.08), y: vp.dy(0.56 - arc), w: vp.w * w * 0.84, h: vp.h * 0.3 };
  }
  keyAt(px, py) {
    return KEY_COLORS.findIndex((c, i) => { const r = this.keyRect(i); return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h; });
  }
  _light(i) {
    const g = this.game;
    g.lit = i; g.litT = 380;
    g.keys[i].kick(-14);
    this.bus.emit("audio:note", i);
    const r = this.keyRect(i);
    this.bus.emit("fx:burst", { x: r.x + r.w / 2, y: r.y + r.h * 0.3, color: KEY_COLORS[i], small: true });
  }
  pressKey(i) {
    const g = this.game;
    if (!g || g.id !== "music") return false;
    this._light(i);
    if (g.phase !== "play") return true;      // fora da vez: só toca a nota (brincar livre)
    if (i === g.seq[g.idx]) {
      g.idx++;
      if (g.idx >= g.seq.length) {
        g.round++;
        const r = this.keyRect(i);
        this._score(g.seq.length, { x: r.x + r.w / 2, y: r.y }, "#62c370");
        this.nubi.celebrate();
        if (g.seq.length >= g.maxLen) { g.phase = "done"; g.endIn = 900; }
        else { g.seq.push(this._rnd5()); g.phase = "listen"; g.idx = 0; g.wait = 1100; }
      }
    } else {
      // errou a nota: sem castigo, o bichinho toca de novo a mesma melodia
      this.nubi.say(["De novo!", "Escuta só!", "Outra vez!"][g.round % 3]);
      g.phase = "listen"; g.idx = 0; g.wait = 1000;
    }
    return true;
  }

  // ---------------- loop ----------------
  update(dt) {
    this.t += dt;
    this.cardIn = Math.min(1, this.cardIn + dt / 450);
    for (const s of this.press) s.update(dt);
    this.floaters = this.floaters.filter(f => (f.t += dt) < 900);
    if (this.result) { this.result.t += dt; if (this.result.t > RESULT_MS) { this.result = null; this._menuPose(); } }
    const g = this.game;
    if (!g) return;
    g.t += dt;
    if (g.t < 0) return;
    const speed = Motion.reduce ? 0.75 : 1;

    if (g.id === "catch") {
      const n = this.nubi;
      n.pos.x = damp(n.pos.x, g.targetX, 9, dt);
      g.spawn -= dt;
      if (g.t < PLAY_MS - 1200 && g.spawn <= 0) {
        g.spawn = g.every * (0.8 + Math.random() * 0.4);
        const gold = Math.random() < 0.1;
        const fid = CATCH_FOODS[Math.floor(Math.random() * CATCH_FOODS.length)];
        g.items.push({ x: 0.12 + Math.random() * 0.7, y: -0.06, vy: (0.17 + Math.min(0.12, g.t / 200000)) * speed, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 3, food: fid, gold });
      }
      const mx = n.px(), my = n.py() - n.radius() * 0.2, rr = n.radius() * 1.05;
      for (let i = g.items.length - 1; i >= 0; i--) {
        const f = g.items[i];
        f.y += f.vy * dt / 1000; f.rot += f.vr * dt / 1000;
        const px = this.vp.dx(f.x), py = this.vp.dy(f.y);
        const dx = px - mx, dy = py - my;
        if (!f.landed && dx * dx + dy * dy < rr * rr) {
          g.items.splice(i, 1);
          this._score(f.gold ? 3 : 1, { x: px, y: py }, f.gold ? "#ffd54a" : (FOODS[f.food].color));
          this.bus.emit("audio:coin", g.score);
          n.sq.kick(1.1);
          if (g.score % 5 === 0) n.say(["Nhac!", "Hmm!", "Peguei!"][Math.floor(Math.random() * 3)]);
          continue;
        }
        // caiu no chão: só some devagar, sem castigo
        if (f.y > 0.93) { f.landed = true; f.y = 0.93; f.vy = 0; f.vr = 0; f.fade = (f.fade || 0) + dt; if (f.fade > 500) g.items.splice(i, 1); }
      }
      if (g.t >= PLAY_MS && !g.items.some(f => !f.landed)) this._finish();
    } else if (g.id === "bubbles") {
      g.spawn -= dt;
      if (g.t < PLAY_MS - 800 && g.spawn <= 0) {
        g.spawn = g.every * (0.7 + Math.random() * 0.6);
        const gold = Math.random() < 0.1;
        g.items.push({ x: 0.22 + Math.random() * 0.62, y: 1.08, r: 0.05 + Math.random() * 0.035, vy: (0.12 + Math.random() * 0.08) * speed, ph: Math.random() * 6, gold, color: BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)] });
      }
      for (const b of g.items) { b.y -= b.vy * dt / 1000; b.ph += dt / 600; }
      g.items = g.items.filter(b => b.y > -0.15);
      if (g.t >= PLAY_MS) this._finish();
    } else if (g.id === "memory") {
      for (const c of g.cards) { if (!c.open && !c.matched) c.flip.target = 0; c.flip.update(dt); }
      if (g.lock > 0) {
        g.lock -= dt;
        if (g.lock <= 0) { g.closeA.open = false; g.closeB.open = false; g.closeA = g.closeB = null; }
      }
      if (g.endIn !== undefined) { g.endIn -= dt; if (g.endIn <= 0) this._finish(); }
    } else if (g.id === "music") {
      for (const k of g.keys) k.update(dt);
      if (g.litT > 0) { g.litT -= dt; if (g.litT <= 0) g.lit = -1; }
      if (g.phase === "listen") {
        g.wait -= dt;
        if (g.wait <= 0) {
          if (g.idx < g.seq.length) { this._light(g.seq[g.idx]); this.nubi.sq.kick(0.7); g.idx++; g.wait = Motion.reduce ? 760 : 620; }
          else { g.phase = "play"; g.idx = 0; }
        }
      }
      if (g.endIn !== undefined) { g.endIn -= dt; if (g.endIn <= 0) this._finish(); }
    }
  }

  // ---------------- desenho ----------------
  draw() {
    const ctx = this.vp.ctx, vp = this.vp, w = vp.w, h = vp.h, m = Math.min(w, h);
    this.bg.draw();
    this._bunting(ctx, w, h, m);
    const g = this.game;
    if (!g && !this.result) { GAMES.forEach((G, i) => this._card(ctx, G, i, m)); this.nubi.draw(); return; }
    if (this.result && !g) { this.nubi.draw(); this._result(ctx, w, h, m); this._floaters(ctx, m); return; }

    if (g.id === "catch") {
      for (const f of g.items) this._fruit(ctx, f, m);
      this.nubi.draw();
    } else if (g.id === "bubbles") {
      this.nubi.draw();
      for (const b of g.items) this._bubble(ctx, b, m);
    } else if (g.id === "memory") {
      this.nubi.draw();
      g.cards.forEach((c, i) => this._memCard(ctx, c, i, m));
    } else if (g.id === "music") {
      this.nubi.draw();
      g.keys.forEach((k, i) => this._key(ctx, i, m));
      this._seqDots(ctx, w, h, m);
    }
    this._hud(ctx, g, w, h, m);
    this._floaters(ctx, m);
    if (g.t < 0) this._intro(ctx, w, h, m, g);
  }

  _card(ctx, G, i, m) {
    const r = this.cardRect(i);
    const appear = Motion.reduce ? 1 : Ease.outBack(clamp(this.cardIn * 1.6 - i * 0.18), 1.8);
    const k = this.press[i].x;
    const s = appear * (1 - clamp(k, -1, 1) * 0.05);
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const bob = Motion.reduce ? 0 : Math.sin(this.t * 0.003 + i * 1.3) * m * 0.006;
    ctx.save(); ctx.translate(cx, cy + bob); ctx.scale(s, s); ctx.translate(-cx, -cy);
    ctx.shadowColor = "rgba(70,40,110,.25)"; ctx.shadowBlur = m * 0.03; ctx.shadowOffsetY = m * 0.012;
    const gr = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    gr.addColorStop(0, lighten(G.color, 0.55)); gr.addColorStop(1, lighten(G.color, 0.15));
    ctx.fillStyle = gr; roundRect(ctx, r.x, r.y, r.w, r.h, m * 0.035); ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = darken(G.color, 0.25); ctx.lineWidth = Math.max(2, m * 0.008);
    roundRect(ctx, r.x, r.y, r.w, r.h, m * 0.035); ctx.stroke();
    // brilho no topo
    ctx.fillStyle = "rgba(255,255,255,.35)"; roundRect(ctx, r.x + r.w * 0.06, r.y + r.h * 0.05, r.w * 0.88, r.h * 0.16, m * 0.02); ctx.fill();
    drawIcon(ctx, G.icon, cx, r.y + r.h * 0.48, Math.min(r.w, r.h) * 0.3);
    // marca pessoal
    const best = this.best(G.id);
    if (best > 0) {
      const bx = cx, by = r.y + r.h * 0.86;
      ctx.fillStyle = "rgba(255,255,255,.85)"; roundRect(ctx, bx - m * 0.055, by - m * 0.024, m * 0.11, m * 0.048, m * 0.024); ctx.fill();
      drawIcon(ctx, "trophy", bx - m * 0.03, by, m * 0.018);
      ctx.fillStyle = "#6b4a14"; ctx.font = `bold ${Math.round(m * 0.032)}px system-ui, sans-serif`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(String(best), bx - m * 0.008, by + m * 0.002);
    }
    ctx.restore();
  }

  _fruit(ctx, f, m) {
    const x = this.vp.dx(f.x), y = this.vp.dy(f.y), r = m * 0.045;
    ctx.save();
    if (f.landed) ctx.globalAlpha = 1 - clamp((f.fade || 0) / 500);
    softShadow(ctx, x, this.vp.dy(0.95), r * 0.8 * clamp(f.y + 0.2), r * 0.2, 0.15);
    ctx.translate(x, y); ctx.rotate(Math.sin(f.rot) * 0.4);
    if (f.gold) {
      ctx.shadowColor = "rgba(255,200,40,.9)"; ctx.shadowBlur = m * 0.03;
      drawIcon(ctx, "star", 0, 0, r * 1.1);
    } else paintFood(ctx, FOODS[f.food], r);
    ctx.restore();
  }

  _bubble(ctx, b, m) {
    const wob = Motion.reduce ? 0 : Math.sin(b.ph) * 0.015;
    const x = this.vp.dx(b.x + wob), y = this.vp.dy(b.y), r = this.vp.s(b.r);
    const sx = 1 + (Motion.reduce ? 0 : Math.sin(b.ph * 1.7) * 0.05), sy = 2 - sx;
    ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy);
    const c = b.gold ? "#ffd54a" : b.color;
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
    g.addColorStop(0, "rgba(255,255,255,.85)"); g.addColorStop(0.55, hexA(c, 0.35)); g.addColorStop(1, hexA(c, 0.7));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = hexA(darken(c, 0.2), 0.8); ctx.lineWidth = Math.max(1.5, r * 0.06); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.beginPath(); ctx.ellipse(-r * 0.38, -r * 0.42, r * 0.2, r * 0.11, -0.7, 0, Math.PI * 2); ctx.fill();
    if (b.gold) drawIcon(ctx, "star", 0, 0, r * 0.5);
    ctx.restore();
    void m;
  }

  _memCard(ctx, c, i, m) {
    const r = this.memoryRect(i), k = clamp(c.flip.x, 0, 1);
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const face = k > 0.5;
    const sx = Math.max(0.04, Math.abs(Math.cos(k * Math.PI)));
    const lift = c.matched ? (Motion.reduce ? 0 : Math.sin(this.t * 0.004 + i) * m * 0.004) : 0;
    ctx.save(); ctx.translate(cx, cy + lift); ctx.scale(sx, 1);
    ctx.shadowColor = "rgba(70,40,110,.22)"; ctx.shadowBlur = m * 0.02; ctx.shadowOffsetY = m * 0.008;
    if (face) {
      ctx.fillStyle = c.matched ? "#fff7d6" : "#ffffff";
      roundRect(ctx, -r.w / 2, -r.h / 2, r.w, r.h, m * 0.025); ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.strokeStyle = c.matched ? "#e0a21c" : "#b49cff"; ctx.lineWidth = Math.max(2, m * (c.matched ? 0.009 : 0.006));
      roundRect(ctx, -r.w / 2, -r.h / 2, r.w, r.h, m * 0.025); ctx.stroke();
      drawIcon(ctx, c.icon, 0, 0, r.w * 0.3);
    } else {
      const g = ctx.createLinearGradient(0, -r.h / 2, 0, r.h / 2);
      g.addColorStop(0, "#c9b5ff"); g.addColorStop(1, "#9a7ff0");
      ctx.fillStyle = g; roundRect(ctx, -r.w / 2, -r.h / 2, r.w, r.h, m * 0.025); ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.strokeStyle = "#6e4aa3"; ctx.lineWidth = Math.max(2, m * 0.006); roundRect(ctx, -r.w / 2, -r.h / 2, r.w, r.h, m * 0.025); ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,.4)"; ctx.lineWidth = Math.max(1.5, m * 0.004);
      roundRect(ctx, -r.w * 0.38, -r.h * 0.38, r.w * 0.76, r.h * 0.76, m * 0.018); ctx.stroke();
      drawIcon(ctx, "star", 0, 0, r.w * 0.16);
    }
    ctx.restore();
  }

  _key(ctx, i, m) {
    const g = this.game, r = this.keyRect(i), c = KEY_COLORS[i];
    const lit = g.lit === i;
    const k = g.keys[i].x;
    const cx = r.x + r.w / 2;
    ctx.save(); ctx.translate(cx, r.y + r.h); ctx.scale(1 - k * 0.01, 1 + k * 0.01); ctx.translate(-cx, -(r.y + r.h));
    if (lit) { ctx.shadowColor = hexA(c, 0.9); ctx.shadowBlur = m * 0.05; }
    else { ctx.shadowColor = "rgba(70,40,110,.22)"; ctx.shadowBlur = m * 0.02; ctx.shadowOffsetY = m * 0.01; }
    // sininho: corpo arredondado em cima, boca larga embaixo
    const top = r.y + r.h * 0.12, bot = r.y + r.h * 0.82;
    ctx.beginPath();
    ctx.moveTo(r.x + r.w * 0.06, bot);
    ctx.quadraticCurveTo(r.x + r.w * 0.16, bot - r.h * 0.12, r.x + r.w * 0.18, r.y + r.h * 0.4);
    ctx.quadraticCurveTo(r.x + r.w * 0.2, top, cx, top);
    ctx.quadraticCurveTo(r.x + r.w * 0.8, top, r.x + r.w * 0.82, r.y + r.h * 0.4);
    ctx.quadraticCurveTo(r.x + r.w * 0.84, bot - r.h * 0.12, r.x + r.w * 0.94, bot);
    ctx.closePath();
    const gr = ctx.createLinearGradient(r.x, 0, r.x + r.w, 0);
    gr.addColorStop(0, lighten(c, lit ? 0.6 : 0.3)); gr.addColorStop(0.45, lit ? lighten(c, 0.35) : c); gr.addColorStop(1, darken(c, 0.15));
    ctx.fillStyle = gr; ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = darken(c, 0.4); ctx.lineWidth = Math.max(2, m * 0.007); ctx.stroke();
    // badalo
    ctx.fillStyle = darken(c, 0.35); ctx.beginPath(); ctx.arc(cx, bot + r.h * 0.07, r.w * 0.11, 0, Math.PI * 2); ctx.fill();
    // alça
    ctx.strokeStyle = darken(c, 0.4); ctx.beginPath(); ctx.arc(cx, top - r.h * 0.03, r.w * 0.09, Math.PI, 0); ctx.stroke();
    // brilho
    ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.beginPath(); ctx.ellipse(r.x + r.w * 0.36, r.y + r.h * 0.38, r.w * 0.07, r.h * 0.13, 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  _seqDots(ctx, w, h, m) {
    const g = this.game;
    const n = g.seq.length, gap = m * 0.05, y = h * 0.42, x0 = w * 0.58 - (n - 1) * gap / 2;
    for (let i = 0; i < n; i++) {
      const done = g.phase === "play" ? i < g.idx : g.phase === "done";
      ctx.fillStyle = done ? KEY_COLORS[g.seq[i]] : "rgba(255,255,255,.75)";
      ctx.strokeStyle = "#8a7fa0"; ctx.lineWidth = Math.max(1.5, m * 0.004);
      ctx.beginPath(); ctx.arc(x0 + i * gap, y, m * 0.016, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    // vez de quem: orelhinha (ouvir) ou mãozinha (tocar)
    drawIcon(ctx, g.phase === "listen" ? "note" : "paw", w * 0.58 + (n + 1) * gap / 2 + m * 0.02, y, m * 0.026);
  }

  _hud(ctx, g, w, h, m) {
    // placar da partida (estrela + número), canto esquerdo abaixo dos botões
    const x = w * 0.04, y = h * 0.2;
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,.88)"; roundRect(ctx, x, y - m * 0.04, m * 0.2, m * 0.08, m * 0.04); ctx.fill();
    ctx.strokeStyle = "#e6c86a"; ctx.lineWidth = Math.max(2, m * 0.005); roundRect(ctx, x, y - m * 0.04, m * 0.2, m * 0.08, m * 0.04); ctx.stroke();
    drawIcon(ctx, "star", x + m * 0.045, y, m * 0.028);
    ctx.fillStyle = "#6b4a14"; ctx.font = `bold ${Math.round(m * 0.05)}px system-ui, sans-serif`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(String(g.score), x + m * 0.085, y + m * 0.004);
    ctx.restore();
    // tempo: um solzinho que anda numa trilha (sem número, sem "acabou o tempo")
    if (g.id === "catch" || g.id === "bubbles") {
      const k = clamp(g.t / PLAY_MS), x0 = w * 0.3, x1 = w * 0.8, yy = h * 0.135;
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.lineWidth = m * 0.022; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x1, yy); ctx.stroke();
      ctx.strokeStyle = "#ffcf4a"; ctx.lineWidth = m * 0.014;
      ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 + (x1 - x0) * k, yy); ctx.stroke();
      drawIcon(ctx, "sun", x0 + (x1 - x0) * k, yy, m * 0.028);
      drawIcon(ctx, "trophy", x1 + m * 0.03, yy, m * 0.022);
      ctx.restore();
    }
  }

  _floaters(ctx, m) {
    ctx.save(); ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const f of this.floaters) {
      const k = f.t / 900;
      ctx.globalAlpha = 1 - Ease.inQuad(k);
      ctx.font = `bold ${Math.round(m * (0.045 + Ease.outBack(Math.min(1, k * 3)) * 0.01))}px system-ui, sans-serif`;
      ctx.lineWidth = Math.max(3, m * 0.008); ctx.strokeStyle = "#ffffff"; ctx.fillStyle = darken(f.color, 0.25);
      const y = f.y - Ease.outCubic(k) * m * 0.1;
      ctx.strokeText("+" + f.n, f.x, y); ctx.fillText("+" + f.n, f.x, y);
    }
    ctx.restore();
  }

  _intro(ctx, w, h, m, g) {
    const k = clamp((g.t + INTRO_MS) / INTRO_MS);
    const s = Motion.reduce ? 1 : Ease.outBack(clamp(k * 2), 2.4);
    ctx.save();
    ctx.globalAlpha = 1 - clamp((k - 0.75) * 4);
    ctx.translate(w * 0.55, h * 0.45); ctx.scale(s, s);
    const G = GAMES.find(x => x.id === g.id);
    ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.beginPath(); ctx.arc(0, 0, m * 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = G.color; ctx.lineWidth = m * 0.012; ctx.stroke();
    drawIcon(ctx, G.icon, 0, 0, m * 0.08);
    ctx.restore();
  }

  _result(ctx, w, h, m) {
    const R = this.result, t = R.t;
    const s = Motion.reduce ? 1 : Ease.outBack(clamp(t / 450), 1.8);
    const cx = w * 0.6, cy = h * 0.5, pw = m * 0.62, ph = m * 0.5;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
    // raios girando atrás
    if (!Motion.reduce) {
      ctx.save(); ctx.rotate(t * 0.0006); ctx.fillStyle = "rgba(255,226,120,.35)";
      for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-m * 0.06, -m * 0.5); ctx.lineTo(m * 0.06, -m * 0.5); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    }
    ctx.shadowColor = "rgba(70,40,110,.3)"; ctx.shadowBlur = m * 0.04; ctx.shadowOffsetY = m * 0.015;
    ctx.fillStyle = "#fffaf0"; roundRect(ctx, -pw / 2, -ph / 2, pw, ph, m * 0.05); ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "#e0a21c"; ctx.lineWidth = m * 0.01; roundRect(ctx, -pw / 2, -ph / 2, pw, ph, m * 0.05); ctx.stroke();
    const G = GAMES.find(x => x.id === R.id);
    drawIcon(ctx, G.icon, 0, -ph * 0.26, m * 0.06);
    // estrelinhas ganhas aparecem uma a uma
    const show = Math.min(R.stars, Math.floor(t / 110));
    const per = Math.min(R.stars, 6), rows = Math.ceil(R.stars / per);
    for (let i = 0; i < show; i++) {
      const row = Math.floor(i / per), col = i % per, inRow = Math.min(per, R.stars - row * per);
      const x = (col - (inRow - 1) / 2) * m * 0.07, y = ph * 0.04 + (row - (rows - 1) / 2) * m * 0.07;
      const pop = Math.min(1, (t - i * 110) / 220);
      drawIcon(ctx, "star", x, y, m * 0.03 * (Motion.reduce ? 1 : Ease.outBack(clamp(pop), 2.5)));
    }
    ctx.fillStyle = "#6b4a14"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `bold ${Math.round(m * 0.05)}px system-ui, sans-serif`;
    ctx.fillText("+" + R.stars, 0, ph * 0.33);
    ctx.restore();
    if (R.newBest && t > 500) {
      const k = clamp((t - 500) / 400), b = Motion.reduce ? 1 : Ease.outBack(k, 2.6);
      ctx.save(); ctx.translate(cx + pw * 0.42, cy - ph * 0.5); ctx.rotate(0.18); ctx.scale(b, b);
      ctx.fillStyle = "#ff6b9d"; roundRect(ctx, -m * 0.12, -m * 0.04, m * 0.24, m * 0.08, m * 0.04); ctx.fill();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = m * 0.006; roundRect(ctx, -m * 0.12, -m * 0.04, m * 0.24, m * 0.08, m * 0.04); ctx.stroke();
      drawIcon(ctx, "trophy", -m * 0.085, 0, m * 0.022);
      ctx.fillStyle = "#ffffff"; ctx.font = `bold ${Math.round(m * 0.032)}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("Nova marca!", m * 0.02, m * 0.002);
      ctx.restore();
    }
  }

  _bunting(ctx, w, h, m) {
    const cols = ["#ff6b9d", "#ffd54a", "#5bc0eb", "#9be564", "#b49cff"];
    const y = h * 0.05;
    ctx.save();
    ctx.strokeStyle = "#8a6a4a"; ctx.lineWidth = Math.max(1.5, m * 0.004);
    ctx.beginPath(); ctx.moveTo(w * 0.22, y); ctx.quadraticCurveTo(w * 0.55, y + h * 0.06, w * 0.88, y); ctx.stroke();
    for (let i = 0; i < 14; i++) {
      const u = (i + 0.5) / 14, x = w * (0.22 + 0.66 * u), yy = y + Math.sin(u * Math.PI) * h * 0.03;
      const sway = Motion.reduce ? 0 : Math.sin(this.t * 0.003 + i) * 0.12;
      ctx.save(); ctx.translate(x, yy); ctx.rotate(sway);
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath(); ctx.moveTo(-m * 0.016, 0); ctx.lineTo(m * 0.016, 0); ctx.lineTo(0, m * 0.04); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  _paintBack(c, w, h, m) {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#ffe3f1"); g.addColorStop(0.55, "#fff1d9"); g.addColorStop(1, "#ffe7b8");
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    // listras de tenda de circo, bem suaves
    c.save(); c.globalAlpha = 0.18;
    for (let i = 0; i < 16; i++) {
      c.fillStyle = i % 2 ? "#ff8fb8" : "#ffffff";
      c.beginPath(); c.moveTo(w * 0.55, -h * 0.2); c.lineTo(w * (i / 16 - 0.1) * 1.2, h * 0.86); c.lineTo(w * ((i + 1) / 16 - 0.1) * 1.2, h * 0.86); c.closePath(); c.fill();
    }
    c.restore();
    // chão de grama com borda
    const lg = c.createLinearGradient(0, h * 0.86, 0, h);
    lg.addColorStop(0, "#9fdc7c"); lg.addColorStop(1, "#78c35c");
    c.fillStyle = lg;
    c.beginPath(); c.moveTo(0, h * 0.88); c.quadraticCurveTo(w * 0.5, h * 0.84, w, h * 0.88); c.lineTo(w, h); c.lineTo(0, h); c.closePath(); c.fill();
    c.fillStyle = "rgba(255,255,255,.25)";
    for (let i = 0; i < 18; i++) { c.beginPath(); c.ellipse(w * (i / 18 + 0.02), h * (0.93 + (i % 3) * 0.02), m * 0.012, m * 0.005, 0, 0, Math.PI * 2); c.fill(); }
    softShadow(c, w * 0.15, h * 0.84, m * 0.1, m * 0.022, 0.14);
  }
}

function hexA(hex, a) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map(x => x + x).join("") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
