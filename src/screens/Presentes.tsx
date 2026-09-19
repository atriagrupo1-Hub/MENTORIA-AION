import { useNavigate } from "react-router-dom";
import { Aviso } from "@/components/Aviso";
import { Capa, capaPresente } from "@/components/Capa";
import { Play } from "@/components/Icones";
import { useAviso } from "@/components/useAviso";
import { useEstado } from "@/data/estado";
import type { Presente, Produto } from "@/data/tipos";
import { cores } from "@/design/tokens";

/**
 * Acervo em faixas: cada categoria com o título em maiúsculas e uma
 * fileira deslizável mostrando duas capas por tela.
 *
 * A ordem é a do painel, e só ela. Antes havia um desempate por
 * `destacada` na frente de `ordem` — uma categoria marcada como
 * destacada furava a fila —, e isso fazia a ordem escolhida em
 * Categorias / Layout não ser obedecida. `destacada` existia para dar
 * sub-aba à categoria no painel antigo; não é assunto desta tela.
 *
 * Categoria oculta não aparece. `bloqueada_geral` é a mesma coluna que
 * `pode_ver_presente` e `pode_ver_produto` já conferem no banco — a
 * tela deixando de desenhá-la é consequência, não é a proteção.
 */
export function Presentes() {
  const { catalogo } = useEstado();
  const aviso = useAviso();

  const categorias = [...catalogo.categorias]
    .filter((c) => !c.bloqueadaGeral)
    .sort((a, b) => a.ordem - b.ordem);

  const todos = catalogo.categorias.flatMap((c) => c.presentes);

  return (
    <main className="entra mx-auto max-w-[1360px] px-7 pb-24 pt-6 cel-sm:px-5">
      <p className="mb-3 mt-0 text-rotulo uppercase tracking-rotulo text-[rgba(255,255,255,.4)]">
        Acervo
      </p>
      <h1 className="text-heroi m-0 font-titulo font-semibold text-marfim">Presentes</h1>
      <p className="text-realce mb-0 mt-4 max-w-[700px] leading-[1.5] text-[#cbbfae]">
        Conteúdos escolhidos para assistir com calma, no seu tempo, ao lado das aulas da
        mentoria.
      </p>

      {categorias.map((categoria) => {
        /*
         * Dentro da categoria, os produtos na ordem do painel. Só os
         * que têm alguma coisa para mostrar aqui: o produto que é um
         * curso aparece na área da mentoria, não no acervo.
         */
        const produtos = [...categoria.produtos]
          .filter((p) => p.publicado && !p.bloqueadoGeral)
          .filter((p) => p.presentes.length > 0 || p.conteudos.length > 0)
          .sort((a, b) => a.ordem - b.ordem);

        /*
         * Itens que ainda não pertencem a produto nenhum. Hoje não
         * existe nenhum; ficam aqui para que uma linha antiga nunca
         * desapareça da tela por causa da mudança de estrutura.
         */
        const soltos = categoria.presentes.filter((p) => !p.produtoId);

        const vazia = produtos.length === 0 && soltos.length === 0;

        return (
          <section key={categoria.id} className="mt-9">
            {/*
              Hierarquia invertida: o nome de cada categoria — a estrutura
              do acervo inteiro — era o MENOR texto da tela (11px), e o
              parágrafo decorativo acima era o segundo maior (21-27px).
              A categoria sobe para 19px; o parágrafo desce para 17px.
            */}
            <h2
              className="text-secao mb-4 mt-0 font-bold uppercase tracking-[.06em]"
              style={{ color: "#ffffff" }}
            >
              {categoria.titulo}
            </h2>

            {vazia ? (
              <p className="mb-2 mt-0 text-corpo text-[rgba(243,236,225,.45)]">
                Em breve, presentes nesta categoria.
              </p>
            ) : null}

            {soltos.length > 0 ? (
              <Fileira>
                {soltos.map((presente) => (
                  <CartaoPresente
                    key={presente.id}
                    presente={presente}
                    categoriaId={categoria.id}
                    indice={todos.findIndex((p) => p.id === presente.id)}
                    avisar={aviso.mostrar}
                  />
                ))}
              </Fileira>
            ) : null}

            {produtos.map((produto) => (
              <BlocoDoProduto
                key={produto.id}
                produto={produto}
                categoriaId={categoria.id}
                mostrarNome={produtos.length > 1 || produto.presentes.length === 0}
                indiceDe={(id) => todos.findIndex((p) => p.id === id)}
                avisar={aviso.mostrar}
              />
            ))}
          </section>
        );
      })}

      <Aviso mensagem={aviso.mensagem} aoFechar={aviso.limpar} />
    </main>
  );
}

