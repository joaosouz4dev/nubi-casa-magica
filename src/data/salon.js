/* ============================================================
   SALÃO DE BELEZA - dados configuráveis. Tudo aberto a qualquer bichinho
   (nada travado por gênero); o lencinho remove tudo sem custo.
   Cada página do balcão mostra até 3 opções; um botão troca de página.
   kind:
     hair   -> penteado   (tap aplica)
     color  -> cor do cabelo (tap aplica)
     acc    -> enfeite de cabelo (tap aplica / tira)
     polish -> esmalte: arrastar até uma patinha pinta aquela patinha
     makeup -> maquiagem leve: arrastar até o rosto aplica
     paint  -> pintura de rosto de brincadeira: arrastar até o rosto aplica
     wipe   -> lencinho: arrastar sobre o rosto/patinhas limpa
   ============================================================ */
export const HAIR_STYLES = ["ponytail", "curls", "quiff", "mohawk", "braids"];
export const HAIR_COLORS = ["#8a5a36", "#f6cf3f", "#ff6b9d", "#5b8def", "#9be564"];

export const SALON_PAGES = [
  { id: "cabelo", station: "hair",  icon: "hair:curls", items: [
    { id: "h_ponytail", kind: "hair", value: "ponytail" },
    { id: "h_curls",    kind: "hair", value: "curls" },
    { id: "h_braids",   kind: "hair", value: "braids" } ] },
  { id: "cabelo2", station: "hair", icon: "hair:quiff", items: [
    { id: "h_quiff",    kind: "hair", value: "quiff" },
    { id: "h_mohawk",   kind: "hair", value: "mohawk" },
    { id: "h_none",     kind: "hair", value: null } ] },
  { id: "cores", station: "hair",   icon: "color:#ff6b9d", items: [
    { id: "c_brown",  kind: "color", value: "#8a5a36" },
    { id: "c_yellow", kind: "color", value: "#f6cf3f" },
    { id: "c_pink",   kind: "color", value: "#ff6b9d" } ] },
  { id: "cores2", station: "hair",  icon: "color:#5b8def", items: [
    { id: "c_blue",   kind: "color", value: "#5b8def" },
    { id: "c_green",  kind: "color", value: "#9be564" },
    { id: "a_bow",    kind: "acc",   value: "bow" } ] },
  { id: "enfeites", station: "hair", icon: "acc:flower", items: [
    { id: "a_flower", kind: "acc", value: "flower" },
    { id: "a_star",   kind: "acc", value: "starclip" },
    { id: "a_band",   kind: "acc", value: "headband" } ] },
  { id: "unhas", station: "nails",   icon: "polish:#e5484d", items: [
    { id: "p_red",    kind: "polish", value: "#e5484d" },
    { id: "p_pink",   kind: "polish", value: "#ff6bb5" },
    { id: "p_blue",   kind: "polish", value: "#4f7dff" } ] },
  { id: "unhas2", station: "nails",  icon: "polish:#9be564", items: [
    { id: "p_green",  kind: "polish", value: "#62c370" },
    { id: "p_gold",   kind: "polish", value: "#ffc93a" },
    { id: "p_purple", kind: "polish", value: "#9a55ff" } ] },
  { id: "maquiagem", station: "makeup", icon: "makeup:lips", items: [
    { id: "m_blush",  kind: "makeup", value: "blush" },
    { id: "m_shadow", kind: "makeup", value: "shadow" },
    { id: "m_lips",   kind: "makeup", value: "lips" } ] },
  { id: "pintura", station: "makeup", icon: "paint:mustache", items: [
    { id: "f_glitter",  kind: "makeup", value: "glitter" },
    { id: "f_mustache", kind: "paint",  value: "mustache" },
    { id: "f_hero",     kind: "paint",  value: "hero" } ] },
  { id: "pintura2", station: "makeup", icon: "paint:stars", items: [
    { id: "f_stars",    kind: "paint",  value: "stars" },
    { id: "f_freckles", kind: "paint",  value: "freckles" },
    { id: "f_beard",    kind: "paint",  value: "beard" } ] }
];
export const WIPE = { id: "wipe", kind: "wipe" };

/* As 3 estações do salão. Cada uma tem seu espaço, suas páginas e um
   enquadramento próprio do bichinho (close nas patinhas, no rosto...). */
SALON_PAGES.splice(SALON_PAGES.findIndex(p => p.id === "unhas2") + 1, 0,
  { id: "unhas3", station: "nails", icon: "star", items: [
    { id: "n_star",  kind: "nailart", value: "star" },
    { id: "n_heart", kind: "nailart", value: "heart" },
    { id: "p_white", kind: "polish",  value: "#ffffff" } ] });
export const STATIONS = {
  hair:   { id: "hair",   icon: "station:hair",   color: "#ffd54a", wipe: false },
  nails:  { id: "nails",  icon: "station:nails",  color: "#ff6bb5", wipe: true },
  makeup: { id: "makeup", icon: "station:makeup", color: "#b49cff", wipe: true }
};
export const STATION_ORDER = ["hair", "nails", "makeup"];
// ação do pedido -> estação onde ela acontece
export const ACT_STATION = { hair: "hair", haircolor: "hair", hairacc: "hair", nails: "nails", nailart: "nails", makeup: "makeup", paint: "makeup", beauty: "makeup", wipe: "makeup" };

// cores-padrão de cada maquiagem
export const MAKEUP_COLORS = { blush: "#ff7aa8", shadow: "#9a7bff", lips: "#e8426b", glitter: "#ffd54a" };
