/* ============================================================
   Nubi - a criaturinha. PRIORIDADE do projeto: parecer vivo.
   Arte procedural 2D (nada de emoji/botão de texto no lugar dele).

   Separação exigida pelo briefing:
     - ESTADO principal (idle | chewing | celebrate) + dados lógicos
       (tint, foam, wet, fluffy, accessories) - lidos pelas regras e testes;
     - APRESENTAÇÃO: valores "mostrados" que perseguem os lógicos com molas
       e easing, para que nenhuma mudança aconteça de uma vez.

   Os pontos de acerto (px/py) NÃO incluem pulos ou deformações: o alvo de
   toque fica estável enquanto o corpo se mexe.
   ============================================================ */
import {
  Spring, damp, clamp, lerp, invLerp, Ease, Motion,
  hexToRgb, rgbToHex, mix, lighten, darken, rgba, roundRect, softShadow
} from "../core/anim.js";

const BASE_BODY = "#f3e6d4";   // creme
const BASE_TUFT = "#cdb8f0";   // lilás suave
const IRIS = "#4a3b78";
const INK = "#3a2f4f";
const BLUSH = "#ff8fb1";

export class Nubi {
  constructor(vp) {
    this.vp = vp;
    this.pos = { x: 0.62, y: 0.52 };          // centro (design-space)
    // ---- estado lógico (API preservada) ----
    this.state = "idle";
    this.stateT = 0;
    this.tint = null;
    this.moonTuftT = 0;
    this.cheeks = 0;
    this.foam = 0;
    this.wet = 0;
    this.fluffy = 0;
    this.accessories = {};
    this.walkT = 0;
    this.lookAt = null;
    this.chewCount = 0;
    this.jump = 0;                              // 0..1 (compat)
    this.sayText = null;
    this.sayT = 0;
    this.t = 0;

    // ---- apresentação ----
    this.color = hexToRgb(BASE_BODY);           // cor mostrada (crossfade)
    this._lastTint = null;
    this.pulse = new Spring(0, { stiffness: 220, damping: 9 });   // "boing" ao mudar de cor
    this.sq = new Spring(0, { stiffness: 340, damping: 13 });     // squash (+) / stretch (-)
    this.tuftLag = new Spring(0, { stiffness: 120, damping: 9 }); // tufo atrasado (movimento secundário)
    this.earL = new Spring(0, { stiffness: 260, damping: 8 });
    this.earR = new Spring(0, { stiffness: 260, damping: 8 });
    this.gaze = { x: 0, y: 0 };                 // -1..1
    this.wander = { x: 0, y: 0 };
    this.wanderT = 1500;
    this.blink = 0;
    this.blinkSeq = null;                       // { t, double }
    this.blinkT = this._nextBlink();
    this.earT = 3000 + Math.random() * 3000;
    this.hop = null;                            // { t, dur, h }
    this.hopY = 0;
    this.foamShown = 0;
    this.wetShown = 0;
    this.fluffyShown = 0;
    this.moonShown = 0;
    this.cheeksShown = 0;
    this.accShown = {};                         // slot -> { def, k, target }
    this.sayK = 0;
    this.sleeping = false;
    this.nestK = 0;
    this.wakeT = 0;
    this.happyT = 0;
    this.giggleT = 0;
    this.danceT = 0;
    this.poseT = 0;
    this._danceHop = 0;
  }

  _nextBlink() { return 2000 + Math.random() * 2800; }

  /* Volta acolhedora: aplica a cor salva sem animar a transição. */
  restoreTint(c) { this.tint = c; this._lastTint = c; this.color = hexToRgb(c || BASE_BODY); }
  radius() { return this.vp.s(0.17); }

  // ---- controle de estado (API preservada) ----
  setState(s) { this.state = s; this.stateT = 0; }
  look(pointDesign) { this.lookAt = pointDesign; }
  stopLook() { this.lookAt = null; }
  say(text) { this.sayText = text; this.sayT = 1700; this.sayK = 0; }

  eat(onChewed) {
    this.setState("chewing");
    this.chewCount = 0;
    this._onChewed = onChewed;
    this.sq.target = -0.06;                     // estica de leve, esperando a fruta
  }

  celebrate() {
    this.setState("celebrate");
    this.jump = 1;
    this.startHop(0.42, 640);
  }

  /* Chegada num cômodo: pulinho curto (só visual). */
  arrive() { this.startHop(0.22, 480); }

  startHop(h, dur) {
    const k = Motion.reduce ? 0.35 : 1;
    this.hop = { t: 0, dur, h: h * k };
  }

  showMoonTuft() { this.moonTuftT = 1800; }

  // ---- recepção, carinho e reforço positivo ----
  /* Dormindo num ninho de nuvem (recepção). Não é indisponibilidade: o
     primeiro toque o acorda. */
  sleep() { this.sleeping = true; this.nestK = 1; this.wakeT = 0; }
  wake() {
    if (!this.sleeping) return false;
    this.sleeping = false; this.wakeT = 1; this.happyT = 900; this.blink = 0;
    this.sq.target = 0; this.sq.kick(-3.2);          // espreguiça (estica)
    this.earL.kick(9); this.earR.kick(-9);
    this.startHop(0.3, 560);
    this.say("Oi!");
    return true;
  }
  pet() { this.happyT = 1000; this.tuftLag.kick(-260); this.earL.kick(-6); this.earR.kick(6); this.sq.kick(1.4); }
  giggle() { this.happyT = 800; this.giggleT = 700; this.startHop(0.12, 300); }
  dance() { this.danceT = 1700; this.happyT = 1800; }
  pose() { this.happyT = 900; this.poseT = 900; this.sq.kick(-2.6); }
  isHappy() { return this.state === "celebrate" || this.happyT > 0 || this.danceT > 0; }
  puffCheeks() { this.cheeks = 1; }
  setFoam(v) { this.foam = Math.max(0, Math.min(1, v)); }
  rinse() { this.foam = 0; this.wet = 1; this.tint = null; }
  dry() { this.wet = 0; this.fluffy = 1; this.sq.kick(1.6); }
  equip(slot, def) { this.accessories[slot] = def; }
  unequip(slot) { delete this.accessories[slot]; }

