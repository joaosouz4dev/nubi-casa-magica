// Teste da Etapa 2: oferece os 4 alimentos e confere efeitos/descobertas distintos.
const { chromium } = require('playwright');

async function dragToMouth(page, idx) {
  const c = await page.evaluate((i) => {
    const n = window.__nubi; const it = n.items[i]; const r = n.nubi.radius();
    const mouth = { x: n.nubi.px(), y: n.nubi.py() + 0.18 * r, r: 0.42 * r };
    return { item: { x: it.pos.x, y: it.pos.y }, mouth, held: it.def.id };
  }, idx);
  await page.mouse.move(c.item.x, c.item.y);
  await page.mouse.down();
  const heldAfterDown = await page.evaluate(() => window.__nubi.interactions.held ? window.__nubi.interactions.held.def.id : null);
  if (!heldAfterDown) {
    const dump = await page.evaluate((tap) => {
      return window.__nubi.items.map(it => ({
        id: it.def.id,
        pos: { x: Math.round(it.pos.x), y: Math.round(it.pos.y) },
        hit: Math.round(it.hitRadius()),
        returning: it.returning,
        dist: Math.round(Math.hypot(tap.x - it.pos.x, tap.y - it.pos.y))
      }));
    }, c.item);
    console.log('  DUMP tap=', Math.round(c.item.x) + ',' + Math.round(c.item.y), JSON.stringify(dump));
  }
  console.log('  onDown pegou:', heldAfterDown, '(esperado', c.held + ')');
  for (let i = 1; i <= 16; i++) {
    await page.mouse.move(c.item.x + (c.mouth.x - c.item.x) * i / 16, c.item.y + (c.mouth.y - c.item.y) * i / 16);
    await page.waitForTimeout(12);
  }
  // confere qual item o sistema acha que está segurando e a distância à boca
  const diag = await page.evaluate(() => {
    const n = window.__nubi;
    return { heldNull: true };
  });
  await page.mouse.up();
  console.log('  drag', c.held, 'alvo boca r=', Math.round(c.mouth.r), 'em', Math.round(c.mouth.x) + ',' + Math.round(c.mouth.y));
  await page.waitForTimeout(1100);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 420 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });

  await page.goto('http://127.0.0.1:8742/index.html?notitle', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!window.__nubi && window.__nubi.items.length >= 4, null, { timeout: 5000 });
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!window.__nubi && window.__nubi.items.length >= 4);
  await page.waitForTimeout(200);

  const n = await page.evaluate(() => window.__nubi.items.length);
  console.log('quantidade de alimentos:', n);

  for (let i = 0; i < 4; i++) {
    await dragToMouth(page, i);
    const snap = await page.evaluate(() => ({
      d: Object.keys(window.__nubi.save.state.discoveries).sort(),
      busy: window.__nubi.bus ? undefined : undefined,
      state: window.__nubi.nubi.state
    }));
    console.log('apos alimento', i, '-> descobertas:', snap.d, '| estado:', snap.state);
  }

  const res = await page.evaluate(() => ({
    discoveries: Object.keys(window.__nubi.save.state.discoveries).sort(),
    tint: window.__nubi.nubi.tint,
    state: window.__nubi.nubi.state
  }));
  console.log('descobertas:', res.discoveries);
  console.log('tint final:', res.tint, '| estado:', res.state);

  await page.screenshot({ path: 'C:/Users/joaos/.kiro/crew/workspace/nubi-casa-magica/preview-etapa2.png' });
  await browser.close();

  const expected = ['nubi_assobio', 'nubi_azul', 'nubi_coracoes', 'nubi_lua'];
  const ok = n === 4 && JSON.stringify(res.discoveries) === JSON.stringify(expected) && errors.length === 0;
  console.log('erros:', errors.length ? errors : 'nenhum');
  console.log('RESULTADO:', ok ? 'PASS' : 'FAIL');
  process.exit(ok ? 0 : 1);
})();
