// Dificuldade adaptativa (ação 4): cada minijogo começa no degrau de antes
// (Explorar), sobe depois de 2 partidas com 85%+ de acerto, desce depois de
// 2 abaixo de 60%, respeita o teto do modo dos responsáveis e não conta
// partidas abandonadas. A Música não deixa a criança presa: 5 erros e festa.
// Joga a Memória de verdade (virando cartas pelo próprio jogo).
const { chromium } = require('playwright');
const URL = 'http://127.0.0.1:8742/index.html?notitle';

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const R = {};
  const page = await browser.newPage({ viewport: { width: 960, height: 440 } });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const wait = (ms) => page.waitForTimeout(ms);
  const cards = () => ev(() => window.__nubi.games.game.cards.length);
  const result = async () => { for (let i = 0; i < 40; i++) { if (await ev(() => !!window.__nubi.games.result)) return true; await wait(150); } return false; };
  const toMenu = () => ev(() => { const g = window.__nubi.games; if (g.result) g._toMenu(); });
  // partida de memória: "misses" pares errados antes de acertar tudo
  const memory = async (misses) => {
    await ev(() => window.__nubi.games.start('memory')); await wait(1100);
    for (let k = 0; k < misses; k++) {
      await ev(() => { const g = window.__nubi.games, c = g.game.cards; const a = c.findIndex(x => !x.matched); const b = c.findIndex(x => !x.matched && x.icon !== c[a].icon); g.flipCard(a); g.flipCard(b); });
      await wait(1000);
    }
    await ev(() => { const g = window.__nubi.games, c = g.game.cards; for (let a = 0; a < c.length; a++) { if (c[a].matched) continue; const b = c.findIndex((x, j) => j !== a && !x.matched && x.icon === c[a].icon); g.flipCard(a); g.flipCard(b); } });
    const done = await result(); await toMenu(); await wait(300);
    return done;
  };

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await ev(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__nubi && window.__nubi.room);
  await ev(() => window.__nubi.go('games')); await wait(900);

  // começa onde era antes no modo Explorar: 3 pares, melodia de 4, 3 formas
  await ev(() => window.__nubi.games.start('memory')); await wait(300);
  R.startsAt3Pairs = (await cards()) === 6;
  await ev(() => window.__nubi.games.goBack()); await wait(300);
  R.quitNotCounted = await ev(() => !(window.__nubi.save.state.games.skill || {}).memory);
  R.startsMusic4Shapes3 = await ev(() => { const s = window.__nubi.games.skill; return s.param('music') === 4 && s.param('shapes') === 3; });

  // 2 partidas perfeitas -> sobe: 4 pares
  R.playedPerfect = (await memory(0)) && (await memory(0));
  await ev(() => window.__nubi.games.start('memory')); await wait(300);
  R.upTo4Pairs = (await cards()) === 8;
  await ev(() => window.__nubi.games.goBack()); await wait(300);

  // 2 partidas difíceis (3 erros em 4 pares = 57%) -> desce: 3 pares
  R.playedHard = (await memory(3)) && (await memory(3));
  await ev(() => window.__nubi.games.start('memory')); await wait(300);
  R.downTo3Pairs = (await cards()) === 6;
  await ev(() => window.__nubi.games.goBack()); await wait(300);

  // teto do modo: Explorar vai até 4 pares; Resolver libera até 6
  R.capExplore = await ev(() => { const s = window.__nubi.games.skill; for (let i = 0; i < 10; i++) s.record('memory', 1); return s.param('memory') === 4; });
  R.capSolve = await ev(() => { const n = window.__nubi, s = n.games.skill; n.save.state.mode = 'solve'; for (let i = 0; i < 10; i++) s.record('memory', 1); const p = s.param('memory'); n.save.state.mode = 'explore'; return p === 6 && s.param('memory') === 4; });

  // música: 5 notas erradas terminam a partida em festa (sem ficar preso)
  await ev(() => window.__nubi.games.start('music')); await wait(1100);
  for (let k = 0; k < 5; k++) {
    for (let i = 0; i < 40 && (await ev(() => window.__nubi.games.game && window.__nubi.games.game.phase)) !== 'play'; i++) await wait(150);
    await ev(() => { const g = window.__nubi.games, gm = g.game; if (gm) g.pressKey((gm.seq[gm.idx] + 1) % 5); });
  }
  R.musicEndsAfter5 = await result();
  await toMenu();

  // relatório dos responsáveis mostra degrau e acerto
  await ev(() => window.__nubi.parentGate.open()); await wait(300);
  R.reportShows = await ev(() => /Memória/.test(document.getElementById('parentReport').textContent) && /Degrau/.test(document.getElementById('parentReport').textContent));

  await browser.close();
  for (const [k, v] of Object.entries(R)) console.log((v ? 'ok  ' : 'FAIL') + ' ' + k);
  console.log('erros:', errors.length ? errors : 'nenhum');
  const ok = errors.length === 0 && Object.values(R).every(Boolean);
  console.log('RESULTADO:', ok ? 'PASS' : 'FAIL');
  process.exit(ok ? 0 : 1);
})();
