import { Cadeado } from "./Icones";

/**
 * O que a aluna vê quando ainda não tem conteúdo.
 *
 * Estado alcançável de verdade: cadastrada, entrando pela primeira vez,
 * antes de a administradora montar o cronograma dela. É o primeiro
 * contato dela com o produto — precisa dizer o que está acontecendo, e
 * não deixar uma tela vazia com controles soltos.
 *
 * Os textos são os aprovados no protótipo, verbatim.
 */
export function SemConteudo() {
  return (
    <section
      className="mt-1 rounded-cartao-lg px-[22px] py-[34px] text-center"
      style={{
        background: "rgba(255,255,255,.03)",
        border: "1px solid rgba(255,255,255,.1)",
      }}
    >
      <span className="mb-[14px] inline-flex">
        <Cadeado largura={28} cor="rgba(255,255,255,.4)" corArco="rgba(255,255,255,.5)" />
      </span>
      <p
        className="text-titulo m-0 font-titulo text-marfim"
      >
        Seu conteúdo será liberado em breve.
      </p>
      <p className="mb-0 mt-[10px] text-corpo text-[rgba(243,236,225,.6)]">
        Assim que a primeira aula estiver disponível, ela aparecerá aqui.
      </p>
    </section>
  );
}
