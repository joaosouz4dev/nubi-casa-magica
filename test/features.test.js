// Teste dos novos recursos: bichinhos (vitrine + aparência por bichinho),
// guarda-roupa ampliado (páginas, peças novas, looks prontos, presente de
// capítulo), consultório dos dentinhos, rotinas de higiene (lixo, caminhão,
// cocô, pente) e salão (cabelo, cor, unhas, maquiagem, pintura, lencinho).
// Tudo com interações reais de ponteiro; capturas em ./previews.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = process.env.NUBI_PREVIEW_DIR || 'C:/Users/joaos/.kiro/crew/workspace/nubi-casa-magica/previews';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 440 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  const shot = (name) => page.screenshot({ path: path.join(OUT, name + '.png') });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const wait = (ms) => page.waitForTimeout(ms);
  const R = {};
  const drag = async (from, to, steps = 12) => {
    await page.mouse.move(from.x, from.y); await page.mouse.down();
    for (let s = 1; s <= steps; s++) { await page.mouse.move(from.x + (to.x - from.x) * s / steps, from.y + (to.y - from.y) * s / steps); await wait(14); }
    await page.mouse.up(); await wait(150);
  };
  const rub = async (from, at, passes = 10, dx = 28) => {
    await page.mouse.move(from.x, from.y); await page.mouse.down();
    for (let i = 1; i <= 8; i++) { await page.mouse.move(from.x + (at.x - from.x) * i / 8, from.y + (at.y - from.y) * i / 8); await wait(12); }
    for (let i = 0; i < passes; i++) { await page.mouse.move(at.x - dx, at.y); await wait(16); await page.mouse.move(at.x + dx, at.y); await wait(16); }
    await page.mouse.up(); await wait(150);
  };
  const acts = () => ev(() => window.__acts);
  const go = async (id) => { await ev((r) => window.__nubi.go(r), id); await wait(750); };
  const fps = () => ev(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1500) requestAnimationFrame(f); else res(n / ((performance.now() - t0) / 1000)); }; requestAnimationFrame(f); }));

  await page.goto('http://127.0.0.1:8742/index.html?notitle', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!window.__nubi && window.__nubi.room);
  await ev(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!window.__nubi && window.__nubi.room);
  await ev(() => { window.__acts = []; window.__nubi.bus.on('act', (a) => window.__acts.push(a)); });
  await page.mouse.click(380, 120); await wait(900);          // acorda

  // ================= BICHINHOS =================
  await page.click('#btnPets'); await wait(700);
  R.petCards = (await page.$$('#petsGrid .petCard')).length === 3;
  await shot('f01-vitrine');
  await page.click('[data-pet="bunny"]'); await wait(900);
  R.bunny = await ev(() => window.__nubi.nubi.species === 'bunny' && window.__nubi.save.currentPet() === 'bunny');
  R.petAct = (await acts()).includes('pet:bunny');

  // ================= GUARDA-ROUPA =================
  await go('bedroom');
  const tapPageBtn = async () => { const b = await ev(() => window.__nubi.bedroom.pageBtnPos()); await page.mouse.click(b.x, b.y); await wait(350); };
  const toPage = async (id) => { for (let i = 0; i < 12; i++) { if ((await ev(() => window.__nubi.bedroom.page().id)) === id) return true; await tapPageBtn(); } return false; };
  const slotPos = (k) => ev((i) => { const b = window.__nubi.bedroom; return b.wardrobePos(b.wardrobe[i]); }, k);
  const nubiC = () => ev(() => ({ x: window.__nubi.nubi.px(), y: window.__nubi.nubi.py() }));
  R.pageCabeca = await toPage('cabeca');
  await drag(await slotPos(0), await nubiC()); await wait(500);                // coroa
  R.crown = await ev(() => (window.__nubi.nubi.accessories.hat || {}).id === 'crown');
  R.pageRosto = await toPage('rosto');
  let sp = await slotPos(0); await page.mouse.click(sp.x, sp.y); await wait(400);  // tapa-olho (toque veste)
  R.eyepatch = await ev(() => (window.__nubi.nubi.accessories.face || {}).id === 'eyepatch');
  await page.mouse.click(sp.x, sp.y); await wait(300);                            // toque de novo tira
  R.untap = await ev(() => !window.__nubi.nubi.accessories.face);
  R.pageLooks = await toPage('looks');
  sp = await slotPos(0); await page.mouse.click(sp.x, sp.y); await wait(1100);    // look herói
  R.lookHero = await ev(() => { const a = window.__nubi.nubi.accessories; return a.cape && a.cape.id === 'cape' && a.face && a.face.id === 'heromask' && a.boots && !a.hat; });
  R.lookAct = (await acts()).includes('look:heroi');
  await shot('f02-look-heroi');
  // aparência é por bichinho: o urso começa sem roupa; a coelha volta vestida
  await page.click('#btnPets'); await wait(600); await page.click('[data-pet="bear"]'); await wait(800);
  R.bearClean = await ev(() => window.__nubi.nubi.species === 'bear' && Object.keys(window.__nubi.nubi.accessories).length === 0);
  await shot('f03-ursinho');
  await page.click('#btnPets'); await wait(600); await page.click('[data-pet="bunny"]'); await wait(800);
  R.bunnyKeeps = await ev(() => !!window.__nubi.nubi.accessories.cape && !!window.__nubi.nubi.accessories.face);
  // presente fixo: concluir a recepção (carinho + cócegas) libera os óculos de estrela
  for (const a of ['pet', 'tummy']) { await ev((x) => window.__nubi.bus.emit('act', x), a); await wait(200); }
  await wait(1700);
  await shot('f04-presente');
  R.giftShown = await ev(() => !!window.__nubi.guide.giftShow || window.__nubi.bedroom.newGift);
  R.giftPage = await toPage('presentes');
  R.giftItem = await ev(() => window.__nubi.bedroom.wardrobe.some(w => w.def.id === 'starglasses'));
  sp = await slotPos(0); await drag(sp, await nubiC()); await wait(500);
  R.giftWorn = await ev(() => (window.__nubi.nubi.accessories.face || {}).id === 'starglasses');

  // ================= DENTISTA =================
  await go('dentist');
  await shot('f05-dentista-sujo');
  const tool = (id) => ev((t) => { const d = window.__nubi.dentist; return d.toolPos(d.tools.find(x => x.id === t)); }, id);
  const teeth = (pred) => ev((p) => { const d = window.__nubi.dentist; const f = new Function('t', 'return ' + p); return d.teeth.filter(f).map(t => d.toothPos(t)); }, pred);
  for (const p of await teeth('t.plaque > 0')) await rub(await tool('brush'), p, 9, 14);
  R.plaque = await ev(() => window.__nubi.dentist.done.plaque);
  for (const p of await teeth('!!t.bug')) await rub(await tool('wand'), p, 8, 12);
  R.bugs = await ev(() => window.__nubi.dentist.done.bugs);
  const crooked = await ev(() => { const d = window.__nubi.dentist; const t = d.teeth.find(x => x.crooked); return { from: d.toothPos(t), to: d.toothHome(t) }; });
  await drag(crooked.from, crooked.to, 16);
  R.align = await ev(() => window.__nubi.dentist.done.align);
  const m = await ev(() => window.__nubi.dentist.mouth());
  await rub(await tool('cup'), { x: m.x, y: m.y }, 24, 40);
  R.rinse = await ev(() => window.__nubi.dentist.done.rinse);
  await wait(400);
  R.smile = (await acts()).includes('teeth:all');
  await shot('f06-dentista-limpo');
  R.fpsDentist = (await fps()) > 30;

  // ================= HIGIENE: lixo, caminhão, cocô, pente =================
  await go('kitchen');
  for (const i of [1, 2]) {
    const c = await ev((k) => { const n = window.__nubi; const it = n.kitchen.items[k]; const mo = n.kitchen.mouthPoint(); return { from: { x: it.pos.x, y: it.pos.y }, to: { x: mo.x, y: mo.y } }; }, i);
    await drag(c.from, c.to); await wait(1200);
  }
  R.peels = await ev(() => window.__nubi.kitchen.peels.length >= 2);
  await shot('f07-cozinha-cascas');
  for (let i = 0; i < 2; i++) {
    const c = await ev(() => { const k = window.__nubi.kitchen; const p = k.peels[0]; const b = k.binPos(); return { from: k.peelPos(p), to: { x: b.x, y: b.y - b.r * 0.3 } }; });
    await drag(c.from, c.to); await wait(400);
  }
  R.binned = (await acts()).filter(a => a === 'trash:bin').length >= 2 && await ev(() => window.__nubi.kitchen.bagReady());
  const bag = await ev(() => { const k = window.__nubi.kitchen; const w = k.scene.window(); return { from: k.bagHome(), to: { x: w.x + w.w / 2, y: w.y + w.h / 2 } }; });
  await drag(bag.from, bag.to, 16); await wait(900);
  R.trashOut = (await acts()).includes('trash:out') && await ev(() => window.__nubi.kitchen.truckT > 0);
  await shot('f08-caminhao');
  R.poopFlag = await ev(() => !!window.__nubi.save.state.poop);
  await go('bathroom');
  R.poopShown = await ev(() => !!window.__nubi.bathroom.poop);
  await shot('f09-banheiro-coco');
  const pp = await ev(() => { const b = window.__nubi.bathroom; const t = b.toilet(); return { from: b.poopP(), to: { x: t.x, y: t.y } }; });
  await drag(pp.from, pp.to, 16); await wait(600);
  R.flush = (await acts()).includes('poop:flush') && await ev(() => !window.__nubi.bathroom.poop);
  const comb = await ev(() => { const b = window.__nubi.bathroom; return b.toolPos(b.tools.find(t => t.id === 'comb')); });
  await rub(comb, await nubiC(), 12, 40);
  R.comb = (await acts()).includes('comb');

  // ================= SALÃO (recepção + 3 estações, com ida e volta) =================
  await go('salon');
  const sslot = (k) => ev((i) => { const s = window.__nubi.salon; return s.slotPos(s.slots[i]); }, k);
  const toSalon = async (id) => { for (let i = 0; i < 12; i++) { if ((await ev(() => window.__nubi.salon.page().id)) === id) return true; const b = await ev(() => window.__nubi.salon.pageBtnPos()); await page.mouse.click(b.x, b.y); await wait(300); } return false; };
  const door = async (id) => { const d = await ev((s) => window.__nubi.salon.doorPos(s), id); await page.mouse.click(d.x, d.y); await wait(600); };
  const station = () => ev(() => window.__nubi.salon.station);
  R.salonReception = (await station()) === null;
  await shot('f10a-salao-recepcao');
  await door('hair');
  R.stationHair = (await station()) === 'hair';
  sp = await sslot(0); await page.mouse.click(sp.x, sp.y); await wait(500);
  R.hair = await ev(() => window.__nubi.nubi.cosmetics.hair === 'ponytail');
  await toSalon('cores'); sp = await sslot(2); await page.mouse.click(sp.x, sp.y); await wait(400);
  R.hairColor = await ev(() => window.__nubi.nubi.cosmetics.hairColor === '#ff6b9d');
  await shot('f10b-salao-cabelo');
  await page.click('#btnBack'); await wait(500);                                   // voltar: sai da estação, fica no salão
  R.backToReception = (await station()) === null && (await ev(() => window.__nubi.room)) === 'salon';
  await door('nails');
  R.stationNails = (await station()) === 'nails';
  for (let i = 0; i < 4; i++) {
    const toe = await ev((k) => { const s = window.__nubi.salon; return s.toePos(s.pawSide, k); }, i);
    await drag(await sslot(0), toe); await wait(250);
  }
  R.nails = await ev(() => { const c = window.__nubi.nubi.cosmetics; return c.nails.R === '#e5484d' && c.toes.R.every(v => v === '#e5484d'); });
  R.nailsFull = (await acts()).includes('nails:full');
  await toSalon('unhas3');
  const pawC = await ev(() => { const p = window.__nubi.salon.bigPaw(); return { x: p.x, y: p.y }; });
  await drag(await sslot(0), pawC); await wait(400);
  R.nailArt = await ev(() => window.__nubi.nubi.cosmetics.nailArt.R === 'star');
  await shot('f10c-salao-unhas');
  const chip = await ev(() => window.__nubi.salon.chipPos(3));                     // atalho direto para a maquiagem
  await page.mouse.click(chip.x, chip.y); await wait(600);
  R.chipToMakeup = (await station()) === 'makeup';
  await toSalon('maquiagem');
  const face = await ev(() => window.__nubi.salon.faceCenter());
  await drag(await sslot(2), face); await wait(300);
  await drag(await sslot(0), face); await wait(300);
  R.makeup = await ev(() => !!window.__nubi.nubi.cosmetics.makeup.lips && !!window.__nubi.nubi.cosmetics.makeup.blush);
  await toSalon('pintura');
  await drag(await sslot(1), face); await wait(600);
  R.facePaint = await ev(() => !!window.__nubi.nubi.cosmetics.paint.mustache);
  await shot('f10-salao');
  R.fpsSalon = (await fps()) > 30;
  const wipe = await ev(() => window.__nubi.salon.slotPos(window.__nubi.salon.wipe));
  await rub(wipe, face, 10, 40);
  R.wipe = await ev(() => Object.keys(window.__nubi.nubi.cosmetics.makeup).length === 0 && Object.keys(window.__nubi.nubi.cosmetics.paint).length === 0);
  R.nailsKept = await ev(() => window.__nubi.nubi.cosmetics.nails.R === '#e5484d');   // lencinho no rosto não apaga as unhas

  // ================= PERSISTÊNCIA =================
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!window.__nubi && window.__nubi.room);
  R.persisted = await ev(() => window.__nubi.nubi.species === 'bunny' && window.__nubi.nubi.cosmetics.hair === 'ponytail' && window.__nubi.nubi.cosmetics.nails.R === '#e5484d' && (window.__nubi.nubi.accessories.face || {}).id === 'starglasses');
  await go('salon'); await wait(400);
  await shot('f11-coelhinha-persistida');

  await browser.close();
  for (const [k, v] of Object.entries(R)) console.log((v ? 'ok  ' : 'FAIL') + ' ' + k);
  console.log('erros:', errors.length ? errors : 'nenhum');
  const ok = errors.length === 0 && Object.values(R).every(Boolean);
  console.log('RESULTADO:', ok ? 'PASS' : 'FAIL');
  process.exit(ok ? 0 : 1);
})();
