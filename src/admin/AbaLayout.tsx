import { useState, type FormEvent } from "react";
import type { Categoria } from "@/data/tipos";
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
 * CATEGORIAS / LAYOUT
 *
 * Esta área responde UMA pergunta: onde, e em que ordem, o conteúdo
 * aparece para a aluna. Ela não edita módulo, aula, vídeo, áudio, PDF
 * nem material — isso é da outra área, e a separação é o ponto.
 *
 * O que muda aqui muda a vitrine, nunca a liberação. Reordenar
 * categoria, ocultar categoria, mover produto de lugar: nada disso
 * toca em `acessos`. Quem não tinha o produto continua sem ele.
 */

const BOTAO_SETA: React.CSSProperties = {
  ...botaoNeutro,
  minHeight: 44,
  minWidth: 44,
  padding: 0,
  fontSize: 16,
};

export function AbaLayout({
  painel,
  pedirConfirmacao,
  avisar,
}: {
  painel: Painel;
  pedirConfirmacao: (p: PedidoConfirmacao) => void;
  avisar: (m: string) => void;
}) {
  const { catalogo, executar } = painel;
  const [abertaId, setAbertaId] = useState("");
  const [criando, setCriando] = useState(false);
  const [nova, setNova] = useState("");

  const categorias = [...catalogo.categorias].sort((a, b) => a.ordem - b.ordem);
  const aberta = categorias.find((c) => c.id === abertaId) ?? null;

  async function criar(e: FormEvent) {
    e.preventDefault();
    if (!nova.trim()) {
      avisar("Informe o nome da categoria.");
      return;
    }
    const falha = await executar(() => dados.criarCategoria(nova.trim(), categorias.length));
    if (!falha) {
      setNova("");
      setCriando(false);
    }
    avisar(falha ?? "Categoria criada.");
  }

  /*
   * Mover troca a ORDEM das duas linhas — nunca a identidade. Os ids,
   * os produtos e as liberações de cada uma continuam sendo os mesmos.
   *
   * As categorias antigas nasceram com ordem 0,1,2,3, mas nada no
   * banco garante que continuem sem buracos nem empates. Renumerar a
   * lista inteira na posição nova é o único jeito que funciona nos
   * dois casos.
   */
  async function mover(id: string, direcao: -1 | 1) {
    const atual = categorias.findIndex((c) => c.id === id);
    const destino = atual + direcao;
    if (atual < 0 || destino < 0 || destino >= categorias.length) return;

    const ordenada = [...categorias];
    const [movida] = ordenada.splice(atual, 1);
    ordenada.splice(destino, 0, movida);

    const falha = await executar(() => dados.ordenarCategorias(ordenada.map((c) => c.id)));
    avisar(falha ?? "Ordem salva. A área da aluna já segue esta ordem.");
  }

  if (aberta) {
    return (
      <CategoriaAberta
        categoria={aberta}
        painel={painel}
        posicao={categorias.findIndex((c) => c.id === aberta.id)}
        total={categorias.length}
        aoVoltar={() => setAbertaId("")}
        aoMover={mover}
        pedirConfirmacao={pedirConfirmacao}
        avisar={avisar}
      />
    );
  }

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center gap-[10px]">
        <span className="flex-1 text-[14px]" style={{ color: tema.textoSecundario }}>
          Onde e em que ordem o conteúdo aparece para a aluna. Clique numa
          categoria para abri-la.
        </span>
        <button onClick={() => setCriando((v) => !v)} style={botaoNeutroGrande}>
          {criando ? "Cancelar" : "+ Nova categoria"}
        </button>
      </div>

      {criando ? (
        <form onSubmit={criar} className="mb-5 flex flex-wrap items-end gap-[10px]">
          <label className="flex min-w-[220px] flex-1 flex-col gap-[6px]">
            <span style={rotulo}>Nome da categoria</span>
            <input
              value={nova}
              onChange={(e) => setNova(e.target.value)}
              style={campo}
              autoFocus
            />
          </label>
          <button type="submit" style={botaoOuro}>
            Criar
          </button>
        </form>
      ) : null}

      <Fileira
        itens={categorias.map((c) => ({
          id: c.id,
          titulo: c.titulo,
          oculto: c.bloqueadaGeral,
          detalhe: `${c.produtos.length} ${
            c.produtos.length === 1 ? "produto" : "produtos"
          }${c.bloqueadaGeral ? " · oculta" : ""}`,
        }))}
        aoAbrir={setAbertaId}
        vazio="Nenhuma categoria ainda. Crie a primeira acima."
      />
    </section>
  );
}

