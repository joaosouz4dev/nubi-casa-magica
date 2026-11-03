// Pote de estrelinhas e presente no cômodo (ação 5): estrelinhas enchem o
// pote; cheio, um presente aparece ao lado do bichinho e 3 toques abrem (o
// prêmio é ganho). Sem números na tela da criança (pote, lojinha, missões).
// Presente sem abrir volta depois de recarregar; no minijogo não aparece;
// depois do último prêmio, a cada JAR_BONUS estrelinhas vem um presente-festa.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const OUT = process.env.NUBI_PREVIEW_DIR || 'C:/Users/joaos/.kiro/crew/workspace/nubi-casa-magica/previews';
fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://127.0.0.1:8742/index.html?notitle';

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const R = {};
  const page = await browser.newPage({ viewport: { width: 800, height: 360 } });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const wait = (ms) => page.waitForTimeout(ms);
  const gift = () => ev(() => !!document.getElementById('prizeGift') && !document.getElementById('prizeGift').classList.contains('open'));
  const giftSoon = async (ms = 4000) => { for (let t = 0; t < ms; t += 200) { if (await gift()) return true; await wait(200); } return false; };
  const openGift = async () => { for (let i = 0; i < 3; i++) { await page.click('#prizeGift', { force: true }); await wait(250); } await wait(900); };
  const add = (n) => ev((k) => window.__nubi.progress.add(k, 'test'), n);

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await ev(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__nubi && window.__nubi.room);
  await page.mouse.click(540, 160); await wait(600);
  await ev(() => window.__nubi.go('bathroom')); await wait(1000);

  // sem números para a criança: pote, desenho do próximo presente e coração
  R.noNumbers = await ev(() => !/\d/.test(document.getElementById('starPill').textContent) && !!document.getElementById('jar'));

  // enche o pote até o primeiro prêmio: o presente aparece perto do bichinho
  const t0 = await ev(() => window.__nubi.progress.total);
  if (t0 < 4) await add(4 - t0);
  await wait(1200);
  R.jarFills = await ev(() => parseInt(document.getElementById('jarFill').style.height, 10) >= 60);
  R.noGiftYet = !(await gift());
  await add(2);
  R.giftAppears = await giftSoon();
  R.giftNearNubi = await ev(() => { const b = document.getElementById('prizeGift'), n = window.__nubi.nubi; const cx = b.offsetLeft + b.offsetWidth / 2; return Math.abs(cx - n.px()) < n.radius() * 3; });
  await page.screenshot({ path: path.join(OUT, 'p02-presente-no-comodo.png') });

  // 2 toques só balançam; o 3º abre e o prêmio é ganho
  for (let i = 0; i < 2; i++) { await page.click('#prizeGift', { force: true }); await wait(250); }
  R.twoTapsNotOpen = (await gift()) && !(await ev(() => window.__nubi.progress.owned('food:starcookie')));
  await page.click('#prizeGift', { force: true }); await wait(900);
  R.thirdTapOpens = await ev(() => window.__nubi.progress.owned('food:starcookie')) && !(await gift());

  // lojinha (coleção): sem preços, o próximo com a barrinha do pote
  await ev(() => window.__nubi.progressUI.openShop()); await wait(500);
  R.shopNoNumbers = await ev(() => !/\d/.test(document.getElementById('shopGrid').textContent) && document.querySelectorAll('#shopGrid .prize.next .prizeBar').length === 1);
  await page.click('#shopClose'); await wait(300);

  // dois prêmios de uma vez: um presente por vez
  await add(15);
  R.firstOfTwo = await giftSoon();
  await openGift();
  R.secondOfTwo = await giftSoon();

  // presente sem abrir continua esperando depois de recarregar
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__nubi && window.__nubi.room);
  R.giftPersists = await giftSoon();

  // no minijogo o presente some; volta depois
  await ev(() => window.__nubi.go('games')); await wait(900);
  await ev(() => window.__nubi.games.start('catch')); await wait(400);
  R.hiddenInGame = await ev(() => { const b = document.getElementById('prizeGift'); return !b || getComputedStyle(b).display === 'none'; });
  await ev(() => window.__nubi.games.goBack()); await wait(400);
  R.backAfterGame = await ev(() => { const b = document.getElementById('prizeGift'); return !!b && getComputedStyle(b).display !== 'none'; });

  // depois do último prêmio: presente-festa a cada JAR_BONUS
  await add(200);
  await ev(() => { const p = window.__nubi.progress; for (const x of ['food:starcookie', 'decor:flags', 'food:icecream', 'wear:goldcrown', 'decor:flowers', 'food:donut', 'wear:rainbowcape', 'decor:balloons', 'food:rainbowcake', 'wear:wings', 'decor:rainbow', 'wear:unicorn']) p.claim(x); });
  const bonus = await ev(() => window.__nubi.progress.bonusPending());
  const gift2 = await ev(() => window.__nubi.progress.nextGift());
  R.bonusAfterAll = bonus >= 1 && gift2 && gift2.kind === 'bonus';
  await wait(1600);
  if (await gift()) await openGift();
  R.bonusOpens = (await ev(() => window.__nubi.progress.bonusPending())) === bonus - 1;

  // festa no meio da mastigação (presente, troféu...) não pode travar a cozinha
  await ev(() => window.__nubi.go('kitchen')); await wait(900);
  await ev(() => { const k = window.__nubi.kitchen; k.feed(k.items[0]); setTimeout(() => window.__nubi.nubi.celebrate(), 300); });
  await wait(2200);
  R.chewNotStuck = await ev(() => !window.__nubi.kitchen.busy);

  await browser.close();
  for (const [k, v] of Object.entries(R)) console.log((v ? 'ok  ' : 'FAIL') + ' ' + k);
  console.log('erros:', errors.length ? errors : 'nenhum');
  const ok = errors.length === 0 && Object.values(R).every(Boolean);
  console.log('RESULTADO:', ok ? 'PASS' : 'FAIL');
  process.exit(ok ? 0 : 1);
})();
