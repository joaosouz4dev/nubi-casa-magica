/* DIFICULDADE ADAPTATIVA dos minijogos (acompanha a criança, 3 a 6 anos).
   Cada minijogo tem uma escada de degraus. Começa no 2º degrau (o tamanho
   de antes no modo Explorar) e, a cada partida, mede o acerto (0..1):
     - 2 partidas seguidas com 85% ou mais -> sobe um degrau;
     - 2 partidas seguidas abaixo de 60% -> desce um degrau;
     - no meio disso: fica onde está (é a faixa boa: desafio sem frustrar).
   O modo dos responsáveis (Explorar / Experimentar / Resolver) só define até
   onde dá para subir. Sair no meio da partida não conta. Nada disso aparece
   para a criança: não há "nível" nem "errou"; só para os responsáveis, no
   relatório. Guardado em save.state.games.skill. */
export const LADDERS = {
  // pares de cartas
  memory:  { steps: [2, 3, 4, 5, 6], start: 1, cap: { explore: 2, experiment: 3, solve: 4 } },
  // notas da melodia mais longa (começa sempre com 2)
  music:   { steps: [3, 4, 5, 6, 7], start: 1, cap: { explore: 2, experiment: 3, solve: 4 } },
  // formas para encaixar
  shapes:  { steps: [2, 3, 4, 5], start: 1, cap: { explore: 2, experiment: 3, solve: 3 } },
  // frutas: intervalo entre elas (ms) e velocidade da queda
  catch:   { steps: [{ every: 1050, speed: 0.85 }, { every: 900, speed: 1 }, { every: 760, speed: 1.1 }, { every: 650, speed: 1.2 }], start: 1, cap: { explore: 1, experiment: 2, solve: 3 } },
  // bolhas: intervalo (ms) e tamanho
  bubbles: { steps: [{ every: 620, size: 1.15 }, { every: 520, size: 1 }, { every: 450, size: 0.95 }, { every: 400, size: 0.88 }], start: 1, cap: { explore: 1, experiment: 2, solve: 3 } },
  // misturas para acertar
  colors:  { steps: [2, 3, 4, 5], start: 1, cap: { explore: 1, experiment: 2, solve: 3 } }
};
export const GOOD = 0.85, HARD = 0.6, STREAK = 2, HISTORY = 10;
export const GAME_NAMES = { catch: "Pega-frutas", bubbles: "Estoura-bolhas", memory: "Memória", music: "Música", shapes: "Formas", colors: "Cores" };

export class Skill {
  constructor(save) { this.save = save; }

  _all() {
    const g = this.save.state.games = this.save.state.games || { best: {}, plays: {} };
    return g.skill = g.skill || {};
  }
  _mode() { return this.save.state.mode || "explore"; }
  cap(id) { const L = LADDERS[id]; return L ? (L.cap[this._mode()] ?? L.cap.explore) : 0; }

  // degrau atual (já limitado pelo modo dos responsáveis)
  level(id) {
    const L = LADDERS[id]; if (!L) return 0;
    const s = this._all()[id];
    return Math.max(0, Math.min(s ? s.lvl : L.start, this.cap(id)));
  }
  param(id) { const L = LADDERS[id]; return L ? L.steps[this.level(id)] : null; }

  /* Fim de uma partida: acc = acerto 0..1. Devolve +1 (subiu), -1 (desceu) ou 0. */
  record(id, acc) {
    const L = LADDERS[id]; if (!L || !(acc >= 0)) return 0;
    const all = this._all();
    const s = all[id] = all[id] || { lvl: L.start, good: 0, hard: 0, hist: [] };
    s.lvl = this.level(id);                    // o modo pode ter baixado o teto
    s.hist.push(Math.round(Math.min(1, acc) * 100)); if (s.hist.length > HISTORY) s.hist.shift();
    let moved = 0;
    if (acc >= GOOD) { s.good++; s.hard = 0; }
    else if (acc < HARD) { s.hard++; s.good = 0; }
    else { s.good = 0; s.hard = 0; }
    if (s.good >= STREAK) { s.good = 0; if (s.lvl < this.cap(id)) { s.lvl++; moved = 1; } }
    if (s.hard >= STREAK) { s.hard = 0; if (s.lvl > 0) { s.lvl--; moved = -1; } }
    this.save.persist();
    return moved;
  }

  /* Para o relatório: [{ id, name, step, of, avg, plays }] dos jogos já jogados. */
  summary() {
    const all = this._all();
    return Object.keys(GAME_NAMES).filter(id => all[id] && all[id].hist.length).map(id => {
      const h = all[id].hist, avg = Math.round(h.reduce((a, b) => a + b, 0) / h.length);
      return { id, name: GAME_NAMES[id], step: this.level(id) + 1, of: this.cap(id) + 1, avg, plays: h.length };
    });
  }
}
