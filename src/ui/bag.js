/* MOCHILA: guarda o que não é brincar agora (bichinhos, missões, prêmios,
   álbum, som e, pequenino no canto, a área dos responsáveis). Na tela fica
   só o botão dela, que repete os sinais de dentro: pontinho quando há
   prêmio/baú pronto, pulso quando um pedido aponta para algo lá dentro e
   pulinho quando chega um adesivo. Os botões de dentro continuam com os
   próprios ids e comportamentos (lojinha, missões, álbum, vitrine...). */
export class Bag {
  constructor(bus, audio) {
    this.bus = bus; this.audio = audio;
    this.el = document.getElementById("bag");
    this.btn = document.getElementById("btnBag");
    if (!this.el || !this.btn) return;
    this.grid = this.el.querySelector(".bagGrid");
    this.btn.addEventListener("click", () => this.open());
    const close = document.getElementById("bagClose");
    if (close) close.addEventListener("click", () => this.close());
    // tocar fora do painel fecha
    this.el.addEventListener("click", (e) => { if (e.target === this.el) this.close(); });
    // abrir algo de dentro fecha a mochila (o som fica: dá para ver o estado)
    this.el.querySelectorAll(".bagGrid .toy").forEach(b => {
      if (b.id !== "btnSound") b.addEventListener("click", () => this.close(), true);
    });
    // a área dos responsáveis abre por um timer (segurar) e um desafio:
    // a mochila fecha quando um deles aparece
    for (const id of ["gate", "parent"]) {
      const el = document.getElementById(id);
      if (el) new MutationObserver(() => { if (el.classList.contains("show")) this.close(); })
        .observe(el, { attributes: true, attributeFilter: ["class"] });
    }
    // sinais de dentro -> botão da mochila
    // ("bump" fica na classe depois do pulinho: só conta quando acabou de entrar)
    const justBumped = (m) => m.target.classList.contains("bump") && !/\bbump\b/.test(m.oldValue || "");
    new MutationObserver((list) => {
      if (list.some(justBumped)) this.bump();
      this.sync();
    }).observe(this.el, { attributes: true, attributeFilter: ["class"], attributeOldValue: true, subtree: true });
    this.sync();
  }

  get isOpen() { return this.el.classList.contains("show"); }
  open() { this.el.classList.add("show"); this.bus.emit("audio:pop"); this.sync(); }
  close() { this.el.classList.remove("show"); }

  sync() {
    const any = (cls) => !!this.grid.querySelector(".toy." + cls) || !!this.el.querySelector("#btnParent." + cls);
    this.btn.classList.toggle("ready", any("ready"));
    this.btn.classList.toggle("wish", any("wish"));
  }

  bump() { this.btn.classList.remove("bump"); void this.btn.offsetWidth; this.btn.classList.add("bump"); }

  /* Ponto da tela para onde voam adesivos e afins: o botão de dentro se a
     mochila estiver aberta, senão o botão da mochila. */
  target(id) {
    const inner = document.getElementById(id);
    return this.isOpen && inner ? inner : this.btn;
  }
}
