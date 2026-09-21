import { useState, type FormEvent } from "react";
import type { Produto } from "@/data/tipos";
import { AbaConteudo } from "./AbaConteudo";
import type { PedidoConfirmacao } from "./Confirmacao";
import * as dados from "./dados";
import {
  botaoNeutro,
  botaoOuro,
  botaoRemover,
  campo,
  painel as tema,
  RAIO,
  rotulo,
} from "./estilos";
import { Fileira, Voltar } from "./Fileira";
import type { Painel } from "./usePainel";

/**
 * O nome que o curso leva no instante em que nasce.
 *
 * Ele existe por um segundo: a página abre com o campo Nome vazio e o
 * cursor dentro. Este texto é o que aparece se alguém sair sem digitar
 * nada — e é melhor que uma linha em branco na lista.
 */
const NOME_DE_RASCUNHO = "Curso sem nome";

/*
 * CURSOS E CONTEÚDOS
 *
 * A outra metade da separação: aqui se diz O QUE o produto tem dentro.
 * A categoria aparece como um campo de configuração — onde ele vai
 * aparecer — e não manda em mais nada. Um produto na categoria
 * "Frequências" pode ter módulos, aulas, vídeo, texto e PDF; um na
 * "Mentoria" pode ser só um e-book. A categoria nunca definiu tipo, e
 * a partir daqui isso deixa de ser só uma intenção.
 */

const BOTAO_SETA: React.CSSProperties = {
  ...botaoNeutro,
  minHeight: 44,
  minWidth: 44,
  padding: 0,
  fontSize: 16,
};

export function AbaProdutos({
  painel,
  pedirConfirmacao,
  avisar,
}: {
  painel: Painel;
  pedirConfirmacao: (p: PedidoConfirmacao) => void;
  avisar: (m: string) => void;
}) {
  const { catalogo, reordenar } = painel;
  const [abertoId, setAbertoId] = useState("");
  /** Qual produto acabou de nascer aqui — o único em modo "curso novo". */
  const [novoId, setNovoId] = useState("");

  const categorias = [...catalogo.categorias].sort((a, b) => a.ordem - b.ordem);
  const produtos = catalogo.produtos;
  const aberto = produtos.find((p) => p.id === abertoId) ?? null;

  /*
   * Arrastar aqui reordena DENTRO da categoria de cada produto.
   *
   * A fileira mistura produtos de categorias diferentes, e `ordem` é
   * uma posição dentro da categoria — renumerar a fileira inteira de
   * 0 em diante embaralharia as outras. Então a ordem nova é aplicada
   * categoria a categoria, na sequência em que a fileira ficou.
   */
  async function gravarOrdem(ids: string[]) {
    const porCategoria = new Map<string, string[]>();
    for (const id of ids) {
      const p = produtos.find((x) => x.id === id);
      if (!p) continue;
      const lista = porCategoria.get(p.categoriaId) ?? [];
      lista.push(id);
      porCategoria.set(p.categoriaId, lista);
    }
    const falha = await reordenar(ids, async () => {
      for (const lista of porCategoria.values()) await dados.ordenarProdutos(lista);
    });
    avisar(falha ?? "Ordem salva. A área da aluna já segue esta ordem.");
  }

  const tituloDaCategoria = (id: string) =>
    categorias.find((c) => c.id === id)?.titulo ?? "sem categoria";

  /*
   * Criar abre a PÁGINA, não uma faixa sobre a lista.
   *
   * Montar um curso era uma ida e volta: preencher o nome na faixa,
   * clicar Criar, achar o curso na lista, abrir, e só então chegar ao
   * módulo. Agora é um clique: o curso nasce aqui e a página dele abre
   * com tudo à vista — nome, módulo e conteúdo.
   *
   * Nasce OCULTO. Ele precisa existir no banco para o módulo poder
   * pender dele, mas um curso pela metade não pode aparecer para a
   * aluna enquanto está sendo montado. A visibilidade está no topo da
   * própria página. Criar um curso continua não liberando nada para
   * ninguém: `acessos` não é tocado.
   */
  async function criarEabrir() {
    const destino = categorias[0]?.id;
    if (!destino) {
      avisar("Crie uma categoria antes, em Categorias / Layout.");
      return;
    }
    const quantos = categorias.find((c) => c.id === destino)?.produtos.length ?? 0;
    try {
      const id = await dados.criarProduto(destino, NOME_DE_RASCUNHO, quantos, false);
      await painel.recarregar();
      setNovoId(id);
      setAbertoId(id);
    } catch (falha) {
      avisar(falha instanceof Error ? falha.message : "Não consegui criar o curso.");
    }
  }

  if (aberto) {
    return (
      <ProdutoAberto
        produto={aberto}
        painel={painel}
        novo={aberto.id === novoId}
        aoVoltar={() => {
          setAbertoId("");
          setNovoId("");
        }}
        pedirConfirmacao={pedirConfirmacao}
        avisar={avisar}
      />
    );
  }

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center gap-[10px]">
        <span className="flex-1 text-[14px]" style={{ color: tema.textoSecundario }}>
          Todos os produtos. Clique num deles para montar o conteúdo.
        </span>
        <button onClick={criarEabrir} style={botaoOuro}>
          + Criar novo
        </button>
      </div>

      <Fileira
        itens={produtos.map((p) => ({
          id: p.id,
          titulo: p.titulo,
          oculto: !p.publicado,
          detalhe: `${tituloDaCategoria(p.categoriaId)}${p.publicado ? "" : " · oculto"}`,
        }))}
        aoAbrir={setAbertoId}
        aoReordenar={gravarOrdem}
        vazio="Nenhum produto ainda. Crie o primeiro acima."
      />
    </section>
  );
}

