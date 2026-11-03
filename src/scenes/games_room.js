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
import { atmosphere } from "../ui/scenery.js";
import { FOODS } from "../data/foods.js";
import { paintFood } from "../entities/food_art.js";
import { art, drawBackdrop } from "../core/art.js";
import { touchNubi } from "./nubi_touch.js";
import { Skill } from "../systems/skill.js";
import { feltCard, feltDisc, feltPiece, feltDot as feltDotBase } from "../ui/felt.js";
/* Bolinha de feltro dos minijogos (marcadores, sequência): mais baixinha. */
const feltDot = (ctx, cx, cy, r, color, o = {}) => feltDotBase(ctx, cx, cy, r, color, { lift: 0.6, stitch: true, ...o });

export const GAMES = [
  { id: "catch",   icon: "game:catch",   color: "#ff9a5b" },
  { id: "bubbles", icon: "game:bubbles", color: "#5bc0eb" },
  { id: "memory",  icon: "game:memory",  color: "#b49cff" },
  { id: "music",   icon: "game:music",   color: "#7fd88a" },
  { id: "shapes",  icon: "game:shapes",  color: "#ffb04a" },
  { id: "colors",  icon: "game:colors",  color: "#ff6bb5" }
];
// formas para encaixar
const SHAPE_DEFS = ["circle", "square", "triangle", "star", "heart"];
// cores para o jogo de misturar (par -> resultado)
const COLOR_MIX = [
  { a: "#ffe14d", b: "#ff5b7f", out: "#ff9a3c", name: "laranja" },
  { a: "#5bc0eb", b: "#ffe14d", out: "#7fd88a", name: "verde" },
  { a: "#5b8def", b: "#ff5b7f", out: "#b48cff", name: "roxo" },
  { a: "#ffffff", b: "#ff5b7f", out: "#ffafd0", name: "rosa" }
];
const CATCH_FOODS = ["apple", "banana", "strawberry", "pear", "orange", "grapes", "watermelon", "blueberry"].filter(id => FOODS[id]);
const MEMORY_ICONS = ["food:apple", "food:banana", "food:strawberry", "food:watermelon", "food:grapes", "food:orange"];
const BUBBLE_COLORS = ["#ff8fb8", "#8fd3ff", "#b49cff", "#9be564", "#ffb04a"];
const KEY_COLORS = ["#ff6b6b", "#ffb04a", "#ffd54a", "#62c370", "#5bc0eb"];
/* Interface em feltro: cada jogo tem a sua cor pastel (cartão do menu, moldura
   da abertura). Contornos e textos num tom escuro quente, nunca preto. */
const PASTEL = { catch: "#ffd2b0", bubbles: "#bfe0f7", memory: "#d9c6f5", music: "#bfe8d4", shapes: "#ffe7a3", colors: "#ffc2d6" };
const FELT = { cream: "#fff4dc", yellow: "#ffe7a3", gold: "#ffd77a", pink: "#ffc2d6", lilac: "#d9c6f5", mint: "#bfe8d4", ink: "#6b4a5a" };
const pastelOf = (G) => PASTEL[G.id] || lighten(G.color, 0.6);
const PLAY_MS = 30000;
const INTRO_MS = 900;
const RESULT_MS = 5200;   // tempo para escolher "de novo" ou "outro jogo"

/* Estrelinhas por partida: sempre um mínimo (não existe perder). */
export function starsFor(score) { return clamp(Math.ceil(score / 2), 3, 12); }

