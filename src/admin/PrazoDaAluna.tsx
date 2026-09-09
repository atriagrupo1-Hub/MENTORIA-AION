import { useState } from "react";
import { cores } from "@/design/tokens";
import type { PedidoConfirmacao } from "./Confirmacao";
import * as dados from "./dados";
import { botaoNeutro, botaoOuro, botaoRemover, campo } from "./estilos";
import { dataCurta, diasAte, diasConcedidos, emPalavras, estadoDoPrazo } from "./prazo";

/**
 * Prazo de acesso de uma aluna.
 *
 * Duas operações diferentes de propósito, porque contam de lugares
 * diferentes:
 *
 *   Definir     — conta a partir do cadastro dela. É o prazo vendido.
 *                 Aplicar de novo recalcula do zero, sem acumular.
 *   Acrescentar — soma ao fim vigente. É a renovação.
 *
 * Nenhuma das duas decide acesso: elas gravam uma data, e quem fecha a
 * porta é o banco, em `conta_ativa()`. Uma aluna vencida não perde nada
 * — progresso e comentários continuam lá, e empurrar a data devolve
 * tudo como estava.
 */

const ATALHOS: Array<{ nome: string; p: dados.Prazo }> = [
  { nome: "7 dias", p: { dias: 7, meses: 0, anos: 0 } },
  { nome: "30 dias", p: { dias: 30, meses: 0, anos: 0 } },
  { nome: "6 meses", p: { dias: 0, meses: 6, anos: 0 } },
  { nome: "1 ano", p: { dias: 0, meses: 0, anos: 1 } },
];

