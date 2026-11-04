"""Gera os ícones do app (PWA e Android) com a Nubi em feltro.

    python scripts/make-icons.py

Monta: fundo pastel (pêssego para lilás) com fibrinhas de feltro, a nuvem
de dormir em feltro embaixo, a Nubi acenando sentada nela e duas estrelinhas
em feltro. Grava:
- assets/icon-192.png, assets/icon-512.png (cantos arredondados) e
  assets/icon-maskable-512.png (quadrado cheio, conteúdo na área segura);
- android-res/mipmap-*/ic_launcher*.png: ícone adaptativo (fundo + frente
  separados, frente dentro dos 66% centrais) e os ícones antigos (quadrado
  arredondado e redondo) em cada densidade.
Precisa de Pillow e numpy.
"""
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = lambda *p: os.path.join(ROOT, "assets", *p)
TOP, BOTTOM = (255, 226, 190), (214, 190, 245)      # pêssego -> lilás
DENS = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}


def background(n):
    t = np.linspace(0, 1, n)[:, None, None]
    g = (np.array(TOP) * (1 - t) + np.array(BOTTOM) * t) * np.ones((n, n, 3))
    # luz macia no alto à esquerda
    yy, xx = np.mgrid[0:n, 0:n] / n
    glow = np.clip(1 - np.hypot(xx - 0.3, yy - 0.25) / 0.75, 0, 1)[..., None]
    g = g + (255 - g) * glow * 0.35
    # fibrinhas de feltro
    rng = np.random.default_rng(7)
    noise = Image.fromarray((rng.random((n // 2, n // 2)) * 255).astype(np.uint8)).resize((n, n), Image.BILINEAR)
    g = g + (np.asarray(noise)[..., None] / 255 - 0.5) * 10
    return Image.fromarray(np.clip(g, 0, 255).astype(np.uint8), "RGB").convert("RGBA")


def fit(im, w):
    return im.resize((round(w), round(w * im.height / im.width)), Image.LANCZOS)


def foreground(n, scale=1.0):
    """Nubi + nuvem + estrelas num quadro transparente n x n (scale = quanto
    do quadro o conjunto ocupa)."""
    fg = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    k = n * scale
    cloud = fit(Image.open(A("nubi", "nubi_ninho.webp")).convert("RGBA"), k * 0.92)
    nubi = Image.open(A("nubi", "nubi_acenando.webp")).convert("RGBA")
    nubi = nubi.crop(nubi.getchannel("A").getbbox())
    nubi = fit(nubi, k * 0.84)
    star = Image.open(A("hud", "hud_estrela.webp")).convert("RGBA")
    cx, top = n / 2, (n - k) / 2
    cy_cloud = top + k * 0.84
    # sombra macia da Nubi na nuvem
    sh = Image.new("L", (n, n), 0)
    ImageDraw.Draw(sh).ellipse((cx - k * 0.26, cy_cloud - k * 0.10, cx + k * 0.26, cy_cloud + k * 0.02), fill=90)
    fg.paste((120, 80, 140, 255), (0, 0), sh.filter(ImageFilter.GaussianBlur(k * 0.03)))
    fg.alpha_composite(nubi, (round(cx - nubi.width / 2 + k * 0.02), round(cy_cloud - nubi.height + k * 0.03)))
    fg.alpha_composite(cloud, (round(cx - cloud.width / 2), round(cy_cloud - cloud.height * 0.42)))
    for sx, sy, sw in ((0.12, 0.10, 0.17), (0.80, 0.16, 0.13)):
        s = fit(star, k * sw)
        fg.alpha_composite(s, (round(top + k * sx), round(top + k * sy)))
    return fg


def rounded(im, rad):
    m = Image.new("L", im.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, im.width - 1, im.height - 1), rad, fill=255)
    out = im.copy()
    out.putalpha(m)
    return out


def full(n, scale):
    bg = background(n)
    bg.alpha_composite(foreground(n, scale))
    return bg


def main():
    big = full(1024, 0.96)
    rounded(big, 1024 * 0.22).resize((512, 512), Image.LANCZOS).save(A("icon-512.png"))
    rounded(big, 1024 * 0.22).resize((192, 192), Image.LANCZOS).save(A("icon-192.png"))
    full(1024, 0.78).resize((512, 512), Image.LANCZOS).convert("RGB").save(A("icon-maskable-512.png"))
    # Android: adaptativo 108dp (frente nos 72dp centrais) + legado 48dp
    fg = foreground(1296, 0.62)
    bg = background(1296)
    leg = full(768, 0.96)
    for d, f in DENS.items():
        out = os.path.join(ROOT, "android-res", f"mipmap-{d}")
        os.makedirs(out, exist_ok=True)
        a = round(108 * f)
        fg.resize((a, a), Image.LANCZOS).save(os.path.join(out, "ic_launcher_foreground.png"))
        bg.resize((a, a), Image.LANCZOS).convert("RGB").save(os.path.join(out, "ic_launcher_background.png"))
        L = round(48 * f)
        rounded(leg, 768 * 0.2).resize((L, L), Image.LANCZOS).save(os.path.join(out, "ic_launcher.png"))
        circ = Image.new("L", leg.size, 0)
        ImageDraw.Draw(circ).ellipse((0, 0, leg.width - 1, leg.height - 1), fill=255)
        r = leg.copy()
        r.putalpha(circ)
        r.resize((L, L), Image.LANCZOS).save(os.path.join(out, "ic_launcher_round.png"))
    print("ícones gerados")


if __name__ == "__main__":
    main()