function CategoriaAberta({
  categoria,
  painel,
  posicao,
  total,
  aoVoltar,
  aoMover,
  pedirConfirmacao,
  avisar,
}: {
  categoria: Categoria;
  painel: Painel;
  posicao: number;
  total: number;
  aoVoltar: () => void;
  aoMover: (id: string, direcao: -1 | 1) => void;
  pedirConfirmacao: (p: PedidoConfirmacao) => void;
  avisar: (m: string) => void;
}) {
  const { executar } = painel;
  const [nome, setNome] = useState(categoria.titulo);

  const produtos = [...categoria.produtos].sort((a, b) => a.ordem - b.ordem);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      avisar("O nome não pode ficar vazio.");
      return;
    }
    const falha = await executar(() =>
      dados.atualizarCategoria(categoria.id, { titulo: nome.trim() }),
    );
    avisar(falha ?? "Nome salvo.");
  }

  /*
   * Ocultar não é remover. `bloqueada_geral` é a coluna que a aluna já
   * respeita hoje — `pode_ver_presente` e `pode_ver_produto` a
   * conferem —, e ela não apaga nada: os produtos, os módulos, as
   * aulas e as liberações continuam onde estavam, prontos para voltar
   * a aparecer quando alguém clicar em Mostrar.
   */
  async function alternarVisibilidade() {
    const falha = await executar(() =>
      dados.atualizarCategoria(categoria.id, {
        bloqueada_geral: !categoria.bloqueadaGeral,
      }),
    );
    avisar(
      falha ??
        (categoria.bloqueadaGeral
          ? "Categoria visível de novo."
          : "Categoria oculta. Nada foi apagado."),
    );
  }

  function remover() {
    pedirConfirmacao({
      titulo: `Remover ${categoria.titulo}?`,
      mensagem:
        produtos.length > 0
          ? `Esta categoria tem ${produtos.length} ${
              produtos.length === 1 ? "produto" : "produtos"
            }. O banco recusa apagar uma categoria com produto dentro — mova ` +
            "ou apague os produtos primeiro, ou apenas oculte a categoria."
          : "A categoria some do painel e da área da aluna. Para só tirar da " +
            "frente sem perder nada, use Ocultar.",
      executar: async () => {
        const falha = await executar(() => dados.removerCategoria(categoria.id));
        if (!falha) aoVoltar();
        avisar(falha ?? "Categoria removida.");
      },
    });
  }

  async function moverProduto(id: string, direcao: -1 | 1) {
    const atual = produtos.findIndex((p) => p.id === id);
    const destino = atual + direcao;
    if (atual < 0 || destino < 0 || destino >= produtos.length) return;

    const falha = await executar(() =>
      dados.trocarOrdemDosProdutos(
        { id: produtos[atual].id, ordem: produtos[atual].ordem },
        { id: produtos[destino].id, ordem: produtos[destino].ordem },
      ),
    );
    avisar(falha ?? "Ordem salva. A área da aluna já segue esta ordem.");
  }

  return (
    <section>
      <div className="mb-5">
        <Voltar aoVoltar={aoVoltar} oQue="para as categorias" />
      </div>

      <h2 className="m-0 mb-5 font-titulo text-[24px]" style={{ color: tema.texto }}>
        {categoria.titulo}
      </h2>

      <form
        onSubmit={salvar}
        className="mb-6 rounded-cartao p-4"
        style={{ background: tema.superficie, border: `1px solid ${tema.linhaSuave}` }}
      >
        <div className="flex flex-wrap items-end gap-[10px]">
          <label className="flex min-w-[200px] flex-1 flex-col gap-[6px]">
            <span style={rotulo}>Nome</span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} style={campo} />
          </label>

          <span className="flex flex-col gap-[6px]">
            <span style={rotulo}>Status</span>
            <span
              className="flex items-center px-[14px] text-[14px]"
              style={{
                minHeight: 44,
                color: categoria.bloqueadaGeral ? tema.perigo : tema.texto,
                border: `1px solid ${
                  categoria.bloqueadaGeral ? tema.perigoLinha : tema.linha
                }`,
                borderRadius: RAIO,
              }}
            >
              {categoria.bloqueadaGeral ? "Oculta" : "Visível"}
            </span>
          </span>

          <span className="flex flex-col gap-[6px]">
            <span style={rotulo}>Posição</span>
            <span className="flex items-center gap-[6px]">
              <button
                type="button"
                onClick={() => aoMover(categoria.id, -1)}
                disabled={posicao === 0}
                aria-label="Subir a categoria"
                style={{ ...BOTAO_SETA, opacity: posicao === 0 ? 0.4 : 1 }}
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
                onClick={() => aoMover(categoria.id, 1)}
                disabled={posicao === total - 1}
                aria-label="Descer a categoria"
                style={{ ...BOTAO_SETA, opacity: posicao === total - 1 ? 0.4 : 1 }}
              >
                ↓
              </button>
            </span>
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-[10px]">
          <button type="submit" style={botaoOuro}>
            Salvar
          </button>
          <button type="button" onClick={alternarVisibilidade} style={botaoNeutroGrande}>
            {categoria.bloqueadaGeral ? "Mostrar" : "Ocultar"}
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

      <h3 className="m-0 mb-3 text-[13px]" style={rotulo}>
        Conteúdos nesta categoria
      </h3>

      {produtos.length === 0 ? (
        <p className="m-0 text-[14px]" style={{ color: tema.textoSecundario }}>
          Nenhum produto nesta categoria. Produtos são criados e editados em
          "Cursos e conteúdos".
        </p>
      ) : (
        <ol className="m-0 flex list-none flex-col gap-[8px] p-0">
          {produtos.map((p, i) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-[10px] rounded-cartao px-4 py-3"
              style={{
                background: tema.superficie,
                border: `1px solid ${tema.linhaSuave}`,
              }}
            >
              <span className="text-[13px]" style={{ color: tema.textoTerciario }}>
                {i + 1}.
              </span>
              <span
                className="min-w-0 flex-1 truncate text-[14px]"
                style={{ color: p.publicado ? tema.texto : tema.textoSecundario }}
              >
                {p.titulo}
                {p.publicado ? "" : " · oculto"}
              </span>
              <button
                onClick={() => moverProduto(p.id, -1)}
                disabled={i === 0}
                aria-label={`Subir ${p.titulo}`}
                style={{ ...BOTAO_SETA, opacity: i === 0 ? 0.4 : 1 }}
              >
                ↑
              </button>
              <button
                onClick={() => moverProduto(p.id, 1)}
                disabled={i === produtos.length - 1}
                aria-label={`Descer ${p.titulo}`}
                style={{
                  ...BOTAO_SETA,
                  opacity: i === produtos.length - 1 ? 0.4 : 1,
                }}
              >
                ↓
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
