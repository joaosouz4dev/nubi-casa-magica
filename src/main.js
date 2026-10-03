/* Bootstrap do MVP — monta o Nubi, os três cômodos, os sistemas e o loop.
   Cômodos: cozinha (alimentar), banheiro (banho), quarto (vestir + bola).
   A aparência do Nubi persiste ao trocar de cômodo e entre sessões. */
import { EventBus } from "./core/events.js";
import { Viewport } from "./core/viewport.js";
import { Input } from "./core/input.js";
import { SceneManager } from "./core/scene_manager.js";
import { Audio } from "./systems/audio.js";
import { showTitle } from "./ui/title.js";
import { Save } from "./systems/save.js";
import { Effects } from "./systems/effects.js";
import { Nubi } from "./entities/nubi.js";
import { KitchenRoom } from "./scenes/kitchen_room.js";
import { BathroomRoom } from "./scenes/bathroom_room.js";
import { BedroomRoom } from "./scenes/bedroom_room.js";
import { DentistRoom } from "./scenes/dentist_room.js";
import { SalonRoom } from "./scenes/salon_room.js";
import { HubRoom } from "./scenes/hub_room.js";
import { Progress } from "./systems/progress.js";
import { ProgressUI } from "./ui/progress_ui.js";
import { ITEMS } from "./data/wardrobe.js";
import { FOODS } from "./data/foods.js";
import { PetPicker } from "./ui/pets.js";
import { PETS } from "./data/pets.js";
import { Album } from "./ui/album.js";
import { ParentGate } from "./ui/parent_gate.js";
import { Guide } from "./ui/guide.js";
import { Quests } from "./systems/quests.js";
import { Motion } from "./core/anim.js";

