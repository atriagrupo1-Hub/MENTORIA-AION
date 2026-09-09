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
  const { catalogo, moduloLiberado, moduloVisivel, aulaBloqueada, concluida } = estado;

  return useMemo(() => {
    /*
     * Só os módulos que a aluna tem.
     *
     * Módulo sem nenhuma aula atribuída a ela não é bloqueio: é ausência.
     * Some da jornada inteira — Início, Módulos e Perfil — e o percentual
     * passa a ser sobre o curso DELA. Uma aluna que entrou no Módulo 2 vê
     * "3 de 39 aulas", e não "3 de 50", que a faria pensar que perdeu algo.
     */
    const meus = catalogo.modulos.filter(moduloVisivel);

    const modulos: EstadoModulo[] = meus.map((m) =>
      estadoDoModulo(m, moduloLiberado(m), concluida),
    );

    const totalAulas = meus.reduce((s, m) => s + m.aulas.length, 0);
    const totalConcluidas = modulos.reduce((s, m) => s + m.concluidas, 0);
    const retomada = pontoDeRetomada(meus, moduloLiberado, aulaBloqueada, concluida);
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
  }, [catalogo, moduloLiberado, moduloVisivel, aulaBloqueada, concluida]);
}
