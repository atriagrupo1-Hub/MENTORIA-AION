import { useNavigate } from "react-router-dom";
import { Aviso } from "@/components/Aviso";
import { Barra } from "@/components/Barra";
import { Capa, capaModulo } from "@/components/Capa";
import { Play } from "@/components/Icones";
import { SemConteudo } from "@/components/SemConteudo";
import { useAviso } from "@/components/useAviso";
import { quandoAbre, rotuloAcaoModulo, rotuloEstadoModulo } from "@/data/derivados";
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
    <main className="entra mx-auto max-w-[1100px] px-7 pb-24 pt-6 cel-sm:px-5">
      <p className="mb-2 mt-0 text-rotulo uppercase tracking-rotulo text-[rgba(255,255,255,.4)]">
        Minha jornada
      </p>
      <h1
        className="text-heroi mb-6 mt-0 font-titulo font-semibold text-marfim"
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
                aviso.mostrar(
                  e.abreEm
                    ? `Este módulo abre ${quandoAbre(e.abreEm)}.`
                    : "Este módulo será liberado no momento certo da sua jornada.",
                );
                return;
              }
              navegar(`/modulo/${e.modulo.numero}`);
            }}
            className="flex items-center gap-4 rounded-cartao-lg p-4 text-left transition-transform duration-300 hover:translate-x-[6px]"
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

            <span className="flex min-w-0 flex-1 flex-col gap-2">
              <span
                className="text-rotulo uppercase tracking-rotulo"
                style={{ color: e.destaque }}
              >
                {/*
                  Módulo fechado mostrava só "Módulo 3", sem mais nada.
                  Agora mostra o dia, quando a aluna já tem um marcado.
                  Sem data, segue só o número — que continua sendo a
                  verdade: não há o que prometer ainda.
                */}
                {e.liberado
                  ? `Módulo ${e.modulo.numero} · ${rotuloEstadoModulo(e)}`
                  : e.abreEm
                    ? `Módulo ${e.modulo.numero} · ${rotuloEstadoModulo(e, e.abreEm)}`
                    : `Módulo ${e.modulo.numero}`}
              </span>
              <span
                className="font-titulo text-realce leading-[1.3] text-marfim"
              >
                {e.modulo.titulo}
              </span>
              <Barra
                percentual={e.percentual}
                trilho={`rgba(${e.rgb},.16)`}
                preenchimento={`linear-gradient(90deg, rgba(${e.rgb},.55), ${e.destaque})`}
                larguraMaxima={420}
              />
              <span className="text-apoio" style={{ color: e.destaque }}>
                {e.concluidas}/{e.total} aulas
              </span>
            </span>

            <span
              className="flex min-h-[32px] flex-none items-center justify-center gap-2 whitespace-nowrap rounded-pilula px-4 py-2 text-apoio font-bold cel:h-[38px] cel:w-[38px] cel:min-h-[38px] cel:gap-0 cel:rounded-full cel:p-0"
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
              <span className="cel:hidden">{rotuloAcaoModulo(e, e.abreEm)}</span>
            </span>
          </button>
        ))}
      </div>

      <Aviso mensagem={aviso.mensagem} aoFechar={aviso.limpar} />
    </main>
  );
}
