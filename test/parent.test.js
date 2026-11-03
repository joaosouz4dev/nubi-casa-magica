// Área dos responsáveis (ação 3): segurar o botão por 3s (menos que isso não
// abre) e depois arrastar a bolinha até o número escrito por extenso. Errar
// fecha; 3 erros seguidos travam por um tempo; acertar abre a área.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const OUT = process.env.NUBI_PREVIEW_DIR || 'C:/Users/joaos/.kiro/crew/workspace/nubi-casa-magica/previews';
fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://127.0.0.1:8742/index.html?notitle';
const WORDS = { um: 1, dois: 2, 'três': 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9 };

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const R = {};
  const page = await browser.newPage({ viewport: { width: 960, height: 440 } });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const wait = (ms) => page.waitForTimeout(ms);
  const shown = (id) => ev((i) => document.getElementById(i).classList.contains('show'), id);
  const center = async (sel) => { const b = await page.locator(sel).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const hold = async (ms) => {
    if (!(await shown('bag'))) { await page.click('#btnBag', { force: true }); await wait(500); }
    const c = await center('#btnParent');
    await page.mouse.move(c.x, c.y); await page.mouse.down(); await wait(ms); await page.mouse.up(); await wait(300);
  };
  const answer = async () => WORDS[await ev(() => document.querySelector('#gateAsk b').textContent)];
  const dragTo = async (n) => {
    const from = await center('#gateBall'), to = await center(`.gateSpot[data-n="${n}"]`);
    await page.mouse.move(from.x, from.y); await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 8 }); await page.mouse.up(); await wait(500);
  };
  const wrong = async () => { const a = await answer(); const n = await ev((x) => [...document.querySelectorAll('.gateSpot')].map(s => +s.dataset.n).find(v => v !== x), a); await dragTo(n); };

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await ev(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__nubi && window.__nubi.room);
  await page.mouse.click(480, 200); await wait(800);

  // segurar pouco (o tempo antigo, 1,2s) não abre nada
  await hold(1300);
  R.shortHoldNothing = !(await shown('gate')) && !(await shown('parent'));

  // segurar 3s: aparece o desafio (a mochila fecha), com 6 números e a instrução por extenso
  await hold(3300);
  R.gateAfterHold = (await shown('gate')) && !(await shown('bag'));
  R.sixNumbers = (await page.$$('.gateSpot')).length === 6;
  const a1 = await answer();
  R.wordInstruction = !!a1 && (await ev((x) => [...document.querySelectorAll('.gateSpot')].some(s => +s.dataset.n === x), a1));
  await page.screenshot({ path: path.join(OUT, 'p01-desafio-adulto.png') });

  // errar fecha e não abre a área
  await wrong();
  R.wrongCloses = !(await shown('gate')) && !(await shown('parent'));

  // de novo: arrastar até o número certo abre a área dos responsáveis
  await hold(3300);
  await dragTo(await answer());
  R.rightOpens = (await shown('parent')) && !(await shown('gate'));
  await page.click('#parentClose'); await wait(300);

  // tocar direto no número certo também vale
  await hold(3300);
  await page.click(`.gateSpot[data-n="${await answer()}"]`); await wait(400);
  R.tapRightOpens = await shown('parent');
  await page.click('#parentClose'); await wait(300);

  // 3 erros seguidos: o botão trava por um tempo (segurar não abre o desafio)
  for (let i = 0; i < 3; i++) { await hold(3300); await wrong(); }
  await hold(3300);
  R.lockedAfter3 = !(await shown('gate')) && !(await shown('parent'));

  await browser.close();
  for (const [k, v] of Object.entries(R)) console.log((v ? 'ok  ' : 'FAIL') + ' ' + k);
  console.log('erros:', errors.length ? errors : 'nenhum');
  const ok = errors.length === 0 && Object.values(R).every(Boolean);
  console.log('RESULTADO:', ok ? 'PASS' : 'FAIL');
  process.exit(ok ? 0 : 1);
})();
