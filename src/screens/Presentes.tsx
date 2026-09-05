import { useNavigate } from "react-router-dom";
import { Aviso } from "@/components/Aviso";
import { Capa, capaPresente } from "@/components/Capa";
import { Play } from "@/components/Icones";
import { useAviso } from "@/components/useAviso";
import { useEstado } from "@/data/estado";
import { cores } from "@/design/tokens";

/**
 * Acervo em faixas: cada categoria com título dourado em maiúsculas e
 * uma fileira deslizável mostrando duas capas por tela. Categorias
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
    <main className="rise-in mx-auto max-w-[1360px] px-7 pb-[90px] pt-[22px] cel-sm:px-[18px]">
      <p className="mb-[10px] mt-0 text-[13px] uppercase tracking-[.3em] text-[#a58a52]">
        Acervo
      </p>
      <h1
        className="m-0 font-titulo font-semibold leading-[1.12] text-marfim"
        style={{ fontSize: "clamp(28px, 7vw, 46px)" }}
      >
        Presentes
      </h1>
      <p
        className="mb-0 mt-4 max-w-[700px] leading-[1.55] text-[#cbbfae]"
        style={{ fontSize: "clamp(18px, 4.6vw, 21px)" }}
      >
        Conteúdos escolhidos para assistir com calma, no seu tempo, ao lado das aulas da
        mentoria.
      </p>

      {categorias.map((categoria) => (
        <section key={categoria.id} className="mt-[34px]">
          <h2
            className="mb-[14px] mt-0 text-[12px] font-bold uppercase tracking-[.22em]"
            style={{ color: cores.ouro }}
          >
            {categoria.titulo}
          </h2>

          {categoria.presentes.length === 0 ? (
            <p className="mb-[6px] mt-0 text-[14px] text-[rgba(243,236,225,.45)]">
              Em breve, presentes nesta categoria.
            </p>
          ) : null}

          <div
            className="sem-barra flex gap-[14px] overflow-x-auto pb-1"
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
                      border: "1px solid rgba(212,177,112,.18)",
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
                      className="absolute left-1/2 top-1/2 flex min-h-[26px] -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-[6px] whitespace-nowrap rounded-pilula px-[11px] py-[6px] text-[10px] font-bold"
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
                      className="absolute inset-x-3 bottom-[14px] text-center font-titulo leading-[1.18] text-marfim"
                      style={{ fontSize: "clamp(16px, 3.6vw, 19px)" }}
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
