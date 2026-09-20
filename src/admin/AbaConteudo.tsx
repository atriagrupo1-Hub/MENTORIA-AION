import { useState, type FormEvent } from "react";
import type { Aula, Modulo } from "@/data/tipos";
import type { PedidoConfirmacao } from "./Confirmacao";
import { Arrastavel, marcaDoDestino, useArrastar } from "./arrastar";
import * as dados from "./dados";
import { EditorConteudos } from "./EditorConteudos";
import {
  botaoNeutro,
  botaoNeutroGrande,
  botaoOuro,
  botaoRemover,
  campo,
  painel as tema,
  rotulo,
} from "./estilos";
import type { Painel } from "./usePainel";
import { idDoVideo, provedorDoLink } from "./video";

/*
 * O botão das linhas de aula e de presente.
 *
 * Era 32px de altura e 1px de borda a .14 — 1,35:1 contra o fundo, um
 * contorno que praticamente não existe. E são estes botões que carregam
 * "Remover" e "Bloquear": sete numa linha só, repetidos cinquenta
 * vezes. 36px é o mesmo do `botaoNeutro`, que já é a medida do resto do
 * painel; .36 na borda é o mínimo que a norma pede para o limite de um
 * controle.
 */
const BOTAO_LINHA: React.CSSProperties = {
  minHeight: 36,
  padding: "0 12px",
  fontSize: 12,
  color: "rgba(255,255,255,.75)",
  background: "none",
  border: "1px solid rgba(255,255,255,.36)",
  borderRadius: 99,
  cursor: "pointer",
};


