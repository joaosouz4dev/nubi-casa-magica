/* Salvamento local — apenas localStorage, nenhum backend, nenhuma coleta.
   Guarda aparência persistente (ex.: cor atual) e descobertas do álbum.
   A volta após qualquer tempo de ausência é sempre acolhedora: NUNCA
   modifica o personagem para pior em função do tempo fechado. */
const KEY = "nubi.save.v1";

export class Save {
  constructor() { this.state = this._load(); }
  _load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignora storage indisponível */ }
    return { tint: null, discoveries: {}, accessories: {}, mode: "explore", reduceMotion: false };
  }
  persist() {
    try { localStorage.setItem(KEY, JSON.stringify(this.state)); } catch { /* no-op */ }
  }
  setTint(color) { this.state.tint = color; this.persist(); }
  setAccessories(acc) { this.state.accessories = acc; this.persist(); }
  setCosmetics(c) { this.state.cosmetics = c; this.persist(); }

  /* Cada bichinho guarda a própria aparência. Os campos tint/accessories/
     cosmetics de topo são sempre os do bichinho ATUAL (compatível com o
     save antigo, que só tinha o Nubi); os demais ficam em state.pets. */
  currentPet() { return this.state.pet || "nubi"; }
  switchPet(id) {
    const cur = this.currentPet();
    if (id === cur) return false;
    this.state.pets = this.state.pets || {};
    this.state.pets[cur] = { tint: this.state.tint || null, accessories: this.state.accessories || {}, cosmetics: this.state.cosmetics || null };
    const next = this.state.pets[id] || { tint: null, accessories: {}, cosmetics: null };
    this.state.tint = next.tint; this.state.accessories = next.accessories; this.state.cosmetics = next.cosmetics;
    this.state.pet = id;
    this.persist();
    return true;
  }
  addDiscovery(id) {
    if (!id) return false;
    const isNew = !this.state.discoveries[id];
    this.state.discoveries[id] = true;
    if (isNew) this.persist();
    return isNew;
  }
}
