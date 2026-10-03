/* Ícones desenhados (sem texto, sem emoji): usados no balão de pensamento
   do Nubi, nos adesivos do álbum e nos enfeites. Um único lugar desenha
   cada objeto em miniatura, no mesmo estilo dos objetos do jogo. */
import { FoodItem } from "../entities/food_item.js";
import { FOODS } from "../data/foods.js";
import { roundRect, lighten, darken } from "../core/anim.js";
import { ITEMS } from "../data/wardrobe.js";
import { wearIcon, paintHair, paintHairAcc, paintMakeupUnder, paintMakeupOver } from "../entities/wear.js";
import { Nubi } from "../entities/nubi.js";

const foodCache = new Map();

function fs(ctx, fill, edge, w) {
  ctx.strokeStyle = edge; ctx.lineWidth = w * 2; ctx.stroke();
  ctx.fillStyle = fill; ctx.fill();
}
function star(ctx, x, y, r, fill) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    ctx.lineTo(x + Math.cos(a + Math.PI / 5) * r * 0.46, y + Math.sin(a + Math.PI / 5) * r * 0.46);
  }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}

export function drawIcon(ctx, key, x, y, r) {
  const ow = Math.max(1.4, r * 0.07);
  if (EXTRA[key]) {
    ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.translate(x, y);
    EXTRA[key](ctx, r, ow);
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  if (key.startsWith("food:")) {
    const id = key.slice(5);
    const def = FOODS[id];
    if (def) {
      let it = foodCache.get(id);
      const vp = { ctx, s: (v) => v * 400 * (r * 0.8) / def.radius, dx: (v) => v, dy: (v) => v };
      if (!it) { it = new FoodItem(def, vp, 0, 0); foodCache.set(id, it); }
      it.vp = vp; it.pos = { x, y }; it.dragging = true; it.pop = 1; it.scale = 1; it.tilt = 0;
      it.draw();
    }
    ctx.restore();
    return;
  }
  if (key.startsWith("combo:")) {
    const [a, b] = {
      "blue-foam": ["food:blueberry", "sponge"],
      "fluffy-hat": ["towel", "hat"],
      "cape-ball": ["cape", "ball"]
    }[key.slice(6)] || ["star", "star"];
    drawIcon(ctx, a, x - r * 0.62, y, r * 0.55);
    drawIcon(ctx, b, x + r * 0.62, y, r * 0.55);
    ctx.strokeStyle = "#8a7fa0"; ctx.lineWidth = Math.max(2, r * 0.1);
    ctx.beginPath(); ctx.moveTo(x - r * 0.12, y); ctx.lineTo(x + r * 0.12, y); ctx.moveTo(x, y - r * 0.12); ctx.lineTo(x, y + r * 0.12); ctx.stroke();
    ctx.restore();
    return;
  }
  if (key.startsWith("wear:")) {
    const def = ITEMS[key.slice(5)];
    if (def && def.shape) wearIcon(ctx, def, x, y, r * 0.75);
    else if (def) drawIcon(ctx, def.id, x, y, r);
    ctx.restore();
    return;
  }
  if (key.startsWith("pet:")) {
    drawPetIcon(ctx, key.slice(4), x, y, r);
    ctx.restore();
    return;
  }
  if (key.startsWith("hair:")) {
    ctx.translate(x, y + r * 0.55);
    const rr = r * 0.62;
    ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); fs(ctx, "#f3e6d4", "#7a6a5a", ow);
    paintHair(ctx, key.slice(5), "#8a5a36", rr, 0);
    ctx.restore();
    return;
  }
  if (key.startsWith("color:")) {
    const c = key.slice(6);
    ctx.translate(x, y);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2); fs(ctx, c, darken(c, 0.45), ow);
    ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.ellipse(-r * 0.2, -r * 0.22, r * 0.16, r * 0.1, -0.5, 0, 7); ctx.fill();
    ctx.restore();
    return;
  }
  if (key.startsWith("acc:")) {
    const a = key.slice(4);
    const [ox, oy] = { bow: [0.5, -0.92], flower: [-0.55, -0.88], starclip: [0.55, -0.8], headband: [0, -0.62] }[a] || [0, 0];
    const R = a === "headband" ? r * 0.75 : r * 1.6;
    ctx.translate(x - ox * R, y - oy * R);
    paintHairAcc(ctx, a, R, 0);
    ctx.restore();
    return;
  }
  if (key.startsWith("polish:")) {
    const c = key.slice(7);
    ctx.translate(x, y);
    roundRect(ctx, -r * 0.42, -r * 0.15, r * 0.84, r * 0.85, r * 0.25); fs(ctx, c, darken(c, 0.45), ow);
    ctx.fillStyle = "rgba(255,255,255,.5)"; roundRect(ctx, -r * 0.3, -r * 0.05, r * 0.14, r * 0.55, r * 0.07); ctx.fill();
    roundRect(ctx, -r * 0.2, -r * 0.75, r * 0.4, r * 0.62, r * 0.1); fs(ctx, "#3a2f4f", "#15111e", ow);
    ctx.restore();
    return;
  }
  if (key.startsWith("makeup:") || key.startsWith("paint:")) {
    drawBeautyIcon(ctx, key, x, y, r, ow);
    ctx.restore();
    return;
  }
  ctx.translate(x, y);
  switch (key) {
    case "looks": {
      roundRect(ctx, -r * 0.75, -r * 0.8, r * 1.5, r * 1.6, r * 0.3); fs(ctx, "#fff7d6", "#e0a21c", ow);
      drawIcon(ctx, "cape", -r * 0.2, r * 0.1, r * 0.45);
      drawIcon(ctx, "hat", r * 0.2, -r * 0.2, r * 0.45);
      star(ctx, r * 0.45, r * 0.45, r * 0.18, "#ffd54a");
      break;
    }
    case "gift": {
      roundRect(ctx, -r * 0.7, -r * 0.25, r * 1.4, r * 0.95, r * 0.12); fs(ctx, "#ff6b9d", "#a8325c", ow);
      roundRect(ctx, -r * 0.8, -r * 0.5, r * 1.6, r * 0.32, r * 0.1); fs(ctx, "#ff8fb1", "#a8325c", ow);
      ctx.fillStyle = "#ffd54a"; ctx.fillRect(-r * 0.12, -r * 0.5, r * 0.24, r * 1.2);
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * r * 0.25, -r * 0.65, r * 0.25, r * 0.15, s * 0.5, 0, 7); fs(ctx, "#ffd54a", "#a8791a", ow * 0.7); }
      break;
    }
    case "tooth": case "teeth:align": case "teeth:all": {
      ctx.beginPath();
      ctx.moveTo(-r * 0.55, -r * 0.45); ctx.quadraticCurveTo(-r * 0.6, -r * 0.8, -r * 0.2, -r * 0.75); ctx.quadraticCurveTo(0, -r * 0.65, r * 0.2, -r * 0.75);
      ctx.quadraticCurveTo(r * 0.6, -r * 0.8, r * 0.55, -r * 0.45); ctx.quadraticCurveTo(r * 0.5, r * 0.1, r * 0.35, r * 0.75); ctx.quadraticCurveTo(r * 0.2, r * 0.85, r * 0.12, r * 0.45);
      ctx.quadraticCurveTo(0, r * 0.2, -r * 0.12, r * 0.45); ctx.quadraticCurveTo(-r * 0.2, r * 0.85, -r * 0.35, r * 0.75); ctx.quadraticCurveTo(-r * 0.5, r * 0.1, -r * 0.55, -r * 0.45); ctx.closePath();
      fs(ctx, "#ffffff", "#8fa3b8", ow);
      if (key === "teeth:align") { ctx.strokeStyle = "#62c370"; ctx.lineWidth = ow * 1.6; ctx.beginPath(); ctx.moveTo(-r * 0.9, r * 0.1); ctx.lineTo(-r * 0.65, r * 0.1); ctx.moveTo(-r * 0.75, 0); ctx.lineTo(-r * 0.65, r * 0.1); ctx.lineTo(-r * 0.75, r * 0.2); ctx.stroke(); }
      else { ctx.fillStyle = "#ffe27a"; star(ctx, r * 0.5, -r * 0.7, r * 0.2, "#ffe27a"); }
      break;
    }
    case "teeth:plaque": case "brush": {
      ctx.rotate(-0.6);
      roundRect(ctx, -r * 0.14, -r * 0.2, r * 0.28, r * 1.1, r * 0.12); fs(ctx, "#5bc0eb", "#2d6f8f", ow);
      roundRect(ctx, -r * 0.2, -r * 0.75, r * 0.4, r * 0.55, r * 0.1); fs(ctx, "#ffffff", "#8fa3b8", ow);
      ctx.fillStyle = "#7fd6ff"; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, -r * (0.65 - i * 0.17), r * 0.08, 0, 7); ctx.fill(); }
      break;
    }
    case "teeth:bugs": case "bug": {
      ctx.beginPath(); ctx.ellipse(0, r * 0.1, r * 0.6, r * 0.5, 0, 0, 7); fs(ctx, "#9be564", "#4f8a2a", ow);
      ctx.fillStyle = "#fff"; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * r * 0.22, -r * 0.02, r * 0.15, 0, 7); ctx.fill(); }
      ctx.fillStyle = "#2a2148"; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * r * 0.22, 0, r * 0.07, 0, 7); ctx.fill(); }
      ctx.strokeStyle = "#4f8a2a"; ctx.lineWidth = ow; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * r * 0.2, -r * 0.35); ctx.lineTo(s * r * 0.35, -r * 0.7); ctx.stroke(); }
      ctx.strokeStyle = "#2a2148"; ctx.beginPath(); ctx.arc(0, r * 0.25, r * 0.12, 0.2, Math.PI - 0.2); ctx.stroke();
      break;
    }
    case "teeth:rinse": case "cup": {
      ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.6); ctx.lineTo(r * 0.5, -r * 0.6); ctx.lineTo(r * 0.38, r * 0.7); ctx.lineTo(-r * 0.38, r * 0.7); ctx.closePath(); fs(ctx, "#ff9bc4", "#b3406f", ow);
      ctx.fillStyle = "#7cc4ff"; ctx.beginPath(); ctx.ellipse(0, -r * 0.55, r * 0.46, r * 0.1, 0, 0, 7); ctx.fill();
      break;
    }
    case "poop": case "poop:flush": {
      for (const [yy, rx] of [[0.45, 0.65], [0.05, 0.48], [-0.32, 0.3]]) { ctx.beginPath(); ctx.ellipse(0, yy * r, rx * r, r * 0.24, 0, 0, 7); fs(ctx, "#a86b3c", "#5e3818", ow); }
      ctx.beginPath(); ctx.moveTo(-r * 0.05, -r * 0.5); ctx.quadraticCurveTo(r * 0.15, -r * 0.8, r * 0.2, -r * 0.62); ctx.strokeStyle = "#5e3818"; ctx.lineWidth = ow * 1.6; ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.beginPath(); ctx.ellipse(-r * 0.25, r * 0.0, r * 0.12, r * 0.06, -0.3, 0, 7); ctx.fill();
      if (key === "poop:flush") { ctx.strokeStyle = "#5bc0eb"; ctx.lineWidth = ow * 1.4; ctx.beginPath(); ctx.arc(r * 0.75, -r * 0.4, r * 0.22, 0, Math.PI * 1.5); ctx.stroke(); }
      break;
    }
    case "trash": case "trash:bin": {
      roundRect(ctx, -r * 0.5, -r * 0.4, r * 1.0, r * 1.1, r * 0.15); fs(ctx, "#62c370", "#2f7a3d", ow);
      roundRect(ctx, -r * 0.6, -r * 0.6, r * 1.2, r * 0.24, r * 0.1); fs(ctx, "#7fd88a", "#2f7a3d", ow);
      ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = ow;
      for (const xx of [-0.2, 0, 0.2]) { ctx.beginPath(); ctx.moveTo(xx * r, -r * 0.25); ctx.lineTo(xx * r, r * 0.55); ctx.stroke(); }
      if (key === "trash:bin") drawIcon(ctx, "food:banana", -r * 0.45, -r * 0.85, r * 0.4);
      break;
    }
    case "bag": case "trash:out": {
      ctx.beginPath(); ctx.moveTo(-r * 0.15, -r * 0.55); ctx.quadraticCurveTo(-r * 0.75, -r * 0.2, -r * 0.6, r * 0.5); ctx.quadraticCurveTo(0, r * 0.85, r * 0.6, r * 0.5);
      ctx.quadraticCurveTo(r * 0.75, -r * 0.2, r * 0.15, -r * 0.55); ctx.closePath(); fs(ctx, "#4a5568", "#1d2330", ow);
      ctx.beginPath(); ctx.moveTo(-r * 0.15, -r * 0.55); ctx.lineTo(-r * 0.3, -r * 0.8); ctx.moveTo(r * 0.15, -r * 0.55); ctx.lineTo(r * 0.3, -r * 0.8); ctx.strokeStyle = "#1d2330"; ctx.lineWidth = ow * 1.4; ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.2)"; ctx.beginPath(); ctx.ellipse(-r * 0.28, r * 0.05, r * 0.1, r * 0.22, 0.2, 0, 7); ctx.fill();
      if (key === "trash:out") { ctx.strokeStyle = "#62c370"; ctx.lineWidth = ow * 1.8; ctx.beginPath(); ctx.moveTo(r * 0.55, -r * 0.1); ctx.lineTo(r * 0.95, -r * 0.1); ctx.lineTo(r * 0.82, -r * 0.25); ctx.moveTo(r * 0.95, -r * 0.1); ctx.lineTo(r * 0.82, r * 0.05); ctx.stroke(); }
      break;
    }
    case "comb": {
      ctx.rotate(-0.3);
      roundRect(ctx, -r * 0.8, -r * 0.35, r * 1.6, r * 0.32, r * 0.12); fs(ctx, "#ff9bc4", "#b3406f", ow);
      ctx.strokeStyle = "#b3406f"; ctx.lineWidth = ow * 1.2;
      for (let i = 0; i < 9; i++) { const xx = -r * 0.68 + i * r * 0.17; ctx.beginPath(); ctx.moveTo(xx, -r * 0.05); ctx.lineTo(xx, r * 0.4); ctx.stroke(); }
      break;
    }
    case "wipe": {
      roundRect(ctx, -r * 0.65, -r * 0.55, r * 1.3, r * 1.1, r * 0.2); fs(ctx, "#ffffff", "#9aa9bd", ow);
      ctx.strokeStyle = "#cfe6ff"; ctx.lineWidth = ow; for (const yy of [-0.25, 0, 0.25]) { ctx.beginPath(); ctx.moveTo(-r * 0.45, yy * r); ctx.quadraticCurveTo(0, yy * r + r * 0.08, r * 0.45, yy * r); ctx.stroke(); }
      for (const [a, b] of [[0.5, -0.6], [0.7, -0.35]]) { ctx.beginPath(); ctx.arc(a * r, b * r, r * 0.09, 0, 7); fs(ctx, "#e3f4ff", "#7cc4ff", ow * 0.5); }
      break;
    }
    case "room:dentist": {
      ctx.translate(0, 0); ctx.restore(); ctx.save(); drawIcon(ctx, "tooth", x, y, r); break;
    }
    case "room:salon": {
      ctx.restore(); ctx.save();
      drawIcon(ctx, "hair:curls", x - r * 0.15, y, r * 0.9);
      drawBeautyIcon(ctx, "makeup:lips", x + r * 0.55, y + r * 0.45, r * 0.5, ow);
      break;
    }
    case "hair": case "beauty": case "nails": {
      ctx.restore(); ctx.save();
      drawIcon(ctx, key === "nails" ? "polish:#ff6bb5" : key === "hair" ? "hair:ponytail" : "makeup:lips", x, y, r);
      break;
    }
    default: {
      ctx.restore(); ctx.save();
      drawIconBase(ctx, key, x, y, r, ow);
      break;
    }
  }
  ctx.restore();
}

