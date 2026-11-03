"""Prepara as imagens da Nubi para o jogo (rodar de novo quando chegarem poses novas).

    python scripts/nubi-sprites.py <pasta com nubi_*.png em fundo verde>

- recorta o fundo verde chapado (chroma key) e tira o reflexo verde das bordas;
- usa o MESMO recorte em todas as poses (a caixa que cobre todas), para os
  pés ficarem na mesma linha e a troca de pose não "pular";
- salva em assets/nubi/ como WebP com transparência (leve para o celular) e
  escreve assets/nubi/sprites.json com o tamanho final.
Precisa de Pillow (pip install pillow).
"""
import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "nubi")
HEIGHT = 720          # altura final (px): nítido em tela 2x sem pesar


def key(im):
    """Fundo verde -> transparente; tira o verde que vaza nas bordas."""
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            green = g - max(r, b)            # quanto o verde domina
            if green > 90:
                a = 0
            elif green > 25:
                a = int(255 * (90 - green) / 65)
            else:
                a = 255
            if g > max(r, b):                # despill: a Nubi não tem verde
                g = max(r, b)
            px[x, y] = (r, g, b, a)
    return im


def main(src):
    names = sorted(f for f in os.listdir(src) if f.startswith("nubi_") and f.endswith(".png"))
    keyed = {n: key(Image.open(os.path.join(src, n))) for n in names}
    # caixa comum: cobre todas as poses (com uma folguinha)
    boxes = [im.getchannel("A").point(lambda v: 255 if v > 20 else 0).getbbox() for im in keyed.values()]
    x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes)
    x1 = max(b[2] for b in boxes); y1 = max(b[3] for b in boxes)
    pad = int((y1 - y0) * 0.02)
    any_im = next(iter(keyed.values()))
    box = (max(0, x0 - pad), max(0, y0 - pad), min(any_im.width, x1 + pad), min(any_im.height, y1 + pad))
    cw, ch = box[2] - box[0], box[3] - box[1]
    size = (round(cw * HEIGHT / ch), HEIGHT)
    os.makedirs(OUT, exist_ok=True)
    for n, im in keyed.items():
        out = im.crop(box).resize(size, Image.LANCZOS)
        out.save(os.path.join(OUT, n.replace(".png", ".webp")), "WEBP", quality=90, method=6)
    meta = {"w": size[0], "h": size[1], "poses": [n[5:-4] for n in names]}
    with open(os.path.join(OUT, "sprites.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    print("caixa", box, "->", size, "poses", meta["poses"])


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else OUT)
