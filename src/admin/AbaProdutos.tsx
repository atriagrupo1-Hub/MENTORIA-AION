import { useState, type FormEvent } from "react";
import type { Presente, Produto } from "@/data/tipos";
import { AbaConteudo } from "./AbaConteudo";
import type { PedidoConfirmacao } from "./Confirmacao";
import * as dados from "./dados";
import { EditorConteudos } from "./EditorConteudos";
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
import { idDoVideo, provedorDoLink } from "./video";
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
        Três degraus, e nenhum obrigatório. O e-book usa só o primeiro;
        o curso usa só o terceiro; o produto misto usa os três. É a
        hierarquia flexível pedida, sem um "tipo de produto" decidindo
        por quem edita.
      */}
      <div
        className="mb-4 rounded-cartao p-4"
        style={{ background: tema.superficie, border: `1px solid ${tema.linhaSuave}` }}
      >
        <span className="mb-1 block" style={rotulo}>
          Conteúdo direto do produto
        </span>
        <p className="m-0 mb-3 text-[12px]" style={{ color: tema.textoTerciario }}>
          Capa, texto de apresentação, PDF, áudio, vídeo — sem precisar de
          módulo nem de aula.
        </p>
        <EditorConteudos
          dono={{ produtoId: produto.id }}
          conteudos={produto.conteudos}
          painel={painel}
          pedirConfirmacao={pedirConfirmacao}
          avisar={avisar}
        />
      </div>

      <ItensDoProduto
        produto={produto}
        painel={painel}
        pedirConfirmacao={pedirConfirmacao}
        avisar={avisar}
      />

      <AbaConteudo
        painel={painel}
        produtoId={produto.id}
        pedirConfirmacao={pedirConfirmacao}
        avisar={avisar}
      />
    </section>
  );
}

/**
 * Os itens do produto.
 *
 * É a tabela `presentes` — a mesma de sempre, com a mesma liberação e
 * a mesma função `pode_ver_presente`. O que mudou é que agora ela
 * pendura num produto em vez de pendurar direto numa categoria: as
 * dezessete frequências são dezessete itens de um produto, e cada uma
 * monta o próprio conteúdo.
 */
