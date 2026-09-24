import { useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import type { Aula, Modulo } from "@/data/tipos";
import type { PedidoConfirmacao } from "./Confirmacao";
import { Arrastavel, useArrastar } from "./arrastar";
import * as dados from "./dados";
import { EditorConteudos } from "./EditorConteudos";
import {
  botaoNeutro,
  botaoNeutroGrande,
  botaoOuro,
  botaoRemover,
  campo,
  LARGURA_DE_NOME,
  painel as tema,
  rotulo,
} from "./estilos";
import { useTelaCheia } from "./telaCheia";
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
  const { catalogo, midiaAulas, alunas, executar, reordenar } = painel;

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
  const [texto, setTexto] = useState("");

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
    /*
     * Abre sozinho o módulo que acabou de nascer.
     *
     * Criar e depois ter de achar a seta para abrir era um clique a mais
     * entre o módulo e a aula — e é exatamente aí que o trabalho
     * continua. Os outros seguem fechados.
     */
    let nascido = "";
    const falha = await executar(async () => {
      nascido = await dados.criarModulo(
        novoModulo.trim(),
        numero,
        modulos.length,
        produtoId,
      );
    });
    if (!falha) {
      setNovoModulo("");
      if (nascido) setModulosAbertos((atual) => new Set(atual).add(nascido));
    }
    avisar(falha ?? "Módulo criado.");
  }

  async function gravarOrdemDosModulos(ids: string[]) {
    const falha = await reordenar(ids, () => dados.ordenarModulos(ids));
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
    const falha = await reordenar(ids, () => dados.ordenarAulas(moduloId, ids));
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

  /*
   * Dentro de um produto, esta lista NÃO tem cabeçalho nem moldura
   * próprios.
   *
   * Tinha: a página do produto mostrava "ESTRUTURA / CONTEÚDO" e, logo
   * abaixo, outro cartão dizendo "ESTRUTURA / Módulos" com um botão
   * Recolher. Dois rótulos iguais em sequência e duas caixas aninhadas
   * — a mesma coisa parecendo três coisas soltas. Na aba antiga, onde
   * a lista é a página inteira, o cabeçalho continua fazendo falta.
   */
  const solta = !produtoId;

  /*
   * Abrir uma aula abre A AULA, e mais nada.
   *
   * Antes o editor descia dentro da linha, com as outras aulas do
   * módulo e o "Nome da nova aula" logo abaixo — quem estava escrevendo
   * o texto de uma aula via a lista das outras embaixo do campo e não
   * sabia mais onde estava. É a mesma regra das outras telas do painel:
   * o que não está em uso fica atrás.
   */
  const aberta = conteudoDe
    ? modulos
        .flatMap((m) => m.aulas.map((a) => ({ modulo: m, aula: a })))
        .find((x) => x.aula.id === conteudoDe)
    : undefined;

  /*
   * A aula NOVA nasce na mesma tela em que se edita uma.
   *
   * Era um campo de nome com um botão ao lado, no fim da lista: a aula
   * nascia só com nome, e para pôr o vídeo e o texto era preciso achar
   * a linha dela e abrir. Agora o botão abre a tela inteira, e o nome,
   * o vídeo, a capa e o texto são gravados de uma vez.
   */
  const moduloDaNova = novaAulaEm ? modulos.find((m) => m.id === novaAulaEm) : undefined;

  if (moduloDaNova) {
    return (
      <AulaAberta
        modulo={moduloDaNova}
        painel={painel}
        nome={novaAula}
        setNome={setNovaAula}
        video={video}
        setVideo={setVideo}
        capa={capa}
        setCapa={setCapa}
        texto={texto}
        setTexto={setTexto}
        fechar={() => setNovaAulaEm("")}
        pedirConfirmacao={pedirConfirmacao}
        avisar={avisar}
      />
    );
  }

  if (aberta) {
    return (
      <AulaAberta
        aula={aberta.aula}
        modulo={aberta.modulo}
        nome={aberta.aula.titulo}
        setNome={() => {}}
        painel={painel}
        video={video}
        setVideo={setVideo}
        capa={capa}
        setCapa={setCapa}
        texto={texto}
        setTexto={setTexto}
        fechar={() => setConteudoDe("")}
        pedirConfirmacao={pedirConfirmacao}
        avisar={avisar}
      />
    );
  }

  return (
    <>
      <section
        className={solta ? "rounded-cartao-lg p-4" : ""}
        style={
          solta
            ? { background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.1)" }
            : undefined
        }
      >
      {solta ? (
      <div className="flex flex-wrap items-center gap-[10px]">
        <span className="flex min-w-0 flex-[1_1_220px] flex-col gap-[3px]">
          <span className="text-[11px] uppercase tracking-[.24em] text-[#a58a52]">
            Mentoria
          </span>
          <span className="font-titulo text-[22px] text-white">
            Caminho do Desbloqueio
          </span>
        </span>
        <span className="text-[13px] text-[rgba(255,255,255,.55)]">
          {modulos.length} {modulos.length === 1 ? "módulo" : "módulos"} · {totalAulas}{" "}
          {totalAulas === 1 ? "aula" : "aulas"}
        </span>
        <button
          onClick={() => setExpandido((v) => !v)}
          style={{ ...botaoNeutroGrande }}
        >
          {expandido ? "Recolher" : "Expandir"}
        </button>
      </div>
      ) : null}

      {solta && !expandido ? null : (
        <div
          className={solta ? "mt-4 pt-4" : ""}
          style={solta ? { borderTop: "1px solid rgba(255,255,255,.1)" } : undefined}
        >
          {/*
            Produto sem módulo nenhum abria mostrando um campo solto,
            e nada dizia que era ali que o curso é montado. Uma linha
            basta: o caminho inteiro, do módulo ao que a aluna recebe.
          */}
          {produtoId && modulos.length === 0 ? (
            <p
              className="m-0 mb-3 text-[13px] leading-[1.6]"
              style={{ color: tema.textoSecundario }}
            >
              Comece pelo módulo. Dentro dele vêm as aulas, e dentro de cada
              aula o conteúdo: vídeo, áudio, texto, PDF/e-book, link ou
              imagem — quantos quiser. A aluna só recebe o que for
              preenchido.
            </p>
          ) : null}
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
                }}
              >
                <div className="flex flex-wrap items-center gap-[10px]">
                  <span className="flex min-w-0 flex-[1_1_220px] flex-col gap-[3px]">
                    <span className="text-[15px] font-bold text-white">
                      Módulo {modulo.numero} — {modulo.titulo}
                    </span>
                    <span className="text-[12px] text-[rgba(255,255,255,.5)]">
                      {modulo.aulas.length === 1
                        ? "1 aula"
                        : `${modulo.aulas.length} aulas`}
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
                      style={{ ...campo, flex: "2 1 240px", maxWidth: LARGURA_DE_NOME, minHeight: 44, fontSize: 14 }}
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
                {/*
                  O módulo não tem conteúdo próprio.
                  
                  Tinha: um "Conteúdo do módulo, fora das aulas" logo
                  abaixo dos campos. Ninguém usou — zero linhas em toda
                  a base —, e a cada módulo aberto aparecia mais um
                  editor inteiro entre o nome e a lista de aulas, no
                  meio do caminho de quem só queria chegar numa aula.
                  Módulo é nome, capa e descrição; conteúdo é da aula.
                */}

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
                              setConteudoDe(aula.id);
                              setVideo(midia?.ref ?? "");
                              setCapa(aula.capaPath ?? "");
                              setTexto(aula.texto ?? "");
                            }}
                            style={{
                              ...BOTAO_LINHA,
                              color: tema.texto,
                              border: "1px solid rgba(255,255,255,.4)",
                            }}
                          >
                            Abrir
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
                              avisar(falha ?? "Nome do conteúdo atualizado.");
                            }}
                            className="flex flex-wrap gap-2 pb-3 pt-1"
                          >
                            <input
                              type="text"
                              value={textoEdicao}
                              onChange={(e) => setTextoEdicao(e.target.value)}
                              aria-label="Nome do conteúdo"
                              style={{ ...campo, flex: "2 1 220px", maxWidth: LARGURA_DE_NOME, minHeight: 42, fontSize: 14 }}
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
                  <button
                    type="button"
                    onClick={() => {
                      setNovaAulaEm(modulo.id);
                      setNovaAula("");
                      setVideo("");
                      setCapa("");
                      setTexto("");
                    }}
                    style={{ ...botaoNeutroGrande, marginTop: 12 }}
                  >
                    + Adicionar aula
                  </button>
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
                style={{ ...campo, flex: "2 1 260px", maxWidth: LARGURA_DE_NOME }}
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

