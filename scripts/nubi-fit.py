"""Medidas de encaixe das roupas na Nubi, pose por pose.

    python scripts/nubi-fit.py [--preview <arquivo.png>]

As roupas, sapatos e acessórios em feltro foram desenhados sobre a Nubi
parada. Nas outras poses as patinhas e os pés mudam de lugar, então:

- grava assets/nubi/nubi_<pose>_frente.webp: só as patinhas e os pés da pose
  (o resto transparente). O jogo desenha essa camada POR CIMA da roupa, para
  as mãos aparecerem na frente do tecido e os pés dentro do sapato;
- grava em assets/nubi/sprites.json, em cada pose, "feet": [esquerdo, direito],
  cada pé como [centro x, base y, largura] (px da imagem da pose);
- grava em assets/art.json, em cada calçado, "parts": as caixas do pé esquerdo
  e do direito dentro da imagem (o jogo encaixa cada metade no pé certo).

As patinhas e os pés foram marcados à mão (elipses em px da imagem da pose,
720 de altura) olhando cada imagem com uma grade.
Precisa de Pillow e numpy.
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NUBI = os.path.join(ROOT, "assets", "nubi")

# elipses (cx, cy, rx, ry) das patinhas e dos pés de cada pose
PAWS = {
    "parada":      [(359, 516, 40, 36), (583, 505, 33, 37)],
    "falando":     [(359, 516, 40, 36), (583, 505, 33, 37)],
    "piscando":    [(366, 516, 40, 36), (583, 507, 33, 37)],
    "acenando":    [(248, 333, 37, 39), (588, 506, 31, 37)],
    "comemorando": [(252, 333, 38, 37), (632, 335, 37, 39)],
    "comendo":     [(398, 371, 38, 35), (533, 373, 34, 37)],
    "sentada":     [(390, 553, 34, 32), (490, 553, 34, 32)],
    "dormindo":    [(338, 493, 31, 37), (508, 466, 31, 35)],
}
# pés: [cx, base, largura] (esquerdo, direito) e a elipse que cobre cada um
FEET = {
    "parada":      [[280, 700, 110], [500, 700, 162]],
    "falando":     [[280, 700, 110], [500, 700, 162]],
    "piscando":    [[284, 700, 112], [500, 700, 165]],
    "acenando":    [[285, 700, 115], [502, 700, 165]],
    "comemorando": [[291, 692, 127], [503, 692, 143]],
    "comendo":     [[286, 700, 117], [500, 700, 164]],
    "sentada":     [[318, 690, 113], [533, 690, 127]],
    "dormindo":    [[278, 700, 135], [492, 700, 135]],
}
FOOT_H = {"sentada": 110, "dormindo": 85}   # altura do pé visto (padrão 54: sem a sombra da barriga)


def front_layer(pose):
    im = Image.open(os.path.join(NUBI, f"nubi_{pose}.webp")).convert("RGBA")
    mask = Image.new("L", im.size, 0)
    d = ImageDraw.Draw(mask)
    for cx, cy, rx, ry in PAWS[pose]:
        d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=255)
    for cx, base, w in FEET[pose]:
        h = FOOT_H.get(pose, 54)
        d.ellipse((cx - w / 2, base - h, cx + w / 2, base + 6), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(2.5))
    a = np.minimum(np.asarray(im.getchannel("A"), dtype=np.uint16), np.asarray(mask, dtype=np.uint16)).astype(np.uint8)
    out = im.copy()
    out.putalpha(Image.fromarray(a, "L"))
    return out


def shoe_parts(path):
    """Caixas do sapato esquerdo e do direito: a coluna vazia no meio separa."""
    a = np.asarray(Image.open(path).convert("RGBA").getchannel("A")) > 40
    cols = a.any(axis=0)
    xs = np.where(cols)[0]
    x0, x1 = xs.min(), xs.max()
    mid = (x0 + x1) // 2
    gap = [x for x in range(x0, x1) if not cols[x]]
    split = min(gap, key=lambda x: abs(x - mid)) if gap else mid
    parts = []
    for lo, hi in ((x0, split), (split, x1 + 1)):
        sub = a[:, lo:hi]
        ys = np.where(sub.any(axis=1))[0]
        cs = np.where(sub.any(axis=0))[0]
        parts.append([int(lo + cs.min()), int(ys.min()), int(lo + cs.max() + 1), int(ys.max() + 1)])
    return parts


def main(preview=None):
    meta_path = os.path.join(NUBI, "sprites.json")
    meta = json.load(open(meta_path, encoding="utf-8"))
    tiles = []
    for pose in meta["poses"]:
        fl = front_layer(pose)
        fl.save(os.path.join(NUBI, f"nubi_{pose}_frente.webp"), "WEBP", quality=90, method=6)
        meta["poses"][pose]["feet"] = FEET[pose]
        meta["poses"][pose]["front"] = True
        if preview:
            bg = Image.new("RGBA", fl.size, (90, 200, 150, 255))
            bg.alpha_composite(fl)
            tiles.append(bg.resize((346, 360)))
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    art_path = os.path.join(ROOT, "assets", "art.json")
    art = json.load(open(art_path, encoding="utf-8"))
    for k in art:
        if k.startswith("roupas/calcado_"):
            art[k]["parts"] = shoe_parts(os.path.join(ROOT, "assets", k + ".webp"))
            print(k, art[k]["parts"])
    with open(art_path, "w", encoding="utf-8") as f:
        json.dump(dict(sorted(art.items())), f, ensure_ascii=False, indent=1)
    if preview:
        sheet = Image.new("RGB", (346 * 4, 360 * 2))
        for i, t in enumerate(tiles):
            sheet.paste(t.convert("RGB"), ((i % 4) * 346, (i // 4) * 360))
        sheet.save(preview)


if __name__ == "__main__":
    main(sys.argv[2] if len(sys.argv) > 2 and sys.argv[1] == "--preview" else None)
