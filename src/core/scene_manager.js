/* Gerenciador de cenas/cômodos. O Nubi é compartilhado entre os cômodos
   (sua aparência persiste ao trocar de ambiente - requisito do briefing).
   Cada cômodo (room) implementa: enter(), exit(), update(dt), draw().
   A troca de cômodo nunca bloqueia por desempenho/pontuação.

   Transição: a troca LÓGICA é imediata (o toque já funciona no cômodo novo),
   e a troca VISUAL é animada - o quadro anterior é fotografado e desliza
   para o lado enquanto some, revelando o cômodo novo. */
import { Ease, Motion, clamp } from "./anim.js";

const ORDER = ["kitchen", "bathroom", "bedroom", "dentist", "salon"];
const DURATION = 520;

export class SceneManager {
  constructor(bus, vp) {
    this.bus = bus;
    this.vp = vp;
    this.rooms = new Map();
    this.current = null;
    this.currentId = null;
    this.snap = null;        // canvas com o último quadro do cômodo anterior
    this.trans = null;       // { t, dir }
    this.hasDrawn = false;
    bus.on("room:go", (id) => this.go(id));
  }
  register(id, room) { this.rooms.set(id, room); }
  get transitioning() { return !!this.trans; }

  go(id) {
    if (id === this.currentId) return;
    const next = this.rooms.get(id);
    if (!next) return;
    this._capture(id);
    if (this.current && this.current.exit) this.current.exit();
    this.current = next;
    this.currentId = id;
    if (next.enter) next.enter();
    this.bus.emit("room:changed", id);
  }

  _capture(nextId) {
    const vp = this.vp;
    if (!vp) return;
    const from = ORDER.indexOf(this.currentId), to = ORDER.indexOf(nextId);
    const dir = from < 0 ? 0 : (to > from ? 1 : -1);
    if (!this.snap) this.snap = document.createElement("canvas");
    this.snap.width = vp.canvas.width;
    this.snap.height = vp.canvas.height;
    const c = this.snap.getContext("2d");
    if (this.hasDrawn) c.drawImage(vp.canvas, 0, 0);
    else { c.fillStyle = "#efe3ff"; c.fillRect(0, 0, this.snap.width, this.snap.height); } // abertura do jogo
    this.trans = { t: 0, dir };
  }

  update(dt) {
    if (this.current && this.current.update) this.current.update(dt);
    if (this.trans) {
      this.trans.t += dt;
      if (this.trans.t >= (Motion.reduce ? DURATION * 0.6 : DURATION)) this.trans = null;
    }
  }

  draw() { if (this.current && this.current.draw) this.current.draw(); }

  /* Desenhado por último no quadro (por cima de cena, efeitos e UI do canvas). */
  drawTransition() {
    this.hasDrawn = true;
    if (!this.trans || !this.snap) return;
    const vp = this.vp, ctx = vp.ctx;
    const dur = Motion.reduce ? DURATION * 0.6 : DURATION;
    const k = clamp(this.trans.t / dur);
    const alpha = 1 - Ease.inOutCubic(k);
    const slide = Motion.reduce ? 0 : -this.trans.dir * vp.w * 0.18 * Ease.inOutCubic(k);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(this.snap, slide, 0, vp.w, vp.h);
    ctx.restore();
  }
}
