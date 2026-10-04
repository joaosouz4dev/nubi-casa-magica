// Tela inicial (Play) e orientação: o app abre direto na tela de Play, o
// toque em Play leva ao jogo, e com o aparelho em pé o jogo NÃO é bloqueado:
// o palco é girado e o toque continua caindo no lugar certo.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = process.env.NUBI_PREVIEW_DIR || 'C:/Users/joaos/.kiro/crew/workspace/nubi-casa-magica/previews';
fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://127.0.0.1:8742/index.html';

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const R = {};
  const watch = (page) => {
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  };

  // ---------- paisagem ----------
  let page = await browser.newPage({ viewport: { width: 960, height: 440 }, deviceScaleFactor: 2 });
  watch(page);
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!window.__nubi && window.__nubi.room);
  R.titleShown = await page.isVisible('#title #btnPlay');
  R.logoText = (await page.getAttribute('#title .logo', 'aria-label')) === 'Casa do Nubi';
  R.noRotateBlock = (await page.$('#rotate')) === null;
  await page.waitForTimeout(1600);   // animação de entrada
  await page.screenshot({ path: path.join(OUT, 't1-tela-inicial.png') });
  // tocar no Nubi da tela inicial faz ele pular (não inicia o jogo)
  await page.click('#title .tNubi', { force: true });
  await page.waitForTimeout(200);
  R.nubiBoing = await page.evaluate(() => document.querySelector('#title .tNubi').classList.contains('boing'));
  R.stillOnTitle = await page.evaluate(() => !window.__titleDone);
  await page.click('#btnPlay', { force: true });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, 't2-play-animacao.png') });
  await page.waitForTimeout(1200);
  R.titleGone = (await page.$('#title')) === null;
  R.titleDone = await page.evaluate(() => window.__titleDone === true);
  R.gameRoom = (await page.evaluate(() => window.__nubi.room)) === 'kitchen';
  R.landscapeNoRot = await page.evaluate(() => !document.body.classList.contains('rot'));
  await page.close();

  // ---------- retrato (celular em pé, navegador) ----------
  page = await browser.newPage({ viewport: { width: 412, height: 860 }, deviceScaleFactor: 2, hasTouch: false });
  watch(page);
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!window.__nubi && window.__nubi.room);
  R.portraitRot = await page.evaluate(() => document.body.classList.contains('rot'));
  const st = await page.evaluate(() => ({ w: window.__nubi.vp.w, h: window.__nubi.vp.h }));
  R.stageIsLandscape = st.w === 860 && st.h === 412;
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, 't3-retrato-tela-inicial.png') });
  await page.click('#btnPlay', { force: true });
  await page.waitForTimeout(1500);
  R.portraitPlays = (await page.$('#title')) === null;
  // um toque num ponto do palco precisa chegar ao jogo nesse mesmo ponto
  const target = { x: 300, y: 200 };               // ponto no palco
  const screen = { x: 412 - target.y, y: target.x }; // palco girado 90°
  const waitTap = page.evaluate(() => new Promise((res) => window.__nubi.bus.on('pointer:down', (p) => res(p))));
  await page.mouse.click(screen.x, screen.y);
  const p = await waitTap;
  R.portraitInputMapped = Math.abs(p.x - target.x) < 2 && Math.abs(p.y - target.y) < 2;
  // arrastar uma fruta até a boca também funciona em retrato
  await page.waitForTimeout(400);
  const c = await page.evaluate(() => { const n = window.__nubi; const it = n.kitchen.items[0]; const mo = n.kitchen.mouthPoint(); return { from: it.pos, to: mo }; });
  const toScreen = (q) => ({ x: 412 - q.y, y: q.x });
  const a = toScreen(c.from), b = toScreen(c.to);
  await page.mouse.move(a.x, a.y); await page.mouse.down();
  for (let s = 1; s <= 12; s++) { await page.mouse.move(a.x + (b.x - a.x) * s / 12, a.y + (b.y - a.y) * s / 12); await page.waitForTimeout(14); }
  await page.mouse.up();
  await page.waitForTimeout(1300);
  R.portraitFeeds = await page.evaluate(() => !!window.__nubi.nubi.tint);   // item 0 = frutinha azul
  await page.screenshot({ path: path.join(OUT, 't4-retrato-jogo.png') });
  await page.close();

  await browser.close();
  for (const [key, v] of Object.entries(R)) console.log((v ? 'ok  ' : 'FAIL') + ' ' + key);
  console.log('erros:', errors.length ? errors : 'nenhum');
  const ok = errors.length === 0 && Object.values(R).every(Boolean);
  console.log('RESULTADO:', ok ? 'PASS' : 'FAIL');
  process.exit(ok ? 0 : 1);
})();
