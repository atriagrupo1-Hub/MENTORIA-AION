import { useNavigate } from "react-router-dom";
import { Aviso } from "@/components/Aviso";
import { Capa, capaPresente } from "@/components/Capa";
import { Play } from "@/components/Icones";
import { useAviso } from "@/components/useAviso";
import { useEstado } from "@/data/estado";
import { cores } from "@/design/tokens";

/**
 * Acervo em faixas: cada categoria com o título em maiúsculas e uma
 * fileira deslizável mostrando duas capas por tela. Categorias
 * destacadas vêm primeiro.
 */
export function Presentes() {
  const { catalogo, presenteLiberado } = useEstado();
  const navegar = useNavigate();
  const aviso = useAviso();

  const categorias = [...catalogo.categorias].sort(
    (a, b) => Number(b.destacada) - Number(a.destacada) || a.ordem - b.ordem,
  );

  const todos = catalogo.categorias.flatMap((c) => c.presentes);

  return (
    <main className="entra mx-auto max-w-[1360px] px-7 pb-24 pt-6 cel-sm:px-5">
      <p className="mb-3 mt-0 text-rotulo uppercase tracking-rotulo text-[rgba(255,255,255,.4)]">
        Acervo
      </p>
      <h1
        className="text-heroi m-0 font-titulo font-semibold text-marfim"
      >
        Presentes
      </h1>
      <p
        className="text-realce mb-0 mt-4 max-w-[700px] leading-[1.5] text-[#cbbfae]"
      >
        Conteúdos escolhidos para assistir com calma, no seu tempo, ao lado das aulas da
        mentoria.
      </p>

      {categorias.map((categoria) => (
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

          {categoria.presentes.length === 0 ? (
            <p className="mb-2 mt-0 text-corpo text-[rgba(243,236,225,.45)]">
              Em breve, presentes nesta categoria.
            </p>
          ) : null}

          <div
            className="sem-barra flex gap-4 overflow-x-auto pb-1"
            style={{ scrollSnapType: "x mandatory", scrollBehavior: "smooth" }}
          >
            {categoria.presentes.map((presente) => {
              const liberado = presenteLiberado(categoria.id, presente.id);
              const indice = todos.findIndex((p) => p.id === presente.id);
              return (
                <button
                  key={presente.id}
                  onClick={() => {
                    if (!liberado) {
                      aviso.mostrar(
                        "Este presente será disponibilizado no momento certo da sua jornada.",
                      );
                      return;
                    }
                    navegar(`/presente/${presente.id}`);
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
                      caminhos={[presente.capaPath ?? capaPresente(indice)]}
                      alt={`Capa de ${presente.titulo}`}
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
                        background: liberado
                          ? "rgba(255,255,255,.88)"
                          : "rgba(255,255,255,.16)",
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
                    <span
                      className="absolute inset-x-3 bottom-4 text-center font-titulo text-realce leading-[1.18] text-marfim"
                    >
                      {liberado ? presente.titulo : ""}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <Aviso mensagem={aviso.mensagem} aoFechar={aviso.limpar} />
    </main>
  );
}
