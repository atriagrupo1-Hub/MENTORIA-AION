import { useNavigate, useParams } from "react-router-dom";
import { Aviso } from "@/components/Aviso";
import { Capa, capaAoVivo, capaAula, capaModulo } from "@/components/Capa";
import { Play } from "@/components/Icones";
import { useAviso } from "@/components/useAviso";
import {
  estadoDoModulo,
  rotuloBotaoModulo,
  rotuloConcluidas,
  rotuloEstadoModulo,
} from "@/data/derivados";
import { rotuloDuracao, useEstado } from "@/data/estado";
import { cores, paleta } from "@/design/tokens";

const NAV: React.CSSProperties = {
  minHeight: 34,
  padding: "8px 11px",
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: "nowrap",
  color: "#ffffff",
  background: "rgba(255,255,255,.14)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  border: "none",
  borderRadius: 99,
  cursor: "pointer",
};

export function PaginaModulo() {
  const { mi } = useParams();
  const numero = Number(mi);
  const { catalogo, moduloLiberado, moduloVisivel, aulaBloqueada, concluida } = useEstado();
  const navegar = useNavigate();
  const aviso = useAviso();

  const modulo = catalogo.modulos.find((m) => m.numero === numero);
  // Módulo que não é dela responde igual a módulo inexistente: digitar o
  // endereço na barra não pode revelar que ele existe.
  if (!modulo || !moduloVisivel(modulo)) {
    return <main className="p-8">Módulo não encontrado.</main>;
  }

  const e = estadoDoModulo(modulo, moduloLiberado(modulo), concluida);
  const cor = paleta(modulo.numero);
  const aoVivo = catalogo.aoVivo[modulo.id];

  function irPara(destino: number) {
    const alvo = catalogo.modulos.filter(moduloVisivel).find((m) => m.numero === destino);
    if (!alvo) {
      aviso.mostrar(
        destino < numero
          ? "Este é o primeiro módulo da sua jornada."
          : "Este é o último módulo da sua jornada.",
      );
      return;
    }
    navegar(`/modulo/${destino}`);
  }

  function abrirAula(ordem: number) {
    const aula = modulo!.aulas[ordem];
    if (!aula) return;
    if (aulaBloqueada(modulo!, aula)) {
      aviso.mostrar("Esta aula será liberada no momento certo da sua jornada.");
      return;
    }
    navegar(`/aula/${modulo!.numero}/${ordem}`);
  }

  const proxima = modulo.aulas.findIndex((a) => !concluida(a.id));

  return (
    <main className="rise-in-rapido mx-auto max-w-[1240px] px-7 pb-[90px] pt-[34px] cel-sm:px-[18px]">
      <div className="sem-barra mb-6 flex items-center gap-2 overflow-x-auto">
        <button onClick={() => navegar("/inicio")} style={NAV}>
          ‹ Todos
        </button>
        <button onClick={() => irPara(numero - 1)} style={NAV}>
          ‹ Anterior
        </button>
        <button onClick={() => irPara(numero + 1)} style={NAV}>
          Próximo ›
        </button>
      </div>

      <section className="flex flex-wrap gap-10">
        <div
          className="relative mx-auto aspect-[2/3] max-w-full flex-[0_0_clamp(190px,58vw,268px)] overflow-hidden rounded-[20px]"
          style={{
            background: `linear-gradient(160deg, rgba(${cor.rgb},.22), #060911 58%, rgba(${cor.rgb},.16))`,
            border: `1px solid rgba(${cor.rgb},.38)`,
            boxShadow: `0 40px 80px -50px rgba(${cor.rgb},.6)`,
          }}
        >
          <Capa
            caminhos={[capaModulo(modulo.numero)]}
            alt={`Capa do Módulo ${modulo.numero} — ${modulo.titulo}`}
          />
          {modulo.tituloNaArte ? null : (
            <>
              <span
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(180deg, rgba(5,8,16,.1), rgba(5,8,16,.9))",
                }}
              />
              <span className="absolute inset-x-5 bottom-[22px] font-titulo text-[27px] leading-[1.15] text-marfim">
                {modulo.titulo}
              </span>
            </>
          )}
        </div>

        <div className="flex flex-[1_1_420px] flex-col gap-[13px]">
          <p
            className="m-0 text-[11px] uppercase tracking-[.24em]"
            style={{ color: cor.destaque }}
          >
            Módulo {modulo.numero} · {rotuloEstadoModulo(e)}
          </p>
          <h1
            className="m-0 font-titulo font-semibold leading-[1.22] text-marfim"
            style={{ fontSize: "clamp(17px, 3.8vw, 26px)" }}
          >
            {modulo.titulo}
          </h1>
          <p className="m-0 max-w-[640px] text-[15px] leading-[1.6] text-[#b9ac9a]">
            {modulo.intro}
          </p>
          <p className="m-0 text-[14px] text-[#9a9287]">
            {e.total === 1 ? "1 aula" : `${e.total} aulas`} ·{" "}
            <span style={{ color: cor.destaque }}>{rotuloConcluidas(e.concluidas)}</span>
          </p>

          <div className="max-w-[460px]">
            <div
              className="h-[6px] overflow-hidden rounded-pilula"
              style={{ background: `rgba(${cor.rgb},.16)` }}
            >
              <div
                className="h-full rounded-pilula"
                style={{
                  background: `linear-gradient(90deg, rgba(${cor.rgb},.55), ${cor.destaque})`,
                  width: `${e.percentual}%`,
                  transition: "width .9s cubic-bezier(.22,.61,.36,1)",
                }}
              />
            </div>
            <p className="mb-0 mt-[9px] text-[13px] text-terciario">
              {e.percentual}% do módulo concluído
            </p>
          </div>

          <button
            onClick={() => abrirAula(proxima >= 0 ? proxima : 0)}
            className="flex min-h-[56px] items-center justify-center gap-3 self-start rounded-pilula border-none bg-white px-[26px] py-4 text-[17px] font-bold text-black transition-opacity hover:opacity-[.86]"
            style={{ cursor: "pointer" }}
          >
            <Play tamanho={14} />
            {rotuloBotaoModulo(e)}
          </button>
        </div>
      </section>

      <section className="mt-16">
        <h2
          className="mb-[22px] mt-0 font-titulo font-semibold text-marfim"
          style={{ fontSize: "clamp(25px, 6vw, 34px)" }}
        >
          Aulas deste módulo
        </h2>

        <div className="flex flex-col">
          {modulo.aulas.map((aula) => {
            const feita = concluida(aula.id);
            const travada = aulaBloqueada(modulo, aula);
            return (
              <button
                key={aula.id}
                onClick={() => abrirAula(aula.ordem)}
                className="flex items-start gap-4 border-none bg-transparent px-1 py-[14px] text-left transition-opacity hover:opacity-80"
                style={{
                  borderBottom: "1px solid rgba(255,255,255,.08)",
                  cursor: "pointer",
                }}
              >
                <span
                  className="relative aspect-video flex-[0_0_132px] overflow-hidden rounded-mini"
                  style={{ background: cores.placeholderCapa }}
                >
                  <Capa
                    caminhos={[
                      capaAula(modulo.numero, aula.ordem),
                      capaModulo(modulo.numero),
                    ]}
                    alt={`Capa da Aula ${aula.numero} — ${aula.titulo}`}
                  />
                  <span
                    className="absolute inset-0"
                    style={{ background: travada ? "rgba(0,0,0,.62)" : "rgba(0,0,0,.28)" }}
                  />
                  <span
                    className="absolute left-1/2 top-1/2 flex h-[34px] w-[34px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
                    style={{ border: "2px solid rgba(255,255,255,.9)" }}
                  >
                    {travada ? (
                      <span className="flex flex-col items-center">
                        <span
                          style={{
                            width: 9,
                            height: 6,
                            border: "2px solid rgba(255,255,255,.9)",
                            borderBottom: "none",
                            borderRadius: "99px 99px 0 0",
                          }}
                        />
                        <span
                          style={{
                            width: 14,
                            height: 10,
                            background: "rgba(255,255,255,.9)",
                            borderRadius: 2,
                          }}
                        />
                      </span>
                    ) : (
                      <span className="ml-[3px]">
                        <Play tamanho={10} cor="#ffffff" />
                      </span>
                    )}
                  </span>
                </span>

                <span className="flex flex-1 flex-col gap-[5px] pt-[2px]">
                  <span className="text-[16px] leading-[1.35] text-white">
                    {aula.numero}. {aula.titulo}
                  </span>
                  <span className="text-[14px] text-white/55">
                    {rotuloDuracao(modulo, aula)}
                  </span>
                  <span
                    className="text-[13px]"
                    style={{ color: feita ? cores.concluido : cores.ouroMedio }}
                  >
                    {travada ? "Bloqueada" : feita ? "Concluída" : "Disponível"}
                  </span>
                </span>
              </button>
            );
          })}

          <button
            onClick={() => {
              if (!aoVivo?.liberada) {
                aviso.mostrar(
                  "Este encontro ao vivo será liberado no momento certo da sua jornada.",
                );
                return;
              }
              navegar(`/ao-vivo/${modulo.numero}`);
            }}
            className="flex items-start gap-4 border-none bg-transparent px-1 py-[14px] text-left transition-opacity hover:opacity-80"
            style={{ borderBottom: "1px solid rgba(255,255,255,.08)", cursor: "pointer" }}
          >
            <span
              className="relative aspect-video flex-[0_0_132px] overflow-hidden rounded-mini"
              style={{ background: cores.placeholderCapa }}
            >
              <Capa
                caminhos={[capaAoVivo(modulo.numero), capaModulo(modulo.numero)]}
                alt={`Capa da aula ao vivo do Módulo ${modulo.numero}`}
              />
              <span className="absolute inset-0" style={{ background: "rgba(0,0,0,.28)" }} />
              <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
                {aoVivo?.liberada ? (
                  <span
                    className="flex h-[34px] w-[34px] items-center justify-center rounded-full"
                    style={{ border: "2px solid rgba(255,255,255,.9)" }}
                  >
                    <span className="ml-[3px]">
                      <Play tamanho={10} cor="#ffffff" />
                    </span>
                  </span>
                ) : (
                  <>
                    <span
                      style={{
                        width: 12,
                        height: 8,
                        border: "2px solid rgba(255,255,255,.75)",
                        borderBottom: "none",
                        borderRadius: "99px 99px 0 0",
                      }}
                    />
                    <span
                      style={{
                        width: 20,
                        height: 15,
                        background: "rgba(255,255,255,.7)",
                        borderRadius: 3,
                      }}
                    />
                  </>
                )}
              </span>
            </span>

            <span className="flex flex-1 flex-col gap-[5px] pt-[2px]">
              <span className="text-[16px] leading-[1.35] text-white">
                {modulo.aulas.length + 1}. Aula ao vivo
              </span>
              <span className="text-[14px] text-white/55">
                {aoVivo?.quandoTexto ?? "Encontro de 1 hora"}
              </span>
              <span
                className="text-[13px]"
                style={{ color: aoVivo?.liberada ? cores.ouroMedio : "rgba(255,255,255,.45)" }}
              >
                {aoVivo?.liberada ? "Disponível" : "Libera em breve"}
              </span>
            </span>
          </button>
        </div>
      </section>

      <Aviso mensagem={aviso.mensagem} aoFechar={aviso.limpar} />
    </main>
  );
}
