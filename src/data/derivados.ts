import { paleta } from "@/design/tokens";
import type { Aula, Modulo } from "./tipos";

export function percentual(feito: number, total: number): number {
  return total ? Math.round((feito / total) * 100) : 0;
}

export type EstadoModulo = {
  modulo: Modulo;
  liberado: boolean;
  concluidas: number;
  total: number;
  percentual: number;
  completo: boolean;
  emAndamento: boolean;
  destaque: string;
  rgb: string;
};

export function estadoDoModulo(
  modulo: Modulo,
  liberado: boolean,
  concluida: (aulaId: string) => boolean,
): EstadoModulo {
  const total = modulo.aulas.length;
  const concluidas = modulo.aulas.filter((a) => concluida(a.id)).length;
  const completo = total > 0 && concluidas === total;
  const cor = paleta(modulo.numero);
  return {
    modulo,
    liberado,
    concluidas,
    total,
    percentual: percentual(concluidas, total),
    completo,
    emAndamento: liberado && concluidas > 0 && !completo,
    destaque: cor.destaque,
    rgb: cor.rgb,
  };
}

/** Rótulo de estado do módulo, verbatim do protótipo. */
export function rotuloEstadoModulo(e: EstadoModulo): string {
  if (!e.liberado) return "Libera em breve";
  if (e.completo) return "Módulo concluído";
  if (e.concluidas > 0) return "Módulo em andamento";
  return "Disponível";
}

export function rotuloAcaoModulo(e: EstadoModulo): string {
  if (!e.liberado) return "Libera em breve";
  return e.completo ? "Assistir de novo" : "Assistir agora";
}

export function rotuloBotaoModulo(e: EstadoModulo): string {
  if (e.concluidas === 0) return "Iniciar módulo";
  if (e.completo) return "Rever módulo";
  return "Continuar módulo";
}

export function rotuloConcluidas(quantidade: number): string {
  return quantidade === 1 ? "1 concluída" : `${quantidade} concluídas`;
}

/**
 * Onde a aluna retoma: a primeira aula não concluída e não bloqueada do
 * primeiro módulo liberado.
 */
export function pontoDeRetomada(
  modulos: Modulo[],
  moduloLiberado: (m: Modulo) => boolean,
  aulaBloqueada: (m: Modulo, a: Aula) => boolean,
  concluida: (aulaId: string) => boolean,
): { modulo: Modulo; aula: Aula } | null {
  for (const modulo of modulos) {
    if (!moduloLiberado(modulo)) continue;
    const aula = modulo.aulas.find(
      (a) => !concluida(a.id) && !aulaBloqueada(modulo, a),
    );
    if (aula) return { modulo, aula };
  }
  for (const modulo of modulos) {
    if (!moduloLiberado(modulo)) continue;
    const aula = modulo.aulas.find((a) => !aulaBloqueada(modulo, a));
    if (aula) return { modulo, aula };
  }
  return null;
}

/** Título do módulo em caixa de frase, como na tela da aula. */
export function tituloEmFrase(titulo: string): string {
  return titulo
    .toLowerCase()
    .replace(/(^|[\s(])([a-zà-ú])/g, (_s, p: string, c: string) => p + c.toUpperCase())
    .replace(/\b(E|Da|De|Do|Das|Dos|A|O|As|Os|Em|Para)\b/g, (w) => w.toLowerCase());
}