function drawBeautyIcon(ctx, key, x, y, r, ow) {
  ctx.save(); ctx.translate(x, y);
  const v = key.split(":")[1];
  if (v === "lips") {
    ctx.beginPath(); ctx.moveTo(-r * 0.6, 0); ctx.quadraticCurveTo(-r * 0.3, -r * 0.4, 0, -r * 0.15); ctx.quadraticCurveTo(r * 0.3, -r * 0.4, r * 0.6, 0);
    ctx.quadraticCurveTo(0, r * 0.55, -r * 0.6, 0); ctx.closePath(); fs(ctx, "#e8426b", "#8a1f3a", ow);
  } else if (v === "blush") {
    ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, 7); fs(ctx, "#ffd0e3", "#c7709a", ow);
    ctx.fillStyle = "#ff7aa8"; ctx.beginPath(); ctx.arc(0, 0, r * 0.42, 0, 7); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.beginPath(); ctx.arc(-r * 0.14, -r * 0.14, r * 0.12, 0, 7); ctx.fill();
  } else if (v === "shadow") {
    roundRect(ctx, -r * 0.7, -r * 0.45, r * 1.4, r * 0.9, r * 0.2); fs(ctx, "#ffffff", "#9aa9bd", ow);
    ["#9a7bff", "#5bc0eb", "#ff9fc4"].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc((i - 1) * r * 0.42, 0, r * 0.17, 0, 7); ctx.fill(); });
  } else if (v === "glitter") {
    for (const [a, b, s, c] of [[0, 0, 0.45, "#ffd54a"], [-0.45, -0.4, 0.22, "#ff9fc4"], [0.45, 0.4, 0.25, "#9be5ff"]]) {
      ctx.beginPath(); for (let i = 0; i < 4; i++) { const t = (i * Math.PI) / 2; ctx.lineTo(a * r + Math.cos(t) * s * r, b * r + Math.sin(t) * s * r); ctx.lineTo(a * r + Math.cos(t + 0.78) * s * r * 0.3, b * r + Math.sin(t + 0.78) * s * r * 0.3); } ctx.closePath(); ctx.fillStyle = c; ctx.fill();
    }
  } else {
    // pinturas de rosto: a pintura em close, grande, sobre um círculo de pele
    const rr = r * 0.7;
    ctx.beginPath(); ctx.arc(0, 0, rr, 0, 7); fs(ctx, "#f3e6d4", "#7a6a5a", ow);
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, rr * 0.94, 0, 7); ctx.clip();
    const fit = { mustache: [2.1, 0.27], hero: [1.0, 0.13], stars: [1.15, 0.05], freckles: [1.2, 0.1], beard: [1.15, 0.47] }[v] || [1, 0];
    const R = r * fit[0];
    ctx.translate(0, -fit[1] * R);
    paintMakeupUnder(ctx, {}, { [v]: 1 }, R, 0, {});
    paintMakeupOver(ctx, {}, { [v]: 1 }, R, 0, {});
    ctx.restore();
  }
  ctx.restore();
}

