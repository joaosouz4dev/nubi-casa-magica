/* Viewport: canvas responsivo em orientação horizontal, com mapeamento
   de "espaço de design" (0..1) para pixels e tratamento de DPR + área segura.
   O jogo é sempre paisagem. No APK o Android trava a orientação; num
   navegador com o aparelho em pé, em vez de bloquear com "gire o celular",
   o palco (#stage) é girado 90° por CSS (classe body.rot) e a lógica do jogo
   continua enxergando uma tela deitada. Todas as conversões tela <-> palco
   passam por aqui. */
export class Viewport {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.w = 0; this.h = 0; this.dpr = 1; this.rot = false;
    this.resize();
    window.addEventListener("resize", () => this.resize());
    window.addEventListener("orientationchange", () => setTimeout(() => this.resize(), 120));
    // entrar/sair da tela cheia nem sempre dispara "resize" a tempo no celular
    for (const ev of ["fullscreenchange", "webkitfullscreenchange"]) document.addEventListener(ev, () => setTimeout(() => { this.resize(); window.dispatchEvent(new Event("resize")); }, 80));
  }
  resize() {
    const W = window.innerWidth, H = window.innerHeight;
    this.rot = H > W;
    document.body.classList.toggle("rot", this.rot);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = this.rot ? H : W;
    this.h = this.rot ? W : H;
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.canvas.style.width = this.w + "px";
    this.canvas.style.height = this.h + "px";
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.isPortrait = false;   // o palco é sempre deitado
    // --vw/--vh = 1% da largura/altura do PALCO em px da área visível de
    // verdade (o 100vh do celular conta a barra do navegador e passava da
    // tela). "compact" = celular deitado: pouca altura para a barra lateral.
    const st = document.body.style;
    st.setProperty("--vw", (this.w / 100).toFixed(2) + "px");
    st.setProperty("--vh", (this.h / 100).toFixed(2) + "px");
    document.body.classList.toggle("compact", this.h < 520);
  }

  /* Faixa do topo ocupada pelos botões (px do palco). Espelha o --btn e o
     --edge do CSS (em paisagem o recorte da câmera fica nas laterais, não no
     topo); os cômodos usam para não pôr objetos tocáveis embaixo dela. */
  hudBottom() {
    const btn = Math.max(38, Math.min(this.h * 0.125, (this.w - 130) / 11.4, 58));
    return 10 + btn;
  }
  // ponto da tela (clientX/Y) -> palco
  toStage(cx, cy) {
    return this.rot ? { x: cy, y: window.innerWidth - cx } : { x: cx, y: cy };
  }
  // DOMRect da tela -> retângulo no palco
  rectToStage(r) {
    if (!this.rot) return { left: r.left, top: r.top, width: r.width, height: r.height };
    return { left: r.top, top: window.innerWidth - r.right, width: r.height, height: r.width };
  }
  // design (0..1) -> pixels
  dx(x) { return x * this.w; }
  dy(y) { return y * this.h; }
  // escala relativa ao menor lado (para raios/tamanhos consistentes)
  s(v) { return v * Math.min(this.w, this.h); }
}
