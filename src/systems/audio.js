/* Áudio sintetizado em runtime (Web Audio), sem arquivos.
   Cadeia: cada som -> barramento do canal (música/efeitos/falas) -> master
   (compressor suave) -> saída, com um envio para um reverb curto gerado por
   código (sala pequena e macia). Os timbres são em camadas: oscilador
   principal + uma cópia levemente desafinada (chorus) + um harmônico, com
   filtro passa-baixa e envelope com ataque/soltura suaves — nada de bipes
   secos. A música de fundo é uma caixinha de música bem baixa, diferente
   por cômodo, agendada com antecedência para não depender do FPS.
   O briefing exige que a brincadeira funcione com som desligado: nada aqui
   é obrigatório para jogar, e cada canal é desligável. */

const THEMES = {
  // escala (semitons a partir da tônica), tônica em Hz, batidas por minuto, timbre
  hub:     { root: 392.0, scale: [0, 2, 4, 7, 9], bpm: 84, wave: "triangle", pad: [0, 7] },
  kitchen: { root: 440.0, scale: [0, 2, 4, 7, 9], bpm: 96, wave: "triangle", pad: [0, 4] },
  bathroom:{ root: 349.2, scale: [0, 2, 5, 7, 9], bpm: 78, wave: "sine", pad: [0, 7] },
  bedroom: { root: 329.6, scale: [0, 3, 5, 7, 10], bpm: 66, wave: "sine", pad: [0, 3] },
  dentist: { root: 466.2, scale: [0, 2, 4, 7, 9], bpm: 100, wave: "triangle", pad: [0, 4] },
  salon:   { root: 415.3, scale: [0, 2, 4, 7, 11], bpm: 90, wave: "triangle", pad: [0, 4] },
  games:   { root: 493.9, scale: [0, 2, 4, 7, 9], bpm: 112, wave: "square", pad: [0, 7] }
};

