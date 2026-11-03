/* ============================================================
   COMIDAS EM IMAGENS (feltro/clay 3D, mesmo estilo da Nubi).
   assets/comidas/comida_<id>.webp (uma por alimento) e resto_<tipo>.webp
   (o que sobra para a lixeira), recortadas por scripts/food-sprites.py.
   Enquanto uma imagem não carregou, quem chama usa o desenho em código.
   ============================================================ */

const FOOD_IDS = ["blueberry", "strawberry", "banana", "pear", "watermelon", "grapes", "orange", "apple",
  "sandwich", "pizza", "carrot", "broccoli", "cupcake", "popsicle", "milk", "juice",
  "rainbowcake", "starcookie", "icecream", "donut"];
const SCRAPS = ["bananapeel", "pearcore", "stem", "stick", "twig", "wrapper"];
// o que sobra de cada comida (o resto vira "galhinho com folha")
const SCRAP_OF = {
  banana: "bananapeel", pear: "pearcore", apple: "pearcore", strawberry: "stem", popsicle: "stick",
  sandwich: "wrapper", pizza: "wrapper", cupcake: "wrapper", milk: "wrapper", juice: "wrapper",
  rainbowcake: "wrapper", starcookie: "wrapper", icecream: "wrapper", donut: "wrapper"
};
// lado maior da imagem, em raios (o desenho antigo ocupava ~2r)
const FIT = 2.3, SCRAP_FIT = 2.5;

const imgs = new Map();
function load(name) {
  const im = new Image();
  im.onload = () => { im.ok = true; };
  im.src = "assets/comidas/" + name + ".webp";
  imgs.set(name, im);
}
if (typeof Image !== "undefined") {
  FOOD_IDS.forEach(id => load("comida_" + id));
  SCRAPS.forEach(s => load("resto_" + s));
}

function draw(ctx, name, r, fit) {
  const im = imgs.get(name);
  if (!im || !im.ok) return false;
  const k = (r * fit) / Math.max(im.naturalWidth, im.naturalHeight);
  const w = im.naturalWidth * k, h = im.naturalHeight * k;
  ctx.drawImage(im, -w / 2, -h / 2, w, h);
  return true;
}

/* Desenha a comida id centrada em (0,0) no raio r. false = imagem ainda não pronta. */
export function drawFoodSprite(ctx, id, r) { return draw(ctx, "comida_" + id, r, FIT); }

/* Desenha o resto da comida id (casca, talo, embalagem...) centrado em (0,0). */
const scrapName = (id) => "resto_" + (SCRAP_OF[id] || "twig");
export function drawScrapSprite(ctx, id, r) { return draw(ctx, scrapName(id), r, SCRAP_FIT); }
export function scrapReady(id) { const im = imgs.get(scrapName(id)); return !!(im && im.ok); }
