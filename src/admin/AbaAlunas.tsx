import { useState, type FormEvent } from "react";
import { cores } from "@/design/tokens";
import type { PedidoConfirmacao } from "./Confirmacao";
import * as dados from "./dados";
import { botaoNeutro, botaoOuro, botaoRemover, campo } from "./estilos";
import { estadoDoPrazo } from "./prazo";
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
  const [rascunho, setRascunho] = useState<string[] | null>(null);
  const [moduloAberto, setModuloAberto] = useState("");
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
          const acessos = aberta && rascunho ? rascunho : aluna.acessos;
          const liberadas = acessos.length;
          const alterado =
            aberta && rascunho
              ? JSON.stringify([...rascunho].sort()) !==
                JSON.stringify([...aluna.acessos].sort())
              : false;
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
                      if (aberta) {
                        setAbertaId("");
                        setRascunho(null);
                        setModuloAberto("");
                        return;
                      }
                      setAbertaId(aluna.id);
                      setRascunho([...aluna.acessos]);
                      setModuloAberto("");
                    }}
                    style={botaoNeutro}
                  >
                    {aberta ? "Fechar acessos" : "Definir acessos"}
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
                          setRascunho(null);
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

              {aberta && rascunho ? (
                <div
                  className="mt-4 pt-4"
                  style={{ borderTop: "1px solid rgba(255,255,255,.1)" }}
                >
                  <p
                    className="mb-[10px] mt-0 text-[12px] font-bold uppercase tracking-[.16em]"
                    style={{ color: cores.ouro }}
                  >
                    Conteúdo liberado
                  </p>

                  <div className="mb-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setRascunho(catalogo.modulos.flatMap((m) => m.aulas.map((a) => a.id)));
                        avisar("Curso inteiro marcado. Salve para aplicar.");
                      }}
                      className="min-h-[40px] rounded-pilula border-none px-4 text-[13px]"
                      style={{
                        color: cores.ouroTexto,
                        background: cores.ouro,
                        cursor: "pointer",
                      }}
                    >
                      Liberar curso inteiro
                    </button>
                    <button
                      onClick={() =>
                        pedirConfirmacao({
                          titulo: `Remover todo o conteúdo de ${aluna.nome}?`,
                          mensagem:
                            "Todas as aulas serão desmarcadas. A mudança só vale depois de salvar.",
                          executar: () => {
                            setRascunho([]);
                            avisar("Tudo desmarcado. Salve para aplicar.");
                          },
                        })
                      }
                      style={{ ...botaoNeutro, minHeight: 40, padding: "0 16px" }}
                    >
                      Remover tudo
                    </button>
                  </div>

                  <div className="flex flex-col gap-2">
                    {catalogo.modulos.map((modulo) => {
                      const ids = modulo.aulas.map((a) => a.id);
                      const marcadas = ids.filter((id) => rascunho.includes(id)).length;
                      const todas = marcadas === ids.length && ids.length > 0;
                      const parcial = marcadas > 0 && !todas;
                      const expandido = moduloAberto === modulo.id;

                      return (
                        <div
                          key={modulo.id}
                          className="rounded-botao px-[14px] py-3"
                          style={{
                            background: "rgba(255,255,255,.03)",
                            border: `1px solid ${
                              todas
                                ? "rgba(212,177,112,.4)"
                                : parcial
                                  ? "rgba(212,177,112,.2)"
                                  : "rgba(255,255,255,.08)"
                            }`,
                          }}
                        >
                          <div className="flex flex-wrap items-center gap-[10px]">
                            <button
                              onClick={() =>
                                setRascunho((atual) => {
                                  const base = atual ?? [];
                                  return todas
                                    ? base.filter((id) => !ids.includes(id))
                                    : [...new Set([...base, ...ids])];
                                })
                              }
                              aria-label={
                                todas ? "Remover módulo inteiro" : "Liberar módulo inteiro"
                              }
                              className="grid h-[26px] w-[26px] flex-none place-items-center rounded-mini text-[14px]"
                              style={{
                                color: todas ? cores.ouroTexto : cores.ouroClaro,
                                background: todas ? cores.ouro : "transparent",
                                border: `1px solid ${
                                  todas || parcial ? cores.ouro : "rgba(255,255,255,.28)"
                                }`,
                                cursor: "pointer",
                              }}
                            >
                              {todas ? "✓" : parcial ? "–" : ""}
                            </button>

                            <span className="flex min-w-0 flex-[1_1_200px] flex-col gap-[2px]">
                              <span className="text-[14px] font-bold text-white">
                                Módulo {modulo.numero} — {modulo.titulo}
                              </span>
                              <span className="text-[12px] text-[rgba(243,236,225,.5)]">
                                {marcadas === 0
                                  ? `${ids.length} aulas · nenhuma liberada`
                                  : todas
                                    ? `${ids.length} aulas · todas liberadas`
                                    : `${marcadas} de ${ids.length} aulas liberadas`}
                              </span>
                            </span>

                            <button
                              onClick={() => setModuloAberto(expandido ? "" : modulo.id)}
                              className="min-h-[34px] flex-none rounded-pilula bg-transparent px-3 text-[12px]"
                              style={{
                                color: "rgba(243,236,225,.75)",
                                border: "1px solid rgba(255,255,255,.14)",
                                cursor: "pointer",
                              }}
                            >
                              {expandido ? "Ocultar aulas" : "Selecionar aulas"}
                            </button>
                          </div>

                          {expandido ? (
                            <div className="mt-[10px] flex flex-col gap-[2px] pl-9">
                              {modulo.aulas.map((aula) => {
                                const marcada = rascunho.includes(aula.id);
                                return (
                                  <button
                                    key={aula.id}
                                    onClick={() =>
                                      setRascunho((atual) => {
                                        const base = atual ?? [];
                                        return marcada
                                          ? base.filter((id) => id !== aula.id)
                                          : [...base, aula.id];
                                      })
                                    }
                                    className="flex items-center gap-[10px] border-none bg-transparent py-[9px] text-left hover:opacity-80"
                                    style={{
                                      borderBottom: "1px solid rgba(255,255,255,.07)",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <span
                                      className="grid h-[22px] w-[22px] flex-none place-items-center rounded-[5px] text-[12px]"
                                      style={{
                                        color: cores.ouroTexto,
                                        background: marcada ? cores.ouro : "transparent",
                                        border: `1px solid ${
                                          marcada ? cores.ouro : "rgba(255,255,255,.28)"
                                        }`,
                                      }}
                                    >
                                      {marcada ? "✓" : ""}
                                    </span>
                                    <span
                                      className="min-w-0 flex-1 text-[13px]"
                                      style={{
                                        color: marcada ? "#ffffff" : "rgba(243,236,225,.6)",
                                      }}
                                    >
                                      Aula {aula.numero} — {aula.titulo}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  <div
                    className="mt-4 flex flex-wrap justify-end gap-[10px] pt-[14px]"
                    style={{ borderTop: "1px solid rgba(255,255,255,.1)" }}
                  >
                    <button
                      onClick={() => {
                        setAbertaId("");
                        setRascunho(null);
                        setModuloAberto("");
                        if (alterado) avisar("Alterações descartadas.");
                      }}
                      style={{ ...botaoNeutro, minHeight: 44, padding: "0 20px", fontSize: 14 }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={async () => {
                        if (!alterado) return;
                        const falha = await executar(() =>
                          dados.salvarAcessos(aluna.id, [...rascunho]),
                        );
                        setAbertaId("");
                        setRascunho(null);
                        setModuloAberto("");
                        avisar(falha ?? `Acessos de ${aluna.nome} atualizados.`);
                      }}
                      className="min-h-[44px] rounded-pilula border-none px-6 text-[14px] font-bold"
                      style={{
                        color: alterado ? cores.ouroTexto : "rgba(243,236,225,.45)",
                        background: alterado ? cores.botaoOuro : "rgba(255,255,255,.06)",
                        cursor: alterado ? "pointer" : "default",
                      }}
                    >
                      {alterado ? "Salvar alterações" : "Tudo salvo"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}