  // ---- centro em pixels (estável: sem pulo) ----
  px() { return this.vp.dx(this.pos.x); }
  py() { return this.vp.dy(this.pos.y); }

  update(dt) {
    this.t += dt;
    this.stateT += dt;
    const reduce = Motion.reduce;

    // -- piscar: fecha rápido (easeIn), abre mais devagar (easeOut), às vezes duplo
    this.blinkT -= dt;
    if (this.blinkT <= 0 && !this.blinkSeq) {
      this.blinkSeq = { t: 0, double: Math.random() < 0.2 };
      this.blinkT = this._nextBlink();
    }
    if (this.blinkSeq) {
      const s = this.blinkSeq; s.t += dt;
      const one = (u) => (u < 70 ? Ease.inQuad(u / 70) : u < 160 ? 1 - Ease.outQuad((u - 70) / 90) : 0);
      this.blink = s.double ? Math.max(one(s.t), one(s.t - 200)) : one(s.t);
      if (s.t > (s.double ? 380 : 170)) { this.blinkSeq = null; this.blink = 0; }
    }

    // -- olhar: segue o alvo com amortecimento; sem alvo, passeia curioso
    this.wanderT -= dt;
    if (this.wanderT <= 0) {
      const center = Math.random() < 0.35;
      this.wander = center ? { x: 0, y: 0 } : { x: (Math.random() * 2 - 1) * 0.7, y: (Math.random() * 2 - 1) * 0.45 };
      this.wanderT = 1400 + Math.random() * 2600;
    }
    let gx = this.wander.x, gy = this.wander.y;
    if (this.lookAt) {
      const dx = this.vp.dx(this.lookAt.x) - this.px();
      const dy = this.vp.dy(this.lookAt.y) - this.py();
      const d = Math.hypot(dx, dy) || 1;
      const reach = clamp(d / (this.radius() * 1.5));
      gx = (dx / d) * reach; gy = (dy / d) * reach;
    }
    this.gaze.x = damp(this.gaze.x, gx, this.lookAt ? 18 : 7, dt);
    this.gaze.y = damp(this.gaze.y, gy, this.lookAt ? 18 : 7, dt);

    // -- orelhas: espasmo ocasional (uma de cada vez)
    this.earT -= dt;
    if (this.earT <= 0 && !reduce) {
      (Math.random() < 0.5 ? this.earL : this.earR).kick(Math.random() < 0.5 ? 7 : -7);
      this.earT = 2500 + Math.random() * 4000;
    }
    this.earL.update(dt); this.earR.update(dt);

    // -- fala
    if (this.sayT > 0) { this.sayT -= dt; this.sayK = Math.min(1, this.sayK + dt / 240); }

    // -- humor / reforço positivo
    if (this.happyT > 0) this.happyT -= dt;
    if (this.giggleT > 0) this.giggleT -= dt;
    if (this.poseT > 0) this.poseT -= dt;
    if (this.danceT > 0) {
      this.danceT -= dt;
      this._danceHop -= dt;
      if (this._danceHop <= 0 && !this.hop) { this.startHop(0.28, 380); this._danceHop = 420; }
    }
    this.nestK = damp(this.nestK, this.sleeping ? 1 : 0, 4, dt);
    if (this.sleeping) this.blink = 1;

    // -- efeitos lógicos temporários (encerramento seguro, como antes)
    if (this.moonTuftT > 0) this.moonTuftT -= dt;
    if (this.cheeks > 0) this.cheeks = Math.max(0, this.cheeks - dt * 0.0009);
    if (this.walkT > 0) this.walkT -= dt;

    // -- estado principal
    switch (this.state) {
      case "chewing": {
        this.chewCount = Math.floor(this.stateT / 220);
        // a cada mordida o corpo amassa de leve
        if (this.stateT > 240) {
          const ph = ((this.stateT - 240) / 210) % 1;
          this.sq.target = Math.sin(ph * Math.PI) * 0.07;
        }
        if (this.chewCount >= 3) {
          this.sq.target = 0;
          if (this._onChewed) { const cb = this._onChewed; this._onChewed = null; cb(); }
          if (this.state === "chewing") this.setState("idle");
        }
        break;
      }
      case "celebrate": {
        if (this.stateT > 640) { this.jump = 0; this.setState("idle"); }
        break;
      }
      default: break;
    }

    // -- pulo com antecipação, voo esticado e aterrissagem amassada
    if (this.hop) {
      const H = this.hop; H.t += dt;
      const u = clamp(H.t / H.dur);
      const r = this.radius();
      if (u < 0.2) { this.sq.target = 0.14 * Ease.outQuad(u / 0.2); this.hopY = 0; }
      else if (u < 0.8) {
        const a = invLerp(0.2, 0.8, u);
        this.hopY = Math.sin(a * Math.PI) * H.h * r;
        this.sq.target = -0.1 * Math.cos(a * Math.PI * 0.5);
      } else {
        if (this.hopY > 0) { this.sq.target = 0; this.sq.kick(2.4); }
        this.hopY = 0;
      }
      if (H.t >= H.dur) { this.hop = null; this.sq.target = 0; }
    }
    this.sq.update(dt);
    // tufo segue o corpo com atraso (overlap natural)
    this.tuftLag.target = this.hopY;
    this.tuftLag.update(dt);

    // -- cor: crossfade suave + "boing" quando muda
    if (this.tint !== this._lastTint) { this._lastTint = this.tint; this.pulse.kick(reduce ? 0.6 : 2.2); }
    const target = hexToRgb(this.tint || BASE_BODY);
    for (let i = 0; i < 3; i++) this.color[i] = damp(this.color[i], target[i], 5.5, dt);
    this.pulse.update(dt);

    // -- valores mostrados perseguem os lógicos
    this.foamShown = damp(this.foamShown, this.foam, this.foam > this.foamShown ? 9 : 5, dt);
    this.wetShown = damp(this.wetShown, this.wet, 4, dt);
    this.fluffyShown = damp(this.fluffyShown, this.fluffy, 5, dt);
    this.moonShown = damp(this.moonShown, this.moonTuftT > 0 ? 1 : 0, 9, dt);
    this.cheeksShown = damp(this.cheeksShown, this.cheeks, this.cheeks > this.cheeksShown ? 16 : 6, dt);

    // -- acessórios entram com "pop" e saem encolhendo
    for (const [slot, def] of Object.entries(this.accessories)) {
      const e = this.accShown[slot];
      if (!e || e.def !== def) this.accShown[slot] = { def, k: 0, target: 1 };
      else e.target = 1;
    }
    for (const [slot, e] of Object.entries(this.accShown)) {
      if (!this.accessories[slot]) e.target = 0;
      const step = dt / (e.target ? 420 : 220);
      e.k = e.target ? Math.min(1, e.k + step) : Math.max(0, e.k - step);
      if (!e.target && e.k <= 0) delete this.accShown[slot];
    }
  }

