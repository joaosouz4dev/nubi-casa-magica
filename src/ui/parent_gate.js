/* Área dos responsáveis protegida por duas etapas: SEGURAR o botão por 3s
   e depois um desafio de leitura (ui/adult_check.js). Reduz acessos de
   criança; NÃO é comprovação de idade, e nunca pede idade/data de
   nascimento. Dentro: três modos (Explorar / Experimentar / Resolver),
   controles de som, limite de tempo e relatório. Sem links externos na
   área infantil. */
import { AdultCheck } from "./adult_check.js";
import { Skill } from "../systems/skill.js";
import { PRIZES, JAR_BONUS } from "../data/prizes.js";

const HOLD_MS = 3000;

export class ParentGate {
  constructor(bus, audio, save) {
    this.bus = bus; this.audio = audio; this.save = save;
    this.el = document.getElementById("parent");
    this.btn = document.getElementById("btnParent");
    this.closeBtn = document.getElementById("parentClose");
    this.holdT = null;
    this.check = new AdultCheck(audio);
    if (this.btn) {
      // 1) SEGURAR 3s (o anel do botão mostra o tempo); 2) desafio de leitura
      const start = (e) => { e.preventDefault(); this.holdT = setTimeout(() => { this.holdT = null; this._held(); }, HOLD_MS); };
      const cancel = () => { if (this.holdT) { clearTimeout(this.holdT); this.holdT = null; } };
      this.btn.addEventListener("touchstart", start, { passive: false });
      this.btn.addEventListener("mousedown", start);
      ["touchend", "touchcancel", "mouseup", "mouseleave"].forEach(ev => this.btn.addEventListener(ev, cancel));
    }
    if (this.closeBtn) this.closeBtn.addEventListener("click", () => this.close());
    this._wireModes();
    this._wireSound();
    this._wireReportAndLimit();
    this._startUsageTracking();
  }
  _held() {
    // travado por erros seguidos: o botão só balança
    if (!this.check.open(() => this.open())) { this.btn.classList.remove("nope"); void this.btn.offsetWidth; this.btn.classList.add("nope"); }
  }
  open() { if (this.el) { this._renderReport(); this.el.classList.add("show"); } }
  close() { if (this.el) this.el.classList.remove("show"); }

