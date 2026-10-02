/* ============================================================
   DADOS CONFIGURÁVEIS — alimentos e regras de reação (MVP)
   Adicionar um novo alimento = adicionar uma entrada aqui.
   Nenhuma lógica é duplicada por item (ver systems/interactions.js
   e systems/effects.js, que tratam cada 'effect.kind').
   ============================================================ */

export const FOODS = {
  blueberry: {
    id: "blueberry",
    label: "frutinha azul",
    shape: "berry",
    color: "#4a74d6",
    leaf: "#4caf6a",
    radius: 34,
    effect: {
      kind: "tint",
      color: "#5b8def",
      persistent: true,
      say: ["Que gostoso!", "Fiquei azul!", "Hmm, azul!"],
      discovery: "nubi_azul"
    }
  },

  strawberry: {
    id: "strawberry",
    label: "morango",
    shape: "strawberry",
    color: "#e8426b",
    leaf: "#4caf6a",
    radius: 34,
    effect: {
      kind: "hearts",        // bolhas em formato de coração
      say: ["Olha só!", "Corações!", "Que amor!"],
      discovery: "nubi_coracoes"
    }
  },

  banana: {
    id: "banana",
    label: "banana",
    shape: "banana",
    color: "#f6cf3f",
    radius: 38,
    effect: {
      kind: "moonTuft",      // tufo vira lua crescente por um instante
      say: ["Que lua!", "Lua no tufo!", "Uau, lua!"],
      discovery: "nubi_lua"
    }
  },

  pear: {
    id: "pear",
    label: "pera",
    shape: "pear",
    color: "#9ad24a",
    leaf: "#4caf6a",
    radius: 36,
    effect: {
      kind: "cheeksWhistle", // bochechas infladas + assobio suave
      say: ["Fiiiu!", "Fiu-fiu!", "Bochechudo!"],
      discovery: "nubi_assobio"
    }
  }
};

// Posições iniciais na mesa da cozinha (design-space 0..1), bem separados.
export const KITCHEN_FOOD_SLOTS = [
  { food: "blueberry",  x: 0.12, y: 0.80 },
  { food: "strawberry", x: 0.24, y: 0.80 },
  { food: "banana",     x: 0.36, y: 0.80 },
  { food: "pear",       x: 0.48, y: 0.80 }
];

// Área da "boca" do Nubi relativa ao seu raio.
export const MOUTH_OFFSET = { x: 0, y: 0.18, r: 0.42 };
