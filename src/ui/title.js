/* Tela inicial (Play). O app abre direto nela: céu animado, logo "Casa do
   Nubi" com letras que pulam, o Nubi quicando no ninho de nuvem e um botão
   Play grande que pulsa. O toque no Play é também o gesto que libera o
   áudio (exigência dos navegadores) e, no navegador de celular, pede tela
   cheia + trava em paisagem. No APK a orientação já vem travada pelo Android.
   Testes podem pular a tela com ?notitle na URL. */
export function showTitle({ audio, onStart }) {
  const stage = document.getElementById("stage") || document.body;
  if (/[?&]notitle\b/.test(location.search)) { onStart && onStart(); return null; }

  const el = document.createElement("div");
  el.id = "title";
  const letters = (txt, cls) => [...txt].map((c, i) =>
    c === " " ? `<span class="sp"> </span>` : `<span class="${cls}" style="animation-delay:${(0.08 * i).toFixed(2)}s">${c}</span>`).join("");
  el.innerHTML = `
    <div class="tCloud c1"></div><div class="tCloud c2"></div><div class="tCloud c3"></div>
    <span class="tw t1">★</span><span class="tw t2">★</span><span class="tw t3">✦</span><span class="tw t4">★</span><span class="tw t5">✦</span>
    <div class="tLeft">
      <h1 class="logo" aria-label="Casa do Nubi">
        <span class="l1">${letters("Casa do", "lt")}</span>
        <span class="l2">${letters("Nubi", "lt big")}</span>
      </h1>
      <button id="btnPlay" class="toy" aria-label="Jogar">
        <span class="ring"></span><span class="ring r2"></span>
        <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M17 11 L38 24 L17 37 Z" fill="#fff" stroke="#3a2f4f" stroke-width="3.5" stroke-linejoin="round"/></svg>
      </button>
    </div>
    <div class="tRight"><div class="tShadow"></div><img class="tNubi" src="assets/nubi.svg" alt="" draggable="false"/></div>`;
  stage.appendChild(el);

  let started = false;
  const start = (e) => {
    if (started) return;
    started = true;
    if (e && e.cancelable) e.preventDefault();
    try { audio.init(); audio.resume(); audio.fanfare(); } catch (err) { /* sem áudio */ }
    lockLandscape();
    el.classList.add("go");
    const reduce = document.body.classList.contains("reduce-motion");
    setTimeout(() => {
      el.classList.add("out");
      onStart && onStart();
      setTimeout(() => el.remove(), reduce ? 60 : 520);
    }, reduce ? 80 : 620);
  };
  el.querySelector("#btnPlay").addEventListener("click", start);
  // tocar no Nubi também faz ele pular (convite a tocar no Play)
  el.querySelector(".tRight").addEventListener("pointerdown", () => {
    const n = el.querySelector(".tNubi");
    n.classList.remove("boing"); void n.offsetWidth; n.classList.add("boing");
    try { audio.init(); audio.resume(); audio.bounce(); } catch (err) { /* sem áudio */ }
  });
  return el;
}

// navegador de celular: tela cheia + paisagem (falha em silêncio onde não há
// suporte, ex.: iOS; aí o palco girado por CSS do Viewport resolve)
function lockLandscape() {
  if (window.Capacitor) return;                       // APK: o Android já trava
  if (!matchMedia("(pointer: coarse)").matches) return; // computador: nada a fazer
  const de = document.documentElement;
  const req = de.requestFullscreen || de.webkitRequestFullscreen;
  if (!req) return;
  Promise.resolve(req.call(de)).then(() => {
    if (screen.orientation && screen.orientation.lock) return screen.orientation.lock("landscape");
  }).catch(() => {});
}
