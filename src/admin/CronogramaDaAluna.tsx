import { useMemo, useState } from "react";
import type { Catalogo, Modulo } from "@/data/tipos";
import { cores } from "@/design/tokens";
import type { PedidoConfirmacao } from "./Confirmacao";
import * as dados from "./dados";
import { botaoNeutro, botaoOuro, botaoRemover, campo } from "./estilos";
import { dataCurta } from "./prazo";

/**
 * Cronograma de uma aluna — quando cada aula abre para ela.
 *
 * Uma regra só governa tudo: cada aula tem uma data. A tela é o retrato
 * do que está gravado, sem interpretação no meio. O gerador preenche as
 * datas de uma vez; depois disso, qualquer aula é corrigida sozinha, e
 * as outras não se mexem.
 *
 * O módulo não é liberado — ele é o retrato das aulas dela:
 *   nenhuma aula atribuída ......... oculto para a aluna
 *   atribuídas, nenhuma aberta ..... "libera em breve"
 *   ao menos uma aberta ............ aparece
 */

const hoje = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/** `yyyy-mm-dd` do fuso local — `toISOString` devolveria o de Greenwich. */
function paraCampoData(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function doCampoData(v: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const [a, m, d] = v.split("-").map(Number);
  return new Date(a, m - 1, d, 0, 0, 0, 0);
}

type EstadoModulo = "oculto" | "em_breve" | "aberto";

export function CronogramaDaAluna({
  aluna,
  catalogo,
  intervaloPadrao,
  executar,
  avisar,
  pedirConfirmacao,
}: {
  aluna: dados.AlunaAdmin;
  catalogo: Catalogo;
  intervaloPadrao: number;
  executar: (f: () => Promise<unknown>) => Promise<string | null>;
  avisar: (m: string) => void;
  pedirConfirmacao: (p: PedidoConfirmacao) => void;
}) {
  const [marcados, setMarcados] = useState<Set<string>>(
    () =>
      new Set(
        catalogo.modulos
          .filter((m) => m.aulas.some((a) => aluna.cronograma.has(a.id)))
          .map((m) => m.id),
      ),
  );
  const [intervalo, setIntervalo] = useState(String(intervaloPadrao));
  const [inicio, setInicio] = useState(paraCampoData(hoje()));
  const [expandido, setExpandido] = useState("");

  const agora = Date.now();

  function estadoDoModulo(m: Modulo): EstadoModulo {
    const suas = m.aulas.filter((a) => aluna.cronograma.has(a.id));
    if (suas.length === 0) return "oculto";
    const abertas = suas.filter((a) => {
      const d = aluna.cronograma.get(a.id) ?? null;
      return d === null || new Date(d).getTime() <= agora;
    });
    return abertas.length > 0 ? "aberto" : "em_breve";
  }

  const resumo = useMemo(() => {
    let atribuidas = 0;
    let abertas = 0;
    let proxima: number | null = null;
    for (const m of catalogo.modulos) {
      for (const a of m.aulas) {
        if (!aluna.cronograma.has(a.id)) continue;
        atribuidas += 1;
        const d = aluna.cronograma.get(a.id) ?? null;
        if (d === null || new Date(d).getTime() <= agora) abertas += 1;
        else {
          const t = new Date(d).getTime();
          if (proxima === null || t < proxima) proxima = t;
        }
      }
    }
    return { atribuidas, abertas, proxima };
  }, [aluna.cronograma, catalogo.modulos, agora]);

  const nDias = Math.max(0, Math.min(365, Math.floor(Number(intervalo) || 0)));
  const totalMarcadas = catalogo.modulos
    .filter((m) => marcados.has(m.id))
    .reduce((s, m) => s + m.aulas.length, 0);

  function alternarModulo(id: string) {
    const novo = new Set(marcados);
    if (novo.has(id)) novo.delete(id);
    else novo.add(id);
    setMarcados(novo);
  }

  async function gerar() {
    if (marcados.size === 0) {
      avisar("Marque ao menos um módulo antes de gerar.");
      return;
    }
    const dataInicio = doCampoData(inicio);
    if (!dataInicio) {
      avisar("Informe a data de início.");
      return;
    }
    pedirConfirmacao({
      titulo: `Gerar o cronograma de ${aluna.nome}?`,
      mensagem:
        `Isto substitui o cronograma inteiro dela: ${totalMarcadas} aulas, ` +
        (nDias === 0
          ? "todas abertas de uma vez."
          : `uma a cada ${nDias} ${nDias === 1 ? "dia" : "dias"} a partir de ${dataCurta(
              dataInicio.toISOString(),
            )}.`) +
        " As datas que você tiver ajustado à mão se perdem.",
      executar: async () => {
        const falha = await executar(() =>
          dados.gerarCronograma(aluna.id, [...marcados], nDias, dataInicio),
        );
        avisar(falha ?? `Cronograma de ${aluna.nome} gerado: ${totalMarcadas} aulas.`);
      },
    });
  }

  const numero = { ...campo, minHeight: 44, width: 88, padding: "0 12px", textAlign: "center" as const };
  const data = { ...campo, minHeight: 44, padding: "0 12px" };

  return (
    <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,.1)" }}>
      <p
        className="mb-[10px] mt-0 text-[12px] font-bold uppercase tracking-[.16em]"
        style={{ color: cores.ouro }}
      >
        Cronograma
      </p>

      <div
        className="mb-4 flex flex-wrap gap-x-8 gap-y-3 rounded-cartao p-4"
        style={{ background: "rgba(8,12,24,.5)", border: "1px solid rgba(255,255,255,.08)" }}
      >
        <Dado rotulo="Aulas atribuídas" valor={`${resumo.atribuidas} de 50`} />
        <Dado rotulo="Já abertas" valor={String(resumo.abertas)} />
        <Dado
          rotulo="Próxima abre em"
          valor={resumo.proxima ? dataCurta(new Date(resumo.proxima).toISOString()) : "—"}
        />
      </div>

      {/* ---- Passo 1: quais módulos ---- */}
      <p className="mb-2 mt-0 text-[13px] text-[rgba(243,236,225,.6)]">
        <strong>1.</strong> Quais módulos ela recebe. Módulo não marcado fica oculto para ela.
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          onClick={() => setMarcados(new Set(catalogo.modulos.map((m) => m.id)))}
          style={{ ...botaoNeutro, minHeight: 34, padding: "0 12px", fontSize: 12 }}
        >
          Todos
        </button>
        <button
          onClick={() => setMarcados(new Set())}
          style={{ ...botaoNeutro, minHeight: 34, padding: "0 12px", fontSize: 12 }}
        >
          Nenhum
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-2">
        {catalogo.modulos.map((m) => {
          const marcado = marcados.has(m.id);
          const estado = estadoDoModulo(m);
          const suas = m.aulas.filter((a) => aluna.cronograma.has(a.id));
          const aberto = expandido === m.id;

          return (
            <div
              key={m.id}
              className="rounded-cartao"
              style={{
                background: marcado ? "rgba(212,177,112,.07)" : "rgba(8,12,24,.5)",
                border: `1px solid ${marcado ? "rgba(212,177,112,.34)" : "rgba(255,255,255,.08)"}`,
              }}
            >
              <div className="flex flex-wrap items-center gap-3 p-3">
                <button
                  onClick={() => alternarModulo(m.id)}
                  className="grid h-[20px] w-[20px] flex-none place-items-center rounded-[5px]"
                  style={{
                    background: marcado ? cores.ouro : "transparent",
                    border: `2px solid ${marcado ? cores.ouro : "rgba(255,255,255,.3)"}`,
                    cursor: "pointer",
                  }}
                  aria-label={marcado ? `Tirar o Módulo ${m.numero}` : `Dar o Módulo ${m.numero}`}
                >
                  {marcado ? (
                    <span className="text-[13px] font-bold" style={{ color: cores.ouroTexto }}>
                      ✓
                    </span>
                  ) : null}
                </button>

                <span className="flex min-w-0 flex-[1_1_200px] flex-col gap-[2px]">
                  <span className="text-[14px] font-bold text-white">
                    Módulo {m.numero} · {m.aulas.length} aulas
                  </span>
                  <span className="text-[12px] text-[rgba(243,236,225,.5)]">
                    {suas.length === 0
                      ? "nenhuma aula atribuída"
                      : `${suas.length} atribuídas a ela`}
                  </span>
                </span>

                <EtiquetaEstado estado={estado} />

                {suas.length > 0 ? (
                  <button
                    onClick={() => setExpandido(aberto ? "" : m.id)}
                    style={{ ...botaoNeutro, minHeight: 32, padding: "0 11px", fontSize: 12 }}
                  >
                    {aberto ? "Fechar" : "Ver datas"}
                  </button>
                ) : null}
              </div>

              {aberto ? (
                <div className="px-3 pb-3">
                  {m.aulas.map((a) => (
                    <LinhaAula
                      key={a.id}
                      alunaId={aluna.id}
                      alunaNome={aluna.nome}
                      aulaId={a.id}
                      titulo={`${a.numero}. ${a.titulo}`}
                      abreEm={aluna.cronograma.get(a.id) ?? null}
                      atribuida={aluna.cronograma.has(a.id)}
                      executar={executar}
                      avisar={avisar}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* ---- Passo 2: o ritmo ---- */}
      <p className="mb-2 mt-0 text-[13px] text-[rgba(243,236,225,.6)]">
        <strong>2.</strong> Abrir uma aula a cada quantos dias, a partir de quando.
      </p>

      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-[6px]">
          <span className="text-[11px] uppercase tracking-[.14em] text-[rgba(243,236,225,.45)]">
            Intervalo (dias)
          </span>
          <input
            type="number"
            min={0}
            max={365}
            inputMode="numeric"
            value={intervalo}
            onChange={(e) => setIntervalo(e.target.value)}
            style={numero}
          />
        </label>
        <label className="flex flex-col gap-[6px]">
          <span className="text-[11px] uppercase tracking-[.14em] text-[rgba(243,236,225,.45)]">
            Começando em
          </span>
          <input
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            style={data}
          />
        </label>
        <span className="text-[13px] text-[rgba(243,236,225,.5)]">
          {totalMarcadas === 0
            ? "nenhum módulo marcado"
            : nDias === 0
              ? `${totalMarcadas} aulas, todas abertas de uma vez`
              : `${totalMarcadas} aulas em ${Math.round(((totalMarcadas - 1) * nDias) / 30)} meses`}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={gerar}
          style={{ ...botaoOuro, minHeight: 42, padding: "0 20px", fontSize: 14 }}
        >
          Gerar cronograma
        </button>
        {resumo.atribuidas > 0 ? (
          <button
            onClick={() =>
              pedirConfirmacao({
                titulo: `Tirar todo o conteúdo de ${aluna.nome}?`,
                mensagem:
                  "Ela continua entrando, mas não vê módulo nenhum. O progresso e os comentários dela ficam guardados.",
                executar: async () => {
                  const falha = await executar(() =>
                    dados.gerarCronograma(aluna.id, [], 0, hoje()),
                  );
                  setMarcados(new Set());
                  avisar(falha ?? `${aluna.nome} ficou sem conteúdo.`);
                },
              })
            }
            style={{ ...botaoRemover, minHeight: 42, padding: "0 18px", fontSize: 14 }}
          >
            Tirar tudo
          </button>
        ) : null}
      </div>

      <p className="mb-0 mt-3 text-[12px] leading-[1.6] text-[rgba(243,236,225,.45)]">
        Gerar substitui o cronograma inteiro dela. Depois, cada aula é corrigida sozinha em{" "}
        <strong>Ver datas</strong> — as outras não se mexem. Intervalo <strong>0</strong> abre
        tudo de uma vez.
      </p>
    </div>
  );
}

function EtiquetaEstado({ estado }: { estado: EstadoModulo }) {
  const mapa = {
    oculto: { texto: "Oculto", cor: "rgba(243,236,225,.4)" },
    em_breve: { texto: "Libera em breve", cor: cores.ouro },
    aberto: { texto: "Aberto", cor: cores.concluido },
  } as const;
  const { texto, cor } = mapa[estado];
  return (
    <span
      className="flex-none rounded-pilula px-[10px] py-[5px] text-[10px] uppercase tracking-[.12em]"
      style={{ color: cor, border: `1px solid ${cor}` }}
    >
      {texto}
    </span>
  );
}

function LinhaAula({
  alunaId,
  alunaNome,
  aulaId,
  titulo,
  abreEm,
  atribuida,
  executar,
  avisar,
}: {
  alunaId: string;
  alunaNome: string;
  aulaId: string;
  titulo: string;
  abreEm: string | null;
  atribuida: boolean;
  executar: (f: () => Promise<unknown>) => Promise<string | null>;
  avisar: (m: string) => void;
}) {
  const abertaAgora = atribuida && (abreEm === null || new Date(abreEm).getTime() <= Date.now());

  async function mudar(v: string) {
    const d = doCampoData(v);
    if (!d) return;
    const falha = await executar(() => dados.definirAbertura(alunaId, aulaId, d));
    avisar(falha ?? `Data alterada para ${dataCurta(d.toISOString())}.`);
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2 py-2"
      style={{ borderTop: "1px solid rgba(255,255,255,.06)" }}
    >
      <span
        className="min-w-0 flex-[1_1_180px] truncate text-[13px]"
        style={{ color: atribuida ? "#fff" : "rgba(243,236,225,.35)" }}
      >
        {titulo}
      </span>

      {atribuida ? (
        <>
          <input
            type="date"
            value={abreEm ? paraCampoData(new Date(abreEm)) : paraCampoData(hoje())}
            onChange={(e) => void mudar(e.target.value)}
            style={{
              ...campo,
              minHeight: 34,
              padding: "0 8px",
              fontSize: 12,
              opacity: abertaAgora ? 0.6 : 1,
            }}
          />
          {!abertaAgora ? (
            <button
              onClick={async () => {
                const falha = await executar(() =>
                  dados.definirAbertura(alunaId, aulaId, null),
                );
                avisar(falha ?? "Aula aberta agora.");
              }}
              style={{ ...botaoNeutro, minHeight: 32, padding: "0 10px", fontSize: 11 }}
            >
              Abrir agora
            </button>
          ) : (
            <span className="text-[11px]" style={{ color: cores.concluido }}>
              aberta
            </span>
          )}
          <button
            onClick={async () => {
              const falha = await executar(() => dados.removerAulaDaAluna(alunaId, aulaId));
              avisar(falha ?? `Aula tirada de ${alunaNome}.`);
            }}
            style={{ ...botaoRemover, minHeight: 32, padding: "0 10px", fontSize: 11 }}
          >
            Tirar
          </button>
        </>
      ) : (
        <button
          onClick={async () => {
            const falha = await executar(() => dados.definirAbertura(alunaId, aulaId, null));
            avisar(falha ?? `Aula dada a ${alunaNome}, aberta agora.`);
          }}
          style={{ ...botaoNeutro, minHeight: 32, padding: "0 10px", fontSize: 11 }}
        >
          Dar esta aula
        </button>
      )}
    </div>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <span className="flex flex-col gap-[3px]">
      <span className="text-[11px] uppercase tracking-[.14em] text-[rgba(243,236,225,.45)]">
        {rotulo}
      </span>
      <span className="text-[15px] font-bold text-white">{valor}</span>
    </span>
  );
}
