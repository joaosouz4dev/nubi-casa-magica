/* Interface das estrelinhas: POTE no topo (enche até o próximo presente),
   o desenho do próximo presente, coração de carinho, PRESENTE no cômodo,
   lojinha (coleção de prêmios) e missões do dia.
   Sem números para a criança: estrelinha voa até o pote, o pote enche e,
   cheio, um presente aparece ao lado do bichinho; 3 toques abrem.
   Tudo desenhado no estilo do jogo (ícones em canvas, sem emoji). */
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
    this.jarEl = document.getElementById("jar");
    this.jarFill = document.getElementById("jarFill");
    this.nextEl = document.getElementById("nextPrize");
    this.love = document.getElementById("loveMeter");
    this.loveFill = document.getElementById("loveFill");
    this.giftEl = null;            // presente no cômodo (esperando os 3 toques)
    this.shopEl = document.getElementById("shop");
    this.shopGrid = document.getElementById("shopGrid");
    this.missEl = document.getElementById("missions");
    this.missList = document.getElementById("missionList");
    const starIco = document.getElementById("starIco");
    if (starIco) starIco.appendChild(iconCanvas(30, "star"));
    const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener("click", fn); };
    on("btnShop", () => this.openShop());
    on("starPill", () => this.openShop());
    on("shopClose", () => this.shopEl.classList.remove("show"));
    on("btnMissions", () => this.openMissions());
    on("missionsClose", () => this.missEl.classList.remove("show"));

    bus.on("stars:changed", (e) => this._gain(e));
    bus.on("level:up", () => { this._jarFull = true; });       // o pote encheu: presente quando a estrelinha chegar
    bus.on("gift:bonus", () => this._bonus());
    bus.on("achievement:got", (e) => this._achievement(e));
    bus.on("prize:ready", () => { this._badge(); this.audio.chime(3); });
    bus.on("prize:claimed", (p) => this._claimed(p));
    bus.on("love:changed", () => this._renderLove());
    bus.on("love:up", (e) => this._loveUp(e));
    bus.on("mission:done", (e) => this._missionDone(e));
    bus.on("chest:ready", () => { this._missionBadge(); this.audio.chime(5); bump(document.getElementById("btnMissions")); });
    bus.on("chest:opened", () => this._chestOpened());
    this._renderJar(); this._renderLove(); this._badge(); this._missionBadge();
    // presente que ficou sem abrir na última vez continua esperando
    setTimeout(() => this._spawnGift(true), 600);
  }

  // ---------------- pote + próximo presente ----------------
  _renderJar(full) {
    const j = this.progress.jar();
    if (this.jarFill) this.jarFill.style.height = Math.round((full ? 1 : j.frac) * 100) + "%";
    if (this.nextEl) {
      const g = this.progress.nextGift();
      const icon = g ? (g.kind === "prize" ? g.prize.icon : "gift") : (j.prize ? j.prize.icon : "gift");
      if (this.nextEl.dataset.icon !== icon) { this.nextEl.dataset.icon = icon; this.nextEl.innerHTML = ""; this.nextEl.appendChild(iconCanvas(40, icon)); }
      this.nextEl.classList.toggle("ready", !!g);
    }
  }
  _achievement(a) {
    // troféu ganho: festa curta + fala; aparece no álbum depois
    this.nubi.celebrate();
    this.nubi.say("Troféu novo!");
    this.bus.emit("fx:burst", a.at || { x: this.nubi.px(), y: this.nubi.py() - this.nubi.radius() }, "#ffd54a");
    this.audio.chime(5);
    bump(document.getElementById("btnAlbum"));
  }

  // ---------------- estrelinhas voando até o pote ----------------
  _gain({ gained, at }) {
    // estrelinha voando do bichinho até o pote; o pote enche quando a última chega
    const from = at || { x: this.nubi.px(), y: this.nubi.py() - this.nubi.radius() * 1.1 };
    const fly = Math.min(4, gained);
    // pote escondido (minijogo): sem voo. Espera um instante porque o aviso
    // de "pote cheio" (level:up) chega logo depois deste
    if (!this.pill || !this.pill.getClientRects().length) { setTimeout(() => this._landed(), 0); return; }
    for (let i = 0; i < fly; i++) setTimeout(() => this._flyStar(from, i === fly - 1), i * 90);
  }
  _flyStar(from, last) {
    // coordenadas no palco (#stage): o canvas ocupa o palco a partir de (0,0)
    const box = this.jarEl || this.pill;
    const tgt = box ? this.vp.rectToStage(box.getBoundingClientRect()) : { left: this.vp.w / 2, top: 10, width: 40, height: 40 };
    const el = document.createElement("div");
    el.className = "flyStar";
    el.appendChild(iconCanvas(28, "star"));
    (document.getElementById("stage") || document.body).appendChild(el);
    const x0 = from.x - 14, y0 = from.y - 14;
    const x1 = tgt.left + tgt.width / 2 - 14, y1 = tgt.top + tgt.height / 2 - 14;
    const reduce = document.body.classList.contains("reduce-motion");
    const midX = (x0 + x1) / 2 + (Math.random() - 0.5) * 80, midY = Math.min(y0, y1) - 60;
    const anim = el.animate([
      { transform: `translate(${x0}px, ${y0}px) scale(.4)`, opacity: 0 },
      { transform: `translate(${midX}px, ${midY}px) scale(1.25) rotate(90deg)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${x1}px, ${y1}px) scale(.8) rotate(200deg)`, opacity: 1 }
    ], { duration: reduce ? 200 : 750, easing: "cubic-bezier(.45,.05,.4,1)" });
    anim.onfinish = () => {
      el.remove();
      bump(this.pill);
      this.audio.coin(this._coinStep = ((this._coinStep || 0) + 1) % 8);
      if (last) this._landed();
    };
  }
  // a última estrelinha chegou: o pote sobe; se encheu, festa e presente no cômodo
  _landed() {
    if (!this._jarFull) { this._renderJar(); return; }
    this._jarFull = false;
    this._renderJar(true);
    bump(this.jarEl, "full");
    this.audio.chime(5);
    setTimeout(() => { this._renderJar(); this._spawnGift(); }, 650);
  }

  // ---------------- presente no cômodo ----------------
  /* Aparece ao lado do bichinho; 3 toques: balança, balança, abre. O que
     estava dentro pula para fora e vai para o lugar dele (roupa no
     guarda-roupa, comida na geladeira, enfeite na casa). */
  _spawnGift(quiet) {
    if (this.giftEl || !this.progress.nextGift()) return;
    const b = document.createElement("button");
    b.id = "prizeGift"; b.className = "toy"; b.setAttribute("aria-label", "Presente: toque 3 vezes para abrir");
    b.appendChild(iconCanvas(64, "gift"));
    b.dataset.taps = "0";
    b.addEventListener("click", () => this._tapGift());
    (document.getElementById("stage") || document.body).appendChild(b);
    this.giftEl = b;
    this.update();
    this._badge();
    if (!quiet && window.__titleDone !== false) {
      this.nubi.celebrate();
      this.nubi.say("Um presente!");
      const r = this._giftCenter();
      this.bus.emit("fx:burst", { x: r.x, y: r.y, color: "#ffd54a" });
    }
  }
  _giftCenter() { const b = this.giftEl; return b ? { x: b.offsetLeft + b.offsetWidth / 2, y: b.offsetTop + b.offsetHeight / 2 } : { x: 0, y: 0 }; }
  _tapGift() {
    const b = this.giftEl; if (!b || b.classList.contains("open")) return;
    const taps = Number(b.dataset.taps) + 1;
    b.dataset.taps = String(taps);
    const c = this._giftCenter();
    if (taps < 3) {
      bump(b, "shake");
      this.audio.pop();
      this.bus.emit("fx:burst", { x: c.x, y: c.y - 20, color: "#ffd54a", small: true });
      return;
    }
    const g = this.progress.nextGift();
    b.classList.remove("shake"); b.classList.add("open");
    this.audio.sparkle();
    // o que estava dentro pula para fora
    const item = document.createElement("div"); item.className = "giftItem";
    item.appendChild(iconCanvas(72, g && g.kind === "prize" ? g.prize.icon : "star"));
    item.style.left = (c.x - 36) + "px"; item.style.top = (c.y - 36) + "px";
    (document.getElementById("stage") || document.body).appendChild(item);
    setTimeout(() => item.remove(), 1200);
    setTimeout(() => {
      b.remove(); this.giftEl = null;
      this.progress.openGift(g);
      this._renderJar(); this._badge();
      setTimeout(() => this._spawnGift(), 1400);   // mais de um pronto: o próximo aparece depois
    }, 450);
  }
  _bonus() {
    // depois de todos os prêmios: o presente é uma festa
    this.audio.fanfare();
    this.bus.emit("fx:confetti", { amount: 1.2 });
    this.nubi.dance();
    this.nubi.say("Festa!");
  }
  /* Chamado a cada quadro: o presente acompanha o bichinho (no chão, ao lado). */
  update() {
    const b = this.giftEl; if (!b) return;
    const n = this.nubi, vp = this.vp, r = n.radius();
    const size = Math.round(Math.max(64, Math.min(96, vp.h * 0.17)));
    let x = n.px() + r * 1.2;
    if (x + size > vp.w - 12) x = n.px() - r * 1.2 - size;
    let y = n.py() + r * 0.8 - size;
    x = Math.round(Math.max(12, Math.min(vp.w - size - 12, x)));
    y = Math.round(Math.max(vp.hudBottom() + 12, Math.min(vp.h - size - 12, y)));
    const key = x + "," + y + "," + size;
    if (b.dataset.pos !== key) { b.dataset.pos = key; b.style.left = x + "px"; b.style.top = y + "px"; b.style.setProperty("--gift", size + "px"); }
  }
  _badge() {
    // prêmio pronto: o sinal principal é o presente no cômodo; a lojinha só
    // chama quando o presente não está à vista
    const b = document.getElementById("btnShop");
    if (b) b.classList.toggle("ready", this.progress.readyCount() > 0 && !this.giftEl);
  }
  _missionBadge() {
    const b = document.getElementById("btnMissions");
    if (b) b.classList.toggle("ready", this.progress.missions().some(m => !m.done) || this.progress.chestReady());
  }

  // ---------------- carinho ----------------
  _renderLove() {
    const l = this.progress.love();
    const k = Math.min(1, l.pts / loveNeeded(l.lvl));
    if (this.loveFill) this.loveFill.style.height = Math.round(k * 100) + "%";
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
    // sem preços para a criança: ganho (cor + ✓), pronto (brilha), a ganhar
    // (silhueta); só o próximo mostra o quanto o pote já encheu
    const jar = this.progress.jar();
    const nextId = jar.prize ? jar.prize.id : null;
    PRIZES.forEach((p, i) => {
      const owned = this.progress.owned(p.id), ready = this.progress.ready(p);
      const card = document.createElement("button");
      card.className = "prize" + (owned ? " owned" : ready ? " ready" : " locked") + (p.id === nextId ? " next" : "");
      card.style.animationDelay = (i * 0.03) + "s";
      card.setAttribute("aria-label", owned ? "Prêmio ganho" : ready ? "Ganhar prêmio" : "Prêmio com " + p.price + " estrelinhas");
      const ico = document.createElement("div"); ico.className = "prizeIco";
      ico.appendChild(iconCanvas(64, p.icon));
      card.appendChild(ico);
      const price = document.createElement("div"); price.className = "prizePrice";
      if (owned) price.innerHTML = '<span class="ok">✓</span>';
      card.appendChild(price);
      if (p.id === nextId) {
        // barrinha de "quase lá" (é o pote, deitado; só enche)
        const bar = document.createElement("div"); bar.className = "prizeBar";
        const f = document.createElement("i"); f.style.width = Math.round(jar.frac * 100) + "%";
        bar.appendChild(f); card.appendChild(bar);
      }
      card.addEventListener("click", () => {
        if (ready) {
          // o presente pronto é o mesmo que espera no cômodo: some de lá
          if (this.giftEl) { this.giftEl.remove(); this.giftEl = null; }
          this.progress.claim(p.id); this.renderShop(); this._renderJar();
          setTimeout(() => this._spawnGift(), 1400);
        }
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
      else st.appendChild(iconCanvas(22, "star"));          // vale estrelinha (sem número)
      row.appendChild(st);
      // tocar numa missão leva até o cômodo dela
      row.addEventListener("click", () => { this.missEl.classList.remove("show"); if (!m.done && m.room) this.bus.emit("room:go", m.room); });
      ul.appendChild(row);
    }
    // baú do dia: abre com as 3 missões feitas (as bolinhas mostram quantas faltam)
    const ms = this.progress.missions();
    const opened = this.progress.chestOpened(), ready = this.progress.chestReady();
    const chest = document.createElement("button");
    chest.className = "chestRow" + (opened ? " opened" : ready ? " ready" : "");
    chest.setAttribute("aria-label", opened ? "Baú aberto" : ready ? "Abrir o baú" : "Baú do dia");
    chest.appendChild(iconCanvas(64, "chest"));
    const dots = document.createElement("div"); dots.className = "chestDots";
    if (opened) dots.innerHTML = '<span class="ok">✓</span>';
    else ms.forEach(m => { const d = document.createElement("i"); if (m.done) d.className = "on"; dots.appendChild(d); });
    chest.appendChild(dots);
    chest.addEventListener("click", () => {
      if (!this.progress.chestReady()) { bump(chest, "nope"); this.audio.hint(); return; }
      const b = this.vp.rectToStage(chest.getBoundingClientRect());
      this.missEl.classList.remove("show");
      this.progress.openChest({ x: b.left + b.width / 2, y: b.top + b.height / 2 });
    });
    ul.appendChild(chest);
  }
  _chestOpened() {
    this._missionBadge();
    this.audio.fanfare();
    this.bus.emit("fx:confetti", { amount: 1.2 });
    this.nubi.dance();
    this.nubi.say("Baú do dia!");
  }

  // ---------------- presente do dia ----------------
  /* Um presentinho pula no canto ao abrir o jogo (uma vez por dia). Não é
     modal: a criança pode ignorar; tocar dá estrelinhas com festa. */
  offerDailyGift() {
    if (!this.progress.dailyGiftReady() || document.getElementById("dailyGift")) return false;
    const b = document.createElement("button");
    b.id = "dailyGift"; b.className = "toy"; b.setAttribute("aria-label", "Presente do dia");
    b.appendChild(iconCanvas(52, "gift"));
    b.addEventListener("click", () => {
      const r = this.vp.rectToStage(b.getBoundingClientRect());
      const n = this.progress.claimDailyGift({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      b.classList.add("open");
      setTimeout(() => b.remove(), 420);
      if (n) { this.audio.fanfare(); this.bus.emit("fx:confetti", { amount: 0.8 }); this.nubi.celebrate(); this.nubi.say("Presente do dia!"); }
    });
    (document.getElementById("stage") || document.body).appendChild(b);
    return true;
  }
  _missionDone({ all }) {
    this._missionBadge();
    this.audio.chime(4);
    this.nubi.say(all ? "Missões feitas!" : "Missão feita!");
    if (all) this.bus.emit("fx:confetti", { amount: 0.8 });
    bump(document.getElementById("btnMissions"));
  }
}
