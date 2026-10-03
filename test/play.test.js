// Teste de runtime da Etapa 1: carrega o jogo (paisagem), arrasta a fruta
// azul ate a boca do Nubi e confirma a consequencia magica (cor + descoberta).
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  // viewport paisagem (orientacao horizontal)
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });

  await page.goto('http://127.0.0.1:8742/index.html?notitle', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!window.__nubi, null, { timeout: 5000 });
  await page.waitForTimeout(300);

  // estado inicial: sem tint
  const tint0 = await page.evaluate(() => window.__nubi.nubi.tint);
  console.log('tint inicial:', tint0);

  // pega posicoes em pixels: item (prato) e boca do Nubi
  const coords = await page.evaluate(() => {
    const n = window.__nubi;
    const it = n.items[0];
    const r = n.nubi.radius();
    return {
      item: { x: it.pos.x, y: it.pos.y },
      mouth: { x: n.nubi.px() + 0 * r, y: n.nubi.py() + 0.18 * r }
    };
  });
  console.log('item:', coords.item, 'boca:', coords.mouth);

  // ---- ESQUEMA A: arraste do item ate a boca ----
  await page.mouse.move(coords.item.x, coords.item.y);
  await page.mouse.down();
  // move em passos para gerar "moved"
  const steps = 18;
  for (let i = 1; i <= steps; i++) {
    const x = coords.item.x + (coords.mouth.x - coords.item.x) * (i / steps);
    const y = coords.item.y + (coords.mouth.y - coords.item.y) * (i / steps);
    await page.mouse.move(x, y);
    await page.waitForTimeout(15);
  }
  await page.mouse.up();

  // aguarda mastigacao (3x220ms) + aplicacao do efeito
  await page.waitForTimeout(1200);

  const after = await page.evaluate(() => ({
    tint: window.__nubi.nubi.tint,
    discovery: !!window.__nubi.save.state.discoveries['nubi_azul'],
    state: window.__nubi.nubi.state
  }));
  console.log('apos arraste -> tint:', after.tint, '| descoberta nubi_azul:', after.discovery, '| estado:', after.state);

  await page.screenshot({ path: 'C:/Users/joaos/.kiro/crew/workspace/nubi-casa-magica/preview-etapa1.png' });

  // repeticao: oferecer de novo nao pode travar (item volta para casa)
  const itemBack = await page.evaluate(() => {
    const it = window.__nubi.items[0];
    const homeX = window.__nubi.vp.dx(it.home.x), homeY = window.__nubi.vp.dy(it.home.y);
    return Math.hypot(it.pos.x - homeX, it.pos.y - homeY) < 40;
  });
  console.log('item voltou para o prato (repetivel):', itemBack);

  await browser.close();

  const ok = tint0 === null && after.tint === '#5b8def' && after.discovery && itemBack && errors.length === 0;
  console.log('erros de pagina:', errors.length ? errors : 'nenhum');
  console.log('RESULTADO:', ok ? 'PASS' : 'FAIL');
  process.exit(ok ? 0 : 1);
})();