export class GamesRoom {
  constructor({ vp, bus, nubi, save }) {
    this.vp = vp; this.bus = bus; this.nubi = nubi; this.save = save;
    this.t = 0; this.unsub = [];
    this.game = null;            // partida em andamento
    this.paused = false;         // pausa (botão do HUD; ver wirePause no main)
    this.skill = new Skill(save); // dificuldade que acompanha a criança (systems/skill.js)
    this.result = null;          // festa do fim da partida
    this.press = GAMES.map(() => new Spring(0, { stiffness: 340, damping: 14 }));
    this.cardIn = 0;
    this.floaters = [];          // "+1" subindo
    this.bg = new CachedLayer(vp, (c, w, h, m) => {
      if (this._paintArt(c, w, h, m)) return;
      this._paintBack(c, w, h, m); atmosphere(c, w, h, m, { vignette: 0.16 });
    });
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
      this.bus.on("pointer:up", () => { this.press.forEach(s => { s.target = 0; }); if (this.game && this.game.id === "shapes") this._shapeUp(); })
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
  /* Acerto da partida (0..1) para a dificuldade adaptativa; null = sem dado. */
  accuracy(g) {
    const ratio = (ok, bad) => (ok + bad > 0 ? ok / (ok + bad) : null);
    switch (g.id) {
      case "catch": return ratio(g.caught, g.dropped);
      case "bubbles": return ratio(g.popped, g.escaped);
      case "memory": return ratio(g.pairs, g.misses);
      case "music": return ratio(g.round, g.wrong);
      case "shapes": return ratio(g.done, g.wrong);
      case "colors": return ratio(g.round, g.miss);
    }
    return null;
  }
  _toMenu() { this.result = null; this._menuPose(); this.bus.emit("room:sub", "games"); }

  /* Fim da partida: dois botões grandes embaixo do cartão da festa.
     "De novo" repete o mesmo jogo; o outro volta para os cartões. */
  resultButtons() {
    const vp = this.vp, w = vp.w, h = vp.h, m = Math.min(w, h);
    const cx = w * 0.6, y = Math.min(h * 0.5 + m * 0.25 + m * 0.12, h - m * 0.1), r = m * 0.075;
    return [{ id: "again", x: cx - m * 0.11, y, r }, { id: "menu", x: cx + m * 0.11, y, r }];
  }
  resultButtonAt(px, py) {
    return this.resultButtons().find(b => Math.hypot(px - b.x, py - b.y) <= b.r * 1.35) || null;
  }

  // ---------------- cartões ----------------
  cardRect(i) {
    const vp = this.vp, cols = 3, col = i % cols, row = Math.floor(i / cols);
    const x0 = 0.3, y0 = 0.22, cw = 0.185, ch = 0.3, gx = 0.022, gy = 0.045;
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
  onMove(p) { if (this.game && this.game.id === "catch") this.game.targetX = clamp(p.x / this.vp.w, 0.1, 0.84); if (this.game && this.game.id === "shapes") this._shapeMove(p); }

  onTap(p) {
    if (this.result) {
      const b = this.result.t > 350 ? this.resultButtonAt(p.x, p.y) : null;
      if (b && b.id === "again") { const id = this.result.id; this.result = null; this.bus.emit("audio:pop"); this.start(id); return; }
      if (b || this.result.t > 900) this._toMenu();
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
    // tamanho/ritmo da partida = degrau atual da criança neste jogo
    const P = this.skill.param(id);
    const g = { id, t: -INTRO_MS, score: 0, spawn: 0, items: [], mode, lvl: this.skill.level(id) };
    if (id === "catch") {
      g.targetX = 0.47; g.every = P.every; g.speedK = P.speed; g.caught = 0; g.dropped = 0;
      this.nubi.sizeK = 0.62; this.nubi.pos = { x: 0.47, y: 0.8 };
    } else if (id === "bubbles") {
      g.every = P.every; g.sizeK = P.size; g.popped = 0; g.escaped = 0;
      this.nubi.sizeK = 0.6; this.nubi.pos = { x: 0.1, y: 0.8 };
    } else if (id === "memory") {
      const pairs = P;
      const icons = MEMORY_ICONS.slice(0, pairs);
      const deck = icons.concat(icons).map((icon, k) => ({ icon, k, open: false, matched: false, flip: new Spring(0, { stiffness: 260, damping: 20 }) }));
      for (let k = deck.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [deck[k], deck[j]] = [deck[j], deck[k]]; }
      g.cards = deck; g.pairs = pairs; g.misses = 0; g.lock = 0; g.first = null;
      g.cols = { 2: 2, 3: 3, 4: 4, 5: 5, 6: 4 }[pairs] || 4;
      this.nubi.sizeK = 0.6; this.nubi.pos = { x: 0.1, y: 0.8 };
    } else if (id === "music") {
      g.maxLen = P; g.wrong = 0;
      g.seq = [this._rnd5(), this._rnd5()];
      g.phase = "listen"; g.idx = 0; g.wait = 600; g.lit = -1; g.litT = 0; g.round = 0;
      g.keys = KEY_COLORS.map(() => new Spring(0, { stiffness: 380, damping: 16 }));
      g.instrument = (this.save.state.games && this.save.state.games.instrument) || "bell";
      this.nubi.sizeK = 0.62; this.nubi.pos = { x: 0.14, y: 0.62 };
    } else if (id === "shapes") {
      // quantas formas encaixar (dificuldade por modo)
      const n = P;
      const ids = SHAPE_DEFS.slice(0, n);
      // embaralha a ordem das peças soltas, mantendo os furos em ordem
      const order = ids.slice(); for (let k = order.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [order[k], order[j]] = [order[j], order[k]]; }
      g.holes = ids.map((shape, i) => ({ shape, i, filled: false }));
      g.pieces = order.map((shape, i) => ({ shape, i, placed: false, pos: null, pop: new Spring(0, { stiffness: 320, damping: 14 }) }));
      g.n = n; g.drag = null; g.done = 0; g.wrong = 0;
      this.nubi.sizeK = 0.52; this.nubi.pos = { x: 0.12, y: 0.7 };
    } else if (id === "colors") {
      g.rounds = P; g.miss = 0;
      g.round = 0; g.pick = []; g.mixed = null; g.target = this._colorTarget();
      this.nubi.sizeK = 0.6; this.nubi.pos = { x: 0.12, y: 0.68 };
    }
    this.game = g;
    this.paused = false;
    this.nubi.arrive();
    this.nubi.say(["Vamos lá!", "Bora brincar!", "Já!"][Math.floor(Math.random() * 3)]);
    this.bus.emit("audio:sparkle");
    this.bus.emit("room:sub", "games");
    this.bus.emit("game:playing", true);   // HUD: some tudo, fica só a pausa
  }
  _rnd5() { return Math.floor(Math.random() * KEY_COLORS.length); }
  _colorTarget() { return COLOR_MIX[Math.floor(Math.random() * COLOR_MIX.length)]; }

  _score(n, at, color) {
    const g = this.game; if (!g) return;
    g.score += n;
    this.floaters.push({ x: at.x, y: at.y, n, t: 0, color: color || "#ffb800" });
    this.bus.emit("fx:burst", { x: at.x, y: at.y, color: color || "#ffd54a", small: true });
  }

  /* Fim da partida: sempre festa e estrelinhas. quick = saiu pelo "voltar". */
  _finish({ quick = false } = {}) {
    const g = this.game; if (!g) return;
    this.game = null; this.paused = false;
    this.bus.emit("game:playing", false);
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
    // dificuldade: partida inteira conta (sair no meio, não)
    if (!quick) { const acc = this.accuracy(g); if (acc !== null) this.skill.record(g.id, acc); }
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
    else if (g.id === "shapes") this._shapeDown(p);
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
          g.items.splice(i, 1); g.popped++;
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
    if (g.id === "colors") { this._colorTap(p); return; }
    if (g.id === "shapes") { return; }   // formas usam arraste (down/move/up)
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
    this.bus.emit("audio:note", { i, instrument: g.instrument || "bell" });
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
      g.wrong++;
      if (g.wrong >= 5) { g.phase = "done"; g.endIn = 900; this.nubi.say("Que música!"); return true; }   // não fica preso: termina em festa (e o próximo fica mais fácil)
      this.nubi.say(["De novo!", "Escuta só!", "Outra vez!"][g.round % 3]);
      g.phase = "listen"; g.idx = 0; g.wait = 1000;
    }
    return true;
  }

  // ---------- formas (encaixar) ----------
  shapeHoleRect(i) {
    const vp = this.vp, g = this.game, n = g.n;
    const x0 = 0.3, x1 = 0.86, span = x1 - x0, step = span / n;
    return { x: vp.dx(x0 + step * (i + 0.5)), y: vp.dy(0.4), r: this.shapeR() };
  }
  shapePieceRect(i) {
    const vp = this.vp, g = this.game, n = g.n;
    const x0 = 0.3, x1 = 0.86, span = x1 - x0, step = span / n;
    const p = g.pieces[i];
    if (p.pos) return { x: p.pos.x, y: p.pos.y, r: this.shapeR() * 0.92 };
    return { x: vp.dx(x0 + step * (i + 0.5)), y: vp.dy(0.78), r: this.shapeR() * 0.92 };
  }
  // formas grandes para mãos pequenas, sem encostar umas nas outras
  shapeR() { const vp = this.vp; return Math.min(vp.s(0.09), vp.dx(0.56 / this.game.n) * 0.36); }
  shapePieceAt(px, py) {
    const g = this.game;
    for (let i = g.pieces.length - 1; i >= 0; i--) {
      if (g.pieces[i].placed) continue;
      const r = this.shapePieceRect(i);
      if (Math.hypot(px - r.x, py - r.y) <= r.r * 1.3) return i;
    }
    return -1;
  }
  _shapeDown(p) {
    const i = this.shapePieceAt(p.x, p.y);
    if (i >= 0) { this.game.drag = { i, dx: 0, dy: 0 }; this.game.pieces[i].pos = { x: p.x, y: p.y }; this.bus.emit("audio:pop"); }
  }
  _shapeMove(p) { const g = this.game; if (g.drag) g.pieces[g.drag.i].pos = { x: p.x, y: p.y }; }
  _shapeUp() {
    const g = this.game; if (!g || !g.drag) return;
    const pc = g.pieces[g.drag.i]; g.drag = null;
    // encaixa se solto perto do furo da MESMA forma
    const hi = g.holes.findIndex(h => !h.filled && h.shape === pc.shape);
    if (hi >= 0) {
      const hr = this.shapeHoleRect(hi);
      if (Math.hypot(pc.pos.x - hr.x, pc.pos.y - hr.y) < hr.r * 1.6) {
        g.holes[hi].filled = true; pc.placed = true; pc.pos = { x: hr.x, y: hr.y }; pc.pop.kick(-18);
        this._score(2, { x: hr.x, y: hr.y }, "#ffb04a");
        this.bus.emit("audio:sparkle"); this.nubi.celebrate();
        g.done++;
        if (g.done >= g.n) { g.score += g.n; g.endIn = 900; }
        return;
      }
    }
    if (pc.pos) g.wrong++;   // soltou fora do furo certo
    pc.pos = null;   // volta ao lugar (sem castigo)
    this.bus.emit("audio:plop");
  }

  // ---------- cores (misturar) ----------
  swatchRect(i) {
    const vp = this.vp;
    // 3 potes de tinta embaixo: A, B, branco
    const base = this.game.target;
    const cols = [base.a, base.b, "#ffffff"];
    const x0 = 0.42, step = 0.16;
    return { x: vp.dx(x0 + i * step), y: vp.dy(0.76), r: vp.s(0.06), color: cols[i] };
  }
  _colorTap(p) {
    const g = this.game;
    for (let i = 0; i < 3; i++) {
      const r = this.swatchRect(i);
      if (Math.hypot(p.x - r.x, p.y - r.y) <= r.r * 1.25) {
        g.pick.push(r.color); this.bus.emit("audio:pop");
        this.bus.emit("fx:burst", { x: r.x, y: r.y, color: r.color, small: true });
        if (g.pick.length >= 2) this._colorResolve();
        return;
      }
    }
  }
  _colorResolve() {
    const g = this.game, t = g.target;
    const hit = (g.pick.includes(t.a) && g.pick.includes(t.b));
    g.mixed = hit ? t.out : this._blend(g.pick[0], g.pick[1]);
    if (hit) {
      this._score(3, { x: this.vp.dx(0.58), y: this.vp.dy(0.42) }, t.out);
      this.bus.emit("audio:sparkle"); this.nubi.celebrate();
      g.round++;
      if (g.round >= g.rounds) { g.score += g.rounds; g.endIn = 1100; }
      else setTimeout(() => { if (this.game === g) { g.pick = []; g.mixed = null; g.target = this._colorTarget(); } }, 700);
    } else {
      // combinou diferente: nada de errado, só tenta de novo
      g.miss++;
      this.nubi.say(["Hmm, que cor!", "Quase!", "Mistura outra!"][g.round % 3]);
      setTimeout(() => { if (this.game === g) { g.pick = []; g.mixed = null; } }, 700);
    }
  }
  _blend(a, b) {
    const p = (h) => { h = h.replace("#", ""); const n = parseInt(h.length === 3 ? h.split("").map(x => x + x).join("") : h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const [r1, g1, b1] = p(a), [r2, g2, b2] = p(b);
    const h = (v) => Math.round(v).toString(16).padStart(2, "0");
    return "#" + h((r1 + r2) / 2) + h((g1 + g2) / 2) + h((b1 + b2) / 2);
  }

  // ---------- loop ----------
  update(dt) {
    this.t += dt;
    this.cardIn = Math.min(1, this.cardIn + dt / 450);
    for (const s of this.press) s.update(dt);
    this.floaters = this.floaters.filter(f => (f.t += dt) < 900);
    if (this.result) { this.result.t += dt; if (this.result.t > RESULT_MS) this._toMenu(); }
    const g = this.game;
    if (!g || this.paused) return;   // pausado: a partida congela
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
        g.items.push({ x: 0.12 + Math.random() * 0.7, y: -0.06, vy: (0.17 + Math.min(0.12, g.t / 200000)) * speed * g.speedK, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 3, food: fid, gold });
      }
      const mx = n.px(), my = n.py() - n.radius() * 0.2, rr = n.radius() * 1.05;
      for (let i = g.items.length - 1; i >= 0; i--) {
        const f = g.items[i];
        f.y += f.vy * dt / 1000; f.rot += f.vr * dt / 1000;
        const px = this.vp.dx(f.x), py = this.vp.dy(f.y);
        const dx = px - mx, dy = py - my;
        if (!f.landed && dx * dx + dy * dy < rr * rr) {
          g.items.splice(i, 1); g.caught++;
          this._score(f.gold ? 3 : 1, { x: px, y: py }, f.gold ? "#ffd54a" : (FOODS[f.food].color));
          this.bus.emit("audio:coin", g.score);
          n.sq.kick(1.1);
          if (g.score % 5 === 0) n.say(["Nhac!", "Hmm!", "Peguei!"][Math.floor(Math.random() * 3)]);
          continue;
        }
        // caiu no chão: só some devagar, sem castigo
        if (f.y > 0.93) { if (!f.landed) g.dropped++; f.landed = true; f.y = 0.93; f.vy = 0; f.vr = 0; f.fade = (f.fade || 0) + dt; if (f.fade > 500) g.items.splice(i, 1); }
      }
      if (g.t >= PLAY_MS && !g.items.some(f => !f.landed)) this._finish();
    } else if (g.id === "bubbles") {
      g.spawn -= dt;
      if (g.t < PLAY_MS - 800 && g.spawn <= 0) {
        g.spawn = g.every * (0.7 + Math.random() * 0.6);
        const gold = Math.random() < 0.1;
        g.items.push({ x: 0.22 + Math.random() * 0.62, y: 1.08, r: (0.05 + Math.random() * 0.035) * g.sizeK, vy: (0.12 + Math.random() * 0.08) * speed, ph: Math.random() * 6, gold, color: BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)] });
      }
      for (const b of g.items) { b.y -= b.vy * dt / 1000; b.ph += dt / 600; }
      const before = g.items.length;
      g.items = g.items.filter(b => b.y > -0.15);
      g.escaped += before - g.items.length;
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
    } else if (g.id === "shapes") {
      for (const pc of g.pieces) pc.pop.update(dt);
      if (g.endIn !== undefined) { g.endIn -= dt; if (g.endIn <= 0) this._finish(); }
    } else if (g.id === "colors") {
      if (g.endIn !== undefined) { g.endIn -= dt; if (g.endIn <= 0) this._finish(); }
    }
  }