function ItensDoProduto({
  produto,
  painel,
  pedirConfirmacao,
  avisar,
}: {
  produto: Produto;
  painel: Painel;
  pedirConfirmacao: (p: PedidoConfirmacao) => void;
  avisar: (m: string) => void;
}) {
  const { executar } = painel;
  const [novo, setNovo] = useState("");
  const [abertoId, setAbertoId] = useState("");

  const itens = [...produto.presentes].sort((a, b) => a.ordem - b.ordem);

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    if (!novo.trim()) {
      avisar("Dê um nome ao item.");
      return;
    }
    const falha = await executar(() =>
      dados.criarPresente(produto.categoriaId, novo.trim(), itens.length, produto.id),
    );
    if (!falha) setNovo("");
    avisar(falha ?? "Item criado.");
  }

  async function mover(id: string, direcao: -1 | 1) {
    const atual = itens.findIndex((i) => i.id === id);
    const destino = atual + direcao;
    if (atual < 0 || destino < 0 || destino >= itens.length) return;
    const um = itens[atual];
    const dois = itens[destino];
    const falha = await executar(async () => {
      await dados.atualizarPresente(um.id, { ordem: dois.ordem });
      await dados.atualizarPresente(dois.id, { ordem: um.ordem });
    });
    avisar(falha ?? "Ordem salva. A área da aluna já segue esta ordem.");
  }

  return (
    <div
      className="mb-4 rounded-cartao p-4"
      style={{ background: tema.superficie, border: `1px solid ${tema.linhaSuave}` }}
    >
      <span className="mb-1 block" style={rotulo}>
        Itens do produto
      </span>
      <p className="m-0 mb-3 text-[12px]" style={{ color: tema.textoTerciario }}>
        Cada item é uma peça da coleção — uma frequência, uma oração, um
        capítulo — e monta o próprio conteúdo. A liberação continua sendo item
        a item, como já era.
      </p>

      {itens.length === 0 ? (
        <p className="m-0 mb-3 text-[13px]" style={{ color: tema.textoSecundario }}>
          Nenhum item. Produtos sem coleção não precisam de nenhum.
        </p>
      ) : (
        <ol className="m-0 mb-3 flex list-none flex-col gap-[8px] p-0">
          {itens.map((item, i) => (
            <li key={item.id}>
              <div
                className="flex flex-wrap items-center gap-[10px] rounded-cartao px-4 py-3"
                style={{
                  background: tema.superficieAlta,
                  border: `1px solid ${
                    item.bloqueadoGeral ? tema.perigoLinha : tema.linhaSuave
                  }`,
                }}
              >
                <span className="text-[13px]" style={{ color: tema.textoTerciario }}>
                  {i + 1}.
                </span>
                <span
                  className="min-w-0 flex-1 truncate text-[14px]"
                  style={{ color: tema.texto }}
                >
                  {item.titulo}
                  {item.bloqueadoGeral ? " · bloqueado" : ""}
                </span>
                <button
                  onClick={() => mover(item.id, -1)}
                  disabled={i === 0}
                  aria-label={`Subir ${item.titulo}`}
                  style={{ ...BOTAO_SETA, opacity: i === 0 ? 0.4 : 1 }}
                >
                  ↑
                </button>
                <button
                  onClick={() => mover(item.id, 1)}
                  disabled={i === itens.length - 1}
                  aria-label={`Descer ${item.titulo}`}
                  style={{ ...BOTAO_SETA, opacity: i === itens.length - 1 ? 0.4 : 1 }}
                >
                  ↓
                </button>
                <button
                  onClick={() => setAbertoId(abertoId === item.id ? "" : item.id)}
                  style={{ ...botaoNeutro, minHeight: 44, padding: "0 16px", fontSize: 14 }}
                >
                  {abertoId === item.id ? "Fechar" : "Abrir"}
                </button>
              </div>

              {abertoId === item.id ? (
                <ItemAberto
                  item={item}
                  produtoId={produto.id}
                  painel={painel}
                  pedirConfirmacao={pedirConfirmacao}
                  avisar={avisar}
                />
              ) : null}
            </li>
          ))}
        </ol>
      )}

      <form onSubmit={adicionar} className="flex flex-wrap items-end gap-[10px]">
        <label className="flex min-w-[200px] flex-1 flex-col gap-[6px]">
          <span style={rotulo}>Nome do novo item</span>
          <input value={novo} onChange={(e) => setNovo(e.target.value)} style={campo} />
        </label>
        <button type="submit" style={botaoNeutroGrande}>
          + Adicionar item
        </button>
      </form>
    </div>
  );
}

