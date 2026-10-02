/* Sistema de pedidos e capítulos.
   Escuta os eventos "act" que os cômodos já emitem e avança o pedido atual.
   Princípios (briefing, 3-5 anos):
   - pedido é CONVITE: nada é bloqueado, ignorar um pedido não tem custo;
   - sem pontuação, porcentagem, contador, sequência diária ou culpa;
   - o capítulo segue a criança: se ela foi para outro cômodo, o pedido
     passa a ser o capítulo daquele cômodo (sem "você está no lugar errado");
   - depois de tudo, pedidos livres variados, sem fim e sem contagem.
   Só emite eventos; a apresentação (balão, dicas, celebração) fica no Guide. */
import { CHAPTERS, FREE_WISHES } from "../data/chapters.js";

export class Quests {
  constructor(bus, save) {
    this.bus = bus; this.save = save;
    const q = save.state.quests || {};
    this.state = { done: { ...(q.done || {}) }, progress: { ...(q.progress || {}) }, finaleDone: !!q.finaleDone };
    this.mode = save.state.mode || "explore";
    this.room = null;
    this.free = null;            // pedido livre atual (depois do fim)
    this._lastFree = -1;
    this._cur = null;
    bus.on("act", (a) => this.onAct(a));
    bus.on("room:changed", (id) => { this.room = id; this._refresh(); });
    bus.on("mode:changed", (m) => { this.mode = m; this._refresh(true); });
  }

  steps(ch) { return ch.steps[this.mode] || ch.steps.all || ch.steps.explore; }
  isDone(id) { return !!this.state.done[id]; }
  allChaptersDone() { return CHAPTERS.filter(c => !c.finale).every(c => this.isDone(c.id)); }

  /* Capítulo ativo: o primeiro não concluído, mas o do cômodo atual tem
     preferência (segue a escolha da criança). A festa só depois dos outros. */
  chapter() {
    const open = CHAPTERS.filter(c => !this.isDone(c.id) && (!c.finale || this.allChaptersDone()));
    if (!open.length) return null;
    const first = open[0];
    if (first.room === null || first.finale) return first;
    if (first.room !== this.room) {
      const here = open.find(c => !c.finale && c.room === this.room);
      if (here) return here;
    }
    return first;
  }

  /* Pedido atual: { act, icon, room, chapter, index, total } ou null. */
  current() {
    const ch = this.chapter();
    if (ch) {
      const list = this.steps(ch);
      const i = Math.min(this.state.progress[ch.id] || 0, list.length - 1);
      const s = list[i];
      return { act: s.act, icon: s.icon, room: s.room !== undefined ? s.room : ch.room, chapter: ch, index: i, total: list.length };
    }
    if (!this.free) this._pickFree();
    return { ...this.free, chapter: null, index: 0, total: 1 };
  }

  _pickFree() {
    let i;
    do { i = Math.floor(Math.random() * FREE_WISHES.length); } while (FREE_WISHES.length > 1 && i === this._lastFree);
    this._lastFree = i;
    this.free = FREE_WISHES[i];
  }

  _refresh(force) {
    const c = this.current();
    const key = c ? c.act + "|" + (c.chapter ? c.chapter.id : "free") + "|" + c.room : "";
    if (force || key !== this._cur) { this._cur = key; this.bus.emit("quest:changed", c); }
  }

  _persist() {
    this.save.state.quests = { done: this.state.done, progress: this.state.progress, finaleDone: this.state.finaleDone };
    this.save.persist();
  }

  onAct(act) {
    const c = this.current();
    if (!c || c.act !== act) return;
    if (!c.chapter) {
      // pedido livre: celebra e sorteia outro (sem contar nada)
      this.free = null;
      this.bus.emit("quest:step", { step: 0, of: 1, free: true, act });
      this._refresh(true);
      return;
    }
    const ch = c.chapter;
    const next = c.index + 1;
    this.state.progress[ch.id] = next;
    this.bus.emit("quest:step", { step: c.index, of: c.total, chapter: ch, act });
    if (next >= c.total) {
      this.state.done[ch.id] = true;
      if (ch.finale) this.state.finaleDone = true;
      this._persist();
      this.bus.emit("effect:discoveryOnly", { id: "cap_" + ch.id });
      this.bus.emit("quest:chapter", { chapter: ch, finale: !!ch.finale });
    } else {
      this._persist();
    }
    this._refresh(true);
  }

  /* Capítulos concluídos, na ordem (varal do quarto e álbum). */
  completed() { return CHAPTERS.filter(c => this.isDone(c.id)); }
}