function ProdutoAberto({
  produto,
  painel,
  novo = false,
  aoVoltar,
  pedirConfirmacao,
  avisar,
}: {
  produto: Produto;
  painel: Painel;
  /** Acabou de nascer neste clique: o nome vem vazio e há Descartar. */
  novo?: boolean;
  aoVoltar: () => void;
  pedirConfirmacao: (p: PedidoConfirmacao) => void;
  avisar: (m: string) => void;
}) {
  const { catalogo, executar } = painel;
  const [nome, setNome] = useState(novo ? "" : produto.titulo);
  const [descricao, setDescricao] = useState(produto.descricao);
  const [categoriaId, setCategoriaId] = useState(produto.categoriaId);

  const categorias = [...catalogo.categorias].sort((a, b) => a.ordem - b.ordem);
  const irmaos = (categorias.find((c) => c.id === produto.categoriaId)?.produtos ?? [])
    .slice()
    .sort((a, b) => a.ordem - b.ordem);
  const posicao = irmaos.findIndex((p) => p.id === produto.id);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      avisar("O nome não pode ficar vazio.");
      return;
    }

    /*
     * Trocar a categoria muda a vitrine e mais nada. `acessos` não é
     * tocado aqui — quem não tinha o produto continua sem ele, e quem
     * tinha continua com ele, no lugar novo.
     */
    const mudouDeCasa = categoriaId !== produto.categoriaId;
    const quantosLa = mudouDeCasa
      ? (categorias.find((c) => c.id === categoriaId)?.produtos.length ?? 0)
      : produto.ordem;

    const falha = await executar(() =>
      dados.atualizarProduto(produto.id, {
        titulo: nome.trim(),
        descricao: descricao.trim(),
        categoria_id: categoriaId,
        ordem: quantosLa,
      }),
    );
    avisar(falha ?? "Configurações salvas.");
  }

  async function alternarVisibilidade() {
    const falha = await executar(() =>
      dados.atualizarProduto(produto.id, { publicado: !produto.publicado }),
    );
    avisar(
      falha ??
        (produto.publicado
          ? "Produto oculto. Nada foi apagado."
          : "Produto visível de novo."),
    );
  }

  async function mover(direcao: -1 | 1) {
    const destino = posicao + direcao;
    if (posicao < 0 || destino < 0 || destino >= irmaos.length) return;
    const ordenada = [...irmaos];
    const [movido] = ordenada.splice(posicao, 1);
    ordenada.splice(destino, 0, movido);
    const falha = await executar(() =>
      dados.ordenarProdutos(ordenada.map((p) => p.id)),
    );
    avisar(falha ?? "Ordem salva. A área da aluna já segue esta ordem.");
  }

  const totalDeAulas = produto.modulos.reduce((soma, m) => soma + m.aulas.length, 0);

  function remover() {
    const temDentro =
      produto.modulos.length + produto.presentes.length + produto.conteudos.length;
    pedirConfirmacao({
      titulo: `Remover ${produto.titulo}?`,
      mensagem:
        temDentro > 0
          ? `Este produto tem ${produto.modulos.length} módulos, ` +
            `${produto.presentes.length} itens e ${produto.conteudos.length} ` +
            "conteúdos diretos. Os conteúdos e os itens vão junto; os módulos " +
            "e as aulas ficam, com o progresso e os comentários delas. Para só " +
            "tirar da frente sem perder nada, use Ocultar."
          : "O produto some do painel e da área da aluna. Para só tirar da " +
            "frente sem perder nada, use Ocultar.",
      executar: async () => {
        const falha = await executar(() => dados.removerProduto(produto.id));
        if (!falha) aoVoltar();
        avisar(falha ?? "Produto removido.");
      },
    });
  }

  /*
   * Descartar existe só no curso recém-criado, e só enquanto ele
   * estiver vazio.
   *
   * O clique em "+ Criar novo" já grava a linha; sem uma saída, desistir
   * deixaria um curso sem nome na lista. Tendo qualquer coisa dentro
   * ele recusa e manda usar Ocultar — apagar o que já foi montado nunca
   * é o caminho curto.
   */
  const vazio =
    produto.modulos.length === 0 &&
    produto.presentes.length === 0 &&
    produto.conteudos.length === 0;

  async function descartar() {
    if (!vazio) {
      avisar("Este curso já tem conteúdo dentro. Use Ocultar em vez de descartar.");
      return;
    }
    const falha = await executar(() => dados.removerProduto(produto.id));
    if (!falha) aoVoltar();
    avisar(falha ?? "Rascunho descartado.");
  }

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center gap-[10px]">
        <Voltar aoVoltar={aoVoltar} oQue="para os produtos" />
        {novo ? (
          <button
            type="button"
            onClick={descartar}
            style={{ ...botaoRemover, minHeight: 44, padding: "0 18px", fontSize: 14 }}
          >
            Descartar rascunho
          </button>
        ) : null}
      </div>

      <h2 className="m-0 mb-1 font-titulo text-[24px]" style={{ color: tema.texto }}>
        {novo ? (nome.trim() || "Curso novo") : produto.titulo}
      </h2>

      {/*
        Tudo numa tela só: nome, módulo e conteúdo. Era criar, voltar,
        achar na lista e abrir — quatro passos para chegar onde o
        trabalho começa.
      */}
      <p className="m-0 mb-5 text-[13px]" style={{ color: tema.textoSecundario }}>
        {novo
          ? "Dê o nome, escolha a categoria e monte os módulos e o conteúdo aqui mesmo. " +
            "Ele nasce oculto: ninguém vê até você deixar Visível."
          : "\u00a0"}
      </p>

      <h3 className="m-0 mb-3" style={rotulo}>
        Configurações
      </h3>

      <form
        onSubmit={salvar}
        className="mb-8 rounded-cartao p-4"
        style={{ background: tema.superficie, border: `1px solid ${tema.linhaSuave}` }}
      >
        <div className="flex flex-wrap items-end gap-[10px]">
          <label className="flex min-w-[200px] flex-[2] flex-col gap-[6px]">
            <span style={rotulo}>Nome</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              style={campo}
              autoFocus={novo}
              placeholder={novo ? "Nome do curso" : undefined}
            />
          </label>

          <label className="flex min-w-[180px] flex-1 flex-col gap-[6px]">
            <span style={rotulo}>Categoria onde aparece</span>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              style={campo}
            >
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.titulo}
                </option>
              ))}
            </select>
          </label>

          <span className="flex flex-col gap-[6px]">
            <span style={rotulo}>Posição na categoria</span>
            <span className="flex items-center gap-[6px]">
              <button
                type="button"
                onClick={() => mover(-1)}
                disabled={posicao <= 0}
                aria-label="Subir o produto"
                style={{ ...BOTAO_SETA, opacity: posicao <= 0 ? 0.4 : 1 }}
              >
                ↑
              </button>
              <span
                className="flex items-center justify-center text-[14px]"
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  color: tema.texto,
                  border: `1px solid ${tema.linha}`,
                  borderRadius: RAIO,
                }}
              >
                {posicao + 1}
              </span>
              <button
                type="button"
                onClick={() => mover(1)}
                disabled={posicao === irmaos.length - 1}
                aria-label="Descer o produto"
                style={{
                  ...BOTAO_SETA,
                  opacity: posicao === irmaos.length - 1 ? 0.4 : 1,
                }}
              >
                ↓
              </button>
            </span>
          </span>

          {/*
            A visibilidade era um selo que só informava, e quem mudava
            era um botão lá embaixo, "Ocultar". No curso recém-criado —
            que nasce oculto — isso é justamente o que se precisa achar
            primeiro. Vira um seletor, aqui em cima, com o rótulo do
            lado do nome.
          */}
          <label className="flex flex-col gap-[6px]">
            <span style={rotulo}>Visibilidade</span>
            <select
              value={produto.publicado ? "sim" : "nao"}
              onChange={() => void alternarVisibilidade()}
              style={{
                ...campo,
                color: produto.publicado ? tema.texto : tema.perigo,
                border: `1px solid ${produto.publicado ? tema.linha : tema.perigoLinha}`,
              }}
            >
              <option value="sim">Visível</option>
              <option value="nao">Oculto</option>
            </select>
          </label>
        </div>

        <label className="mt-3 flex flex-col gap-[6px]">
          <span style={rotulo}>Descrição</span>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={2}
            style={{ ...campo, minHeight: 64, padding: "12px 14px", resize: "vertical" }}
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-[10px]">
          <button type="submit" style={botaoOuro}>
            Salvar
          </button>
          <button
            type="button"
            onClick={remover}
            style={{ ...botaoRemover, minHeight: 44, padding: "0 18px", fontSize: 14 }}
          >
            Remover
          </button>
        </div>
      </form>

      {/*
        A contagem vive AQUI, com o rótulo — e não num cabeçalho
        próprio dentro da lista. Era ali que nasciam os dois "estrutura"
        seguidos e o cartão dentro do cartão.
      */}
      <div className="mb-3 flex flex-wrap items-baseline gap-[10px]">
        <h3 className="m-0" style={rotulo}>
          Conteúdo do produto
        </h3>
        <span className="text-[13px]" style={{ color: tema.textoSecundario }}>
          {produto.modulos.length}{" "}
          {produto.modulos.length === 1 ? "módulo" : "módulos"} ·{" "}
          {totalDeAulas} {totalDeAulas === 1 ? "aula" : "aulas"}
        </span>
      </div>

      {/*
        Um caminho só, o mesmo da mentoria:

          categoria  ->  MÓDULO   (o que é: "Manuscritos Sagrados")
                     ->  CONTEÚDO (a peça: "O livro", "Aula 3")
                     ->  mídia    (vídeo, áudio, texto, PDF, link, imagem)

        Havia três: "conteúdo direto do produto", "itens do produto" e
        "módulos e aulas". Três portas para a mesma sala, e quem ia
        cadastrar um e-book não tinha como saber qual abrir — e, pela
        primeira, a aluna não ganhava a tela de abertura que a mentoria
        tem. Ficou a que já estava provada.
      */}
      <AbaConteudo
        painel={painel}
        produtoId={produto.id}
        pedirConfirmacao={pedirConfirmacao}
        avisar={avisar}
      />
    </section>
  );
}
