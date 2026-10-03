/* MAPA DA CASA (hub) - a tela "raiz" do jogo.
   A casa aparece em corte, com os 5 cômodos como janelas grandes:
     andar de cima:  quarto | salão | dentista
     térreo:         cozinha | banheiro
   - um toque num cômodo entra nele (o cômodo "afunda" e o jogo desliza);
   - o cômodo do pedido atual ganha uma estrela que pula e um brilho;
   - os prêmios de enfeite da lojinha aparecem aqui (balões, bandeirinhas,
     flores, arco-íris): a casa vai ficando mais bonita com o tempo;
   - o bichinho espera no jardim e reage ao toque (carinho/cócegas). */
import { Spring, clamp, Ease, Motion, CachedLayer, roundRect, softShadow, lighten, darken } from "../core/anim.js";
import { drawIcon } from "../ui/icons.js";
import { touchNubi } from "./nubi_touch.js";

export const HUB_TILES = [
  { id: "bedroom",  x: 0.33, y: 0.30, w: 0.18, h: 0.25, wall: "#cfe8ff", icons: ["hat", "ball"] },
  { id: "salon",    x: 0.51, y: 0.30, w: 0.18, h: 0.25, wall: "#ffd6ea", icons: ["hair:curls", "polish:#ff6bb5"] },
  { id: "dentist",  x: 0.69, y: 0.30, w: 0.18, h: 0.25, wall: "#d4f3ec", icons: ["tooth", "brush"] },
  { id: "kitchen",  x: 0.33, y: 0.57, w: 0.27, h: 0.27, wall: "#fff0c9", icons: ["food:apple", "food:pizza"] },
  { id: "bathroom", x: 0.60, y: 0.57, w: 0.27, h: 0.27, wall: "#d8efff", icons: ["duck", "sponge"] }
];

export class HubRoom {
  constructor({ vp, bus, nubi }) {
    this.vp = vp; this.bus = bus; this.nubi = nubi;
    this.t = 0; this.unsub = [];
    this.press = HUB_TILES.map(() => new Spring(0, { stiffness: 340, damping: 14 }));
    this.wishRoom = null;          // cômodo do pedido atual (estrela pulando)
    this.decor = () => false;      // ligado pela lojinha: decor(id) -> tem o enfeite?
    this.pending = null;
    this.back = new CachedLayer(vp, (c, w, h, m) => this._paintBack(c, w, h, m));
    bus.on("quest:changed", (w) => { this.wishRoom = w && w.room ? w.room : null; });
  }

  enter() {
    this.nubi.sizeK = 0.78;
    this.nubi.pos = { x: 0.15, y: 0.64 };
    this.nubi.arrive();
    this.pending = null;
    this.unsub = [
      this.bus.on("tap", (p) => this.onTap(p)),
      this.bus.on("pointer:down", (p) => { const i = this.tileAt(p.x, p.y); if (i >= 0) this.press[i].target = 1; }),
      this.bus.on("pointer:up", () => this.press.forEach(s => { s.target = 0; }))
    ];
    this.bus.emit("act", "hub:visit");
  }
  exit() { this.unsub.forEach(u => u()); this.unsub = []; this.press.forEach(s => { s.target = 0; }); }

  tileRect(t) { const vp = this.vp; return { x: vp.dx(t.x), y: vp.dy(t.y), w: vp.w * t.w, h: vp.h * t.h }; }
  tileCenter(id) { const t = HUB_TILES.find(x => x.id === id); if (!t) return null; const r = this.tileRect(t); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }
  tileAt(px, py) {
    return HUB_TILES.findIndex(t => { const r = this.tileRect(t); return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h; });
  }

  onTap(p) {
    const i = this.tileAt(p.x, p.y);
    if (i >= 0) {
      if (this.pending) return;
      const t = HUB_TILES[i];
      this.press[i].kick(-16);
      this.bus.emit("audio:pop");
      this.nubi.look({ x: (t.x + t.w / 2), y: (t.y + t.h / 2) });
      // pequena pausa para ver o cômodo "afundar" antes de deslizar
      this.pending = setTimeout(() => { this.pending = null; this.bus.emit("room:go", t.id); }, Motion.reduce ? 60 : 200);
      return;
    }
    touchNubi(this, p);
  }

  // direcionamento: o pedido está num cômodo -> a dica aponta a janela dele
  hintTarget(act, wish) {
    const room = wish && wish.room;
    if (!room) return null;
    const c = this.tileCenter(room);
    return c ? { from: c, to: null } : null;
  }
  nudge(act) { const i = HUB_TILES.findIndex(t => t.id === this.wishRoom); if (i >= 0) this.press[i].kick(14); }
  holdDest() { return null; }
  hasSelection() { return false; }

