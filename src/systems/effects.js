/* Sistema de efeitos: partículas mágicas e aplicação de efeitos de
   aparência ao Nubi. Separa EFEITO (cor/espuma/umidade) do ESTADO.
   A lógica de aplicação é a mesma de antes; a apresentação ganhou física
   em px/s independente de FPS, curvas de tamanho/opacidade, brilho, anéis
   de onda e tipos distintos (faísca, estrela, coração, bolha, gota). */
import { Ease, Motion, clamp, lighten } from "../core/anim.js";

export class Effects {
  constructor(vp, bus, save) {
    this.vp = vp;
    this.bus = bus;
    this.save = save;
    this.particles = [];
    this.rings = [];
    this.overlays = [];      // efeitos que acompanham o bichinho (bigode de leite, arco-íris...)
    this.reduceMotion = false;
    bus.on("effect:apply", ({ effect, at, nubi }) => this.apply(effect, at, nubi));
    bus.on("effect:discoveryOnly", ({ id }) => {
      const isNew = this.save.addDiscovery(id);
      this.bus.emit("discovery", { id, isNew });
    });
    bus.on("save:tint", (c) => this.save.setTint(c));
    bus.on("fx:bubble", ({ x, y, color }) => this.bubble(x, y, color));
    bus.on("fx:water", ({ x, y }) => this.drop(x, y));
    bus.on("fx:burst", ({ x, y, color, small }) => this.burst(x, y, color, small ? 0.55 : 1));
    bus.on("fx:confetti", (opts) => this.confetti(opts && opts.amount));
    bus.on("fx:hearts", ({ x, y }) => this.heartsBurst(x, y));
    this._lastSay = {};
  }

  /* Chuva de confete leve (fim de capítulo). Cai devagar, nunca cobre a
     interação por muito tempo. */
  confetti(amount = 1) {
    const w = this.vp.w, m = this.vp.s(1);
    const n = Math.round((this.reduce ? 18 : 60) * amount);
    const cols = ["#ff6b9d", "#ffd54a", "#5bc0eb", "#9be564", "#b49cff", "#ff7a59"];
    for (let i = 0; i < n; i++) {
      this._push({
        type: "confetti", x: Math.random() * w, y: -m * 0.05 - Math.random() * m * 0.4,
        vx: (Math.random() - 0.5) * m * 0.2, vy: m * (0.15 + Math.random() * 0.2),
        g: m * 0.25, drag: 1.2, life: 2200 + Math.random() * 900,
        r: m * (0.012 + Math.random() * 0.01), color: cols[i % cols.length],
        rot: Math.random() * 6, spin: (Math.random() - 0.5) * 10, phase: Math.random() * 6
      });
    }
  }

  get reduce() { return this.reduceMotion || Motion.reduce; }

  apply(effect, at, nubi) {
    if (effect.kind === "tint") {
      nubi.tint = effect.color;
      this.save.setTint(effect.color);
      this.ring(nubi.px(), nubi.py(), effect.color, nubi.radius() * 1.8);
      this.burst(at.x, at.y, effect.color);
      this.bus.emit("audio:magic");
    } else if (effect.kind === "hearts") {
      this.heartsBurst(at.x, at.y);
      this.ring(at.x, at.y, "#ff6b9d", nubi.radius() * 1.2);
      this.bus.emit("audio:magic");
    } else if (effect.kind === "moonTuft") {
      nubi.showMoonTuft();
      this.burst(at.x, at.y - nubi.radius() * 1.2, "#f6e27a");
      this.ring(nubi.px(), nubi.py() - nubi.radius(), "#f6e27a", nubi.radius());
      this.bus.emit("audio:magic");
    } else if (effect.kind === "cheeksWhistle") {
      nubi.puffCheeks();
      this.notes(at.x + nubi.radius() * 0.3, at.y);
      this.bus.emit("audio:whistle");
    } else {
      this._applyExtra(effect, at, nubi);
    }
    if (effect.say) nubi.say(this._pickSay(effect));
    const isNew = this.save.addDiscovery(effect.discovery);
    this.bus.emit("discovery", { id: effect.discovery, isNew });
  }

