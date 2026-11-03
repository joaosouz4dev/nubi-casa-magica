/* VOZ do bichinho: só voz HUMANA gravada. Cada fala (balões, pedidos, nome
   do cômodo) toca assets/voice/<id>.mp3 se essa gravação existir
   (data/voice_lines.js: RECORDED; a lista para gravar sai de
   scripts/voice-lines.mjs). Sem gravação, fica em silêncio e o jogo segue
   com o desenho, o balão e os sons de sempre. A voz sintetizada (do
   aparelho e do navegador) foi tirada: soava robótica.
   Regras: segue o canal "falas" do áudio (desligável pelos responsáveis e
   pelo botão de som); a mesma frase não repete em 2,5s; reação interrompe
   o que estiver tocando; pedido espera a fala atual terminar; a música
   abaixa enquanto o bichinho fala. Qualquer falha = silêncio. */
import { voiceId, RECORDED } from "../data/voice_lines.js";

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
  }

  get enabled() { return !!(this.audio && this.audio.enabled.voice); }
  // "clip" quando há alguma gravação; senão "none" (silêncio)
  get backend() { return RECORDED.size ? "clip" : "none"; }

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
    this._done();
  }

  _speak(text, interrupt) {
    if (!text || !this.enabled || document.hidden) return;
    const now = performance.now();
    if (this._last[text] && now - this._last[text] < REPEAT_MS) return;
    this._last[text] = now;
    const id = voiceId(text);
    const via = RECORDED.has(id) ? "clip" : "none";
    this.log.push({ text, via, at: Math.round(now) }); if (this.log.length > 30) this.log.shift();
    if (via === "none") return;
    if (interrupt && this.speaking) this.stop();
    this.speaking = true;
    if (this.audio.duckMusic) this.audio.duckMusic(true);
    const tok = ++this._tok;
    const end = () => { if (tok === this._tok) this._done(); };
    try {
      const a = new window.Audio("assets/voice/" + id + ".mp3");
      a.volume = 0.95; a.onended = end; a.onerror = end;
      this._clip = a;
      a.play().catch(end);
    } catch (e) { end(); return; }   // falhou ao tocar: segue em silêncio
    // garantia: se o áudio não avisar o fim
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
