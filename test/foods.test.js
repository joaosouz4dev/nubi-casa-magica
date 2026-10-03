// Captura a galeria de comidas (revisão visual das formas) e falha se algum
// formato não tiver pintor próprio.
const { chromium } = require('playwright');
const OUT = process.env.NUBI_PREVIEW_DIR || 'C:/Users/joaos/.kiro/crew/workspace/nubi-casa-magica/previews';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1500, height: 640 } });
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto('http://127.0.0.1:8742/test/food_gallery.html');
  await p.waitForFunction(() => window.__done);
  const missing = await p.evaluate(async () => {
    const { FOODS } = await import('/src/data/foods.js');
    const { FOOD_SHAPES } = await import('/src/entities/food_art.js');
    return Object.values(FOODS).filter((f) => !FOOD_SHAPES.includes(f.shape)).map((f) => f.id);
  });
  await p.locator('#c').screenshot({ path: OUT + '/c01-galeria-comidas.png' });
  console.log(missing.length ? 'FAIL sem pintor: ' + missing.join(',') : 'ok   allShapesPainted');
  console.log('erros: ' + (errors.join(' | ') || 'nenhum'));
  console.log('RESULTADO: ' + (!missing.length && !errors.length ? 'PASS' : 'FAIL'));
  await b.close();
  process.exit(!missing.length && !errors.length ? 0 : 1);
})();
