import { useNavigate } from "react-router-dom";
import { Aviso } from "@/components/Aviso";
import { Barra } from "@/components/Barra";
import { Capa, capaAula, capaModulo } from "@/components/Capa";
import { Cadeado, Mais, Play } from "@/components/Icones";
import { SemConteudo } from "@/components/SemConteudo";
import { useAviso } from "@/components/useAviso";
import { rotuloAcaoModulo, rotuloConcluidas } from "@/data/derivados";
import { rotuloDuracao, useEstado } from "@/data/estado";
import { useJornada } from "@/data/useJornada";
import { cores } from "@/design/tokens";
import { useRef } from "react";

export function Inicio() {
  const { concluida } = useEstado();
  const { modulos, retomada, totalConcluidas } = useJornada();
  const navegar = useNavigate();
  const aviso = useAviso();
  const fileira = useRef<HTMLDivElement>(null);

  const kicker =
    totalConcluidas === 0 ? "Comece por aqui" : "Continue assistindo";
  const acao =
    totalConcluidas === 0
      ? "Começar a primeira aula"
      : "Continuar de onde parei";

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
    <main className="rise-in mx-auto max-w-[1360px] px-7 pb-[90px] pt-[22px] cel-sm:px-[18px]">
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
          </div>

          <div className="flex flex-col gap-1 px-[2px] pt-3">
            <p className="m-0 text-[11px] uppercase tracking-[.2em] text-white/55">
              {kicker}
            </p>
            <p className="m-0 text-[13px] text-white/60">
              Módulo {retomada.modulo.numero} — {retomada.modulo.titulo}
            </p>
            <h2 className="m-0 text-[15px] font-bold leading-[1.3] text-white">
              Aula {retomada.aula.numero} — {retomada.aula.titulo}
            </h2>
            <p className="m-0 text-[13px] text-white/55">
              {rotuloDuracao(retomada.modulo, retomada.aula)} ·{" "}
              {concluida(retomada.aula.id)
                ? "Aula concluída"
                : "Disponível agora"}
            </p>
          </div>

          <div className="flex w-full flex-wrap justify-center gap-[10px] pt-3 cel:flex-col">
            <button
              onClick={() =>
                navegar(
                  `/aula/${retomada.modulo.numero}/${retomada.aula.ordem}`,
                )
              }
              className="flex min-h-[56px] min-w-[240px] flex-1 items-center justify-center gap-3 rounded-pilula border-none bg-white px-[26px] py-4 text-[17px] font-bold text-black transition-opacity hover:opacity-[.86] cel:w-full cel:min-w-0"
              style={{ cursor: "pointer" }}
            >
              <Play />
              {acao}
            </button>
            <button
              onClick={() => navegar(`/modulo/${retomada.modulo.numero}`)}
              className="flex min-h-[56px] min-w-[240px] flex-1 items-center justify-center gap-3 rounded-pilula border-none px-[26px] py-4 text-[17px] font-bold text-white cel:w-full cel:min-w-0"
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
          <div className="mb-6 flex flex-wrap items-end gap-[18px]">
            <div className="flex-[1_1_280px]" />
            <div className="flex gap-[10px] cel:hidden">
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
                  className="h-14 w-14 rounded-full text-[22px] text-marfim-corpo"
                  style={{
                    background:
                      "radial-gradient(150% 240% at 50% 140%, rgba(212,177,112,.24) 0%, rgba(44,34,16,.7) 38%, #0a0805 78%)",
                    border: "1px solid rgba(180,150,95,.22)",
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
            className="flex gap-5 overflow-x-auto px-1 pb-[22px] pt-[6px] cel:grid cel:grid-cols-1 cel:overflow-x-visible cel:pb-2"
            style={{ scrollSnapType: "x mandatory", scrollBehavior: "smooth" }}
          >
            {modulos.map((e) => (
              <button
                key={e.modulo.id}
                onClick={() => abrirModulo(e.modulo.numero, e.liberado)}
                className="flex flex-[0_0_clamp(196px,62vw,252px)] flex-col gap-[14px] border-none bg-transparent p-0 text-left cel:w-full cel:flex-[0_0_auto]"
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
                      <span className="absolute inset-x-[18px] bottom-[18px] flex flex-col gap-2">
                        <span
                          className="text-[12px] uppercase tracking-[.26em]"
                          style={{ color: e.destaque }}
                        >
                          Módulo {e.modulo.numero}
                        </span>
                        <span className="font-titulo text-[25px] leading-[1.15] text-marfim">
                          {e.modulo.titulo}
                        </span>
                      </span>
                    </>
                  )}

                  <span
                    className="absolute left-1/2 top-1/2 flex min-h-[32px] -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-[7px] whitespace-nowrap rounded-pilula px-[15px] py-2 text-[12px] font-bold"
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
                  <span className="flex justify-between text-[15px] text-[#9a9287]">
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
