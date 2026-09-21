import { createContext, useContext, useEffect } from "react";

/**
 * Tela cheia: a tela aberta é a única na tela.
 *
 * Abrir uma categoria ou um curso já escondia a LISTAGEM, mas a moldura
 * do painel continuava ali em cima — a marca, o título com as
 * contagens, as abas. Quem estava montando um curso tinha o trabalho
 * começando na metade de baixo da tela, com cinco atalhos para sair
 * dele por cima.
 *
 * Agora a moldura sai junto. O que não está em uso fica atrás; o
 * VOLTAR da própria tela é o caminho de saída, e ao voltar a moldura
 * reaparece.
 *
 * Quem liga isto é o `Voltar`, e não cada tela: renderizar um "voltar"
 * é exatamente o que define uma tela aberta. Telas novas ganham o
 * comportamento sem precisar lembrar dele.
 */
const Contexto = createContext<(ligada: boolean) => void>(() => {});

export const ProvedorTelaCheia = Contexto.Provider;

export function useTelaCheia(ligada = true) {
  const avisar = useContext(Contexto);
  useEffect(() => {
    avisar(ligada);
    /*
     * Desligar na saída, e não só ao trocar de valor: fechando a tela,
     * o painel tem de voltar inteiro. A ordem é a que o React garante —
     * a limpeza da tela que sai roda antes do efeito da que entra —, e
     * por isso abrir uma tela a partir de outra não apaga o estado.
     */
    return () => avisar(false);
  }, [avisar, ligada]);
}
