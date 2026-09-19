import { useState, type FormEvent } from "react";
import type { Produto } from "@/data/tipos";
import { AbaConteudo } from "./AbaConteudo";
import type { PedidoConfirmacao } from "./Confirmacao";
import * as dados from "./dados";
import {
  botaoNeutro,
  botaoNeutroGrande,
  botaoOuro,
  botaoRemover,
  campo,
  painel as tema,
  RAIO,
  rotulo,
} from "./estilos";
import { Fileira, Voltar } from "./Fileira";
import type { Painel } from "./usePainel";

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
  const { catalogo, executar } = painel;
  const [abertoId, setAbertoId] = useState("");
  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [visivel, setVisivel] = useState(true);

  const categorias = [...catalogo.categorias].sort((a, b) => a.ordem - b.ordem);
  const produtos = catalogo.produtos;
  const aberto = produtos.find((p) => p.id === abertoId) ?? null;

  const tituloDaCategoria = (id: string) =>
    categorias.find((c) => c.id === id)?.titulo ?? "sem categoria";

  async function criar(e: FormEvent) {
    e.preventDefault();
    const destino = categoriaId || categorias[0]?.id;
    if (!nome.trim()) {
      avisar("Dê um nome ao produto.");
      return;
    }
    if (!destino) {
      avisar("Crie uma categoria antes, em Categorias / Layout.");
      return;
    }
    const quantos = categorias.find((c) => c.id === destino)?.produtos.length ?? 0;
    const falha = await executar(() =>
      dados.criarProduto(destino, nome.trim(), quantos, visivel),
    );
    if (!falha) {
      setNome("");
      setCriando(false);
    }
    avisar(falha ?? "Produto criado. Abra-o para montar o conteúdo.");
  }

  if (aberto) {
    return (
      <ProdutoAberto
        produto={aberto}
        painel={painel}
        aoVoltar={() => setAbertoId("")}
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
        <button onClick={() => setCriando((v) => !v)} style={botaoNeutroGrande}>
          {criando ? "Cancelar" : "+ Criar novo"}
        </button>
      </div>

      {criando ? (
        <form
          onSubmit={criar}
          className="mb-5 rounded-cartao p-4"
          style={{ background: tema.superficie, border: `1px solid ${tema.linhaSuave}` }}
        >
          <div className="flex flex-wrap items-end gap-[10px]">
            <label className="flex min-w-[200px] flex-[2] flex-col gap-[6px]">
              <span style={rotulo}>Nome</span>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                style={campo}
                autoFocus
              />
            </label>
            <label className="flex min-w-[180px] flex-1 flex-col gap-[6px]">
              <span style={rotulo}>Categoria onde aparecerá</span>
              <select
                value={categoriaId || (categorias[0]?.id ?? "")}
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
            <label className="flex min-w-[150px] flex-col gap-[6px]">
              <span style={rotulo}>Visibilidade</span>
              <select
                value={visivel ? "sim" : "nao"}
                onChange={(e) => setVisivel(e.target.value === "sim")}
                style={campo}
              >
                <option value="sim">Visível</option>
                <option value="nao">Oculto</option>
              </select>
            </label>
            <button type="submit" style={botaoOuro}>
              Criar
            </button>
          </div>
          <p className="m-0 mt-3 text-[12px]" style={{ color: tema.textoTerciario }}>
            A posição é o fim da categoria escolhida; mover é em Categorias /
            Layout. Criar um produto não libera nada para ninguém.
          </p>
        </form>
      ) : null}

      <Fileira
        itens={produtos.map((p) => ({
          id: p.id,
          titulo: p.titulo,
          oculto: !p.publicado,
          detalhe: `${tituloDaCategoria(p.categoriaId)}${p.publicado ? "" : " · oculto"}`,
        }))}
        aoAbrir={setAbertoId}
        vazio="Nenhum produto ainda. Crie o primeiro acima."
      />
    </section>
  );
}

function ProdutoAberto({
  produto,
  painel,
  aoVoltar,
  pedirConfirmacao,
  avisar,
}: {
  produto: Produto;
  painel: Painel;
  aoVoltar: () => void;
  pedirConfirmacao: (p: PedidoConfirmacao) => void;
  avisar: (m: string) => void;
}) {
  const { catalogo, executar } = painel;
  const [nome, setNome] = useState(produto.titulo);
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
    const falha = await executar(() =>
      dados.trocarOrdemDosProdutos(
        { id: irmaos[posicao].id, ordem: irmaos[posicao].ordem },
        { id: irmaos[destino].id, ordem: irmaos[destino].ordem },
      ),
    );
    avisar(falha ?? "Ordem salva. A área da aluna já segue esta ordem.");
  }

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

  return (
    <section>
      <div className="mb-5">
        <Voltar aoVoltar={aoVoltar} oQue="para os produtos" />
      </div>

      <h2 className="m-0 mb-5 font-titulo text-[24px]" style={{ color: tema.texto }}>
        {produto.titulo}
      </h2>

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
            <input value={nome} onChange={(e) => setNome(e.target.value)} style={campo} />
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

          <span className="flex flex-col gap-[6px]">
            <span style={rotulo}>Visibilidade</span>
            <span
              className="flex items-center px-[14px] text-[14px]"
              style={{
                minHeight: 44,
                color: produto.publicado ? tema.texto : tema.perigo,
                border: `1px solid ${produto.publicado ? tema.linha : tema.perigoLinha}`,
                borderRadius: RAIO,
              }}
            >
              {produto.publicado ? "Visível" : "Oculto"}
            </span>
          </span>
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
          <button type="button" onClick={alternarVisibilidade} style={botaoNeutroGrande}>
            {produto.publicado ? "Ocultar" : "Mostrar"}
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

      <h3 className="m-0 mb-3" style={rotulo}>
        Estrutura / conteúdo
      </h3>

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
