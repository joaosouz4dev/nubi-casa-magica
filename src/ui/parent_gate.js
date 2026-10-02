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
  }
  open() { if (this.el) this.el.classList.add("show"); }
  close() { if (this.el) this.el.classList.remove("show"); }

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
