import { useEffect, useState } from "react";
import { cores } from "@/design/tokens";
import * as dados from "./dados";
import { botaoNeutro, botaoOuro, campo } from "./estilos";
import type { Painel } from "./usePainel";

/**
 * Ritmo de liberação — regra geral, relógio individual.
 *
 * A regra vale para todas as alunas. A contagem parte do cadastro de
 * cada uma, então quem entrar amanhã percorre o mesmo caminho,
 * deslocado no tempo. É o que permite vender mentoria com data de
 * entrada própria sem ter de configurar nada por aluna.
 *
 * O ritmo soma-se à liberação manual: a aluna precisa ter o módulo
 * liberado no painel E ter chegado a hora. Ele nunca abre o que você
 * não liberou, e voltar para `imediato` devolve o comportamento
 * anterior sem mexer em dado nenhum.
 */

type Opcao = {
  chave: dados.Ritmo;
  nome: string;
  resumo: string;
};

const OPCOES: Opcao[] = [
  {
    chave: "imediato",
    nome: "Tudo de uma vez",
    resumo:
      "Cada aluna vê, no mesmo instante, tudo o que você liberou para ela. É o comportamento padrão.",
  },
  {
    chave: "por_dias",
    nome: "Um módulo a cada N dias",
    resumo:
      "O primeiro módulo abre no cadastro; os seguintes vão abrindo no intervalo escolhido. O relógio de cada aluna começa no dia em que ela entrou.",
  },
  {
    chave: "por_conclusao",
    nome: "Ao concluir o módulo anterior",
    resumo:
      "O módulo seguinte abre quando ela termina a última aula do anterior. Quem corre avança; quem para, espera.",
  },
  {
    chave: "aulas_por_semana",
    nome: "N aulas por semana",
    resumo:
      "As aulas abrem na ordem do curso, sem parar na fronteira do módulo — a conta atravessa do fim de um para o começo do outro.",
  },
];

