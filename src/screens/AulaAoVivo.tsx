import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Capa, capaAoVivo, capaModulo } from "@/components/Capa";
import { Player } from "@/components/Player";
import * as api from "@/data/api";
import { useEstado } from "@/data/estado";
import { cores } from "@/design/tokens";

export function AulaAoVivo() {
  const { mi } = useParams();
  const numero = Number(mi);
  const { catalogo } = useEstado();
  const navegar = useNavigate();

  const modulo = catalogo.modulos.find((m) => m.numero === numero);
  const aoVivo = modulo ? catalogo.aoVivo[modulo.id] : undefined;
  const idAoVivo = aoVivo?.liberada ? (aoVivo.id ?? "") : "";

  /*
   * O vídeo do encontro, pedido ao servidor.
   *
   * Vem daqui e não do catálogo pelo mesmo motivo da aula: a leitura da
   * aluna não traz `video_ref`, e a Edge Function só assina depois de o
   * banco confirmar a liberação — `video_da_ao_vivo` confere
   * `pode_ver_ao_vivo`. Liberado sem vídeo cadastrado continua
   * mostrando a data, que é o que ela veio buscar.
   */
  const [video, setVideo] = useState<api.Video | null>(null);

  useEffect(() => {
    if (!idAoVivo) {
      setVideo(null);
      return;
    }
    let valeAinda = true;
    void api
      .videoDaAoVivo(idAoVivo)
      .then((v) => valeAinda && setVideo(v))
      .catch(() => undefined);
    return () => {
      valeAinda = false;
    };
  }, [idAoVivo]);

  if (!modulo) return <main className="p-8">Módulo não encontrado.</main>;

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

      {video ? (
        /*
          Tocando de verdade.

          Aqui havia um botão "Assistir aula ao vivo" e uma barra de
          progresso que não tocavam nada: não existia `<video>`,
          `<iframe>` nem chamada de API nesta tela. A aluna clicava, lia
          "Reproduzindo", via a barra andar um dedo e parar — e concluía
          que o vídeo dela estava quebrado.

          O que faltava era um id: `AulaAoVivo` trazia `moduloId`,
          `quandoTexto` e `liberada`, e o catálogo jogava fora o `id`
          que `videoDaAoVivo` precisa. Agora ele vem junto.
        */
        <Player
          identificador={video.ref}
          aoRenovar={async () => {
            const novo = await api.videoDaAoVivo(idAoVivo);
            if (!novo) return false;
            setVideo(novo);
            return true;
          }}
          capa={
            <Capa
              caminhos={[capaAoVivo(numero), capaModulo(numero)]}
              alt={`Capa da aula ao vivo do Módulo ${numero}`}
            />
          }
        />
      ) : (
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
          Sem vídeo ainda: diz o que de fato sabe, que é quando é o
          encontro. Mentir sobre o estado é pior que não ter o recurso.
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
              {aoVivo?.liberada ? "A transmissão abre aqui" : "Libera no momento certo"}
            </span>
            <span className="font-titulo text-titulo text-marfim">
              {aoVivo?.quandoTexto ?? "Data e horário a confirmar"}
            </span>
          </div>
        </div>
      </div>
      )}

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
