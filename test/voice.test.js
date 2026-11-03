// Voz (ação 2): o bichinho fala os balões, o pedido quando o balão aparece,
// o nome do cômodo e "Vamos para..." quando o pedido é em outro cômodo.
// Tocar no balão repete; canal de falas desligado = silêncio; minijogo não
// fala pedidos. Confere pelo registro da voz (o headless não tem alto-falante).
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
  const said = () => ev(() => window.__nubi.voice.log.map(l => l.text));
  const saidSoon = async (text, ms = 7000) => { for (let t = 0; t < ms; t += 250) { if ((await said()).includes(text)) return true; await wait(250); } return false; };

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await ev(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__nubi && window.__nubi.room);
  R.voiceReady = await ev(() => !!window.__nubi.voice && ['web', 'native', 'none'].includes(window.__nubi.voice.backend));

  // acorda: o balão "Oi!" é falado; depois o pedido da recepção (carinho)
  await page.mouse.click(480, 200);
  R.saysBubble = await saidSoon('Oi!');
  R.saysWish = await saidSoon('Faz carinho em mim?');

  // entrar num cômodo fala o nome dele
  await ev(() => window.__nubi.go('bathroom'));
  R.saysRoom = await saidSoon('Banheiro');

  // pedido em outro cômodo: chama para ir até lá
  await ev(() => { window.__nubi.guide.wish = { act: 'look', icon: 'looks', room: 'bedroom' }; });
  R.saysGoTo = await saidSoon('Vamos para o quarto?');

  // tocar no balão repete o pedido
  await wait(2700);
  const before = (await said()).filter(t => t === 'Vamos para o quarto?').length;
  const b = await ev(() => window.__nubi.guide.bubblePos());
  await page.mouse.click(b.x, b.y); await wait(400);
  R.tapRepeats = (await said()).filter(t => t === 'Vamos para o quarto?').length > before;

  // minijogo: pedidos ficam em silêncio
  await ev(() => window.__nubi.go('games')); await wait(900);
  await ev(() => window.__nubi.games.start('catch')); await wait(400);
  const n0 = (await said()).length;
  await ev(() => { window.__nubi.guide.wish = { act: 'foam', icon: 'sponge', room: 'bathroom' }; });
  await wait(1500);
  R.quietInGame = !(await said()).slice(n0).includes('Vamos para o banheiro?');

  // canal de falas desligado: nada é falado
  const n1 = (await said()).length;
  await ev(() => { window.__nubi.voice.audio.enabled.voice = false; window.__nubi.nubi.say('Teste mudo'); });
  await wait(300);
  R.mutedSilent = (await said()).length === n1;

  await browser.close();
  for (const [k, v] of Object.entries(R)) console.log((v ? 'ok  ' : 'FAIL') + ' ' + k);
  console.log('erros:', errors.length ? errors : 'nenhum');
  const ok = errors.length === 0 && Object.values(R).every(Boolean);
  console.log('RESULTADO:', ok ? 'PASS' : 'FAIL');
  process.exit(ok ? 0 : 1);
})();
