"""Recorta os calçados "calçados" (a Nubi inteira de sapato) para o jogo.

    python scripts/shoe-sprites.py <pasta com assets/roupas/calcado_*.png> <nubi_parada.png original>

Cada imagem é a Nubi parada INTEIRA calçando o sapato (o pé dentro, a barriga
por cima da borda). O gerador não devolve a Nubi idêntica pixel a pixel, então:
- compara com a Nubi original só perto dos pés (as duas caixas de REG);
- o que mudou bastante e não é verde é sapato; fecha a forma e preenche os
  buracos de dentro (cadarço e carinha da pantufa têm a cor do pé original);
- recorta o verde das bordas e grava assets/roupas/calcado_<x>.webp com o
  recorte (box) no quadro de 1254 em assets/art.json, como as outras peças.
Depois rode scripts/nubi-fit.py (marca a metade de cada pé de cada calçado).
Precisa de Pillow e numpy.
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REG = [(400, 1015, 690, 1225), (715, 1015, 1040, 1225)]   # perto de cada pé (quadro de 1254)
DIFF = 60           # soma das diferenças RGB para contar como "mudou"
CLOSE = {"calcado_pantufas": 41}   # fechamento maior: a carinha da pantufa tem a cor do pé
BG = np.array([3, 250, 3], np.float32)
MAX_SIDE = 640


def fill_holes(mask):
    """Tudo que não se liga à borda da caixa é buraco: vira sapato."""
    m = mask.copy()
    w, h = m.size
    for x in range(0, w, 3):
        for y in (0, h - 1):
            if m.getpixel((x, y)) == 0:
                ImageDraw.floodfill(m, (x, y), 100)
    for y in range(0, h, 3):
        for x in (0, w - 1):
            if m.getpixel((x, y)) == 0:
                ImageDraw.floodfill(m, (x, y), 100)
    return np.asarray(m) != 100


def cut(path, orig, close):
    im = np.asarray(Image.open(path).convert("RGB")).astype(np.int32)
    diff = np.abs(im - orig).sum(axis=2)
    green = im[..., 1] - np.maximum(im[..., 0], im[..., 2])
    shoe = np.zeros(diff.shape, np.uint8)
    for x0, y0, x1, y1 in REG:
        m = (diff[y0:y1, x0:x1] > DIFF) & (green[y0:y1, x0:x1] < 90)
        mi = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))
        mi = mi.filter(ImageFilter.MaxFilter(close)).filter(ImageFilter.MinFilter(close))
        shoe[y0:y1, x0:x1] = np.maximum(shoe[y0:y1, x0:x1], fill_holes(mi) * 255)
    soft = np.asarray(Image.fromarray(shoe).filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32) / 255
    d = np.sqrt(((im - BG) ** 2).sum(axis=2))
    ka = np.clip((d - 70) / 80, 0, 1)
    col = np.clip((im - (1 - ka)[..., None] * BG) / np.maximum(ka, 1e-3)[..., None], 0, 255)
    return Image.fromarray(np.dstack([col, np.minimum(soft, ka) * 255]).astype(np.uint8), "RGBA")


def main(src, orig_path):
    orig = np.asarray(Image.open(orig_path).convert("RGB")).astype(np.int32)
    base = os.path.join(src, "assets", "roupas")
    art_path = os.path.join(ROOT, "assets", "art.json")
    art = json.load(open(art_path, encoding="utf-8"))
    for f in sorted(os.listdir(base)):
        if not (f.startswith("calcado_") and f.endswith(".png")):
            continue
        name = f[:-4]
        im = cut(os.path.join(base, f), orig, CLOSE.get(name, 11))
        box = im.getchannel("A").point(lambda v: 255 if v > 20 else 0).getbbox()
        crop = im.crop(box)
        k = min(1, MAX_SIDE / max(crop.size))
        if k < 1:
            crop = crop.resize((round(crop.width * k), round(crop.height * k)), Image.LANCZOS)
        crop.save(os.path.join(ROOT, "assets", "roupas", name + ".webp"), "WEBP", quality=90, method=6)
        art["roupas/" + name] = {"w": crop.width, "h": crop.height, "box": list(box), "canvas": [im.width, im.height]}
        print(name, art["roupas/" + name])
    with open(art_path, "w", encoding="utf-8") as fp:
        json.dump(dict(sorted(art.items())), fp, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