  bodyColor() { return rgbToHex(this.color); }

  // ======================= DESENHO =======================
  draw() {
    const ctx = this.vp.ctx;
    const r = this.radius();
    const cx = this.px();
    const cy = this.py();
    const reduce = Motion.reduce;

    const body = this.bodyColor();
    const tuft = this.tint ? lighten(body, 0.32) : mix(BASE_TUFT, body, 0.15);
    const outline = darken(body, 0.62);
    const ow = Math.max(2, r * 0.055);

    // respiração + balanço + squash/stretch (ancorados nos pés)
    const breathe = reduce ? 0 : Math.sin(this.t * (this.sleeping ? 0.0013 : 0.0024)) * (this.sleeping ? 0.035 : 0.022);
    const pulse = this.pulse.x * 0.05;
    const s = this.sq.x;
    const sx = 1 + s + breathe * -0.5 + pulse;
    const sy = 1 - s + breathe + pulse;
    let sway = reduce ? 0 : Math.sin(this.t * 0.0011) * 0.03;
    if (this.giggleT > 0 && !reduce) sway += Math.sin(this.t * 0.05) * 0.07 * (this.giggleT / 700);
    if (this.danceT > 0) sway += Math.sin(this.t * 0.012) * (reduce ? 0.04 : 0.14);
    if (this.poseT > 0) sway += -0.12 * Math.sin(clamp(this.poseT / 900) * Math.PI);

    // sombra de contato: encolhe quando ele sobe
    const lift = clamp(this.hopY / (r * 0.6));
    softShadow(ctx, cx, cy + r * 1.1, r * (0.95 - lift * 0.3) * (1 + s * 0.5), r * 0.2, 0.22 - lift * 0.08);

    ctx.save();
    ctx.translate(cx, cy - this.hopY);
    ctx.translate(0, r);
    ctx.rotate(sway);
    ctx.scale(sx, sy);
    ctx.translate(0, -r);
    ctx.lineJoin = "round"; ctx.lineCap = "round";

    // capa: atrás do corpo
    const cape = this.accShown.cape;
    if (cape) this._capeBack(ctx, r, cape, outline, ow);

    // --- silhueta única: todos os contornos primeiro, depois os preenchimentos
    const tuftSquash = clamp((this.hopY - this.tuftLag.x) / r, -0.5, 0.5);
    const parts = this._parts(r, tuftSquash);
    ctx.strokeStyle = outline; ctx.lineWidth = ow * 2;
    for (const p of parts) { p.path(ctx); ctx.stroke(); }

    for (const p of parts) {
      p.path(ctx);
      ctx.fillStyle = p.kind === "tuft" ? this._tuftFill(ctx, r, tuft) : this._bodyFill(ctx, r, body);
      ctx.fill();
    }

    // interior das orelhas
    ctx.fillStyle = rgba(BLUSH, 0.45);
    for (const side of [-1, 1]) {
      const tw = (side < 0 ? this.earL.x : this.earR.x) * 0.06;
      ctx.save(); ctx.translate(side * r * 0.66, -r * 0.6); ctx.rotate(side * 0.35 + tw);
      ctx.beginPath(); ctx.ellipse(0, r * 0.02, r * 0.12, r * 0.17, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // barriga mais clara, integrada (gradiente suave sem contorno)
    const bg = ctx.createRadialGradient(0, r * 0.3, 0, 0, r * 0.38, r * 0.62);
    bg.addColorStop(0, rgba(lighten(body, 0.5), 0.95));
    bg.addColorStop(0.75, rgba(lighten(body, 0.35), 0.75));
    bg.addColorStop(1, rgba(lighten(body, 0.35), 0));
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.ellipse(0, r * 0.38, r * 0.62, r * 0.56, 0, 0, Math.PI * 2); ctx.fill();

    // brilho de luz no topo
    ctx.fillStyle = "rgba(255,255,255,.35)";
    ctx.beginPath(); ctx.ellipse(-r * 0.38, -r * 0.55, r * 0.22, r * 0.12, -0.6, 0, Math.PI * 2); ctx.fill();

    // pelo fofo: tufinhos extras ao redor
    if (this.fluffyShown > 0.02) this._fur(ctx, r, body, outline, ow);

    // bochechas coradas (sempre) + bochechas infladas (pera)
    this._cheeks(ctx, r, body, outline, ow);

    // rosto
    this._eyes(ctx, r, body, outline);
    this._mouth(ctx, r);

    // brilho molhado + gotas escorrendo
    if (this.wetShown > 0.02) this._wet(ctx, r);
    // espuma
    if (this.foamShown > 0.02) this._foam(ctx, r);

    // acessórios na frente
    if (this.accShown.boots) this._boots(ctx, r, this.accShown.boots, outline, ow);
    if (this.accShown.hat) this._hat(ctx, r, this.accShown.hat, outline, ow, tuftSquash);

    ctx.restore();

    // ninho de nuvem da recepção (na frente da parte de baixo do corpo)
    if (this.nestK > 0.02) this._nest(ctx, cx, cy, r);
    if (this.sleeping) this._zzz(ctx, cx, cy, r);

    const hatUp = this.accShown.hat ? this._accK(this.accShown.hat) * r * 0.45 : 0;
    if (this.sayT > 0 && this.sayText) this._speech(ctx, cx, cy - this.hopY - r * 2.05 - hatUp, r);
  }

  /* Partes que formam a silhueta, na ordem de fundo para frente. */
  _parts(r, tuftSquash) {
    const parts = [];
    const fl = this.fluffyShown, moon = this.moonShown;
    // tufo (nuvem <-> lua crescente, com crossfade de escala)
    const tScaleY = 1 - tuftSquash * 0.8;
    const tWob = Motion.reduce ? 0 : Math.sin(this.t * 0.003) * 0.05;
    if (moon < 0.98) {
      const k = (1 - moon) * (1 + fl * 0.28);
      parts.push({ kind: "tuft", path: (c) => {
        c.save(); c.translate(0, -r * 0.92); c.rotate(tWob); c.scale(k, k * tScaleY);
        this._cloudPath(c, 0, 0, r * 0.6); c.restore();
      } });
    }
    if (moon > 0.02) {
      const k = Ease.outBack(clamp(moon));
      parts.push({ kind: "tuft", path: (c) => {
        c.save(); c.translate(0, -r * 1.02); c.rotate(-0.3 + tWob); c.scale(k, k * tScaleY);
        c.beginPath(); c.arc(0, 0, r * 0.55, Math.PI * 0.15, Math.PI * 1.85);
        c.arc(r * 0.32, -r * 0.08, r * 0.42, Math.PI * 1.7, Math.PI * 0.3, true);
        c.closePath(); c.restore();
      } });
    }
    // orelhas
    for (const side of [-1, 1]) {
      const tw = (side < 0 ? this.earL.x : this.earR.x) * 0.06;
      parts.push({ kind: "body", path: (c) => {
        c.save(); c.translate(side * r * 0.66, -r * 0.6); c.rotate(side * 0.35 + tw);
        c.beginPath(); c.ellipse(0, 0, r * 0.22, r * 0.3, 0, 0, Math.PI * 2); c.restore();
      } });
    }
    // patas (dão um passinho quando ele mastiga/comemora)
    const step = this.state === "celebrate" ? Math.sin(this.stateT * 0.03) * r * 0.03 : 0;
    for (const side of [-1, 1]) {
      parts.push({ kind: "body", path: (c) => {
        c.beginPath(); c.ellipse(side * r * 0.46, r * 0.93 + side * step, r * 0.28, r * 0.19, 0, 0, Math.PI * 2);
      } });
    }
    // corpo em formato de feijão (mais largo embaixo)
    parts.push({ kind: "body", path: (c) => this._bodyPath(c, r) });
    return parts;
  }

  _bodyPath(c, r) {
    c.beginPath();
    c.moveTo(0, -r * 0.98);
    c.bezierCurveTo(r * 0.62, -r * 0.98, r * 1.0, -r * 0.52, r * 1.02, r * 0.1);
    c.bezierCurveTo(r * 1.04, r * 0.72, r * 0.62, r * 0.99, 0, r * 0.99);
    c.bezierCurveTo(-r * 0.62, r * 0.99, -r * 1.04, r * 0.72, -r * 1.02, r * 0.1);
    c.bezierCurveTo(-r * 1.0, -r * 0.52, -r * 0.62, -r * 0.98, 0, -r * 0.98);
    c.closePath();
  }

  _cloudPath(c, x, y, r) {
    c.beginPath();
    c.arc(x - r * 0.62, y + r * 0.12, r * 0.5, 0, Math.PI * 2);
    c.moveTo(x + r * 0.7, y - r * 0.2);
    c.arc(x, y - r * 0.2, r * 0.7, 0, Math.PI * 2);
    c.moveTo(x + r * 1.12, y + r * 0.12);
    c.arc(x + r * 0.62, y + r * 0.12, r * 0.5, 0, Math.PI * 2);
  }

  _bodyFill(ctx, r, body) {
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.1, 0, 0, r * 1.35);
    g.addColorStop(0, lighten(body, 0.28));
    g.addColorStop(0.55, body);
    g.addColorStop(1, darken(body, 0.16));
    return g;
  }
  _tuftFill(ctx, r, tuft) {
    const g = ctx.createLinearGradient(0, -r * 1.6, 0, -r * 0.6);
    g.addColorStop(0, lighten(tuft, 0.35));
    g.addColorStop(1, tuft);
    return g;
  }

  _fur(ctx, r, body, outline, ow) {
    const k = this.fluffyShown;
    const n = 14;
    ctx.fillStyle = lighten(body, 0.12);
    ctx.strokeStyle = outline; ctx.lineWidth = ow * 0.8;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * 0.12 + (i / (n - 1)) * Math.PI * 0.76;  // lados e base
      for (const side of [-1, 1]) {
        const ang = side < 0 ? Math.PI - a : a;
        const rr = r * 0.11 * k * (0.8 + ((i * 7) % 3) * 0.15);
        const x = Math.cos(ang) * r * 1.0, y = Math.sin(ang) * r * 0.62 + r * 0.18;
        if (y > r * 0.85) continue;
        ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.stroke(); ctx.fill();
      }
    }
  }

