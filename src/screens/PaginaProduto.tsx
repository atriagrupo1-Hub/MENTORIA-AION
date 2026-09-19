import { useNavigate, useParams } from "react-router-dom";
import { Capa } from "@/components/Capa";
import { Conteudos } from "@/components/Conteudos";
import { useEstado } from "@/data/estado";
import { cores } from "@/design/tokens";

/**
 * O produto cujo conteúdo é direto.
 *
 * Um e-book, um documentário, uma gravação avulsa: coisas que não têm
 * módulo nem aula e que, na estrutura antiga, não tinham como existir.
 * Produto com módulos continua abrindo em `/modulos`; produto com itens
 * continua abrindo item a item, em `/presente/:id`. Esta tela é só para
 * o terceiro caso.
 *
 * Quem decide se ela pode abrir é o banco, em `pode_ver_produto()`. A
 * tela lê a resposta que `produtoLiberado` guardou e não recalcula
 * nada.
 */
export function PaginaProduto() {
  const { id } = useParams();
  const { catalogo, produtoLiberado } = useEstado();
  const navegar = useNavigate();

  const produto = catalogo.produtos.find((p) => p.id === id);

  if (!produto) return <main className="p-8">Conteúdo não encontrado.</main>;

  const liberado = produtoLiberado(produto.id);
  const visiveis = produto.conteudos.filter((c) => c.publicado);

  return (
    <main className="entra mx-auto max-w-[1240px] px-7 pb-24 pt-9 cel-sm:px-5">
      <div className="mb-7 flex flex-wrap items-center gap-4">
        <button
          onClick={() => navegar("/presentes")}
          className="text-corpo flex min-h-[52px] items-center justify-center gap-3 rounded-pilula border-none px-6 py-4 text-marfim-corpo"
          style={{
            background: "rgba(255,255,255,.14)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            cursor: "pointer",
          }}
        >
          ‹ Voltar
        </button>
      </div>

      {produto.capaPath ? (
        <span
          className="relative mb-7 block aspect-[16/9] w-full overflow-hidden rounded-cartao"
          style={{ background: cores.placeholderCapa }}
        >
          <Capa caminhos={[produto.capaPath]} alt={`Capa de ${produto.titulo}`} />
        </span>
      ) : null}

      <h1 className="text-heroi m-0 font-titulo font-semibold text-marfim">
        {produto.titulo}
      </h1>

      {produto.descricao ? (
        <p className="text-realce mb-8 mt-4 max-w-[700px] leading-[1.5] text-[#cbbfae]">
          {produto.descricao}
        </p>
      ) : (
        <div className="mb-8" />
      )}

      {!liberado ? (
        <p className="text-corpo m-0 text-terciario">
          Este conteúdo será disponibilizado no momento certo da sua jornada.
        </p>
      ) : visiveis.length === 0 ? (
        <p className="text-corpo m-0 text-terciario">Em breve, o conteúdo aqui.</p>
      ) : (
        <Conteudos itens={visiveis} />
      )}
    </main>
  );
}
