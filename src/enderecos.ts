/**
 * Onde cada porta do aplicativo mora.
 *
 * O domínio passou a ser `souaion.com`, e ele não é só da mentoria —
 * por isso o aplicativo vive dentro de um caminho, e não na raiz:
 *
 *   souaion.com/appmentoria      a área da aluna
 *   souaion.com/admappmentoria   o painel
 *   souaion.com                  nada
 *
 * Os dois caminhos são IRMÃOS, não pai e filho, e é isso que decide o
 * desenho. Um roteador só tem um `basename`; com um deles dentro do
 * outro bastaria escrever `/appmentoria` uma vez. Como são irmãos,
 * quem escolhe o `basename` é a porta por onde a pessoa entrou — está
 * em `main.tsx`.
 *
 * O ganho de fazer assim: as rotas internas da área da aluna
 * (`/inicio`, `/modulo/3`, `/aula/1/2`) continuam escritas como sempre
 * estiveram, nas vinte e quatro navegações espalhadas pelas telas. O
 * `basename` põe o prefixo em todas de uma vez. Trocar o caminho
 * amanhã é mudar as duas linhas abaixo.
 *
 * Nenhum domínio aparece aqui, de propósito: o endereço é sempre o de
 * onde a tela está aberta. É o que deixa o convite da aluna acertar
 * sozinho no dia seguinte a uma troca de domínio.
 */

export const CAMINHO_APP = "/appmentoria";
export const CAMINHO_PAINEL = "/admappmentoria";

/** O endereço completo da área da aluna, para o convite dela. */
export function enderecoDaMentoria(): string {
  if (typeof window === "undefined") return CAMINHO_APP;
  return window.location.origin.replace(/\/+$/, "") + CAMINHO_APP;
}
