/* VOZ do bichinho: fala em voz alta os balões (reações, elogios), os
   pedidos e o nome do cômodo, para quem ainda não lê.
   De onde vem a voz, nesta ordem:
     1. gravação em assets/voice/<id>.mp3 (data/voice_lines.js: RECORDED);
     2. voz do aparelho no APK (plugin TextToSpeech do Capacitor);
     3. voz do navegador (speechSynthesis, pt-BR);
     4. nada: o jogo continua funcionando só com o desenho e o balão.
   Regras: segue o canal "falas" do áudio (desligável pelos responsáveis e
   pelo botão de som); a mesma frase não repete em 2,5s; reação interrompe
   o que estiver sendo falado; pedido espera a fala atual terminar; a
   música abaixa enquanto o bichinho fala. Cada bichinho tem um tom. */
import { voiceId, RECORDED } from "../data/voice_lines.js";

const PITCH = { nubi: 1.35, bunny: 1.6, bear: 1.05 };
const REPEAT_MS = 2500;

export class Voice {
  constructor({ audio, save }) {
    this.audio = audio; this.save = save;
    this.log = [];                 // últimas falas (testes e depuração)
    this.speaking = false;
    this._last = {};
    this._pending = null;          // pedido esperando a fala atual acabar
    this._clip = null;
    this._tok = 0;                 // cada fala tem um número: fim atrasado de uma fala antiga não encerra a nova
    this._web = typeof speechSynthesis !== "undefined" ? speechSynthesis : null;
    this._webVoice = null;
    this._native = this._nativeTTS();
    if (this._web) {
      try {
        this._pickVoice();
        if (this._web.addEventListener) this._web.addEventListener("voiceschanged", () => this._pickVoice());
      } catch (e) { this._web = null; }
    }
  }

  /* Voz do aparelho no APK. O jogo não carrega o @capacitor/core, então não
     existe Capacitor.registerPlugin: chama o plugin pela ponte nativa que o
     Android injeta (Capacitor.nativePromise). Qualquer falha = sem voz
     nativa; nunca derruba o jogo. */
  _nativeTTS() {
    try {
      const cap = window.Capacitor;
      if (!cap || typeof cap.nativePromise !== "function" || !(cap.isNativePlatform && cap.isNativePlatform())) return null;
      if (typeof cap.isPluginAvailable === "function" && !cap.isPluginAvailable("TextToSpeech")) return null;
      return {
        speak: (opts) => cap.nativePromise("TextToSpeech", "speak", opts),
        stop: () => cap.nativePromise("TextToSpeech", "stop", {})
      };
    } catch (e) { return null; }
  }

  get enabled() { return !!(this.audio && this.audio.enabled.voice); }
  get backend() { return this._native ? "native" : (this._web ? "web" : "none"); }

  // voz pt-BR do navegador: prefere a que funciona sem internet e, entre
  // essas, uma voz feminina/leve (o tom agudo do bichinho fica mais natural)
  _pickVoice() {
    const vs = (this._web.getVoices() || []).filter(v => /^pt[-_]BR/i.test(v.lang));
    const all = vs.length ? vs : (this._web.getVoices() || []).filter(v => /^pt/i.test(v.lang));
    const soft = (v) => /maria|francisca|luciana|thalita|vitoria|leila|female|feminin/i.test(v.name);
    const score = (v) => (v.localService ? 2 : 0) + (soft(v) ? 1 : 0);
    this._webVoice = all.slice().sort((a, b) => score(b) - score(a))[0] || null;
  }
  get voiceName() { return this._native ? "aparelho" : (this._webVoice ? this._webVoice.name : null); }

  /* Reação/elogio (balão do bichinho): fala já, interrompendo. */
  say(text) { this._speak(text, true); }

  /* Pedido: não interrompe; se algo está sendo falado, fala logo depois. */
  wish(text) {
    if (!text) return;
    if (this.speaking) { this._pending = text; return; }
    this._speak(text, false);
  }

  stop() {
    this._pending = null;
    this._tok++;
    if (this._clip) { try { this._clip.pause(); } catch (e) { /* ok */ } this._clip = null; }
    try { if (this._native) this._native.stop().catch(() => {}); } catch (e) { /* sem voz nativa */ }
    try { if (this._web) this._web.cancel(); } catch (e) { /* sem voz do navegador */ }
    this._done();
  }

  _speak(text, interrupt) {
    if (!text || !this.enabled || document.hidden) return;
    const now = performance.now();
    if (this._last[text] && now - this._last[text] < REPEAT_MS) return;
    this._last[text] = now;
    if (interrupt && this.speaking) this.stop();
    const id = voiceId(text);
    const pet = this.save && this.save.currentPet ? this.save.currentPet() : "nubi";
    const pitch = PITCH[pet] || PITCH.nubi;
    const via = RECORDED.has(id) ? "clip" : this.backend;
    this.log.push({ text, via, at: Math.round(now) }); if (this.log.length > 30) this.log.shift();
    if (via === "none") return;
    this.speaking = true;
    if (this.audio.duckMusic) this.audio.duckMusic(true);
    const tok = ++this._tok;
    const end = () => { if (tok === this._tok) this._done(); };
    try {
      if (via === "clip") {
        const a = new window.Audio("assets/voice/" + id + ".mp3");
        a.volume = 0.95; a.onended = end; a.onerror = end;
        this._clip = a;
        a.play().catch(end);
      } else if (via === "native") {
        this._native.speak({ text, lang: "pt-BR", rate: 1.0, pitch, volume: 1.0, category: "ambient" }).then(end, end);
      } else {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "pt-BR"; u.rate = 1.0; u.pitch = Math.min(2, pitch); u.volume = 1;
        if (this._webVoice) u.voice = this._webVoice;
        u.onend = end; u.onerror = end;
        this._web.speak(u);
      }
    } catch (e) { end(); return; }   // falhou ao falar: segue sem voz
    // garantia: algumas vozes não avisam o fim
    clearTimeout(this._guard);
    this._guard = setTimeout(end, 1200 + text.length * 90);
  }

  _done() {
    if (!this.speaking) return;
    this.speaking = false;
    this._clip = null;
    clearTimeout(this._guard);
    if (this.audio.duckMusic) this.audio.duckMusic(false);
    if (this._pending) { const t = this._pending; this._pending = null; setTimeout(() => this.wish(t), 250); }
  }
}
