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
  },
  /* ---------- Temporada 2: novos amigos, looks, dentista, rotina, salão ----------
     Ficam disponíveis desde o início (o capítulo segue o cômodo onde a criança
     está), mas a ordem sugerida vem depois da festa. */
  {
    id: "amigos", room: null, sticker: "amigos", color: "#ff9fc4",
    steps: { all: [
      { act: "pet:bunny", icon: "pet:bunny", dom: "#btnPets" },
      { act: "pet:bear",  icon: "pet:bear",  dom: "#btnPets" },
      { act: "pet:nubi",  icon: "pet:nubi",  dom: "#btnPets" }
    ] }
  },
  {
    id: "looks", room: "bedroom", sticker: "looks", color: "#ffc93a",
    steps: {
      explore:    [{ act: "equip:face", icon: "wear:sunglasses" }, { act: "equip:body", icon: "wear:tutu" }, { act: "look", icon: "looks" }],
      experiment: [{ act: "equip:neck", icon: "wear:bowtie" }, { act: "look", icon: "looks" }, { act: "wear:gift", icon: "gift" }],
      solve:      [{ act: "look", icon: "looks" }, { act: "equip:face", icon: "wear:sunglasses" }, { act: "wear:gift", icon: "gift" }]
    }
  },
  {
    id: "dentista", room: "dentist", sticker: "dente", color: "#7fd0bd",
    steps: {
      explore:    [{ act: "teeth:plaque", icon: "brush" }, { act: "teeth:bugs", icon: "bug" }, { act: "teeth:align", icon: "teeth:align" }],
      experiment: [{ act: "teeth:plaque", icon: "brush" }, { act: "teeth:align", icon: "teeth:align" }, { act: "teeth:rinse", icon: "cup" }],
      solve:      [{ act: "teeth:bugs", icon: "bug" }, { act: "teeth:plaque", icon: "brush" }, { act: "teeth:all", icon: "tooth" }]
    }
  },
  {
    id: "rotina", room: null, sticker: "limpeza", color: "#62c370",
    steps: {
      explore:    [{ act: "poop:flush", icon: "poop:flush", room: "bathroom" }, { act: "trash:bin", icon: "trash:bin", room: "kitchen" }, { act: "comb", icon: "comb", room: "bathroom" }],
      experiment: [{ act: "trash:bin", icon: "trash:bin", room: "kitchen" }, { act: "trash:out", icon: "trash:out", room: "kitchen" }, { act: "poop:flush", icon: "poop:flush", room: "bathroom" }],
      solve:      [{ act: "poop:flush", icon: "poop:flush", room: "bathroom" }, { act: "ears", icon: "sponge", room: "bathroom" }, { act: "trash:out", icon: "trash:out", room: "kitchen" }]
    }
  },
  {
    id: "salao", room: "salon", sticker: "salao", color: "#ff6bb5",
    steps: {
      explore:    [{ act: "hair", icon: "hair" }, { act: "nails", icon: "nails" }, { act: "beauty", icon: "beauty" }],
      experiment: [{ act: "haircolor", icon: "color:#ff6b9d" }, { act: "nails", icon: "nails" }, { act: "paint", icon: "paint:mustache" }],
      solve:      [{ act: "hair", icon: "hair" }, { act: "hairacc", icon: "acc:bow" }, { act: "beauty", icon: "beauty" }]
    }
  },
  /* ---------- Temporada 3: cardápio, salão por estações, estrelinhas ---------- */
  {
    id: "cardapio", room: "kitchen", sticker: "fruta", color: "#ff9a2e",
    steps: {
      explore:    [{ act: "feedgroup:frutas2", icon: "food:watermelon" }, { act: "feedgroup:salgados", icon: "food:sandwich" }, { act: "feedgroup:doces", icon: "food:cupcake" }],
      experiment: [{ act: "feed:carrot", icon: "food:carrot" }, { act: "feed:milk", icon: "food:milk" }, { act: "feed:grapes", icon: "food:grapes" }],
      solve:      [{ act: "feed:broccoli", icon: "food:broccoli" }, { act: "feed:orange", icon: "food:orange" }, { act: "feed:popsicle", icon: "food:popsicle" }]
    }
  },
  {
    id: "salao2", room: "salon", sticker: "salao", color: "#b49cff",
    steps: {
      explore:    [{ act: "nails:full", icon: "station:nails" }, { act: "nailart", icon: "star" }, { act: "makeup", icon: "station:makeup" }],
      experiment: [{ act: "haircolor", icon: "station:hair" }, { act: "nails:full", icon: "station:nails" }, { act: "paint", icon: "station:makeup" }],
      solve:      [{ act: "hair", icon: "station:hair" }, { act: "nails:full", icon: "station:nails" }, { act: "makeup", icon: "station:makeup" }]
    }
  },
  {
    id: "estrelinhas", room: null, sticker: "festa", color: "#ffd54a",
    steps: { all: [
      { act: "hub:visit", icon: "map", dom: "#btnHome" },
      { act: "prize",     icon: "shop", dom: "#btnShop" },
      { act: "feed:special", icon: "food:starcookie", room: "kitchen" }
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
  { act: "basket", icon: "basket", room: "bedroom" },
  { act: "look", icon: "looks", room: "bedroom" },
  { act: "teeth:all", icon: "tooth", room: "dentist" },
  { act: "nails", icon: "nails", room: "salon" },
  { act: "hair", icon: "hair", room: "salon" },
  { act: "trash:bin", icon: "trash:bin", room: "kitchen" },
  { act: "comb", icon: "comb", room: "bathroom" },
  { act: "feed:pizza", icon: "food:pizza", room: "kitchen" },
  { act: "feed:watermelon", icon: "food:watermelon", room: "kitchen" },
  { act: "feed:juice", icon: "food:juice", room: "kitchen" },
  { act: "nails:full", icon: "station:nails", room: "salon" },
  { act: "makeup", icon: "station:makeup", room: "salon" }
];

// Ajuda escalonada por inatividade (ms). O modo multiplica os tempos.
export const HINT_TIMING = { look: 4000, nudge: 8000, demo: 12000, demoRepeat: 25000 };
export const MODE_PATIENCE = { explore: 1, experiment: 1.3, solve: 1.8 };

// Elogios curtos (complementares: o jogo funciona sem ler).
export const PRAISE = ["Isso!", "Eba!", "Uhuu!", "Que legal!", "Oba!", "Demais!"];
export const CHAPTER_PRAISE = ["Conseguimos!", "Que festa!", "Você é demais!"];