/**
 * Uma aula aberta, sozinha na tela.
 *
 * Tudo que a aula tem em um lugar só: o vídeo, a capa, o texto que a
 * aluna lê e os conteúdos extras. Nada do módulo em volta — nem as
 * outras aulas, nem o campo de criar aula nova, que era o que confundia
 * quem estava escrevendo.
 *
 * Vai por portal, no `body`. Trocar só o que esta aba desenha não
 * bastava: esta aba mora DENTRO da tela do curso, e o cabeçalho do
 * curso, o Voltar dele e os campos de configuração continuavam na tela
 * por cima — medido, o "Voltar" mais próximo era o do curso, e saía do
 * curso inteiro em vez de voltar para a lista de aulas.
 *
 * O texto é UM campo. Chegou a ser três (resumo, exercício, aplicação),
 * e estava errado: o texto nasce inteiro na cabeça de quem escreve, e
 * três caixas obrigam a inventar divisão onde não há.
 */
function AulaAberta({
  aula,
  modulo,
  painel,
  nome,
  setNome,
  video,
  setVideo,
  capa,
  setCapa,
  texto,
  setTexto,
  fechar,
  pedirConfirmacao,
  avisar,
}: {
  /** Ausente quando a aula está nascendo. */
  aula?: Aula;
  modulo: Modulo;
  painel: Painel;
  nome: string;
  setNome: (v: string) => void;
  video: string;
  setVideo: (v: string) => void;
  capa: string;
  setCapa: (v: string) => void;
  texto: string;
  setTexto: (v: string) => void;
  fechar: () => void;
  pedirConfirmacao: (p: PedidoConfirmacao) => void;
  avisar: (m: string) => void;
}) {
  useTelaCheia();
  const { executar } = painel;
  const nascendo = !aula;

  /*
   * A capa sobe daqui.
   *
   * O campo sempre foi o CAMINHO de um arquivo que já estivesse no
   * depósito — quem escrevia tinha de abrir o painel do Supabase, subir
   * a imagem lá, copiar o nome e voltar. Errar uma letra não dava erro
   * nenhum: gravava, e a capa não aparecia para a aluna semanas depois.
   *
   * O envio é o mesmo do editor de conteúdos (`dados.enviarArquivo`), e
   * o caminho volta preenchido sozinho.
   */
  const seletorDeCapa = useRef<HTMLInputElement>(null);
  const [enviandoCapa, setEnviandoCapa] = useState(false);

  async function enviarCapa(arquivo: File | undefined) {
    if (!arquivo) return;
    if (!modulo.produtoId) {
      avisar("Este módulo não pertence a um curso; não sei onde guardar a imagem.");
      return;
    }
    setEnviandoCapa(true);
    try {
      setCapa(await dados.enviarArquivo("capas", modulo.produtoId, arquivo));
      avisar("Imagem enviada. Agora é só salvar.");
    } catch (falha) {
      avisar(falha instanceof Error ? falha.message : "Não consegui enviar a imagem.");
    } finally {
      setEnviandoCapa(false);
      if (seletorDeCapa.current) seletorDeCapa.current.value = "";
    }
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();

    /*
      Nascendo, o nome vem primeiro e o resto depende dele: sem o
      identificador que o banco devolve não há onde gravar o vídeo, a
      capa nem o texto. Falhando a criação, para por aqui — e a
      mensagem diz o que aconteceu, em vez de deixar a pessoa achando
      que gravou.
    */
    let id = aula?.id ?? "";
    if (nascendo) {
      if (!nome.trim()) {
        avisar("Informe o nome da aula.");
        return;
      }
      let falhou: string | null = null;
      const criado = await executar(async () => {
        id = await dados.criarAula(
          modulo.id,
          nome.trim(),
          modulo.aulas.length + 1,
          modulo.aulas.length,
        );
      });
      falhou = criado;
      if (falhou) {
        avisar(`A aula não foi criada. ${falhou}`);
        return;
      }
    }

    /*
      Os dois sempre gravam, e os dois são contados.

      Antes havia um `??` entre eles: falhando o vídeo, a capa e o texto
      NEM chegavam a ser tentados — e a mensagem falava só do vídeo. A
      pessoa via um erro sobre vídeo, ia embora, e não sabia que o resto
      também não gravou.
    */
    const falhaVideo = await executar(() =>
      dados.definirMidiaDaAula(id, provedorDoLink(video), idDoVideo(video)),
    );
    const falhaResto = await executar(() =>
      dados.atualizarAula(id, {
        ...(nascendo ? {} : { titulo: nome.trim() || modulo.titulo }),
        capa_path: capa.trim() || null,
        texto: texto.trim() || null,
      }),
    );
    if (!falhaVideo && !falhaResto) {
      avisar(nascendo ? "Aula criada." : "Aula salva.");
      if (nascendo) fechar();
    } else if (falhaVideo && falhaResto) {
      avisar(`Nada foi salvo. ${falhaVideo}`);
    } else if (falhaVideo) {
      avisar(`Capa e texto salvos. O vídeo não: ${falhaVideo}`);
    } else {
      avisar(`Vídeo salvo. Capa e texto não: ${falhaResto}`);
    }
  }

  return createPortal(
    <section
      className="fixed inset-0 z-[70] overflow-y-auto px-6 py-6"
      style={{ background: tema.fundo }}
      role="dialog"
      aria-modal="true"
      aria-label="Editar a aula"
    >
      <div className="mb-6 flex flex-wrap items-start gap-4">
        <span className="flex min-w-0 flex-[1_1_320px] flex-col gap-[3px]">
          <span style={rotulo}>
            Módulo {modulo.numero} ·{" "}
            {nascendo ? "Aula nova" : `Aula ${aula.numero}`}
          </span>
          <span className="font-titulo text-[22px] text-white">
            {nascendo ? modulo.titulo : aula.titulo}
          </span>
        </span>
        <button type="button" onClick={fechar} style={botaoNeutroGrande}>
          ← Voltar
        </button>
      </div>

      <form onSubmit={salvar} className="flex flex-col gap-4">
        {nascendo ? (
          <label className="flex flex-col gap-2" style={{ maxWidth: LARGURA_DE_NOME }}>
            <span className="text-[11px] uppercase tracking-[.1em] text-[rgba(255,255,255,.6)]">
              Nome da aula
            </span>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              aria-label="Nome da nova aula"
              autoFocus
              style={{ ...campo, minHeight: 44, fontSize: 14 }}
            />
          </label>
        ) : null}

        <label className="flex flex-col gap-2" style={{ maxWidth: 780 }}>
          <span className="text-[11px] uppercase tracking-[.1em] text-[rgba(255,255,255,.6)]">
            Vídeo — link ou identificador (Cloudflare Stream)
          </span>
          <input
            type="text"
            value={video}
            onChange={(e) => setVideo(e.target.value)}
            placeholder="https://iframe.videodelivery.net/<uid>  ou só o uid"
            style={{ ...campo, minHeight: 42, fontSize: 13 }}
          />
        </label>

        <label className="flex flex-col gap-2" style={{ maxWidth: 780 }}>
          <span className="text-[11px] uppercase tracking-[.1em] text-[rgba(255,255,255,.6)]">
            Capa da aula
          </span>
          <div className="flex flex-wrap items-start gap-2">
            <input
              type="text"
              value={capa}
              onChange={(e) => setCapa(e.target.value)}
              placeholder={`modulo-${modulo.numero}-aula-${
                aula?.numero ?? modulo.aulas.length + 1
              }.webp`}
              aria-label="Capa — arquivo no depósito capas"
              style={{ ...campo, flex: "1 1 240px", minWidth: 0, minHeight: 42, fontSize: 13 }}
            />
            <button
              type="button"
              onClick={() => seletorDeCapa.current?.click()}
              disabled={enviandoCapa}
              style={{
                ...botaoNeutroGrande,
                minHeight: 42,
                fontSize: 13,
                opacity: enviandoCapa ? 0.5 : 1,
              }}
            >
              {enviandoCapa ? "Enviando…" : "Escolher imagem"}
            </button>
            {/*
              O seletor do navegador não se deixa pintar, e cada um
              desenha o seu. Fica atrás de um botão do painel.
            */}
            <input
              ref={seletorDeCapa}
              type="file"
              accept="image/*"
              onChange={(e) => void enviarCapa(e.target.files?.[0])}
              className="hidden"
              aria-label="Enviar imagem de capa"
            />
          </div>
          <span className="text-[11px] leading-[1.5] text-[rgba(255,255,255,.36)]">
            Escolha a imagem do computador e o caminho se preenche sozinho. Se a
            imagem já está no depósito, dá para escrever o nome dela à mão.
          </span>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-[.1em] text-[rgba(255,255,255,.6)]">
            O texto desta aula — é o que a aluna lê
          </span>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={24}
            placeholder={
              "Escreva a aula como você quiser.\n\n" +
              "Uma linha em branco separa parágrafo. As quebras que você " +
              "fizer dentro do parágrafo aparecem como você deixou.\n\n" +
              "Para destacar, use *asteriscos* — igual ao WhatsApp."
            }
            style={{
              ...campo,
              minHeight: 460,
              padding: "14px 16px",
              fontSize: 14,
              lineHeight: 1.7,
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
          <span className="text-[11px] leading-[1.5] text-[rgba(255,255,255,.36)]">
            Deixe vazio e a aula fica só com o vídeo.
          </span>
        </label>

        <div className="flex flex-wrap gap-[10px]">
          <button type="submit" style={botaoOuro}>
            {nascendo ? "Criar aula" : "Salvar aula"}
          </button>
          <button type="button" onClick={fechar} style={botaoNeutroGrande}>
            Voltar sem salvar
          </button>
        </div>
      </form>

      {/*
        Os conteúdos extras: o vídeo, a capa e o texto vêm dos campos
        acima; aqui entra o que a aula ganhou além disso — outro áudio,
        um PDF, um link.
      */}
      {aula && modulo.produtoId ? (
        <div className="mt-10">
          <span className="mb-2 block" style={rotulo}>
            Conteúdo extra desta aula
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
    </section>,
    document.body,
  );
}
