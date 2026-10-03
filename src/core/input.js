/* Entrada de um dedo: unifica mouse e toque e expõe eventos de alto nível.
   Suporta os DOIS esquemas exigidos pelo briefing:
     - arraste: pressionar sobre um objeto, mover, soltar sobre o destino;
     - alternativa: tocar no objeto (seleciona) e depois tocar no destino.
   Áreas de toque podem ser maiores que o desenho (os sistemas decidem o hit). */
export class Input {
  constructor(canvas, bus) {
    this.canvas = canvas;
    this.bus = bus;
    this.active = null;   // ponteiro em andamento
    this.moved = false;
    const rectPoint = (e) => {
      const src = e.touches && e.touches[0] ? e.touches[0] : (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : e);
      // o canvas cobre o palco inteiro em (0,0); com o palco girado (retrato
      // no navegador) a conversão tela -> palco troca os eixos
      if (document.body.classList.contains("rot")) return { x: src.clientY, y: window.innerWidth - src.clientX };
      const r = canvas.getBoundingClientRect();
      return { x: src.clientX - r.left, y: src.clientY - r.top };
    };

    const down = (e) => {
      if (e.cancelable) e.preventDefault();
      const p = rectPoint(e);
      this.active = p; this.moved = false;
      this.bus.emit("pointer:down", p);
    };
    const move = (e) => {
      if (!this.active) return;
      if (e.cancelable) e.preventDefault();
      const p = rectPoint(e);
      const dx = p.x - this.active.x, dy = p.y - this.active.y;
      if (dx * dx + dy * dy > 36) this.moved = true;
      this.bus.emit("pointer:move", p);
    };
    const up = (e) => {
      if (e.cancelable) e.preventDefault();
      const p = this.active ? rectPoint(e) : null;
      this.bus.emit("pointer:up", { point: p, moved: this.moved });
      // toque "limpo" (sem arraste) = tap de alto nível
      if (p && !this.moved) this.bus.emit("tap", p);
      this.active = null; this.moved = false;
    };

    canvas.addEventListener("touchstart", down, { passive: false });
    canvas.addEventListener("touchmove", move, { passive: false });
    canvas.addEventListener("touchend", up, { passive: false });
    canvas.addEventListener("touchcancel", up, { passive: false });
    canvas.addEventListener("mousedown", down);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }
}
