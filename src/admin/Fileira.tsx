import { useEffect, useState } from "react";
import { marcaDoDestino, useArrastar } from "./arrastar";
import { botaoNeutro, painel as tema, RAIO } from "./estilos";

/**
 * A listagem horizontal do painel, com paginação administrativa.
 *
 * Duas áreas usam exatamente este desenho — as categorias e os
 * produtos —, e a regra das duas é a mesma: os itens ficam UM AO LADO
 * DO OUTRO, clicar em um esconde a listagem e abre só ele, e VOLTAR
 * traz a listagem de volta. Quem decide o que abrir é quem monta o
 * componente; a fileira só avisa qual foi clicado.
 *
 * A paginação aqui é ferramenta de administração, e não regra de
 * exibição: a área da aluna não pagina nada. Ela existe para que
 * trinta produtos não virem uma parede de botões.
 *
 * `flex-wrap` não é enfeite. `index.css` tem `overflow-x: clip`, então
 * o que passa da largura é CORTADO, não rolável — sem quebrar linha,
 * no celular os últimos itens simplesmente não existiriam.
 */

export type ItemDaFileira = {
  id: string;
  titulo: string;
  /** Texto miúdo sob o título: "3 produtos", "oculta". */
  detalhe?: string;
  /** Item escondido da aluna — o painel mostra, esmaecido. */
  oculto?: boolean;
};

export function Fileira({
  itens,
  porPagina = 8,
  aoAbrir,
  aoReordenar,
  vazio,
}: {
  itens: ItemDaFileira[];
  porPagina?: number;
  aoAbrir: (id: string) => void;
  /**
   * Arrastar um chip para outro lugar. Sem isto, a fileira segue só
   * clicável, como era.
   *
   * Recebe a lista INTEIRA na ordem nova, e não só a página: a
   * paginação é ferramenta de administração, e o que vai para o banco
   * é a ordem de tudo. A junção é feita aqui, onde se sabe qual
   * página está aberta.
   */
  aoReordenar?: (ids: string[]) => void;
  vazio: string;
}) {
  const [pagina, setPagina] = useState(0);

  const paginas = Math.max(1, Math.ceil(itens.length / porPagina));

  /*
   * Apagar o último item da página 3 deixava a fileira vazia com a
   * paginação apontando para uma página que não existe mais. Recua
   * sozinha.
   */
  useEffect(() => {
    if (pagina > paginas - 1) setPagina(paginas - 1);
  }, [pagina, paginas]);

  if (itens.length === 0) {
    return (
      <p className="m-0 py-6 text-[14px]" style={{ color: tema.textoSecundario }}>
        {vazio}
      </p>
    );
  }

  const daPagina = itens.slice(pagina * porPagina, pagina * porPagina + porPagina);

  const arrasto = useArrastar(
    daPagina.map((i) => i.id),
    (novaDaPagina) => {
      const antes = itens.slice(0, pagina * porPagina).map((i) => i.id);
      const depois = itens.slice(pagina * porPagina + porPagina).map((i) => i.id);
      aoReordenar?.([...antes, ...novaDaPagina, ...depois]);
    },
  );

  return (
    <div>
      <div className="flex flex-wrap gap-[10px]">
        {daPagina.map((item, i) => (
          <button
            key={item.id}
            onClick={() => aoAbrir(item.id)}
            className="flex min-w-0 flex-col items-start justify-center gap-[2px] text-left"
            style={{
              minHeight: 56,
              maxWidth: "100%",
              padding: "8px 16px",
              color: item.oculto ? tema.textoSecundario : tema.texto,
              background: tema.superficie,
              border: `1px solid ${tema.linha}`,
              borderRadius: RAIO,
              cursor: "pointer",
              ...(aoReordenar ? arrasto.props(i).style : {}),
              ...(aoReordenar ? marcaDoDestino(arrasto, i, "linha") : {}),
            }}
            {...(aoReordenar
              ? (({ style: _estilo, ...resto }) => resto)(arrasto.props(i))
              : {})}
          >
            <span className="max-w-full truncate text-[14px] font-semibold">
              {item.titulo}
            </span>
            {item.detalhe ? (
              <span
                className="max-w-full truncate text-[11px]"
                style={{ color: tema.textoTerciario }}
              >
                {item.detalhe}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {paginas > 1 ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-[6px]">
          <button
            onClick={() => setPagina((p) => Math.max(0, p - 1))}
            disabled={pagina === 0}
            aria-label="Página anterior"
            style={{ ...botaoNeutro, minHeight: 44, opacity: pagina === 0 ? 0.4 : 1 }}
          >
            ‹
          </button>
          {Array.from({ length: paginas }, (_, i) => (
            <button
              key={i}
              onClick={() => setPagina(i)}
              aria-current={i === pagina ? "page" : undefined}
              style={{
                ...botaoNeutro,
                minHeight: 44,
                minWidth: 44,
                fontWeight: i === pagina ? 600 : 400,
                background: i === pagina ? tema.superficieAlta : "transparent",
              }}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => setPagina((p) => Math.min(paginas - 1, p + 1))}
            disabled={pagina === paginas - 1}
            aria-label="Próxima página"
            style={{
              ...botaoNeutro,
              minHeight: 44,
              opacity: pagina === paginas - 1 ? 0.4 : 1,
            }}
          >
            ›
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** O `← VOLTAR` que fecha o item aberto e devolve a listagem. */
export function Voltar({ aoVoltar, oQue }: { aoVoltar: () => void; oQue: string }) {
  return (
    <button
      onClick={aoVoltar}
      style={{ ...botaoNeutro, minHeight: 44, padding: "0 16px" }}
    >
      ← Voltar {oQue}
    </button>
  );
}
