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
    <main className="rise-in-rapido mx-auto max-w-[1240px] px-7 pb-[90px] pt-[34px] cel-sm:px-[18px]">
      <div className="mb-[26px] flex flex-wrap items-center gap-[14px]">
        <button
          onClick={() => navegar(`/modulo/${numero}`)}
          className="min-h-[52px] rounded-pilula px-5 py-[14px] text-corpo text-marfim-corpo"
          style={{
            background:
              "radial-gradient(150% 240% at 50% 140%, rgba(255,255,255,.24) 0%, rgba(44,34,16,.7) 38%, #0a0805 78%)",
            border: "1px solid rgba(180,150,95,.22)",
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
          className="mr-[10px] h-[9px] w-[9px] flex-none rounded-full"
          style={{
            background: "#ffffff",
            boxShadow: "0 0 12px rgba(240,220,168,.9)",
            animation: "softGlow 2.8s ease-in-out infinite",
          }}
        />
        <span>Aula ao vivo · Módulo {numero}</span>
      </span>

      <h1
        className="text-heroi mb-[26px] mt-0 font-titulo font-semibold text-marfim"
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
            className="flex min-h-[56px] items-center justify-center gap-3 rounded-pilula border-none bg-white px-[26px] py-4 text-realce font-bold text-black hover:opacity-[.86]"
            style={{ cursor: "pointer" }}
          >
            <Play tamanho={14} />
            {tocando ? "Pausar transmissão" : "Assistir aula ao vivo"}
          </button>
        </div>
        <div
          className="absolute inset-x-0 bottom-0 px-[22px] py-5"
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
          <div className="mt-[10px] flex justify-between text-corpo text-[#cbbfae]">
            <span>{tocando ? "Reproduzindo" : pct > 0 ? "Pausado" : "Pronto para assistir"}</span>
            <span>{aoVivo?.quandoTexto ?? "Encontro de 1 hora"}</span>
          </div>
        </div>
      </div>

      <div className="mt-[26px] flex flex-wrap gap-[18px]">
        <div
          className="flex-[1_1_340px] rounded-cartao-lg p-[26px]"
          style={{ background: cores.cartao, border: "1px solid rgba(255,255,255,.2)" }}
        >
          <h3 className="mb-[14px] mt-0 font-titulo text-titulo text-marfim">
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
          className="flex-[1_1_260px] rounded-cartao-lg p-[26px]"
          style={{ background: cores.cartao, border: "1px solid rgba(255,255,255,.2)" }}
        >
          <h3 className="mb-[14px] mt-0 font-titulo text-titulo text-marfim">
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