function Fileira({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="sem-barra flex gap-4 overflow-x-auto pb-1"
      style={{ scrollSnapType: "x mandatory", scrollBehavior: "smooth" }}
    >
      {children}
    </div>
  );
}

function BlocoDoProduto({
  produto,
  categoriaId,
  mostrarNome,
  indiceDe,
  avisar,
}: {
  produto: Produto;
  categoriaId: string;
  mostrarNome: boolean;
  indiceDe: (id: string) => number;
  avisar: (m: string) => void;
}) {
  const navegar = useNavigate();
  const { produtoLiberado } = useEstado();

  const itens = [...produto.presentes].sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="mt-5 first:mt-0">
      {mostrarNome ? (
        <h3 className="text-realce mb-3 mt-0 font-titulo font-semibold text-marfim">
          {produto.titulo}
        </h3>
      ) : null}

      {itens.length > 0 ? (
        <Fileira>
          {itens.map((presente) => (
            <CartaoPresente
              key={presente.id}
              presente={presente}
              categoriaId={categoriaId}
              indice={indiceDe(presente.id)}
              avisar={avisar}
            />
          ))}
        </Fileira>
      ) : (
        /*
         * Produto sem item nenhum: o conteúdo mora direto nele, e a
         * capa inteira é o botão. É o e-book e o documentário.
         */
        <Fileira>
          <Cartao
            titulo={produto.titulo}
            capa={produto.capaPath}
            indice={0}
            liberado={produtoLiberado(produto.id)}
            aoAbrir={() => navegar(`/conteudo/${produto.id}`)}
            avisar={avisar}
          />
        </Fileira>
      )}
    </div>
  );
}

function CartaoPresente({
  presente,
  categoriaId,
  indice,
  avisar,
}: {
  presente: Presente;
  categoriaId: string;
  indice: number;
  avisar: (m: string) => void;
}) {
  const navegar = useNavigate();
  const { presenteLiberado } = useEstado();

  return (
    <Cartao
      titulo={presente.titulo}
      capa={presente.capaPath}
      indice={indice}
      liberado={presenteLiberado(categoriaId, presente.id)}
      aoAbrir={() => navegar(`/presente/${presente.id}`)}
      avisar={avisar}
    />
  );
}

function Cartao({
  titulo,
  capa,
  indice,
  liberado,
  aoAbrir,
  avisar,
}: {
  titulo: string;
  capa: string | null;
  indice: number;
  liberado: boolean;
  aoAbrir: () => void;
  avisar: (m: string) => void;
}) {
  return (
    <button
      onClick={() => {
        if (!liberado) {
          avisar("Este presente será disponibilizado no momento certo da sua jornada.");
          return;
        }
        aoAbrir();
      }}
      className="block flex-[0_0_calc((100%-14px)/2)] border-none bg-transparent p-0 text-left"
      style={{ scrollSnapAlign: "start", cursor: "pointer" }}
    >
      <span
        className="relative block aspect-[2/3] w-full overflow-hidden rounded-botao transition-transform duration-500 ease-suave hover:-translate-y-[5px]"
        style={{
          background: cores.placeholderCapa,
          border: "1px solid rgba(255,255,255,.18)",
          boxShadow: "0 16px 34px -26px rgba(0,0,0,.9)",
        }}
      >
        <Capa
          caminhos={[capa ?? capaPresente(Math.max(0, indice))]}
          alt={`Capa de ${titulo}`}
        />
        <span
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(5,8,16,.15) 0%, rgba(5,8,16,.5) 55%, rgba(5,8,16,.92) 100%)",
          }}
        />
        <span
          className="absolute left-1/2 top-1/2 flex min-h-[26px] -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-2 whitespace-nowrap rounded-pilula px-3 py-2 text-rotulo font-bold"
          style={{
            color: liberado ? "#000000" : "#ffffff",
            background: liberado ? "rgba(255,255,255,.88)" : "rgba(255,255,255,.16)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          {liberado ? (
            <Play tamanho={7} />
          ) : (
            <span className="flex flex-col items-center">
              <span
                style={{
                  width: 6,
                  height: 4,
                  border: "2px solid rgba(255,255,255,.9)",
                  borderBottom: "none",
                  borderRadius: "99px 99px 0 0",
                }}
              />
              <span
                style={{
                  width: 10,
                  height: 7,
                  background: "rgba(255,255,255,.9)",
                  borderRadius: 2,
                }}
              />
            </span>
          )}
          {liberado ? "Assistir" : "Em breve"}
        </span>
        <span className="absolute inset-x-3 bottom-4 text-center font-titulo text-realce leading-[1.18] text-marfim">
          {liberado ? titulo : ""}
        </span>
      </span>
    </button>
  );
}
