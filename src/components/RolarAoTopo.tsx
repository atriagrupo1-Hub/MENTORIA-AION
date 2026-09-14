import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Tela nova começa do começo.
 *
 * O navegador guarda a posição da rolagem quando o endereço muda sem
 * recarregar a página — e num aplicativo de uma página só, que é o
 * nosso caso, é sempre assim. Sem isto: a aluna descia a lista de
 * módulos, abria um, e a página do módulo abria no meio, com a capa
 * fora da tela. Depois voltava, entrava numa aula, e a aula abria
 * abaixo do vídeo.
 *
 * Não era um defeito visível — não há erro, nada pisca. É pior: a tela
 * simplesmente parecia errada, sem explicação, e a aluna rolava para
 * cima toda vez sem saber por quê.
 *
 * A exceção é o botão voltar do aparelho. Aí a aluna está retornando a
 * um lugar onde já esteve, e jogá-la para o topo apagaria justamente o
 * que ela quer reencontrar — a fileira onde tinha parado. `POP` é como
 * o roteador chama essa volta; nesses casos a posição que o navegador
 * guardou é a certa, e quem manda é ele.
 *
 * Sem animação de propósito: rolagem suave aqui brigaria com a entrada
 * da tela, e o resultado é a página chegando montada e escorregando
 * depois. Salta, e o salto não se vê porque a tela ainda está entrando.
 */
export function RolarAoTopo() {
  const { pathname } = useLocation();
  const tipo = useNavigationType();

  useEffect(() => {
    if (tipo === "POP") return;
    window.scrollTo(0, 0);
  }, [pathname, tipo]);

  return null;
}
