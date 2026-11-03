# Arte do jogo em feltro (clay 3D)

Tudo no mesmo estilo da Nubi em feltro. As imagens chegam por fases: cada fase entra no jogo antes de começar a próxima, para conferir se o caminho funciona.

## Regras para todas as imagens

1. **Anexe sempre uma imagem da Nubi em feltro** (por exemplo `assets/nubi/nubi_parada.webp`) como referência de estilo.
2. **Fundo verde chapado `#00FF00`**, sem chão e **sem sombra no chão**. O jogo desenha as sombras. Exceção: os **fundos de cômodo** (Fases 4 e 5), que são a cena inteira.
3. **Um objeto por imagem**, centralizado, inteiro, sem cortar nenhuma borda.
4. **Sem texto, sem personagens e sem objetos extras** além do pedido.
5. **PNG.** Objetos e personagens: quadrado de 2048x2048 (no mínimo 1024). Fundos: 2560x1152 (formato 20:9).
6. Luz macia de estúdio vinda de cima à esquerda, câmera na altura dos olhos, levemente de cima.

### Texto de estilo (cole antes de cada pedido)

> Use the attached image only as a STYLE reference. Handmade needle-felted wool and soft clay 3D render, matte felt texture with tiny fibers, rounded chunky shapes, pastel colors, soft studio lighting from the top left, gentle soft shadows inside the object, cute toy-like look for small children.

E, para objetos e personagens, termine com:

