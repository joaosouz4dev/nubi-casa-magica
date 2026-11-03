/* Lista de falas para GRAVAR (voz humana no lugar da sintetizada).
     node scripts/voice-lines.mjs > falas.csv
   Saída: id;texto  (grave cada fala em assets/voice/<id>.mp3 e inclua o id
   em RECORDED, em src/data/voice_lines.js). Junta:
   - pedidos, nomes de cômodos e chamadas "Vamos para..." (voice_lines.js);
   - elogios (chapters.js), falas das comidas (foods.js), "oi" dos bichinhos;
   - frases literais de nubi.say(...) e das listas *_LINES no código.
   Frases montadas em tempo de execução (ex.: "Super " + nome) ficam de fora. */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const load = (p) => import(pathToFileURL(join(root, p)).href);

const lines = new Set();
const add = (t) => { if (typeof t === "string" && t.trim()) lines.add(t.trim()); };

const V = await load("src/data/voice_lines.js");
const { FOODS } = await load("src/data/foods.js");
const C = await load("src/data/chapters.js");
const { PETS } = await load("src/data/pets.js");

Object.values(V.WISH_LINES).forEach(add);
Object.values(V.ROOM_NAMES).forEach(add);
for (const id of Object.keys(FOODS)) add(V.wishLine({ act: "feed:" + id }, false));
for (const room of Object.keys(V.ROOM_NAMES)) add(V.wishLine({ act: "x", room }, true));
(C.PRAISE || []).forEach(add); (C.CHAPTER_PRAISE || []).forEach(add);
for (const f of Object.values(FOODS)) ((f.effect && f.effect.say) || []).forEach(add);
for (const p of Object.values(PETS)) add(p.hello);

// literais no código: say("..."), say(["...", "..."][i]) e listas *_LINES = [...]
const strings = (src) => [...src.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(m => m[1]);
const walk = (d) => readdirSync(d).flatMap(n => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : p.endsWith(".js") ? [p] : []; });
for (const file of walk(join(root, "src"))) {
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(/\bsay\(\s*(\[[^\]]*\]|"(?:[^"\\]|\\.)*")\s*[\)\[]/g)) strings(m[1]).forEach(add);
  for (const m of src.matchAll(/\b[A-Z_]*LINES\s*=\s*(\[[^\]]*\])/g)) strings(m[1]).forEach(add);
}

// mesmo id = mesma gravação ("Hmm!" e "Hmm..." -> hmm): fica a primeira
const byId = new Map();
for (const t of [...lines].sort((a, b) => a.localeCompare(b, "pt-BR"))) if (!byId.has(V.voiceId(t))) byId.set(V.voiceId(t), t);
console.log("id;texto");
for (const [id, t] of byId) console.log(id + ";" + t);
console.error(byId.size + " falas");
