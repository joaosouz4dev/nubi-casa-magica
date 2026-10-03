/* Interface das estrelinhas: contador no topo, coração de carinho do
   bichinho, lojinha de prêmios e missões do dia.
   Tudo desenhado no estilo do jogo (ícones em canvas, sem emoji) e com
   feedback imediato: estrelinha voando até o contador, número que pula,
   prêmio pronto pulsando, festa ao ganhar. */
import { drawIcon } from "./icons.js";
import { PRIZES, loveNeeded } from "../data/prizes.js";
import { PETS } from "../data/pets.js";

function iconCanvas(size, key) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const c = document.createElement("canvas");
  c.width = size * dpr; c.height = size * dpr;
  c.style.width = size + "px"; c.style.height = size + "px";
  const ctx = c.getContext("2d");
  ctx.scale(dpr, dpr);
  // as peças de roupa são desenhadas menores que as comidas: compensa no cartão
  drawIcon(ctx, key, size / 2, size / 2, size * (key.startsWith("wear:") ? 0.62 : 0.38));
  return c;
}
function bump(el, cls = "bump") { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

export class ProgressUI {
  constructor({ bus, progress, nubi, audio, vp }) {
    this.bus = bus; this.progress = progress; this.nubi = nubi; this.audio = audio; this.vp = vp;
    this.pill = document.getElementById("starPill");
    this.count = document.getElementById("starCount");
    this.love = document.getElementById("loveMeter");
    this.loveFill = document.getElementById("loveFill");
    this.loveLvl = document.getElementById("loveLvl");
    this.shopEl = document.getElementById("shop");
    this.shopGrid = document.getElementById("shopGrid");
    this.missEl = document.getElementById("missions");
    this.missList = document.getElementById("missionList");
    this.shown = progress.total;

    const starIco = document.getElementById("starIco");
    if (starIco) starIco.appendChild(iconCanvas(30, "star"));
    const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener("click", fn); };
    on("btnShop", () => this.openShop());
    on("starPill", () => this.openShop());
    on("shopClose", () => this.shopEl.classList.remove("show"));
    on("btnMissions", () => this.openMissions());
    on("missionsClose", () => this.missEl.classList.remove("show"));

    bus.on("stars:changed", (e) => this._gain(e));
    bus.on("prize:ready", () => { this._badge(); this.audio.chime(3); });
    bus.on("prize:claimed", (p) => this._claimed(p));
    bus.on("love:changed", () => this._renderLove());
    bus.on("love:up", (e) => this._loveUp(e));
    bus.on("pet:choose", () => setTimeout(() => this._renderLove(), 50));
    bus.on("mission:done", (e) => this._missionDone(e));
    this._renderCount(); this._renderLove(); this._badge(); this._missionBadge();
  }

  // ---------------- contador ----------------
  _renderCount() { if (this.count) this.count.textContent = String(this.shown); }
  _gain({ total, gained, at }) {
    // estrelinha voando do bichinho até o contador; o número sobe quando ela chega
    const from = at || { x: this.nubi.px(), y: this.nubi.py() - this.nubi.radius() * 1.1 };
    const fly = Math.min(4, gained);
    for (let i = 0; i < fly; i++) setTimeout(() => this._flyStar(from, i === fly - 1 ? total : null), i * 90);
    if (!this.pill) { this.shown = total; return; }
  }
  _flyStar(from, finalTotal) {
    const cv = this.vp.ctx.canvas.getBoundingClientRect();
    const tgt = this.pill ? this.pill.getBoundingClientRect() : { left: cv.width / 2, top: 10, width: 40, height: 40 };
    const el = document.createElement("div");
    el.className = "flyStar";
    el.appendChild(iconCanvas(28, "star"));
    document.body.appendChild(el);
    const x0 = cv.left + from.x - 14, y0 = cv.top + from.y - 14;
    const x1 = tgt.left + 18 - 14, y1 = tgt.top + tgt.height / 2 - 14;
    const reduce = document.body.classList.contains("reduce-motion");
    const midX = (x0 + x1) / 2 + (Math.random() - 0.5) * 80, midY = Math.min(y0, y1) - 60;
    const anim = el.animate([
      { transform: `translate(${x0}px, ${y0}px) scale(.4)`, opacity: 0 },
      { transform: `translate(${midX}px, ${midY}px) scale(1.25) rotate(90deg)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${x1}px, ${y1}px) scale(.8) rotate(200deg)`, opacity: 1 }
    ], { duration: reduce ? 200 : 750, easing: "cubic-bezier(.45,.05,.4,1)" });
    anim.onfinish = () => {
      el.remove();
      this.shown = finalTotal != null ? finalTotal : this.shown + 1;
      if (finalTotal != null) this.shown = this.progress.total;
      this._renderCount();
      bump(this.pill);
      this.audio.chime(1);
    };
  }
  _badge() {
    const b = document.getElementById("btnShop");
    if (b) b.classList.toggle("ready", this.progress.readyCount() > 0);
  }
  _missionBadge() {
    const b = document.getElementById("btnMissions");
    if (b) b.classList.toggle("ready", this.progress.missions().some(m => !m.done));
  }

  // ---------------- carinho ----------------
  _renderLove() {
    const l = this.progress.love();
    const k = Math.min(1, l.pts / loveNeeded(l.lvl));
    if (this.loveFill) this.loveFill.style.height = Math.round(k * 100) + "%";
    if (this.loveLvl) this.loveLvl.textContent = String(l.lvl + 1);
  }
  _loveUp({ pet }) {
    this._renderLove();
    bump(this.love);
    this.nubi.dance();
    this.nubi.say(["Te amo!", "Que carinho!", "Amo você!"][Math.floor(Math.random() * 3)]);
    this.bus.emit("fx:hearts", { x: this.nubi.px(), y: this.nubi.py() - this.nubi.radius() });
    this.bus.emit("fx:confetti", { amount: 0.5 });
    this.audio.fanfare();
    void PETS[pet];
  }

  // ---------------- lojinha ----------------
  openShop() { this.renderShop(); this.shopEl.classList.add("show"); }
  renderShop() {
    const g = this.shopGrid; if (!g) return;
    g.innerHTML = "";
    const total = this.progress.total;
    PRIZES.forEach((p, i) => {
      const owned = this.progress.owned(p.id), ready = this.progress.ready(p);
      const card = document.createElement("button");
      card.className = "prize" + (owned ? " owned" : ready ? " ready" : " locked");
      card.style.animationDelay = (i * 0.03) + "s";
      card.setAttribute("aria-label", owned ? "Prêmio ganho" : ready ? "Ganhar prêmio" : "Prêmio com " + p.price + " estrelinhas");
      const ico = document.createElement("div"); ico.className = "prizeIco";
      ico.appendChild(iconCanvas(64, p.icon));
      card.appendChild(ico);
      const price = document.createElement("div"); price.className = "prizePrice";
      if (owned) price.innerHTML = '<span class="ok">✓</span>';
      else {
        price.appendChild(iconCanvas(18, "star"));
        const n = document.createElement("span"); n.textContent = String(p.price); price.appendChild(n);
      }
      card.appendChild(price);
      if (!owned && !ready) {
        // barrinha de "quase lá" (só enche, nunca esvazia)
        const bar = document.createElement("div"); bar.className = "prizeBar";
        const f = document.createElement("i"); f.style.width = Math.round(Math.min(1, total / p.price) * 100) + "%";
        bar.appendChild(f); card.appendChild(bar);
      }
      card.addEventListener("click", () => {
        if (ready) { this.progress.claim(p.id); this.renderShop(); }
        else if (!owned) { bump(card, "nope"); this.audio.hint(); }
      });
      g.appendChild(card);
    });
  }
  _claimed(p) {
    this._badge();
    this.audio.fanfare();
    this.bus.emit("fx:confetti", { amount: 1 });
    this.nubi.celebrate();
    this.nubi.say({ food: "Comida nova!", decor: "Casa enfeitada!", wear: "Roupa nova!" }[p.kind] || "Oba, prêmio!");
  }

  // ---------------- missões do dia ----------------
  openMissions() { this.renderMissions(); this.missEl.classList.add("show"); }
  renderMissions() {
    const ul = this.missList; if (!ul) return;
    ul.innerHTML = "";
    for (const m of this.progress.missions()) {
      const row = document.createElement("button");
      row.className = "mission" + (m.done ? " done" : "");
      row.appendChild(iconCanvas(56, m.icon));
      const st = document.createElement("div"); st.className = "missionState";
      if (m.done) st.innerHTML = '<span class="ok">✓</span>';
      else { st.appendChild(iconCanvas(20, "star")); const s = document.createElement("span"); s.textContent = "+5"; st.appendChild(s); }
      row.appendChild(st);
      // tocar numa missão leva até o cômodo dela
      row.addEventListener("click", () => { this.missEl.classList.remove("show"); if (!m.done && m.room) this.bus.emit("room:go", m.room); });
      ul.appendChild(row);
    }
  }
  _missionDone({ all }) {
    this._missionBadge();
    this.audio.chime(4);
    this.nubi.say(all ? "Missões feitas!" : "Missão feita!");
    if (all) this.bus.emit("fx:confetti", { amount: 0.8 });
    bump(document.getElementById("btnMissions"));
  }
}
