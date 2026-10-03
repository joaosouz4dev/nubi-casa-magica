/* ============================================================
   DADOS CONFIGURÁVEIS - alimentos, grupos (abas da geladeira) e reações.
   Adicionar um alimento = uma entrada em FOODS + incluir o id numa aba.
   Cada 'effect.kind' é tratado em systems/effects.js; a arte de cada
   'shape' fica em entities/food_art.js. Nenhuma lógica por item.
   ============================================================ */

export const FOODS = {
  // ---------------- frutas ----------------
  blueberry: {
    id: "blueberry", label: "frutinha azul", shape: "berry", color: "#4a74d6", leaf: "#4caf6a", radius: 34,
    effect: { kind: "tint", color: "#5b8def", persistent: true, say: ["Que gostoso!", "Fiquei azul!", "Hmm, azul!"], discovery: "nubi_azul" }
  },
  strawberry: {
    id: "strawberry", label: "morango", shape: "strawberry", color: "#e8426b", leaf: "#4caf6a", radius: 34,
    effect: { kind: "hearts", say: ["Olha só!", "Corações!", "Que amor!"], discovery: "nubi_coracoes" }
  },
  banana: {
    id: "banana", label: "banana", shape: "banana", color: "#f6cf3f", radius: 38,
    effect: { kind: "moonTuft", say: ["Que lua!", "Lua no tufo!", "Uau, lua!"], discovery: "nubi_lua" }
  },
  pear: {
    id: "pear", label: "pera", shape: "pear", color: "#9ad24a", leaf: "#4caf6a", radius: 36,
    effect: { kind: "cheeksWhistle", say: ["Fiiiu!", "Fiu-fiu!", "Bochechudo!"], discovery: "nubi_assobio" }
  },
  watermelon: {
    id: "watermelon", label: "melancia", shape: "watermelon", color: "#ff5a6e", radius: 36,
    effect: { kind: "tint", color: "#ff9cc0", persistent: true, say: ["Fiquei rosinha!", "Que fresquinha!", "Rosa, rosa!"], discovery: "nubi_rosa" }
  },
  grapes: {
    id: "grapes", label: "uva", shape: "grapes", color: "#8a5bd6", radius: 36,
    effect: { kind: "bubbles", color: "#c7a6ff", say: ["Bolhinhas!", "Plim, plim!", "Uvinhas!"], discovery: "nubi_bolhas" }
  },
  orange: {
    id: "orange", label: "laranja", shape: "orange", color: "#ff9a2e", radius: 35,
    effect: { kind: "sunny", color: "#ffb347", say: ["Que energia!", "Sol na barriga!", "Brilhei!"], discovery: "nubi_sol" }
  },
  apple: {
    id: "apple", label: "maçã", shape: "apple", color: "#e5384d", radius: 35,
    effect: { kind: "crunch", say: ["Croc, croc!", "Crocante!", "Que delícia!"], discovery: "nubi_croc" }
  },
  // ---------------- salgados ----------------
  sandwich: {
    id: "sandwich", label: "sanduíche", shape: "sandwich", color: "#f2d29a", radius: 37,
    effect: { kind: "dance", say: ["Dancinha!", "Hmm, sanduba!", "Que bom!"], discovery: "nubi_danca" }
  },
  pizza: {
    id: "pizza", label: "pizza", shape: "pizza", color: "#ffd86b", radius: 37,
    effect: { kind: "stretch", say: ["Queijinho!", "Estiiiica!", "Hmm, pizza!"], discovery: "nubi_queijo" }
  },
  carrot: {
    id: "carrot", label: "cenoura", shape: "carrot", color: "#ff8a2a", radius: 36,
    effect: { kind: "ears", say: ["Orelhas em pé!", "Escuto tudo!", "Cenourinha!"], discovery: "nubi_orelhas" }
  },
  broccoli: {
    id: "broccoli", label: "brócolis", shape: "broccoli", color: "#4fae4a", radius: 36,
    effect: { kind: "strong", say: ["Fortão!", "Que força!", "Super forte!"], discovery: "nubi_forte" }
  },
  // ---------------- doces e bebidas ----------------
  cupcake: {
    id: "cupcake", label: "bolinho", shape: "cupcake", color: "#ff9fc4", radius: 37,
    effect: { kind: "party", say: ["Festinha!", "Que lindo!", "Eba, bolinho!"], discovery: "nubi_festinha" }
  },
  popsicle: {
    id: "popsicle", label: "picolé", shape: "popsicle", color: "#7fd0ff", radius: 37,
    effect: { kind: "cold", say: ["Brrr!", "Geladinho!", "Que frio!"], discovery: "nubi_brr" }
  },
  milk: {
    id: "milk", label: "leite", shape: "milk", color: "#ffffff", radius: 35,
    effect: { kind: "milk", say: ["Bigodinho!", "Hmm, leitinho!", "Olha meu bigode!"], discovery: "nubi_bigode_leite" }
  },
  juice: {
    id: "juice", label: "suco", shape: "juice", color: "#ffb347", radius: 35,
    effect: { kind: "music", say: ["Lá-lá-lá!", "Musiquinha!", "Que suquinho!"], discovery: "nubi_musica" }
  },
  // ---------------- especiais (prêmios da lojinha) ----------------
  rainbowcake: {
    id: "rainbowcake", label: "bolo arco-íris", shape: "rainbowcake", color: "#ff6b6b", radius: 38, special: true,
    effect: { kind: "rainbow", say: ["Arco-íris!", "Que mágico!", "Uaaau!"], discovery: "nubi_arcoiris" }
  },
  starcookie: {
    id: "starcookie", label: "biscoito estrela", shape: "starcookie", color: "#e9b46a", radius: 36, special: true,
    effect: { kind: "stars", say: ["Estrelinhas!", "Brilha, brilha!", "Sou uma estrela!"], discovery: "nubi_estrelado" }
  },
  icecream: {
    id: "icecream", label: "sorvete", shape: "icecream", color: "#ff9fc4", radius: 38, special: true,
    effect: { kind: "float", say: ["Tô flutuando!", "Que leve!", "Voando!"], discovery: "nubi_flutua" }
  },
  donut: {
    id: "donut", label: "rosquinha", shape: "donut", color: "#ff7ab8", radius: 36, special: true,
    effect: { kind: "spin", say: ["Rodopio!", "Gira, gira!", "Que tontura boa!"], discovery: "nubi_rodopio" }
  }
};