export function AbaConteudo({
  painel,
  produtoId,
  pedirConfirmacao,
  avisar,
}: {
  painel: Painel;
  /**
   * Montado dentro de um produto, mostra só os módulos DELE. Sem a
   * prop, mostra todos — é como a aba antiga funcionava, e é o que
   * mantém o componente utilizável nos dois lugares sem reescrita.
   */
  produtoId?: string;
  pedirConfirmacao: (p: PedidoConfirmacao) => void;
  avisar: (m: string) => void;
}) {
  const { catalogo, midiaAulas, alunas, executar } = painel;

  const modulos = produtoId
    ? catalogo.modulos.filter((m) => m.produtoId === produtoId)
    : catalogo.modulos;
  const [expandido, setExpandido] = useState(true);
  /*
   * Quais módulos estão abertos. Vazio de saída: onze módulos abertos
   * ao mesmo tempo são cinquenta aulas empilhadas numa página só, e
   * chegar ao módulo 7 vira rolagem. Fechado é o padrão, e o
   * cabeçalho já diz quantas aulas há dentro — que é a informação que
   * faz decidir se vale abrir.
   */
  const [modulosAbertos, setModulosAbertos] = useState<Set<string>>(new Set());

  const alternarModulo = (id: string) =>
    setModulosAbertos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  const [novoModulo, setNovoModulo] = useState("");
  const [novaAulaEm, setNovaAulaEm] = useState("");
  const [novaAula, setNovaAula] = useState("");
  const [editando, setEditando] = useState("");
  const [textoEdicao, setTextoEdicao] = useState("");
  const [descricaoEdicao, setDescricaoEdicao] = useState("");
  const [capaEdicao, setCapaEdicao] = useState("");
  const [conteudoDe, setConteudoDe] = useState("");
  const [video, setVideo] = useState("");
  const [capa, setCapa] = useState("");
  const [exercicio, setExercicio] = useState("");

  const totalAulas = modulos.reduce((s, m) => s + m.aulas.length, 0);

  /*
   * "de 12 alunas" em vez de "das alunas".
   *
   * A confirmação de um bloqueio tem de dizer o tamanho do estrago em
   * número: "some da tela de 12 alunas" faz pensar; "some da tela das
   * alunas" é paisagem.
   */
  const quantasAlunas = () => {
    const n = alunas.filter((a) => a.status === "ativa").length;
    if (n === 0) return "todas as alunas";
    return n === 1 ? "1 aluna ativa" : `${n} alunas ativas`;
  };

  async function adicionarModulo(e: FormEvent) {
    e.preventDefault();
    if (!novoModulo.trim()) {
      avisar("Informe o nome do módulo.");
      return;
    }
    const numero = modulos.length ? Math.max(...modulos.map((m) => m.numero)) + 1 : 0;
    const falha = await executar(() =>
      dados.criarModulo(novoModulo.trim(), numero, modulos.length, produtoId),
    );
    if (!falha) setNovoModulo("");
    avisar(falha ?? "Módulo criado.");
  }

  async function gravarOrdemDosModulos(ids: string[]) {
    const falha = await executar(() => dados.ordenarModulos(ids));
    avisar(falha ?? "Ordem salva. A área da aluna já segue esta ordem.");
  }

  async function moverModulo(modulo: Modulo, passo: -1 | 1) {
    const atual = modulos.findIndex((m) => m.id === modulo.id);
    const destino = atual + passo;
    if (atual < 0 || destino < 0 || destino >= modulos.length) return;
    const ordenada = [...modulos];
    const [movido] = ordenada.splice(atual, 1);
    ordenada.splice(destino, 0, movido);
    await gravarOrdemDosModulos(ordenada.map((m) => m.id));
  }

  const arrastoModulo = useArrastar(
    modulos.map((m) => m.id),
    gravarOrdemDosModulos,
  );

  async function gravarOrdemDosConteudos(moduloId: string, ids: string[]) {
    const falha = await executar(() => dados.ordenarAulas(moduloId, ids));
    avisar(falha ?? "Ordem salva. A área da aluna já segue esta ordem.");
  }

  async function mover(modulo: Modulo, aula: Aula, passo: number) {
    const atual = modulo.aulas.findIndex((a) => a.id === aula.id);
    const destino = atual + passo;
    if (destino < 0 || destino >= modulo.aulas.length) {
      avisar(
        passo < 0 ? "Este já é o primeiro conteúdo." : "Este já é o último conteúdo.",
      );
      return;
    }
    const ordenada = [...modulo.aulas];
    const [movida] = ordenada.splice(atual, 1);
    ordenada.splice(destino, 0, movida);
    await gravarOrdemDosConteudos(modulo.id, ordenada.map((a) => a.id));
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
            {produtoId ? "Estrutura" : "Mentoria"}
          </span>
          <span className="font-titulo text-[22px] text-white">
            {produtoId ? "Módulos" : "Caminho do Desbloqueio"}
          </span>
        </span>
        <span className="text-[13px] text-[rgba(255,255,255,.55)]">
          {modulos.length} {modulos.length === 1 ? "módulo" : "módulos"} · {totalAulas}{" "}
          {totalAulas === 1 ? "conteúdo" : "conteúdos"}
        </span>
        <button
          onClick={() => setExpandido((v) => !v)}
          style={{ ...botaoNeutroGrande }}
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
            {modulos.map((modulo, iModulo) => (
              <div
                key={modulo.id}
                {...(({ style: _e, ...resto }) => resto)(arrastoModulo.props(iModulo))}
                className="rounded-cartao p-4"
                style={{
                  background: "rgba(255,255,255,.03)",
                  border: `1px solid ${
                    modulo.bloqueadoGeral ? tema.perigoLinha : "rgba(255,255,255,.1)"
                  }`,
                  ...arrastoModulo.props(iModulo).style,
                  ...marcaDoDestino(arrastoModulo, iModulo, "coluna"),
                }}
              >
                <div className="flex flex-wrap items-center gap-[10px]">
                  <span className="flex min-w-0 flex-[1_1_220px] flex-col gap-[3px]">
                    <span className="text-[15px] font-bold text-white">
                      Módulo {modulo.numero} — {modulo.titulo}
                    </span>
                    <span className="text-[12px] text-[rgba(255,255,255,.5)]">
                      {modulo.aulas.length === 1
                        ? "1 conteúdo"
                        : `${modulo.aulas.length} conteúdos`}
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
                        // O campo que este botão revela vive do lado de
                        // dentro: com o módulo fechado, clicar aqui não
                        // mostraria nada.
                        setModulosAbertos((a) => new Set(a).add(modulo.id));
                        setEditando(editando === chave ? "" : chave);
                        setTextoEdicao(modulo.titulo);
                        setDescricaoEdicao(modulo.intro);
                        setCapaEdicao(modulo.capaPath ?? "");
                      }}
                      style={{ ...botaoNeutro }}
                    >
                      {editando === `m:${modulo.id}` ? "Cancelar edição" : "Editar"}
                    </button>
                    {/*
                      Bloquear tira o módulo inteiro do ar para a turma
                      toda, e ficava a um clique, sem confirmação, com o
                      mesmo desenho de "Editar nome". Agora pergunta — e
                      o aviso diz o que aconteceu, não "estado
                      atualizado".
                    */}
                    <button
                      onClick={() =>
                        modulo.bloqueadoGeral
                          ? void (async () =>
                              avisar(
                                (await executar(() =>
                                  dados.atualizarModulo(modulo.id, { bloqueado_geral: false }),
                                )) ?? `Módulo ${modulo.numero} de volta ao ar para as alunas.`,
                              ))()
                          : pedirConfirmacao({
                              tom: "normal",
                              rotuloConfirmar: "Bloquear para todas",
                              titulo: `Bloquear o Módulo ${modulo.numero}?`,
                              mensagem:
                                `As ${modulo.aulas.length} aulas dele somem da tela de ` +
                                `${quantasAlunas()}. O progresso e os comentários ficam ` +
                                "guardados, e desbloquear devolve tudo.",
                              executar: async () =>
                                avisar(
                                  (await executar(() =>
                                    dados.atualizarModulo(modulo.id, { bloqueado_geral: true }),
                                  )) ?? `Módulo ${modulo.numero} bloqueado para as alunas.`,
                                ),
                            })
                      }
                      style={{ ...botaoNeutro }}
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
                      style={{ ...botaoNeutro }}
                      title="Use quando a arte da capa já traz o nome do módulo escrito nela, para o título não aparecer duas vezes."
                    >
                      {modulo.tituloNaArte ? "Escrever título na tela" : "Título já está na arte"}
                    </button>
                    {/*
                      A ordem do módulo dentro do produto. Trocar a
                      ORDEM das duas linhas, nunca a identidade: os
                      ids, as aulas, o progresso e as liberações de
                      cada um continuam sendo os mesmos.
                    */}
                    <button
                      onClick={() => moverModulo(modulo, -1)}
                      disabled={modulo.ordem === modulos[0]?.ordem}
                      aria-label={`Subir o módulo ${modulo.titulo}`}
                      style={{ ...BOTAO_LINHA, minWidth: 36, padding: 0 }}
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moverModulo(modulo, 1)}
                      disabled={modulo.ordem === modulos[modulos.length - 1]?.ordem}
                      aria-label={`Descer o módulo ${modulo.titulo}`}
                      style={{ ...BOTAO_LINHA, minWidth: 36, padding: 0 }}
                    >
                      ↓
                    </button>
                    <button
                      onClick={() =>
                        pedirConfirmacao({
                          titulo: `Remover o Módulo ${modulo.numero}?`,
                          mensagem: `Os ${modulo.aulas.length} conteúdos dele saem do produto para todas as alunas, junto com o progresso e os comentários delas.`,
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
                    <button
                      onClick={() => alternarModulo(modulo.id)}
                      aria-expanded={modulosAbertos.has(modulo.id)}
                      aria-label={`${
                        modulosAbertos.has(modulo.id) ? "Fechar" : "Abrir"
                      } o módulo ${modulo.titulo}`}
                      style={{ ...BOTAO_LINHA, minWidth: 36, padding: 0 }}
                    >
                      {modulosAbertos.has(modulo.id) ? "⌃" : "⌄"}
                    </button>
                  </span>
                </div>

                {!modulosAbertos.has(modulo.id) ? null : (
                 <>

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
                          intro: descricaoEdicao.trim(),
                          capa_path: capaEdicao.trim() || null,
                        }),
                      );
                      if (!falha) setEditando("");
                      avisar(falha ?? "Módulo atualizado.");
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
                    {/*
                      A descrição do módulo.

                      `PaginaModulo` mostra este texto para a aluna
                      desde sempre — é o parágrafo abaixo do título,
                      logo antes da lista — e o painel não tinha como
                      escrevê-lo: só a migration inicial o preencheu.
                      É a "descrição do e-book" do caminho pedido.
                    */}
                    <label className="flex flex-[1_1_200px] flex-col gap-[6px]">
                      <span style={rotulo}>Capa — arquivo no depósito `capas`</span>
                      <input
                        type="text"
                        value={capaEdicao}
                        onChange={(e) => setCapaEdicao(e.target.value)}
                        placeholder="modulo-3.png"
                        style={{ ...campo, minHeight: 44, fontSize: 14 }}
                      />
                    </label>
                    <label className="flex w-full flex-col gap-[6px]">
                      <span style={rotulo}>
                        Descrição — aparece para a aluna, abaixo do nome
                      </span>
                      <textarea
                        value={descricaoEdicao}
                        onChange={(e) => setDescricaoEdicao(e.target.value)}
                        rows={2}
                        style={{
                          ...campo,
                          minHeight: 64,
                          padding: "12px 14px",
                          fontSize: 14,
                          resize: "vertical",
                        }}
                      />
                    </label>
                    <button
                      type="submit"
                      style={{ ...botaoOuro, minHeight: 44, padding: "0 20px", fontSize: 14 }}
                    >
                      Salvar módulo
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditando("")}
                      style={{ ...botaoNeutroGrande }}
                    >
                      Cancelar
                    </button>
                  </form>
                ) : null}

                {/*
                  Conteúdo da SEÇÃO — o que pertence ao módulo e não a
                  nenhuma aula dele. É o degrau que faltava para o
                  produto que tem seções mas não tem aulas.
                */}
                {modulo.produtoId ? (
                  <div
                    className="mt-3 pt-3"
                    style={{ borderTop: "1px solid rgba(255,255,255,.07)" }}
                  >
                    <span className="mb-2 block" style={rotulo}>
                      Mídia do módulo, fora dos conteúdos
                    </span>
                    <EditorConteudos
                      dono={{ produtoId: modulo.produtoId, moduloId: modulo.id }}
                      conteudos={modulo.conteudos}
                      painel={painel}
                      pedirConfirmacao={pedirConfirmacao}
                      avisar={avisar}
                    />
                  </div>
                ) : null}

                <Arrastavel
                  ids={modulo.aulas.map((a) => a.id)}
                  aoSoltar={(nova) => void gravarOrdemDosConteudos(modulo.id, nova)}
                >
                {(arrastoAula) => (
                <div className="mt-[10px] flex flex-col">
                  {modulo.aulas.map((aula, iAula) => {
                    const midia = midiaAulas.get(aula.id);
                    const anexos = [
                      midia ? `vídeo (${midia.provider})` : null,
                      aula.capaPath ? "capa" : null,
                    ].filter(Boolean);

                    return (
                      <div
                        key={aula.id}
                        {...(({ style: _e, ...resto }) => resto)(arrastoAula.props(iAula))}
                        style={{
                          ...arrastoAula.props(iAula).style,
                          ...marcaDoDestino(arrastoAula, iAula, "coluna"),
                        }}
                      >
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
                              {aula.numero}. {aula.titulo}
                            </span>
                            <span className="text-[11px] text-[rgba(255,255,255,.46)]">
                              {anexos.length ? anexos.join(" · ") : "sem mídia"}
                            </span>
                          </span>

                          <button
                            onClick={() => void mover(modulo, aula, -1)}
                            aria-label="Mover para cima"
                            /*
                              As duas setas de reordenar eram o último
                              alvo de 32px do painel, e as únicas que
                              ficaram com a borda a .14 (1,35:1) quando
                              a Etapa 3 subiu todas as outras a .36.
                            */
                            className="grid h-9 w-9 place-items-center rounded-full bg-transparent text-[14px]"
                            style={{
                              color: "rgba(255,255,255,.7)",
                              border: `1px solid ${tema.linha}`,
                              cursor: "pointer",
                            }}
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => void mover(modulo, aula, 1)}
                            aria-label="Mover para baixo"
                            /*
                              As duas setas de reordenar eram o último
                              alvo de 32px do painel, e as únicas que
                              ficaram com a borda a .14 (1,35:1) quando
                              a Etapa 3 subiu todas as outras a .36.
                            */
                            className="grid h-9 w-9 place-items-center rounded-full bg-transparent text-[14px]"
                            style={{
                              color: "rgba(255,255,255,.7)",
                              border: `1px solid ${tema.linha}`,
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
                            {conteudoDe === aula.id ? "Fechar mídia" : "Mídia"}
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
                                    ? "A única aluna já tem este conteúdo."
                                    : `Todas as ${alunas.length} alunas já têm este conteúdo.`,
                                );
                                return;
                              }
                              const jaTem = alunas.length - semAula.length;
                              pedirConfirmacao({
                                tom: "normal",
                                rotuloConfirmar: "Liberar para todas",
                                titulo: `Liberar "${aula.titulo}" para todas?`,
                                mensagem:
                                  `"${aula.titulo}" será liberada, aberta desde já, para ` +
                                  `${semAula.length === 1 ? "1 aluna" : `${semAula.length} alunas`}.` +
                                  (jaTem > 0
                                    ? ` Outra${jaTem === 1 ? "" : "s"} ${jaTem} já ${
                                        jaTem === 1 ? "tem" : "têm"
                                      } o conteúdo e não ${jaTem === 1 ? "será alterada" : "serão alteradas"}.`
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
                          {/*
                            Este botão tira a aula do ar para TODAS as
                            alunas e ficava 8px ao lado de "Editar", com
                            o mesmo objeto de estilo, byte a byte, e sem
                            confirmação. Um deslize de dedo entre os dois
                            derrubava uma aula para a turma inteira.
                          */}
                          <button
                            onClick={() =>
                              aula.bloqueadoGeral
                                ? void (async () =>
                                    avisar(
                                      (await executar(() =>
                                        dados.atualizarAula(aula.id, { bloqueado_geral: false }),
                                      )) ?? `"${aula.titulo}" de volta ao ar.`,
                                    ))()
                                : pedirConfirmacao({
                                    tom: "normal",
                                    rotuloConfirmar: "Bloquear",
                                    titulo: `Bloquear "${aula.titulo}"?`,
                                    mensagem:
                                      `"${aula.titulo}" some da tela de ${quantasAlunas()}. ` +
                                      "O progresso e os comentários ficam guardados, e " +
                                      "desbloquear devolve tudo.",
                                    executar: async () =>
                                      avisar(
                                        (await executar(() =>
                                          dados.atualizarAula(aula.id, { bloqueado_geral: true }),
                                        )) ?? `"${aula.titulo}" bloqueado para as alunas.`,
                                      ),
                                  })
                            }
                            style={{
                              ...BOTAO_LINHA,
                              // Deixa de ser gêmeo do "Editar" ao lado.
                              color: aula.bloqueadoGeral ? tema.texto : tema.perigo,
                              border: `1px solid ${
                                aula.bloqueadoGeral ? tema.linha : tema.perigoLinha
                              }`,
                            }}
                          >
                            {aula.bloqueadoGeral ? "Desbloquear" : "Bloquear"}
                          </button>
                          <button
                            onClick={() =>
                              pedirConfirmacao({
                                titulo: `Remover "${aula.titulo}"?`,
                                mensagem: `"${aula.titulo}" sai do produto para todas as alunas, junto com o progresso e os comentários dele.`,
                                executar: async () =>
                                  avisar(
                                    (await executar(() => dados.removerAula(aula.id))) ??
                                      "Conteúdo removido.",
                                  ),
                              })
                            }
                            style={{
                              /*
                                Remontava o estilo à mão com um vermelho
                                de alfa .28 (1,28:1 — invisível) enquanto
                                `botaoRemover` já define .75. Duas cores
                                para a mesma ideia, e a mais fraca na
                                única ação que não tem volta.
                              */
                              ...BOTAO_LINHA,
                              color: tema.perigo,
                              border: `1px solid ${tema.perigoLinha}`,
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
                              /*
                                Os dois sempre gravam, e os dois são
                                contados.

                                Antes havia um `??` entre eles: falhando
                                o vídeo, a capa e o exercício NEM
                                chegavam a ser tentados — e a mensagem
                                falava só do vídeo. A pessoa via um erro
                                sobre vídeo, ia embora, e não sabia que
                                o resto também não gravou.
                              */
                              const falhaVideo = await executar(() =>
                                dados.definirMidiaDaAula(aula.id, provedorDoLink(video), ref),
                              );
                              const falhaResto = await executar(() =>
                                dados.atualizarAula(aula.id, {
                                  capa_path: capa.trim() || null,
                                  exercicio: exercicio.trim() || null,
                                }),
                              );
                              if (!falhaVideo && !falhaResto) {
                                setConteudoDe("");
                                avisar("Mídia salva.");
                              } else if (falhaVideo && falhaResto) {
                                avisar(`Nada foi salvo. ${falhaVideo}`);
                              } else if (falhaVideo) {
                                avisar(`Capa e exercício salvos. O vídeo não: ${falhaVideo}`);
                              } else {
                                avisar(`Vídeo salvo. Capa e exercício não: ${falhaResto}`);
                              }
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
                                rotulo: "Capa — arquivo no depósito `capas`",
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
                                Salvar mídia
                              </button>
                              <button
                                type="button"
                                onClick={() => setConteudoDe("")}
                                style={{ ...botaoNeutroGrande }}
                              >
                                Cancelar
                              </button>
                            </div>
                          </form>
                        ) : null}

                        {/*
                          Os conteúdos extras da aula. O vídeo
                          principal, a capa e o exercício continuam nos
                          campos de sempre, lidos pelo player — aqui
                          entra o que a aula ganhou além disso: outro
                          áudio, um texto, um PDF, um link.
                        */}
                        {conteudoDe === aula.id && modulo.produtoId ? (
                          <div className="mb-3">
                            <span className="mb-2 block" style={rotulo}>
                              Mais mídia deste conteúdo
                            </span>
                            <EditorConteudos
                              dono={{ produtoId: modulo.produtoId, aulaId: aula.id }}
                              conteudos={aula.conteudos}
                              painel={painel}
                              pedirConfirmacao={pedirConfirmacao}
                              avisar={avisar}
                            />
                          </div>
                        ) : null}

                        {editando === `a:${aula.id}` ? (
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              if (!textoEdicao.trim()) {
                                avisar("Informe o nome do conteúdo.");
                                return;
                              }
                              const falha = await executar(() =>
                                dados.atualizarAula(aula.id, { titulo: textoEdicao.trim() }),
                              );
                              if (!falha) setEditando("");
                              avisar(falha ?? "Nome do conteúdo atualizado.");
                            }}
                            className="flex flex-wrap gap-2 pb-3 pt-1"
                          >
                            <input
                              type="text"
                              value={textoEdicao}
                              onChange={(e) => setTextoEdicao(e.target.value)}
                              aria-label="Nome do conteúdo"
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
                            <button
                              type="button"
                              onClick={() => setEditando("")}
                              style={{ ...botaoNeutroGrande }}
                            >
                              Cancelar
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
                        avisar("Informe o nome do conteúdo.");
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
                      avisar(falha ?? "Conteúdo adicionado.");
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
                      placeholder="Nome do novo conteúdo"
                      aria-label={`Nome do novo conteúdo de ${modulo.titulo}`}
                      style={{ ...campo, flex: "2 1 240px", minHeight: 42, fontSize: 13 }}
                    />
                    <button
                      type="submit"
                      style={{ ...botaoNeutroGrande }}
                    >
                      + Adicionar conteúdo
                    </button>
                    {/*
                      O cancelar só existe depois que alguém escreveu.
                      Vazio, ele seria mais um botão em cada um dos onze
                      módulos sem nada para desfazer.
                    */}
                    {novaAulaEm === modulo.id && novaAula.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setNovaAula("");
                          setNovaAulaEm("");
                        }}
                        style={{ ...botaoNeutroGrande }}
                      >
                        Cancelar
                      </button>
                    ) : null}
                  </form>
                </div>
                )}
                </Arrastavel>
                 </>
                )}
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
              {novoModulo.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setNovoModulo("")}
                  style={{ ...botaoNeutroGrande, flex: "0 0 auto" }}
                >
                  Cancelar
                </button>
              ) : null}
            </form>
          </div>
        </div>
      )}
      </section>
    </>
  );
}
