/* Bichinhos selecionáveis. A arte é a mesma base procedural do Nubi;
   cada espécie muda cor, orelhas, tufo e focinho. Todas as opções de roupa
   e beleza servem para qualquer bichinho: nada é travado por gênero. */
export const PETS = {
  nubi:  { id: "nubi",  name: "Nubi", body: "#f3e6d4", tuft: "#cdb8f0", ears: "nubi",  hello: "Oi, sou o Nubi!" },
  bunny: { id: "bunny", name: "Lili", body: "#ffe3ee", tuft: null,      ears: "bunny", inner: "#ff9fc4", hello: "Oi, sou a Lili!" },
  bear:  { id: "bear",  name: "Tito", body: "#d9a273", tuft: null,      ears: "bear",  muzzle: "#f3d3b0", hello: "Oi, sou o Tito!" }
};
export const PET_ORDER = ["nubi", "bunny", "bear"];