  update(dt) {
    this.t += dt;
    for (const s of this.press) s.update(dt);
  }

  draw() {
    const ctx = this.vp.ctx, vp = this.vp, w = vp.w, h = vp.h, m = Math.min(w, h);
    this.back.draw();
    this._clouds(ctx, w, h, m);
    if (this.decor("decor:rainbow")) this._rainbow(ctx, w, h, m);
    this._house(ctx, w, h, m);
    if (this.decor("decor:flags")) this._flags(ctx, w, h, m);
    if (this.decor("decor:flowers")) this._flowers(ctx, w, h, m);
    if (this.decor("decor:balloons")) this._balloons(ctx, w, h, m);
    this.nubi.draw();
  }

  // ---------------- casa ----------------
  _house(ctx, w, h, m) {
    const x0 = w * 0.31, x1 = w * 0.89, yRoof = h * 0.06, yTop = h * 0.27, yBot = h * 0.87;
    // telhado
    ctx.save();
    ctx.shadowColor = "rgba(60,30,80,.25)"; ctx.shadowBlur = m * 0.03; ctx.shadowOffsetY = m * 0.01;
    ctx.beginPath(); ctx.moveTo(x0 - w * 0.025, yTop + h * 0.01); ctx.lineTo((x0 + x1) / 2, yRoof); ctx.lineTo(x1 + w * 0.025, yTop + h * 0.01); ctx.closePath();
    const rg = ctx.createLinearGradient(0, yRoof, 0, yTop); rg.addColorStop(0, "#ff8a7a"); rg.addColorStop(1, "#e5584d");
    ctx.fillStyle = rg; ctx.fill(); ctx.restore();
    ctx.strokeStyle = "#a8322c"; ctx.lineWidth = Math.max(2, m * 0.008); ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(x0 - w * 0.025, yTop + h * 0.01); ctx.lineTo((x0 + x1) / 2, yRoof); ctx.lineTo(x1 + w * 0.025, yTop + h * 0.01); ctx.closePath(); ctx.stroke();
    // telhas
    ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.lineWidth = Math.max(1.5, m * 0.004);
    for (let k = 1; k < 4; k++) { const yy = yRoof + (yTop - yRoof) * k / 4, half = ((x1 - x0) / 2 + w * 0.025) * k / 4; ctx.beginPath(); ctx.moveTo((x0 + x1) / 2 - half, yy); ctx.lineTo((x0 + x1) / 2 + half, yy); ctx.stroke(); }
    // janelinha redonda do sótão com o nome-estrela
    ctx.fillStyle = "#fff7d6"; ctx.beginPath(); ctx.arc((x0 + x1) / 2, yRoof + (yTop - yRoof) * 0.6, m * 0.035, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#a8322c"; ctx.lineWidth = Math.max(2, m * 0.006); ctx.stroke();
    drawIcon(ctx, "star", (x0 + x1) / 2, yRoof + (yTop - yRoof) * 0.6, m * 0.024);
    // paredes
    ctx.save();
    ctx.shadowColor = "rgba(60,30,80,.2)"; ctx.shadowBlur = m * 0.03; ctx.shadowOffsetY = m * 0.012;
    ctx.fillStyle = "#fff4e2"; roundRect(ctx, x0, yTop, x1 - x0, yBot - yTop, m * 0.02); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "#c9a37a"; ctx.lineWidth = Math.max(2, m * 0.007); roundRect(ctx, x0, yTop, x1 - x0, yBot - yTop, m * 0.02); ctx.stroke();

    HUB_TILES.forEach((t, i) => this._tile(ctx, t, i, m));
  }

  _tile(ctx, t, i, m) {
    const r = this.tileRect(t);
    const pad = m * 0.012;
    const k = this.press[i].x;                    // >0 afunda
    const wish = this.wishRoom === t.id;
    const s = 1 - clamp(k, -1, 1) * 0.05;
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy);
    const x = r.x + pad, y = r.y + pad, ww = r.w - pad * 2, hh = r.h - pad * 2;
    // brilho de pedido
    if (wish) {
      const p = Motion.reduce ? 0.6 : (Math.sin(this.t * 0.006) + 1) / 2;
      ctx.save(); ctx.shadowColor = `rgba(255,205,60,${0.55 + p * 0.4})`; ctx.shadowBlur = m * (0.03 + p * 0.03);
      ctx.fillStyle = "#ffe27a"; roundRect(ctx, x - pad * 0.6, y - pad * 0.6, ww + pad * 1.2, hh + pad * 1.2, m * 0.025); ctx.fill(); ctx.restore();
    }
    // parede do cômodo com luz de cima
    const g = ctx.createLinearGradient(0, y, 0, y + hh);
    g.addColorStop(0, lighten(t.wall, 0.35)); g.addColorStop(1, t.wall);
    ctx.fillStyle = g; roundRect(ctx, x, y, ww, hh, m * 0.02); ctx.fill();
    // piso
    ctx.fillStyle = darken(t.wall, 0.12); roundRect(ctx, x, y + hh * 0.78, ww, hh * 0.22, m * 0.015); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(x, y + hh * 0.78, ww, Math.max(1.5, m * 0.004));
    // janelinha decorativa no fundo
    ctx.fillStyle = "rgba(255,255,255,.55)"; roundRect(ctx, x + ww * 0.08, y + hh * 0.1, ww * 0.18, hh * 0.24, m * 0.01); ctx.fill();
    // objetos do cômodo (o que se faz lá)
    const ir = Math.min(ww, hh) * 0.24;
    drawIcon(ctx, t.icons[0], x + ww * 0.38, y + hh * 0.56, ir);
    drawIcon(ctx, t.icons[1], x + ww * 0.7, y + hh * 0.6, ir * 0.85);
    // moldura
    ctx.strokeStyle = wish ? "#e0a21c" : "#c9a37a"; ctx.lineWidth = Math.max(2, m * (wish ? 0.009 : 0.006));
    roundRect(ctx, x, y, ww, hh, m * 0.02); ctx.stroke();
    ctx.restore();
    // estrela do pedido pulando sobre o cômodo
    if (wish) {
      const b = Motion.reduce ? 0 : Math.abs(Math.sin(this.t * 0.005)) * m * 0.025;
      ctx.save(); ctx.translate(r.x + r.w * 0.86, r.y + r.h * 0.12 - b);
      ctx.shadowColor = "rgba(160,100,10,.4)"; ctx.shadowBlur = m * 0.015;
      drawIcon(ctx, "star", 0, 0, m * 0.045);
      ctx.restore();
    }
  }

