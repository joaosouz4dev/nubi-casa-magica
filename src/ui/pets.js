/* Vitrine de bichinhos: escolher com quem brincar. Cada bichinho guarda a
   própria aparência (cor, roupas, beleza); o progresso dos capítulos é da
   criança e vale para todos. Sem texto obrigatório: retratos desenhados. */
import { PETS, PET_ORDER } from "../data/pets.js";
import { drawPetIcon } from "./icons.js";

export class PetPicker {
  constructor(bus, save) {
    this.bus = bus; this.save = save;
    this.el = document.getElementById("pets");
    this.grid = document.getElementById("petsGrid");
    const open = document.getElementById("btnPets");
    if (open) open.addEventListener("click", () => this.show());
    const close = document.getElementById("petsClose");
    if (close) close.addEventListener("click", () => this.hide());
  }
  show() { this.render(); if (this.el) this.el.classList.add("show"); }
  hide() { if (this.el) this.el.classList.remove("show"); }
  render() {
    if (!this.grid) return;
    this.grid.innerHTML = "";
    const cur = this.save.currentPet();
    for (const id of PET_ORDER) {
      const b = document.createElement("button");
      b.className = "petCard" + (id === cur ? " active" : "");
      b.setAttribute("data-pet", id);
      b.setAttribute("aria-label", PETS[id].name);
      const size = 120, dpr = Math.min(2, window.devicePixelRatio || 1);
      const c = document.createElement("canvas");
      c.width = size * dpr; c.height = size * dpr; c.style.width = size + "px"; c.style.height = size + "px";
      const ctx = c.getContext("2d"); ctx.scale(dpr, dpr);
      drawPetIcon(ctx, id, size / 2, size * 0.52, size * 0.3);
      const name = document.createElement("div"); name.className = "petName"; name.textContent = PETS[id].name;
      b.appendChild(c); b.appendChild(name);
      b.addEventListener("click", () => { this.hide(); setTimeout(() => this.bus.emit("pet:choose", id), 220); });
      this.grid.appendChild(b);
    }
  }
}
