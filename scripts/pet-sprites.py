"""Prepara as imagens de um bichinho para o jogo (Nubi, Lili, Tito).

    python scripts/pet-sprites.py <pasta com <prefixo>_*.png em fundo verde> <especie>

    especie: nubi | bunny | bear   (prefixo dos arquivos: nubi_, lili_, tito_)

- recorta o fundo verde chapado (chroma key) e tira o reflexo verde das bordas;
- usa o MESMO recorte em todas as poses (a caixa que cobre todas), para os
  pés ficarem na mesma linha e a troca de pose não "pular";
- mede o centro dos pés e o ponto entre os olhos de cada pose (roupas,
  salão e a boca da cozinha se encaixam por eles);
- salva em assets/<especie>/ como WebP com transparência e escreve
  assets/<especie>/sprites.json, que o jogo lê.
Precisa de Pillow (pip install pillow).
"""
import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PREFIX = {"nubi": "nubi", "bunny": "lili", "bear": "tito"}
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
            if g > max(r, b):                # despill: os bichinhos não têm verde
                g = max(r, b)
            px[x, y] = (r, g, b, a)
    return im


def feet_x(im):
    """Centro dos pés: meio da faixa opaca perto da base."""
    px = im.load()
    w, h = im.size
    bbox = im.getchannel("A").getbbox()
    for k in (0.985, 0.97, 0.95, 0.92):
        y = int(bbox[1] + (bbox[3] - bbox[1]) * k)
        xs = [x for x in range(w) if px[x, y][3] > 128]
        if xs:
            return (min(xs) + max(xs)) / 2
    return w / 2


def eyes(im):
    """Olhos: os pontos mais escuros (pupilas) no alto da cabeça, separados em
    esquerdo/direito pelo meio da faixa. Devolve [centro x, centro y, meia distância]."""
    px = im.load()
    w, h = im.size
    x0, y0, x1, y1 = im.getchannel("A").getbbox()
    pts = [(x, y) for y in range(int(y0 + (y1 - y0) * 0.2), int(y0 + (y1 - y0) * 0.6))
           for x in range(x0, x1) if px[x, y][3] > 200 and sum(px[x, y][:3]) < 110]
    if len(pts) < 20:
        return None
    xs = [p[0] for p in pts]
    mid = (min(xs) + max(xs)) / 2
    L = [p for p in pts if p[0] < mid]
    R = [p for p in pts if p[0] >= mid]
    c = lambda P: (sum(p[0] for p in P) / len(P), sum(p[1] for p in P) / len(P))
    (lx, ly), (rx, ry) = c(L), c(R)
    return [round((lx + rx) / 2), round((ly + ry) / 2), round(abs(rx - lx) / 2)]


def main(src, species):
    prefix = PREFIX[species]
    out_dir = os.path.join(ROOT, "assets", species)
    names = sorted(f for f in os.listdir(src) if f.startswith(prefix + "_") and f.endswith(".png"))
    if not names:
        sys.exit("nenhum " + prefix + "_*.png em " + src)
    keyed = {n: key(Image.open(os.path.join(src, n))) for n in names}
    boxes = [im.getchannel("A").point(lambda v: 255 if v > 20 else 0).getbbox() for im in keyed.values()]
    x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes)
    x1 = max(b[2] for b in boxes); y1 = max(b[3] for b in boxes)
    pad = int((y1 - y0) * 0.02)
    any_im = next(iter(keyed.values()))
    box = (max(0, x0 - pad), max(0, y0 - pad), min(any_im.width, x1 + pad), min(any_im.height, y1 + pad))
    cw, ch = box[2] - box[0], box[3] - box[1]
    size = (round(cw * HEIGHT / ch), HEIGHT)
    os.makedirs(out_dir, exist_ok=True)
    poses = {}
    for n, im in keyed.items():
        out = im.crop(box).resize(size, Image.LANCZOS)
        out.save(os.path.join(out_dir, n.replace(".png", ".webp")), "WEBP", quality=90, method=6)
        poses[n[len(prefix) + 1:-4]] = {"eyes": eyes(out)}
    stand = keyed.get(prefix + "_parada.png") or any_im
    st = stand.crop(box).resize(size, Image.LANCZOS)
    meta = {
        "prefix": prefix, "w": size[0], "h": size[1],
        "feetX": round(feet_x(st)), "bottom": st.getchannel("A").getbbox()[3],
        "poses": poses
    }
    with open(os.path.join(out_dir, "sprites.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    print(json.dumps(meta, ensure_ascii=False))


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
