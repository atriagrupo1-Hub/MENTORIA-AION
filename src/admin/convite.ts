import { linkWhatsApp } from "./celular";
import { enderecoDaMentoria } from "@/enderecos";

/**
 * O convite que a aluna recebe.
 *
 * Isto existia como "Olá, Fulana!" e mais nada. Os três dados de que
 * ela precisa — o endereço, o nome de acesso e o código — eram
 * digitados à mão a cada cadastro, lidos de volta do cartão dela. São
 * exatamente os três que não podem sair errados: um dígito trocado no
 * código e a aluna escreve dizendo que o acesso não funciona, e alguém
 * gasta meia hora procurando um defeito que não existe.
 *
 * O endereço é montado na hora, e não guardado numa configuração. O
 * painel mora no mesmo domínio que a área da aluna — ele em
 * `/admappmentoria`, ela em `/appmentoria` — então basta juntar a
 * origem de onde esta tela está aberta com o caminho dela. Uma
 * configuração seria um segundo lugar para o endereço envelhecer no
 * dia em que o domínio mudar, e ele já mudou uma vez.
 */

const MENTORIA = "Caminho do Desbloqueio";

export function mensagemDeBoasVindas({
  nome,
  login,
  codigo,
}: {
  nome: string;
  login: string;
  codigo: string;
}): string {
  const primeiro = nome.trim().split(/\s+/)[0] || nome.trim();
  return [
    `Olá, ${primeiro}! Seu acesso à mentoria ${MENTORIA} está pronto.`,
    "",
    `Entre por aqui: ${enderecoDaMentoria()}`,
    `Nome de acesso: ${login}`,
    `Código: ${codigo}`,
    "",
    "Guarde este código — é com ele que você entra, sempre.",
  ].join("\n");
}

/**
 * O link do WhatsApp já com o convite dentro.
 *
 * Nulo quando não há celular cadastrado, como antes: melhor botão
 * ausente que botão levando a uma conversa com um número que não é
 * dela.
 */
export function convitePeloWhatsApp(
  celular: string | null,
  dados: { nome: string; login: string; codigo: string },
): string | null {
  return linkWhatsApp(celular, mensagemDeBoasVindas(dados));
}
