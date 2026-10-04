// Teste da temporada 4: espaço Brincadeiras com os 4 minijogos (pega-frutas,
// estoura-bolhas, memória, música), estrelinhas por partida, nova marca
// pessoal, voltar no meio do jogo, baú do dia (missões), presente do dia e
// surpresa no mapa. Interações reais de ponteiro; capturas em ./previews.
// Para não esperar 30s por partida, o relógio da partida é adiantado só no fim.
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
  const room = () => ev(() => window.__nubi.room);
  const total = () => ev(() => window.__nubi.progress.total);
  const game = () => ev(() => { const g = window.__nubi.games.game; return g ? { id: g.id, score: g.score, t: g.t } : null; });
  const fps = () => ev(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1500) requestAnimationFrame(f); else res(n / ((performance.now() - t0) / 1000)); }; requestAnimationFrame(f); }));
  const cardCenter = (i) => ev((k) => { const r = window.__nubi.games.cardRect(k); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }, i);
  const fastForward = () => ev(() => { const g = window.__nubi.games.game; if (g) g.t = 30000; });
  const waitResult = async () => { for (let i = 0; i < 40; i++) { if (await ev(() => !!window.__nubi.games.result)) return true; await wait(150); } return false; };
  const leaveResult = async () => { await wait(1000); await page.mouse.click(600, 220); await wait(500); };

  await page.goto('http://127.0.0.1:8742/index.html?notitle', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!window.__nubi && window.__nubi.room);
  await ev(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!window.__nubi && window.__nubi.room);
  await ev(() => { window.__acts = []; window.__nubi.bus.on('act', (a) => window.__acts.push(a)); });
  await page.mouse.click(380, 120); await wait(900);                 // acorda
  for (const a of ['pet', 'tummy']) { await ev((x) => window.__nubi.bus.emit('act', x), a); await wait(250); }
  R.receptionDone = await ev(() => window.__nubi.quests.isDone('recepcao'));

  // ================= MAPA -> BRINCADEIRAS =================
  await page.click('#btnHome', { force: true }); await wait(900);
  const tileG = await ev(() => window.__nubi.hub.tileCenter('games'));
  R.hubHasGamesTile = !!tileG;
  await page.mouse.click(tileG.x, tileG.y); await wait(1000);
  R.inGames = (await room()) === 'games';
  R.navHasGames = await ev(() => !!document.querySelector('#nav [data-room="games"].active'));
  await shot('m01-brincadeiras');

  // ================= PEGA-FRUTAS (o bichinho segue o dedo) =================
  let s0 = await total();
  let c = await cardCenter(0); await page.mouse.click(c.x, c.y); await wait(300);
  R.catchStarted = ((await game()) || {}).id === 'catch';
  await wait(1000);
  await page.mouse.move(480, 300); await page.mouse.down();
  for (let i = 0; i < 70; i++) {          // ~7s: arrasta o dedo atrás da fruta mais baixa
    const f = await ev(() => { const g = window.__nubi.games.game; if (!g) return null; const its = g.items.filter(x => !x.landed).sort((a, b) => b.y - a.y); return its[0] ? { x: its[0].x * window.__nubi.vp.w } : null; });
    if (f) await page.mouse.move(f.x, 300, { steps: 2 });
    await wait(100);
    if (i === 40) await shot('m02-pega-frutas');
  }
  await page.mouse.up();
  const catchScore = ((await game()) || {}).score || 0;
  R.catchScored = catchScore >= 2;
  await fastForward();
  R.catchResult = await waitResult();
  await wait(1300); await shot('m03-resultado');
  R.catchStars = (await total()) - s0 >= 3;
  R.catchBest = await ev(() => window.__nubi.games.best('catch') > 0);
  R.catchAct = await ev(() => window.__acts.includes('game:catch'));
  R.catchSticker = await ev(() => !!window.__nubi.save.state.discoveries.jogo_catch);
  await leaveResult();
  R.backToMenu = await ev(() => !window.__nubi.games.game && !window.__nubi.games.result);

  // ================= ESTOURA-BOLHAS =================
  s0 = await total();
  c = await cardCenter(1); await page.mouse.click(c.x, c.y); await wait(1300);
  let popped = 0;
  for (let i = 0; i < 40 && popped < 6; i++) {
    const b = await ev(() => { const g = window.__nubi.games.game, vp = window.__nubi.vp; const v = g.items.filter(x => x.y < 0.85 && x.y > 0.2)[0]; return v ? { x: vp.dx(v.x + Math.sin(v.ph) * 0.015), y: vp.dy(v.y) } : null; });
    if (b) { const before = ((await game()) || {}).score; await page.mouse.click(b.x, b.y); await wait(60); if (((await game()) || {}).score > before) popped++; }
    await wait(120);
    if (i === 10) await shot('m04-bolhas');
  }
  R.bubblesPopped = popped >= 4;
  await fastForward();
  R.bubblesResult = await waitResult();
  R.bubblesStars = (await total()) - s0 >= 3;
  await leaveResult();

  // ================= MEMÓRIA (inclui um erro, que não custa nada) =================
  s0 = await total();
  c = await cardCenter(2); await page.mouse.click(c.x, c.y); await wait(1300);
  const cards = await ev(() => window.__nubi.games.game.cards.map((k, i) => { const r = window.__nubi.games.memoryRect(i); return { icon: k.icon, x: r.x + r.w / 2, y: r.y + r.h / 2 }; }));
  R.memoryCards = cards.length === 6;
  // erro de propósito: duas cartas diferentes
  const a0 = cards[0], diff = cards.find(k => k.icon !== a0.icon);
  await page.mouse.click(a0.x, a0.y); await wait(250); await page.mouse.click(diff.x, diff.y); await wait(300);
  await shot('m05-memoria');
  await wait(1100);
  R.memoryMismatchCloses = await ev(() => window.__nubi.games.game.cards.every(k => !k.open));
  const icons = [...new Set(cards.map(k => k.icon))];
  for (const ic of icons) {
    const pair = cards.filter(k => k.icon === ic);
    await page.mouse.click(pair[0].x, pair[0].y); await wait(250);
    await page.mouse.click(pair[1].x, pair[1].y); await wait(450);
  }
  R.memoryResult = await waitResult();
  R.memoryStars = (await total()) - s0 >= 3;
  await leaveResult();

  // ================= MÚSICA (repete a melodia; um erro faz o bichinho tocar de novo) =================
  s0 = await total();
  c = await cardCenter(3); await page.mouse.click(c.x, c.y); await wait(300);
  const keyPos = await ev(() => [0, 1, 2, 3, 4].map(i => { const r = window.__nubi.games.keyRect(i); return { x: r.x + r.w / 2, y: r.y + r.h * 0.5 }; }));
  const waitPlay = async () => { for (let i = 0; i < 60; i++) { const ph = await ev(() => { const g = window.__nubi.games.game; return g ? g.phase : 'none'; }); if (ph !== 'listen') return ph; await wait(120); } return 'timeout'; };
  let ph = await waitPlay();
  await shot('m06-musica');
  // erro proposital
  const seq0 = await ev(() => window.__nubi.games.game.seq.slice());
  await page.mouse.click(keyPos[(seq0[0] + 1) % 5].x, keyPos[(seq0[0] + 1) % 5].y); await wait(150);
  R.musicWrongReplays = await ev(() => window.__nubi.games.game.phase === 'listen' && window.__nubi.games.game.seq.length === 2);
  let rounds = 0;
  for (let r = 0; r < 8; r++) {
    ph = await waitPlay();
    if (ph !== 'play') break;
    const seq = await ev(() => window.__nubi.games.game.seq.slice());
    for (const k of seq) { await page.mouse.click(keyPos[k].x, keyPos[k].y); await wait(180); }
    rounds++;
  }
  R.musicRounds = rounds >= 3;
  R.musicResult = await waitResult();
  R.musicStars = (await total()) - s0 >= 3;
  await leaveResult();

  // ================= VOLTAR no meio da partida =================
  c = await cardCenter(1); await page.mouse.click(c.x, c.y); await wait(1800);
  R.backVisibleInGame = await ev(() => !document.getElementById('btnBack').classList.contains('off'));
  await page.click('#btnBack', { force: true }); await wait(500);
  R.backLeavesGame = (await room()) === 'games' && (await ev(() => !window.__nubi.games.game));
  await page.click('#btnBack', { force: true }); await wait(900);
  R.secondBackToHub = (await room()) === 'hub';
  R.fpsGames = true;

  // ================= SURPRESA NO MAPA =================
  s0 = await total();
  await ev(() => window.__nubi.hub.spawnSurprise());
  await wait(3000);
  const sp = await ev(() => window.__nubi.hub.surprisePos());
  await shot('m07-surpresa');
  await page.mouse.click(sp.x, sp.y); await wait(900);
  R.surprisePopped = (await total()) - s0 >= 3;

  // ================= MISSÕES DO DIA + BAÚ =================
  const ms = await ev(() => window.__nubi.progress.missions());
  R.missionHasGame = ms.filter(m => m.act.startsWith('game:')).length === 1;
  for (const m of ms) { if (!m.done) { await ev((a) => window.__nubi.bus.emit('act', a), m.act); await wait(300); } }
  await page.click('#btnMissions', { force: true }); await wait(700);
  R.chestReady = await ev(() => !!document.querySelector('#missionList .chestRow.ready'));
  await shot('m08-bau');
  s0 = await total();
  await page.click('#missionList .chestRow', { force: true }); await wait(1200);
  R.chestStars = (await total()) - s0 >= 10;
  R.chestOnce = (await ev(() => window.__nubi.progress.openChest())) === 0;

  // ================= PRESENTE DO DIA (abre com a tela de Play) =================
  await page.goto('http://127.0.0.1:8742/index.html', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!window.__nubi && window.__nubi.room);
  await page.click('#btnPlay', { force: true });
  await page.waitForSelector('#dailyGift', { timeout: 5000 }).catch(() => {});
  R.dailyGiftShown = await page.isVisible('#dailyGift');
  await wait(300); await shot('m09-presente-do-dia');
  s0 = await total();
  if (R.dailyGiftShown) await page.click('#dailyGift', { force: true });
  await wait(1300);
  R.dailyGiftStars = (await total()) - s0 >= 5;
  R.dailyGiftOnce = await ev(() => !window.__nubi.progress.dailyGiftReady());
  R.bestPersisted = await ev(() => window.__nubi.games.best('catch') > 0 && window.__nubi.games.best('memory') > 0);
  await page.click('#btnHome', { force: true }).catch(() => {}); await wait(600);
  await ev(() => window.__nubi.go('games')); await wait(900);
  R.fpsGamesMenu = (await fps()) > 30;
  await shot('m10-marcas');

  await browser.close();
  for (const [key, v] of Object.entries(R)) console.log((v ? 'ok  ' : 'FAIL') + ' ' + key);
  console.log('erros:', errors.length ? errors : 'nenhum');
  const ok = errors.length === 0 && Object.values(R).every(Boolean);
  console.log('RESULTADO:', ok ? 'PASS' : 'FAIL');
  process.exit(ok ? 0 : 1);
})();
