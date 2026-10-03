/* Álbum vivo de descobertas.
   - Adesivos dos capítulos concluídos (agrupados no topo) e cartões das
     reações descobertas, todos desenhados no estilo do jogo (sem emoji).
   - Tocar num adesivo/cartão fecha o álbum e o Nubi REPETE aquela reação.
   - Sem porcentagem incompleta, sem sequência diária, sem aviso de coleção
     atrasada: só aparece o que já foi descoberto, mais alguns "?" convidativos. */
import { drawIcon, drawSticker } from "./icons.js";
import { CHAPTERS } from "../data/chapters.js";
import { FOODS } from "../data/foods.js";

const CATALOG = {
  nubi_azul:     { title: "Nubi azul",     color: "#5b8def", icon: "food:blueberry" },
  nubi_coracoes: { title: "Corações",      color: "#ff6b9d", icon: "heart" },
  nubi_lua:      { title: "Tufo de lua",   color: "#f6cf3f", icon: "moon" },
  nubi_assobio:  { title: "Fiiiu!",        color: "#9ad24a", icon: "note" },
  nubi_fofo:     { title: "Pelo fofo",     color: "#ffd9ec", icon: "towel" },
  nubi_patinho:  { title: "Patinho",       color: "#ffe14d", icon: "duck" },
  nubi_enxague:  { title: "Enxágue",       color: "#9fd3ff", icon: "shower" },
  nubi_hat:      { title: "Chapéu",        color: "#8a3bff", icon: "hat" },
  nubi_cape:     { title: "Capa de herói", color: "#e5484d", icon: "cape" },
  nubi_boots:    { title: "Botas",         color: "#5b6ee8", icon: "boots" },
  nubi_cesto:    { title: "Na cesta!",     color: "#ff7a59", icon: "basket" },
  dente_limpo:   { title: "Dentes limpos", color: "#7fd0bd", icon: "brush" },
  dente_bichinho:{ title: "Tchau, bichinho", color: "#9be564", icon: "bug" },
  dente_alinhado:{ title: "Dente no lugar", color: "#bfe6ff", icon: "teeth:align" },
  sorriso_brilhante: { title: "Sorriso brilhante", color: "#ffe27a", icon: "tooth" },
  descarga:      { title: "Descarga!",     color: "#9fd3ff", icon: "poop:flush" },
  lixeira:       { title: "Lixo no lixo",  color: "#7fd88a", icon: "trash:bin" },
  caminhao:      { title: "Caminhão",      color: "#62c370", icon: "trash:out" },
  pelo_penteado: { title: "Penteadinho",   color: "#ffd0e3", icon: "comb" },
  orelhas_limpas:{ title: "Orelhinhas",    color: "#ffe14d", icon: "sponge" },
  penteado:      { title: "Penteado",      color: "#f6cf3f", icon: "hair:curls" },
  unhas_coloridas:{ title: "Unhas coloridas", color: "#ff6bb5", icon: "polish:#ff6bb5" },
  maquiagem:     { title: "Maquiagem",     color: "#ffb3d9", icon: "makeup:lips" },
  pintura:       { title: "Pintura de rosto", color: "#5bc0eb", icon: "paint:mustache" },
  amigo_bunny:   { title: "Lili",          color: "#ffe3ee", icon: "pet:bunny" },
  amigo_bear:    { title: "Tito",          color: "#f3d3b0", icon: "pet:bear" }
};
// cada comida nova ganha seu cartão automaticamente
for (const f of Object.values(FOODS)) {
  const id = f.effect && f.effect.discovery;
  if (id && !CATALOG[id]) CATALOG[id] = { title: f.label.charAt(0).toUpperCase() + f.label.slice(1), color: f.effect.color || f.color, icon: "food:" + f.id };
}
const MAX_MYSTERY = 3;   // poucos "?" para convidar, nunca uma lista do que falta

function iconCanvas(size, paint) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const c = document.createElement("canvas");
  c.width = size * dpr; c.height = size * dpr;
  c.style.width = size + "px"; c.style.height = size + "px";
  const ctx = c.getContext("2d");
  ctx.scale(dpr, dpr);
  paint(ctx, size);
  return c;
}

export class Album {
  constructor(bus, save) {
    this.bus = bus; this.save = save;
    this.el = document.getElementById("album");
    this.grid = document.getElementById("albumGrid");
    this.stickers = document.getElementById("albumStickers");
    const close = document.getElementById("albumClose");
    if (close) close.addEventListener("click", () => this.hide());
    const open = document.getElementById("btnAlbum");
    if (open) open.addEventListener("click", () => this.show());
  }
  show() { this.render(); if (this.el) this.el.classList.add("show"); }
  hide() { if (this.el) this.el.classList.remove("show"); }

  _replay(kind, id) {
    this.hide();
    // espera o álbum sumir para a criança ver a reação
    setTimeout(() => this.bus.emit("album:replay", { kind, id }), 280);
  }

  render() {
    const q = this.save.state.quests || { done: {} };
    if (this.stickers) {
      this.stickers.innerHTML = "";
      for (const ch of CHAPTERS) {
        if (!q.done || !q.done[ch.id]) continue;
        const b = document.createElement("button");
        b.className = "sticker"; b.setAttribute("aria-label", "Adesivo " + ch.id);
        b.appendChild(iconCanvas(76, (ctx, s) => drawSticker(ctx, ch.sticker, ch.color, s / 2, s / 2, s * 0.44)));
        b.addEventListener("click", () => this._replay("chapter", ch.id));
        this.stickers.appendChild(b);
      }
      this.stickers.style.display = this.stickers.children.length ? "" : "none";
    }
    if (!this.grid) return;
    this.grid.innerHTML = "";
    let mystery = 0;
    for (const [id, meta] of Object.entries(CATALOG)) {
      const found = !!this.save.state.discoveries[id];
      if (!found && mystery >= MAX_MYSTERY) continue;
      if (!found) mystery++;
      const card = document.createElement(found ? "button" : "div");
      card.className = "albumCard" + (found ? " found" : "");
      const tile = document.createElement("div");
      tile.className = "albumIcon";
      tile.style.background = found ? meta.color : "rgba(0,0,0,.08)";
      if (found) tile.appendChild(iconCanvas(60, (ctx, s) => drawIcon(ctx, meta.icon, s / 2, s / 2, s * 0.36)));
      else tile.textContent = "?";
      const title = document.createElement("div");
      title.className = "albumTitle";
      title.textContent = found ? meta.title : "";
      card.appendChild(tile); card.appendChild(title);
      if (found) card.addEventListener("click", () => this._replay("discovery", id));
      this.grid.appendChild(card);
    }
  }
}
export const ALBUM_CATALOG = CATALOG;
