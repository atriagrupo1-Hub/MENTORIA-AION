import { useState, type FormEvent } from "react";
import { cores } from "@/design/tokens";
import type { PedidoConfirmacao } from "./Confirmacao";
import * as dados from "./dados";
import { botaoNeutro, botaoOuro, botaoRemover, campo } from "./estilos";
import { estadoDoPrazo } from "./prazo";
import { CronogramaDaAluna } from "./CronogramaDaAluna";
import { PrazoDaAluna } from "./PrazoDaAluna";
import type { Painel } from "./usePainel";

export function AbaAlunas({
  painel,
  pedirConfirmacao,
  avisar,
}: {
  painel: Painel;
  pedirConfirmacao: (p: PedidoConfirmacao) => void;
  avisar: (m: string) => void;
}) {
  const { catalogo, alunas, executar, recarregar } = painel;
  const [nome, setNome] = useState("");
  const [login, setLogin] = useState("");
  const [codigo, setCodigo] = useState("");
  const [abertaId, setAbertaId] = useState("");
  const [prazoId, setPrazoId] = useState("");
  const [salvando, setSalvando] = useState(false);

  const totalAulas = catalogo.modulos.reduce((s, m) => s + m.aulas.length, 0);

  async function cadastrar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      avisar("Informe o nome da aluna.");
      return;
    }
    if (!/^[0-9]{4,6}$/.test(codigo.trim())) {
      avisar("O código tem 4 números.");
      return;
    }
    setSalvando(true);
    const acesso = login.trim() || nome.trim().toLowerCase().replace(/\s+/g, ".");
    const r = await dados.cadastrarAluna(nome.trim(), acesso, codigo.trim());
    setSalvando(false);
    if (!r.ok) {
      avisar(r.mensagem);
      return;
    }
    setNome("");
    setLogin("");
    setCodigo("");
    await recarregar();
    avisar(`${nome.trim()} foi cadastrada.`);
  }

  return (
    <>
      <form
        onSubmit={cadastrar}
        className="mb-6 flex flex-wrap gap-[10px] rounded-[14px] p-4"
        style={{
          background: "rgba(255,255,255,.03)",
          border: "1px solid rgba(255,255,255,.1)",
        }}
      >
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome da aluna"
          aria-label="Nome da aluna"
          style={{ ...campo, flex: "2 1 200px" }}
        />
        <input
          type="text"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          placeholder="Nome de acesso"
          aria-label="Nome de acesso"
          style={{ ...campo, flex: "1 1 160px" }}
        />
        <input
          type="text"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="Código (4 números)"
          aria-label="Código de acesso"
          inputMode="numeric"
          style={{ ...campo, flex: "1 1 150px" }}
        />
        <button
          type="submit"
          disabled={salvando}
          style={{ ...botaoOuro, flex: "0 0 auto", opacity: salvando ? 0.7 : 1 }}
        >
          {salvando ? "Cadastrando..." : "Cadastrar aluna"}
        </button>
      </form>

      {alunas.length === 0 ? (
        <p
          className="mb-6 mt-0 rounded-[14px] p-[22px] text-center text-[15px]"
          style={{
            color: "rgba(243,236,225,.5)",
            background: "rgba(255,255,255,.03)",
            border: "1px dashed rgba(255,255,255,.14)",
          }}
        >
          Nenhuma aluna cadastrada ainda.
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        {alunas.map((aluna) => {
          const aberta = abertaId === aluna.id;
          const liberadas = aluna.cronograma.size;
          const bloqueada = aluna.status === "bloqueada";
          const prazo = estadoDoPrazo(aluna.acessoAte);
          const prazoAberto = prazoId === aluna.id;

          return (
            <div
              key={aluna.id}
              className="rounded-cartao p-4"
              style={{
                background: bloqueada ? "rgba(230,168,154,.05)" : "rgba(255,255,255,.03)",
                border: `1px solid ${
                  bloqueada ? "rgba(230,168,154,.24)" : "rgba(255,255,255,.1)"
                }`,
              }}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="grid h-[42px] w-[42px] flex-none place-items-center rounded-full text-[16px] font-bold"
                  style={{
                    background: "linear-gradient(135deg, #d4b170, #8f7a45)",
                    color: cores.ouroTexto,
                  }}
                >
                  {aluna.nome.charAt(0).toUpperCase()}
                </span>
                <span className="flex min-w-0 flex-[1_1_200px] flex-col gap-[3px]">
                  <span className="text-[16px] font-bold text-white">{aluna.nome}</span>
                  <span className="text-[13px] text-[rgba(243,236,225,.55)]">
                    {aluna.login} · código {aluna.codigo} ·{" "}
                    {liberadas === 0
                      ? "sem conteúdo liberado"
                      : liberadas === totalAulas
                        ? "curso inteiro liberado"
                        : `${liberadas} de ${totalAulas} aulas liberadas`}
                  </span>
                </span>
                <span
                  className="flex-none rounded-pilula px-3 py-[6px] text-[11px] uppercase tracking-[.12em]"
                  style={{
                    color: bloqueada ? cores.alerta : cores.concluido,
                    border: `1px solid ${bloqueada ? cores.alerta : cores.concluido}`,
                  }}
                >
                  {bloqueada ? "Bloqueada" : "Ativa"}
                </span>
                {prazo.semPrazo ? null : (
                  <span
                    className="flex-none rounded-pilula px-3 py-[6px] text-[11px] uppercase tracking-[.12em]"
                    style={{
                      color: prazo.vencido
                        ? cores.alerta
                        : prazo.perto
                          ? cores.ouro
                          : "rgba(243,236,225,.6)",
                      border: `1px solid ${
                        prazo.vencido
                          ? cores.alerta
                          : prazo.perto
                            ? cores.ouro
                            : "rgba(255,255,255,.18)"
                      }`,
                    }}
                  >
                    {prazo.rotulo}
                  </span>
                )}
                <span className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setAbertaId(aberta ? "" : aluna.id);
                    }}
                    style={botaoNeutro}
                  >
                    {aberta ? "Fechar cronograma" : "Cronograma"}
                  </button>
                  <button
                    onClick={() => setPrazoId(prazoAberto ? "" : aluna.id)}
                    style={botaoNeutro}
                  >
                    {prazoAberto ? "Fechar prazo" : "Prazo de acesso"}
                  </button>
                  <button
                    onClick={async () => {
                      const falha = await executar(() =>
                        dados.definirStatus(aluna.id, bloqueada ? "ativa" : "bloqueada"),
                      );
                      avisar(
                        falha ??
                          (bloqueada
                            ? `${aluna.nome} foi desbloqueada.`
                            : `${aluna.nome} foi bloqueada.`),
                      );
                    }}
                    style={botaoNeutro}
                  >
                    {bloqueada ? "Desbloquear" : "Bloquear"}
                  </button>
                  <button
                    onClick={() =>
                      pedirConfirmacao({
                        titulo: `Remover ${aluna.nome}?`,
                        mensagem:
                          "A aluna perde o acesso, e o progresso, as curtidas e os comentários dela são apagados junto.",
                        executar: async () => {
                          const falha = await executar(() => dados.removerAluna(aluna.id));
                          setAbertaId("");
                          avisar(falha ?? `${aluna.nome} foi removida.`);
                        },
                      })
                    }
                    style={botaoRemover}
                  >
                    Remover
                  </button>
                </span>
              </div>

              {prazoAberto ? (
                <PrazoDaAluna
                  aluna={aluna}
                  executar={executar}
                  avisar={avisar}
                  pedirConfirmacao={pedirConfirmacao}
                />
              ) : null}

              {aberta ? (
                <CronogramaDaAluna
                  aluna={aluna}
                  catalogo={catalogo}
                  midiaAulas={painel.midiaAulas}
                  intervaloPadrao={painel.configuracao.intervaloDias}
                  executar={executar}
                  avisar={avisar}
                  pedirConfirmacao={pedirConfirmacao}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}
