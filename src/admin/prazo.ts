/**
 * Leitura humana do prazo de acesso.
 *
 * O banco guarda um instante; a administradora precisa de três coisas
 * diferentes na tela: a data em que termina, quanto falta, e quanto foi
 * dado no total. Nada disto decide acesso — quem decide é o banco, em
 * `conta_ativa()`. Aqui é só apresentação.
 */

const DIA = 86_400_000;

export function dataCurta(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Dias inteiros de agora até a data. Negativo quando já passou. */
export function diasAte(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / DIA);
}

/** Dias inteiros entre o cadastro e o fim do prazo. */
export function diasConcedidos(criadaEm: string, acessoAte: string | null): number | null {
  if (!acessoAte) return null;
  return Math.round((new Date(acessoAte).getTime() - new Date(criadaEm).getTime()) / DIA);
}

/** "1 ano e 2 meses", "45 dias" — a partir de uma contagem de dias. */
export function emPalavras(dias: number): string {
  const d = Math.abs(dias);
  if (d < 31) return `${d} ${d === 1 ? "dia" : "dias"}`;
  if (d < 365) {
    const meses = Math.round(d / 30);
    return `${meses} ${meses === 1 ? "mês" : "meses"}`;
  }
  const anos = Math.floor(d / 365);
  const meses = Math.round((d % 365) / 30);
  const parteAnos = `${anos} ${anos === 1 ? "ano" : "anos"}`;
  if (meses === 0) return parteAnos;
  return `${parteAnos} e ${meses} ${meses === 1 ? "mês" : "meses"}`;
}

/**
 * O verbo acompanha o número: "Falta 1 ano", mas "Faltam 2 anos".
 * Só é singular quando a contagem inteira é uma unidade só.
 */
function faltaOuFaltam(tempo: string): string {
  return /^1 (dia|mês|ano)$/.test(tempo) ? "Falta" : "Faltam";
}

export type EstadoPrazo = {
  rotulo: string;
  vencido: boolean;
  perto: boolean;
  semPrazo: boolean;
};

/** Como o prazo aparece na etiqueta ao lado do nome. */
export function estadoDoPrazo(acessoAte: string | null): EstadoPrazo {
  if (!acessoAte) {
    return { rotulo: "Sem prazo", vencido: false, perto: false, semPrazo: true };
  }
  const dias = diasAte(acessoAte)!;
  if (dias < 0) {
    return {
      rotulo: `Vencido há ${emPalavras(dias)}`,
      vencido: true,
      perto: false,
      semPrazo: false,
    };
  }
  if (dias === 0) {
    return { rotulo: "Vence hoje", vencido: false, perto: true, semPrazo: false };
  }
  const tempo = emPalavras(dias);
  return {
    rotulo: `${faltaOuFaltam(tempo)} ${tempo}`,
    vencido: false,
    perto: dias <= 30,
    semPrazo: false,
  };
}

/**
 * Esta aluna precisa de renovação?
 *
 * Verdadeiro quando falta um mês ou menos — e também quando o prazo já
 * passou. As duas coisas pedem a mesma atitude: falar com ela sobre
 * renovar. Separar em dois contadores esconderia a mais urgente num
 * canto, e a lista já distingue as duas na etiqueta de cada linha,
 * "Faltam 12 dias" de um lado e "Vencido há 3 dias" do outro.
 *
 * Sem prazo nunca precisa: acesso sem data de fim não vence.
 */
export function precisaRenovar(acessoAte: string | null): boolean {
  const e = estadoDoPrazo(acessoAte);
  return !e.semPrazo && (e.perto || e.vencido);
}
