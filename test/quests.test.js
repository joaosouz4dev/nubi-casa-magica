// Teste do fluxo de pedidos/capítulos/ajuda: recepção (acordar, carinho, cócegas),
// capítulos cozinha/banho/desfile/bola com interações reais, pedido seguindo o
// cômodo, botão do cômodo pulsando, ajuda por inatividade, varal, álbum vivo e
// festa final. A festa final dispara os 3 "act" pelo bus (lógica de pedidos);
// as interações que os geram já são cobertas pelo mvp.test.js.
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
  const R = {};
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const wish = () => ev(() => { const c = window.__nubi.quests.current(); return c ? c.act : null; });
  const done = (id) => ev((i) => window.__nubi.quests.isDone(i), id);
  const wait = (ms) => page.waitForTimeout(ms);
  const drag = async (from, to) => {
    await page.mouse.move(from.x, from.y); await page.mouse.down();
    for (let s = 1; s <= 12; s++) { await page.mouse.move(from.x + (to.x - from.x) * s / 12, from.y + (to.y - from.y) * s / 12); await wait(16); }
    await page.mouse.up();
  };
  const nubiPt = (dy) => ev((k) => { const n = window.__nubi.nubi; return { x: n.px(), y: n.py() + n.radius() * k }; }, dy);

  await page.goto('http://127.0.0.1:8742/index.html', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!window.__nubi && window.__nubi.room);
  await ev(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!window.__nubi && window.__nubi.room);
  await wait(1800);
  await shot('q01-dormindo');

  // ---- recepção ----
  R.sleepsAtStart = await ev(() => window.__nubi.nubi.sleeping) && (await wish()) === 'wake';
  await page.mouse.click(380, 120);           // qualquer toque acorda
  await wait(900);
  R.wokeUp = !(await ev(() => window.__nubi.nubi.sleeping)) && (await wish()) === 'pet';
  await wait(600);
  await shot('q02-pedido-carinho');
  // ajuda por inatividade: pula direto para a fase da mãozinha
  await ev(() => { window.__nubi.guide.idle = 30000; });
  await wait(1400);
  R.inactivityDemo = await ev(() => !!window.__nubi.guide.demo && window.__nubi.guide.phase === 3);
  await shot('q03-ajuda-inatividade');
  let p = await nubiPt(-0.5); await page.mouse.click(p.x, p.y); await wait(500);
  p = await nubiPt(0.5); await page.mouse.click(p.x, p.y); await wait(500);
  R.recepcao = await done('recepcao');
  R.stickerFlight = await ev(() => window.__nubi.guide.flights.length > 0);
  await shot('q04-fim-capitulo');
  await wait(1800);

  // ---- cozinha (modo Explorar): azul, morango, banana ----
  R.kitchenWish = (await wish()) === 'feed:blueberry';
  for (const id of ['blueberry', 'strawberry', 'banana']) {
    const c = await ev((fid) => { const n = window.__nubi; const it = n.kitchen.items.find(i => i.def.id === fid); const m = n.kitchen.mouthPoint(); return { from: { x: it.pos.x, y: it.pos.y }, to: { x: m.x, y: m.y } }; }, id);
    await drag(c.from, c.to); await wait(1300);
  }
  R.cozinha = await done('cozinha');
  await wait(1500);

  // ---- o pedido segue a criança: no quarto vira o desfile, no banheiro o banho ----
  await ev(() => window.__nubi.go('bedroom')); await wait(800);
  R.followsRoomBedroom = (await wish()) === 'equip:hat';
  await ev(() => window.__nubi.go('bathroom')); await wait(800);
  R.followsRoom = (await wish()) === 'foam';
  const tool = (id) => ev((tid) => { const b = window.__nubi.bathroom; return b.toolPos(b.tools.find(t => t.id === tid)); }, id);
  let t = await tool('sponge'); await page.mouse.click(t.x, t.y); await wait(200);
  p = await nubiPt(0); await page.mouse.click(p.x, p.y); await wait(900);
  t = await tool('duck'); await page.mouse.click(t.x, t.y); await wait(900);
  t = await tool('towel'); await page.mouse.click(t.x, t.y); await wait(200);
  p = await nubiPt(0); await page.mouse.click(p.x, p.y); await wait(900);
  R.banho = await done('banho');
  await wait(1200);
  // agora o pedido é no quarto: o botão do quarto pulsa
  R.navPulse = await ev(() => document.querySelector('[data-room="bedroom"]').classList.contains('wish'));
  await shot('q05-pedido-outro-comodo');

  // ---- quarto: desfile (chapéu, capa, botas) ----
  await ev(() => window.__nubi.go('bedroom')); await wait(800);
  R.desfileWish = (await wish()) === 'equip:hat';
  for (let i = 0; i < 3; i++) {
    const a = await ev((k) => { const n = window.__nubi; const w = n.bedroom.wardrobe[k]; return { from: n.bedroom.wardrobePos(w), to: { x: n.nubi.px(), y: n.nubi.py() } }; }, i);
    await drag(a.from, a.to); await wait(700);
  }
  R.desfile = await done('desfile');
  await wait(1500);

  // ---- bola: quicar, cesto, carinho ----
  const ball = await ev(() => { const b = window.__nubi.bedroom; b._ballPx(); return { x: b.ball.px, y: b.ball.py }; });
  await page.mouse.click(ball.x, ball.y); await wait(700);
  await ev(() => { const b = window.__nubi.bedroom; const k = b.basketPos(); b.ball.px = k.x; b.ball.py = k.y + k.r * 0.5; b.ball.vx = 0; b.ball.vy = 0; });
  await wait(700);
  p = await nubiPt(-0.5); await page.mouse.click(p.x, p.y); await wait(700);
  R.bola = await done('bola');
  R.finaleWish = (await ev(() => window.__nubi.quests.current().chapter && window.__nubi.quests.current().chapter.id)) === 'festa';
  await wait(1400);
  await shot('q06-varal');

  // ---- festa final ----
  for (const a of ['foam:tinted', 'equip:hat:fluffy', 'basket:cape']) { await ev((x) => window.__nubi.bus.emit('act', x), a); await wait(250); }
  // depois da festa, o mundo continua: começa a temporada 2 (novos amigos)
  R.finale = await ev(() => { const q = window.__nubi.quests; const c = q.current(); return q.state.finaleDone && !!c.chapter && c.chapter.id === 'amigos'; });
  await wait(900);
  await shot('q07-festa');
  await wait(2600);

  // ---- álbum vivo ----
  await page.click('#btnAlbum'); await wait(700);
  R.albumStickers = (await page.$$('#albumStickers .sticker')).length === 6;
  await shot('q08-album');
  if (!R.albumStickers) { console.log('parcial:', JSON.stringify(R), 'pedido:', await wish(), errors); }
  await page.click('#albumStickers .sticker', { timeout: 4000 }); await wait(700);
  R.albumReplay = await ev(() => !document.getElementById('album').classList.contains('show') && window.__nubi.nubi.danceT > 0);

  // ---- progresso persiste e modo muda a paciência ----
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!window.__nubi && window.__nubi.room);
  R.persisted = await ev(() => window.__nubi.quests.state.finaleDone && !window.__nubi.nubi.sleeping);
  await ev(() => window.__nubi.bus.emit('mode:changed', 'solve'));
  R.modePatience = await ev(() => window.__nubi.guide.patience > 1.5);

  await browser.close();
  for (const [k, v] of Object.entries(R)) console.log((v ? 'ok  ' : 'FAIL') + ' ' + k);
  console.log('erros:', errors.length ? errors : 'nenhum');
  const ok = errors.length === 0 && Object.values(R).every(Boolean);
  console.log('RESULTADO:', ok ? 'PASS' : 'FAIL');
  process.exit(ok ? 0 : 1);
})();
