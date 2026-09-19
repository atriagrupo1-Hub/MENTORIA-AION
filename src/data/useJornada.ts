import { useMemo } from "react";
import {
  estadoDoModulo,
  percentual,
  pontoDeRetomada,
  type EstadoModulo,
} from "./derivados";
import { useEstado } from "./estado";

/** Números que as telas Início, Módulos e Perfil compartilham. */
export function useJornada() {
  const estado = useEstado();
  const {
    catalogo,
    moduloLiberado,
    moduloVisivel,
    moduloAbreEm,
    aulaBloqueada,
    concluida,
    posicaoSegundos,
    atualizadaEm,
  } = estado;

  return useMemo(() => {
    /*
     * Só os módulos que a aluna tem.
     *
     * Módulo sem nenhuma aula atribuída a ela não é bloqueio: é ausência.
     * Some da jornada inteira — Início, Módulos e Perfil — e o percentual
     * passa a ser sobre o curso DELA. Uma aluna que entrou no Módulo 2 vê
     * "3 de 39 aulas", e não "3 de 50", que a faria pensar que perdeu algo.
     */
    /*
     * E só os do produto da jornada.
     *
     * `modulos` deixou de ser só o curso: um e-book também é um
     * módulo. Sem este filtro, "Minha jornada" misturaria o e-book com
     * a mentoria e o percentual passaria a contar as páginas dele.
     * Qual produto é a jornada está em `configuracoes`, e vem no
     * catálogo.
     */
    const doCurso = catalogo.produtoJornada
      ? catalogo.modulos.filter((m) => m.produtoId === catalogo.produtoJornada)
      : catalogo.modulos;

    const meus = doCurso.filter(moduloVisivel);

    const modulos: EstadoModulo[] = meus.map((m) =>
      estadoDoModulo(m, moduloLiberado(m), concluida, moduloAbreEm(m)),
    );

    const totalAulas = meus.reduce((s, m) => s + m.aulas.length, 0);
    const totalConcluidas = modulos.reduce((s, m) => s + m.concluidas, 0);
    const retomada = pontoDeRetomada(meus, {
      moduloLiberado,
      aulaBloqueada,
      concluida,
      posicaoSegundos,
      atualizadaEm,
    });
    const moduloAtual = retomada?.modulo ?? meus[0];

    return {
      modulos,
      totalAulas,
      totalConcluidas,
      percentualGeral: percentual(totalConcluidas, totalAulas),
      liberados: modulos.filter((m) => m.liberado).length,
      retomada,
      moduloAtual,
    };
  }, [
    catalogo,
    moduloLiberado,
    moduloVisivel,
    moduloAbreEm,
    aulaBloqueada,
    concluida,
    posicaoSegundos,
    atualizadaEm,
  ]);
}
