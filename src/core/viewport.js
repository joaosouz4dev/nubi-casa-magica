/* Viewport: canvas responsivo em orientação horizontal, com mapeamento
   de "espaço de design" (0..1) para pixels e tratamento de DPR + área segura.
   Mantém proporção paisagem; em telas estreitas pede para virar o aparelho. */
export class Viewport {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.w = 0; this.h = 0; this.dpr = 1;
    this.resize();
    window.addEventListener("resize", () => this.resize());
    window.addEventListener("orientationchange", () => this.resize());
  }
  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.canvas.style.width = this.w + "px";
    this.canvas.style.height = this.h + "px";
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.isPortrait = this.h > this.w;
  }
  // design (0..1) -> pixels
  dx(x) { return x * this.w; }
  dy(y) { return y * this.h; }
  // escala relativa ao menor lado (para raios/tamanhos consistentes)
  s(v) { return v * Math.min(this.w, this.h); }
}
