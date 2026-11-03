/* Tela cheia no navegador do celular. O Play já pede; se a criança sair dela
   (gesto de voltar, trocar de app, puxar a barra), o próximo toque pede de
   novo. Os navegadores só aceitam o pedido dentro de um gesto (soltar o dedo
   conta; encostar não), por isso escuta pointerup/touchend.
   Falha em silêncio onde não há suporte (iPhone: lá o jogo adicionado à tela
   de início já abre sem barras, pelo manifest). No APK quem cuida é o
   Android (android-src/MainActivity.java). */
const coarse = () => matchMedia("(pointer: coarse)").matches;
const installed = () => matchMedia("(display-mode: fullscreen), (display-mode: standalone)").matches;
const isFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

export function wantsFullscreen() {
  return !window.Capacitor && coarse() && !installed() && !isFull();
}

// pede tela cheia + paisagem travada (deve ser chamado dentro de um gesto)
export function enterFullscreen() {
  if (!wantsFullscreen()) return;
  const de = document.documentElement;
  const req = de.requestFullscreen || de.webkitRequestFullscreen;
  if (!req) return;
  Promise.resolve(req.call(de, { navigationUI: "hide" })).then(() => {
    if (screen.orientation && screen.orientation.lock) return screen.orientation.lock("landscape");
  }).catch(() => {});
}

// a partir daqui, todo toque que termina fora da tela cheia pede de novo
export function keepFullscreen() {
  let last = 0;
  const again = () => {
    const now = performance.now();
    if (now - last < 1000) return;      // pointerup + touchend do mesmo toque
    last = now;
    enterFullscreen();
  };
  window.addEventListener("pointerup", again, true);
  window.addEventListener("touchend", again, true);
}
