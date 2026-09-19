import { useNavigate } from "react-router-dom";
import { Aviso } from "@/components/Aviso";
import { Capa, capaModulo, capaPresente } from "@/components/Capa";
import { Play } from "@/components/Icones";
import { useAviso } from "@/components/useAviso";
import { useEstado } from "@/data/estado";
import type { Modulo, Presente } from "@/data/tipos";
import { cores } from "@/design/tokens";

/**
 * O acervo, em faixas: cada categoria com o título em maiúsculas e uma
 * fileira deslizável mostrando duas capas por tela.
 *
 * O que está nas capas mudou. Antes eram os "presentes" — uma peça
 * solta com um vídeo. Agora é o MÓDULO, a mesma coisa que a aluna
 * clica na mentoria: um e-book, uma coleção de frequências, um
 * documentário. Clicar leva à página dele — nome, descrição e a lista
 * de conteúdos —, e de lá ela abre cada conteúdo. São os mesmos
 * passos da mentoria, nas mesmas telas.
 *
 * A jornada fica de fora: a mentoria já tem a tela dela, e repetir os
 * onze módulos aqui seria mostrar duas vezes a mesma coisa.
 *
 * A ordem é a do painel — categoria, depois produto, depois módulo —
 * e categoria oculta não aparece. `bloqueada_geral` é a mesma coluna
 * que o banco já confere; a tela deixar de desenhá-la é consequência,
 * não é a proteção.
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
        const produtos = [...categoria.produtos]
          .filter((p) => p.id !== catalogo.produtoJornada)
          .filter((p) => p.publicado && !p.bloqueadoGeral)
          .sort((a, b) => a.ordem - b.ordem);

        /*
         * Um produto pode ter mais de um módulo — "17 Frequências" e
         * "Frequências do Reino" no mesmo produto, por exemplo. A
         * fileira mostra os módulos, na ordem do produto e depois na
         * ordem deles.
         */
        const modulos = produtos.flatMap((p) =>
          [...p.modulos].sort((a, b) => a.ordem - b.ordem),
        );

        /*
         * Peças antigas, do tempo em que o acervo era feito de
         * presentes soltos. Não existe nenhuma hoje; ficam aqui para
         * que uma linha antiga nunca suma da tela por causa da
         * mudança de estrutura.
         */
        const soltos = categoria.presentes.filter((p) => !p.produtoId);

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

            {modulos.length === 0 && soltos.length === 0 ? (
              <p className="mb-2 mt-0 text-corpo text-[rgba(243,236,225,.45)]">
                Em breve, conteúdos nesta categoria.
              </p>
            ) : (
              <Fileira>
                {modulos.map((modulo) => (
                  <CartaoModulo key={modulo.id} modulo={modulo} avisar={aviso.mostrar} />
                ))}
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
            )}
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

function CartaoModulo({
  modulo,
  avisar,
}: {
  modulo: Modulo;
  avisar: (m: string) => void;
}) {
  const navegar = useNavigate();
  const { moduloVisivel, moduloLiberado } = useEstado();

  /*
   * Aberto só quando ela tem ao menos um conteúdo dele já liberado —
   * a mesma regra da mentoria. Quem decide continua sendo o banco;
   * isto é a leitura da resposta dele.
   */
  const liberado = moduloVisivel(modulo) && moduloLiberado(modulo);

  return (
    <Cartao
      titulo={modulo.titulo}
      capa={modulo.capaPath ?? capaModulo(modulo.numero)}
      liberado={liberado}
      aoAbrir={() => navegar(`/modulo/${modulo.id}`)}
      avisar={avisar}
    />
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
      capa={presente.capaPath ?? capaPresente(Math.max(0, indice))}
      liberado={presenteLiberado(categoriaId, presente.id)}
      aoAbrir={() => navegar(`/presente/${presente.id}`)}
      avisar={avisar}
    />
  );
}

function Cartao({
  titulo,
  capa,
  liberado,
  aoAbrir,
  avisar,
}: {
  titulo: string;
  capa: string;
  liberado: boolean;
  aoAbrir: () => void;
  avisar: (m: string) => void;
}) {
  return (
    <button
      onClick={() => {
        if (!liberado) {
          avisar("Este conteúdo será disponibilizado no momento certo da sua jornada.");
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
        <Capa caminhos={[capa]} alt={`Capa de ${titulo}`} />
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
          {liberado ? "Abrir" : "Em breve"}
        </span>
        <span className="absolute inset-x-3 bottom-4 text-center font-titulo text-realce leading-[1.18] text-marfim">
          {liberado ? titulo : ""}
        </span>
      </span>
    </button>
  );
}
