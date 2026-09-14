import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Capa, capaAoVivo, capaModulo } from "@/components/Capa";
import { Play } from "@/components/Icones";
import { useEstado } from "@/data/estado";
import { cores } from "@/design/tokens";

export function AulaAoVivo() {
  const { mi } = useParams();
  const numero = Number(mi);
  const { catalogo } = useEstado();
  const navegar = useNavigate();
  const [tocando, setTocando] = useState(false);
  const [pct, setPct] = useState(0);

  const modulo = catalogo.modulos.find((m) => m.numero === numero);
  if (!modulo) return <main className="p-8">Módulo não encontrado.</main>;

  const aoVivo = catalogo.aoVivo[modulo.id];

  return (
    <main className="rise-in-rapido mx-auto max-w-[1240px] px-7 pb-24 pt-9 cel-sm:px-5">
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
          opacidade={tocando ? 0.55 : 1}
        />
        <span
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(5,8,16,.35), rgba(5,8,16,.85))" }}
        />
        <div className="absolute inset-0 grid place-items-center">
          <button
            onClick={() => {
              setTocando((v) => !v);
              setPct((v) => (v === 0 ? 4 : v));
            }}
            aria-label={tocando ? "Pausar transmissão" : "Assistir aula ao vivo"}
            className="flex min-h-[56px] items-center justify-center gap-3 rounded-pilula border-none bg-white px-7 py-4 text-realce font-bold text-black hover:opacity-[.86]"
            style={{ cursor: "pointer" }}
          >
            <Play tamanho={14} />
            {tocando ? "Pausar transmissão" : "Assistir aula ao vivo"}
          </button>
        </div>
        <div
          className="absolute inset-x-0 bottom-0 px-6 py-5"
          style={{ background: "linear-gradient(180deg, transparent, rgba(5,8,16,.92))" }}
        >
          <div
            className="h-[6px] overflow-hidden rounded-pilula"
            style={{ background: "rgba(243,236,225,.18)" }}
          >
            <div
              className="h-full rounded-pilula"
              style={{
                background: "#ffffff",
                width: `${pct}%`,
                transition: "width .4s linear",
              }}
            />
          </div>
          <div className="mt-3 flex justify-between text-corpo text-[#cbbfae]">
            <span>{tocando ? "Reproduzindo" : pct > 0 ? "Pausado" : "Pronto para assistir"}</span>
            <span>{aoVivo?.quandoTexto ?? "Encontro de 1 hora"}</span>
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