function ItemAberto({
  item,
  produtoId,
  painel,
  pedirConfirmacao,
  avisar,
}: {
  item: Presente;
  produtoId: string;
  painel: Painel;
  pedirConfirmacao: (p: PedidoConfirmacao) => void;
  avisar: (m: string) => void;
}) {
  const { executar, midiaPresentes } = painel;
  const [nome, setNome] = useState(item.titulo);
  const [descricao, setDescricao] = useState(item.descricao);
  const [capa, setCapa] = useState(item.capaPath ?? "");
  const [video, setVideo] = useState(midiaPresentes.get(item.id)?.ref ?? "");

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      avisar("O nome não pode ficar vazio.");
      return;
    }
    /*
     * O vídeo principal continua em `presente_midia`, e não virou um
     * conteúdo qualquer: é dele que `video_do_presente` e a Edge
     * Function `video-assinado` tiram a referência para assinar, e é
     * o que a tela do presente já toca hoje. Mover isso para
     * `conteudos` seria trocar o caminho que funciona por um que
     * ainda teria de ser provado.
     */
    const bruto = video.trim();
    const ref = idDoVideo(bruto);
    if (bruto && !ref) {
      avisar("Não reconheci esse endereço de vídeo.");
      return;
    }

    const falha = await executar(async () => {
      await dados.atualizarPresente(item.id, {
        titulo: nome.trim(),
        descricao: descricao.trim(),
        capa_path: capa.trim() || null,
      });
      await dados.definirMidiaDoPresente(item.id, provedorDoLink(bruto), ref);
    });
    avisar(falha ?? "Item salvo.");
  }

  async function alternarBloqueio() {
    const falha = await executar(() =>
      dados.atualizarPresente(item.id, { bloqueado_geral: !item.bloqueadoGeral }),
    );
    avisar(
      falha ??
        (item.bloqueadoGeral
          ? "Item de volta ao ar."
          : "Item bloqueado para todas. Nada foi apagado."),
    );
  }

  function liberarParaTodas() {
    pedirConfirmacao({
      tom: "normal",
      rotuloConfirmar: "Liberar para todas",
      titulo: `Liberar "${item.titulo}" para todas?`,
      mensagem:
        "Todas as alunas ativas passam a ter este item. É uma mudança de " +
        "LIBERAÇÃO, não de organização — e não se desfaz sozinha.",
      executar: async () => {
        try {
          const l = await dados.liberarPresenteParaTodas(item.id);
          avisar(dados.resumoDaLiberacao(l, "presente"));
        } catch (falha) {
          avisar(falha instanceof Error ? falha.message : "Não foi possível liberar.");
        }
      },
    });
  }

  function remover() {
    pedirConfirmacao({
      titulo: `Remover ${item.titulo}?`,
      mensagem:
        "O item e os conteúdos dele saem do produto e da área da aluna, junto " +
        "com as liberações dele. Para só tirar da frente, use Bloquear.",
      executar: async () => {
        const falha = await executar(() => dados.removerPresente(item.id));
        avisar(falha ?? "Item removido.");
      },
    });
  }

  return (
    <div
      className="mt-2 rounded-cartao p-4"
      style={{ background: tema.superficie, border: `1px solid ${tema.linhaSuave}` }}
    >
      <form onSubmit={salvar}>
        <div className="flex flex-wrap items-end gap-[10px]">
          <label className="flex min-w-[180px] flex-[2] flex-col gap-[6px]">
            <span style={rotulo}>Nome</span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} style={campo} />
          </label>
          <label className="flex min-w-[180px] flex-1 flex-col gap-[6px]">
            <span style={rotulo}>Capa · caminho no Storage</span>
            <input value={capa} onChange={(e) => setCapa(e.target.value)} style={campo} />
          </label>
          <label className="flex min-w-[180px] flex-1 flex-col gap-[6px]">
            <span style={rotulo}>Vídeo principal · link ou id</span>
            <input value={video} onChange={(e) => setVideo(e.target.value)} style={campo} />
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
        <div className="mt-3 flex flex-wrap gap-[10px]">
          <button type="submit" style={{ ...botaoOuro, minHeight: 40, fontSize: 13 }}>
            Salvar item
          </button>
          <button type="button" onClick={alternarBloqueio} style={{ ...botaoNeutro, minHeight: 40 }}>
            {item.bloqueadoGeral ? "Desbloquear" : "Bloquear para todas"}
          </button>
          <button type="button" onClick={liberarParaTodas} style={{ ...botaoNeutro, minHeight: 40 }}>
            Liberar para todas
          </button>
          <button type="button" onClick={remover} style={{ ...botaoRemover, minHeight: 40 }}>
            Remover item
          </button>
        </div>
      </form>

      <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${tema.linhaSuave}` }}>
        <span className="mb-2 block" style={rotulo}>
          Conteúdos deste item
        </span>
        <EditorConteudos
          dono={{ produtoId, presenteId: item.id }}
          conteudos={item.conteudos}
          painel={painel}
          pedirConfirmacao={pedirConfirmacao}
          avisar={avisar}
        />
      </div>
    </div>
  );
}
