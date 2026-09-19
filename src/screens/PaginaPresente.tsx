import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as api from "@/data/api";
import { Capa, capaPresente } from "@/components/Capa";
import { Conteudos } from "@/components/Conteudos";
import { Cadeado, Play } from "@/components/Icones";
import { useEstado } from "@/data/estado";
import { cores } from "@/design/tokens";

export function PaginaPresente() {
  const { id } = useParams();
  const { catalogo, presenteLiberado } = useEstado();
  const navegar = useNavigate();
  const [tocando, setTocando] = useState(false);
  const [video, setVideo] = useState<api.Video | null>(null);
  const [buscandoVideo, setBuscandoVideo] = useState(true);

  const todos = catalogo.categorias.flatMap((c) =>
    c.presentes.map((p) => ({ presente: p, categoriaId: c.id })),
  );
  const indice = todos.findIndex((x) => x.presente.id === id);
  const atual = todos[indice];

  const presenteId = atual?.presente.id ?? null;

  // O endereço do vídeo vem do servidor, depois de conferida a liberação.
  useEffect(() => {
    if (!presenteId) return;
    let valeAinda = true;
    setVideo(null);
    setBuscandoVideo(true);
    void api
      .videoDoPresente(presenteId)
      .then((v) => valeAinda && setVideo(v))
      .catch(() => undefined)
      .finally(() => valeAinda && setBuscandoVideo(false));
    return () => {
      valeAinda = false;
    };
  }, [presenteId]);

  if (!atual) return <main className="p-8">Presente não encontrado.</main>;

  const { presente, categoriaId } = atual;
  const liberado = presenteLiberado(categoriaId, presente.id);
  const extras = presente.conteudos.filter((c) => c.publicado);

  return (
    <main className="entra mx-auto max-w-[1240px] px-7 pb-24 pt-9 cel-sm:px-5">
      <div className="mb-7 flex flex-wrap items-center gap-4">
        <button
          onClick={() => navegar("/presentes")}
          /*
            Era o primeiro elemento da tela, a 17px em negrito branco —
            com mais peso que "Assistir", a ação principal, que vem
            depois. Agora usa exatamente a forma do voltar da aula ao
            vivo: mesma altura de toque, texto de corpo, sem negrito.
          */
          className="flex min-h-[52px] items-center justify-center gap-3 rounded-pilula border-none px-6 py-4 text-corpo text-marfim-corpo"
          style={{
            background: "rgba(255,255,255,.14)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            cursor: "pointer",
          }}
        >
          ‹ Voltar aos presentes
        </button>
        <p className="m-0 text-corpo text-terciario">
          Início / Presentes / {indice + 1}
        </p>
      </div>

      <p className="mb-2 mt-0 text-rotulo uppercase tracking-rotulo text-[rgba(255,255,255,.4)]">
        Presente {indice + 1}
      </p>
      <h1
        className="text-heroi mb-7 mt-0 font-titulo font-semibold text-marfim"
      >
        {presente.titulo}
      </h1>

      {liberado ? (
        <div
          className="relative aspect-video w-full overflow-hidden rounded-[20px]"
          style={{
            background: "radial-gradient(700px 400px at 50% 0%, #16203a, #05080f 70%)",
            border: "1px solid rgba(255,255,255,.24)",
            boxShadow: "0 50px 90px -60px rgba(255,255,255,.5)",
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
          {/*
            O botão só existe quando há vídeo para tocar.
            
            Antes ele aparecia sempre: sem vídeo, clicar ligava
            `tocando`, a condição abaixo continuava falsa, e a tela
            voltava a desenhar o mesmo botão. A pessoa clicava, clicava,
            e nada acontecia — sem erro, sem mensagem, sem pista.
          */}
          {tocando && video ? (
            <iframe
              src={api.enderecoDoVideo(video)}
              title={presente.titulo}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="absolute inset-0 z-[4] h-full w-full border-0"
            />
          ) : buscandoVideo ? (
            <div className="absolute inset-0 grid place-items-center">
              <span className="text-corpo text-[rgba(243,236,225,.72)]">Carregando…</span>
            </div>
          ) : video ? (
            <div className="absolute inset-0 grid place-items-center">
              <button
                onClick={() => setTocando(true)}
                aria-label="Assistir"
                className="flex min-h-[56px] items-center justify-center gap-3 rounded-pilula border-none bg-white px-7 py-4 text-realce font-bold text-black hover:opacity-[.86]"
                style={{ cursor: "pointer" }}
              >
                <Play tamanho={14} />
                Assistir
              </button>
            </div>
          ) : (
            <div className="absolute inset-0 grid place-items-center px-6">
              <span
                className="rounded-[5px] px-4 py-2 text-center text-apoio"
                style={{
                  color: "rgba(255,255,255,.85)",
                  background: "rgba(0,0,0,.5)",
                  border: "1px solid rgba(255,255,255,.4)",
                }}
              >
                Vídeo em breve
              </span>
            </div>
          )}
        </div>
      ) : (
        <div
          className="flex aspect-video w-full flex-col items-center justify-center gap-4 rounded-[20px]"
          style={{
            background: "linear-gradient(165deg, rgba(16,24,42,.9), rgba(6,9,18,.94))",
            border: "1px solid rgba(255,255,255,.18)",
          }}
        >
          <Cadeado largura={32} cor="rgba(243,236,225,.26)" corArco="rgba(243,236,225,.3)" />
          <p className="m-0 text-corpo text-[rgba(243,236,225,.6)]">
            Este presente será disponibilizado aqui.
          </p>
        </div>
      )}

      {/*
        Os conteúdos deste item: capa, texto, áudio, PDF, link. O vídeo
        principal continua acima, vindo de `presente_midia` como sempre
        veio — isto é o que o item ganhou além dele, na ordem do painel.

        Só chega aqui o que o banco devolveu: a política de `conteudos`
        confere `pode_ver_presente` linha a linha.
      */}
      {liberado && extras.length > 0 ? (
        <section className="mt-8">
          <Conteudos itens={extras} />
        </section>
      ) : null}

      <div className="mt-7 flex flex-wrap gap-5">
        <div
          className="flex-[1_1_320px] rounded-cartao-lg p-7"
          style={{ background: cores.cartao, border: "1px solid rgba(255,255,255,.2)" }}
        >
          <h3 className="mb-4 mt-0 font-titulo text-titulo text-marfim">
            Sobre este presente
          </h3>
          <p className="m-0 text-secao leading-[1.7] text-[#b9ac9a]">
            {presente.descricao || "Este presente será disponibilizado aqui."}
          </p>
        </div>

        <div
          className="flex-[1_1_260px] rounded-cartao-lg p-7"
          style={{ background: cores.cartao, border: "1px solid rgba(255,255,255,.2)" }}
        >
          <h3 className="mb-4 mt-0 font-titulo text-titulo text-marfim">
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
                  className="flex min-h-[64px] items-center gap-4 rounded-botao px-4 py-3 text-left"
                  style={{
                    background: selecionado
                      ? "rgba(255,255,255,.12)"
                      : "rgba(243,236,225,.03)",
                    border: `1px solid ${
                      selecionado ? "rgba(240,220,168,.7)" : "rgba(243,236,225,.1)"
                    }`,
                    cursor: "pointer",
                  }}
                >
                  <span
                    className="grid h-[34px] flex-[0_0_34px] place-items-center rounded-full text-corpo"
                    style={{
                      color: "#ffffff",
                      border: "1px solid rgba(255,255,255,.5)",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span className="flex flex-1 flex-col gap-1">
                    <span className="text-realce text-[#e8e0d3]">
                      {outroLiberado ? outro.presente.titulo : `Presente ${i + 1}`}
                    </span>
                    <span className="text-corpo text-[#7d7466]">
                      {outroLiberado ? "Assistir" : "Em breve"}
                    </span>
                  </span>
                </button>
              );
            })}
            {todos.length === 0 ? (
              <p className="m-0 text-corpo text-[rgba(243,236,225,.45)]">
                Em breve, presentes nesta categoria.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
