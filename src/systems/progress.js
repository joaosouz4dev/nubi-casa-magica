/* Sistema de ESTRELINHAS, PRÊMIOS, CARINHO e MISSÕES DO DIA.
   Escuta os eventos que o jogo já emite ("act", "quest:step", "quest:chapter")
   e só soma: o total nunca diminui. Os prêmios abrem pelo total alcançado
   (não se gasta nada), o carinho é por bichinho e as missões do dia trocam
   pela data, sem sequência e sem cobrança.
   Só emite eventos; a apresentação fica na UI (ui/progress_ui.js). */
import { STAR_RULES, ACT_COOLDOWN, NO_STAR, LOVE_ACTS, loveNeeded, PRIZES, MISSION_POOL } from "../data/prizes.js";

function today() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
// sorteio determinístico pela data: o mesmo dia mostra as mesmas missões
function seeded(seedStr) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; };
}

export class Progress {
  constructor(bus, save) {
    this.bus = bus; this.save = save;
    const p = save.state.stars || {};
    this.state = {
      total: p.total || 0,
      claimed: { ...(p.claimed || {}) },
      love: { ...(p.love || {}) },
      daily: p.daily || null
    };
    this._last = {};
    this._ensureDaily();
    bus.on("act", (a) => this.onAct(a));
    bus.on("quest:step", (e) => this.add(e.free ? STAR_RULES.act : STAR_RULES.step, "step"));
    bus.on("quest:chapter", () => this.add(STAR_RULES.chapter, "chapter"));
  }

  get total() { return this.state.total; }
  pet() { return this.save.currentPet(); }
  love(pet = this.pet()) { return this.state.love[pet] || { pts: 0, lvl: 0 }; }
  owned(id) { return !!this.state.claimed[id]; }
  ready(prize) { return !this.owned(prize.id) && this.state.total >= prize.price; }
  readyCount() { return PRIZES.filter(p => this.ready(p)).length; }
  nextPrize() { return PRIZES.find(p => !this.owned(p.id)) || null; }

  _persist() { this.save.state.stars = this.state; this.save.persist(); }

  add(n, why, at) {
    if (!n) return;
    const before = this.readyCount();
    this.state.total += n;
    this._persist();
    this.bus.emit("stars:changed", { total: this.state.total, gained: n, why, at });
    if (this.readyCount() > before) this.bus.emit("prize:ready", this.readyCount());
  }

  onAct(a) {
    if (typeof a !== "string") return;
    if (NO_STAR.some(re => re.test(a))) return;
    const now = performance.now();
    if (this._last[a] && now - this._last[a] < ACT_COOLDOWN) return;
    this._last[a] = now;
    this.add(STAR_RULES.act, "act");
    if (LOVE_ACTS.some(re => re.test(a))) this._love();
    this._mission(a);
  }

  _love() {
    const pet = this.pet();
    const l = { ...this.love(pet) };
    l.pts += 1;
    if (l.pts >= loveNeeded(l.lvl)) {
      l.pts = 0; l.lvl += 1;
      this.state.love[pet] = l;
      this._persist();
      this.bus.emit("love:up", { pet, lvl: l.lvl });
      this.bus.emit("effect:discoveryOnly", { id: "carinho_" + pet });
      this.add(STAR_RULES.loveUp, "love");
      return;
    }
    this.state.love[pet] = l;
    this._persist();
    this.bus.emit("love:changed", { pet, ...l, need: loveNeeded(l.lvl) });
  }

  // ---------------- prêmios ----------------
  claim(id) {
    const p = PRIZES.find(x => x.id === id);
    if (!p || !this.ready(p)) return false;
    this.state.claimed[id] = true;
    this._persist();
    this.bus.emit("prize:claimed", p);
    this.bus.emit("act", "prize");
    return true;
  }

  // ---------------- missões do dia ----------------
  _ensureDaily() {
    const d = today();
    if (this.state.daily && this.state.daily.date === d) return;
    const rnd = seeded("nubi" + d);
    // sempre uma de cuidar/brincar pela casa + uma de minijogo
    const isGame = (m) => m.act.startsWith("game:");
    const pool = MISSION_POOL.filter(m => !isGame(m)), games = MISSION_POOL.filter(isGame), pick = [];
    while (pick.length < 2 && pool.length) pick.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0].act);
    if (games.length) pick.push(games[Math.floor(rnd() * games.length)].act);
    this.state.daily = { date: d, acts: pick, done: {} };
    this._persist();
  }
  missions() {
    this._ensureDaily();
    const dd = this.state.daily;
    return dd.acts.map(a => ({ ...(MISSION_POOL.find(m => m.act === a) || { act: a, icon: "star" }), done: !!dd.done[a] }));
  }
  _mission(a) {
    this._ensureDaily();
    const dd = this.state.daily;
    if (!dd.acts.includes(a) || dd.done[a]) return;
    dd.done[a] = true;
    this._persist();
    const all = dd.acts.every(x => dd.done[x]);
    this.bus.emit("mission:done", { act: a, all });
    this.add(STAR_RULES.mission, "mission");
    if (all && !dd.chest) this.bus.emit("chest:ready");
  }

  /* Baú do dia: abre quando as 3 missões do dia estão feitas (uma vez por dia).
     Não é cobrança: se a criança não fizer, amanhã há outras missões e nada se perde. */
  chestReady() { this._ensureDaily(); const dd = this.state.daily; return !dd.chest && dd.acts.every(x => dd.done[x]); }
  chestOpened() { this._ensureDaily(); return !!this.state.daily.chest; }
  openChest(at) {
    if (!this.chestReady()) return 0;
    this.state.daily.chest = true;
    this._persist();
    this.add(STAR_RULES.chest, "chest", at);
    this.bus.emit("chest:opened", { stars: STAR_RULES.chest });
    return STAR_RULES.chest;
  }

  /* Presente de boas-vindas do dia: aparece na primeira abertura de cada dia.
     Sem sequência: não importa quantos dias a criança ficou sem jogar. */
  dailyGiftReady() { this._ensureDaily(); return !this.state.daily.gift; }
  claimDailyGift(at) {
    if (!this.dailyGiftReady()) return 0;
    this.state.daily.gift = true;
    this._persist();
    this.add(STAR_RULES.dailyGift, "daily", at);
    return STAR_RULES.dailyGift;
  }
}
