import { useNavigate } from "react-router-dom";
import { Aviso } from "@/components/Aviso";
import { Barra } from "@/components/Barra";
import { Capa, capaModulo } from "@/components/Capa";
import { Play } from "@/components/Icones";
import { SemConteudo } from "@/components/SemConteudo";
import { useAviso } from "@/components/useAviso";
import { rotuloAcaoModulo, rotuloEstadoModulo } from "@/data/derivados";
import { useJornada } from "@/data/useJornada";
import { cores } from "@/design/tokens";

/**
 * Lista de módulos: linhas horizontais que não quebram. No celular a
 * pílula de ação vira botão circular de 38px.
 */
export function Modulos() {
  const { modulos } = useJornada();
  const navegar = useNavigate();
  const aviso = useAviso();

  return (
    <main className="rise-in mx-auto max-w-[1100px] px-7 pb-[90px] pt-[22px] cel-sm:px-[18px]">
      <p className="mb-[6px] mt-0 text-[11px] uppercase tracking-[.22em] text-[#a58a52]">
        Minha jornada
      </p>
      <h1
        className="mb-6 mt-0 font-titulo font-semibold text-marfim"
        style={{ fontSize: "clamp(21px, 4.8vw, 30px)" }}
      >
        Seu caminho, etapa por etapa
      </h1>

      {modulos.length === 0 ? <SemConteudo /> : null}

      <div className="flex flex-col gap-4">
        {modulos.map((e) => (
          <button
            key={e.modulo.id}
            onClick={() => {
              if (!e.liberado) {
                aviso.mostrar("Este módulo será liberado no momento certo da sua jornada.");
                return;
              }
              navegar(`/modulo/${e.modulo.numero}`);
            }}
            className="flex items-center gap-[14px] rounded-cartao-lg p-[14px] text-left transition-transform duration-300 hover:translate-x-[6px]"
            style={{
              background: `linear-gradient(120deg, rgba(${e.rgb},.1), rgba(6,9,18,.88) 62%)`,
              border: `1px solid ${
                e.emAndamento
                  ? `rgba(${e.rgb},.75)`
                  : e.liberado
                    ? `rgba(${e.rgb},.32)`
                    : "rgba(243,236,225,.1)"
              }`,
              cursor: "pointer",
            }}
          >
            <span
              className="relative aspect-[2/3] flex-[0_0_74px] overflow-hidden rounded-campo"
              style={{ background: cores.placeholderCapa, opacity: e.liberado ? 1 : 0.42 }}
            >
              <Capa
                caminhos={[capaModulo(e.modulo.numero)]}
                alt={`Capa do Módulo ${e.modulo.numero} — ${e.modulo.titulo}`}
              />
            </span>

            <span className="flex min-w-0 flex-1 flex-col gap-[7px]">
              <span
                className="text-[12px] uppercase tracking-[.26em]"
                style={{ color: e.destaque }}
              >
                {e.liberado
                  ? `Módulo ${e.modulo.numero} · ${rotuloEstadoModulo(e)}`
                  : `Módulo ${e.modulo.numero}`}
              </span>
              <span
                className="font-titulo leading-[1.3] text-marfim"
                style={{ fontSize: "clamp(16px, 4vw, 21px)" }}
              >
                {e.modulo.titulo}
              </span>
              <Barra
                percentual={e.percentual}
                trilho={`rgba(${e.rgb},.16)`}
                preenchimento={`linear-gradient(90deg, rgba(${e.rgb},.55), ${e.destaque})`}
                larguraMaxima={420}
              />
              <span className="text-[13px]" style={{ color: e.destaque }}>
                {e.concluidas}/{e.total} aulas
              </span>
            </span>

            <span
              className="flex min-h-[32px] flex-none items-center justify-center gap-[7px] whitespace-nowrap rounded-pilula px-[14px] py-2 text-[12px] font-bold cel:h-[38px] cel:w-[38px] cel:min-h-[38px] cel:gap-0 cel:rounded-full cel:p-0"
              style={{
                color: e.liberado ? "#000000" : "rgba(255,255,255,.85)",
                background: e.liberado ? "rgba(255,255,255,.88)" : "rgba(255,255,255,.16)",
              }}
            >
              {e.liberado ? (
                <Play tamanho={9} />
              ) : (
                <span className="flex flex-col items-center">
                  <span
                    style={{
                      width: 7,
                      height: 5,
                      border: "2px solid rgba(255,255,255,.85)",
                      borderBottom: "none",
                      borderRadius: "99px 99px 0 0",
                    }}
                  />
                  <span
                    style={{
                      width: 12,
                      height: 9,
                      background: "rgba(255,255,255,.85)",
                      borderRadius: 2,
                    }}
                  />
                </span>
              )}
              <span className="cel:hidden">{rotuloAcaoModulo(e)}</span>
            </span>
          </button>
        ))}
      </div>

      <Aviso mensagem={aviso.mensagem} aoFechar={aviso.limpar} />
    </main>
  );
}