export function boot() {
  const canvas = document.getElementById("game");
  const bus = new EventBus();
  const vp = new Viewport(canvas);
  const audio = new Audio();
  const save = new Save();

  const nubi = new Nubi(vp);
  nubi.setSpecies(save.currentPet());
  if (save.state.tint) nubi.restoreTint(save.state.tint);   // volta acolhedora
  if (save.state.accessories) nubi.accessories = { ...save.state.accessories };
  nubi.setCosmetics(save.state.cosmetics);
  bus.on("save:accessories", (acc) => save.setAccessories({ ...acc }));
  bus.on("save:cosmetics", (c) => save.setCosmetics(c));

  const effects = new Effects(vp, bus, save);
  const scenes = new SceneManager(bus, vp);
  scenes.register("kitchen", new KitchenRoom({ vp, bus, nubi, save }));
  scenes.register("bathroom", new BathroomRoom({ vp, bus, nubi, save }));
  scenes.register("bedroom", new BedroomRoom({ vp, bus, nubi, save }));
  scenes.register("dentist", new DentistRoom({ vp, bus, nubi, save }));
  scenes.register("salon", new SalonRoom({ vp, bus, nubi, save }));
  scenes.register("hub", new HubRoom({ vp, bus, nubi, save }));
  // cada cômodo escolhe o próprio enquadramento; por padrão, tamanho normal
  scenes.onBeforeEnter = () => { nubi.sizeK = 1; };

  new Input(canvas, bus);

  // pedidos/capítulos + guia (direcionamento e celebração)
  const quests = new Quests(bus, save);
  const guide = new Guide({ vp, bus, nubi, scenes, quests, audio });
  scenes.rooms.get("bedroom").decor = (ctx, w, h) => guide.drawGarland(ctx, w, h);
  // presentes fixos por capítulo: aparecem no guarda-roupa e nunca se perdem
  const bedroom = scenes.rooms.get("bedroom");
  // estrelinhas, prêmios, carinho e missões do dia (só sobem, nunca se perdem)
  const progress = new Progress(bus, save);
  bedroom.giftUnlocked = (g) => quests.isDone(g.gift) || progress.owned("wear:" + g.id);
  scenes.rooms.get("kitchen").prizeOwned = (id) => progress.owned(id);
  scenes.rooms.get("hub").decor = (id) => progress.owned(id);
  bus.on("prize:claimed", (p) => {
    if (p.kind === "wear") {
      const def = ITEMS[p.id.slice(5)];
      if (def) { guide.giftShow = { def, t: -300 }; bedroom.newGift = true; }
    }
  });
  bus.on("gift:new", () => { bedroom.newGift = true; });

  // vitrine de bichinhos: cada um guarda a própria aparência
  new PetPicker(bus, save);
  bus.on("pet:choose", (id) => {
    if (save.switchPet(id) || nubi.species !== id) {
      nubi.setSpecies(id);
      nubi.restoreTint(save.state.tint || null);
      nubi.accessories = { ...(save.state.accessories || {}) };
      nubi.accShown = {};
      nubi.setCosmetics(save.state.cosmetics);
      nubi.foam = 0; nubi.wet = 0; nubi.fluffy = 0;
      if (scenes.current && scenes.current.enter && scenes.currentId === "bedroom") bedroom._buildPage();
    }
    nubi.arrive(); nubi.startHop(0.35, 600);
    nubi.say(PETS[id].hello);
    audio.magic();
    bus.emit("fx:burst", { x: nubi.px(), y: nubi.py(), color: "#ff9fc4" });
    if (id !== "nubi") bus.emit("effect:discoveryOnly", { id: "amigo_" + id });
    bus.emit("act", "pet:" + id);
  });

  // rotina: depois de comer um pouquinho, o bichinho faz cocô (no banheiro)
  let feeds = 0;
  bus.on("act", (a) => {
    if (!a.startsWith("feed:")) return;
    feeds++;
    if (feeds % 2 === 0 && !save.state.poop) { save.state.poop = true; save.persist(); }
  });

  // recepção: na primeira visita o Nubi está dormindo num ninho de nuvem.
  // Não é indisponibilidade: o primeiro toque (em qualquer lugar) o acorda.
  if (!quests.isDone("recepcao") && !(save.state.quests && save.state.quests.progress && save.state.quests.progress.recepcao)) nubi.sleep();
  const wakeUp = () => {
    if (!nubi.wake()) return;
    nubi._wokeAt = performance.now();
    audio.yawn();
    bus.emit("fx:burst", { x: nubi.px(), y: nubi.py() - nubi.radius(), color: "#cdb8f0", small: true });
    bus.emit("act", "wake");
  };

  // áudio
  const startAudio = () => { audio.init(); audio.resume(); };
  bus.on("pointer:down", startAudio);
  bus.on("pointer:down", wakeUp);
  let booted = false;   // a primeira entrada (abertura do jogo) não acorda o Nubi
  bus.on("room:changed", () => { if (booted) wakeUp(); });
  bus.on("audio:chew", () => audio.chew());
  bus.on("audio:magic", () => audio.magic());
  bus.on("audio:whistle", () => audio.whistle());
  bus.on("audio:duck", () => audio.duck());
  bus.on("audio:bounce", () => audio.bounce());
  bus.on("audio:giggle", () => audio.giggle());
  bus.on("audio:purr", () => audio.purr());
  for (const s of ["scrub", "sparkle", "pop", "click", "flush", "plop", "honk"]) bus.on("audio:" + s, () => audio[s]());
  bus.on("discovery", ({ isNew }) => { if (isNew) audio.voiceHappy(); });

  // álbum vivo: tocar num adesivo repete a reação (sem mudar o estado salvo)
  bus.on("album:replay", ({ kind, id }) => replay(kind, id, { nubi, bus, audio }));

  // UI: álbum, responsáveis, navegação, som rápido
  const album = new Album(bus, save);
  new ParentGate(bus, audio, save);
  const progressUI = new ProgressUI({ bus, progress, nubi, audio, vp });
  wireNav(bus, scenes);
  wireBack(bus, scenes);
  wireQuickSound(audio);

  // movimento reduzido (acessibilidade): vale para TODAS as animações
  Motion.reduce = !!save.state.reduceMotion;
  effects.reduceMotion = Motion.reduce;
  document.body.classList.toggle("reduce-motion", Motion.reduce);
  bus.on("reduceMotion:changed", (v) => {
    Motion.reduce = !!v; effects.reduceMotion = !!v;
    document.body.classList.toggle("reduce-motion", !!v);
  });

  // resize -> avisa quem precisa
  window.addEventListener("resize", () => bus.emit("viewport:resize"));

  // segundo plano: pausa áudio e salva (requisito técnico)
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { if (audio.ctx) audio.ctx.suspend(); save.persist(); }
    else if (audio.ctx) audio.ctx.resume();
  });

  // cômodo inicial: na primeira visita, a cozinha (o Nubi dorme ali, recepção;
  // o Guia mostra o que fazer). Depois disso o jogo abre no mapa da casa.
  scenes.go(quests.isDone("recepcao") ? "hub" : "kitchen");
  booted = true;

  // tela inicial com Play: o jogo já roda por trás; ao tocar em Play a
  // contagem de inatividade do Guia recomeça (a ajuda não "pula" na criança)
  window.__titleDone = false;
  showTitle({ audio, onStart: () => {
    window.__titleDone = true;
    if (guide._activity) guide._activity();
    bus.emit("title:start");
  } });

  // loop
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(50, now - last || 16);
    last = now;

    nubi.update(dt);
    scenes.update(dt);
    effects.update(dt);
    guide.update(dt);

    scenes.draw();
    guide.draw();
    effects.draw();
    scenes.drawTransition();

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // handle para testes headless
  window.__nubi = {
    get room() { return scenes.currentId; },
    get rooms() { return scenes.rooms; },
    get kitchen() { return scenes.rooms.get("kitchen"); },
    get bathroom() { return scenes.rooms.get("bathroom"); },
    get bedroom() { return scenes.rooms.get("bedroom"); },
    get dentist() { return scenes.rooms.get("dentist"); },
    get salon() { return scenes.rooms.get("salon"); },
    get hub() { return scenes.rooms.get("hub"); },
    get items() { return scenes.rooms.get("kitchen").items; },  // compat Etapa 1/2
    get interactions() { return scenes.rooms.get("kitchen"); },
    nubi, bus, vp, save, effects, album, quests, guide, progress, progressUI, scenes, go: (id) => scenes.go(id), back: () => scenes.back()
  };
}