/* Abas da geladeira: 4 comidas por vez na mesa. A primeira aba é a da
   versão original (os testes antigos dependem desta ordem). A aba de
   especiais só aparece quando há algum especial ganho na lojinha. */
export const FOOD_TABS = [
  { id: "frutas",   icon: "food:strawberry", color: "#ff9fc4", foods: ["blueberry", "strawberry", "banana", "pear"] },
  { id: "frutas2",  icon: "food:watermelon", color: "#9be564", foods: ["watermelon", "grapes", "orange", "apple"] },
  { id: "salgados", icon: "food:pizza",    color: "#ffd86b", foods: ["sandwich", "pizza", "carrot", "broccoli"] },
  { id: "doces",    icon: "food:cupcake",    color: "#bfe6ff", foods: ["cupcake", "popsicle", "milk", "juice"] },
  { id: "especiais", icon: "food:rainbowcake", color: "#ffe27a", foods: ["rainbowcake", "starcookie", "icecream", "donut"], special: true }
];
export const SLOT_X = [0.12, 0.24, 0.36, 0.48];
export const SLOT_Y = 0.80;
export const TAB_Y = 0.58;
export const TAB_X0 = 0.12, TAB_DX = 0.09;

export function tabOf(foodId) { return FOOD_TABS.find(t => t.foods.includes(foodId)) || null; }

// Posições iniciais na mesa (compatibilidade: primeira aba).
export const KITCHEN_FOOD_SLOTS = FOOD_TABS[0].foods.map((food, i) => ({ food, x: SLOT_X[i], y: SLOT_Y }));

// Área da "boca" do Nubi relativa ao seu raio.
export const MOUTH_OFFSET = { x: 0, y: 0.18, r: 0.42 };