/* Retrato pequeno do bichinho (vitrine e balão de pensamento). */
const petCache = new Map();
export function drawPetIcon(ctx, id, x, y, r, opts = {}) {
  let n = petCache.get(id);
  const vp = { ctx, w: 1, h: 1, s: (v) => v * (r / 0.17) * 0.78, dx: (v) => x + (v - 0.5) * 0, dy: (v) => y + (v - 0.5) * 0 };
  if (!n) { n = new Nubi(vp); n.setSpecies(id); petCache.set(id, n); }
  n.vp = vp; n.pos = { x: 0.5, y: 0.5 };
  if (opts.t !== undefined) n.t = opts.t;
  n.draw();
}

function drawIconBase(ctx, key, x, y, r, ow) {
  ctx.save();
  ctx.translate(x, y);
  switch (key) {
    case "sponge": {
      roundRect(ctx, -r * 0.85, -r * 0.55, r * 1.7, r * 1.1, r * 0.3); fs(ctx, "#ffd54a", "#a8791a", ow);
      ctx.fillStyle = "#7ed3a2"; roundRect(ctx, -r * 0.85, -r * 0.55, r * 1.7, r * 0.32, r * 0.16); ctx.fill();
      ctx.fillStyle = "rgba(200,140,20,.5)";
      for (const [a, b, c] of [[-0.4, 0.1, 0.1], [0.2, 0.2, 0.08], [0.5, -0.05, 0.07]]) { ctx.beginPath(); ctx.arc(a * r, b * r, c * r, 0, 7); ctx.fill(); }
      break;
    }
    case "shower": {
      ctx.rotate(-0.25);
      roundRect(ctx, -r * 0.14, -r * 0.1, r * 0.28, r * 0.85, r * 0.12); fs(ctx, "#cfd8e3", "#6c7a8f", ow);
      ctx.beginPath(); ctx.ellipse(0, -r * 0.3, r * 0.55, r * 0.36, 0, 0, 7); fs(ctx, "#bfe6ff", "#4c7ea6", ow);
      ctx.fillStyle = "#7cc4ff";
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(i * r * 0.25, r * 0.25 + Math.abs(i) * r * 0.1, r * 0.07, 0, 7); ctx.fill(); }
      break;
    }
    case "towel": {
      roundRect(ctx, -r * 0.75, -r * 0.75, r * 1.5, r * 1.5, r * 0.25); fs(ctx, "#ff9bc4", "#b3406f", ow);
      ctx.fillStyle = "rgba(255,255,255,.8)"; roundRect(ctx, -r * 0.75, r * 0.25, r * 1.5, r * 0.15, r * 0.05); ctx.fill();
      break;
    }
    case "duck": {
      ctx.beginPath(); ctx.ellipse(0, r * 0.15, r * 0.75, r * 0.5, 0, 0, 7); fs(ctx, "#ffe14d", "#b8860b", ow);
      ctx.beginPath(); ctx.arc(r * 0.35, -r * 0.4, r * 0.38, 0, 7); fs(ctx, "#ffe14d", "#b8860b", ow);
      ctx.beginPath(); ctx.moveTo(r * 0.65, -r * 0.45); ctx.quadraticCurveTo(r * 1.05, -r * 0.38, r * 0.67, -r * 0.25); ctx.closePath(); fs(ctx, "#ff9a2e", "#b3550f", ow * 0.7);
      ctx.fillStyle = "#2a2148"; ctx.beginPath(); ctx.arc(r * 0.45, -r * 0.5, r * 0.07, 0, 7); ctx.fill();
      break;
    }
    case "hat": {
      ctx.beginPath(); ctx.ellipse(0, r * 0.45, r * 0.85, r * 0.2, 0, 0, 7); fs(ctx, "#6f2ad6", "#3d1680", ow);
      ctx.beginPath(); ctx.moveTo(-r * 0.5, r * 0.4); ctx.bezierCurveTo(-r * 0.4, -r * 0.1, -r * 0.15, -r * 0.55, r * 0.1, -r * 0.62);
      ctx.quadraticCurveTo(r * 0.38, -r * 0.7, r * 0.6, -r * 0.45); ctx.quadraticCurveTo(r * 0.3, -r * 0.4, r * 0.25, -r * 0.15);
      ctx.bezierCurveTo(r * 0.35, r * 0.05, r * 0.45, r * 0.25, r * 0.5, r * 0.4); ctx.closePath(); fs(ctx, "#9a55ff", "#3d1680", ow);
      ctx.fillStyle = "#ffc93a"; roundRect(ctx, -r * 0.48, r * 0.2, r * 0.96, r * 0.14, r * 0.05); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.62, -r * 0.46, r * 0.13, 0, 7); fs(ctx, "#fff4c2", "#8a7a40", ow * 0.7);
      star(ctx, -r * 0.12, -r * 0.02, r * 0.1, "#ffe27a");
      break;
    }
    case "cape": {
      ctx.beginPath(); ctx.moveTo(-r * 0.45, -r * 0.65);
      ctx.quadraticCurveTo(-r * 0.95, r * 0.2, -r * 0.8, r * 0.8); ctx.quadraticCurveTo(0, r * 0.65, r * 0.8, r * 0.8);
      ctx.quadraticCurveTo(r * 0.95, r * 0.2, r * 0.45, -r * 0.65); ctx.quadraticCurveTo(0, -r * 0.42, -r * 0.45, -r * 0.65); ctx.closePath();
      fs(ctx, "#e5484d", "#7e1d20", ow);
      ctx.fillStyle = "#ffd54a"; ctx.beginPath(); ctx.arc(0, -r * 0.5, r * 0.11, 0, 7); ctx.fill();
      break;
    }
    case "boots": {
      for (const s of [-1, 1]) {
        roundRect(ctx, s * r * 0.4 - r * 0.27, -r * 0.4, r * 0.54, r * 0.9, r * 0.22); fs(ctx, "#5b6ee8", "#2a3580", ow);
        roundRect(ctx, s * r * 0.4 - r * 0.3, -r * 0.5, r * 0.6, r * 0.18, r * 0.08); fs(ctx, "#b9c3ff", "#2a3580", ow * 0.7);
      }
      break;
    }
    case "ball": {
      const cols = ["#ff7a59", "#ffd54a", "#5bc0eb", "#ffffff", "#ff7a59", "#9be564"];
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, 7); ctx.clip();
      for (let i = 0; i < 6; i++) { ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, (i * Math.PI) / 3, ((i + 1) * Math.PI) / 3); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      ctx.strokeStyle = "#a83a22"; ctx.lineWidth = ow * 1.4; ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, 7); ctx.stroke();
      break;
    }
    case "basket": {
      ctx.beginPath(); ctx.ellipse(0, -r * 0.3, r * 0.85, r * 0.22, 0, 0, 7); ctx.fillStyle = "#4a2c12"; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-r * 0.85, -r * 0.3); ctx.lineTo(-r * 0.7, r * 0.7); ctx.quadraticCurveTo(0, r * 0.85, r * 0.7, r * 0.7); ctx.lineTo(r * 0.85, -r * 0.3);
      ctx.quadraticCurveTo(0, -r * 0.08, -r * 0.85, -r * 0.3); ctx.closePath(); fs(ctx, "#c98845", "#6e3f14", ow);
      ctx.strokeStyle = "#e6a86a"; ctx.lineWidth = ow * 1.6; ctx.beginPath(); ctx.ellipse(0, -r * 0.3, r * 0.85, r * 0.22, 0, 0, Math.PI); ctx.stroke();
      drawIcon(ctx, "ball", 0, -r * 0.55, r * 0.35);
      break;
    }
    case "pet": case "heart": {
      ctx.fillStyle = "#ff6b9d";
      ctx.beginPath(); ctx.moveTo(0, r * 0.75);
      ctx.bezierCurveTo(-r * 1.1, 0, -r * 0.6, -r * 0.85, 0, -r * 0.3);
      ctx.bezierCurveTo(r * 0.6, -r * 0.85, r * 1.1, 0, 0, r * 0.75); ctx.closePath();
      ctx.strokeStyle = "#a8325c"; ctx.lineWidth = ow * 2; ctx.stroke(); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.beginPath(); ctx.ellipse(-r * 0.35, -r * 0.2, r * 0.12, r * 0.2, -0.5, 0, 7); ctx.fill();
      break;
    }
    case "tummy": {
      // carinha rindo: cócegas na barriga
      ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, 7); fs(ctx, "#f3e6d4", "#7a6a5a", ow);
      ctx.strokeStyle = "#3a2f4f"; ctx.lineWidth = ow * 1.2;
      ctx.beginPath(); ctx.arc(-r * 0.28, -r * 0.1, r * 0.13, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      ctx.beginPath(); ctx.arc(r * 0.28, -r * 0.1, r * 0.13, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      ctx.fillStyle = "#5a2f45"; ctx.beginPath(); ctx.arc(0, r * 0.18, r * 0.25, 0, Math.PI); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#ff8fb1"; ctx.lineWidth = ow;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * r * 1.05, 0, r * 0.18, -0.8, 0.8); ctx.stroke(); }
      break;
    }
    case "cloud": {
      ctx.beginPath();
      ctx.arc(-r * 0.45, r * 0.1, r * 0.4, 0, 7); ctx.moveTo(r * 0.55, -r * 0.05);
      ctx.arc(0, -r * 0.05, r * 0.55, 0, 7); ctx.moveTo(r * 0.85, r * 0.1);
      ctx.arc(r * 0.45, r * 0.1, r * 0.4, 0, 7);
      ctx.strokeStyle = "#8f7cc0"; ctx.lineWidth = ow * 2; ctx.stroke(); ctx.fillStyle = "#e9e0ff"; ctx.fill();
      ctx.strokeStyle = "#3a2f4f"; ctx.lineWidth = ow * 1.1;
      ctx.beginPath(); ctx.arc(-r * 0.2, 0, r * 0.1, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.beginPath(); ctx.arc(r * 0.2, 0, r * 0.1, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.fillStyle = "#8a3bff"; ctx.font = `bold ${Math.round(r * 0.45)}px system-ui, sans-serif`; ctx.textAlign = "center";
      ctx.fillText("z", r * 0.75, -r * 0.55); ctx.font = `bold ${Math.round(r * 0.32)}px system-ui, sans-serif`; ctx.fillText("z", r * 1.0, -r * 0.85);
      break;
    }
    case "moon": {
      ctx.beginPath(); ctx.arc(0, 0, r * 0.7, Math.PI * 0.15, Math.PI * 1.85);
      ctx.arc(r * 0.4, -r * 0.1, r * 0.55, Math.PI * 1.7, Math.PI * 0.3, true); ctx.closePath();
      fs(ctx, "#f6e27a", "#a8891a", ow);
      break;
    }
    case "note": {
      ctx.fillStyle = "#7d5cff"; ctx.strokeStyle = "#7d5cff"; ctx.lineWidth = ow * 1.6;
      ctx.beginPath(); ctx.ellipse(-r * 0.2, r * 0.45, r * 0.32, r * 0.24, -0.4, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * 0.1, r * 0.4); ctx.lineTo(r * 0.1, -r * 0.7); ctx.quadraticCurveTo(r * 0.55, -r * 0.5, r * 0.6, -r * 0.15); ctx.stroke();
      break;
    }
    case "room:kitchen": {
      ctx.beginPath(); ctx.ellipse(0, r * 0.3, r * 0.85, r * 0.42, 0, 0, 7); fs(ctx, "#fff", "#c98a52", ow);
      drawIcon(ctx, "food:blueberry", -r * 0.3, -r * 0.05, r * 0.35);
      drawIcon(ctx, "food:strawberry", r * 0.3, -r * 0.05, r * 0.35);
      break;
    }
    case "room:bathroom": {
      ctx.beginPath(); ctx.moveTo(-r * 0.85, -r * 0.05); ctx.lineTo(r * 0.85, -r * 0.05); ctx.lineTo(r * 0.85, r * 0.2);
      ctx.quadraticCurveTo(r * 0.85, r * 0.75, r * 0.3, r * 0.75); ctx.lineTo(-r * 0.3, r * 0.75); ctx.quadraticCurveTo(-r * 0.85, r * 0.75, -r * 0.85, r * 0.2); ctx.closePath();
      fs(ctx, "#fff", "#4c7ea6", ow);
      for (const [a, b, c] of [[-0.3, -0.4, 0.17], [0.15, -0.6, 0.13], [0.45, -0.35, 0.1]]) { ctx.beginPath(); ctx.arc(a * r, b * r, c * r, 0, 7); fs(ctx, "#e3f4ff", "#4c7ea6", ow * 0.6); }
      break;
    }
    case "room:bedroom": {
      roundRect(ctx, -r * 0.85, -r * 0.6, r * 0.25, r * 1.2, r * 0.1); fs(ctx, "#b98ee6", "#6e4aa3", ow);
      roundRect(ctx, -r * 0.7, -r * 0.05, r * 1.55, r * 0.5, r * 0.2); fs(ctx, "#8fd3ff", "#3c7fb0", ow);
      roundRect(ctx, -r * 0.55, -r * 0.3, r * 0.5, r * 0.35, r * 0.15); fs(ctx, "#fff1a8", "#c49a1a", ow * 0.7);
      break;
    }
    case "star": default: {
      star(ctx, 0, 0, r * 0.8, "#ffd54a");
      break;
    }
  }
  ctx.restore();
}

/* Adesivo redondo de capítulo (álbum, voo de recompensa e varal). */
export const STICKER_ICON = { nuvem: "cloud", fruta: "food:blueberry", bolha: "duck", chapeu: "hat", bola: "ball", festa: "star",
  amigos: "pet:bunny", looks: "looks", dente: "tooth", limpeza: "trash", salao: "hair:curls" };

export function drawSticker(ctx, sticker, color, x, y, r) {
  ctx.save();
  ctx.shadowColor = "rgba(60,40,90,.25)"; ctx.shadowBlur = r * 0.3; ctx.shadowOffsetY = r * 0.1;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = "#ffffff"; ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.beginPath(); ctx.arc(x, y, r * 0.86, 0, 7);
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, lighten(color, 0.55)); g.addColorStop(1, lighten(color, 0.15));
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = darken(color, 0.2); ctx.lineWidth = Math.max(1.5, r * 0.06); ctx.stroke();
  ctx.restore();
  drawIcon(ctx, STICKER_ICON[sticker] || "star", x, y, r * 0.55);
}