/* Voltar (botão do topo, Esc/Backspace no computador): primeiro sai da
   sub-tela do cômodo (estação do salão), depois volta pelo caminho feito,
   e por fim para o mapa da casa. O botão some quando não há para onde voltar. */
function wireBack(bus, scenes) {
  const back = document.getElementById("btnBack");
  const home = document.getElementById("btnHome");
  const sync = () => { if (back) back.classList.toggle("off", !scenes.canBack()); };
  if (back) back.addEventListener("click", () => bus.emit("room:back"));
  if (home) home.addEventListener("click", () => bus.emit("room:go", "hub"));
  bus.on("room:changed", sync);
  bus.on("room:sub", () => { sync(); if (back && scenes.canBack()) { back.classList.remove("hey"); void back.offsetWidth; back.classList.add("hey"); } });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" || e.key === "Backspace") {
      if (document.querySelector(".overlay.show")) { document.querySelectorAll(".overlay.show").forEach(o => o.classList.remove("show")); return; }
      bus.emit("room:back");
    }
  });
  sync();
}

/* Reação repetida pelo álbum: só aparência/efeito temporário, nunca muda
   cor salva, roupas ou progresso. */
function replay(kind, id, { nubi, bus, audio }) {
  const r = nubi.radius(), head = { x: nubi.px(), y: nubi.py() - r * 0.9 };
  if (kind === "chapter") {
    nubi.dance(); audio.fanfare(); bus.emit("fx:confetti", { amount: 0.6 });
    return;
  }
  switch (id) {
    case "nubi_azul": nubi.pulse.kick(2.2); bus.emit("fx:burst", { ...head, color: "#5b8def" }); audio.magic(); break;
    case "nubi_coracoes": bus.emit("fx:hearts", head); audio.magic(); break;
    case "nubi_lua": nubi.showMoonTuft(); audio.magic(); break;
    case "nubi_assobio": nubi.puffCheeks(); audio.whistle(); break;
    case "nubi_patinho": audio.duck(); nubi.say("Quá!"); break;
    case "nubi_fofo": nubi.sq.kick(1.6); bus.emit("fx:burst", { ...head, color: "#ffd9ec", small: true }); break;
    default: {
      // comidas: repete a reação temporária (nunca a cor salva)
      const f = Object.values(FOODS).find(x => x.effect && x.effect.discovery === id);
      if (f && f.effect.kind !== "tint") { bus.emit("effect:apply", { effect: f.effect, at: head, nubi }); break; }
      nubi.celebrate(); bus.emit("fx:burst", { ...head, color: "#ffd54a", small: true }); audio.voiceHappy();
    }
  }
}

function wireNav(bus, scenes) {
  document.querySelectorAll("[data-room]").forEach(btn => {
    btn.addEventListener("click", () => bus.emit("room:go", btn.getAttribute("data-room")));
  });
  bus.on("room:changed", (id) => {
    document.querySelectorAll("[data-room]").forEach(b =>
      b.classList.toggle("active", b.getAttribute("data-room") === id));
  });
}

function wireQuickSound(audio) {
  const sound = document.getElementById("btnSound");
  if (sound) sound.addEventListener("click", () => {
    const on = !audio.enabled.sfx;
    audio.enabled.sfx = on; audio.enabled.voice = on; audio.enabled.music = on;
    sound.classList.toggle("off", !on);
    sound.setAttribute("aria-pressed", String(!on));
  });
}
