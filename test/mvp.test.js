// Teste de aceitação do MVP — cobre os três cômodos e as quatro brincadeiras.
const { chromium } = require('playwright');

const sleep = (p, ms) => p.waitForTimeout(ms);

async function dragItemToNubi(page, idx) {
  const c = await page.evaluate((i) => {
    const n = window.__nubi; const it = n.kitchen.items[i]; const r = n.nubi.radius();
    return { from: { x: it.pos.x, y: it.pos.y }, to: { x: n.nubi.px(), y: n.nubi.py() + 0.18 * r } };
  }, idx);
  await page.mouse.move(c.from.x, c.from.y); await page.mouse.down();
  for (let i = 1; i <= 14; i++) { await page.mouse.move(c.from.x + (c.to.x - c.from.x) * i / 14, c.from.y + (c.to.y - c.from.y) * i / 14); await page.waitForTimeout(12); }
  await page.mouse.up(); await page.waitForTimeout(1000);
}

async function dragToolOverNubi(page, toolId, passes = 8) {
  const c = await page.evaluate((id) => {
    const n = window.__nubi; const t = n.bathroom.tools.find(x => x.id === id);
    const p = n.bathroom.toolPos(t);
    return { from: p, nubi: { x: n.nubi.px(), y: n.nubi.py() } };
  }, toolId);
  await page.mouse.move(c.from.x, c.from.y); await page.mouse.down();
  for (let i = 0; i < passes; i++) {
    await page.mouse.move(c.nubi.x - 20, c.nubi.y); await page.waitForTimeout(20);
    await page.mouse.move(c.nubi.x + 20, c.nubi.y); await page.waitForTimeout(20);
  }
  await page.mouse.up(); await page.waitForTimeout(200);
}

async function dragAccessory(page, slotIdx) {
  const c = await page.evaluate((i) => {
    const n = window.__nubi; const w = n.bedroom.wardrobe[i]; const p = n.bedroom.wardrobePos(w);
    return { from: p, to: { x: n.nubi.px(), y: n.nubi.py() }, slot: w.def.slot };
  }, slotIdx);
  await page.mouse.move(c.from.x, c.from.y); await page.mouse.down();
  for (let i = 1; i <= 12; i++) { await page.mouse.move(c.from.x + (c.to.x - c.from.x) * i / 12, c.from.y + (c.to.y - c.from.y) * i / 12); await page.waitForTimeout(14); }
  await page.mouse.up(); await page.waitForTimeout(200);
  return c.slot;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 440 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });

  const results = {};
  await page.goto('http://127.0.0.1:8742/index.html?notitle', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!window.__nubi && window.__nubi.room, null, { timeout: 6000 });
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!window.__nubi && window.__nubi.room);
  await sleep(page, 200);

  // --- 3 cômodos existem ---
  results.rooms = await page.evaluate(() => Array.from(window.__nubi.rooms.keys()).sort().join(','));

  // === COZINHA: alimentar (azul) ===
  await page.evaluate(() => window.__nubi.go('kitchen')); await sleep(page, 200);
  await dragItemToNubi(page, 0); // blueberry -> tint azul
  results.fedBlue = await page.evaluate(() => window.__nubi.nubi.tint);

  // === BANHEIRO: espuma -> enxágue restaura cor-base -> toalha fofo -> patinho ===
  await page.evaluate(() => window.__nubi.go('bathroom')); await sleep(page, 200);
  await dragToolOverNubi(page, 'sponge', 10);
  results.foam = await page.evaluate(() => window.__nubi.nubi.foam > 0);
  await dragToolOverNubi(page, 'shower', 14);
  results.rinsedBase = await page.evaluate(() => window.__nubi.nubi.tint); // deve ser null
  await dragToolOverNubi(page, 'towel', 3);
  results.fluffy = await page.evaluate(() => window.__nubi.nubi.fluffy > 0);
  await page.evaluate(() => { const t = window.__nubi.bathroom.tools.find(x => x.id === 'duck'); const p = window.__nubi.bathroom.toolPos(t); window.__nubi.bus.emit('tap', p); });
  await sleep(page, 200);
  results.duck = await page.evaluate(() => !!window.__nubi.save.state.discoveries['nubi_patinho']);

  // === QUARTO: vestir (chapéu, capa, botas; substituição) + bola no cesto ===
  await page.evaluate(() => window.__nubi.go('bedroom')); await sleep(page, 300);
  const s0 = await dragAccessory(page, 0); // hat
  const s1 = await dragAccessory(page, 1); // cape
  const s2 = await dragAccessory(page, 2); // boots
  results.equipped = await page.evaluate(() => Object.keys(window.__nubi.nubi.accessories).sort().join(','));

  // bola: desliza em direção ao cesto (perto do nível do piso) e deixa a assistência levar
  await page.evaluate(() => {
    const n = window.__nubi.bedroom;
    const b = n.basketPos();
    n.ball.px = window.__nubi.vp.dx(0.45); n.ball.py = window.__nubi.vp.dy(0.86);
    n.ball.vx = (b.x - n.ball.px) / 10; n.ball.vy = 0;
  });
  let inBasket = false;
  for (let i = 0; i < 40 && !inBasket; i++) {
    await sleep(page, 100);
    inBasket = await page.evaluate(() => !!window.__nubi.save.state.discoveries['nubi_cesto']);
  }
  results.ballInBasket = inBasket;

  // === persistência: recarrega e confere que as descobertas sobrevivem ===
  const before = await page.evaluate(() => Object.keys(window.__nubi.save.state.discoveries).length);
  const accBefore = await page.evaluate(() => Object.keys(window.__nubi.nubi.accessories).sort().join(','));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!window.__nubi);
  const after = await page.evaluate(() => Object.keys(window.__nubi.save.state.discoveries).length);
  const accAfter = await page.evaluate(() => Object.keys(window.__nubi.nubi.accessories).sort().join(','));
  results.persisted = before === after && after > 0;
  results.accessoriesPersisted = accBefore === accAfter && accAfter.length > 0;

  await page.evaluate(() => window.__nubi.go('bedroom')); await sleep(page, 300);
  await page.screenshot({ path: 'C:/Users/joaos/.kiro/crew/workspace/nubi-casa-magica/preview-mvp.png' });
  await browser.close();

  console.log(JSON.stringify(results, null, 2));
  console.log('erros:', errors.length ? errors : 'nenhum');

  const ok =
    ['bathroom', 'bedroom', 'kitchen'].every(r => results.rooms.split(',').includes(r)) &&
    results.fedBlue === '#5b8def' &&
    results.foam === true &&
    results.rinsedBase === null &&
    results.fluffy === true &&
    results.duck === true &&
    results.equipped === 'boots,cape,hat' &&
    results.ballInBasket === true &&
    results.persisted === true &&
    results.accessoriesPersisted === true &&
    errors.length === 0;
  console.log('RESULTADO:', ok ? 'PASS' : 'FAIL');
  process.exit(ok ? 0 : 1);
})();
