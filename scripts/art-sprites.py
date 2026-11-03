"""Prepara as artes em feltro dos cômodos, objetos, enfeites, roupas e ícones.

    python scripts/art-sprites.py <pasta da fase> [<outra pasta> ...]

Cada pasta tem assets/<grupo>/<nome>.png (como as entregas das Fases 3 a 5).
- fundo_*.png: cenário inteiro, sem recorte. Vira WebP do mesmo tamanho.
- os outros: fundo verde chapado recortado. A transparência vem da distância
  até a cor do fundo (as artes têm verdes: sálvia, oliva, folhas), e as bordas
  semitransparentes têm o verde do fundo "desmisturado" da cor. Depois corta
  no contorno do objeto e limita o lado maior.
- peças que se sobrepõem (metades da banheira e do cesto, lixeira fechada e
  aberta, estágios da planta) usam o MESMO recorte, para encaixar uma na outra;
- roupas, acessórios e penteados foram desenhados no lugar certo sobre a Nubi
  parada: o recorte de cada um fica anotado (box) para o jogo encaixar.
Saída: assets/<grupo>/<nome>.webp e assets/art.json (tamanho final, recorte
no quadro original e tamanho do quadro original de cada peça).
Precisa de Pillow e numpy.
"""
import json
import os
import re
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NEAR, FAR = 70, 150      # distância até o verde do fundo: abaixo = fundo, acima = objeto
MAX_SIDE = 640           # lado maior dos objetos (px)
MAX_SIDE_SMALL = 256     # ícones do HUD e cosméticos pequenos
SMALL = re.compile(r"^hud_")
GROUPS = [re.compile(p) for p in (r"^banheiro_banheira_", r"^quarto_cesto_", r"^cozinha_lixeira",
                                  r"^jardim_(broto|folhas|flor)$")]


def key(path):
    im = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    h, w, _ = im.shape
    corners = np.array([im[2, 2], im[2, w - 3], im[h - 3, 2], im[h - 3, w - 3]])
    bg = np.median(corners, axis=0)
    d = np.sqrt(((im - bg) ** 2).sum(axis=2))
    a = np.clip((d - NEAR) / (FAR - NEAR), 0, 1)
    # p = a*cor + (1-a)*fundo  ->  cor = (p - (1-a)*fundo) / a
    safe = np.maximum(a, 1e-3)[..., None]
    col = np.clip((im - (1 - a)[..., None] * bg) / safe, 0, 255)
    rgba = np.dstack([col, a * 255]).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def bbox(im):
    return im.getchannel("A").point(lambda v: 255 if v > 20 else 0).getbbox()


def main(srcs):
    meta_path = os.path.join(ROOT, "assets", "art.json")
    meta = json.load(open(meta_path, encoding="utf-8")) if os.path.exists(meta_path) else {}
    items = []
    for src in srcs:
        base = os.path.join(src, "assets")
        for group in sorted(os.listdir(base)):
            for f in sorted(os.listdir(os.path.join(base, group))):
                if f.endswith(".png"):
                    items.append((group, f[:-4], os.path.join(base, group, f)))
    keyed = {}
    for group, name, path in items:
        if not name.startswith("fundo_"):
            keyed[name] = key(path)
    boxes = {n: bbox(im) for n, im in keyed.items()}
    for g in GROUPS:
        names = [n for n in boxes if g.search(n)]
        if names:
            bs = [boxes[n] for n in names]
            u = (min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs))
            for n in names:
                boxes[n] = u
    for group, name, path in items:
        out_dir = os.path.join(ROOT, "assets", group)
        os.makedirs(out_dir, exist_ok=True)
        out = os.path.join(out_dir, name + ".webp")
        if name.startswith("fundo_"):
            im = Image.open(path).convert("RGB")
            im.save(out, "WEBP", quality=82, method=6)
            meta[group + "/" + name] = {"w": im.width, "h": im.height}
        else:
            im = keyed[name]
            box = boxes[name]
            crop = im.crop(box)
            side = MAX_SIDE_SMALL if SMALL.search(name) else MAX_SIDE
            k = min(1, side / max(crop.size))
            if k < 1:
                crop = crop.resize((round(crop.width * k), round(crop.height * k)), Image.LANCZOS)
            crop.save(out, "WEBP", quality=88, method=6)
            meta[group + "/" + name] = {"w": crop.width, "h": crop.height, "box": list(box), "canvas": [im.width, im.height]}
        print(group + "/" + name, meta[group + "/" + name])
    with open(meta_path, "w", encoding="utf-8") as fp:
        json.dump(dict(sorted(meta.items())), fp, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1:])
