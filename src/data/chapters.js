/* ============================================================
   CAPÍTULOS E PEDIDOS - dados configuráveis.
   Um capítulo é um pequeno momento com começo e encerramento natural.
   Cada passo é um "pedido" do Nubi: um convite, nunca uma obrigação.
   Nada aqui bloqueia cômodo, objeto ou descoberta.

   act:   identificador emitido pelos cômodos (bus "act") quando a
          criança faz a ação (ex.: "feed:blueberry", "foam", "equip:hat").
   icon:  o que o Nubi "pensa" (desenho, sem texto).
   modes: variações por modo dos responsáveis. O modo muda o grau de
          orientação e o tipo de pedido, não o acesso ao conteúdo:
            explore    -> um pedido por vez, ajuda rápida
            experiment -> pedidos de combinação
            solve      -> pequena sequência visível, ajuda mais paciente
   ============================================================ */

export const CHAPTERS = [
  {
    // room null: acontece onde o Nubi estiver (o jogo abre na cozinha)
    id: "recepcao", room: null, sticker: "nuvem", color: "#cdb8f0",
    steps: { all: [
      { act: "wake",  icon: "cloud" },
      { act: "pet",   icon: "pet" },
      { act: "tummy", icon: "tummy" }
    ] }
  },
  {
    id: "cozinha", room: "kitchen", sticker: "fruta", color: "#5b8def",
    steps: {
      explore:    [{ act: "feed:blueberry", icon: "food:blueberry" }, { act: "feed:strawberry", icon: "food:strawberry" }, { act: "feed:banana", icon: "food:banana" }],
      experiment: [{ act: "feed:blueberry", icon: "food:blueberry" }, { act: "feed:pear", icon: "food:pear" }, { act: "feed:banana", icon: "food:banana" }],
      solve:      [{ act: "feed:strawberry", icon: "food:strawberry" }, { act: "feed:pear", icon: "food:pear" }, { act: "feed:blueberry", icon: "food:blueberry" }]
    }
  },
  {
    id: "banho", room: "bathroom", sticker: "bolha", color: "#9fd3ff",
    steps: {
      explore:    [{ act: "foam", icon: "sponge" }, { act: "duck", icon: "duck" }, { act: "dry", icon: "towel" }],
      experiment: [{ act: "foam", icon: "sponge" }, { act: "rinse", icon: "shower" }, { act: "dry", icon: "towel" }],
      solve:      [{ act: "foam", icon: "sponge" }, { act: "rinse", icon: "shower" }, { act: "dry", icon: "towel" }]
    }
  },
  {
    id: "desfile", room: "bedroom", sticker: "chapeu", color: "#8a3bff",
    steps: {
      explore:    [{ act: "equip:hat", icon: "hat" }, { act: "equip:cape", icon: "cape" }, { act: "equip:boots", icon: "boots" }],
      experiment: [{ act: "equip:cape", icon: "cape" }, { act: "equip:hat", icon: "hat" }, { act: "equip:boots", icon: "boots" }],
      solve:      [{ act: "equip:boots", icon: "boots" }, { act: "equip:cape", icon: "cape" }, { act: "equip:hat", icon: "hat" }]
    }
  },
  {
    id: "bola", room: "bedroom", sticker: "bola", color: "#ff7a59",
    steps: { all: [
      { act: "bounce", icon: "ball" },
      { act: "basket", icon: "basket" },
      { act: "pet",    icon: "pet" }
    ] }
  },
  /* Festa das combinações: depois dos 4 capítulos, convida às combinações
     prioritárias do MVP (atravessam cômodos). Depois dela o mundo continua. */
  {
    id: "festa", room: null, sticker: "festa", color: "#ffd54a", finale: true,
    steps: { all: [
      { act: "foam:tinted",     icon: "combo:blue-foam", room: "bathroom" },
      { act: "equip:hat:fluffy", icon: "combo:fluffy-hat", room: "bedroom" },
      { act: "basket:cape",      icon: "combo:cape-ball", room: "bedroom" }
    ] }
  }
];

/* Pedidos livres depois que tudo foi concluído: sugestões variadas, sem fim,
   sem contagem. Sorteados sem repetir o anterior. */
export const FREE_WISHES = [
  { act: "feed:blueberry", icon: "food:blueberry", room: "kitchen" },
  { act: "feed:strawberry", icon: "food:strawberry", room: "kitchen" },
  { act: "feed:banana", icon: "food:banana", room: "kitchen" },
  { act: "feed:pear", icon: "food:pear", room: "kitchen" },
  { act: "foam", icon: "sponge", room: "bathroom" },
  { act: "duck", icon: "duck", room: "bathroom" },
  { act: "equip:hat", icon: "hat", room: "bedroom" },
  { act: "basket", icon: "basket", room: "bedroom" }
];

// Ajuda escalonada por inatividade (ms). O modo multiplica os tempos.
export const HINT_TIMING = { look: 4000, nudge: 8000, demo: 12000, demoRepeat: 25000 };
export const MODE_PATIENCE = { explore: 1, experiment: 1.3, solve: 1.8 };

// Elogios curtos (complementares: o jogo funciona sem ler).
export const PRAISE = ["Isso!", "Eba!", "Uhuu!", "Que legal!", "Oba!", "Demais!"];
export const CHAPTER_PRAISE = ["Conseguimos!", "Que festa!", "Você é demais!"];