  // ---------------- enfeites (prêmios) ----------------
  _flags(ctx, w, h, m) {
    const x0 = w * 0.33, x1 = w * 0.87, y = h * 0.28;
    const cols = ["#ff6b9d", "#ffd54a", "#5bc0eb", "#9be564", "#b49cff"];
    ctx.strokeStyle = "#8a6a4a"; ctx.lineWidth = Math.max(1.5, m * 0.004);
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.quadraticCurveTo((x0 + x1) / 2, y + h * 0.05, x1, y); ctx.stroke();
    const n = 11;
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, x = x0 + (x1 - x0) * u, yy = y + Math.sin(u * Math.PI) * h * 0.025;
      const sway = Motion.reduce ? 0 : Math.sin(this.t * 0.003 + i) * 0.12;
      ctx.save(); ctx.translate(x, yy); ctx.rotate(sway);
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath(); ctx.moveTo(-m * 0.016, 0); ctx.lineTo(m * 0.016, 0); ctx.lineTo(0, m * 0.04); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  _flowers(ctx, w, h, m) {
    const cols = ["#ff6b9d", "#ffd54a", "#b49cff", "#ff8a5b"];
    for (let i = 0; i < 9; i++) {
      const x = w * (0.3 + i * 0.07), y = h * 0.93 + (i % 2) * h * 0.02;
      const sway = Motion.reduce ? 0 : Math.sin(this.t * 0.002 + i) * 0.1;
      ctx.save(); ctx.translate(x, y); ctx.rotate(sway);
      ctx.strokeStyle = "#4caf6a"; ctx.lineWidth = Math.max(2, m * 0.005);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -m * 0.05); ctx.stroke();
      ctx.fillStyle = cols[i % cols.length];
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; ctx.beginPath(); ctx.arc(Math.cos(a) * m * 0.013, -m * 0.05 + Math.sin(a) * m * 0.013, m * 0.011, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "#fff3a0"; ctx.beginPath(); ctx.arc(0, -m * 0.05, m * 0.008, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
  _balloons(ctx, w, h, m) {
    const cols = ["#ff6b9d", "#5bc0eb", "#ffd54a"];
    const bx = w * 0.27, by = h * 0.55;
    cols.forEach((c, i) => {
      const fl = Motion.reduce ? 0 : Math.sin(this.t * 0.002 + i * 1.7) * m * 0.012;
      const x = bx + (i - 1) * m * 0.05, y = h * 0.2 + i * m * 0.03 + fl;
      ctx.strokeStyle = "rgba(90,70,110,.6)"; ctx.lineWidth = Math.max(1, m * 0.003);
      ctx.beginPath(); ctx.moveTo(x, y + m * 0.05); ctx.quadraticCurveTo(x + m * 0.02, (y + by) / 2, bx, by); ctx.stroke();
      const g = ctx.createRadialGradient(x - m * 0.015, y - m * 0.02, m * 0.005, x, y, m * 0.055);
      g.addColorStop(0, lighten(c, 0.45)); g.addColorStop(1, c);
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, m * 0.04, m * 0.05, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = darken(c, 0.2); ctx.beginPath(); ctx.moveTo(x - m * 0.008, y + m * 0.05); ctx.lineTo(x + m * 0.008, y + m * 0.05); ctx.lineTo(x, y + m * 0.04); ctx.fill();
    });
  }
  _rainbow(ctx, w, h, m) {
    const cols = ["#ff6b6b", "#ffb04a", "#ffe14d", "#7fd88a", "#5bc0eb", "#b49cff"];
    ctx.save(); ctx.globalAlpha = 0.55; ctx.lineCap = "butt";
    cols.forEach((c, i) => { ctx.strokeStyle = c; ctx.lineWidth = m * 0.018; ctx.beginPath(); ctx.arc(w * 0.6, h * 0.95, m * (0.95 - i * 0.018), Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); });
    ctx.restore();
  }

  _clouds(ctx, w, h, m) {
    const sp = Motion.reduce ? 0 : this.t * 0.000012;
    ctx.fillStyle = "rgba(255,255,255,.9)";
    for (const [x0, y, s] of [[0.1, 0.12, 1], [0.55, 0.06, 0.8], [0.95, 0.16, 1.1]]) {
      const x = (((x0 + sp * (1.2 - s * 0.3)) % 1.2) - 0.1) * w;
      for (const [dx, dy, r] of [[0, 0, 0.04], [0.035, -0.012, 0.03], [-0.035, 0.005, 0.028], [0.065, 0.006, 0.024]]) {
        ctx.beginPath(); ctx.arc(x + dx * m * s * 1.6, h * y + dy * m * s, r * m * s, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  _paintBack(c, w, h, m) {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#9fd8ff"); g.addColorStop(0.65, "#dff3ff"); g.addColorStop(1, "#fff4d6");
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    // sol
    const sx = w * 0.12, sy = h * 0.16;
    const sg = c.createRadialGradient(sx, sy, 0, sx, sy, m * 0.16);
    sg.addColorStop(0, "rgba(255,236,150,.95)"); sg.addColorStop(0.4, "rgba(255,226,120,.5)"); sg.addColorStop(1, "rgba(255,226,120,0)");
    c.fillStyle = sg; c.beginPath(); c.arc(sx, sy, m * 0.16, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#ffe066"; c.beginPath(); c.arc(sx, sy, m * 0.055, 0, Math.PI * 2); c.fill();
    // colinas em duas camadas
    c.fillStyle = "#b6e59a";
    c.beginPath(); c.moveTo(0, h * 0.72); c.quadraticCurveTo(w * 0.25, h * 0.55, w * 0.5, h * 0.7); c.quadraticCurveTo(w * 0.78, h * 0.82, w, h * 0.66); c.lineTo(w, h); c.lineTo(0, h); c.closePath(); c.fill();
    const lg = c.createLinearGradient(0, h * 0.78, 0, h);
    lg.addColorStop(0, "#8fd36f"); lg.addColorStop(1, "#6fbf55");
    c.fillStyle = lg;
    c.beginPath(); c.moveTo(0, h * 0.82); c.quadraticCurveTo(w * 0.3, h * 0.76, w * 0.6, h * 0.84); c.quadraticCurveTo(w * 0.85, h * 0.9, w, h * 0.82); c.lineTo(w, h); c.lineTo(0, h); c.closePath(); c.fill();
    // caminho de pedrinhas até a porta da casa
    c.fillStyle = "rgba(255,248,230,.85)";
    for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(w * (0.17 + i * 0.026), h * (0.9 - i * 0.008), m * 0.022, m * 0.01, 0, 0, Math.PI * 2); c.fill(); }
    softShadow(c, w * 0.15, h * 0.84, m * 0.12, m * 0.025, 0.18);
  }
}
