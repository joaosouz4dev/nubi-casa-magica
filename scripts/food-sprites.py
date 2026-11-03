"""Prepara as imagens das comidas para o jogo.

    python scripts/food-sprites.py <pasta com comida_*.png e resto_*.png em fundo verde>

- recorta o fundo verde chapado (chroma key). As comidas TÊM verde (folhas,
  brócolis, pera, alface), então o recorte não pode apagar "tudo que é verde":
  a transparência vem da distância até a cor do fundo, e as bordas
  semitransparentes têm o verde do fundo "desmisturado" da cor;
- corta cada imagem no contorno do objeto e salva em assets/comidas/ como WebP
  com transparência, com no máximo SIZE px no lado maior. O jogo encaixa a
  imagem no raio da comida (src/entities/food_sprites.js).
Precisa de Pillow (pip install pillow).
"""
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SIZE = 320           # lado maior final (px): nítido em tela 2x sem pesar
NEAR, FAR = 70, 150  # distância até o verde do fundo: abaixo = fundo, acima = objeto


def bg_color(im):
    """Cor do fundo: média dos cantos."""
    px = im.load()
    w, h = im.size
    pts = [px[x, y] for x in (2, w - 3) for y in (2, h - 3)]
    return tuple(sum(p[i] for p in pts) / len(pts) for i in range(3))


def key(im):
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    br, bg, bb = bg_color(im)
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            d = ((r - br) ** 2 + (g - bg) ** 2 + (b - bb) ** 2) ** 0.5
            if d <= NEAR:
                px[x, y] = (0, 0, 0, 0)
            elif d < FAR:
                a = (d - NEAR) / (FAR - NEAR)
                # p = a*cor + (1-a)*fundo  ->  cor = (p - (1-a)*fundo) / a
                un = lambda v, f: max(0, min(255, round((v - (1 - a) * f) / a)))
                px[x, y] = (un(r, br), un(g, bg), un(b, bb), round(255 * a))
    return im


def main(src):
    out_dir = os.path.join(ROOT, "assets", "comidas")
    names = sorted(f for f in os.listdir(src)
                   if f.endswith(".png") and (f.startswith("comida_") or f.startswith("resto_")))
    if not names:
        sys.exit("nenhum comida_*.png ou resto_*.png em " + src)
    os.makedirs(out_dir, exist_ok=True)
    for n in names:
        im = key(Image.open(os.path.join(src, n)))
        box = im.getchannel("A").point(lambda v: 255 if v > 20 else 0).getbbox()
        im = im.crop(box)
        k = SIZE / max(im.size)
        if k < 1:
            im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        im.save(os.path.join(out_dir, n.replace(".png", ".webp")), "WEBP", quality=88, method=6)
        print(n, im.size)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1])
