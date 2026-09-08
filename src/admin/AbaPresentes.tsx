import { useState, type FormEvent } from "react";
import { cores } from "@/design/tokens";
import { idDoVideo } from "./AbaConteudo";
import type { PedidoConfirmacao } from "./Confirmacao";
import * as dados from "./dados";
import { botaoNeutro, botaoOuro, botaoRemover, campo } from "./estilos";
import type { Painel } from "./usePainel";

const BOTAO_LINHA: React.CSSProperties = {
  minHeight: 32,
  padding: "0 11px",
  fontSize: 12,
  color: "rgba(243,236,225,.75)",
  background: "none",
  border: "1px solid rgba(255,255,255,.14)",
  borderRadius: 99,
  cursor: "pointer",
};

function provedorDoLink(entrada: string): string {
  const s = entrada.toLowerCase();
  if (s.includes("youtu")) return "youtube";
  if (s.includes("vimeo")) return "vimeo";
  return "stream";
}

export function AbaPresentes({
  painel,
  categoriaSozinha,
  pedirConfirmacao,
  avisar,
}: {
  painel: Painel;
  categoriaSozinha: string | null;
  pedirConfirmacao: (p: PedidoConfirmacao) => void;
  avisar: (m: string) => void;
}) {
  const { catalogo, midiaPresentes, executar } = painel;
  const [expandido, setExpandido] = useState(true);
  const [novaCategoria, setNovaCategoria] = useState("");
  const [novoPresenteEm, setNovoPresenteEm] = useState("");
  const [novoPresente, setNovoPresente] = useState("");
  const [editando, setEditando] = useState("");
  const [textoEdicao, setTextoEdicao] = useState("");
  const [conteudoDe, setConteudoDe] = useState("");
  const [video, setVideo] = useState("");
  const [capa, setCapa] = useState("");
  const [duracao, setDuracao] = useState("");
  const [descricao, setDescricao] = useState("");
  const [movendo, setMovendo] = useState("");

  const visiveis = categoriaSozinha
    ? catalogo.categorias.filter((c) => c.id === categoriaSozinha)
    : catalogo.categorias.filter((c) => !c.destacada);

  const totalPresentes = catalogo.categorias.reduce((s, c) => s + c.presentes.length, 0);

  async function adicionarCategoria(e: FormEvent) {
    e.preventDefault();
    if (!novaCategoria.trim()) {
      avisar("Informe o nome da categoria.");
      return;
    }
    const falha = await executar(() =>
      dados.criarCategoria(novaCategoria.trim(), catalogo.categorias.length),
    );
    if (!falha) setNovaCategoria("");
    avisar(falha ?? "Categoria criada.");
  }

  const cabecalho = categoriaSozinha
    ? (catalogo.categorias.find((c) => c.id === categoriaSozinha)?.titulo ?? "Categoria")
    : "Acervo de presentes";

  return (
    <section
      className="rounded-cartao-lg p-4"
      style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.1)" }}
    >
      <div className="flex flex-wrap items-center gap-[10px]">
        <span className="flex min-w-0 flex-[1_1_220px] flex-col gap-[3px]">
          <span className="text-[11px] uppercase tracking-[.24em] text-[#a58a52]">
            {categoriaSozinha ? "Categoria" : "Presentes"}
          </span>
          <span className="font-titulo text-[22px] text-marfim">{cabecalho}</span>
        </span>
        <span className="text-[13px] text-[rgba(243,236,225,.55)]">
          {catalogo.categorias.length}{" "}
          {catalogo.categorias.length === 1 ? "categoria" : "categorias"} · {totalPresentes}{" "}
          {totalPresentes === 1 ? "presente" : "presentes"}
        </span>
        <button
          onClick={() => setExpandido((v) => !v)}
          style={{ ...botaoNeutro, minHeight: 40, padding: "0 16px" }}
        >
          {expandido ? "Recolher" : "Expandir"}
        </button>
      </div>

      {!expandido ? null : (
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,.1)" }}>
          <div className="flex flex-col gap-3">
            {visiveis.map((categoria) => (
              <div
                key={categoria.id}
                className="rounded-cartao p-4"
                style={{
                  background: "rgba(255,255,255,.03)",
                  border: `1px solid ${
                    categoria.bloqueadaGeral
                      ? "rgba(230,168,154,.28)"
                      : "rgba(255,255,255,.1)"
                  }`,
                }}
              >
                <div className="flex flex-wrap items-center gap-[10px]">
                  <span className="flex min-w-0 flex-[1_1_200px] flex-col gap-[3px]">
                    <span className="text-[15px] font-bold text-white">
                      {categoria.titulo}
                    </span>
                    <span className="text-[12px] text-[rgba(243,236,225,.5)]">
                      {categoria.presentes.length === 1
                        ? "1 presente"
                        : `${categoria.presentes.length} presentes`}
                    </span>
                  </span>
                  <span
                    className="flex-none rounded-pilula px-[11px] py-[5px] text-[11px] uppercase tracking-[.1em]"
                    style={{
                      color: categoria.bloqueadaGeral ? cores.alerta : cores.concluido,
                      border: `1px solid ${
                        categoria.bloqueadaGeral ? cores.alerta : cores.concluido
                      }`,
                    }}
                  >
                    {categoria.bloqueadaGeral ? "Bloqueada para todas" : "Ativa"}
                  </span>
                  <span className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        const chave = `c:${categoria.id}`;
                        setEditando(editando === chave ? "" : chave);
                        setTextoEdicao(categoria.titulo);
                      }}
                      style={{ ...botaoNeutro, minHeight: 36, padding: "0 13px" }}
                    >
                      {editando === `c:${categoria.id}` ? "Cancelar edição" : "Editar nome"}
                    </button>
                    <button
                      onClick={() => {
                        setNovoPresenteEm(
                          novoPresenteEm === categoria.id ? "" : categoria.id,
                        );
                        setNovoPresente("");
                      }}
                      style={{ ...botaoNeutro, minHeight: 36, padding: "0 13px" }}
                    >
                      {novoPresenteEm === categoria.id ? "Fechar" : "Adicionar presente"}
                    </button>
                    <button
                      onClick={async () =>
                        avisar(
                          (await executar(() =>
                            dados.atualizarCategoria(categoria.id, {
                              destacada: !categoria.destacada,
                            }),
                          )) ??
                            (categoria.destacada
                              ? `${categoria.titulo} voltou para Presentes.`
                              : `${categoria.titulo} agora tem sua própria subaba.`),
                        )
                      }
                      style={{ ...botaoNeutro, minHeight: 36, padding: "0 13px" }}
                    >
                      {categoria.destacada ? "Voltar para Presentes" : "Deixar sozinha"}
                    </button>
                    <button
                      onClick={async () =>
                        avisar(
                          (await executar(() =>
                            dados.atualizarCategoria(categoria.id, {
                              bloqueada_geral: !categoria.bloqueadaGeral,
                            }),
                          )) ?? "Estado da categoria atualizado.",
                        )
                      }
                      style={{ ...botaoNeutro, minHeight: 36, padding: "0 13px" }}
                    >
                      {categoria.bloqueadaGeral ? "Desbloquear" : "Bloquear para todas"}
                    </button>
                    <button
                      onClick={() =>
                        pedirConfirmacao({
                          titulo: `Remover a categoria ${categoria.titulo}?`,
                          mensagem: `Os ${categoria.presentes.length} presentes dela saem do acervo para todas as alunas.`,
                          executar: async () =>
                            avisar(
                              (await executar(() =>
                                dados.removerCategoria(categoria.id),
                              )) ?? "Categoria removida.",
                            ),
                        })
                      }
                      style={{ ...botaoRemover, minHeight: 36, padding: "0 13px" }}
                    >
                      Remover categoria
                    </button>
                  </span>
                </div>

                {editando === `c:${categoria.id}` ? (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!textoEdicao.trim()) {
                        avisar("Informe o nome da categoria.");
                        return;
                      }
                      const falha = await executar(() =>
                        dados.atualizarCategoria(categoria.id, { titulo: textoEdicao.trim() }),
                      );
                      if (!falha) setEditando("");
                      avisar(falha ?? "Nome da categoria atualizado.");
                    }}
                    className="mt-3 flex flex-wrap gap-2"
                  >
                    <input
                      type="text"
                      value={textoEdicao}
                      onChange={(e) => setTextoEdicao(e.target.value)}
                      aria-label="Nome da categoria"
                      style={{ ...campo, flex: "2 1 240px", minHeight: 44, fontSize: 14 }}
                    />
                    <button
                      type="submit"
                      style={{ ...botaoOuro, minHeight: 44, padding: "0 20px", fontSize: 14 }}
                    >
                      Salvar nome
                    </button>
                  </form>
                ) : null}

                {novoPresenteEm === categoria.id ? (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!novoPresente.trim()) {
                        avisar("Informe o nome do presente.");
                        return;
                      }
                      const falha = await executar(() =>
                        dados.criarPresente(
                          categoria.id,
                          novoPresente.trim(),
                          categoria.presentes.length,
                        ),
                      );
                      if (!falha) setNovoPresente("");
                      avisar(falha ?? "Presente adicionado.");
                    }}
                    className="mt-3 flex flex-wrap gap-2"
                  >
                    <input
                      type="text"
                      value={novoPresente}
                      onChange={(e) => setNovoPresente(e.target.value)}
                      placeholder="Nome do novo presente"
                      aria-label="Nome do novo presente"
                      style={{ ...campo, flex: "2 1 240px", minHeight: 44, fontSize: 14 }}
                    />
                    <button
                      type="submit"
                      style={{ ...botaoOuro, minHeight: 44, padding: "0 20px", fontSize: 14 }}
                    >
                      Salvar presente
                    </button>
                  </form>
                ) : null}

                <div className="mt-[10px] flex flex-col">
                  {categoria.presentes.map((presente) => {
                    const midia = midiaPresentes.get(presente.id);
                    const anexos = [
                      midia ? `vídeo (${midia.provider})` : null,
                      presente.capaPath ? "capa" : null,
                      presente.descricao ? "descrição" : null,
                    ].filter(Boolean);

                    return (
                      <div key={presente.id}>
                        <div
                          className="flex flex-wrap items-center gap-[10px] py-[9px]"
                          style={{ borderBottom: "1px solid rgba(255,255,255,.07)" }}
                        >
                          <span className="flex min-w-0 flex-[1_1_200px] flex-col gap-[2px]">
                            <span
                              className="text-[13px]"
                              style={{
                                color: presente.bloqueadoGeral
                                  ? "rgba(243,236,225,.45)"
                                  : "#ffffff",
                              }}
                            >
                              {presente.ordem + 1}. {presente.titulo}
                            </span>
                            <span className="text-[11px] text-[rgba(243,236,225,.4)]">
                              {anexos.length ? anexos.join(" · ") : "sem conteúdo anexado"}
                            </span>
                          </span>

                          <button
                            onClick={() => {
                              const aberto = conteudoDe === presente.id;
                              setConteudoDe(aberto ? "" : presente.id);
                              setVideo(midia?.ref ?? "");
                              setCapa(presente.capaPath ?? "");
                              setDuracao(presente.duracaoTexto);
                              setDescricao(presente.descricao);
                            }}
                            style={{
                              ...BOTAO_LINHA,
                              color: cores.ouroMedio,
                              border: "1px solid rgba(212,177,112,.4)",
                            }}
                          >
                            {conteudoDe === presente.id ? "Fechar conteúdo" : "Conteúdo"}
                          </button>
                          <button
                            onClick={() => {
                              const chave = `p:${presente.id}`;
                              setEditando(editando === chave ? "" : chave);
                              setTextoEdicao(presente.titulo);
                            }}
                            style={BOTAO_LINHA}
                          >
                            {editando === `p:${presente.id}` ? "Cancelar" : "Editar"}
                          </button>
                          <button
                            onClick={() =>
                              setMovendo(movendo === presente.id ? "" : presente.id)
                            }
                            style={BOTAO_LINHA}
                          >
                            {movendo === presente.id ? "Fechar" : "Mover"}
                          </button>
                          <button
                            onClick={async () =>
                              avisar(
                                (await executar(() =>
                                  dados.atualizarPresente(presente.id, {
                                    bloqueado_geral: !presente.bloqueadoGeral,
                                  }),
                                )) ?? "Estado do presente atualizado.",
                              )
                            }
                            style={BOTAO_LINHA}
                          >
                            {presente.bloqueadoGeral ? "Desbloquear" : "Bloquear"}
                          </button>
                          <button
                            onClick={() =>
                              pedirConfirmacao({
                                titulo: `Remover ${presente.titulo}?`,
                                mensagem: "O presente sai do acervo para todas as alunas.",
                                executar: async () =>
                                  avisar(
                                    (await executar(() =>
                                      dados.removerPresente(presente.id),
                                    )) ?? "Presente removido.",
                                  ),
                              })
                            }
                            style={{
                              ...BOTAO_LINHA,
                              color: cores.alerta,
                              border: "1px solid rgba(230,168,154,.28)",
                            }}
                          >
                            Remover
                          </button>
                        </div>

                        {movendo === presente.id ? (
                          <div className="flex flex-wrap gap-2 pb-3 pt-1">
                            {catalogo.categorias
                              .filter((c) => c.id !== categoria.id)
                              .map((destino) => (
                                <button
                                  key={destino.id}
                                  onClick={async () => {
                                    const falha = await executar(() =>
                                      dados.atualizarPresente(presente.id, {
                                        categoria_id: destino.id,
                                        ordem: destino.presentes.length,
                                      }),
                                    );
                                    setMovendo("");
                                    avisar(
                                      falha ?? `Presente movido para ${destino.titulo}.`,
                                    );
                                  }}
                                  style={BOTAO_LINHA}
                                >
                                  {destino.titulo}
                                </button>
                              ))}
                          </div>
                        ) : null}

                        {conteudoDe === presente.id ? (
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              const ref = idDoVideo(video);
                              const falha =
                                (await executar(() =>
                                  dados.definirMidiaDoPresente(
                                    presente.id,
                                    provedorDoLink(video),
                                    ref,
                                  ),
                                )) ??
                                (await executar(() =>
                                  dados.atualizarPresente(presente.id, {
                                    capa_path: capa.trim() || null,
                                    duracao_texto: duracao.trim(),
                                    descricao: descricao.trim(),
                                  }),
                                ));
                              if (!falha) setConteudoDe("");
                              avisar(falha ?? "Conteúdo do presente salvo.");
                            }}
                            className="flex flex-col gap-2 pb-[14px] pt-[6px]"
                          >
                            {[
                              {
                                rotulo: "Vídeo — link ou identificador (Cloudflare Stream)",
                                valor: video,
                                mudar: setVideo,
                                dica: "https://iframe.videodelivery.net/<uid>  ou só o uid",
                              },
                              {
                                rotulo: "Capa — arquivo no depósito `capas` (2:3)",
                                valor: capa,
                                mudar: setCapa,
                                dica: `presente-${presente.ordem + 1}.png`,
                              },
                              {
                                rotulo: "Duração",
                                valor: duracao,
                                mudar: setDuracao,
                                dica: "48 min",
                              },
                              {
                                rotulo: "Descrição",
                                valor: descricao,
                                mudar: setDescricao,
                                dica: "Sobre este presente",
                              },
                            ].map((linha) => (
                              <label key={linha.rotulo} className="flex flex-col gap-2">
                                <span className="text-[11px] uppercase tracking-[.1em] text-[rgba(243,236,225,.6)]">
                                  {linha.rotulo}
                                </span>
                                <input
                                  type="text"
                                  value={linha.valor}
                                  onChange={(e) => linha.mudar(e.target.value)}
                                  placeholder={linha.dica}
                                  style={{ ...campo, minHeight: 42, fontSize: 13 }}
                                />
                              </label>
                            ))}
                            <div className="mt-[2px] flex flex-wrap gap-2">
                              <button
                                type="submit"
                                style={{
                                  ...botaoOuro,
                                  minHeight: 42,
                                  padding: "0 18px",
                                  fontSize: 13,
                                }}
                              >
                                Salvar conteúdo
                              </button>
                              <button
                                type="button"
                                onClick={() => setConteudoDe("")}
                                style={{ ...botaoNeutro, minHeight: 42, padding: "0 16px" }}
                              >
                                Cancelar
                              </button>
                            </div>
                          </form>
                        ) : null}

                        {editando === `p:${presente.id}` ? (
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              if (!textoEdicao.trim()) {
                                avisar("Informe o nome do presente.");
                                return;
                              }
                              const falha = await executar(() =>
                                dados.atualizarPresente(presente.id, {
                                  titulo: textoEdicao.trim(),
                                }),
                              );
                              if (!falha) setEditando("");
                              avisar(falha ?? "Nome do presente atualizado.");
                            }}
                            className="flex flex-wrap gap-2 pb-3 pt-1"
                          >
                            <input
                              type="text"
                              value={textoEdicao}
                              onChange={(e) => setTextoEdicao(e.target.value)}
                              aria-label="Nome do presente"
                              style={{ ...campo, flex: "2 1 220px", minHeight: 42, fontSize: 14 }}
                            />
                            <button
                              type="submit"
                              style={{
                                ...botaoOuro,
                                minHeight: 42,
                                padding: "0 18px",
                                fontSize: 13,
                              }}
                            >
                              Salvar
                            </button>
                          </form>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {categoriaSozinha ? null : (
            <form onSubmit={adicionarCategoria} className="mt-4 flex flex-wrap gap-[10px]">
              <input
                type="text"
                value={novaCategoria}
                onChange={(e) => setNovaCategoria(e.target.value)}
                placeholder="Nome da nova categoria"
                aria-label="Nome da nova categoria"
                style={{ ...campo, flex: "2 1 240px", minHeight: 46 }}
              />
              <button
                type="submit"
                style={{ ...botaoOuro, flex: "0 0 auto", minHeight: 46, padding: "0 22px" }}
              >
                Adicionar categoria
              </button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