> Single object, centered, fully visible, no text, no characters, no floor shadow, solid flat chroma green background (#00FF00), square 2048x2048.

---

## Fase 2: Lili e Tito (os amigos da Nubi)

Primeiro faça **uma imagem de cada um parado** e me mostre; depois as outras poses **partindo da imagem parada** (edição/inpainting), como foi com a Nubi.

**Lili (coelhinha):**

> A cute fantasy bunny named Lili, friend of Nubi, same proportions and felt style as Nubi: chubby pear-shaped body, big head, light pink body, warm cream face muzzle, cheeks, belly, paws and feet, two long upright ears with soft coral-pink inside, a small round cream pompom tail, big glossy dark brown eyes with white highlights, small eyelashes, thin arched eyebrows, small pink nose, soft pink blush.

**Tito (ursinho):**

> A cute fantasy bear cub named Tito, friend of Nubi, same proportions and felt style as Nubi: chubby pear-shaped body, big head, warm caramel-brown body, light cream face muzzle, belly, paws and feet, two small round ears with cream inside, a tiny round tail, big glossy dark brown eyes with white highlights, thin arched eyebrows, small dark brown nose, soft pink blush.

**Poses** (os mesmos nomes da Nubi, trocando o prefixo para `lili_` ou `tito_`):

| Arquivo | Pose |
|---|---|
| `lili_parada.png` / `tito_parada.png` | standing relaxed, arms resting at the sides of the belly, eyes open looking at the viewer, gentle closed-mouth smile |
| `..._piscando.png` | same image as the standing one, change only the eyes: both eyes gently closed |
| `..._falando.png` | same image as the standing one, change only the mouth: open happy smile with a small pink tongue |
| `..._acenando.png` | waving with the right paw raised beside the head, eyes closed in happy arcs, open smile |
| `..._comemorando.png` | both arms raised up high, small jump, excited open smile |
| `..._comendo.png` | both paws near the mouth, cheeks puffed full, eyes closed with delight (no food drawn) |
| `..._dormindo.png` | sleeping, sitting curled up, eyes closed, peaceful tiny smile |
| `..._sentada.png` / `..._sentado.png` | sitting on the floor, paws on the belly, eyes open, sweet smile |

Para o Tito, use `tito_sentada.png` mesmo (o nome é só da pose).

## Fase 3: comidas

Um alimento por imagem, de frente e levemente de cima, gordinho e brilhante de feltro. Nome do arquivo: `comida_<id>.png`.

| Arquivo | Pedido |
|---|---|
| `comida_blueberry.png` | one big round blueberry with a small green leaf |
| `comida_strawberry.png` | one big strawberry with yellow seeds and a green leafy top |
| `comida_banana.png` | one curved yellow banana |
| `comida_pear.png` | one green pear with a small leaf |
| `comida_watermelon.png` | a slice of watermelon, red with black seeds and green rind |
| `comida_grapes.png` | a small bunch of purple grapes with a leaf |
| `comida_orange.png` | one round orange with a leaf |
| `comida_apple.png` | one shiny red apple with a leaf |
| `comida_sandwich.png` | a small sandwich with lettuce, cheese and tomato |
| `comida_pizza.png` | one slice of pizza with cheese and pepperoni |
| `comida_carrot.png` | one orange carrot with green leaves |
| `comida_broccoli.png` | one small broccoli |
| `comida_cupcake.png` | one cupcake with pink frosting and a cherry |
| `comida_popsicle.png` | one fruit popsicle on a wooden stick |
| `comida_milk.png` | a small carton of milk |
| `comida_juice.png` | a small juice box with a straw |
| `comida_rainbowcake.png` | a slice of rainbow layer cake |
| `comida_starcookie.png` | a star-shaped cookie with colorful sprinkles |
| `comida_icecream.png` | an ice cream cone with a pink scoop |
| `comida_donut.png` | a pink frosted donut with sprinkles |

Restos que vão para a lixeira (pequenos): `resto_bananapeel.png` (banana peel), `resto_pearcore.png` (pear core), `resto_stem.png` (strawberry green top), `resto_twig.png` (little twig with a leaf), `resto_wrapper.png` (crumpled colorful wrapper), `resto_stick.png` (wooden popsicle stick).

## Fase 4: a cozinha (piloto dos cômodos)

Os cômodos são feitos em **duas partes**: um **fundo** (parede e chão, sem nada que a criança toque) e cada **móvel/objeto separado** (em fundo verde), que o jogo coloca no lugar certo. Assim funciona em qualquer tamanho de tela.

**Fundo** `fundo_cozinha.png` (2560x1152, sem fundo verde):

> Wide empty cozy kitchen interior for a children's game, front view: warm cream and peach wall with tiny polka dots, a small wooden wall shelf with three jars (orange, green, lilac) in the upper middle, two small framed pictures (green hills, a heart) below the shelf, a round pink wall clock on the right, a wooden baseboard and a warm wooden plank floor in the bottom 20%. Leave the left third of the wall EMPTY (a window will be placed there) and leave the floor EMPTY (no table, no furniture, no trash bin, no characters, no food).

**Objetos** (fundo verde):

| Arquivo | Pedido |
|---|---|
| `cozinha_janela.png` | a window seen from inside the kitchen: sky blue glass with soft clouds and green hills, white cross frame, pink curtains on both sides with a curtain rod, a windowsill with two tiny potted plants (blue pot and pink pot). Slightly taller than wide (about 2:3). |
| `cozinha_mesa.png` | a low wide wooden table seen from the front with a big round white plate with a thin pink rim on top. Very wide (about 4:1), empty plate. |
| `cozinha_lixeira.png` | a cute green recycling bin with a closed lid and a recycling symbol |
| `cozinha_lixeira_aberta.png` | the same green bin with the lid open |
| `cozinha_saquinho.png` | a small tied trash bag |
| `cozinha_caminhao.png` | a cute little garbage truck, side view |

## Fase 5: os outros cômodos

Mesmo esquema: fundo sem nada tocável + objetos separados. **Só depois que a cozinha estiver aprovada no jogo.**

**Banheiro**
- `fundo_banheiro.png`: light blue tiled bathroom wall with a decorative blue stripe, a round mirror with gold frame (upper middle), a small round window (upper right), a small potted plant; tiled floor in the bottom 40%. EMPTY floor and EMPTY left side (no bathtub, no toilet, no shelf).
- `banheiro_banheira_fundo.png` (the inside/back part of a white clawfoot bathtub, as if cut in half: only the back wall and water surface) e `banheiro_banheira_frente.png` (the front part of the same bathtub with yellow feet). As duas juntas formam a banheira, porque a criaturinha fica dentro.
- `banheiro_vaso.png` (cute white toilet with tank), `banheiro_prateleira.png` (tall soft panel/shelf for bath tools), `banheiro_tapete.png` (small round bath mat).
- Ferramentas: `banheiro_esponja.png` (yellow sponge), `banheiro_chuveirinho.png` (handheld shower head with hose), `banheiro_toalha.png` (folded pink towel), `banheiro_patinho.png` (yellow rubber duck), `banheiro_pente.png` (pink comb/brush), `banheiro_coco.png` (cute stylized poop with a smile, brown, for kids).

**Quarto**
- `fundo_quarto.png`: lilac wall with tiny stars, an arched window with the moon (upper right), a cozy bed with a patchwork quilt and a yellow pillow on the right side, a framed star picture; wooden floor with a pink oval rug. EMPTY left side and EMPTY center floor.
- `quarto_guardaroupa.png` (open wooden wardrobe, tall and narrow, empty inside with a rod), `quarto_cesto_fundo.png` + `quarto_cesto_frente.png` (wicker basket, back and front halves), `quarto_bola.png` (colorful ball).

**Dentista**
- `fundo_dentista.png`: mint green clinic wall with soft dots, a hanging lamp on the left, tiled floor at the bottom. EMPTY center and EMPTY right side.
- `dentista_cadeira.png` (cute reclined dentist chair, side view), `dentista_bandeja.png` (tall soft tool panel), `dentista_escova.png` (toothbrush), `dentista_varinha.png` (magic wand with a yellow star), `dentista_copo.png` (rinse cup), `dentista_bichinho.png` (cute little green "sugar bug"), `dentista_babador.png` (bib with a tooth).

**Salão**
- `fundo_salao.png`: pink striped beauty salon wall, floor at the bottom. EMPTY center.
- `salao_espelho.png` (big oval mirror with gold frame and little light bulbs around, empty glass), `salao_balcao.png` (tall pink side panel), `salao_porta_cabelo.png`, `salao_porta_unhas.png`, `salao_porta_maquiagem.png` (round station badges: hairdryer/comb, nail polish, lipstick).

**Quarto de brinquedos**
- `fundo_brinquedos.png`: circus tent stripes in soft pink and cream converging at the top, green grass floor, colorful bunting flags at the top.
- Ícones dos minijogos: `jogo_pegafrutas.png` (basket with an apple), `jogo_bolhas.png` (soap bubbles), `jogo_memoria.png` (two cards), `jogo_musica.png` (little bell with a music note), `jogo_formas.png` (circle, square, triangle blocks), `jogo_cores.png` (paint palette).

**Jardim**
- `fundo_jardim.png`: sunny sky with soft clouds, a white picket fence in the middle, green lawn with grass tufts in the bottom 40%. EMPTY lawn (no planters).
- `jardim_canteiro.png` (a wooden planter box with dark soil, empty), `jardim_broto.png` (tiny sprout), `jardim_folhas.png` (small plant with leaves), `jardim_flor.png` (plant with a flower), `jardim_regador.png` (watering can), `jardim_borboleta.png` (butterfly).

**Mapa da casa**
- `fundo_mapa.png`: sunny sky, soft green hills, two round trees on the left, a stone path, little flowers along the bottom. EMPTY right two thirds (the house goes there).
- `mapa_casa.png`: front of a cute two-story house with a red tiled roof and a small round attic window, cream walls with a big EMPTY wall area (the game draws the room windows on it). Wide (about 3:4.5 height:width).

## Fase 6 (depois): enfeites, roupas e ícones

Enfeites da casa (bandeirinhas, flores, balões, arco-íris), as peças de roupa e acessórios, os itens do salão (penteados, esmaltes, maquiagem) e os ícones do HUD. Essas peças também precisam encaixar nas poses dos bichinhos, então vêm por último.

---

## Como entregar

Para cada fase, junte as imagens numa pasta com os nomes da tabela e me avise. Não precisa recortar o verde: eu recorto, padronizo e encaixo no jogo.