export class Audio {
  constructor() {
    this.ctx = null;
    this.enabled = { music: true, sfx: true, voice: true };
    this.theme = "hub";
    this._musicTimer = null;
    this._nextNote = 0;
    this._step = 0;
  }
  init() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { this.ctx = null; return; }
    const c = this.ctx;
    this.master = c.createDynamicsCompressor();
    this.master.threshold.value = -16; this.master.ratio.value = 3;
    this.master.connect(c.destination);
    // reverb: ruído com decaimento exponencial (~1,1s), estéreo
    this.verb = c.createConvolver();
    const len = Math.floor(c.sampleRate * 1.1), buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    this.verb.buffer = buf;
    this.verbGain = c.createGain(); this.verbGain.gain.value = 0.22;
    this.verb.connect(this.verbGain).connect(this.master);
    this.bus = {};
    for (const [k, v] of [["sfx", 0.9], ["voice", 0.9], ["music", 0.5]]) {
      const g = c.createGain(); g.gain.value = v; g.connect(this.master); g.connect(this.verb);
      this.bus[k] = g;
    }
    this._noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const nd = this._noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this._startMusic();
  }
  resume() { if (this.ctx && this.ctx.state === "suspended") this.ctx.resume(); }

  /* Uma nota em camadas. chan escolhe o barramento. */
  _tone({ freq = 440, type = "sine", dur = 0.18, gain = 0.25, slideTo = null, at = 0, chan = "sfx", attack = 0.012, cutoff = 4200, detune = 7, harm = 0.18, when = null }) {
    if (!this.ctx) return;
    const c = this.ctx, t = when !== null ? when : c.currentTime + at;
    const out = c.createGain();
    const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = cutoff; f.Q.value = 0.6;
    f.connect(out); out.connect(this.bus[chan] || this.bus.sfx);
    const rel = Math.max(0.06, dur * 0.6);
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(gain, t + attack);
    out.gain.setTargetAtTime(gain * 0.55, t + attack, dur * 0.4);
    out.gain.setTargetAtTime(0.0001, t + dur, rel / 3);
    const layers = [[1, 0, 1], [1, detune, 0.45], [2, 0, harm]];
    for (const [mul, cents, lv] of layers) {
      if (lv <= 0) continue;
      const o = c.createOscillator(), g = c.createGain();
      o.type = mul === 2 ? "sine" : type;
      o.frequency.setValueAtTime(freq * mul, t);
      o.detune.value = cents;
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo * mul, t + dur);
      g.gain.value = lv * (type === "square" || type === "sawtooth" ? 0.35 : 1);
      o.connect(g).connect(f);
      o.start(t); o.stop(t + dur + rel + 0.05);
    }
  }
  /* Ruído filtrado (água, escova, descarga, sopro). */
  _noiseBurst({ dur = 0.2, gain = 0.1, freq = 1800, q = 1.2, type = "bandpass", slideTo = null, at = 0 }) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + at;
    const s = c.createBufferSource(); s.buffer = this._noise;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (slideTo) f.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.03, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.bus.sfx);
    s.start(t); s.stop(t + dur + 0.02);
  }

  /* ---------- música de fundo ---------- */
  setTheme(id) { this.theme = THEMES[id] ? id : "hub"; this._step = 0; }
  _startMusic() {
    if (this._musicTimer || !this.ctx) return;
    this._nextNote = this.ctx.currentTime + 0.3;
    this._musicTimer = setInterval(() => this._schedule(), 120);
  }
  _schedule() {
    const c = this.ctx;
    if (!c || c.state !== "running") return;
    const th = THEMES[this.theme];
    const beat = 60 / th.bpm / 2;   // colcheias
    if (this._nextNote < c.currentTime) this._nextNote = c.currentTime + 0.05;
    while (this._nextNote < c.currentTime + 0.5) {
      if (this.enabled.music) {
        const s = this._step;
        // melodia: passeio na escala pentatônica, com pausas (respira)
        const pattern = [0, 2, 4, -1, 3, 1, 2, -1, 4, 3, 1, -1, 2, 0, 1, -1];
        const deg = pattern[s % 16];
        const oct = (s >> 4) % 2 ? 2 : 1;
        if (deg >= 0) {
          const semi = th.scale[deg % th.scale.length];
          this._tone({ freq: th.root * oct * Math.pow(2, semi / 12), type: th.wave, dur: beat * 1.6, gain: 0.05, chan: "music", attack: 0.01, cutoff: 2600, harm: 0.25, when: this._nextNote });
        }
        // baixo/pad a cada compasso
        if (s % 8 === 0) {
          for (const p of th.pad) this._tone({ freq: th.root / 2 * Math.pow(2, p / 12), type: "sine", dur: beat * 7, gain: 0.035, chan: "music", attack: 0.25, cutoff: 900, harm: 0, when: this._nextNote });
        }
      }
      this._nextNote += beat; this._step++;
    }
  }

  /* ---------- falas do bichinho ---------- */
  voiceHappy() {
    if (!this.enabled.voice) return;
    this._tone({ freq: 440, slideTo: 680, type: "triangle", dur: 0.13, gain: 0.2, chan: "voice", cutoff: 2600 });
    this._tone({ freq: 660, slideTo: 920, type: "triangle", dur: 0.16, gain: 0.18, at: 0.11, chan: "voice", cutoff: 2600 });
  }
  giggle() {
    if (!this.enabled.voice) return;
    for (let i = 0; i < 5; i++) this._tone({ freq: 720 + (i % 2) * 140 - i * 12, slideTo: 940 - i * 20, type: "triangle", dur: 0.07, gain: 0.14, at: i * 0.085, chan: "voice", cutoff: 3000 });
  }
  purr() {
    if (!this.enabled.voice) return;
    this._tone({ freq: 330, slideTo: 290, type: "sine", dur: 0.5, gain: 0.14, chan: "voice", attack: 0.08, detune: 18 });
    this._tone({ freq: 495, slideTo: 440, type: "sine", dur: 0.4, gain: 0.05, at: 0.05, chan: "voice", attack: 0.08 });
  }
  yawn() {
    if (!this.enabled.voice) return;
    this._tone({ freq: 380, slideTo: 640, type: "triangle", dur: 0.38, gain: 0.15, chan: "voice", attack: 0.06, cutoff: 1800 });
    this._tone({ freq: 640, slideTo: 400, type: "triangle", dur: 0.34, gain: 0.13, at: 0.36, chan: "voice", cutoff: 1500 });
  }

  /* ---------- efeitos ---------- */
  chew() {
    if (!this.enabled.sfx) return;
    for (let i = 0; i < 3; i++) {
      this._noiseBurst({ dur: 0.06, gain: 0.12, freq: 900 - i * 80, q: 2, at: i * 0.15 });
      this._tone({ freq: 170 + i * 12, type: "sine", dur: 0.07, gain: 0.12, at: i * 0.15, cutoff: 800, harm: 0 });
    }
  }
  magic() {
    if (!this.enabled.sfx) return;
    [523, 659, 784, 1046, 1318].forEach((f, i) =>
      this._tone({ freq: f, type: "sine", dur: 0.3, gain: 0.13, at: i * 0.05, harm: 0.3 }));
    this._noiseBurst({ dur: 0.4, gain: 0.03, freq: 6000, q: 0.8, type: "highpass" });
  }
  whistle() {
    if (!this.enabled.sfx) return;
    this._tone({ freq: 900, slideTo: 1500, type: "sine", dur: 0.5, gain: 0.13, harm: 0, detune: 3 });
    this._noiseBurst({ dur: 0.5, gain: 0.02, freq: 1400, q: 6 });
  }
  duck() {
    if (!this.enabled.sfx) return;
    this._tone({ freq: 560, slideTo: 320, type: "square", dur: 0.18, gain: 0.12, cutoff: 1800 });
    this._noiseBurst({ dur: 0.12, gain: 0.03, freq: 1200, q: 3 });
  }
  bounce() {
    if (!this.enabled.sfx) return;
    this._tone({ freq: 200, slideTo: 440, type: "sine", dur: 0.12, gain: 0.18, harm: 0.1 });
  }
  chime(step = 0) {
    if (!this.enabled.sfx) return;
    const scale = [523, 659, 784, 988, 1175, 1318];
    const f = scale[Math.min(step, scale.length - 1)];
    this._tone({ freq: f, type: "triangle", dur: 0.35, gain: 0.17, harm: 0.35 });
    this._tone({ freq: f * 1.5, type: "sine", dur: 0.3, gain: 0.05, at: 0.04 });
  }
  fanfare() {
    if (!this.enabled.sfx) return;
    const notes = [523, 659, 784, 1046, 784, 1046];
    notes.forEach((f, i) => {
      const last = i === notes.length - 1;
      this._tone({ freq: f, type: "triangle", dur: last ? 0.6 : 0.15, gain: 0.15, at: i * 0.11, harm: 0.3 });
      if (last) for (const k of [1.25, 1.5]) this._tone({ freq: f * k, type: "sine", dur: 0.6, gain: 0.06, at: i * 0.11 });
    });
  }
  hint() {
    if (!this.enabled.sfx) return;
    this._tone({ freq: 880, type: "sine", dur: 0.14, gain: 0.07 });
    this._tone({ freq: 1175, type: "sine", dur: 0.18, gain: 0.06, at: 0.1 });
  }
  scrub() {
    if (!this.enabled.sfx) return;
    this._noiseBurst({ dur: 0.08, gain: 0.06, freq: 3200 + Math.random() * 1200, q: 1.5 });
  }
  sparkle() {
    if (!this.enabled.sfx) return;
    for (const [f, a] of [[1568, 0], [2093, 0.06], [2637, 0.12]]) this._tone({ freq: f, type: "sine", dur: 0.18, gain: 0.06, at: a, harm: 0 });
  }
  pop() {
    if (!this.enabled.sfx) return;
    this._tone({ freq: 280, slideTo: 980, type: "sine", dur: 0.11, gain: 0.16, harm: 0 });
    this._noiseBurst({ dur: 0.04, gain: 0.05, freq: 2500, q: 1 });
  }
  click() {
    if (!this.enabled.sfx) return;
    this._tone({ freq: 1300, type: "triangle", dur: 0.035, gain: 0.1, harm: 0 });
    this._tone({ freq: 760, type: "triangle", dur: 0.05, gain: 0.08, at: 0.04, harm: 0 });
  }
  flush() {
    if (!this.enabled.sfx) return;
    this._noiseBurst({ dur: 1.0, gain: 0.12, freq: 1800, q: 0.9, slideTo: 300 });
    this._tone({ freq: 700, slideTo: 200, type: "sine", dur: 0.8, gain: 0.05, at: 0.1, harm: 0 });
  }
  plop() {
    if (!this.enabled.sfx) return;
    this._tone({ freq: 460, slideTo: 170, type: "sine", dur: 0.13, gain: 0.17, harm: 0 });
  }
  honk() {
    if (!this.enabled.sfx) return;
    for (const a of [0, 0.22]) this._tone({ freq: 392, type: "sawtooth", dur: 0.15, gain: 0.08, at: a, cutoff: 1400, detune: 15 });
  }
  /* minijogos e recompensas */
  coin(step = 0) {
    if (!this.enabled.sfx) return;
    const f = 988 * Math.pow(2, Math.min(step, 12) / 24);
    this._tone({ freq: f, type: "square", dur: 0.07, gain: 0.07, cutoff: 3500, harm: 0 });
    this._tone({ freq: f * 1.335, type: "square", dur: 0.16, gain: 0.07, at: 0.06, cutoff: 3500, harm: 0 });
  }
  note(i = 0) {
    if (!this.enabled.sfx) return;
    const scale = [0, 2, 4, 7, 9, 12];
    this._tone({ freq: 523.25 * Math.pow(2, scale[i % scale.length] / 12), type: "triangle", dur: 0.45, gain: 0.18, harm: 0.4, attack: 0.008 });
  }
  whoosh() {
    if (!this.enabled.sfx) return;
    this._noiseBurst({ dur: 0.3, gain: 0.06, freq: 600, q: 1.2, slideTo: 2400 });
  }
  tada() {
    if (!this.enabled.sfx) return;
    this.fanfare();
    this._noiseBurst({ dur: 0.6, gain: 0.03, freq: 7000, q: 0.7, type: "highpass", at: 0.5 });
  }
}
