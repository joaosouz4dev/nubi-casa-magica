# Nubi e a Casa Mágica — MVP

Jogo 2D offline para crianças de ~3 a 7 anos. A criança brinca com o **Nubi**,
uma criaturinha de nuvem, manipulando objetos nos cenários. O centro do jogo é
descobrir como o Nubi reage à brincadeira — **não** cuidar de barras.

Esta entrega é o **MVP completo** do roteiro (etapas 1-5). Jardim, instrumentos,
ateliê, sonhos, festa, mistura de frutas e catálogo ampliado de roupas são
**expansões fora do MVP** e não estão aqui — nem como botões "em breve".

## Decisões

- **Engine:** Web / HTML5 Canvas + JavaScript (ES modules), **zero dependências
  de runtime**, Web Audio para som gerado em tempo real. Empacotamento Android
  (APK) depois via Capacitor/TWA sobre esta mesma base.
- **Orientação:** horizontal (paisagem); em retrato, pede para girar o aparelho.
- **Controles:** um dedo. Dois esquemas em todas as atividades principais:
  arrastar o objeto **ou** tocar no objeto (seleciona) e depois tocar no destino.
- **Sem leitura obrigatória, backend, anúncios, compras, contas, notificações,
  coleta de dados ou permissões.** Nubi nunca sofre: sem fome, barras, vidas,
  punição, sequência diária ou culpa por ausência. A volta é sempre acolhedora.

## Recorte do MVP (seção 11 do briefing)

**1 personagem, 3 cômodos, 4 brincadeiras** + recepção:

| Cômodo | Brincadeira | Objetos |
|---|---|---|
| Cozinha | Alimentar | 4 alimentos (frutinha azul, morango, banana, pera) |
| Banheiro | Banho | esponja, chuveirinho, toalha, patinho |
| Quarto | Vestir | 3 acessórios (chapéu, capa, botas) |
| Quarto | Bola | bola macia + cesto |

Mais: navegação entre cômodos, álbum de descobertas, controles de áudio
(música/efeitos/falas separados), redução de movimento, área dos responsáveis
(3 modos: Explorar/Experimentar/Resolver), e salvamento local.

## Reações implementadas

- **Frutinha azul** → corpo azul (persiste até enxágue/outra cor).
- **Morango** → bolhas em formato de coração.
- **Banana** → tufo vira lua crescente por um instante.
- **Pera** → bochechas infladas + assobio.
- **Banho:** esponja faz espuma (azul se o Nubi estiver tingido); chuveirinho
  enxágua (espuma some, **cor volta à base**); toalha seca e deixa o **pelo
  fofo**; patinho faz som.
- **Vestir:** chapéu/capa/botas encaixam com folga; trocar substitui só a peça
  do mesmo espaço; **combinam** entre si; com pelo fofo o chapéu sobe e desce
  devagar.
- **Bola:** quica ao toque, arrasta para reposicionar, desliza para rolar;
  cair no cesto comemora (assistência discreta perto do cesto); nunca "derrota".

Combinações prioritárias do briefing cobertas: fruta azul + esponja (espuma
azul, enxágue restaura), banho + toalha + chapéu (pelo fofo sustenta o chapéu),
capa + bola (pose antes de devolver — a capa muda a pose/visual).

## Arquitetura (data-driven, modular)

```
src/
  main.js                   bootstrap: Nubi + 3 cômodos + sistemas + loop
  core/events.js            barramento de eventos
  core/viewport.js          canvas responsivo paisagem + design->px
  core/input.js             um dedo: arraste E toque-e-destino
  core/scene_manager.js     troca de cômodos (Nubi compartilhado/persistente)
  entities/nubi.js          personagem: estado + efeitos de aparência + animação
  entities/food_item.js     alimento arrastável, volta-para-casa
  scenes/kitchen.js         fundo da cozinha
  scenes/kitchen_room.js    cômodo cozinha (alimentar)
  scenes/bathroom_room.js   cômodo banheiro (banho)
  scenes/bedroom_room.js    cômodo quarto (vestir + bola)
  systems/effects.js        partículas + aplicação de efeitos
  systems/audio.js          vocalizações originais, canais separados
  systems/save.js           salvamento local (cor, roupas, descobertas, modo)
  data/foods.js             DADOS: alimentos e regras de reação
  ui/album.js               álbum de descobertas (overlay)
  ui/parent_gate.js         área dos responsáveis (segurar p/ abrir) + modos
  ui/hand_demo.js           mãozinha demonstrando o gesto
```

Estado principal (parado/comendo/banho/vestindo/brincando) é **separado** dos
efeitos de aparência (cor, espuma, umidade, pelo fofo, acessórios). Cada efeito
tem encerramento seguro. Adicionar um alimento = **uma entrada** em
`data/foods.js`.

## Como executar

```bash
cd nubi-casa-magica
python -m http.server 8000 --bind 127.0.0.1
# abra http://127.0.0.1:8000 e gire para paisagem
```
Precisa ser via servidor (ES modules não carregam de `file://`).

## Testes realizados (de verdade — Playwright headless)

- `test/play.test.js` — Etapa 1: arrasta a fruta, confirma mudança de cor + descoberta.
- `test/stage2.test.js` — Etapa 2: os 4 alimentos geram as 4 descobertas distintas.
- `test/mvp.test.js` — **aceitação do MVP**, 10 verificações, todas **PASS**:
  3 cômodos; alimentar→azul; banho (espuma→enxágue restaura cor→toalha fofo→patinho);
  vestir os 3 acessórios com substituição; bola no cesto; descobertas e roupas
  persistem após recarregar; **zero erros de página**.

Capturas reais: `preview-etapa1.png`, `preview-etapa2.png`, `preview-mvp.png`,
`preview-vestido.png`.

**Não executado** (declarado honestamente): build/instalação em aparelho
Android, medição de desempenho em dispositivo real, e teste com crianças. Não há
dados sobre esses itens porque não foram rodados neste ambiente (sem Android SDK).

## Provisório (não é arte final)

Toda a arte (Nubi, objetos, cômodos) é **formas 2D provisórias**; vocalizações
são tons sintetizados, não locução final. A silhueta do Nubi foi mantida
reconhecível em todas as combinações.

## Próximo incremento

Etapa 6 (validação Android: empacotar via Capacitor/TWA, testar em aparelho,
medir desempenho) e Etapa 7 (expansões: jardim, música, ateliê, sonhos, festa —
um capítulo por vez, reaproveitando o núcleo).
