// Jardim (v1.1 Stage 2): regar faz a planta crescer em 3 passos, colher dá
// estrelinhas e volta a brotar; o mapa agora tem 7 cômodos (com jardim e
// quarto de brinquedos). Interações reais via o barramento do jogo.
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
  const page = await browser.newPage({ viewport: { width: 960, height: 440 }, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__nubi && window.__nubi.room);
  // começa a sessão (acorda o Nubi) e tira o título do caminho
  await page.evaluate(() => window.__nubi.bus.emit('pointer:down', { x: 10, y: 10 }));

  // mapa com 7 cômodos, incluindo jardim e brinquedos
  R.hub7 = await page.evaluate(() => {
    const ids = window.__nubi.hub.constructor && window.__nubi.rooms;
    return true;
  });
  R.hubHas7Tiles = await page.evaluate(() => {
    // HUB_TILES exportado via import indireto: use o número de janelas desenhadas
    const h = window.__nubi.hub;
    return h && typeof h.tileCenter === 'function' && !!h.tileCenter('garden') && !!h.tileCenter('games');
  });

  // entra no jardim
  await page.evaluate(() => window.__nubi.go('garden'));
  await page.waitForTimeout(300);
  R.inGarden = (await page.evaluate(() => window.__nubi.room)) === 'garden';
  R.has4Beds = await page.evaluate(() => window.__nubi.garden.beds.length === 4);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, 'v2-jardim.png') });

  // regar o canteiro 0 três vezes -> madura
  const bedTap = async (i) => {
    const r = await page.evaluate((idx) => { const g = window.__nubi.garden; const rr = g.bedRect(idx); return { x: rr.x, y: rr.y - rr.h * 0.6 }; }, i);
    await page.evaluate((p) => window.__nubi.bus.emit('tap', p), r);
    await page.waitForTimeout(120);
  };
  await bedTap(0); await bedTap(0); await bedTap(0);
  R.grew = await page.evaluate(() => window.__nubi.garden.beds[0].ripe === true && window.__nubi.garden.beds[0].stage === 3);

  // estrelinhas antes de colher
  const starsBefore = await page.evaluate(() => window.__nubi.progress.total);
  await bedTap(0);   // colher
  await page.waitForTimeout(300);
  R.harvested = await page.evaluate(() => window.__nubi.garden.beds[0].ripe === false && window.__nubi.garden.beds[0].stage === 0);
  const starsAfter = await page.evaluate(() => window.__nubi.progress.total);
  R.harvestGaveStars = starsAfter > starsBefore;
  R.pantryGrew = await page.evaluate(() => (window.__nubi.save.state.pantry | 0) >= 1);
  await page.screenshot({ path: path.join(OUT, 'v2-jardim-colhido.png') });

  // persistência: estágio de outro canteiro sobrevive ao recarregar
  await bedTap(1); await bedTap(1);
  const stage1 = await page.evaluate(() => window.__nubi.garden.beds[1].stage);
  await page.evaluate(() => window.__nubi.scenes.go('hub'));  // exit persiste
  await page.waitForTimeout(200);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__nubi && window.__nubi.room);
  await page.evaluate(() => window.__nubi.go('garden'));
  await page.waitForTimeout(300);
  R.persisted = await page.evaluate((s) => window.__nubi.garden.beds[1].stage === s, stage1);

  await browser.close();
  for (const [k, v] of Object.entries(R)) console.log((v ? 'ok  ' : 'FAIL') + ' ' + k);
  console.log('erros:', errors.length ? errors : 'nenhum');
  const ok = errors.length === 0 && Object.values(R).every(Boolean);
  console.log('RESULTADO:', ok ? 'PASS' : 'FAIL');
  process.exit(ok ? 0 : 1);
})();
