// Teste visual: captura cada cômodo, quadros no meio das animações e mede FPS.
// Saída em ./previews/ (não faz parte do jogo distribuído).
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = process.env.NUBI_PREVIEW_DIR || 'C:/Users/joaos/.kiro/crew/workspace/nubi-casa-magica/previews';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 440 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  const shot = (name) => page.screenshot({ path: path.join(OUT, name + '.png') });

  await page.goto('http://127.0.0.1:8742/index.html?notitle', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!window.__nubi && window.__nubi.room);
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!window.__nubi && window.__nubi.room);
  await page.waitForTimeout(1600);   // deixa a mãozinha de demonstração no meio do gesto
  await shot('01-cozinha');

  // FPS médio em 2s
  const fps = await page.evaluate(() => new Promise((res) => {
    let n = 0; const t0 = performance.now();
    const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(n / ((performance.now() - t0) / 1000)); };
    requestAnimationFrame(f);
  }));

  // alimentar: quadro no meio da mastigação e logo após a transformação
  const c = await page.evaluate(() => {
    const n = window.__nubi; const it = n.kitchen.items[0]; const r = n.nubi.radius();
    return { from: { x: it.pos.x, y: it.pos.y }, to: { x: n.nubi.px(), y: n.nubi.py() + 0.18 * r } };
  });
  await page.mouse.move(c.from.x, c.from.y); await page.mouse.down();
  for (let i = 1; i <= 10; i++) { await page.mouse.move(c.from.x + (c.to.x - c.from.x) * i / 10, c.from.y + (c.to.y - c.from.y) * i / 10 - Math.sin(i / 10 * Math.PI) * 40); await page.waitForTimeout(16); }
  await shot('02-arrastando');
  await page.mouse.up();
  await page.waitForTimeout(380); await shot('03-mastigando');
  await page.waitForTimeout(420); await shot('04-transformacao');
  await page.waitForTimeout(900);

  // transição de cômodo no meio
  await page.evaluate(() => window.__nubi.go('bathroom'));
  await page.waitForTimeout(200); await shot('05-transicao');
  await page.waitForTimeout(700);
  // espuma
  const b = await page.evaluate(() => { const n = window.__nubi; const t = n.bathroom.tools.find(x => x.id === 'sponge'); return { from: n.bathroom.toolPos(t), nubi: { x: n.nubi.px(), y: n.nubi.py() } }; });
  await page.mouse.move(b.from.x, b.from.y); await page.mouse.down();
  for (let i = 0; i < 10; i++) { await page.mouse.move(b.nubi.x - 30, b.nubi.y - 10); await page.waitForTimeout(25); await page.mouse.move(b.nubi.x + 30, b.nubi.y + 10); await page.waitForTimeout(25); }
  await shot('06-banho-espuma');
  await page.mouse.up();
  await page.waitForTimeout(500); await shot('07-banheiro');

  // quarto: vestir tudo e capturar
  await page.evaluate(() => window.__nubi.go('bedroom'));
  await page.waitForTimeout(700);
  for (let i = 0; i < 3; i++) {
    const a = await page.evaluate((k) => { const n = window.__nubi; const w = n.bedroom.wardrobe[k]; return { from: n.bedroom.wardrobePos(w), to: { x: n.nubi.px(), y: n.nubi.py() } }; }, i);
    await page.mouse.move(a.from.x, a.from.y); await page.mouse.down();
    for (let s = 1; s <= 10; s++) { await page.mouse.move(a.from.x + (a.to.x - a.from.x) * s / 10, a.from.y + (a.to.y - a.from.y) * s / 10); await page.waitForTimeout(16); }
    await page.mouse.up(); await page.waitForTimeout(250);
  }
  await page.waitForTimeout(900);
  await shot('08-quarto-vestido');

  await browser.close();
  console.log('fps medio:', fps.toFixed(1));
  console.log('erros:', errors.length ? errors : 'nenhum');
  const ok = errors.length === 0 && fps > 30;
  console.log('RESULTADO:', ok ? 'PASS' : 'FAIL');
  process.exit(ok ? 0 : 1);
})();
