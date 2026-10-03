/* ============================================================
   ESTRELINHAS, PRÊMIOS, CARINHO E MISSÕES DO DIA - dados configuráveis.
   Regras (combinadas com o responsável, adaptadas para 3-5 anos):
   - estrelinhas SÓ SOBEM: nunca se perdem, nunca se gastam, não há "errou";
   - um prêmio "abre" quando o total de estrelinhas alcança o preço; a
     criança toca para ganhar. Nada do jogo básico fica trancado;
   - carinho é por bichinho: cuidar enche o coração e, a cada nível, tem
     festa (sem esvaziar com o tempo);
   - missões do dia: 3 sugestões que trocam por dia, sem sequência e sem
     culpa se a criança não fizer.
   ============================================================ */

// Quantas estrelinhas cada coisa dá.
export const STAR_RULES = { act: 1, step: 2, chapter: 5, mission: 5, loveUp: 3 };
export const ACT_COOLDOWN = 2500;   // a mesma ação seguida não conta de novo antes disso

// Ações que não são "brincar" (navegação, troca de aba): não dão estrelinha.
export const NO_STAR = [/^hub:/, /^tab:/, /^salon:/, /^wake$/, /^prize$/, /^mission/];

// Ações de cuidado: enchem o coração do bichinho atual.
export const LOVE_ACTS = [/^feed:/, /^foam/, /^rinse$/, /^dry$/, /^comb$/, /^ears$/, /^teeth:/, /^pet$/, /^tummy$/, /^nails$/, /^hair$/, /^makeup$/, /^paint$/, /^poop:flush$/, /^duck$/];
export function loveNeeded(level) { return 6 + level * 4; }

export const PRIZES = [
  { id: "food:starcookie",  price: 5,  icon: "food:starcookie",  kind: "food" },
  { id: "decor:flags",      price: 10, icon: "decor:flags",      kind: "decor" },
  { id: "food:icecream",    price: 15, icon: "food:icecream",    kind: "food" },
  { id: "wear:goldcrown",   price: 20, icon: "wear:goldcrown",   kind: "wear" },
  { id: "decor:flowers",    price: 25, icon: "decor:flowers",    kind: "decor" },
  { id: "food:donut",       price: 30, icon: "food:donut",       kind: "food" },
  { id: "wear:rainbowcape", price: 40, icon: "wear:rainbowcape", kind: "wear" },
  { id: "decor:balloons",   price: 50, icon: "decor:balloons",   kind: "decor" },
  { id: "food:rainbowcake", price: 60, icon: "food:rainbowcake", kind: "food" },
  { id: "wear:wings",       price: 70, icon: "wear:wings",       kind: "wear" },
  { id: "decor:rainbow",    price: 85, icon: "decor:rainbow",    kind: "decor" },
  { id: "wear:unicorn",     price: 100, icon: "wear:unicorn",    kind: "wear" }
];

// Pool de missões do dia (3 sorteadas por data, sempre as mesmas no mesmo dia).
export const MISSION_POOL = [
  { act: "feed:apple",   icon: "food:apple",   room: "kitchen" },
  { act: "feed:carrot",  icon: "food:carrot",  room: "kitchen" },
  { act: "feed:milk",    icon: "food:milk",    room: "kitchen" },
  { act: "feed:grapes",  icon: "food:grapes",  room: "kitchen" },
  { act: "foam",         icon: "sponge",       room: "bathroom" },
  { act: "dry",          icon: "towel",        room: "bathroom" },
  { act: "comb",         icon: "comb",         room: "bathroom" },
  { act: "basket",       icon: "basket",       room: "bedroom" },
  { act: "look",         icon: "looks",        room: "bedroom" },
  { act: "teeth:plaque", icon: "brush",        room: "dentist" },
  { act: "hair",         icon: "station:hair", room: "salon" },
  { act: "nails",        icon: "station:nails", room: "salon" },
  { act: "makeup",       icon: "station:makeup", room: "salon" },
  { act: "trash:bin",    icon: "trash:bin",    room: "kitchen" }
];
