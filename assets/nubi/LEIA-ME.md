# Imagens da Nubi (sprites)

A Nubi do jogo vai ser feita com imagens no estilo do modelo em feltro, uma por pose. Esta pasta guarda essas imagens.

## Regras para todas as imagens

1. **Sempre anexe a imagem de referência** (a Nubi em feltro) ao gerar, para manter a mesma personagem.
2. **Fundo verde chapado `#00FF00`**, sem degradê, sem chão e **sem sombra no chão** (o jogo desenha a sombra). Se a ferramenta fizer fundo transparente de verdade, melhor ainda.
3. **Corpo inteiro**, centralizada, **mesmo enquadramento e mesmo tamanho** em todas: pés na mesma altura, mesma distância da câmera, vista de frente levemente de lado (3/4).
4. Quadrada, **2048x2048** (mínimo 1024x1024), PNG.
5. Nada de texto, objetos, "zzz" ou efeitos: o jogo põe isso por cima.
6. Para as variações de expressão (piscar, boca aberta, comendo), **parta da imagem "parada"** e use edição ou inpainting pedindo para **mudar só os olhos ou só a boca**. Assim o corpo fica idêntico e a troca no jogo não "pula".

## Texto base (cole antes de cada pose)

> Use the attached reference image. Nubi, a cute cloud chinchilla fantasy creature, handmade needle-felted wool and clay 3D render, soft matte felt texture. Pastel lilac body; warm cream face muzzle, cheeks, belly, paws and feet; big round ears with soft coral-pink inside; a cream whipped-cream swirl tuft on top of the head; a thick lilac tail curling behind the body that ends in a big three-lobed cream cloud puff; big glossy dark purple eyes with white highlights, small eyelashes, thin arched eyebrows, small mauve nose, soft pink blush on the cheeks. Exactly the same character design, proportions and colors as the reference. Full body, centered, front three-quarter view, camera at eye level, same scale and framing as the other images, soft studio lighting from the top left, no floor shadow, no text, no props, solid flat chroma green background (#00FF00), square 2048x2048.

## Lista de imagens

### Fase 1 (para começar)

| Arquivo | Pose (cole depois do texto base) |
|---|---|
| `nubi_parada.png` | Pose: standing relaxed, arms resting at the sides of the belly, eyes open looking at the viewer, gentle closed-mouth smile. |
| `nubi_piscando.png` | Same image as nubi_parada, change only the eyes: both eyes gently closed (blink). Everything else identical. |
| `nubi_falando.png` | Same image as nubi_parada, change only the mouth: open happy smile showing a small pink tongue. Everything else identical. |
| `nubi_acenando.png` | Pose: happy, waving with the right paw raised beside the head, eyes closed in happy arcs (^ ^), open smiling mouth. |
| `nubi_comemorando.png` | Pose: celebrating, both arms raised up high, small jump with feet slightly off the ground, eyes open and excited, big open smile. |
| `nubi_comendo.png` | Pose: eating, both paws holding near the mouth, cheeks puffed full of food, eyes closed with delight, mouth closed chewing. Do not draw any food. |
| `nubi_dormindo.png` | Pose: sleeping, sitting curled up with the tail cloud hugged close, head slightly tilted, eyes closed, peaceful tiny smile. |
| `nubi_sentada.png` | Pose: sitting on the floor, paws on the belly, eyes open, sweet smile, tail cloud beside the body. |

### Fase 2 (depois)

| Arquivo | Pose (cole depois do texto base) |
|---|---|
| `nubi_curiosa.png` | Pose: curious, head tilted to one side, looking sideways with wide eyes, one paw near the chin, small "o" mouth. |
| `nubi_surpresa.png` | Pose: surprised, ears perked up, eyes wide open, mouth in a small round "O", paws open at the sides. |
| `nubi_ops.png` | Pose: a little embarrassed "oops", one paw scratching the back of the head, shy smile, eyes looking to the side. |
| `nubi_dancando.png` | Pose: dancing, leaning to one side with one foot lifted and arms swinging, eyes closed happily, open smile. |

## Como entram no jogo

1. Gere as imagens com os nomes da tabela (fundo verde, mesmo enquadramento) e junte numa pasta.
2. Rode `python scripts/pet-sprites.py <pasta> nubi`: ele recorta o verde, aplica o MESMO recorte em todas as poses, mede pés e olhos e salva `nubi_<pose>.webp` aqui (e `sprites.json`, que o jogo lê).
3. Pose nova (Fase 2): diga quando ela aparece em `_choosePose()` (`src/entities/nubi.js`) e inclua o arquivo no `sw.js`.

A Fase 1 já está no jogo: parada, piscando, falando, acenando, comemorando, comendo, dormindo e sentada.

## Encaixe das roupas (pose por pose)

As roupas, sapatos e acessórios em feltro são desenhados sobre a Nubi parada. Depois de trocar uma pose, rode `python scripts/nubi-fit.py` (com `--preview <arquivo.png>` para conferir). Ele grava, para cada pose, a camada `nubi_<pose>_frente.webp` (só patinhas e pés, que o jogo desenha por cima da roupa) e a posição de cada pé em `sprites.json`, e marca em `art.json` a metade esquerda e a direita de cada calçado. As patinhas e os pés de cada pose estão marcados à mão no começo do script: se a pose nova mudar as mãos ou os pés de lugar, ajuste ali.