export function PrazoDaAluna({
  aluna,
  executar,
  avisar,
  pedirConfirmacao,
}: {
  aluna: dados.AlunaAdmin;
  executar: (f: () => Promise<unknown>) => Promise<string | null>;
  avisar: (m: string) => void;
  pedirConfirmacao: (p: PedidoConfirmacao) => void;
}) {
  const [dias, setDias] = useState("");
  const [meses, setMeses] = useState("");
  const [anos, setAnos] = useState("");

  const estado = estadoDoPrazo(aluna.acessoAte);
  const restantes = diasAte(aluna.acessoAte);
  const concedidos = diasConcedidos(aluna.criadaEm, aluna.acessoAte);

  const lido = (v: string) => Math.max(0, Math.floor(Number(v) || 0));
  const prazo: dados.Prazo = { dias: lido(dias), meses: lido(meses), anos: lido(anos) };
  const vazio = prazo.dias === 0 && prazo.meses === 0 && prazo.anos === 0;

  function limpar() {
    setDias("");
    setMeses("");
    setAnos("");
  }

  async function aplicar(modo: "definir" | "estender", p: dados.Prazo) {
    const falha = await executar(() =>
      modo === "definir" ? dados.definirAcesso(aluna.id, p) : dados.estenderAcesso(aluna.id, p),
    );
    if (!falha) limpar();
    avisar(
      falha ??
        (modo === "definir"
          ? `Prazo de ${aluna.nome} definido a partir do cadastro.`
          : `Tempo acrescentado ao acesso de ${aluna.nome}.`),
    );
  }

  const numero = {
    ...campo,
    minHeight: 44,
    width: 92,
    padding: "0 12px",
    textAlign: "center" as const,
  };

  return (
    <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,.1)" }}>
      <p
        className="mb-[10px] mt-0 text-[12px] font-bold uppercase tracking-[.16em]"
        style={{ color: cores.ouro }}
      >
        Prazo de acesso
      </p>

      <div
        className="mb-4 flex flex-wrap gap-x-8 gap-y-3 rounded-cartao p-4"
        style={{ background: "rgba(8,12,24,.5)", border: "1px solid rgba(255,255,255,.08)" }}
      >
        <Dado rotulo="Cadastrada em" valor={dataCurta(aluna.criadaEm)} />
        <Dado
          rotulo="Acesso até"
          valor={aluna.acessoAte ? dataCurta(aluna.acessoAte) : "sem prazo"}
        />
        <Dado
          rotulo="Tempo concedido"
          valor={concedidos === null ? "—" : emPalavras(concedidos)}
        />
        <Dado
          rotulo="Situação"
          valor={estado.rotulo}
          cor={estado.vencido ? cores.alerta : estado.perto ? cores.ouro : cores.concluido}
        />
      </div>

      {estado.vencido ? (
        <p className="mb-4 mt-0 text-[13px]" style={{ color: cores.alerta }}>
          O acesso venceu {dataCurta(aluna.acessoAte)}. Ela consegue entrar, mas não vê
          conteúdo nenhum. Nada foi apagado: acrescentar tempo devolve tudo.
        </p>
      ) : null}

      <p className="mb-2 mt-0 text-[13px] text-[rgba(243,236,225,.6)]">
        Quanto tempo de acesso?
      </p>

      <div className="mb-3 flex flex-wrap items-end gap-3">
        <Numero rotulo="Dias" valor={dias} aoMudar={setDias} estilo={numero} />
        <Numero rotulo="Meses" valor={meses} aoMudar={setMeses} estilo={numero} />
        <Numero rotulo="Anos" valor={anos} aoMudar={setAnos} estilo={numero} />

        <span className="flex flex-wrap gap-2">
          {ATALHOS.map((a) => (
            <button
              key={a.nome}
              onClick={() => {
                setDias(a.p.dias ? String(a.p.dias) : "");
                setMeses(a.p.meses ? String(a.p.meses) : "");
                setAnos(a.p.anos ? String(a.p.anos) : "");
              }}
              style={{ ...botaoNeutro, minHeight: 34, padding: "0 12px", fontSize: 12 }}
            >
              {a.nome}
            </button>
          ))}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          disabled={vazio}
          onClick={() => aplicar("definir", prazo)}
          style={{
            ...botaoOuro,
            minHeight: 42,
            padding: "0 18px",
            fontSize: 14,
            opacity: vazio ? 0.4 : 1,
            cursor: vazio ? "default" : "pointer",
          }}
        >
          Definir a partir do cadastro
        </button>

        <button
          disabled={vazio}
          onClick={() => aplicar("estender", prazo)}
          style={{
            ...botaoNeutro,
            minHeight: 42,
            padding: "0 18px",
            fontSize: 14,
            opacity: vazio ? 0.4 : 1,
            cursor: vazio ? "default" : "pointer",
          }}
        >
          Acrescentar ao prazo atual
        </button>

        {aluna.acessoAte ? (
          <button
            onClick={() =>
              pedirConfirmacao({
                titulo: `Deixar ${aluna.nome} sem prazo?`,
                mensagem:
                  "O acesso dela passa a valer para sempre, até alguém definir um prazo novo ou bloquear a conta.",
                executar: async () => {
                  const falha = await executar(() =>
                    dados.definirAcesso(aluna.id, { dias: 0, meses: 0, anos: 0 }),
                  );
                  avisar(falha ?? `${aluna.nome} ficou sem prazo de acesso.`);
                },
              })
            }
            style={{ ...botaoRemover, minHeight: 42, padding: "0 18px", fontSize: 14 }}
          >
            Remover prazo
          </button>
        ) : null}
      </div>

      <p className="mb-0 mt-3 text-[12px] leading-[1.5] text-[rgba(243,236,225,.45)]">
        <strong>Definir</strong> conta a partir de {dataCurta(aluna.criadaEm)}, a data de
        cadastro — aplicar de novo recalcula, não soma.{" "}
        <strong>Acrescentar</strong> soma ao fim que já existe
        {restantes !== null && restantes > 0 ? `, hoje daqui a ${emPalavras(restantes)}` : ""}.
      </p>
    </div>
  );
}

function Dado({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <span className="flex flex-col gap-[3px]">
      <span className="text-[11px] uppercase tracking-[.14em] text-[rgba(243,236,225,.45)]">
        {rotulo}
      </span>
      <span className="text-[15px] font-bold" style={{ color: cor ?? "#fff" }}>
        {valor}
      </span>
    </span>
  );
}

function Numero({
  rotulo,
  valor,
  aoMudar,
  estilo,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  estilo: React.CSSProperties;
}) {
  return (
    <label className="flex flex-col gap-[6px]">
      <span className="text-[11px] uppercase tracking-[.14em] text-[rgba(243,236,225,.45)]">
        {rotulo}
      </span>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        placeholder="0"
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        style={estilo}
      />
    </label>
  );
}