/* Ícones da progressão (estrelinhas, lojinha, missões, mapa, enfeites). */
const EXTRA = {
  star(ctx, r, ow) {
    star(ctx, 0, 0, r * 0.9, "#ffd54a");
    ctx.strokeStyle = "#b8860b"; ctx.lineWidth = ow * 1.2; ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.ellipse(-r * 0.2, -r * 0.25, r * 0.15, r * 0.08, -0.6, 0, 7); ctx.fill();
  },
  map(ctx, r, ow) {
    ctx.beginPath(); ctx.moveTo(-r * 0.8, -r * 0.05); ctx.lineTo(0, -r * 0.8); ctx.lineTo(r * 0.8, -r * 0.05); ctx.closePath(); fs(ctx, "#ff8a7a", "#a8322c", ow);
    roundRect(ctx, -r * 0.62, -r * 0.1, r * 1.24, r * 0.88, r * 0.1); fs(ctx, "#fff4e2", "#c9a37a", ow);
    roundRect(ctx, -r * 0.18, r * 0.25, r * 0.36, r * 0.53, r * 0.08); fs(ctx, "#ffd54a", "#a8791a", ow);
  },
  shop(ctx, r, ow) {
    roundRect(ctx, -r * 0.75, -r * 0.2, r * 1.5, r * 0.95, r * 0.15); fs(ctx, "#fff7d6", "#e0a21c", ow);
    ctx.beginPath(); ctx.moveTo(-r * 0.9, -r * 0.2); ctx.lineTo(-r * 0.7, -r * 0.75); ctx.lineTo(r * 0.7, -r * 0.75); ctx.lineTo(r * 0.9, -r * 0.2); ctx.closePath(); fs(ctx, "#ff6b9d", "#a8325c", ow);
    ctx.fillStyle = "#ffffff"; for (const xx of [-0.45, 0, 0.45]) ctx.fillRect(xx * r - r * 0.1, -r * 0.72, r * 0.2, r * 0.5);
    star(ctx, 0, r * 0.3, r * 0.3, "#ffd54a");
  },
  mission(ctx, r, ow) {
    roundRect(ctx, -r * 0.62, -r * 0.8, r * 1.24, r * 1.6, r * 0.15); fs(ctx, "#ffffff", "#7fa3b8", ow);
    roundRect(ctx, -r * 0.25, -r * 0.92, r * 0.5, r * 0.25, r * 0.08); fs(ctx, "#ffd54a", "#a8791a", ow);
    for (let i = 0; i < 3; i++) {
      const yy = -r * 0.35 + i * r * 0.42;
      ctx.strokeStyle = i < 2 ? "#62c370" : "#c9c2d6"; ctx.lineWidth = ow * 1.6;
      ctx.beginPath(); ctx.moveTo(-r * 0.38, yy); ctx.lineTo(-r * 0.26, yy + r * 0.1); ctx.lineTo(-r * 0.08, yy - r * 0.12); ctx.stroke();
      ctx.fillStyle = "#e3d6fb"; roundRect(ctx, r * 0.02, yy - r * 0.06, r * 0.4, r * 0.12, r * 0.05); ctx.fill();
    }
  },
  "decor:balloons"(ctx, r, ow) {
    [["#ff6b9d", -0.35, -0.2], ["#5bc0eb", 0.3, -0.35], ["#ffd54a", 0, 0.05]].forEach(([c, xx, yy]) => {
      ctx.strokeStyle = "#8a7fa0"; ctx.lineWidth = ow * 0.7; ctx.beginPath(); ctx.moveTo(xx * r, yy * r + r * 0.4); ctx.lineTo(0, r * 0.9); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(xx * r, yy * r, r * 0.32, r * 0.4, 0, 0, 7); fs(ctx, c, darken(c, 0.4), ow);
    });
  },
  "decor:flags"(ctx, r, ow) {
    ctx.strokeStyle = "#8a6a4a"; ctx.lineWidth = ow; ctx.beginPath(); ctx.moveTo(-r * 0.9, -r * 0.4); ctx.quadraticCurveTo(0, 0, r * 0.9, -r * 0.4); ctx.stroke();
    ["#ff6b9d", "#ffd54a", "#5bc0eb", "#9be564"].forEach((c, i) => {
      const xx = -r * 0.6 + i * r * 0.4, yy = -r * 0.28 + (i === 1 || i === 2 ? r * 0.08 : 0);
      ctx.beginPath(); ctx.moveTo(xx - r * 0.16, yy); ctx.lineTo(xx + r * 0.16, yy); ctx.lineTo(xx, yy + r * 0.5); ctx.closePath(); fs(ctx, c, darken(c, 0.4), ow * 0.7);
    });
  },
  "decor:flowers"(ctx, r, ow) {
    ["#ff6b9d", "#b49cff", "#ffd54a"].forEach((c, i) => {
      const xx = (i - 1) * r * 0.55, top = -r * 0.2 - (i === 1 ? r * 0.25 : 0);
      ctx.strokeStyle = "#4caf6a"; ctx.lineWidth = ow * 1.3; ctx.beginPath(); ctx.moveTo(xx, r * 0.85); ctx.lineTo(xx, top); ctx.stroke();
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(xx + Math.cos(a) * r * 0.17, top + Math.sin(a) * r * 0.17, r * 0.14, 0, 7); ctx.fill(); }
      ctx.fillStyle = "#fff3a0"; ctx.beginPath(); ctx.arc(xx, top, r * 0.1, 0, 7); ctx.fill();
    });
  },
  "decor:rainbow"(ctx, r, ow) {
    ["#ff6b6b", "#ffb04a", "#ffe14d", "#7fd88a", "#5bc0eb", "#b49cff"].forEach((c, i) => {
      ctx.strokeStyle = c; ctx.lineWidth = r * 0.13; ctx.beginPath(); ctx.arc(0, r * 0.45, r * (0.85 - i * 0.12), Math.PI, 0); ctx.stroke();
    });
    void ow;
  },
  "station:hair"(ctx, r) { drawIcon(ctx, "hair:curls", 0, 0, r); },
  "station:nails"(ctx, r) { drawIcon(ctx, "polish:#ff6bb5", -r * 0.25, 0, r * 0.85); drawIcon(ctx, "paw", r * 0.4, r * 0.35, r * 0.5); },
  "station:makeup"(ctx, r) { drawIcon(ctx, "makeup:lips", -r * 0.15, -r * 0.1, r * 0.8); drawIcon(ctx, "makeup:blush", r * 0.45, r * 0.4, r * 0.45); },
  paw(ctx, r, ow) {
    ctx.beginPath(); ctx.ellipse(0, r * 0.2, r * 0.55, r * 0.45, 0, 0, 7); fs(ctx, "#ffe3ee", "#c7709a", ow);
    for (const [xx, yy] of [[-0.55, -0.35], [-0.2, -0.62], [0.2, -0.62], [0.55, -0.35]]) { ctx.beginPath(); ctx.arc(xx * r, yy * r, r * 0.2, 0, 7); fs(ctx, "#ffe3ee", "#c7709a", ow); }
  },
  back(ctx, r, ow) {
    ctx.strokeStyle = "#6e4aa3"; ctx.lineWidth = Math.max(3, r * 0.22);
    ctx.beginPath(); ctx.moveTo(r * 0.55, 0); ctx.lineTo(-r * 0.45, 0); ctx.moveTo(-r * 0.05, -r * 0.45); ctx.lineTo(-r * 0.5, 0); ctx.lineTo(-r * 0.05, r * 0.45); ctx.stroke();
    void ow;
  },
  heartLevel(ctx, r, ow) {
    ctx.beginPath(); ctx.moveTo(0, r * 0.8);
    ctx.bezierCurveTo(-r * 1.1, 0, -r * 0.6, -r * 0.9, 0, -r * 0.35);
    ctx.bezierCurveTo(r * 0.6, -r * 0.9, r * 1.1, 0, 0, r * 0.8); ctx.closePath(); fs(ctx, "#ff6b9d", "#a8325c", ow);
  }
};
