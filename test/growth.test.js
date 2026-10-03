// Teste da temporada 3: mapa da casa (hub) com ida e volta, comidas novas
// em abas, estrelinhas que só sobem, lojinha de prêmios (comida, roupa,
// enfeite), coração de carinho e missões do dia. Interações reais de
// ponteiro e cliques nos botões da interface; capturas em ./previews.
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
  const acts = () => ev(() => window.__acts);
  const room = () => ev(() => window.__nubi.room);
  const total = () => ev(() => window.__nubi.progress.total);
  const fps = () => ev(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1500) requestAnimationFrame(f); else res(n / ((performance.now() - t0) / 1000)); }; requestAnimationFrame(f); }));
  const feedItem = async (i) => {
    const c = await ev((k) => { const n = window.__nubi; const it = n.kitchen.items[k]; const mo = n.kitchen.mouthPoint(); return { id: it.def.id, from: { x: it.pos.x, y: it.pos.y }, to: { x: mo.x, y: mo.y } }; }, i);
    await drag(c.from, c.to); await wait(1150);
    return c.id;
  };
  const tapTab = async (i) => { const p = await ev((k) => window.__nubi.kitchen.tabPos(k), i); await page.mouse.click(p.x, p.y); await wait(700); };

  await page.goto('http://127.0.0.1:8742/index.html?notitle', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!window.__nubi && window.__nubi.room);
  await ev(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!window.__nubi && window.__nubi.room);
  await ev(() => { window.__acts = []; window.__nubi.bus.on('act', (a) => window.__acts.push(a)); window.__ups = 0; window.__nubi.bus.on('love:up', () => window.__ups++); });
  R.firstVisitKitchen = (await room()) === 'kitchen';
  R.backVisibleInKitchen = await ev(() => !document.getElementById('btnBack').classList.contains('off'));   // cozinha -> pode voltar ao mapa
  await page.mouse.click(380, 120); await wait(900);          // acorda

  // ================= COMIDAS NOVAS (abas) + ESTRELINHAS =================
  R.tabs = (await ev(() => window.__nubi.kitchen.tabs().length)) === 4;     // especiais só aparece com prêmio
  R.firstTabOriginal = (await ev(() => window.__nubi.kitchen.items.map(i => i.def.id).join(','))) === 'blueberry,strawberry,banana,pear';
  const s0 = await total();
  await feedItem(1);                                           // morango
  R.starsUp = (await total()) > s0;
  await wait(900);
  R.pillShows = await ev(() => Number(document.getElementById('starCount').textContent) === window.__nubi.progress.total);
  const eaten = [];
  for (const t of [1, 2, 3]) {
    await tapTab(t);
    await shot('g0' + t + '-aba-' + (await ev(() => window.__nubi.kitchen.tab().id)));
    for (let i = 0; i < 4; i++) eaten.push(await feedItem(i));
  }
  R.ate12 = eaten.length === 12 && new Set(eaten).size === 12;
  const disc = await ev(() => Object.keys(window.__nubi.save.state.discoveries));
  const wanted = ['nubi_rosa', 'nubi_bolhas', 'nubi_sol', 'nubi_croc', 'nubi_danca', 'nubi_queijo', 'nubi_orelhas', 'nubi_forte', 'nubi_festinha', 'nubi_brr', 'nubi_bigode_leite', 'nubi_musica'];
  R.newDiscoveries = wanted.every(d => disc.includes(d));
  R.groupActs = (await acts()).filter(a => a.startsWith('feedgroup:')).length >= 12;
  R.loveUp = (await ev(() => window.__ups)) >= 1 && (await ev(() => window.__nubi.progress.love().lvl)) >= 1;
  // a mesma ação repetida em sequência não "fabrica" estrelinha
  const sCool = await total();
  for (let i = 0; i < 5; i++) await ev(() => window.__nubi.bus.emit('act', 'duck'));
  R.cooldown = (await total()) - sCool <= 2;

  // ================= HUB (mapa da casa) + IR E VOLTAR =================
  await page.click('#btnHome', { force: true }); await wait(800);
  R.hub = (await room()) === 'hub';
  R.backHiddenInHub = await ev(() => document.getElementById('btnBack').classList.contains('off'));
  await shot('g05-mapa');
  R.fpsHub = (await fps()) > 30;
  const tile = (id) => ev((r) => window.__nubi.hub.tileCenter(r), id);
  let p = await tile('bathroom'); await page.mouse.click(p.x, p.y); await wait(900);
  R.tileToBathroom = (await room()) === 'bathroom';
  await page.click('[data-room="bedroom"]', { force: true }); await wait(800);
  await page.click('#btnBack', { force: true }); await wait(800);
  R.backToBathroom = (await room()) === 'bathroom';
  await page.click('#btnBack', { force: true }); await wait(800);
  R.backToHub = (await room()) === 'hub';
  p = await tile('salon'); await page.mouse.click(p.x, p.y); await wait(900);
  R.tileToSalon = (await room()) === 'salon';
  await page.click('#btnHome', { force: true }); await wait(800);

  // ================= LOJINHA =================
  const before = await total();
  await page.click('#btnShop', { force: true }); await wait(700);
  R.shopCards = (await page.$$('#shopGrid .prize')).length === 12;
  R.someReady = (await page.$$('#shopGrid .prize.ready')).length >= 1;
  await shot('g06-lojinha');
  await page.click('#shopGrid .prize.ready', { force: true }); await wait(700);              // primeiro prêmio pronto: biscoito estrela
  R.claimedCookie = await ev(() => window.__nubi.progress.owned('food:starcookie'));
  R.starsKept = (await total()) >= before;                                 // ganhar prêmio não gasta estrelinha
  await page.click('#shopClose'); await wait(400);
  await ev(() => window.__nubi.progress.add(60, 'teste'));
  await ev(() => { const g = window.__nubi.progress; g.claim('wear:goldcrown'); g.claim('decor:flags'); g.claim('decor:flowers'); g.claim('decor:balloons'); });
  await wait(900);
  R.decorOnHub = await ev(() => window.__nubi.hub.decor('decor:flags') && window.__nubi.hub.decor('decor:balloons'));
  await shot('g07-mapa-enfeitado');
  // comida especial aparece na geladeira
  let k = await tile('kitchen'); await page.mouse.click(k.x, k.y); await wait(900);
  R.specialTab = (await ev(() => window.__nubi.kitchen.tabs().some(t => t.id === 'especiais')));
  await tapTab(await ev(() => window.__nubi.kitchen.tabs().findIndex(t => t.id === 'especiais')));
  R.cookieOnTable = (await ev(() => window.__nubi.kitchen.items.map(i => i.def.id))).includes('starcookie');
  await shot('g08-especiais');
  await feedItem(0);
  R.feedSpecial = (await acts()).includes('feed:special') && (await ev(() => !!window.__nubi.save.state.discoveries.nubi_estrelado));
  // roupa ganha aparece no guarda-roupa (página de presentes)
  await page.click('[data-room="bedroom"]', { force: true }); await wait(800);
  R.crownInWardrobe = await ev(() => { const b = window.__nubi.bedroom; return b.availablePages().some(pg => pg.gifts) && b.giftUnlocked({ id: 'goldcrown', gift: 'cozinha_nao_feito' }); });

  // ================= MISSÕES DO DIA =================
  await page.click('#btnMissions', { force: true }); await wait(600);
  R.missions = (await page.$$('#missionList .mission')).length === 3;
  await shot('g09-missoes');
  const m0 = await ev(() => window.__nubi.progress.missions().find(m => !m.done));
  await page.click('#missionsClose'); await wait(300);
  const sM = await total();
  if (m0) await ev((a) => window.__nubi.bus.emit('act', a), m0.act);
  await wait(300);
  R.missionDone = !m0 || ((await ev((a) => window.__nubi.progress.missions().find(m => m.act === a).done, m0.act)) && (await total()) - sM >= 5);
  // tocar numa missão leva até o cômodo dela
  await page.click('#btnMissions', { force: true }); await wait(600);
  const pending = await ev(() => window.__nubi.progress.missions().filter(m => !m.done).map(m => m.room));
  if (pending.length) {
    const idx = await ev(() => window.__nubi.progress.missions().findIndex(m => !m.done));
    await page.click(`#missionList .mission:nth-child(${idx + 1})`); await wait(900);
    R.missionGoesToRoom = (await room()) === pending[0];
  } else { R.missionGoesToRoom = true; await page.click('#missionsClose'); }

  // ================= ÁLBUM com as comidas novas =================
  await page.click('#btnAlbum'); await wait(700);
  const titles = await ev(() => [...document.querySelectorAll('#albumGrid .albumCard.found .albumTitle')].map(e => e.textContent));
  R.albumHasFoods = ['Melancia', 'Pizza', 'Picolé', 'Biscoito estrela'].every(t => titles.includes(t));
  await page.click('#albumClose'); await wait(300);

  // ================= PERSISTÊNCIA =================
  // depois da recepção (acordar, carinho, cócegas), o jogo passa a abrir no mapa
  for (const a of ['pet', 'tummy']) { await ev((x) => window.__nubi.bus.emit('act', x), a); await wait(200); }
  const tBefore = await total();
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!window.__nubi && window.__nubi.room);
  await wait(500);
  R.opensOnHub = (await room()) === 'hub';
  R.starsPersisted = (await total()) === tBefore;
  R.prizesPersisted = await ev(() => window.__nubi.progress.owned('food:starcookie') && window.__nubi.progress.owned('decor:flags'));
  await shot('g10-mapa-volta');

  await browser.close();
  for (const [key, v] of Object.entries(R)) console.log((v ? 'ok  ' : 'FAIL') + ' ' + key);
  console.log('erros:', errors.length ? errors : 'nenhum');
  const ok = errors.length === 0 && Object.values(R).every(Boolean);
  console.log('RESULTADO:', ok ? 'PASS' : 'FAIL');
  process.exit(ok ? 0 : 1);
})();
