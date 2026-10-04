/* ============================================================
   GUARDA-ROUPA - dados configuráveis.
   Espaços (slot): hat (cabeça), face (rosto), neck (pescoço), cape (costas),
   body (corpo), boots (pés). Vestir uma peça substitui só a do mesmo espaço.
   As 3 peças originais (hat, cape, boots) mantêm id e aparência.

   GAMIFICAÇÃO (compatível com o briefing de 3-5 anos):
   - todo o guarda-roupa básico é livre desde o início;
   - peças "gift" são PRESENTES FIXOS por concluir um capítulo: sempre o
     mesmo presente pelo mesmo capítulo, nunca se perde, nada é aleatório,
     não existe falha. É progressão por brincar, não por acertar.
   ============================================================ */
export const ITEMS = {
  // originais (aparência desenhada pelo próprio Nubi)
  hat:      { id: "hat",      slot: "hat",   color: "#8a3bff", label: "chapéu de mago" },
  cape:     { id: "cape",     slot: "cape",  color: "#e5484d", label: "capa" },
  boots:    { id: "boots",    slot: "boots", color: "#5b6ee8", label: "botas" },
  // cabeça
  crown:    { id: "crown",    slot: "hat",   shape: "crown",   color: "#ffc93a", label: "coroa" },
  cap:      { id: "cap",      slot: "hat",   shape: "cap",     color: "#2fb67c", label: "boné" },
  helmet:   { id: "helmet",   slot: "hat",   shape: "helmet",  color: "#e9eef6", label: "capacete espacial" },
  pirate:   { id: "pirate",   slot: "hat",   shape: "pirate",  color: "#3a3248", label: "chapéu de pirata" },
  // rosto
  sunglasses: { id: "sunglasses", slot: "face", shape: "sunglasses", color: "#ff6b9d", label: "óculos de sol" },
  heromask:   { id: "heromask",   slot: "face", shape: "mask",       color: "#e5484d", label: "máscara de herói" },
  eyepatch:   { id: "eyepatch",   slot: "face", shape: "eyepatch",   color: "#2a2148", label: "tapa-olho" },
  // pescoço
  bowtie:   { id: "bowtie",   slot: "neck",  shape: "bowtie",  color: "#ff7a59", label: "gravata-borboleta" },
  scarf:    { id: "scarf",    slot: "neck",  shape: "scarf",   color: "#5bc0eb", label: "cachecol" },
  flowers:  { id: "flowers",  slot: "neck",  shape: "flowers", color: "#ff9fc4", label: "colar de flores" },
  // corpo
  tutu:     { id: "tutu",     slot: "body",  shape: "tutu",    color: "#ffb3d9", label: "saia de tule" },
  shirt:    { id: "shirt",    slot: "body",  shape: "stripes", color: "#3a7bd5", label: "camiseta listrada" },
  pajama:   { id: "pajama",   slot: "body",  shape: "pajama",  color: "#b49cff", label: "pijama" },
  spacesuit:{ id: "spacesuit",slot: "body",  shape: "suit",    color: "#f4f6fb", label: "roupa de astronauta" },
  // pés
  sneakers: { id: "sneakers", slot: "boots", shape: "sneakers", color: "#ff5a5f", label: "tênis" },
  slippers: { id: "slippers", slot: "boots", shape: "slippers", color: "#ffd0e3", label: "pantufas" },
  ballet:   { id: "ballet",   slot: "boots", shape: "ballet",   color: "#ffb3c7", label: "sapatilhas" },
  // presentes (um por capítulo, fixo)
  starglasses: { id: "starglasses", slot: "face",  shape: "starglasses", color: "#ffd54a", label: "óculos de estrela", gift: "recepcao" },
  goldcrown:   { id: "goldcrown",   slot: "hat",   shape: "crown",       color: "#ffb300", label: "coroa de ouro", gift: "cozinha", gems: true },
  sparkleboots:{ id: "sparkleboots",slot: "boots", shape: "sparkle",     color: "#c77dff", label: "botas brilhantes", gift: "banho" },
  rainbowcape: { id: "rainbowcape", slot: "cape",  shape: "rainbow",     color: "#ff6b6b", label: "capa arco-íris", gift: "desfile" },
  medal:       { id: "medal",       slot: "neck",  shape: "medal",       color: "#ffc93a", label: "medalha", gift: "bola" },
  unicorn:     { id: "unicorn",     slot: "hat",   shape: "unicorn",     color: "#fff4fb", label: "chifre de unicórnio", gift: "festa" },
  wings:       { id: "wings",       slot: "cape",  shape: "wings",       color: "#bfe9ff", label: "asas de fada", gift: "amigos" }
};

/* Páginas do guarda-roupa (até 3 por página; um botão troca de página).
   "basico" é a primeira e mantém as peças originais nas posições de sempre. */
export const PAGES = [
  { id: "basico",  icon: "hat",        items: ["hat", "cape", "boots"] },
  { id: "cabeca",  icon: "wear:crown", items: ["crown", "cap", "pirate"] },
  { id: "cabeca2", icon: "wear:helmet",items: ["helmet", "sunglasses", "heromask"] },
  { id: "rosto",   icon: "wear:eyepatch", items: ["eyepatch", "bowtie", "scarf"] },
  { id: "corpo",   icon: "wear:tutu",  items: ["flowers", "tutu", "shirt"] },
  { id: "corpo2",  icon: "wear:pajama",items: ["pajama", "spacesuit", "sneakers"] },
  { id: "pes",     icon: "wear:slippers", items: ["slippers", "ballet"] },
  { id: "looks",   icon: "looks",      looks: ["heroi", "pirata", "realeza"] },
  { id: "looks2",  icon: "looks",      looks: ["astronauta", "pijama", "bailarina"] },
  { id: "presentes", icon: "gift",     gifts: true }
];

/* Looks prontos: um toque veste a combinação inteira (troca peça a peça). */
export const LOOKS = {
  heroi:      { id: "heroi",      items: ["cape", "heromask", "boots"] },
  pirata:     { id: "pirata",     items: ["pirate", "eyepatch", "shirt"] },
  realeza:    { id: "realeza",    items: ["crown", "bowtie", "cape"] },
  astronauta: { id: "astronauta", items: ["helmet", "spacesuit", "boots"] },
  pijama:     { id: "pijama",     items: ["pajama", "slippers"] },
  bailarina:  { id: "bailarina",  items: ["tutu", "ballet", "flowers"] }
};

export const GIFTS = Object.values(ITEMS).filter(i => i.gift);
export function giftFor(chapterId) { return GIFTS.find(g => g.gift === chapterId) || null; }
