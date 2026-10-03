/* Gera todos os ícones do jogo a partir de um único desenho SVG.
 *   NODE_PATH=<pasta com node_modules/playwright> node scripts/make-icons.cjs
 * Saídas:
 *   assets/icon.svg, icon-192.png, icon-512.png, icon-maskable-512.png (PWA)
 *   android-res/mipmap-* (ícone do launcher Android, copiado pelo build-apk.sh)
 * Paleta igual à do jogo (src/entities/nubi.js e src/data/pets.js). */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const INK = "#3a2f4f", IRIS = "#4a3b78", BODY = "#f3e6d4", TUFT = "#cdb8f0";

const CLOUD = [[124, 462, 58], [388, 462, 58], [194, 448, 66], [318, 448, 66], [256, 462, 70], [196, 494, 52], [316, 494, 52], [256, 504, 50]]
  .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join("");
const star = (x, y, r, rot = 0) => {
  let d = "";
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2 + rot;
    const rr = i % 2 ? r * 0.48 : r;
    d += (i ? "L" : "M") + (x + Math.cos(a) * rr).toFixed(1) + " " + (y + Math.sin(a) * rr).toFixed(1);
  }
  return `<path d="${d}Z" fill="#ffd36e" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`;
};
const sparkle = (x, y, r) =>
  `<path d="M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r}Z" fill="#fff"/>`;

// bg: "rounded" | "full" | "circle" | "none" | "only"; scale: tamanho do Nubi
function svg({ bg = "rounded", scale = 1 } = {}) {
  const bgShape = {
    rounded: `<rect width="512" height="512" rx="112"/>`,
    full: `<rect width="512" height="512"/>`,
    circle: `<circle cx="256" cy="256" r="256"/>`,
  }[bg];
  const clip = bgShape ? `clip-path="url(#clip)"` : "";
  const content = `
    <g transform="translate(256 262) scale(${scale}) translate(-256 -262)">

      <!-- orelhas -->
      <g stroke="${INK}" stroke-width="10">
        <ellipse cx="150" cy="212" rx="40" ry="50" transform="rotate(-28 150 212)" fill="${BODY}"/>
        <ellipse cx="362" cy="212" rx="40" ry="50" transform="rotate(28 362 212)" fill="${BODY}"/>
      </g>
      <ellipse cx="153" cy="216" rx="20" ry="29" transform="rotate(-28 153 216)" fill="#ffc9d6"/>
      <ellipse cx="359" cy="216" rx="20" ry="29" transform="rotate(28 359 216)" fill="#ffc9d6"/>
      <!-- corpo -->
      <ellipse cx="256" cy="305" rx="128" ry="118" fill="url(#body)" stroke="${INK}" stroke-width="10"/>
      <ellipse cx="256" cy="352" rx="72" ry="50" fill="#fff6ea"/>
      <ellipse cx="205" cy="232" rx="34" ry="18" transform="rotate(-25 205 232)" fill="#fff" opacity=".55"/>
      <!-- tufo -->
      <g fill="${TUFT}" stroke="${INK}" stroke-width="10">
        <circle cx="214" cy="196" r="34"/><circle cx="298" cy="196" r="34"/><circle cx="256" cy="176" r="42"/>
      </g>
      <circle cx="244" cy="163" r="12" fill="#fff" opacity=".6"/>
      <!-- olhos -->
      <ellipse cx="208" cy="290" rx="27" ry="32" fill="${IRIS}"/>
      <ellipse cx="304" cy="290" rx="27" ry="32" fill="${IRIS}"/>
      <circle cx="217" cy="278" r="10" fill="#fff"/><circle cx="313" cy="278" r="10" fill="#fff"/>
      <circle cx="200" cy="302" r="4.5" fill="#fff"/><circle cx="296" cy="302" r="4.5" fill="#fff"/>
      <!-- bochechas e boca -->
      <ellipse cx="164" cy="330" rx="24" ry="14" fill="#ff9fb6" opacity=".75"/>
      <ellipse cx="348" cy="330" rx="24" ry="14" fill="#ff9fb6" opacity=".75"/>
      <path d="M232 326 Q256 362 280 326 Z" fill="#b4566e" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
      <path d="M245 344 Q256 336 268 344 Q256 354 245 344Z" fill="#ff8fa8"/>
      <!-- ninho de nuvem -->
      <!-- contorno único: círculos com traço por baixo, os mesmos sem traço por cima -->
      <g fill="#fffaf3" stroke="${INK}" stroke-width="20">${CLOUD}</g>
      <g fill="#fffaf3">${CLOUD}</g>
      <path d="M150 440 Q170 418 198 424" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round"/>
      <path d="M150 478 Q256 500 362 478" stroke="#e6dcff" stroke-width="10" fill="none" stroke-linecap="round"/>
      <!-- estrelinhas -->
      ${star(104, 118, 34, 0.2)}${star(414, 102, 24, -0.3)}${star(438, 300, 16, 0.1)}
      ${sparkle(380, 176, 14)}${sparkle(80, 260, 11)}
    </g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffe2b0"/><stop offset=".55" stop-color="#f3d9ff"/><stop offset="1" stop-color="#cbb6f5"/>
    </linearGradient>
    <radialGradient id="body" cx=".38" cy=".3" r=".8">
      <stop offset="0" stop-color="#fff5e8"/><stop offset=".6" stop-color="${BODY}"/><stop offset="1" stop-color="#e2cdb2"/>
    </radialGradient>
    ${bgShape ? `<clipPath id="clip">${bgShape}</clipPath>` : ""}
  </defs>
  ${bgShape ? bgShape.replace("/>", ` fill="url(#sky)"/>`) : ""}
  ${bg === "only" ? `<rect width="512" height="512" fill="url(#sky)"/>` : `<g ${clip}>${content}</g>`}
</svg>`;
}

const ANDROID = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const render = async (opts, size, out) => {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg(opts)}`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await page.screenshot({ path: out, omitBackground: true });
    console.log("ok", path.relative(ROOT, out));
  };
  fs.writeFileSync(path.join(ROOT, "assets/icon.svg"), svg({ bg: "rounded" }));
  fs.writeFileSync(path.join(ROOT, "assets/nubi.svg"), svg({ bg: "none", scale: 0.92 }));   // tela inicial
  await render({ bg: "rounded" }, 192, path.join(ROOT, "assets/icon-192.png"));
  await render({ bg: "rounded" }, 512, path.join(ROOT, "assets/icon-512.png"));
  await render({ bg: "full", scale: 0.8 }, 512, path.join(ROOT, "assets/icon-maskable-512.png"));
  for (const [dpi, px] of Object.entries(ANDROID)) {
    const dir = path.join(ROOT, "android-res", "mipmap-" + dpi);
    const fg = Math.round(px * 108 / 48); // camada adaptativa: 108dp, área segura 66dp
    await render({ bg: "rounded", scale: 0.92 }, px, path.join(dir, "ic_launcher.png"));
    await render({ bg: "circle", scale: 0.84 }, px, path.join(dir, "ic_launcher_round.png"));
    await render({ bg: "none", scale: 0.6 }, fg, path.join(dir, "ic_launcher_foreground.png"));
    await render({ bg: "only" }, fg, path.join(dir, "ic_launcher_background.png"));
  }
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;
  const any = path.join(ROOT, "android-res", "mipmap-anydpi-v26");
  fs.mkdirSync(any, { recursive: true });
  fs.writeFileSync(path.join(any, "ic_launcher.xml"), xml);
  fs.writeFileSync(path.join(any, "ic_launcher_round.xml"), xml);
  await browser.close();
})();
