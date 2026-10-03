/* Áudio: vocalizações curtas e originais geradas em runtime (Web Audio).
   Controles separados por canal (música/efeitos/falas) — o briefing exige
   que a brincadeira funcione mesmo com som desligado, então nada de áudio
   é obrigatório para jogar. */
export class Audio {
  constructor() {
    this.ctx = null;
    this.enabled = { music: true, sfx: true, voice: true };
  }
  init() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch { this.ctx = null; }
  }
  resume() { if (this.ctx && this.ctx.state === "suspended") this.ctx.resume(); }

  _tone({ freq = 440, type = "sine", dur = 0.18, gain = 0.25, slideTo = null, at = 0 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + at;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // "fala" curta do Nubi: dois tons amistosos que sobem (voz de criaturinha)
  voiceHappy() {
    if (!this.enabled.voice) return;
    this._tone({ freq: 440, slideTo: 660, type: "triangle", dur: 0.12, gain: 0.22, at: 0 });
    this._tone({ freq: 660, slideTo: 880, type: "triangle", dur: 0.14, gain: 0.2, at: 0.1 });
  }
  // som de mastigar: pulsos curtos e abafados
  chew() {
    if (!this.enabled.sfx) return;
    for (let i = 0; i < 3; i++) {
      this._tone({ freq: 180 + i * 10, type: "square", dur: 0.06, gain: 0.12, at: i * 0.14 });
    }
  }
  // "plim" mágico da transformação
  magic() {
    if (!this.enabled.sfx) return;
    [523, 784, 1046].forEach((f, i) =>
      this._tone({ freq: f, type: "sine", dur: 0.22, gain: 0.18, at: i * 0.06 }));
  }
  // assobio suave (efeito pera)
  whistle() {
    if (!this.enabled.sfx) return;
    this._tone({ freq: 900, slideTo: 1500, type: "sine", dur: 0.5, gain: 0.16, at: 0 });
  }
  // patinho de borracha
  duck() {
    if (!this.enabled.sfx) return;
    this._tone({ freq: 520, slideTo: 300, type: "square", dur: 0.18, gain: 0.14, at: 0 });
  }
  // bola quicando
  bounce() {
    if (!this.enabled.sfx) return;
    this._tone({ freq: 240, slideTo: 420, type: "sine", dur: 0.1, gain: 0.16, at: 0 });
  }
  // passo de pedido concluído: nota que SOBE a cada passo (sensação de avanço)
  chime(step = 0) {
    if (!this.enabled.sfx) return;
    const scale = [523, 659, 784, 988, 1175];
    const f = scale[Math.min(step, scale.length - 1)];
    this._tone({ freq: f, type: "triangle", dur: 0.28, gain: 0.2, at: 0 });
    this._tone({ freq: f * 2, type: "sine", dur: 0.2, gain: 0.07, at: 0.02 });
  }
  // capítulo concluído: pequena fanfarra
  fanfare() {
    if (!this.enabled.sfx) return;
    [523, 659, 784, 1046, 784, 1046].forEach((f, i) =>
      this._tone({ freq: f, type: "triangle", dur: i === 5 ? 0.45 : 0.14, gain: 0.18, at: i * 0.11 }));
  }
  // risadinha (cócegas na barriga)
  giggle() {
    if (!this.enabled.voice) return;
    for (let i = 0; i < 4; i++) this._tone({ freq: 700 + (i % 2) * 120, slideTo: 900, type: "triangle", dur: 0.07, gain: 0.15, at: i * 0.09 });
  }
  // "hmmm" de carinho
  purr() {
    if (!this.enabled.voice) return;
    this._tone({ freq: 330, slideTo: 300, type: "sine", dur: 0.4, gain: 0.14, at: 0 });
  }
  // bocejo/espreguiçar ao acordar
  yawn() {
    if (!this.enabled.voice) return;
    this._tone({ freq: 380, slideTo: 620, type: "triangle", dur: 0.35, gain: 0.16, at: 0 });
    this._tone({ freq: 620, slideTo: 420, type: "triangle", dur: 0.3, gain: 0.14, at: 0.33 });
  }
  // dica sonora suave (sem repetir instrução falada)
  hint() {
    if (!this.enabled.sfx) return;
    this._tone({ freq: 880, type: "sine", dur: 0.12, gain: 0.08, at: 0 });
    this._tone({ freq: 1175, type: "sine", dur: 0.14, gain: 0.07, at: 0.1 });
  }
  // escovar / esfregar: chiadinho curto
  scrub() {
    if (!this.enabled.sfx) return;
    this._tone({ freq: 1400 + Math.random() * 300, slideTo: 900, type: "triangle", dur: 0.06, gain: 0.05, at: 0 });
  }
  // brilho de limpinho
  sparkle() {
    if (!this.enabled.sfx) return;
    this._tone({ freq: 1568, type: "sine", dur: 0.12, gain: 0.08, at: 0 });
    this._tone({ freq: 2093, type: "sine", dur: 0.16, gain: 0.06, at: 0.06 });
  }
  // bichinho de açúcar indo embora
  pop() {
    if (!this.enabled.sfx) return;
    this._tone({ freq: 300, slideTo: 900, type: "sine", dur: 0.12, gain: 0.16, at: 0 });
  }
  // dente encaixando
  click() {
    if (!this.enabled.sfx) return;
    this._tone({ freq: 1200, type: "square", dur: 0.03, gain: 0.08, at: 0 });
    this._tone({ freq: 700, type: "square", dur: 0.04, gain: 0.07, at: 0.04 });
  }
  // descarga
  flush() {
    if (!this.enabled.sfx) return;
    this._tone({ freq: 500, slideTo: 120, type: "sawtooth", dur: 0.7, gain: 0.05, at: 0 });
    this._tone({ freq: 900, slideTo: 300, type: "sine", dur: 0.6, gain: 0.06, at: 0.08 });
  }
  // casquinha caindo na lixeira
  plop() {
    if (!this.enabled.sfx) return;
    this._tone({ freq: 420, slideTo: 180, type: "sine", dur: 0.12, gain: 0.16, at: 0 });
  }
  // buzina do caminhão
  honk() {
    if (!this.enabled.sfx) return;
    this._tone({ freq: 392, type: "square", dur: 0.14, gain: 0.08, at: 0 });
    this._tone({ freq: 392, type: "square", dur: 0.18, gain: 0.08, at: 0.2 });
  }
}