  // ---------------- desenho ----------------
  draw() {
    const ctx = this.vp.ctx, vp = this.vp, w = vp.w, h = vp.h, m = Math.min(w, h);
    this.bg.draw();
    const g = this.game;
    if (art("brinquedos/fundo_brinquedos")) {
      /* a tenda em feltro já tem as bandeirinhas; durante o minijogo um véu
         creme acalma as listras para frutas, bolhas e cartas se destacarem */
      if (g) { ctx.fillStyle = "rgba(255,247,238,.42)"; ctx.fillRect(0, 0, w, h); }
    } else this._bunting(ctx, w, h, m);
    if (!g && !this.result) { GAMES.forEach((G, i) => this._card(ctx, G, i, m)); this.nubi.draw(); return; }
    if (this.result && !g) { this.nubi.draw(); this._result(ctx, w, h, m); this._resultButtons(ctx, m); this._floaters(ctx, m); return; }

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
    } else if (g.id === "shapes") {
      this.nubi.draw();
      g.holes.forEach((hl, i) => this._hole(ctx, i, m));
      g.pieces.forEach((pc, i) => this._piece(ctx, i, m));
    } else if (g.id === "colors") {
      this.nubi.draw();
      this._colorBoard(ctx, w, h, m);
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
    // apertado = o feltro "afunda": a espessura some e a face desce até o chão
    const lift = Math.round((1 - clamp(k, 0, 1) * 0.8) * 4) / 4;
    const depth = Math.max(2, Math.min(r.w, r.h) * 0.07);
    ctx.save(); ctx.translate(cx, cy + bob + (1 - lift) * depth); ctx.scale(s, s); ctx.translate(-cx, -cy);
    const col = pastelOf(G), rad = m * 0.045;
    feltPiece(ctx, "card|" + col + "|" + rad.toFixed(1) + "|" + lift, r.x, r.y, r.w, r.h,
      (c, x, y, w, h) => feltCard(c, x, y, w, h, rad, col, { lift }));
    drawIcon(ctx, G.icon, cx, r.y + r.h * 0.48, Math.min(r.w, r.h) * 0.3);
    // marca pessoal: etiqueta creme costurada no pé do cartão
    const best = this.best(G.id);
    if (best > 0) {
      const bx = cx, by = r.y + r.h * 0.86, bw = m * 0.11, bh = m * 0.048;
      feltPiece(ctx, "tag|" + bh.toFixed(1), bx - bw / 2, by - bh / 2, bw, bh,
        (c, x, y, w, h) => feltCard(c, x, y, w, h, h / 2, FELT.cream, { lift: 0.5 }));
      drawIcon(ctx, "trophy", bx - m * 0.03, by, m * 0.018);
      ctx.fillStyle = FELT.ink; ctx.font = `bold ${Math.round(m * 0.032)}px Fredoka, system-ui, sans-serif`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
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
    const ring = art("brinquedos/jogo_bolha");
    if (ring) {
      // bolha em feltro: um véu leve da cor por dentro do anel arco-íris
      // (a cor é só enfeite; a dourada, que vale mais, fica bem mais forte e com estrela)
      const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r * 0.95);
      g.addColorStop(0, "rgba(255,255,255,.5)"); g.addColorStop(0.6, hexA(c, b.gold ? 0.45 : 0.22)); g.addColorStop(1, hexA(c, b.gold ? 0.7 : 0.42));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 0.93, 0, Math.PI * 2); ctx.fill();
      if (b.gold) { ctx.shadowColor = "rgba(255,200,40,.95)"; ctx.shadowBlur = r * 0.5; }
      drawImgFit(ctx, ring, 0, 0, r * 2.08, r * 2.08);
      ctx.shadowColor = "transparent";
      if (b.gold) drawIcon(ctx, "star", 0, 0, r * 0.5);
      ctx.restore();
      return;
    }
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
      // frente: retalho de feltro creme (amarelinho quando o par foi achado)
      ctx.shadowColor = "transparent";
      const col = c.matched ? "#ffe7a3" : "#fff4dc";
      feltPiece(ctx, "memface|" + col, -r.w / 2, -r.h / 2, r.w, r.h,
        (cc, x, y, w, h) => feltCard(cc, x, y, w, h, m * 0.03, col, { lift: 0.6 }));
      drawIcon(ctx, c.icon, 0, 0, r.w * 0.3);
    } else if (cardBackArt(r.w, r.h)) {
      // verso em feltro (lilás com estrelinha)
      ctx.drawImage(cardBackArt(r.w, r.h), -r.w / 2, -r.h / 2, r.w, r.h);
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
    const btn = tintedArt("brinquedos/jogo_tecla", c);
    if (btn) {
      // tecla em feltro: botão redondo tingido, no meio da faixa de toque;
      // acesa = brilho colorido em volta e a própria cor mais clara (somada)
      const d = Math.min(r.w * 1.08, r.h * 0.78), cy = r.y + r.h * 0.5;
      if (lit) ctx.shadowBlur = m * 0.07;
      drawImgFit(ctx, btn, cx, cy, d, d);
      if (lit) {
        ctx.shadowColor = "transparent";
        ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.2;
        drawImgFit(ctx, btn, cx, cy, d, d);
      }
      ctx.restore();
      return;
    }
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
      feltDot(ctx, x0 + i * gap, y, m * 0.018, done ? lighten(KEY_COLORS[g.seq[i]], 0.12) : FELT.cream);
    }
    // vez de quem: orelhinha (ouvir) ou mãozinha (tocar)
    drawIcon(ctx, g.phase === "listen" ? "note" : "paw", w * 0.58 + (n + 1) * gap / 2 + m * 0.02, y, m * 0.026);
  }

  // ---------- desenho de formas e cores ----------
  _shapePath(ctx, shape, x, y, r) {
    ctx.beginPath();
    if (shape === "circle") { ctx.arc(x, y, r, 0, Math.PI * 2); }
    else if (shape === "square") { ctx.rect(x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7); }
    else if (shape === "triangle") { ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.9, y + r * 0.7); ctx.lineTo(x - r * 0.9, y + r * 0.7); ctx.closePath(); }
    else if (shape === "heart") { ctx.moveTo(x, y + r * 0.75); ctx.bezierCurveTo(x - r * 1.4, y - r * 0.4, x - r * 0.5, y - r * 1.1, x, y - r * 0.35); ctx.bezierCurveTo(x + r * 0.5, y - r * 1.1, x + r * 1.4, y - r * 0.4, x, y + r * 0.75); ctx.closePath(); }
    else { // star
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.closePath();
    }
  }
  _shapeColor(shape) { return { circle: "#5bc0eb", square: "#ff9a5b", triangle: "#7fd88a", star: "#ffd54a", heart: "#ff6bb5" }[shape] || "#b49cff"; }
  _hole(ctx, i, m) {
    const g = this.game, h = g.holes[i], r = this.shapeHoleRect(i);
    ctx.save();
    const sil = holeArt("brinquedos/" + SHAPE_ART[h.shape]);
    if (sil) {
      // buraco = silhueta da própria peça, escurecida (um pouco maior que a peça)
      const d = r.r * SHAPE_ART_K[h.shape];
      ctx.globalAlpha = h.filled ? 0.5 : 0.45;
      drawImgFit(ctx, sil, r.x, r.y, d, d);
      ctx.restore();
      return;
    }
    // furo "vazado": contorno tracejado onde a peça encaixa
    ctx.setLineDash(h.filled ? [] : [m * 0.02, m * 0.015]);
    ctx.strokeStyle = h.filled ? darken(this._shapeColor(h.shape), 0.2) : "rgba(120,90,150,.6)";
    ctx.lineWidth = Math.max(2, m * 0.007);
    ctx.fillStyle = h.filled ? "transparent" : "rgba(255,255,255,.35)";
    this._shapePath(ctx, h.shape, r.x, r.y, r.r); if (!h.filled) ctx.fill(); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
  _piece(ctx, i, m) {
    const g = this.game, pc = g.pieces[i];
    const r = this.shapePieceRect(i), col = this._shapeColor(pc.shape);
    const k = 1 - clamp(pc.pop.x, -1, 1) * 0.06;
    ctx.save(); ctx.translate(r.x, r.y); ctx.scale(k, k); ctx.translate(-r.x, -r.y);
    ctx.shadowColor = "rgba(70,40,110,.25)"; ctx.shadowBlur = m * 0.02; ctx.shadowOffsetY = m * 0.008;
    const im = art("brinquedos/" + SHAPE_ART[pc.shape]);
    if (im) {
      // peça em feltro (cada forma já vem com a sua cor)
      if (g.drag && g.pieces[g.drag.i] === pc) { ctx.shadowBlur = m * 0.035; ctx.shadowOffsetY = m * 0.02; }
      const d = r.r * SHAPE_ART_K[pc.shape];   // r da peça já é 0,92 do buraco: cabe dentro da silhueta
      drawImgFit(ctx, im, r.x, r.y, d, d);
      ctx.restore();
      return;
    }
    const gr = ctx.createLinearGradient(r.x, r.y - r.r, r.x, r.y + r.r);
    gr.addColorStop(0, lighten(col, 0.4)); gr.addColorStop(1, col);
    ctx.fillStyle = gr; this._shapePath(ctx, pc.shape, r.x, r.y, r.r); ctx.fill();
    ctx.shadowColor = "transparent"; ctx.strokeStyle = darken(col, 0.3); ctx.lineWidth = Math.max(2, m * 0.007);
    this._shapePath(ctx, pc.shape, r.x, r.y, r.r); ctx.stroke();
    ctx.restore();
  }
  _colorBoard(ctx, w, h, m) {
    const g = this.game, t = g.target;
    // alvo (contorno da cor a fazer) no alto
    const tx = w * 0.58, ty = h * 0.3;
    // quadrinho de feltro creme (moldura na cor-alvo clarinha, como aplique)
    const fw = m * 0.22, fh = m * 0.2, frame = lighten(t.out, 0.55);
    feltPiece(ctx, "board|" + frame + "|" + fw.toFixed(1), tx - fw / 2, ty - m * 0.13, fw, fh, (c, x, y, w, h) => {
      feltCard(c, x, y, w, h, m * 0.04, frame, { stitch: false });
      const k = m * 0.016;
      feltCard(c, x + k, y + k, w - k * 2, h - k * 2, m * 0.03, FELT.cream, { shadow: false, lift: 0.4 });
    });
    // círculo de feltro com a cor-alvo esmaecida (o que queremos fazer)
    feltDot(ctx, tx, ty - m * 0.02, m * 0.06, lighten(t.out, 0.5), { shadow: false, lift: 0.3 });
    drawIcon(ctx, "star", tx, ty + m * 0.045, m * 0.025);
    // resultado da mistura atual, se houver (peça de feltro por cima do alvo)
    if (g.mixed) feltDot(ctx, tx, ty - m * 0.02, m * 0.055, g.mixed, { lift: 0.7 });
    // potes de tinta
    for (let i = 0; i < 3; i++) {
      const r = this.swatchRect(i);
      ctx.save();
      const pot = paintPotArt(r.color);
      if (pot) {
        // pote de tinta em feltro com a tinta na cor (o toque continua no círculo de raio r)
        softShadow(ctx, r.x, r.y + r.r * 1.3, r.r * 1.1, m * 0.014, 0.2);
        drawImgFit(ctx, pot, r.x, r.y - r.r * 0.05, r.r * 2.9, r.r * 2.9);
        ctx.restore();
        continue;
      }
      softShadow(ctx, r.x, r.y + r.r, r.r * 0.9, m * 0.012, 0.2);
      const gr = ctx.createLinearGradient(r.x, r.y - r.r, r.x, r.y + r.r);
      gr.addColorStop(0, lighten(r.color, 0.3)); gr.addColorStop(1, r.color);
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = darken(r.color === "#ffffff" ? "#cccccc" : r.color, 0.3); ctx.lineWidth = Math.max(2, m * 0.006); ctx.stroke();
      // pincel/gota
      ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.beginPath(); ctx.ellipse(r.x - r.r * 0.3, r.y - r.r * 0.35, r.r * 0.22, r.r * 0.12, -0.6, 0, Math.PI * 2); ctx.fill();
      // quantos já escolhidos desta cor
      ctx.restore();
    }
    // pontinhos de progresso (rodadas)
    for (let i = 0; i < g.rounds; i++) feltDot(ctx, w * 0.58 + (i - (g.rounds - 1) / 2) * m * 0.05, h * 0.46, m * 0.017, i < g.round ? t.out : FELT.cream);
  }

  _hud(ctx, g, w, h, m) {
    // placar da partida (estrela + número), canto esquerdo abaixo dos botões
    // (no celular deitado a fileira de botões ocupa mais da altura: desce junto)
    const x = w * 0.04, y = Math.max(h * 0.2, this.vp.hudBottom() + m * 0.06);
    ctx.save();
    // faixa de feltro creme costurada (estrela + número)
    const pw = m * 0.2, ph = m * 0.08;
    feltPiece(ctx, "score|" + ph.toFixed(1), x, y - ph / 2, pw, ph,
      (c, x, y, w, h) => feltCard(c, x, y, w, h, h / 2, FELT.cream, { lift: 0.7 }));
    drawIcon(ctx, "star", x + m * 0.045, y, m * 0.028);
    ctx.fillStyle = FELT.ink; ctx.font = `bold ${Math.round(m * 0.05)}px Fredoka, system-ui, sans-serif`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(String(g.score), x + m * 0.085, y + m * 0.004);
    ctx.restore();
    // tempo: um solzinho que anda numa trilha (sem número, sem "acabou o tempo")
    if (g.id === "catch" || g.id === "bubbles") {
      const k = clamp(g.t / PLAY_MS), x0 = w * 0.3, x1 = w * 0.8, yy = Math.max(h * 0.135, this.vp.hudBottom() + m * 0.045);
      ctx.save();
      // trilho de feltro creme costurado; por cima, a tira amarela vai crescendo
      // (a tira inteira fica em cache e só aparece até onde o sol já andou)
      const th = m * 0.036, fh = th * 0.56, tw = x1 - x0 + th;
      feltPiece(ctx, "track|" + th.toFixed(1), x0 - th / 2, yy - th / 2, tw, th,
        (c, x, y, w, h) => feltCard(c, x, y, w, h, h / 2, FELT.cream, { lift: 0.5 }));
      const fill = (x1 - x0) * k + fh;
      if (k > 0) {
        ctx.save();
        ctx.beginPath(); roundRect(ctx, x0 - fh / 2, yy - fh / 2 - 1, fill, fh + 3, fh / 2); ctx.clip();
        feltPiece(ctx, "trackfill|" + fh.toFixed(1) + "|" + tw.toFixed(0), x0 - fh / 2, yy - fh / 2, x1 - x0 + fh, fh,
          (c, x, y, w, h) => feltCard(c, x, y, w, h, h / 2, FELT.gold, { stitch: false, shadow: false, lift: 0.4 }));
        ctx.restore();
      }
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
      ctx.font = `bold ${Math.round(m * (0.045 + Ease.outBack(Math.min(1, k * 3)) * 0.01))}px Fredoka, system-ui, sans-serif`;
      // letra cheia na cor (clarinha, como feltro) com contorno macio no tom escuro quente
      ctx.lineJoin = "round"; ctx.lineWidth = Math.max(4, m * 0.012); ctx.strokeStyle = "rgba(107,74,90,.9)";
      ctx.fillStyle = lighten(f.color, 0.18);
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
    // medalhão: disco na cor pastel do jogo com um disco creme costurado por cima
    const R = m * 0.15, col = pastelOf(G);
    feltPiece(ctx, "intro|" + col + "|" + R.toFixed(1), -R, -R, R * 2, R * 2, (c, x, y, w) => {
      const r = w / 2, cx = x + r, cy = y + r;
      feltDisc(c, cx, cy, r, col, { stitch: false });
      feltDisc(c, cx, cy, r * 0.8, FELT.cream, { shadow: false, lift: 0.4 });
    });
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
      ctx.save(); ctx.rotate(t * 0.0006); ctx.fillStyle = "rgba(255,231,163,.4)";
      for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-m * 0.06, -m * 0.5); ctx.lineTo(m * 0.06, -m * 0.5); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    }
    // quadro da festa: feltro amarelo por baixo e um creme costurado por cima
    feltPiece(ctx, "result|" + pw.toFixed(1), -pw / 2, -ph / 2, pw, ph, (c, x, y, w, h) => {
      feltCard(c, x, y, w, h, m * 0.06, FELT.yellow, { stitch: false });
      const k = m * 0.026;
      feltCard(c, x + k, y + k, w - k * 2, h - k * 2, m * 0.042, FELT.cream, { shadow: false, lift: 0.4 });
    });
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
    ctx.restore();
    if (R.newBest && t > 500) {
      const k = clamp((t - 500) / 400), b = Motion.reduce ? 1 : Ease.outBack(k, 2.6);
      ctx.save(); ctx.translate(cx + pw * 0.42, cy - ph * 0.5); ctx.rotate(0.18); ctx.scale(b, b);
      // fitinha de feltro rosa costurada
      feltPiece(ctx, "best|" + m.toFixed(1), -m * 0.12, -m * 0.04, m * 0.24, m * 0.08,
        (c, x, y, w, h) => feltCard(c, x, y, w, h, h / 2, FELT.pink, { lift: 0.7 }));
      drawIcon(ctx, "trophy", -m * 0.085, 0, m * 0.022);
      ctx.fillStyle = FELT.ink; ctx.font = `bold ${Math.round(m * 0.032)}px Fredoka, system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("Nova marca!", m * 0.02, m * 0.002);
      ctx.restore();
    }
  }

  _resultButtons(ctx, m) {
    const t = this.result.t;
    if (t < 350) return;
    const k = Motion.reduce ? 1 : Ease.outBack(clamp((t - 350) / 380), 2.2);
    for (const b of this.resultButtons()) {
      const again = b.id === "again";
      ctx.save(); ctx.translate(b.x, b.y); ctx.scale(k, k);
      // botões redondos de feltro: menta (de novo) e lilás (outro jogo)
      const col = again ? FELT.mint : FELT.lilac;
      feltPiece(ctx, "rbtn|" + col + "|" + b.r.toFixed(1), -b.r, -b.r, b.r * 2, b.r * 2,
        (c, x, y, w) => feltDisc(c, x + w / 2, y + w / 2, w / 2, col));
      if (again) {
        // seta em círculo: "de novo" (cordão verde-escuro, pontas redondas)
        const rr = b.r * 0.46, ink = "#4b7a5e";
        ctx.strokeStyle = ink; ctx.lineWidth = b.r * 0.17; ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.beginPath(); ctx.arc(0, 0, rr, -Math.PI * 0.35, Math.PI * 1.35); ctx.stroke();
        const a = -Math.PI * 0.35, hx = Math.cos(a) * rr, hy = Math.sin(a) * rr;
        ctx.fillStyle = ink; ctx.lineWidth = b.r * 0.06; ctx.beginPath();
        ctx.moveTo(hx + b.r * 0.2, hy - b.r * 0.02); ctx.lineTo(hx - b.r * 0.12, hy - b.r * 0.22); ctx.lineTo(hx - b.r * 0.06, hy + b.r * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
      } else {
        drawIcon(ctx, "games", 0, 0, b.r * 0.55);
      }
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

  /* Tenda de circo em feltro (listras rosa e creme, bandeirinhas, chão de
     grama); vale para o menu e para o fundo dos minijogos. */
  _paintArt(c, w, h, m) {
    if (!drawBackdrop(c, "brinquedos/fundo_brinquedos", w, h, 0.4)) return false;
    softShadow(c, w * 0.15, h * 0.84, m * 0.1, m * 0.022, 0.14);
    return true;
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

/* ---------- peças em feltro (assets/brinquedos) ----------
   Cada função devolve um canvas pronto (em cache) ou null quando a arte
   ainda não carregou; aí quem desenha usa o desenho em código. */
const SHAPE_ART = { circle: "jogo_forma_circulo", square: "jogo_forma_quadrado", triangle: "jogo_forma_triangulo", star: "jogo_forma_estrela", heart: "jogo_forma_coracao" };
// tamanho da arte (lado da caixa, em raios) para ocupar o mesmo espaço da forma em código
const SHAPE_ART_K = { circle: 2.05, square: 1.85, triangle: 2.1, star: 2.2, heart: 2.2 };
const artCache = new Map();
function offscreen(w, h) {
  if (typeof document === "undefined") return null;
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.round(w)); cv.height = Math.max(1, Math.round(h));
  return cv;
}
/* Peça branca tingida mantendo o sombreado do feltro (multiplica a cor). */
function tintedArt(name, color) {
  const base = art(name);
  if (!base) return null;
  const key = "tint|" + name + "|" + color;
  let cv = artCache.get(key);
  if (!cv) {
    cv = offscreen(base.naturalWidth, base.naturalHeight);
    if (!cv) return null;
    const c = cv.getContext("2d");
    c.drawImage(base, 0, 0);
    c.globalCompositeOperation = "multiply"; c.fillStyle = color; c.fillRect(0, 0, cv.width, cv.height);
    c.globalCompositeOperation = "destination-in"; c.drawImage(base, 0, 0);
    artCache.set(key, cv);
  }
  return cv;
}
/* Buraco do jogo de formas: a silhueta da peça escurecida (o feltro continua aparecendo). */
function holeArt(name) {
  const base = art(name);
  if (!base) return null;
  const key = "hole|" + name;
  let cv = artCache.get(key);
  if (!cv) {
    cv = offscreen(base.naturalWidth, base.naturalHeight);
    if (!cv) return null;
    const c = cv.getContext("2d");
    c.drawImage(base, 0, 0);
    c.globalCompositeOperation = "source-atop"; c.fillStyle = "rgba(92,58,120,.72)"; c.fillRect(0, 0, cv.width, cv.height);
    artCache.set(key, cv);
  }
  return cv;
}
/* Pote de tinta: só a tinta (os pixels brancos/acinzentados de cima) ganha a
   cor; o pote creme fica igual. Branco devolve a arte original. */
function paintPotArt(color) {
  const base = art("brinquedos/jogo_pote_tinta");
  if (!base) return null;
  if (color.toLowerCase() === "#ffffff") return base;
  const key = "pot|" + color;
  if (artCache.has(key)) return artCache.get(key);
  const cv = offscreen(base.naturalWidth, base.naturalHeight);
  if (!cv) return null;
  const c = cv.getContext("2d");
  c.drawImage(base, 0, 0);
  try {
    const d = c.getImageData(0, 0, cv.width, cv.height), px = d.data;
    const n = parseInt(color.replace("#", ""), 16), cr = (n >> 16) & 255, cg = (n >> 8) & 255, cb = n & 255;
    const yMax = cv.height * 0.6;
    for (let y = 0; y < yMax; y++) {
      for (let x = 0; x < cv.width; x++) {
        const i = (y * cv.width + x) * 4;
        if (px[i + 3] < 8) continue;
        const r = px[i], g = px[i + 1], b = px[i + 2];
        // tinta: azulada/cinza (b perto de r); pote: creme (r bem acima de b)
        const wgt = clamp((26 - (r - b)) / 12);
        if (wgt <= 0 || r < 120) continue;
        px[i] = r + (cr * r / 255 - r) * wgt;
        px[i + 1] = g + (cg * g / 255 - g) * wgt;
        px[i + 2] = b + (cb * b / 255 - b) * wgt;
      }
    }
    c.putImageData(d, 0, 0);
  } catch (e) { artCache.set(key, null); return null; }
  artCache.set(key, cv);
  return cv;
}
/* Verso da carta da memória num retângulo de qualquer proporção: as faixas
   lisas de feltro entre a borda e a estrela esticam; cantos e estrela não. */
function cardBackArt(w, h) {
  const base = art("brinquedos/jogo_carta_verso");
  if (!base) return null;
  w = Math.round(w); h = Math.round(h);
  const key = "card|" + w + "x" + h;
  let cv = artCache.get(key);
  if (!cv) {
    cv = offscreen(w, h);
    if (!cv) return null;
    const c = cv.getContext("2d");
    const iw = base.naturalWidth, ih = base.naturalHeight, k = h / ih;
    const natW = iw * k;
    if (natW >= w) c.drawImage(base, 0, 0, w, h);
    else {
      const a = 0.2, b = 0.3;                    // frações da largura da arte
      const extra = (w - natW) / 2;              // cada faixa lisa ganha metade da sobra
      const cols = [[0, a, 0], [a, b, extra], [b, 1 - b, 0], [1 - b, 1 - a, extra], [1 - a, 1, 0]];
      let x = 0;
      for (const [s0, s1, add] of cols) {
        const sw = (s1 - s0) * iw, dw = sw * k + add;
        c.drawImage(base, s0 * iw, 0, sw, ih, x, 0, dw + 0.6, h);
        x += dw;
      }
    }
    artCache.set(key, cv);
  }
  return cv;
}
/* ---------- interface em feltro (cartões, faixas, bolinhas) ----------
   As peças ficam guardadas em canvas (feltPiece, em ui/felt.js).
   feltCard/feltDisc pintam gradiente, padrão de fibras e sombra borrada: caro
   para repetir a cada quadro. Cada peça é pintada uma vez num canvas (na
   resolução da tela, com folga para a sombra) e depois só é carimbada.
   paint(c, x, y, w, h) desenha a peça na caixa (x, y, w, h). */
function drawImgFit(ctx, im, cx, cy, maxW, maxH) {
  const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
  const k = Math.min(maxW / iw, maxH / ih), dw = iw * k, dh = ih * k;
  ctx.drawImage(im, cx - dw / 2, cy - dh / 2, dw, dh);
  return { x: cx - dw / 2, y: cy - dh / 2, w: dw, h: dh };
}

function hexA(hex, a) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map(x => x + x).join("") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
