/* Área dos responsáveis protegida por uma barreira simples (segurar o botão
   por um instante) — reduz acessos acidentais; NÃO é comprovação de idade,
   e nunca pede idade/data de nascimento. Dentro: três modos (Explorar /
   Experimentar / Resolver) e controles de som. Sem links externos na área
   infantil. */
export class ParentGate {
  constructor(bus, audio, save) {
    this.bus = bus; this.audio = audio; this.save = save;
    this.el = document.getElementById("parent");
    this.btn = document.getElementById("btnParent");
    this.closeBtn = document.getElementById("parentClose");
    this.holdT = null;
    if (this.btn) {
      // precisa SEGURAR ~1.2s para abrir (barreira contra toque acidental)
      const start = (e) => { e.preventDefault(); this.holdT = setTimeout(() => this.open(), 1200); };
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