  /* Reações das comidas novas. Todas são temporárias e terminam sozinhas
     (só "tint" muda a cor salva, e o banho a restaura). */
  _applyExtra(effect, at, nubi) {
    const r = nubi.radius(), cx = nubi.px(), cy = nubi.py();
    const head = { x: cx, y: cy - r * 1.05 };
    switch (effect.kind) {
      case "bubbles":
        for (let i = 0; i < (this.reduce ? 5 : 14); i++) this.bubble(cx + (Math.random() - 0.5) * r * 1.6, cy + (Math.random() - 0.2) * r, effect.color);
        nubi.giggle(); this.bus.emit("audio:pop");
        break;
      case "sunny":
        this.ring(cx, cy, effect.color, r * 2.1);
        this.ring(cx, cy, "#ffe27a", r * 1.5);
        this.overlays.push({ kind: "sun", nubi, age: 0, life: 1800 });
        nubi.startHop(0.3, 520); this.bus.emit("audio:sparkle");
        break;
      case "crunch":
        nubi.sq.kick(2.6);
        this.burst(at.x, at.y, "#ffe7a8", 0.6);
        this.bus.emit("audio:click"); setTimeout(() => this.bus.emit("audio:click"), 160);
        break;
      case "dance":
        nubi.dance(); this.notes(cx + r * 0.6, cy - r * 0.6); this.bus.emit("audio:magic");
        break;
      case "stretch":
        nubi.sq.kick(-3.2); nubi.puffCheeks();
        this.burst(at.x, at.y, "#ffd86b", 0.5); this.bus.emit("audio:bounce");
        break;
      case "ears":
        nubi.earL.kick(-14); nubi.earR.kick(14); nubi.startHop(0.18, 380);
        this.burst(cx, cy - r * 1.2, "#ff8a2a", 0.5); this.bus.emit("audio:pop");
        break;
      case "strong":
        nubi.pose(); this.burst(head.x, head.y, "#ffd54a", 0.9);
        this.ring(cx, cy, "#4fae4a", r * 1.8); this.bus.emit("audio:magic");
        break;
      case "party":
        this.confetti(0.35); this.heartsBurst(head.x, head.y); nubi.celebrate(); this.bus.emit("audio:magic");
        break;
      case "cold":
        nubi.giggleT = 900; nubi.sq.kick(1.2);
        for (let i = 0; i < (this.reduce ? 4 : 10); i++) this.bubble(cx + (Math.random() - 0.5) * r * 2, cy - r * (0.6 + Math.random() * 0.6), "#bfe6ff");
        this.overlays.push({ kind: "frost", nubi, age: 0, life: 1500 });
        this.bus.emit("audio:sparkle");
        break;
      case "milk":
        this.overlays.push({ kind: "milk", nubi, age: 0, life: 2600 });
        nubi.happyT = 1200; this.bus.emit("audio:plop");
        break;
      case "music":
        this.notes(cx + r * 0.4, cy - r * 0.4); this.notes(cx - r * 0.6, cy - r * 0.5);
        nubi.dance(); this.bus.emit("audio:whistle");
        break;
      case "rainbow":
        this.overlays.push({ kind: "rainbow", nubi, age: 0, life: 2600 });
        this.confetti(0.5); nubi.celebrate(); this.bus.emit("audio:magic");
        break;
      case "stars":
        for (let i = 0; i < 3; i++) setTimeout(() => this.burst(cx + (i - 1) * r * 0.8, head.y - r * 0.2, "#ffd54a", 0.7), i * 140);
        nubi.pulse.kick(2); this.bus.emit("audio:sparkle");
        break;
      case "float":
        nubi.startHop(0.75, 1300);
        for (let i = 0; i < 6; i++) this.bubble(cx + (Math.random() - 0.5) * r, cy + r * 0.9, "#ffd9ec");
        this.bus.emit("audio:magic");
        break;
      case "spin":
        nubi.dance();
        this.overlays.push({ kind: "swirl", nubi, age: 0, life: 1500 });
        this.heartsBurst(head.x, head.y); this.bus.emit("audio:bounce");
        break;
      default:
        this.burst(at.x, at.y, effect.color || "#ffd54a", 0.6);
    }
  }

