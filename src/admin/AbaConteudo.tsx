import { useState, type FormEvent } from "react";
import type { Aula, Modulo } from "@/data/tipos";
import type { PedidoConfirmacao } from "./Confirmacao";
import * as dados from "./dados";
import { botaoNeutro, botaoOuro, botaoRemover, campo, painel as tema } from "./estilos";
import type { Painel } from "./usePainel";

const BOTAO_LINHA: React.CSSProperties = {
  minHeight: 32,
  padding: "0 11px",
  fontSize: 12,
  color: "rgba(255,255,255,.75)",
  background: "none",
  border: "1px solid rgba(255,255,255,.14)",
  borderRadius: 99,
  cursor: "pointer",
};

/** Extrai o identificador do vídeo a partir de um link ou do próprio id. */
export function idDoVideo(entrada: string): string {
  const s = String(entrada).trim();
  if (!s) return "";
  const comQuery = s.match(/[?&]v=([\w-]{6,})/);
  if (comQuery) return comQuery[1];
  const curto =
    s.match(/youtu\.be\/([\w-]{6,})/) ??
    s.match(/embed\/([\w-]{6,})/) ??
    s.match(/videodelivery\.net\/([\w-]{6,})/) ??
    s.match(/cloudflarestream\.com\/([\w-]{6,})/);
  if (curto) return curto[1];
  if (/^[\w-]{6,}$/.test(s)) return s;
  return "";
}

/** O provedor é deduzido do link. Sem link reconhecível, Cloudflare Stream. */
function provedorDoLink(entrada: string): string {
  const s = entrada.toLowerCase();
  if (s.includes("youtu")) return "youtube";
  if (s.includes("vimeo")) return "vimeo";
  return "stream";
}

