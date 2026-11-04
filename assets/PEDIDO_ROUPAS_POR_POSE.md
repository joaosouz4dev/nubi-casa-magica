# Pedido para o agente de design: roupas da Nubi em cada pose

## Por que este pedido

As roupas, os acessórios do pescoço e os calçados foram desenhados só na Nubi **parada**. Em pé (parada, falando, piscando) eles encaixam bem.

Já **sentada** e **dormindo** o corpo dela muda de forma: fica mais baixo e mais largo, os pés vão para a frente e, dormindo, ela abraça o rabo na frente da barriga. O jogo hoje estica a roupa da Nubi parada para essas poses e corta o que sobra, e o resultado não fica bom. **A única forma de ficar perfeito é desenhar cada peça já vestida em cada uma dessas poses.**

Chapéus, óculos, máscaras, tapa-olho, penteados e enfeites de cabelo **não precisam**: eles acompanham a cabeça e já encaixam em todas as poses.

---

## Como gerar (vale para todas as imagens)

O jeito é o mesmo que deu certo com os calçados refeitos: **a Nubi inteira, idêntica, vestindo a peça**. Depois eu comparo com a Nubi original da pose e recorto só a peça.

1. **Anexe a imagem da pose** como base: o PNG original da pasta da Fase 1, com fundo verde, 1254x1254.
   - Sentada: `nubi_fase1/assets/nubi/nubi_sentada.png`
   - Dormindo: `nubi_fase1/assets/nubi/nubi_dormindo.png`
   - (Prioridade 2) `nubi_comemorando.png`, `nubi_acenando.png`, `nubi_comendo.png`
2. **Anexe também a peça na Nubi parada** como referência de como ela é (os PNGs que vocês já entregaram nas Fases 5 e 6, por exemplo `roupas/roupa_pijama.png`). Assim a peça sai com o mesmo desenho, cor e detalhes.
3. **Cole o texto de estilo:**

> Use the attached images only as a STYLE reference. Handmade needle-felted wool and soft clay 3D render, matte felt texture with tiny fibers, rounded chunky shapes, pastel colors, soft studio lighting from the top left, gentle soft shadows inside the object, cute toy-like look for small children.

4. **Cole o pedido**, trocando `<PEÇA>` pela descrição da tabela e `<POSE>` pelo texto da pose:

> Redraw the FIRST attached image (Nubi <POSE>) EXACTLY as it is: same Nubi, same pose, same size, same position, same colors, same lighting, same solid green background (#00FF00), same canvas size 1254x1254. The ONLY change: Nubi is now wearing <PEÇA>, exactly the same item as in the SECOND attached image (same design, colors and details), but fitted to THIS pose: it follows her body shape, folds and stretches naturally, and her paws, arms, feet and tail stay where they are. Nothing of the item may stick out into the green background beyond what a real piece of clothing would. Do not change anything else: face, ears, tuft, paws and tail must stay pixel-identical.

**Texto de cada pose (`<POSE>`):**

| Pose | `<POSE>` |
|---|---|
| sentada | sitting on the floor, feet forward with the soles showing, paws resting on the belly |
| dormindo | sleeping, sitting low and hugging the fluffy cream tip of her tail in front of her belly; the tail tip and her paws must stay IN FRONT of the clothing |
| comemorando | celebrating with both arms raised; sleeves (if any) follow the raised arms |
| acenando | waving with one arm raised; sleeves (if any) follow the arms |
| comendo | holding both paws near her cheeks; sleeves (if any) follow the arms |

5. **Uma peça por imagem.** Não junte duas peças na mesma imagem (o recorte depende disso).
6. **Confira antes de mandar:** a Nubi tem que sair igual à original da pose (mesmo tamanho, lugar e rosto). Se o gerador mexer nela, gere de novo.

---

## O que gerar

### Prioridade 1: sentada e dormindo (32 imagens)

Para **cada uma das duas poses**, as 16 peças abaixo.

**Corpo**

| Arquivo | `<PEÇA>` |
|---|---|
| `roupa_pijama.png` | a loose sleeveless lilac felt pajama top with cream polka dots |
| `roupa_vestido.png` | a sleeveless pink felt dress with a cream flower on the chest and a scalloped hem |
| `roupa_colete.png` | a mint green felt vest with cream trim, open in the front |
| `roupa_astronauta.png` | a white felt astronaut suit with small colorful buttons and patches |

**Costas** (ficam atrás dela)

| Arquivo | `<PEÇA>` |
|---|---|
| `roupa_capa.png` | a red felt superhero cape tied at her neck, falling behind her |
| `roupa_capa_arcoiris.png` | a pastel rainbow felt cape tied at her neck, falling behind her |
| `roupa_asas.png` | a pair of light blue translucent felt fairy wings on her back |

**Pescoço**

| Arquivo | `<PEÇA>` |
|---|---|
| `acessorio_cachecol.png` | a cozy light blue knitted scarf around her neck, one end hanging down |
| `acessorio_colar_flores.png` | a necklace of small pink and white felt flowers around her neck |
| `acessorio_medalha.png` | a golden felt medal with a star on a blue ribbon around her neck |
| `acessorio_gravata.png` | a coral felt bow tie under her chin |

**Pés** (os pés dela ficam inteiros dentro do calçado, sem a boca aberta aparecendo)

| Arquivo | `<PEÇA>` |
|---|---|
| `calcado_botas.png` | a pair of blue felt rain boots with a little pink cloud and raindrops |
| `calcado_botas_brilho.png` | a pair of lilac felt boots with tiny cream and yellow stars |
| `calcado_tenis.png` | a pair of red felt sneakers with white laces and cream soles |
| `calcado_pantufas.png` | a pair of fluffy pink felt bunny slippers with a sleepy bunny face |
| `calcado_sapatilhas.png` | a pair of pink felt ballet flats with a small bow and ankle ribbons |

### Prioridade 2: braços levantados (12 imagens)

Só as 4 roupas do corpo (`roupa_pijama`, `roupa_vestido`, `roupa_colete`, `roupa_astronauta`) nas poses **comemorando**, **acenando** e **comendo**, para as mangas acompanharem os braços. O resto já encaixa nessas poses.

---

## Como entregar

Uma pasta por pose, com os nomes das tabelas:

```
assets/poses/sentada/roupa_pijama.png
assets/poses/sentada/calcado_botas.png
...
assets/poses/dormindo/roupa_pijama.png
...
assets/poses/comemorando/roupa_pijama.png   (prioridade 2)
```

Pode mandar a prioridade 1 primeiro. O que chegar entra no jogo; o que ainda não tiver arte na pose continua do jeito de hoje.

Todos os PNGs com 1254x1254, fundo verde, **a Nubi inteira** vestindo a peça (não recorte nada).
