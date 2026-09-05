/**
 * Identidade visual — item 3 do README do handoff.
 * Valores aprovados pelo cliente. Não redesenhar.
 */

export const cores = {
  fundo: "#000000",
  cartao: "linear-gradient(165deg, rgba(16,24,42,.85), rgba(6,9,18,.88))",
  cartaoForte: "linear-gradient(170deg, rgba(16,24,42,.94), rgba(6,9,18,.96))",
  texto: "#f6efe3",
  textoCorpo: "#f3ece1",
  textoSecundario: "rgba(243,236,225,.55)",
  textoSecundarioForte: "rgba(243,236,225,.72)",
  textoTerciario: "#8d8477",
  ouro: "#d4b170",
  ouroClaro: "#f0dca8",
  ouroMedio: "#e2c485",
  ouroSuave: "#e8cf9a",
  ouroEscuro: "#b8934f",
  ouroTexto: "#1a1408",
  botaoOuro: "linear-gradient(135deg, #f0dca8, #d4b170 55%, #b8934f)",
  vidro: "rgba(255,255,255,.1)",
  vidroBorda: "rgba(255,255,255,.4)",
  concluido: "#9dc08b",
  concluidoSelo: "#5cc98a",
  alerta: "#e6a89a",
  alertaForte: "#b4453c",
  verificado: "#1d9bf0",
  divisoria: "rgba(255,255,255,.08)",
  placeholderCapa: "linear-gradient(160deg, #131c33, #060911 55%, #101830)",
} as const;

/** Escala tipográfica do item 3, com `cqw` trocado por `vw`. */
export const tipografia = {
  marcaLogin: "clamp(21px, 5.4vw, 28px)",
  tituloTela: "clamp(21px, 4.8vw, 30px)",
  tituloModulo: "clamp(17px, 3.8vw, 26px)",
  tituloAula: "clamp(14px, 3.2vw, 20px)",
} as const;

export type CorModulo = { destaque: string; rgb: string };

/**
 * Cor por módulo, amostrada da própria capa (`PALETTE` no protótipo).
 * Usada no degradê do topo, na borda do cartão, no selo, na barra de
 * progresso e no percentual.
 */
export const PALETA: Record<number, CorModulo> = {
  0: { destaque: "#d9b273", rgb: "157,117,54" },
  1: { destaque: "#d4635c", rgb: "115,27,27" },
  2: { destaque: "#6fa4dc", rgb: "28,68,108" },
  3: { destaque: "#ab88d4", rgb: "87,49,109" },
  4: { destaque: "#8fbde8", rgb: "51,91,136" },
  5: { destaque: "#c3cd84", rgb: "121,128,58" },
  6: { destaque: "#e8ab61", rgb: "152,93,32" },
  7: { destaque: "#7fb6ee", rgb: "29,78,129" },
  8: { destaque: "#e793b4", rgb: "112,46,68" },
  9: { destaque: "#f0b96e", rgb: "144,98,55" },
  10: { destaque: "#f5c96a", rgb: "143,90,28" },
};

const NEUTRO: CorModulo = { destaque: "#c9b795", rgb: "180,160,125" };

export function paleta(numeroModulo: number): CorModulo {
  return PALETA[numeroModulo] ?? NEUTRO;
}

/**
 * Módulos cuja arte final já traz o título embutido — não recebem
 * título sobreposto (lista `ART` do protótipo).
 */
const COM_ARTE = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

export function temArte(numeroModulo: number): boolean {
  return COM_ARTE.has(numeroModulo);
}

/** Degradê do topo, com a cor do módulo em que a aluna está. */
export function fundoApp(numeroModulo: number): string {
  const c = paleta(numeroModulo).rgb;
  return `linear-gradient(180deg, rgba(${c},.95) 0px, rgba(${c},.5) 190px, rgba(0,0,0,.55) 340px, #000000 520px) no-repeat, #000000`;
}
