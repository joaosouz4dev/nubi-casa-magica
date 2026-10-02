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
  addDiscovery(id) {
    if (!id) return false;
    const isNew = !this.state.discoveries[id];
    this.state.discoveries[id] = true;
    if (isNew) this.persist();
    return isNew;
  }
}