export function RitmoDeLiberacao({
  painel,
  avisar,
}: {
  painel: Painel;
  avisar: (m: string) => void;
}) {
  const { configuracao, executar } = painel;
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState<dados.Configuracao>(configuracao);

  // O painel relê depois de cada escrita; o rascunho acompanha.
  useEffect(() => setRascunho(configuracao), [configuracao]);

  const escolhida = OPCOES.find((o) => o.chave === configuracao.ritmo)!;
  const alterado =
    rascunho.ritmo !== configuracao.ritmo ||
    rascunho.ritmoDias !== configuracao.ritmoDias ||
    rascunho.aulasPorSemana !== configuracao.aulasPorSemana;

  function resumoAtual(): string {
    if (configuracao.ritmo === "por_dias") {
      return `Um módulo a cada ${configuracao.ritmoDias} dias`;
    }
    if (configuracao.ritmo === "aulas_por_semana") {
      const n = configuracao.aulasPorSemana;
      return `${n} ${n === 1 ? "aula" : "aulas"} por semana`;
    }
    return escolhida.nome;
  }

  async function salvar() {
    const falha = await executar(() => dados.salvarConfiguracao(rascunho));
    if (!falha) setAberto(false);
    avisar(falha ?? "Ritmo de liberação atualizado. Vale para todas as alunas.");
  }

  return (
    <section
      className="mb-5 rounded-cartao p-4"
      style={{
        background: "rgba(255,255,255,.03)",
        border: "1px solid rgba(255,255,255,.1)",
      }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex min-w-0 flex-[1_1_260px] flex-col gap-[3px]">
          <span
            className="text-[12px] font-bold uppercase tracking-[.16em]"
            style={{ color: cores.ouro }}
          >
            Ritmo de liberação
          </span>
          <span className="text-[15px] font-bold text-white">{resumoAtual()}</span>
          <span className="text-[13px] text-[rgba(243,236,225,.55)]">
            Vale para todas as alunas. A contagem começa no cadastro de cada uma.
          </span>
        </span>
        <button onClick={() => setAberto(!aberto)} style={botaoNeutro}>
          {aberto ? "Fechar" : "Mudar ritmo"}
        </button>
      </div>

      {aberto ? (
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,.1)" }}>
          <div className="flex flex-col gap-2">
            {OPCOES.map((o) => {
              const marcada = rascunho.ritmo === o.chave;
              return (
                <button
                  key={o.chave}
                  onClick={() => setRascunho({ ...rascunho, ritmo: o.chave })}
                  className="flex items-start gap-3 rounded-cartao p-3 text-left"
                  style={{
                    background: marcada ? "rgba(212,177,112,.1)" : "rgba(8,12,24,.5)",
                    border: `1px solid ${
                      marcada ? "rgba(212,177,112,.5)" : "rgba(255,255,255,.08)"
                    }`,
                    cursor: "pointer",
                  }}
                >
                  <span
                    className="mt-[3px] grid h-[18px] w-[18px] flex-none place-items-center rounded-full"
                    style={{
                      border: `2px solid ${marcada ? cores.ouro : "rgba(255,255,255,.3)"}`,
                    }}
                  >
                    {marcada ? (
                      <span
                        className="block h-[8px] w-[8px] rounded-full"
                        style={{ background: cores.ouro }}
                      />
                    ) : null}
                  </span>
                  <span className="flex min-w-0 flex-col gap-[3px]">
                    <span className="text-[15px] font-bold text-white">{o.nome}</span>
                    <span className="text-[13px] leading-[1.5] text-[rgba(243,236,225,.6)]">
                      {o.resumo}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {rascunho.ritmo === "por_dias" ? (
            <label className="mt-4 flex flex-wrap items-center gap-3">
              <span className="text-[14px] text-[rgba(243,236,225,.75)]">
                Intervalo entre módulos, em dias:
              </span>
              <input
                type="number"
                min={1}
                max={365}
                inputMode="numeric"
                value={rascunho.ritmoDias}
                onChange={(e) =>
                  setRascunho({
                    ...rascunho,
                    ritmoDias: Math.min(365, Math.max(1, Math.floor(Number(e.target.value) || 1))),
                  })
                }
                style={{ ...campo, minHeight: 44, width: 92, padding: "0 12px", textAlign: "center" }}
              />
              <span className="text-[13px] text-[rgba(243,236,225,.45)]">
                Com 11 módulos, {rascunho.ritmoDias} dias dão{" "}
                {Math.round((rascunho.ritmoDias * 10) / 30)} meses até o último.
              </span>
            </label>
          ) : null}

          {rascunho.ritmo === "aulas_por_semana" ? (
            <label className="mt-4 flex flex-wrap items-center gap-3">
              <span className="text-[14px] text-[rgba(243,236,225,.75)]">
                Quantas aulas por semana:
              </span>
              <input
                type="number"
                min={1}
                max={50}
                inputMode="numeric"
                value={rascunho.aulasPorSemana}
                onChange={(e) =>
                  setRascunho({
                    ...rascunho,
                    aulasPorSemana: Math.min(
                      50,
                      Math.max(1, Math.floor(Number(e.target.value) || 1)),
                    ),
                  })
                }
                style={{ ...campo, minHeight: 44, width: 92, padding: "0 12px", textAlign: "center" }}
              />
              <span className="text-[13px] text-[rgba(243,236,225,.45)]">
                As 50 aulas levam {Math.ceil(50 / rascunho.aulasPorSemana)} semanas.
              </span>
            </label>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              disabled={!alterado}
              onClick={salvar}
              style={{
                ...botaoOuro,
                minHeight: 42,
                padding: "0 20px",
                fontSize: 14,
                opacity: alterado ? 1 : 0.4,
                cursor: alterado ? "pointer" : "default",
              }}
            >
              Aplicar a todas
            </button>
            {alterado ? (
              <button
                onClick={() => setRascunho(configuracao)}
                style={{ ...botaoNeutro, minHeight: 42, padding: "0 16px", fontSize: 14 }}
              >
                Descartar
              </button>
            ) : null}
          </div>

          <p className="mb-0 mt-3 text-[12px] leading-[1.6] text-[rgba(243,236,225,.45)]">
            O ritmo <strong>não substitui</strong> a liberação por aluna: ela precisa das duas
            coisas — ter o módulo liberado no painel e ter chegado a hora. Mudar o ritmo não
            apaga nada, e voltar para “tudo de uma vez” devolve o comportamento anterior na
            hora.
          </p>
        </div>
      ) : null}
    </section>
  );
}
