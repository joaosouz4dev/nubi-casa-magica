"""Recorta as roupas desenhadas em cada pose (a Nubi inteira vestindo a peça).

    python scripts/pose-sprites.py <pasta da Fase 1 com assets/nubi/nubi_<pose>.png> <pasta da entrega> [...]

Cada entrega tem assets/poses/<pose>/<peça>.png: a Nubi da pose, inteira,
vestindo UMA peça. O gerador não devolve a Nubi idêntica pixel a pixel, então:
- compara com a Nubi original DA MESMA POSE;
- o que mudou bastante e não é verde é a peça; tira pontinhos soltos (ruído
  da geração no pelo e no rosto), fecha a forma e preenche os buracos;
- recorta o verde das bordas e grava assets/poses/<pose>/<peça>.webp, com o
  recorte (box) no quadro de 1254 em assets/art.json ("poses/<pose>/<peça>").
O jogo desenha a peça da pose por cima da Nubi daquela pose (mesmo quadro),
no lugar de esticar a peça da Nubi parada.
Precisa de Pillow e numpy.
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIFF = 70            # soma das diferenças RGB para contar como "mudou"
MIN_AREA = 600       # pedaços menores que isso são ruído da geração
BG = np.array([3, 250, 3], np.float32)
MAX_SIDE = 720


def components(mask):
    """Rótulos dos pedaços ligados (4-vizinhos), sem scipy."""
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32)
    sizes = [0]
    n = 0
    ys, xs = np.nonzero(mask)
    for y0, x0 in zip(ys, xs):
        if lab[y0, x0]:
            continue
        n += 1
        stack = [(y0, x0)]
        lab[y0, x0] = n
        size = 0
        while stack:
            y, x = stack.pop()
            size += 1
            for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = n
                    stack.append((yy, xx))
        sizes.append(size)
    return lab, np.array(sizes)


def fill_holes(m, max_hole=12000):
    """Buracos PEQUENOS dentro da peça viram peça (cadarço, estampa da cor do
    pelo). Buraco grande é a Nubi aparecendo (gola, cava do braço): fica."""
    small = Image.fromarray((~m).astype(np.uint8) * 255).resize((m.shape[1] // 2, m.shape[0] // 2), Image.NEAREST)
    lab, sizes = components(np.asarray(small) > 0)
    h, w = lab.shape
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
    fill = [i for i in range(1, len(sizes)) if i not in border and sizes[i] * 4 <= max_hole]
    holes = np.isin(lab, fill)
    holes = np.asarray(Image.fromarray(holes.astype(np.uint8) * 255).resize((m.shape[1], m.shape[0]), Image.NEAREST)) > 0
    return m | holes


def kind(name):
    if name.startswith("calcado_"):
        return "feet"
    if name in ("roupa_capa", "roupa_capa_arcoiris", "roupa_asas"):
        return "back"
    if name.startswith("acessorio_"):
        return "neck"
    return "body"


class Pose:
    """Medidas da pose (sprites.json e o molde do tronco) no quadro de 1254."""
    def __init__(self, pose, shape):
        meta = json.load(open(os.path.join(ROOT, "assets", "nubi", "sprites.json"), encoding="utf-8"))
        B = meta["box"]
        self.s = meta["h"] / (B[3] - B[1])       # px do quadro -> px da pose
        self.B = B
        self.p = meta["poses"][pose]
        self.shape = shape
        cm = Image.open(os.path.join(ROOT, "assets", "nubi", f"nubi_{pose}_corpo.webp")).getchannel("A")
        big = Image.new("L", (shape[1], shape[0]), 0)
        big.paste(cm.resize((B[2] - B[0], B[3] - B[1]), Image.LANCZOS), (B[0], B[1]))
        self.torso = np.asarray(big) > 60

    def c(self, v, axis):   # px da pose -> px do quadro
        return self.B[axis] + v / self.s

    def ellipse(self, cx, cy, rx, ry):
        m = Image.new("L", (self.shape[1], self.shape[0]), 0)
        X, Y, RX, RY = self.c(cx, 0), self.c(cy, 1), rx / self.s, ry / self.s
        ImageDraw.Draw(m).ellipse((X - RX, Y - RY, X + RX, Y + RY), fill=255)
        return np.asarray(m) > 0

    def neck(self):
        ex, ey, half = self.p["eyes"] or [440, 259, 75]
        return self.ellipse(ex, ey + half * 2.4, half * 3.2, half * 1.9)

    def head(self):
        ex, ey, half = self.p["eyes"] or [440, 259, 75]
        return self.ellipse(ex, ey - half * 0.5, half * 3.4, half * 2.2)

    def feet(self):
        m = np.zeros(self.shape, bool)
        fh = self.p.get("feetH", 54)
        for cx, base, w in self.p["feet"]:
            m |= self.ellipse(cx, base - fh / 2, w / 2 + 22, fh / 2 + 26)
        return m


def grow(m, px):
    return np.asarray(Image.fromarray(m.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(px * 2 + 1))) > 0


def shrink(m, px):
    return np.asarray(Image.fromarray(m.astype(np.uint8) * 255).filter(ImageFilter.MinFilter(px * 2 + 1))) > 0


def changed(im_blur, orig_blur, region, thr=DIFF, close=9, min_area=MIN_AREA):
    """O que mudou de verdade dentro da região: tira linhas e pedacinhos."""
    diff = np.abs(im_blur - orig_blur).sum(axis=2)
    m = (diff > thr) & region
    m = grow(shrink(m, 1), 1)
    small = Image.fromarray(m.astype(np.uint8) * 255).resize((m.shape[1] // 2, m.shape[0] // 2), Image.NEAREST)
    lab, sizes = components(np.asarray(small) > 0)
    keep = np.isin(lab, [i for i in np.nonzero(sizes >= min_area // 4)[0] if i > 0])
    keep = np.asarray(Image.fromarray(keep.astype(np.uint8) * 255).resize((m.shape[1], m.shape[0]), Image.NEAREST)) > 0
    m &= keep
    return fill_holes(shrink(grow(m, close), close))


def cut(path, orig, orig_blur, pose, name):
    src = Image.open(path).convert("RGB")
    im = np.asarray(src).astype(np.int32)
    imb = np.asarray(src.filter(ImageFilter.GaussianBlur(2))).astype(np.int32)
    green = im[..., 1] - np.maximum(im[..., 0], im[..., 2])
    solid = green < 90                                  # não é fundo verde na imagem nova
    og = orig[..., 1] - np.maximum(orig[..., 0], orig[..., 2])
    was_bg = og >= 90                                   # era fundo na Nubi original
    P = Pose(pose, im.shape[:2])
    k = kind(name)
    if k == "body":
        # a roupa cobre o tronco: copia a imagem nova no molde do tronco (um
        # pouco maior), mais o que passou para fora do corpo (barra, gola)
        m = (grow(P.torso, 10) & solid) | changed(imb, orig_blur, grow(P.torso, 60) & ~P.neck() | (was_bg & solid), close=5)
    elif k == "neck":
        m = changed(imb, orig_blur, P.neck(), thr=55, close=5, min_area=200)
    elif k == "feet":
        m = P.feet() & solid
    else:   # costas: o que aparece fora do corpo (ou por cima do rabo) + o laço no pescoço
        out = grow(shrink(was_bg & solid, 2), 2)
        m = out | changed(imb, orig_blur, ~P.head() & ~grow(P.torso, 4), thr=60, close=5, min_area=400)             | changed(imb, orig_blur, P.neck(), thr=55, close=5, min_area=200)
    soft = np.asarray(Image.fromarray(m.astype(np.uint8) * 255).filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32) / 255
    d = np.sqrt(((im - BG) ** 2).sum(axis=2))
    ka = np.clip((d - 70) / 80, 0, 1)
    col = np.clip((im - (1 - ka)[..., None] * BG) / np.maximum(ka, 1e-3)[..., None], 0, 255)
    return Image.fromarray(np.dstack([col, np.minimum(soft, ka) * 255]).astype(np.uint8), "RGBA")


def main(base_dir, srcs):
    art_path = os.path.join(ROOT, "assets", "art.json")
    art = json.load(open(art_path, encoding="utf-8"))
    for src in srcs:
        poses_dir = os.path.join(src, "assets", "poses")
        for pose in sorted(os.listdir(poses_dir)):
            o = Image.open(os.path.join(base_dir, "assets", "nubi", f"nubi_{pose}.png")).convert("RGB")
            orig, orig_blur = np.asarray(o).astype(np.int32), np.asarray(o.filter(ImageFilter.GaussianBlur(2))).astype(np.int32)
            out_dir = os.path.join(ROOT, "assets", "poses", pose)
            os.makedirs(out_dir, exist_ok=True)
            for f in sorted(os.listdir(os.path.join(poses_dir, pose))):
                if not f.endswith(".png"):
                    continue
                name = f[:-4]
                im = cut(os.path.join(poses_dir, pose, f), orig, orig_blur, pose, name)
                box = im.getchannel("A").point(lambda v: 255 if v > 20 else 0).getbbox()
                if not box:
                    print("vazio:", pose, name)
                    continue
                crop = im.crop(box)
                k = min(1, MAX_SIDE / max(crop.size))
                if k < 1:
                    crop = crop.resize((round(crop.width * k), round(crop.height * k)), Image.LANCZOS)
                crop.save(os.path.join(out_dir, name + ".webp"), "WEBP", quality=88, method=6)
                key = f"poses/{pose}/{name}"
                art[key] = {"w": crop.width, "h": crop.height, "box": list(box), "canvas": [im.width, im.height]}
                print(key, art[key]["box"])
    with open(art_path, "w", encoding="utf-8") as fp:
        json.dump(dict(sorted(art.items())), fp, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2:])