export function AbaConteudo({
  painel,
  pedirConfirmacao,
  avisar,
}: {
  painel: Painel;
  pedirConfirmacao: (p: PedidoConfirmacao) => void;
  avisar: (m: string) => void;
}) {
  const { catalogo, midiaAulas, alunas, executar } = painel;
  const [expandido, setExpandido] = useState(true);
  const [novoModulo, setNovoModulo] = useState("");
  const [novaAulaEm, setNovaAulaEm] = useState("");
  const [novaAula, setNovaAula] = useState("");
  const [editando, setEditando] = useState("");
  const [textoEdicao, setTextoEdicao] = useState("");
  const [conteudoDe, setConteudoDe] = useState("");
  const [video, setVideo] = useState("");
  const [capa, setCapa] = useState("");
  const [exercicio, setExercicio] = useState("");

  const totalAulas = catalogo.modulos.reduce((s, m) => s + m.aulas.length, 0);

  async function adicionarModulo(e: FormEvent) {
    e.preventDefault();
    if (!novoModulo.trim()) {
      avisar("Informe o nome do módulo.");
      return;
    }
    const numero = catalogo.modulos.length
      ? Math.max(...catalogo.modulos.map((m) => m.numero)) + 1
      : 0;
    const falha = await executar(() =>
      dados.criarModulo(novoModulo.trim(), numero, catalogo.modulos.length),
    );
    if (!falha) setNovoModulo("");
    avisar(falha ?? "Módulo criado.");
  }

  async function mover(modulo: Modulo, aula: Aula, passo: number) {
    const destino = modulo.aulas[aula.ordem + passo];
    if (!destino) {
      avisar(passo < 0 ? "Esta já é a primeira aula." : "Esta já é a última aula.");
      return;
    }
    const falha = await executar(() =>
      dados.trocarOrdemDasAulas(
        { id: aula.id, numero: aula.numero, ordem: aula.ordem },
        { id: destino.id, numero: destino.numero, ordem: destino.ordem },
      ),
    );
    if (falha) avisar(falha);
  }

  return (
    <>
      <section
        className="rounded-cartao-lg p-4"
        style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.1)" }}
      >
      <div className="flex flex-wrap items-center gap-[10px]">
        <span className="flex min-w-0 flex-[1_1_220px] flex-col gap-[3px]">
          <span className="text-[11px] uppercase tracking-[.24em] text-[#a58a52]">
            Mentoria
          </span>
          <span className="font-titulo text-[22px] text-white">Caminho do Desbloqueio</span>
        </span>
        <span className="text-[13px] text-[rgba(255,255,255,.55)]">
          {catalogo.modulos.length} módulos · {totalAulas} aulas
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
          {/*
            O formulário de criar vive DEPOIS do último item, e não
            antes do primeiro.
            
            Criar um módulo é raro; percorrer a lista é o que se faz
            todo dia. No topo, ele empurrava os onze módulos para baixo
            em toda visita. No fim, está exatamente onde a mão para
            quando alguém chega ao final da lista pensando "falta um".
          */}
          <div className="flex flex-col gap-3">
            {catalogo.modulos.map((modulo) => (
              <div
                key={modulo.id}
                className="rounded-cartao p-4"
                style={{
                  background: "rgba(255,255,255,.03)",
                  border: `1px solid ${
                    modulo.bloqueadoGeral ? "rgba(229,100,92,.28)" : "rgba(255,255,255,.1)"
                  }`,
                }}
              >
                <div className="flex flex-wrap items-center gap-[10px]">
                  <span className="flex min-w-0 flex-[1_1_220px] flex-col gap-[3px]">
                    <span className="text-[15px] font-bold text-white">
                      Módulo {modulo.numero} — {modulo.titulo}
                    </span>
                    <span className="text-[12px] text-[rgba(255,255,255,.5)]">
                      {modulo.aulas.length === 1 ? "1 aula" : `${modulo.aulas.length} aulas`}
                    </span>
                  </span>
                  <span
                    className="flex-none rounded-[5px] px-[11px] py-[5px] text-[11px] uppercase tracking-[.1em]"
                    style={{
                      color: modulo.bloqueadoGeral ? tema.perigo : tema.texto,
                      border: `1px solid ${
                        modulo.bloqueadoGeral ? tema.perigo : tema.linha
                      }`,
                    }}
                  >
                    {modulo.bloqueadoGeral ? "Bloqueado para todas" : "Ativo"}
                  </span>
                  <span className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        const chave = `m:${modulo.id}`;
                        setEditando(editando === chave ? "" : chave);
                        setTextoEdicao(modulo.titulo);
                      }}
                      style={{ ...botaoNeutro, minHeight: 36, padding: "0 13px" }}
                    >
                      {editando === `m:${modulo.id}` ? "Cancelar edição" : "Editar nome"}
                    </button>
                    <button
                      onClick={async () =>
                        avisar(
                          (await executar(() =>
                            dados.atualizarModulo(modulo.id, {
                              bloqueado_geral: !modulo.bloqueadoGeral,
                            }),
                          )) ?? "Estado do módulo atualizado.",
                        )
                      }
                      style={{ ...botaoNeutro, minHeight: 36, padding: "0 13px" }}
                    >
                      {modulo.bloqueadoGeral ? "Desbloquear módulo" : "Bloquear para todas"}
                    </button>
                    <button
                      onClick={async () =>
                        avisar(
                          (await executar(() =>
                            dados.atualizarModulo(modulo.id, {
                              titulo_na_arte: !modulo.tituloNaArte,
                            }),
                          )) ??
                            (modulo.tituloNaArte
                              ? "A tela volta a escrever o título sobre a capa."
                              : "O título sai da tela: quem mostra agora é a arte."),
                        )
                      }
                      style={{ ...botaoNeutro, minHeight: 36, padding: "0 13px" }}
                      title="Use quando a arte da capa já traz o nome do módulo escrito nela, para o título não aparecer duas vezes."
                    >
                      {modulo.tituloNaArte ? "Escrever título na tela" : "Título já está na arte"}
                    </button>
                    <button
                      onClick={() =>
                        pedirConfirmacao({
                          titulo: `Remover o Módulo ${modulo.numero}?`,
                          mensagem: `As ${modulo.aulas.length} aulas dele saem do curso para todas as alunas, junto com o progresso e os comentários delas.`,
                          executar: async () =>
                            avisar(
                              (await executar(() => dados.removerModulo(modulo.id))) ??
                                "Módulo removido.",
                            ),
                        })
                      }
                      style={{ ...botaoRemover, minHeight: 36, padding: "0 13px" }}
                    >
                      Remover módulo
                    </button>
                  </span>
                </div>

                {editando === `m:${modulo.id}` ? (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!textoEdicao.trim()) {
                        avisar("Informe o nome do módulo.");
                        return;
                      }
                      const falha = await executar(() =>
                        dados.atualizarModulo(modulo.id, {
                          titulo: textoEdicao.trim().toUpperCase(),
                        }),
                      );
                      if (!falha) setEditando("");
                      avisar(falha ?? "Nome do módulo atualizado.");
                    }}
                    className="mt-3 flex flex-wrap gap-2"
                  >
                    <input
                      type="text"
                      value={textoEdicao}
                      onChange={(e) => setTextoEdicao(e.target.value)}
                      aria-label="Nome do módulo"
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

                <div className="mt-[10px] flex flex-col">
                  {modulo.aulas.map((aula) => {
                    const midia = midiaAulas.get(aula.id);
                    const anexos = [
                      midia ? `vídeo (${midia.provider})` : null,
                      aula.capaPath ? "capa" : null,
                    ].filter(Boolean);

                    return (
                      <div key={aula.id}>
                        <div
                          className="flex flex-wrap items-center gap-[10px] py-[9px]"
                          style={{ borderBottom: "1px solid rgba(255,255,255,.07)" }}
                        >
                          <span className="flex min-w-0 flex-[1_1_220px] flex-col gap-[2px]">
                            <span
                              className="text-[13px]"
                              style={{
                                color: aula.bloqueadoGeral
                                  ? "rgba(255,255,255,.45)"
                                  : "#ffffff",
                              }}
                            >
                              Aula {aula.numero} — {aula.titulo}
                            </span>
                            <span className="text-[11px] text-[rgba(255,255,255,.4)]">
                              {anexos.length ? anexos.join(" · ") : "sem conteúdo anexado"}
                            </span>
                          </span>

                          <button
                            onClick={() => void mover(modulo, aula, -1)}
                            aria-label="Mover para cima"
                            className="grid h-8 w-8 place-items-center rounded-full bg-transparent text-[14px]"
                            style={{
                              color: "rgba(255,255,255,.7)",
                              border: "1px solid rgba(255,255,255,.14)",
                              cursor: "pointer",
                            }}
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => void mover(modulo, aula, 1)}
                            aria-label="Mover para baixo"
                            className="grid h-8 w-8 place-items-center rounded-full bg-transparent text-[14px]"
                            style={{
                              color: "rgba(255,255,255,.7)",
                              border: "1px solid rgba(255,255,255,.14)",
                              cursor: "pointer",
                            }}
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => {
                              const aberto = conteudoDe === aula.id;
                              setConteudoDe(aberto ? "" : aula.id);
                              setVideo(midia?.ref ?? "");
                              setCapa(aula.capaPath ?? "");
                              setExercicio(aula.exercicio ?? "");
                            }}
                            style={{
                              ...BOTAO_LINHA,
                              color: tema.texto,
                              border: "1px solid rgba(255,255,255,.4)",
                            }}
                          >
                            {conteudoDe === aula.id ? "Fechar conteúdo" : "Conteúdo"}
                          </button>
                          {/*
                            Liberar para a turma inteira.
                            
                            Criar uma aula não a dá a ninguém — liberação
                            é por aluna, e é isso que permite cronograma
                            diferente para cada uma. Mas no caso mais
                            comum, a aula nova que TODAS devem ter, isso
                            custava uma ida à ficha de cada uma.
                            
                            Quem já tem a aula NÃO é tocada: fica com a
                            data que já tinha. A confirmação diz os dois
                            números antes, para a conta poder ser
                            conferida.
                          */}
                          <button
                            onClick={() => {
                              const semAula = alunas.filter((a) => !a.cronograma.has(aula.id));
                              if (alunas.length === 0) {
                                avisar("Nenhuma aluna cadastrada ainda.");
                                return;
                              }
                              if (semAula.length === 0) {
                                avisar(
                                  alunas.length === 1
                                    ? "A única aluna já tem esta aula."
                                    : `Todas as ${alunas.length} alunas já têm esta aula.`,
                                );
                                return;
                              }
                              const jaTem = alunas.length - semAula.length;
                              pedirConfirmacao({
                                titulo: `Liberar a Aula ${aula.numero} para todas?`,
                                mensagem:
                                  `"${aula.titulo}" será liberada, aberta desde já, para ` +
                                  `${semAula.length === 1 ? "1 aluna" : `${semAula.length} alunas`}.` +
                                  (jaTem > 0
                                    ? ` Outra${jaTem === 1 ? "" : "s"} ${jaTem} já ${
                                        jaTem === 1 ? "tem" : "têm"
                                      } a aula e não ${jaTem === 1 ? "será alterada" : "serão alteradas"}.`
                                    : "") +
                                  " Depois você pode ajustar a data de cada uma no Curso dela.",
                                executar: async () => {
                                  let resumo = "";
                                  const falha = await executar(async () => {
                                    resumo = dados.resumoDaLiberacao(
                                      await dados.liberarAulaParaTodas(aula.id, null),
                                      "aula",
                                    );
                                  });
                                  avisar(falha ?? resumo);
                                },
                              });
                            }}
                            style={BOTAO_LINHA}
                          >
                            Liberar para todas
                          </button>
                          <button
                            onClick={() => {
                              const chave = `a:${aula.id}`;
                              setEditando(editando === chave ? "" : chave);
                              setTextoEdicao(aula.titulo);
                            }}
                            style={BOTAO_LINHA}
                          >
                            {editando === `a:${aula.id}` ? "Cancelar" : "Editar"}
                          </button>
                          <button
                            onClick={async () =>
                              avisar(
                                (await executar(() =>
                                  dados.atualizarAula(aula.id, {
                                    bloqueado_geral: !aula.bloqueadoGeral,
                                  }),
                                )) ?? "Estado da aula atualizado.",
                              )
                            }
                            style={BOTAO_LINHA}
                          >
                            {aula.bloqueadoGeral ? "Desbloquear" : "Bloquear"}
                          </button>
                          <button
                            onClick={() =>
                              pedirConfirmacao({
                                titulo: `Remover a Aula ${aula.numero}?`,
                                mensagem: `"${aula.titulo}" sai do curso para todas as alunas, junto com o progresso e os comentários dela.`,
                                executar: async () =>
                                  avisar(
                                    (await executar(() => dados.removerAula(aula.id))) ??
                                      "Aula removida.",
                                  ),
                              })
                            }
                            style={{
                              ...BOTAO_LINHA,
                              color: tema.perigo,
                              border: "1px solid rgba(229,100,92,.28)",
                            }}
                          >
                            Remover
                          </button>
                        </div>

                        {conteudoDe === aula.id ? (
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              const ref = idDoVideo(video);
                              const falha =
                                (await executar(() =>
                                  dados.definirMidiaDaAula(
                                    aula.id,
                                    provedorDoLink(video),
                                    ref,
                                  ),
                                )) ??
                                (await executar(() =>
                                  dados.atualizarAula(aula.id, {
                                    capa_path: capa.trim() || null,
                                    exercicio: exercicio.trim() || null,
                                  }),
                                ));
                              if (!falha) setConteudoDe("");
                              avisar(falha ?? "Conteúdo da aula salvo.");
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
                                rotulo: "Capa da aula — arquivo no depósito `capas`",
                                valor: capa,
                                mudar: setCapa,
                                dica: `modulo-${modulo.numero}-aula-${aula.numero}.webp`,
                              },
                            ].map((linha) => (
                              <label key={linha.rotulo} className="flex flex-col gap-2">
                                <span className="text-[11px] uppercase tracking-[.1em] text-[rgba(255,255,255,.6)]">
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

                            <label className="flex flex-col gap-2">
                              <span className="text-[11px] uppercase tracking-[.1em] text-[rgba(255,255,255,.6)]">
                                Exercício — uma linha por passo
                              </span>
                              <textarea
                                value={exercicio}
                                onChange={(e) => setExercicio(e.target.value)}
                                rows={6}
                                placeholder={
                                  "Abra seu caderno numa página nova.\n" +
                                  "Escreva a data e o título da aula.\n" +
                                  "Responda: o que esta aula revelou sobre você?"
                                }
                                style={{
                                  ...campo,
                                  minHeight: 120,
                                  padding: "10px 14px",
                                  fontSize: 13,
                                  lineHeight: 1.6,
                                  resize: "vertical",
                                  fontFamily: "inherit",
                                }}
                              />
                              <span className="text-[11px] leading-[1.5] text-[rgba(255,255,255,.36)]">
                                A aluna vê os passos numerados, e só depois de
                                concluir a aula. Deixe vazio para a aula não ter
                                exercício.
                              </span>
                            </label>

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

                        {editando === `a:${aula.id}` ? (
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              if (!textoEdicao.trim()) {
                                avisar("Informe o nome da aula.");
                                return;
                              }
                              const falha = await executar(() =>
                                dados.atualizarAula(aula.id, { titulo: textoEdicao.trim() }),
                              );
                              if (!falha) setEditando("");
                              avisar(falha ?? "Nome da aula atualizado.");
                            }}
                            className="flex flex-wrap gap-2 pb-3 pt-1"
                          >
                            <input
                              type="text"
                              value={textoEdicao}
                              onChange={(e) => setTextoEdicao(e.target.value)}
                              aria-label="Nome da aula"
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

                  {/*
                    Criar a aula nova mora aqui, no fim da lista, e está
                    sempre à vista.
                    
                    Antes era um botão no cabeçalho do módulo que abria
                    um formulário ACIMA das aulas — quem chegava ao fim
                    da lista pensando "falta uma" tinha de voltar ao
                    topo, achar o botão, e a aula nascia longe de onde
                    ia aparecer. Agora o campo está onde a aula vai
                    ficar.
                  */}
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const titulo = (novaAulaEm === modulo.id ? novaAula : "").trim();
                      if (!titulo) {
                        avisar("Informe o nome da aula.");
                        return;
                      }
                      const falha = await executar(() =>
                        dados.criarAula(
                          modulo.id,
                          titulo,
                          modulo.aulas.length + 1,
                          modulo.aulas.length,
                        ),
                      );
                      if (!falha) setNovaAula("");
                      avisar(falha ?? "Aula adicionada.");
                    }}
                    className="mt-3 flex flex-wrap gap-2"
                  >
                    <input
                      type="text"
                      value={novaAulaEm === modulo.id ? novaAula : ""}
                      onFocus={() => {
                        // Um campo por módulo, e o texto é de quem tem o
                        // foco: sem isto, digitar no Módulo 3 apareceria
                        // nos onze campos ao mesmo tempo.
                        if (novaAulaEm !== modulo.id) {
                          setNovaAulaEm(modulo.id);
                          setNovaAula("");
                        }
                      }}
                      onChange={(e) => setNovaAula(e.target.value)}
                      placeholder={`Nova aula no Módulo ${modulo.numero}`}
                      aria-label={`Nome da nova aula do Módulo ${modulo.numero}`}
                      style={{ ...campo, flex: "2 1 240px", minHeight: 42, fontSize: 13 }}
                    />
                    <button
                      type="submit"
                      style={{ ...botaoNeutro, minHeight: 42, padding: "0 18px", fontSize: 13 }}
                    >
                      Adicionar aula
                    </button>
                  </form>
                </div>
              </div>
            ))}

            <form
              onSubmit={adicionarModulo}
              className="flex flex-wrap gap-[10px] rounded-[14px] p-4"
              style={{
                background: "transparent",
                border: "1px dashed rgba(255,255,255,.16)",
              }}
            >
              <input
                type="text"
                value={novoModulo}
                onChange={(e) => setNovoModulo(e.target.value)}
                placeholder="Nome do novo módulo"
                aria-label="Nome do novo módulo"
                style={{ ...campo, flex: "2 1 260px" }}
              />
              <button type="submit" style={{ ...botaoOuro, flex: "0 0 auto" }}>
                Adicionar módulo
              </button>
            </form>
          </div>
        </div>
      )}
      </section>
    </>
  );
}