  // ---------- acompanhamento de uso (relatório dos responsáveis) ----------
  _today() { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  _usage() {
    const u = this.save.state.usage || {};
    const d = this._today();
    if (!u[d]) u[d] = { secs: 0, care: 0, play: 0, acts: 0 };
    this.save.state.usage = u;
    return u[d];
  }
  _startUsageTracking() {
    // tempo de jogo: acumula enquanto a aba está visível
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      if (!document.hidden) {
        const todayU = this._usage();
        todayU.secs += Math.min(5, (now - last) / 1000);
      }
      last = now;
    };
    this._usageTimer = setInterval(tick, 2000);
    // tipos de atividade
    const CARE = /^(feed:|foam|rinse$|dry$|comb$|ears$|teeth:|pet$|tummy$|poop:|duck$|garden:)/;
    const PLAY = /^(game:|basket|bounce|look$|hair|nails|makeup|paint)/;
    this.bus.on("act", (a) => {
      if (typeof a !== "string") return;
      const u = this._usage();
      u.acts++;
      if (CARE.test(a)) u.care++;
      else if (PLAY.test(a)) u.play++;
      // salva de vez em quando (não a cada ação)
      if (u.acts % 5 === 0) this.save.persist();
    });
    // limite de tempo: checa periodicamente
    this._limitTimer = setInterval(() => this._checkLimit(), 10000);
  }
  _wireReportAndLimit() {
    const sel = document.getElementById("cfgLimit");
    if (sel) {
      sel.value = String(this.save.state.playLimitMin || 0);
      sel.addEventListener("change", () => { this.save.state.playLimitMin = parseInt(sel.value, 10) || 0; this.save.persist(); });
    }
  }
  _checkLimit() {
    const lim = this.save.state.playLimitMin || 0;
    if (!lim || document.hidden) return;
    const u = this._usage();
    if (u.secs >= lim * 60 && !u._limitHit) {
      u._limitHit = true; this.save.persist();
      // bedtime gentil: o Nubi vai dormir, sem bloquear bruscamente
      this.bus.emit("playlimit:reached");
    }
  }
  _renderReport() {
    const box = document.getElementById("parentReport");
    if (!box) return;
    const u = this.save.state.usage || {};
    const days = Object.keys(u).sort().slice(-7).reverse();
    const fmt = (s) => s >= 60 ? Math.round(s / 60) + " min" : Math.round(s) + " s";
    const label = (d) => { const [y, m, dd] = d.split("-"); return dd + "/" + m; };
    let html = "<table class='report'><tr><th>Dia</th><th>Tempo</th><th>Cuidar</th><th>Brincar</th></tr>";
    if (!days.length) html += "<tr><td colspan='4'>Ainda sem registro.</td></tr>";
    for (const d of days) { const r = u[d]; html += `<tr><td>${label(d)}</td><td>${fmt(r.secs || 0)}</td><td>${r.care || 0}</td><td>${r.play || 0}</td></tr>`; }
    html += "</table>";
    // estrelinhas e presentes: a criança só vê o pote; os números ficam aqui
    const st = this.save.state.stars || {};
    const total = st.total || 0, owned = PRIZES.filter(p => st.claimed && st.claimed[p.id]).length;
    const next = PRIZES.map(p => p.price).sort((a, b) => a - b).find(x => x > total);
    html += `<p class='hint'>Estrelinhas: ${total}. Presentes abertos: ${owned} de ${PRIZES.length}. ` +
      (next ? `Próximo presente com ${next} estrelinhas.` : `Todos os prêmios ganhos; a cada ${JAR_BONUS} estrelinhas vem um presente-festa.`) + "</p>";
    // minijogos: a dificuldade acompanha a criança (systems/skill.js)
    const games = new Skill(this.save).summary();
    if (games.length) {
      html += "<table class='report'><tr><th>Minijogo</th><th>Degrau</th><th>Acerto</th><th>Partidas</th></tr>";
      for (const g of games) html += `<tr><td>${g.name}</td><td>${g.step} de ${g.of}</td><td>${g.avg}%</td><td>${g.plays}</td></tr>`;
      html += "</table><p class='hint'>A dificuldade de cada minijogo sobe depois de 2 partidas com 85% de acerto ou mais e desce depois de 2 abaixo de 60%. O modo de brincadeira define até onde sobe.</p>";
    }
    box.innerHTML = html;
  }

  _wireModes() {
    const modes = document.querySelectorAll("[data-mode]");
    const current = this.save.state.mode || "explore";
    modes.forEach(m => {
      if (m.getAttribute("data-mode") === current) m.classList.add("active");
      m.addEventListener("click", () => {
        modes.forEach(x => x.classList.remove("active"));
        m.classList.add("active");
        const mode = m.getAttribute("data-mode");
        this.save.state.mode = mode; this.save.persist();
        this.bus.emit("mode:changed", mode);
        this._renderReport();   // o teto dos degraus depende do modo
      });
    });
  }
  _wireSound() {
    const toggles = { music: "cfgMusic", sfx: "cfgSfx", voice: "cfgVoice" };
    for (const [chan, id] of Object.entries(toggles)) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.checked = this.audio.enabled[chan];
      el.addEventListener("change", () => { this.audio.enabled[chan] = el.checked; });
    }
    const reduce = document.getElementById("cfgReduce");
    if (reduce) {
      reduce.checked = !!this.save.state.reduceMotion;
      reduce.addEventListener("change", () => { this.save.state.reduceMotion = reduce.checked; this.save.persist(); this.bus.emit("reduceMotion:changed", reduce.checked); });
    }
  }
}
