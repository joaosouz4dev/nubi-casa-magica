/* Toque direto no Nubi (qualquer cômodo): cabeça = carinho, barriga = cócegas.
   Chamado pelos cômodos no fim do onTap, quando o toque não pegou nenhum
   objeto. Retorna true se o toque caiu no Nubi. */
const PET_LINES = ["Hmmm!", "Que carinho!", "Gostei!"];
const TICKLE_LINES = ["Hihi!", "Cócegas!", "Hahaha!"];
const last = { pet: -1, tickle: -1 };

function pick(list, key) {
  let i;
  do { i = Math.floor(Math.random() * list.length); } while (list.length > 1 && i === last[key]);
  last[key] = i;
  return list[i];
}

export function touchNubi(room, p) {
  const n = room.nubi, r = n.radius();
  const dx = p.x - n.px(), dy = p.y - n.py();
  if (Math.hypot(dx, dy) > r * 1.1) return false;
  // acabou de acordar com este mesmo toque: não conta como carinho
  if (n.sleeping || performance.now() - (n._wokeAt || 0) < 700) return true;
  if (dy > r * 0.15) {
    n.giggle();
    n.say(pick(TICKLE_LINES, "tickle"));
    room.bus.emit("audio:giggle");
    room.bus.emit("fx:burst", { x: p.x, y: p.y, color: "#ff8fb1", small: true });
    room.bus.emit("act", "tummy");
  } else {
    n.pet();
    n.say(pick(PET_LINES, "pet"));
    room.bus.emit("audio:purr");
    room.bus.emit("fx:hearts", { x: n.px(), y: n.py() - r * 0.9 });
    room.bus.emit("act", "pet");
  }
  return true;
}
