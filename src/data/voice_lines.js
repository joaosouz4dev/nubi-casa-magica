/* ============================================================
   FALAS DO BICHINHO - o que ele diz em voz alta (sem leitura obrigatória).
   - Reações e elogios: são os próprios balões (nubi.say), falados também.
   - Pedidos: o balão de pensamento só tem desenho; aqui está a frase que
     o bichinho fala quando o balão aparece (e de novo na ajuda).
   - Cômodos: o nome é falado ao entrar (vocabulário + orientação).
   Gravações: um arquivo em assets/voice/<id>.mp3 substitui a voz
   sintetizada daquela frase (id = voiceId(texto); a lista para gravar sai
   de scripts/voice-lines.mjs). Sem gravação, usa a voz do aparelho.
   ============================================================ */
import { FOODS } from "./foods.js";

// pedidos com frase própria (o resto cai nas regras por prefixo, abaixo)
export const WISH_LINES = {
  wake: null,                                  // dormindo: o primeiro toque acorda
  pet: "Faz carinho em mim?",
  tummy: "Cosquinha na barriga!",
  ears: "Lava minhas orelhas?",
  foam: "Vamos fazer espuma?",
  "foam:tinted": "Espuma colorida!",
  rinse: "Agora o chuveirinho!",
  dry: "Me seca com a toalha?",
  duck: "Cadê o patinho?",
  comb: "Penteia meu pelo?",
  "poop:flush": "Ops! Fiz cocô. Leva pro vaso?",
  "trash:bin": "Joga a casca no lixo?",
  "trash:out": "O lixo encheu!",
  "equip:hat": "Quero um chapéu!",
  "equip:hat:fluffy": "Chapéu no pelo fofinho!",
  "equip:cape": "Quero uma capa!",
  "equip:boots": "Quero botas!",
  "equip:face": "Óculos ou máscara?",
  "equip:neck": "Algo no pescoço!",
  "equip:body": "Uma roupinha!",
  look: "Escolhe um look pra mim?",
  "wear:gift": "Olha o presente no guarda-roupa!",
  basket: "Joga a bola no cesto!",
  "basket:cape": "Bola no cesto, de capa!",
  bounce: "Vamos brincar de bola?",
  "teeth:plaque": "Escova meus dentinhos?",
  "teeth:bugs": "Tira os bichinhos de açúcar!",
  "teeth:align": "Arruma o dentinho torto?",
  "teeth:rinse": "Agora o copinho!",
  "teeth:all": "Deixa meu sorriso brilhando!",
  hair: "Faz um penteado em mim?",
  haircolor: "Pinta meu cabelo?",
  hairacc: "Um enfeite no cabelo!",
  nails: "Pinta minhas unhas?",
  "nails:full": "Pinta todas as unhas!",
  nailart: "Adesivo na unha!",
  makeup: "Uma maquiagem?",
  paint: "Pintura no rosto!",
  beauty: "Vamos ao salão?",
  "pet:bunny": "Chama a Lili!",
  "pet:bear": "Chama o Tito!",
  "pet:nubi": "Chama o Nubi!",
  "hub:visit": "Vamos ver a casa?",
  prize: "Tem prêmio na mochila!",
  "garden:water": "Rega as plantinhas?",
  "garden:harvest": "Colhe a fruta?",
  "feedgroup:doces": "Quero um docinho!",
  "feedgroup:salgados": "Quero um salgadinho!",
  "feedgroup:frutas2": "Quero uma fruta!",
  "feed:special": "Quero o biscoito estrela!",
  "game:catch": "Vamos pegar frutas?",
  "game:bubbles": "Vamos estourar bolhas?",
  "game:memory": "Jogo da memória?",
  "game:music": "Vamos tocar música?",
  "game:shapes": "Vamos encaixar as formas?",
  "game:colors": "Vamos misturar cores?"
};

export const ROOM_NAMES = {
  hub: "Casa", kitchen: "Cozinha", bathroom: "Banheiro", garden: "Jardim",
  bedroom: "Quarto", dentist: "Dentista", salon: "Salão", games: "Brinquedos"
};
// "Vamos para ..." com o artigo certo
const ROOM_TO = {
  hub: "para a casa", kitchen: "para a cozinha", bathroom: "para o banheiro", garden: "para o jardim",
  bedroom: "para o quarto", dentist: "ao dentista", salon: "ao salão", games: "brincar no quarto de brinquedos"
};

/* Frase do pedido. elsewhere = o pedido é em outro cômodo: o bichinho
   chama para ir até lá (o balão mostra o cômodo). */
export function wishLine(w, elsewhere) {
  if (!w) return null;
  if (elsewhere && w.room && ROOM_TO[w.room]) return "Vamos " + ROOM_TO[w.room] + "?";
  if (Object.prototype.hasOwnProperty.call(WISH_LINES, w.act)) return WISH_LINES[w.act];
  if (w.act.startsWith("feed:")) {
    const f = FOODS[w.act.slice(5)];
    return f ? "Quero " + f.label + "!" : "Tô com fome!";
  }
  return null;
}

/* id estável de uma frase (nome do arquivo de gravação): sem acento,
   minúsculo, palavras com hífen. "Faz carinho em mim?" -> "faz-carinho-em-mim" */
export function voiceId(text) {
  return String(text).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// gravações disponíveis em assets/voice/ (ids). Vazio = só voz sintetizada.
export const RECORDED = new Set([]);