  _drawOverlays(ctx) {
    for (const o of this.overlays) {
      const n = o.nubi, r = n.radius(), x = n.px(), y = n.py();
      const u = clamp(o.age / o.life);
      const a = u < 0.15 ? u / 0.15 : u > 0.8 ? (1 - u) / 0.2 : 1;
      ctx.save(); ctx.globalAlpha = clamp(a);
      if (o.kind === "milk") {
        // bigodinho de leite logo acima da boca
        const my = y + r * 0.12;
        ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "rgba(150,170,200,.8)"; ctx.lineWidth = Math.max(1.5, r * 0.025);
        for (const s of [-1, 1]) {
          ctx.beginPath(); ctx.ellipse(x + s * r * 0.15, my, r * 0.17, r * 0.07, s * 0.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(x + r * 0.05, my + r * 0.08, r * 0.035, 0, Math.PI * 2); ctx.fill();
      } else if (o.kind === "rainbow") {
        const cols = ["#ff6b6b", "#ffb04a", "#ffe14d", "#7fd88a", "#5bc0eb", "#b49cff"];
        const grow = Ease.outCubic(clamp(o.age / 600));
        ctx.lineCap = "round";
        cols.forEach((c, i) => {
          ctx.strokeStyle = c; ctx.lineWidth = r * 0.09;
          ctx.beginPath(); ctx.arc(x, y + r * 0.2, r * (1.65 - i * 0.1), Math.PI, Math.PI + Math.PI * grow); ctx.stroke();
        });
      } else if (o.kind === "sun") {
        ctx.strokeStyle = "#ffcc4a"; ctx.lineWidth = Math.max(2, r * 0.06); ctx.lineCap = "round";
        const rot = Motion.reduce ? 0 : o.age * 0.002;
        for (let i = 0; i < 12; i++) {
          const ang = rot + (i / 12) * Math.PI * 2;
          ctx.beginPath(); ctx.moveTo(x + Math.cos(ang) * r * 1.3, y + Math.sin(ang) * r * 1.3); ctx.lineTo(x + Math.cos(ang) * r * 1.55, y + Math.sin(ang) * r * 1.55); ctx.stroke();
        }
      } else if (o.kind === "frost") {
        ctx.strokeStyle = "rgba(190,230,255,.95)"; ctx.lineWidth = Math.max(1.5, r * 0.03);
        for (const [dx, dy] of [[-0.9, -0.7], [0.95, -0.5], [-0.7, 0.6], [0.8, 0.7]]) {
          const fx = x + dx * r, fy = y + dy * r, s = r * 0.14;
          for (let k = 0; k < 3; k++) { const ang = (k * Math.PI) / 3; ctx.beginPath(); ctx.moveTo(fx - Math.cos(ang) * s, fy - Math.sin(ang) * s); ctx.lineTo(fx + Math.cos(ang) * s, fy + Math.sin(ang) * s); ctx.stroke(); }
        }
      } else if (o.kind === "swirl") {
        ctx.strokeStyle = "#ff7ab8"; ctx.lineWidth = Math.max(2, r * 0.05); ctx.lineCap = "round";
        const rot = Motion.reduce ? 0 : o.age * 0.01;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x, y, r * 1.35, rot + i * 2.1, rot + i * 2.1 + 0.9); ctx.stroke(); }
      }
      ctx.restore();
    }
  }

  /* Variação nas repetições: a fala nunca se repete duas vezes seguidas. */
  _pickSay(effect) {
    const list = Array.isArray(effect.say) ? effect.say : [effect.say];
    const key = effect.discovery || effect.kind;
    let i;
    do { i = Math.floor(Math.random() * list.length); } while (list.length > 1 && i === this._lastSay[key]);
    this._lastSay[key] = i;
    return list[i];
  }

  _push(p) {
    p.age = 0;
    p.rot = p.rot || 0;
    p.spin = p.spin || 0;
    p.drag = p.drag !== undefined ? p.drag : 1.6;
    p.g = p.g !== undefined ? p.g : this.vp.s(0.9);
    this.particles.push(p);
  }

