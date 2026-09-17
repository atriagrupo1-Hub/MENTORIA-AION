import { useNavigate, useParams } from "react-router-dom";
import { Capa, capaAoVivo, capaModulo } from "@/components/Capa";
import { useEstado } from "@/data/estado";
import { cores } from "@/design/tokens";

export function AulaAoVivo() {
  const { mi } = useParams();
  const numero = Number(mi);
  const { catalogo } = useEstado();
  const navegar = useNavigate();

  const modulo = catalogo.modulos.find((m) => m.numero === numero);
  if (!modulo) return <main className="p-8">Módulo não encontrado.</main>;

  const aoVivo = catalogo.aoVivo[modulo.id];

  return (
    <main className="entra mx-auto max-w-[1240px] px-7 pb-24 pt-9 cel-sm:px-5">
      <div className="mb-7 flex flex-wrap items-center gap-4">
        <button
          onClick={() => navegar(`/modulo/${numero}`)}
          className="min-h-[52px] rounded-pilula px-5 py-4 text-corpo text-marfim-corpo"
          style={{
            background: "rgba(255,255,255,.14)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            border: "none",
            cursor: "pointer",
          }}
        >
          ‹ Voltar ao módulo
        </button>
        <p className="m-0 text-corpo text-terciario">
          Início / Módulo {numero} / Aula ao vivo
        </p>
      </div>

      <span
        className="mb-2 flex items-center text-rotulo uppercase tracking-rotulo"
        style={{ color: "#ffffff" }}
      >
        <span
          className="mr-3 h-[9px] w-[9px] flex-none rounded-full"
          style={{
            background: "#ffffff",
            boxShadow: "0 0 12px rgba(240,220,168,.9)",
            animation: "softGlow 2.8s ease-in-out infinite",
          }}
        />
        <span>Aula ao vivo · Módulo {numero}</span>
      </span>

      <h1
        className="text-heroi mb-7 mt-0 font-titulo font-semibold text-marfim"
      >
        Encontro ao vivo do Módulo {numero} — {modulo.titulo}
      </h1>

      <div
        className="relative aspect-video w-full overflow-hidden rounded-[20px]"
        style={{
          background: "radial-gradient(700px 400px at 50% 120%, #17223c, #05080f 70%)",
          border: "1px solid rgba(255,255,255,.26)",
          boxShadow: "0 50px 90px -60px rgba(255,255,255,.5)",
        }}
      >
        <Capa
          caminhos={[capaAoVivo(numero), capaModulo(numero)]}
          alt={`Capa da aula ao vivo do Módulo ${numero}`}
          opacidade={1}
        />
        <span
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(5,8,16,.35), rgba(5,8,16,.85))" }}
        />
        {/*
          Aqui havia um botão "Assistir aula ao vivo" e uma barra de
          progresso. Nenhum dos dois tocava nada: não existe `<video>`,
          `<iframe>` nem chamada de API nesta tela. O botão só alternava
          o próprio rótulo e empurrava a barra de 0 para 4%.

          A aluna clicava, lia "Reproduzindo", via a barra andar um
          dedo e parar — e concluía que o vídeo dela estava quebrado.
          Mentir sobre o estado é pior que não ter o recurso.

          Para ligar isto de verdade falta uma coisa do lado dos dados:
          `AulaAoVivo` (em `data/tipos.ts`) traz `moduloId`,
          `quandoTexto` e `liberada`, mas NÃO traz o identificador da
          aula ao vivo — e `api.videoDaAoVivo(id)`, que já existe,
          precisa dele. Enquanto o catálogo não carregar esse id, esta
          tela não tem como pedir o vídeo.

          Até lá ela diz o que de fato sabe: quando é o encontro.
        */}
        <div className="absolute inset-0 grid place-items-center px-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <span
              className="rounded-[5px] px-4 py-2 text-apoio"
              style={{
                color: "rgba(255,255,255,.88)",
                background: "rgba(0,0,0,.5)",
                border: "1px solid rgba(255,255,255,.4)",
              }}
            >
              A transmissão abre aqui
            </span>
            {/*
              O dia e a hora são a única coisa que a aluna veio buscar
              nesta tela. Estavam a 15px numa legenda no rodapé do
              quadro, competindo com a palavra "Pausado".
            */}
            <span className="font-titulo text-titulo text-marfim">
              {aoVivo?.quandoTexto ?? "Data e horário a confirmar"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-7 flex flex-wrap gap-5">
        <div
          className="flex-[1_1_340px] rounded-cartao-lg p-7"
          style={{ background: cores.cartao, border: "1px solid rgba(255,255,255,.2)" }}
        >
          <h3 className="mb-4 mt-0 font-titulo text-titulo text-marfim">
            Sobre este encontro
          </h3>
          <p className="mb-3 mt-0 text-secao leading-[1.7] text-[#b9ac9a]">
            Uma aula ao vivo dedicada a este módulo: revisão dos pontos centrais, respostas
            às dúvidas das alunas e orientação prática para aplicar o conteúdo na sua rotina.
          </p>
          <p className="m-0 text-realce text-[#a89f92]">
            {aoVivo?.quandoTexto ?? "Data e horário a confirmar"}
          </p>
        </div>
        <div
          className="flex-[1_1_260px] rounded-cartao-lg p-7"
          style={{ background: cores.cartao, border: "1px solid rgba(255,255,255,.2)" }}
        >
          <h3 className="mb-4 mt-0 font-titulo text-titulo text-marfim">
            Como participar
          </h3>
          <p className="m-0 text-secao leading-[1.7] text-[#b9ac9a]">
            O encontro acontece nesta mesma página. Entre alguns minutos antes, com o caderno
            da mentoria em mãos. A gravação fica disponível aqui depois da transmissão.
          </p>
        </div>
      </div>
    </main>
  );
}
