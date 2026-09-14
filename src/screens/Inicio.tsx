import { useNavigate } from "react-router-dom";
import { Aviso } from "@/components/Aviso";
import { Barra } from "@/components/Barra";
import { Capa, capaAula, capaModulo } from "@/components/Capa";
import { Cadeado, Mais, Play } from "@/components/Icones";
import { SemConteudo } from "@/components/SemConteudo";
import { useAviso } from "@/components/useAviso";
import { rotuloAcaoModulo, rotuloConcluidas, type Retomada } from "@/data/derivados";
import { minutoFalado, minutosDaAula, rotuloDuracao, useEstado } from "@/data/estado";
import { useJornada } from "@/data/useJornada";
import { cores } from "@/design/tokens";
import { useRef } from "react";

export function Inicio() {
  const { concluida } = useEstado();
  const { modulos, retomada, totalConcluidas } = useJornada();
  const navegar = useNavigate();
  const aviso = useAviso();
  const fileira = useRef<HTMLDivElement>(null);

  /*
   * O que o bloco promete tem de ser o que ele faz.
   *
   * "Continuar de onde parei" aparecia sempre que houvesse uma aula
   * concluída em qualquer lugar da jornada, mesmo mandando a aluna para
   * o começo de uma aula que ela nunca abriu. Agora quem decide é a
   * própria retomada: só promete continuar quando há mesmo um minuto
   * guardado para voltar.
   */
  const retomando = retomada?.retomando ?? false;
  const kicker = retomando
    ? "Continue assistindo"
    : totalConcluidas === 0
      ? "Comece por aqui"
      : "Próxima aula";
  const acao = retomando
    ? `Voltar aos ${minutoFalado(retomada!.segundos)}`
    : totalConcluidas === 0
      ? "Começar a primeira aula"
      : "Assistir agora";

  function abrirModulo(numero: number, liberado: boolean) {
    if (!liberado) {
      aviso.mostrar(
        "Este módulo será liberado no momento certo da sua jornada.",
      );
      return;
    }
    navegar(`/modulo/${numero}`);
  }

  return (
    <main className="entra mx-auto max-w-[1360px] px-7 pb-24 pt-6 cel-sm:px-5">
      {/*
        O bloco de retomada tem largura própria.
        A página vai a 1360px, o que serve para a fileira de módulos.
        Para uma capa 16:9, porém, 1360 dão 765px de altura: a aluna
        abriria o site e veria uma imagem gigante antes de qualquer
        outra coisa, tendo de rolar para achar os módulos. 820px é a
        largura em que a capa continua imponente e o resto da jornada
        cabe na mesma tela.
      */}
      {retomada ? (
        <section className="mx-auto mt-1 max-w-[820px]">
          <div
            className="relative overflow-hidden rounded-botao"
            style={{
              border: "1px solid rgba(255,255,255,.1)",
              background: cores.placeholderCapa,
            }}
          >
            <Capa
              caminhos={[
                capaAula(retomada.modulo.numero, retomada.aula.ordem),
                capaModulo(retomada.modulo.numero),
              ]}
              alt="Capa da aula em andamento"
            />
            <div className="aspect-video" />
            {retomando ? (
              /*
               * A tira que a Netflix põe embaixo da capa. Ela responde
               * "quanto falta" antes de qualquer texto: a aluna vê num
               * relance se é um começo ou uma volta.
               */
              <span className="absolute inset-x-0 bottom-0 h-[3px] bg-white/25">
                <span
                  className="block h-full bg-white"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        (retomada!.segundos /
                          (minutosDaAula(retomada!.modulo, retomada!.aula) * 60)) *
                          100,
                      ),
                    )}%`,
                  }}
                />
              </span>
            ) : null}
          </div>

          <div className="flex flex-col gap-1 pt-3">
            <p className="m-0 text-rotulo uppercase tracking-rotulo text-white/55">
              {kicker}
            </p>
            <p className="m-0 text-apoio text-white/60">
              Módulo {retomada.modulo.numero} — {retomada.modulo.titulo}
            </p>
            <h2 className="m-0 text-corpo font-bold leading-[1.3] text-white">
              Aula {retomada.aula.numero} — {retomada.aula.titulo}
            </h2>
            <p className="m-0 text-apoio text-white/55">
              {rotuloDuracao(retomada.modulo, retomada.aula)} ·{" "}
              {retomando
                ? `faltam ${faltamMinutos(retomada)} min`
                : concluida(retomada.aula.id)
                  ? "Aula concluída"
                  : "Disponível agora"}
            </p>
          </div>

          <div className="flex w-full flex-wrap justify-center gap-3 pt-3 cel:flex-col">
            <button
              onClick={() =>
                navegar(
                  `/aula/${retomada.modulo.numero}/${retomada.aula.ordem}`,
                )
              }
              className="flex min-h-[56px] min-w-[240px] flex-1 items-center justify-center gap-3 rounded-pilula border-none bg-white px-7 py-4 text-realce font-bold text-black transition-opacity hover:opacity-[.86] cel:w-full cel:min-w-0"
              style={{ cursor: "pointer" }}
            >
              <Play />
              {acao}
            </button>
            <button
              onClick={() => navegar(`/modulo/${retomada.modulo.numero}`)}
              className="flex min-h-[56px] min-w-[240px] flex-1 items-center justify-center gap-3 rounded-pilula border-none px-7 py-4 text-realce font-bold text-white cel:w-full cel:min-w-0"
              style={{
                background: "rgba(255,255,255,.22)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                cursor: "pointer",
              }}
            >
              <Mais />
              Ver módulo
            </button>
          </div>
        </section>
      ) : (
        <SemConteudo />
      )}

      {/*
        Sem módulo nenhum, a seção inteira sai — inclusive as setas.
        Uma aluna recém-cadastrada, antes de você montar o cronograma
        dela, via um vazio grande com duas setas navegando o nada. É o
        primeiro contato dela com o produto, e o aviso deve ocupar a
        tela sozinho.
      */}
      {modulos.length > 0 ? (
        <section className="mt-10">
          <div className="mb-6 flex flex-wrap items-end gap-5">
            <div className="flex-[1_1_280px]" />
            <div className="flex gap-3 cel:hidden">
              {[
                { rotulo: "Voltar nos módulos", glifo: "‹", passo: -560 },
                { rotulo: "Avançar nos módulos", glifo: "›", passo: 560 },
              ].map((seta) => (
                <button
                  key={seta.rotulo}
                  onClick={() =>
                    fileira.current?.scrollBy({
                      left: seta.passo,
                      behavior: "smooth",
                    })
                  }
                  aria-label={seta.rotulo}
                  className="h-14 w-14 rounded-full text-titulo text-marfim-corpo"
                  style={{
                    background: "rgba(255,255,255,.14)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {seta.glifo}
                </button>
              ))}
            </div>
          </div>

          <div
            ref={fileira}
            /*
             * Fileira deslizante também no celular.
             *
             * Ela virava uma coluna de um cartão por linha. Com os três
             * módulos de teste isso parecia bom; com os onze de verdade
             * a tela Início passou a ter 7.354 pixels de altura — quase
             * nove telas de rolagem, medidas no aplicativo publicado.
             * O módulo 11 ficava a oito arrastadas de distância.
             *
             * Deslizando de lado, a jornada inteira cabe num gesto, e a
             * tela volta a ter o tamanho de uma tela. É o que Netflix
             * faz com um catálogo, e pela mesma razão.
             */
            className="sem-barra flex gap-4 overflow-x-auto pb-6 pt-2 cel:gap-3"
            style={{ scrollSnapType: "x mandatory", scrollBehavior: "smooth" }}
          >
            {modulos.map((e) => (
              <button
                key={e.modulo.id}
                onClick={() => abrirModulo(e.modulo.numero, e.liberado)}
                className="flex flex-[0_0_clamp(196px,62vw,252px)] flex-col gap-4 border-none bg-transparent p-0 text-left"
                style={{ scrollSnapAlign: "start", cursor: "pointer" }}
              >
                <span
                  className="relative block aspect-[2/3] w-full overflow-hidden rounded-cartao transition-transform duration-500 ease-suave hover:-translate-y-[6px]"
                  style={{
                    background: cores.placeholderCapa,
                    border: `1px solid ${
                      e.emAndamento
                        ? `rgba(${e.rgb},.75)`
                        : e.liberado
                          ? `rgba(${e.rgb},.32)`
                          : "rgba(243,236,225,.1)"
                    }`,
                    opacity: e.liberado ? 1 : 0.42,
                    boxShadow: "0 20px 44px -30px rgba(0,0,0,.9)",
                  }}
                >
                  <Capa
                    caminhos={[capaModulo(e.modulo.numero)]}
                    alt={`Capa do Módulo ${e.modulo.numero} — ${e.modulo.titulo}`}
                  />
                  {e.modulo.tituloNaArte ? (
                    <span
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(5,8,16,.6) 0%, rgba(5,8,16,.1) 34%, rgba(8,7,10,0) 60%)",
                      }}
                    />
                  ) : (
                    <>
                      <span
                        className="absolute inset-0"
                        style={{
                          background:
                            "linear-gradient(180deg, rgba(5,8,16,.15) 0%, rgba(5,8,16,.55) 55%, rgba(5,8,16,.94) 100%)",
                        }}
                      />
                      <span className="absolute inset-x-5 bottom-5 flex flex-col gap-2">
                        <span
                          className="text-rotulo uppercase tracking-rotulo"
                          style={{ color: e.destaque }}
                        >
                          Módulo {e.modulo.numero}
                        </span>
                        <span className="font-titulo text-titulo leading-[1.15] text-marfim">
                          {e.modulo.titulo}
                        </span>
                      </span>
                    </>
                  )}

                  <span
                    className="absolute left-1/2 top-1/2 flex min-h-[32px] -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-2 whitespace-nowrap rounded-pilula px-4 py-2 text-apoio font-bold"
                    style={{
                      color: e.liberado ? "#000000" : "rgba(255,255,255,.85)",
                      background: e.liberado
                        ? "rgba(255,255,255,.88)"
                        : "rgba(255,255,255,.16)",
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                    }}
                  >
                    {e.liberado ? <Play tamanho={9} /> : null}
                    {rotuloAcaoModulo(e)}
                  </span>

                  {e.liberado ? null : (
                    <span className="absolute inset-0 flex flex-col items-center justify-center">
                      <Cadeado />
                    </span>
                  )}
                </span>

                <span className="flex flex-col gap-2">
                  <span className="flex justify-between text-corpo text-[#9a9287]">
                    <span>{e.total} aulas</span>
                    <span style={{ color: e.destaque }}>
                      {rotuloConcluidas(e.concluidas)}
                    </span>
                  </span>
                  <Barra
                    percentual={e.percentual}
                    trilho={`rgba(${e.rgb},.16)`}
                    preenchimento={`linear-gradient(90deg, rgba(${e.rgb},.55), ${e.destaque})`}
                  />
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <Aviso mensagem={aviso.mensagem} aoFechar={aviso.limpar} />
    </main>
  );
}

/**
 * Quanto falta da aula, em minutos inteiros. É a informação que a aluna
 * usa para decidir se começa agora — mais útil que repetir o minuto
 * exato, que o botão ao lado já diz.
 */
function faltamMinutos(retomada: Retomada): number {
  const total = minutosDaAula(retomada.modulo, retomada.aula) * 60;
  return Math.max(1, Math.round((total - retomada.segundos) / 60));
}