  ring(x, y, color, maxR) {
    if (this.reduce) maxR *= 0.6;
    this.rings.push({ x, y, color, maxR, age: 0, life: 620 });
  }

  bubble(x, y, color) {
    const m = this.vp.s(1);
    this._push({
      type: "bubble", x, y,
      vx: (Math.random() - 0.5) * m * 0.12, vy: -m * (0.12 + Math.random() * 0.14),
      g: -m * 0.05, drag: 0.8, life: 1100 + Math.random() * 600,
      r: m * (0.012 + Math.random() * 0.014), color: color || "#ffffff", phase: Math.random() * 6
    });
  }

  drop(x, y) {
    const m = this.vp.s(1);
    this._push({
      type: "drop", x, y,
      vx: (Math.random() - 0.5) * m * 0.12, vy: m * (0.25 + Math.random() * 0.2),
      g: m * 2.2, drag: 0.2, life: 420 + Math.random() * 160,
      r: m * (0.007 + Math.random() * 0.005), color: "#7cc4ff"
    });
  }

  heartsBurst(x, y) {
    const n = this.reduce ? 4 : 9;
    const m = this.vp.s(1);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.32;
      const sp = m * (0.55 + Math.random() * 0.35);
      this._push({
        type: "heart", x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        g: -m * 0.15, drag: 2.2, life: 1300 + Math.random() * 400,
        r: m * (0.022 + Math.random() * 0.014), color: i % 2 ? "#ff6b9d" : "#ff9cc0",
        phase: Math.random() * 6, delay: i * 35
      });
    }
  }

  notes(x, y) {
    const n = this.reduce ? 2 : 4;
    const m = this.vp.s(1);
    for (let i = 0; i < n; i++) {
      this._push({
        type: "note", x, y, vx: m * (0.2 + i * 0.06), vy: -m * (0.25 + Math.random() * 0.15),
        g: -m * 0.05, drag: 1.4, life: 1200, r: m * 0.026, color: ["#7d5cff", "#4caf6a", "#ff7a59", "#2fa8e0"][i % 4],
        phase: i, delay: i * 140
      });
    }
  }

  burst(x, y, color, scale = 1) {
    const n = Math.round((this.reduce ? 8 : 20) * scale);
    const m = this.vp.s(1);
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
      const sp = m * (0.7 + Math.random() * 0.9) * scale;
      const star = Math.random() < 0.45;
      this._push({
        type: star ? "star" : "spark", x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - m * 0.25,
        g: m * 0.9, drag: 2.6, life: 700 + Math.random() * 500,
        r: m * (star ? 0.02 : 0.012) * (0.6 + Math.random() * 0.8) * (0.7 + scale * 0.3),
        color: Math.random() < 0.3 ? "#ffffff" : color,
        rot: Math.random() * 6, spin: (Math.random() - 0.5) * 8
      });
    }
  }

  update(dt) {
    const s = dt / 1000;
    for (const p of this.particles) {
      if (p.delay > 0) { p.delay -= dt; continue; }
      p.age += dt;
      const fr = Math.exp(-p.drag * s);
      p.vx *= fr; p.vy *= fr;
      p.vy += p.g * s;
      p.x += p.vx * s;
      p.y += p.vy * s;
      p.rot += p.spin * s;
      if (p.type === "bubble" && p.age >= p.life) {
        this.rings.push({ x: p.x, y: p.y, color: "#ffffff", maxR: p.r * 2.2, age: 0, life: 220, thin: true });
      }
    }
    this.particles = this.particles.filter(p => p.age < p.life);
    for (const r of this.rings) r.age += dt;
    this.rings = this.rings.filter(r => r.age < r.life);
    for (const o of this.overlays) o.age += dt;
    this.overlays = this.overlays.filter(o => o.age < o.life);
    if (this.particles.length > 400) this.particles.splice(0, this.particles.length - 400);
  }

  draw() {
    const ctx = this.vp.ctx;
    this._drawOverlays(ctx);
    // anéis de onda
    for (const r of this.rings) {
      const u = clamp(r.age / r.life);
      ctx.globalAlpha = (1 - u) * (r.thin ? 0.8 : 0.55);
      ctx.strokeStyle = r.thin ? r.color : lighten(r.color, 0.3);
      ctx.lineWidth = r.thin ? 1.5 : Math.max(2, r.maxR * 0.08 * (1 - u));
      ctx.beginPath(); ctx.arc(r.x, r.y, r.maxR * Ease.outCubic(u), 0, Math.PI * 2); ctx.stroke();
    }
    for (const p of this.particles) {
      if (p.delay > 0) continue;
      const u = clamp(p.age / p.life);
      // cresce rápido no início, encolhe e some no fim
      const size = p.r * (u < 0.15 ? Ease.outBack(u / 0.15) : 1 - Ease.inQuad(clamp((u - 0.55) / 0.45)) * 0.7);
      const alpha = u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3;
      ctx.globalAlpha = clamp(alpha);
      switch (p.type) {
        case "confetti": {
          const flip = Math.cos(p.age * 0.012 + p.phase);
          ctx.save(); ctx.translate(p.x + Math.sin(p.age * 0.004 + p.phase) * p.r * 2, p.y); ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.r, -p.r * 0.6 * Math.abs(flip), p.r * 2, p.r * 1.2 * Math.abs(flip) + 0.5);
          ctx.restore();
          break;
        }
        case "heart": {
          const wob = Math.sin(p.age * 0.008 + p.phase) * 0.25;
          ctx.fillStyle = p.color;
          this._heart(ctx, p.x + Math.sin(p.age * 0.006 + p.phase) * size * 0.6, p.y, size, wob);
          break;
        }
        case "bubble": {
          const wob = Math.sin(p.age * 0.01 + p.phase);
          const bx = p.x + wob * p.r * 0.8;
          ctx.fillStyle = "rgba(255,255,255,.25)";
          ctx.strokeStyle = p.color === "#ffffff" ? "rgba(140,190,240,.8)" : p.color;
          ctx.lineWidth = Math.max(1, size * 0.15);
          ctx.beginPath(); ctx.ellipse(bx, p.y, size * (1 + wob * 0.06), size * (1 - wob * 0.06), 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "rgba(255,255,255,.9)";
          ctx.beginPath(); ctx.arc(bx - size * 0.35, p.y - size * 0.35, size * 0.22, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case "drop": {
          ctx.fillStyle = p.color;
          const len = Math.min(size * 3, Math.abs(p.vy) * 0.012 + size);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - len);
          ctx.quadraticCurveTo(p.x + size, p.y, p.x, p.y + size);
          ctx.quadraticCurveTo(p.x - size, p.y, p.x, p.y - len);
          ctx.fill();
          break;
        }
        case "note": {
          ctx.fillStyle = p.color; ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(1.5, size * 0.18);
          const x = p.x + Math.sin(p.age * 0.008 + p.phase) * size * 0.5, y = p.y;
          ctx.beginPath(); ctx.ellipse(x, y, size * 0.45, size * 0.34, -0.4, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.moveTo(x + size * 0.4, y - size * 0.05); ctx.lineTo(x + size * 0.4, y - size * 1.2); ctx.quadraticCurveTo(x + size * 0.8, y - size * 1.0, x + size * 0.9, y - size * 0.7); ctx.stroke();
          break;
        }
        case "star": {
          // brilho suave atrás da estrela
          ctx.fillStyle = p.color;
          ctx.globalAlpha = clamp(alpha) * 0.3;
          ctx.beginPath(); ctx.arc(p.x, p.y, size * 1.8, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = clamp(alpha);
          this._star(ctx, p.x, p.y, size, p.rot);
          break;
        }
        default: {
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  _heart(ctx, x, y, r, rot = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(r / 9, r / 9);
    ctx.beginPath();
    ctx.moveTo(0, 3);
    ctx.bezierCurveTo(-5, -3, -10, 2, 0, 9);
    ctx.bezierCurveTo(10, 2, 5, -3, 0, 3);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.6)";
    ctx.beginPath(); ctx.arc(-4, 1.5, 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  _star(ctx, x, y, r, rot = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      const a2 = a + Math.PI / 5;
      ctx.lineTo(Math.cos(a2) * r * 0.48, Math.sin(a2) * r * 0.48);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}
