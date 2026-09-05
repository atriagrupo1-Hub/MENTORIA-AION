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
  const { catalogo, moduloLiberado, aulaBloqueada, concluida } = estado;

  return useMemo(() => {
    const modulos: EstadoModulo[] = catalogo.modulos.map((m) =>
      estadoDoModulo(m, moduloLiberado(m), concluida),
    );

    const totalAulas = catalogo.modulos.reduce((s, m) => s + m.aulas.length, 0);
    const totalConcluidas = modulos.reduce((s, m) => s + m.concluidas, 0);
    const retomada = pontoDeRetomada(
      catalogo.modulos,
      moduloLiberado,
      aulaBloqueada,
      concluida,
    );
    const moduloAtual = retomada?.modulo ?? catalogo.modulos[0];

    return {
      modulos,
      totalAulas,
      totalConcluidas,
      percentualGeral: percentual(totalConcluidas, totalAulas),
      liberados: modulos.filter((m) => m.liberado).length,
      retomada,
      moduloAtual,
    };
  }, [catalogo, moduloLiberado, aulaBloqueada, concluida]);
}
