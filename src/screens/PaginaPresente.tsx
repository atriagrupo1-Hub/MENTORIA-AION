import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Capa, capaPresente } from "@/components/Capa";
import { Cadeado, Play } from "@/components/Icones";
import { useEstado } from "@/data/estado";
import { cores } from "@/design/tokens";

export function PaginaPresente() {
  const { id } = useParams();
  const { catalogo, presenteLiberado } = useEstado();
  const navegar = useNavigate();
  const [tocando, setTocando] = useState(false);

  const todos = catalogo.categorias.flatMap((c) =>
    c.presentes.map((p) => ({ presente: p, categoriaId: c.id })),
  );
  const indice = todos.findIndex((x) => x.presente.id === id);
  const atual = todos[indice];

  if (!atual) return <main className="p-8">Presente não encontrado.</main>;

  const { presente, categoriaId } = atual;
  const liberado = presenteLiberado(categoriaId, presente.id);

  return (
    <main className="rise-in-rapido mx-auto max-w-[1240px] px-7 pb-[90px] pt-[34px] cel-sm:px-[18px]">
      <div className="mb-[26px] flex flex-wrap items-center gap-[14px]">
        <button
          onClick={() => navegar("/presentes")}
          className="flex min-h-[52px] items-center justify-center gap-[10px] rounded-pilula border-none px-[22px] py-[15px] text-[16px] font-bold text-white"
          style={{
            background: "rgba(255,255,255,.16)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            cursor: "pointer",
          }}
        >
          ‹ Voltar aos presentes
        </button>
        <p className="m-0 text-[15px] text-terciario">
          Início / Presentes / {indice + 1}
        </p>
      </div>

      <p className="mb-2 mt-0 text-[13px] uppercase tracking-[.3em] text-[#a58a52]">
        Presente {indice + 1}
      </p>
      <h1
        className="mb-[26px] mt-0 font-titulo font-semibold leading-[1.16] text-marfim"
        style={{ fontSize: "clamp(26px, 6.4vw, 42px)" }}
      >
        {presente.titulo}
      </h1>

      {liberado ? (
        <div
          className="relative aspect-video w-full overflow-hidden rounded-[20px]"
          style={{
            background: "radial-gradient(700px 400px at 50% 0%, #16203a, #05080f 70%)",
            border: "1px solid rgba(212,177,112,.24)",
            boxShadow: "0 50px 90px -60px rgba(212,177,112,.5)",
          }}
        >
          <Capa
            caminhos={[presente.capaPath ?? capaPresente(indice)]}
            alt={`Capa do presente ${indice + 1}`}
            opacidade={tocando ? 0.55 : 1}
          />
          <span
            className="absolute inset-0"
            style={{
              background: "linear-gradient(180deg, rgba(5,8,16,.35), rgba(5,8,16,.8))",
            }}
          />
          {tocando && presente.videoRef ? (
            <iframe
              src={`https://www.youtube.com/embed/${presente.videoRef}?autoplay=1&rel=0&playsinline=1`}
              title={presente.titulo}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="absolute inset-0 z-[4] h-full w-full border-0"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center">
              <button
                onClick={() => setTocando(true)}
                aria-label="Assistir"
                className="flex min-h-[56px] items-center justify-center gap-3 rounded-pilula border-none bg-white px-[26px] py-4 text-[17px] font-bold text-black hover:opacity-[.86]"
                style={{ cursor: "pointer" }}
              >
                <Play tamanho={14} />
                Assistir
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          className="flex aspect-video w-full flex-col items-center justify-center gap-[14px] rounded-[20px]"
          style={{
            background: "linear-gradient(165deg, rgba(16,24,42,.9), rgba(6,9,18,.94))",
            border: "1px solid rgba(212,177,112,.18)",
          }}
        >
          <Cadeado largura={32} cor="rgba(243,236,225,.26)" corArco="rgba(243,236,225,.3)" />
          <p className="m-0 text-[15px] text-[rgba(243,236,225,.6)]">
            Este presente será disponibilizado aqui.
          </p>
        </div>
      )}

      <div className="mt-[26px] flex flex-wrap gap-[18px]">
        <div
          className="flex-[1_1_320px] rounded-cartao-lg p-[26px]"
          style={{ background: cores.cartao, border: "1px solid rgba(212,177,112,.2)" }}
        >
          <h3 className="mb-[14px] mt-0 font-titulo text-[27px] text-marfim">
            Sobre este presente
          </h3>
          <p className="m-0 text-[18px] leading-[1.7] text-[#b9ac9a]">
            {presente.descricao || "Este presente será disponibilizado aqui."}
          </p>
        </div>

        <div
          className="flex-[1_1_260px] rounded-cartao-lg p-[26px]"
          style={{ background: cores.cartao, border: "1px solid rgba(212,177,112,.2)" }}
        >
          <h3 className="mb-[14px] mt-0 font-titulo text-[27px] text-marfim">
            Outros presentes
          </h3>
          <div className="flex flex-col gap-2">
            {todos.map((outro, i) => {
              const outroLiberado = presenteLiberado(outro.categoriaId, outro.presente.id);
              const selecionado = outro.presente.id === presente.id;
              return (
                <button
                  key={outro.presente.id}
                  onClick={() =>
                    outroLiberado ? navegar(`/presente/${outro.presente.id}`) : undefined
                  }
                  className="flex min-h-[64px] items-center gap-[14px] rounded-botao px-[14px] py-[10px] text-left"
                  style={{
                    background: selecionado
                      ? "rgba(212,177,112,.12)"
                      : "rgba(243,236,225,.03)",
                    border: `1px solid ${
                      selecionado ? "rgba(240,220,168,.7)" : "rgba(243,236,225,.1)"
                    }`,
                    cursor: "pointer",
                  }}
                >
                  <span
                    className="grid h-[34px] flex-[0_0_34px] place-items-center rounded-full text-[15px]"
                    style={{
                      color: cores.ouroMedio,
                      border: "1px solid rgba(212,177,112,.5)",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span className="flex flex-1 flex-col gap-1">
                    <span className="text-[16px] leading-[1.35] text-[#e8e0d3]">
                      {outroLiberado ? outro.presente.titulo : `Presente ${i + 1}`}
                    </span>
                    <span className="text-[14px] text-[#7d7466]">
                      {outroLiberado ? "Assistir" : "Em breve"}
                    </span>
                  </span>
                </button>
              );
            })}
            {todos.length === 0 ? (
              <p className="m-0 text-[14px] text-[rgba(243,236,225,.45)]">
                Em breve, presentes nesta categoria.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
