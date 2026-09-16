import { paleta } from "@/design/tokens";
import type { Aula, Modulo } from "./tipos";

export function percentual(feito: number, total: number): number {
  return total ? Math.round((feito / total) * 100) : 0;
}

/**
 * Quando a aula abre, do jeito que a aluna pensa a data.
 *
 * Perto, ela conta em dias: "hoje", "amanhã", "em 3 dias". Longe, ela
 * quer a data — e este cronograma vai até maio de 2027, então o ano
 * entra quando não é o atual. Sem o ano, "12 de maio" numa lista que
 * atravessa a virada é uma pegadinha.
 *
 * A conta é por DIA no calendário, não por 24 horas. Uma aula que abre
 * às 3 da manhã de amanhã está a poucas horas daqui, e dizer "hoje"
 * porque ainda não deu um dia inteiro seria mentira — a aluna que
 * abrir o aplicativo hoje à noite não vai encontrar nada.
 */
export function quandoAbre(iso: string, agora: Date = new Date()): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "em breve";

  const meiaNoite = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dias = Math.round(
    (meiaNoite(data).getTime() - meiaNoite(agora).getTime()) / 86_400_000,
  );

  if (dias <= 0) return "hoje";
  if (dias === 1) return "amanhã";
  if (dias <= 6) return `em ${dias} dias`;

  const mesmoAno = data.getFullYear() === agora.getFullYear();
  return data.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    ...(mesmoAno ? {} : { year: "numeric" }),
  });
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
  /**
   * Quando o módulo abre, para quem ainda não o tem.
   *
   * Nulo quando já está liberado, ou quando o cronograma dela ainda não
   * marcou data para nenhuma aula dele.
   */
  abreEm: string | null;
};

export function estadoDoModulo(
  modulo: Modulo,
  liberado: boolean,
  concluida: (aulaId: string) => boolean,
  abreEm: string | null = null,
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
    abreEm: liberado ? null : abreEm,
  };
}

/**
 * Rótulo de estado do módulo.
 *
 * Sem a palavra "módulo", de propósito. As três telas que usam este
 * rótulo já escrevem "Módulo 2 · " antes dele, e o resultado saía
 * "Módulo 2 · Módulo em andamento" — a mesma palavra duas vezes na
 * mesma linha, num rótulo de onze pixels que existe para ser lido de
 * relance.
 */
export function rotuloEstadoModulo(e: EstadoModulo, abreEm?: string | null): string {
  if (!e.liberado) return abreEm ? `Libera ${quandoAbre(abreEm)}` : "Libera em breve";
  if (e.completo) return "Concluído";
  if (e.concluidas > 0) return "Em andamento";
  return "Disponível";
}

export function rotuloAcaoModulo(e: EstadoModulo, abreEm?: string | null): string {
  if (!e.liberado) return abreEm ? `Libera ${quandoAbre(abreEm)}` : "Libera em breve";
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

export type Retomada = {
  modulo: Modulo;
  aula: Aula;
  /** Ela parou no meio desta aula: há um minuto para voltar. */
  retomando: boolean;
  /** O minuto onde parou. Zero quando é uma aula que ainda não começou. */
  segundos: number;
};

type AcessoDaRetomada = {
  moduloLiberado: (m: Modulo) => boolean;
  aulaBloqueada: (m: Modulo, a: Aula) => boolean;
  concluida: (aulaId: string) => boolean;
  posicaoSegundos: (aulaId: string) => number;
  atualizadaEm: (aulaId: string) => string | null;
};

/**
 * Onde a aluna retoma.
 *
 * A regra era "a primeira aula pendente", e ela erra justamente no caso
 * que dá nome ao bloco. Quem para no meio da aula 4 e volta no dia
 * seguinte era mandada para a aula 2, que tinha ficado para trás — o
 * aplicativo apontava para a mais antiga em aberto, não para onde ela
 * estava. E, achando a aula certa, ainda começava o vídeo do zero.
 *
 * Agora quem manda é a última vez que ela mexeu em cada aula, que é o
 * `atualizada_em` do `progresso` — a coluna que o banco já guardava e
 * que o aplicativo jogava fora. Três casos, nesta ordem:
 *
 *   1. a última aula que ela tocou e não terminou → volta para ela, no
 *      minuto onde parou;
 *   2. terminou a última que tocou → a próxima pendente depois dela, do
 *      começo, que é o passo natural;
 *   3. nunca assistiu nada → a primeira pendente, como antes. É o caso
 *      da aluna que acabou de entrar.
 */
export function pontoDeRetomada(
  modulos: Modulo[],
  acesso: AcessoDaRetomada,
): Retomada | null {
  const { moduloLiberado, aulaBloqueada, concluida, posicaoSegundos, atualizadaEm } = acesso;

  // A jornada dela em fila única, na ordem em que as aulas acontecem.
  const fila: { modulo: Modulo; aula: Aula }[] = [];
  for (const modulo of modulos) {
    if (!moduloLiberado(modulo)) continue;
    for (const aula of modulo.aulas) {
      if (!aulaBloqueada(modulo, aula)) fila.push({ modulo, aula });
    }
  }
  if (fila.length === 0) return null;

  const pendente = (i: number) => fila.slice(i).find((f) => !concluida(f.aula.id)) ?? null;

  let ultima = -1;
  let quando = "";
  fila.forEach((f, i) => {
    const data = atualizadaEm(f.aula.id);
    if (data && data > quando) {
      quando = data;
      ultima = i;
    }
  });

  if (ultima >= 0) {
    const f = fila[ultima];
    if (!concluida(f.aula.id)) {
      return { ...f, retomando: posicaoSegundos(f.aula.id) > 0, segundos: posicaoSegundos(f.aula.id) };
    }
    const seguinte = pendente(ultima + 1) ?? pendente(0);
    if (seguinte) return { ...seguinte, retomando: false, segundos: 0 };
  }

  const primeira = pendente(0);
  if (primeira) return { ...primeira, retomando: false, segundos: 0 };
  // Tudo concluído: ela revê a primeira.
  return { ...fila[0], retomando: false, segundos: 0 };
}

/** Título do módulo em caixa de frase, como na tela da aula. */
export function tituloEmFrase(titulo: string): string {
  return titulo
    .toLowerCase()
    .replace(/(^|[\s(])([a-zà-ú])/g, (_s, p: string, c: string) => p + c.toUpperCase())
    .replace(/\b(E|Da|De|Do|Das|Dos|A|O|As|Os|Em|Para)\b/g, (w) => w.toLowerCase());
}
