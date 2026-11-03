// Ambiente do APK: o WebView do Android injeta um window.Capacitor (ponte
// nativa do Capacitor 6) SEM registerPlugin (que é do @capacitor/core, que o
// jogo não carrega) e sem speechSynthesis. O jogo tem de abrir normalmente,
// sem voz sintetizada (só gravações) e sem pedir tela cheia ao navegador
// (no APK quem cuida é o Android).
// Regressões: Capacitor.registerPlugin travava o boot (tela vazia no
// celular); o HUD aparecia sozinho enquanto o jogo carregava.
const { chromium } = require('playwright');
const URL = 'http://127.0.0.1:8742/index.html';

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const R = {};
  const page = await browser.newPage({ viewport: { width: 800, height: 360 } });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  await page.addInitScript(() => {
    const calls = []; window.__ttsCalls = calls;
    const cap = { Plugins: { TextToSpeech: {} } };
    cap.isNativePlatform = () => true;
    cap.getPlatform = () => 'android';
    cap.isPluginAvailable = (n) => Object.prototype.hasOwnProperty.call(cap.Plugins, n);
    cap.nativePromise = (plugin, method, opts) => { calls.push(plugin + '.' + method + ':' + ((opts && opts.text) || '')); return Promise.resolve(); };
    window.Capacitor = cap;
    try { Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true }); } catch (e) { /* ok */ }
    window.__fsAsked = 0;
    Element.prototype.requestFullscreen = function () { window.__fsAsked++; return Promise.resolve(); };
  });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const wait = (ms) => page.waitForTimeout(ms);

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await ev(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await wait(1200);
  R.boots = await ev(() => !!window.__nubi && !!window.__nubi.room && !document.getElementById('bootError'));
  R.titleShown = await ev(() => !!document.getElementById('title'));
  R.hudReady = await ev(() => document.getElementById('btnBack').classList.contains('off') && !!document.querySelector('#starIco canvas'));
  R.noSynthVoice = await ev(() => window.__nubi && window.__nubi.voice.backend !== 'native');
  R.bootClassGone = await ev(() => !document.body.classList.contains('booting'));

  await page.click('#btnPlay', { force: true }); await wait(1500);
  await page.mouse.click(540, 160); await wait(2000);   // acorda: "Oi!"
  R.noTTSCalls = await ev(() => window.__ttsCalls.length === 0);
  R.noBrowserFullscreen = await ev(() => window.__fsAsked === 0);

  await browser.close();
  for (const [k, v] of Object.entries(R)) console.log((v ? 'ok  ' : 'FAIL') + ' ' + k);
  console.log('erros:', errors.length ? errors : 'nenhum');
  const ok = errors.length === 0 && Object.values(R).every(Boolean);
  console.log('RESULTADO:', ok ? 'PASS' : 'FAIL');
  process.exit(ok ? 0 : 1);
})();