  _cheeks(ctx, r, body, outline, ow) {
    const c = this.cheeksShown;
    for (const side of [-1, 1]) {
      const x = side * r * 0.62, y = r * 0.14;
      if (c > 0.02) {
        const rr = r * (0.16 + 0.22 * Ease.outBack(clamp(c)));
        ctx.fillStyle = lighten(body, 0.1);
        ctx.strokeStyle = outline; ctx.lineWidth = ow * 0.8;
        ctx.beginPath(); ctx.arc(x + side * r * 0.08 * c, y, rr, 0, Math.PI * 2); ctx.stroke(); ctx.fill();
      }
      ctx.fillStyle = rgba(BLUSH, 0.42);
      ctx.beginPath(); ctx.ellipse(x + side * r * 0.08 * c, y + r * 0.02, r * 0.15, r * 0.09, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  _nest(ctx, cx, cy, r) {
    const k = this.nestK;
    const reduce = Motion.reduce;
    ctx.save();
    ctx.globalAlpha = clamp(k * 1.2);
    const puffs = [[-1.05, 0.75, 0.42], [-0.55, 0.95, 0.5], [0, 1.02, 0.55], [0.55, 0.95, 0.5], [1.05, 0.75, 0.42], [-0.8, 0.5, 0.32], [0.8, 0.5, 0.32]];
    for (const [px, py, pr] of puffs) {
      const wob = reduce ? 0 : Math.sin(this.t * 0.002 + px * 3) * r * 0.02;
      const rr = r * pr * (0.6 + 0.4 * k);
      const x = cx + px * r * (0.8 + 0.2 * k), y = cy + py * r + (1 - k) * r * 0.4 + wob;
      const g = ctx.createRadialGradient(x - rr * 0.3, y - rr * 0.4, rr * 0.1, x, y, rr);
      g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#e2d6fb");
      ctx.fillStyle = g; ctx.strokeStyle = "rgba(143,124,192,.55)"; ctx.lineWidth = Math.max(1.5, r * 0.025);
      ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  _zzz(ctx, cx, cy, r) {
    ctx.save();
    ctx.fillStyle = "#8a3bff";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (let i = 0; i < 3; i++) {
      const ph = ((this.t * 0.0005) + i / 3) % 1;
      ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.85;
      ctx.font = `bold ${Math.round(r * (0.22 + ph * 0.22))}px "Comic Sans MS", system-ui, sans-serif`;
      ctx.fillText("z", cx + r * (0.75 + ph * 0.5), cy - r * (1.1 + ph * 0.8));
    }
    ctx.restore();
  }

  _eyes(ctx, r, body, outline) {
    const eyeY = -r * 0.14, eyeDX = r * 0.35, ew = r * 0.21, eh = r * 0.25;
    const happy = this.isHappy() && !this.sleeping;
    if (this.sleeping) {
      // olhinhos fechados dormindo (curva para baixo, calma)
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2.5, r * 0.06);
      for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * eyeDX, eyeY, ew * 0.7, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); }
      return;
    }
    const gx = this.gaze.x * ew * 0.38, gy = this.gaze.y * eh * 0.3;
    for (const sx of [-1, 1]) {
      const ex = sx * eyeDX;
      if (happy) {
        // olhinhos fechados de alegria "^ ^"
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2.5, r * 0.065);
        ctx.beginPath(); ctx.arc(ex, eyeY + eh * 0.25, ew * 0.75, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
        continue;
      }
      ctx.save();
      ctx.beginPath(); ctx.ellipse(ex, eyeY, ew, eh, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#fff"; ctx.fill();
      ctx.clip();
      // íris com gradiente + pupila + dois brilhos
      const ix = ex + gx, iy = eyeY + gy;
      const ig = ctx.createLinearGradient(0, iy - eh * 0.7, 0, iy + eh * 0.7);
      ig.addColorStop(0, "#2a2148"); ig.addColorStop(1, lighten(IRIS, 0.25));
      ctx.fillStyle = ig;
      ctx.beginPath(); ctx.ellipse(ix, iy, ew * 0.72, eh * 0.74, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1c1630";
      ctx.beginPath(); ctx.ellipse(ix, iy, ew * 0.36, eh * 0.38, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(ix - ew * 0.28, iy - eh * 0.3, ew * 0.24, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.arc(ix + ew * 0.24, iy + eh * 0.26, ew * 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      // pálpebra (cor do corpo) descendo no piscar
      if (this.blink > 0.01) {
        ctx.fillStyle = darken(body, 0.05);
        const lidY = eyeY - eh + eh * 2.1 * this.blink;
        ctx.fillRect(ex - ew * 1.2, eyeY - eh * 1.2, ew * 2.4, lidY - (eyeY - eh * 1.2));
      }
      ctx.restore();
      // contorno fino do olho + cílio na borda da pálpebra
      ctx.strokeStyle = rgba(INK, 0.55); ctx.lineWidth = Math.max(1.2, r * 0.025);
      ctx.beginPath(); ctx.ellipse(ex, eyeY, ew, eh, 0, 0, Math.PI * 2); ctx.stroke();
      if (this.blink > 0.75) {
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2.5, r * 0.06);
        ctx.beginPath(); ctx.arc(ex, eyeY - eh * 0.2, ew * 0.85, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
      }
    }
  }

  _mouth(ctx, r) {
    const my = r * 0.36;
    ctx.strokeStyle = INK; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(2, r * 0.045);
    let open = 0;
    if (this.state === "chewing") {
      if (this.stateT < 240) open = Ease.outBack(clamp(this.stateT / 200)) * 1.0;   // "aaah" esperando
      else open = Math.abs(Math.sin(((this.stateT - 240) / 210) * Math.PI)) * 0.55;  // mordidas
    } else if (this.isHappy() && !this.sleeping) {
      open = this.giggleT > 0 ? 0.6 + Math.abs(Math.sin(this.t * 0.03)) * 0.3 : 0.75;
    } else if (this.cheeksShown > 0.3) {
      // assobio: boquinha em "o"
      ctx.fillStyle = "#5a2f45";
      ctx.beginPath(); ctx.ellipse(0, my, r * 0.06, r * 0.07, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      return;
    }
    if (open > 0.05) {
      const w = r * (0.16 + open * 0.06), h = r * 0.2 * open;
      ctx.fillStyle = "#5a2f45";
      ctx.beginPath();
      ctx.moveTo(-w, my - h * 0.2);
      ctx.quadraticCurveTo(0, my - h * 0.35, w, my - h * 0.2);
      ctx.quadraticCurveTo(w * 0.9, my + h, 0, my + h);
      ctx.quadraticCurveTo(-w * 0.9, my + h, -w, my - h * 0.2);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.clip();
      ctx.fillStyle = "#ff7d9a";
      ctx.beginPath(); ctx.ellipse(0, my + h * 0.9, w * 0.6, h * 0.45, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else {
      // sorriso em "w" suave
      const w = r * 0.12;
      ctx.beginPath();
      ctx.moveTo(-w * 1.2, my - r * 0.02);
      ctx.quadraticCurveTo(-w * 0.6, my + r * 0.08, 0, my);
      ctx.quadraticCurveTo(w * 0.6, my + r * 0.08, w * 1.2, my - r * 0.02);
      ctx.stroke();
    }
  }

  _foam(ctx, r) {
    const k = this.foamShown;
    const n = 16;
    for (let i = 0; i < n; i++) {
      const appear = Ease.outBack(clamp(k * n * 0.9 - i * 0.7));
      if (appear <= 0) continue;
      // bolhas no contorno do corpo e no topo da cabeça: o rosto fica livre
      const a = -Math.PI / 2 + ((i * 2.399) % (Math.PI * 2));
      const d = r * (0.82 + ((i * 37) % 10) / 55);
      const x = Math.cos(a) * d;
      const y = Math.sin(a) * d * 0.95 + r * 0.02;
      const wob = Motion.reduce ? 0 : Math.sin(this.t * 0.004 + i) * 0.08;
      const br = r * (0.13 + (i % 4) * 0.035) * appear * (1 + wob);
      const tinted = !!this.tint;
      ctx.fillStyle = tinted ? "rgba(214,228,255,.95)" : "rgba(255,255,255,.95)";
      ctx.strokeStyle = tinted ? "rgba(120,150,220,.5)" : "rgba(150,170,200,.45)";
      ctx.lineWidth = Math.max(1, r * 0.018);
      ctx.beginPath(); ctx.arc(x, y, br, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,1)";
      ctx.beginPath(); ctx.arc(x - br * 0.35, y - br * 0.35, br * 0.22, 0, Math.PI * 2); ctx.fill();
    }
  }

  _wet(ctx, r) {
    const k = this.wetShown;
    ctx.fillStyle = `rgba(255,255,255,${0.35 * k})`;
    ctx.beginPath(); ctx.ellipse(r * 0.45, -r * 0.35, r * 0.12, r * 0.24, 0.5, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 6; i++) {
      const ph = (this.t * 0.00055 + i * 0.37) % 1;
      const side = i % 2 ? 1 : -1;
      const x = side * r * (0.55 + (i % 3) * 0.13);
      const y = lerp(-r * 0.4, r * 0.85, Ease.inQuad(ph));
      const a = k * Math.sin(ph * Math.PI);
      ctx.fillStyle = `rgba(120,190,255,${0.85 * a})`;
      const dr = r * 0.05;
      ctx.beginPath();
      ctx.moveTo(x, y - dr * 1.8);
      ctx.quadraticCurveTo(x + dr, y, x, y + dr);
      ctx.quadraticCurveTo(x - dr, y, x, y - dr * 1.8);
      ctx.fill();
    }
  }

  // ---- acessórios ----
  _accK(e) { return e.target ? Ease.outBack(e.k, 2.2) : Ease.inQuad(e.k); }

  _capeBack(ctx, r, e, outline, ow) {
    const k = this._accK(e);
    const color = e.def.color || "#e5484d";
    const wave = Motion.reduce ? 0 : Math.sin(this.t * 0.004);
    ctx.save();
    ctx.translate(0, -r * 0.15); ctx.scale(k, k); ctx.translate(0, r * 0.15);
    ctx.beginPath();
    ctx.moveTo(-r * 0.72, -r * 0.2);
    ctx.quadraticCurveTo(-r * 1.25, r * 0.45, -r * 1.12 - wave * r * 0.06, r * 1.08);
    ctx.quadraticCurveTo(-r * 0.6, r * 0.98 + wave * r * 0.05, 0, r * 1.1);
    ctx.quadraticCurveTo(r * 0.6, r * 0.98 - wave * r * 0.05, r * 1.12 + wave * r * 0.06, r * 1.08);
    ctx.quadraticCurveTo(r * 1.25, r * 0.45, r * 0.72, -r * 0.2);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, -r * 0.2, 0, r * 1.1);
    g.addColorStop(0, darken(color, 0.12)); g.addColorStop(1, color);
    ctx.fillStyle = g; ctx.strokeStyle = darken(color, 0.55); ctx.lineWidth = ow * 1.6;
    ctx.stroke(); ctx.fill();
    ctx.restore();
  }
  _capeTies(ctx, r, e, outline, ow) {
    const k = this._accK(e);
    const color = e.def.color || "#e5484d";
    for (const side of [-1, 1]) {
      ctx.save(); ctx.translate(side * r * 0.74, -r * 0.16); ctx.scale(k, k);
      ctx.fillStyle = lighten(color, 0.1); ctx.strokeStyle = darken(color, 0.55); ctx.lineWidth = ow;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.1, 0, Math.PI * 2); ctx.stroke(); ctx.fill();
      ctx.fillStyle = "#ffd54a";
      ctx.beginPath(); ctx.arc(0, 0, r * 0.045, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  _boots(ctx, r, e, outline, ow) {
    const k = this._accK(e);
    const color = e.def.color || "#5b6ee8";
    const step = this.state === "celebrate" ? Math.sin(this.stateT * 0.03) * r * 0.03 : 0;
    for (const side of [-1, 1]) {
      ctx.save(); ctx.translate(side * r * 0.46, r * 0.92 + side * step); ctx.scale(k, k);
      ctx.fillStyle = color; ctx.strokeStyle = darken(color, 0.55); ctx.lineWidth = ow * 1.4;
      roundRect(ctx, -r * 0.27, -r * 0.2, r * 0.54, r * 0.38, r * 0.16); ctx.stroke(); ctx.fill();
      ctx.fillStyle = lighten(color, 0.45);
      roundRect(ctx, -r * 0.3, -r * 0.24, r * 0.6, r * 0.12, r * 0.06); ctx.stroke(); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.4)";
      ctx.beginPath(); ctx.ellipse(-r * 0.1, r * 0.02, r * 0.07, r * 0.04, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  _hat(ctx, r, e, outline, ow, tuftSquash) {
    const raw = e.k;
    const k = this._accK(e);
    const color = e.def.color || "#8a3bff";
    const edge = darken(color, 0.55);
    const reduce = Motion.reduce;
    const drop = e.target ? (1 - Ease.outCubic(raw)) * r * 0.8 : 0;   // cai de cima ao vestir
    const lift = this.fluffyShown * r * 0.16 + this.moonShown * r * 0.1;
    // aba apoiada no alto da cabeça, um pouco de lado (charmoso, sem tapar os olhos)
    const by = -r * 1.02 - lift - drop + tuftSquash * r * 0.2;
    const tilt = -0.16 + (reduce ? 0 : Math.sin(this.t * 0.0017) * 0.035);
    // ponta mole: balança com o tempo e reage ao pulo (atraso do tufo)
    const flop = (reduce ? 0 : Math.sin(this.t * 0.0026) * 0.12) + clamp((this.hopY - this.tuftLag.x) / r, -0.4, 0.4) * 0.8;

    ctx.save();
    ctx.translate(r * 0.08, by); ctx.rotate(tilt); ctx.scale(k, k);
    ctx.lineJoin = "round"; ctx.lineCap = "round";

    const brim = (fill) => {
      ctx.fillStyle = darken(color, 0.22); ctx.strokeStyle = edge; ctx.lineWidth = ow * 2;
      ctx.beginPath(); ctx.ellipse(0, r * 0.05, r * 0.78, r * 0.17, 0, 0, Math.PI * 2);
      if (fill === "full") ctx.stroke();
      ctx.fill();
      const bg = ctx.createLinearGradient(0, -r * 0.1, 0, r * 0.1);
      bg.addColorStop(0, lighten(color, 0.22)); bg.addColorStop(1, color);
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.ellipse(0, r * 0.01, r * 0.74, r * 0.13, 0, 0, Math.PI * 2); ctx.fill();
    };

    // 1) aba inteira (atrás da copa)
    brim("full");

    // 2) copa: cone macio com a ponta caindo
    const tipX = r * (0.42 + flop * 0.4), tipY = -r * (0.88 - Math.abs(flop) * 0.1);
    const cone = () => {
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, 0);
      ctx.bezierCurveTo(-r * 0.42, -r * 0.45, -r * 0.18, -r * 0.82, r * 0.06, -r * 0.92);
      ctx.quadraticCurveTo(r * 0.3, -r * 1.0, tipX, tipY);
      ctx.quadraticCurveTo(r * 0.24, -r * 0.7, r * 0.2, -r * 0.5);
      ctx.bezierCurveTo(r * 0.3, -r * 0.3, r * 0.44, -r * 0.12, r * 0.5, 0);
      ctx.closePath();
    };
    cone();
    const g = ctx.createLinearGradient(-r * 0.5, 0, r * 0.5, -r * 0.4);
    g.addColorStop(0, lighten(color, 0.28)); g.addColorStop(0.55, color); g.addColorStop(1, darken(color, 0.14));
    ctx.strokeStyle = edge; ctx.lineWidth = ow * 2; ctx.stroke();
    ctx.fillStyle = g; ctx.fill();
    // estrelinhas e brilho, recortados dentro da copa
    ctx.save(); cone(); ctx.clip();
    ctx.fillStyle = "#ffe27a";
    for (const [sx, sy, sr] of [[-0.2, -0.35, 0.08], [0.12, -0.62, 0.06], [0.2, -0.24, 0.05]]) {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        ctx.lineTo(sx * r + Math.cos(a) * sr * r, sy * r + Math.sin(a) * sr * r);
        ctx.lineTo(sx * r + Math.cos(a + Math.PI / 5) * sr * r * 0.45, sy * r + Math.sin(a + Math.PI / 5) * sr * r * 0.45);
      }
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = "rgba(255,255,255,.28)";
    ctx.beginPath(); ctx.ellipse(-r * 0.24, -r * 0.42, r * 0.06, r * 0.26, 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // 3) faixa com fivela
    ctx.beginPath();
    ctx.moveTo(-r * 0.49, -r * 0.03);
    ctx.quadraticCurveTo(0, r * 0.06, r * 0.49, -r * 0.03);
    ctx.lineTo(r * 0.46, -r * 0.16);
    ctx.quadraticCurveTo(0, -r * 0.08, -r * 0.46, -r * 0.16);
    ctx.closePath();
    ctx.strokeStyle = darken("#ffc93a", 0.5); ctx.lineWidth = ow; ctx.stroke();
    ctx.fillStyle = "#ffc93a"; ctx.fill();
    ctx.fillStyle = "#fff4c2";
    roundRect(ctx, -r * 0.08, -r * 0.12, r * 0.16, r * 0.12, r * 0.03); ctx.fill();

    // 4) lábio da frente da aba, por cima da base da copa
    ctx.save();
    ctx.beginPath(); ctx.rect(-r, r * 0.035, r * 2, r * 0.5); ctx.clip();
    brim("front");
    ctx.restore();

    // 5) pompom fofo na ponta
    ctx.fillStyle = "#fff4c2"; ctx.strokeStyle = darken("#fff4c2", 0.5); ctx.lineWidth = ow * 1.6;
    ctx.beginPath(); ctx.arc(tipX, tipY, r * 0.12, 0, Math.PI * 2); ctx.stroke(); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(tipX - r * 0.04, tipY - r * 0.04, r * 0.045, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  _speech(ctx, x, y, r) {
    const appear = Ease.outBack(clamp(this.sayK), 2);
    const fade = clamp(this.sayT / 300);
    const pad = r * 0.24;
    ctx.save();
    ctx.font = `bold ${Math.round(r * 0.32)}px "Comic Sans MS", "Baloo 2", system-ui, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const w = ctx.measureText(this.sayText).width + pad * 2;
    const h = r * 0.66;
    const float = Motion.reduce ? 0 : Math.sin(this.t * 0.004) * r * 0.03;
    const minY = h * 0.5 + r * 0.12;
    const side = y < minY;                 // sem espaço em cima: vai para o lado
    if (side) { x += r * 1.35 + w * 0.35; y = Math.max(y + r * 0.9, minY); }
    ctx.translate(x, y + float + h * 0.5);
    ctx.scale(appear, appear);
    ctx.translate(0, -h * 0.5);
    ctx.globalAlpha = fade;
    ctx.shadowColor = "rgba(60,40,90,.18)"; ctx.shadowBlur = r * 0.15; ctx.shadowOffsetY = r * 0.05;
    ctx.fillStyle = "#fff";
    roundRect(ctx, -w / 2, -h / 2, w, h, h * 0.5); ctx.fill();
    ctx.beginPath();
    if (side) {   // rabinho apontando para o Nubi (à esquerda e abaixo)
      ctx.moveTo(-w / 2 + r * 0.18, h / 2 - 3); ctx.lineTo(-w / 2 + r * 0.42, h / 2 - 3); ctx.lineTo(-w / 2 - r * 0.12, h / 2 + r * 0.22);
    } else {
      ctx.moveTo(-r * 0.1, h / 2 - 2); ctx.lineTo(r * 0.12, h / 2 - 2); ctx.lineTo(r * 0.02, h / 2 + r * 0.2);
    }
    ctx.closePath(); ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = INK;
    ctx.fillText(this.sayText, 0, h * 0.02);
    ctx.restore();
  }
}
