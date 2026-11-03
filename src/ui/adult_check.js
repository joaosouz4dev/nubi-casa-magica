/* DESAFIO DE ADULTO (segunda etapa da área dos responsáveis, depois de
   segurar o botão por 3s). A instrução é ESCRITA, com o número por extenso
   ("Arraste a bolinha até o número sete"): quem ainda não lê não sabe qual
   dos 6 números escolher, e o adulto resolve em poucos segundos. A voz do
   jogo não lê esta tela. Arrastar a bolinha OU tocar no número valem.
   Errar fecha (precisa segurar de novo); 3 erros seguidos travam por 30s.
   Não é comprovação de idade e nunca pede idade/data de nascimento. */
const WORDS = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
const SPOTS = 6;
const LOCK_AFTER = 3, LOCK_MS = 30000;

export class AdultCheck {
  constructor(audio) {
    this.audio = audio;
    this.el = document.getElementById("gate");
    this.board = document.getElementById("gateSpots");   // grade dos 6 números
    this.ask = document.getElementById("gateAsk");
    this.ball = document.getElementById("gateBall");
    this.fails = 0; this.lockedUntil = 0;
    this.answer = 0; this.onPass = null;
    const close = document.getElementById("gateClose");
    if (close) close.addEventListener("click", () => this.hide());
    if (this.ball) this._wireDrag();
  }

  get locked() { return performance.now() < this.lockedUntil; }
  get isOpen() { return !!(this.el && this.el.classList.contains("show")); }

  /* Mostra um desafio novo; onPass roda só se acertar. */
  open(onPass) {
    if (!this.el || this.locked) return false;
    this.onPass = onPass;
    const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const nums = pool.slice(0, SPOTS);
    this.answer = nums[Math.floor(Math.random() * SPOTS)];
    this.ask.innerHTML = "Arraste a bolinha até o número <b>" + WORDS[this.answer] + "</b>.";
    this.board.querySelectorAll(".gateSpot").forEach(s => s.remove());
    for (const n of nums) {
      const s = document.createElement("button");
      s.className = "gateSpot"; s.textContent = String(n); s.dataset.n = String(n);
      s.setAttribute("aria-label", "Número " + n);
      s.addEventListener("click", () => this._choose(n));
      this.board.appendChild(s);
    }
    this._resetBall();
    this.el.classList.remove("nope");
    this.el.classList.add("show");
    return true;
  }
  hide() { if (this.el) this.el.classList.remove("show"); }

  _choose(n) {
    if (!this.isOpen) return;
    if (n === this.answer) {
      this.fails = 0;
      this.hide();
      const fn = this.onPass; this.onPass = null;
      if (fn) fn();
      return;
    }
    // errou: sacode e fecha; vários erros seguidos travam um pouco
    this.fails++;
    if (this.fails >= LOCK_AFTER) { this.fails = 0; this.lockedUntil = performance.now() + LOCK_MS; }
    this.el.classList.remove("nope"); void this.el.offsetWidth; this.el.classList.add("nope");
    setTimeout(() => this.hide(), 380);
  }

  _resetBall() { this.ball.style.transform = ""; this.ball.classList.remove("held"); }

  // arrastar a bolinha (ponteiro: mouse e toque) e soltar em cima de um número
  _wireDrag() {
    let from = null;
    this.ball.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      from = { x: e.clientX, y: e.clientY };
      this.ball.setPointerCapture(e.pointerId);
      this.ball.classList.add("held");
    });
    this.ball.addEventListener("pointermove", (e) => {
      if (!from) return;
      // o palco pode estar girado (retrato): o deslocamento acompanha o dedo na tela
      const rot = document.body.classList.contains("rot");
      const dx = e.clientX - from.x, dy = e.clientY - from.y;
      this.ball.style.transform = rot ? `translate(${dy}px, ${-dx}px)` : `translate(${dx}px, ${dy}px)`;
    });
    const drop = (e) => {
      if (!from) return;
      from = null;
      this.ball.classList.remove("held");
      const hit = document.elementsFromPoint(e.clientX, e.clientY).find(el => el.classList && el.classList.contains("gateSpot"));
      if (hit) this._choose(Number(hit.dataset.n));
      else this._resetBall();
    };
    this.ball.addEventListener("pointerup", drop);
    this.ball.addEventListener("pointercancel", () => { from = null; this._resetBall(); });
  }
}
