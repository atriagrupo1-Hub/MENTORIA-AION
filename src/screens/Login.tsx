import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Capa } from "@/components/Capa";
import { SilhuetaCadeado, SilhuetaPessoa } from "@/components/Icones";
import { useEstado } from "@/data/estado";
import { cores, tipografia } from "@/design/tokens";

const CAMPO: React.CSSProperties = {
  width: "100%",
  height: 54,
  fontSize: 16,
  color: cores.textoCorpo,
  background: "rgba(8,12,24,.85)",
  border: "1px solid rgba(255,255,255,.24)",
  borderRadius: 12,
  outline: "none",
};

const SELOS = [
  { glifo: "✓", rotulo: "Acesso protegido" },
  { glifo: "⌘", rotulo: "Dados privados" },
  { glifo: "♦", rotulo: "Turma verificada" },
];

export function Login() {
  const { entrar } = useEstado();
  const navegar = useNavigate();
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [mostrarCodigo, setMostrarCodigo] = useState(false);
  const [erro, setErro] = useState("");
  const [focado, setFocado] = useState("");
  const [entrando, setEntrando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (entrando) return;
    setEntrando(true);
    setErro("");
    try {
      const falha = await entrar(nome, codigo);
      if (falha) {
        setErro(falha);
        return;
      }
      setCodigo("");
      navegar("/inicio");
    } finally {
      setEntrando(false);
    }
  }

  const foco = (campo: string): React.CSSProperties =>
    focado === campo
      ? { borderColor: "#ffffff", boxShadow: "0 0 0 3px rgba(255,255,255,.16)" }
      : {};

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-[18px] py-8">
      <div className="rise-in-lento w-full max-w-[460px]">
        <div className="mb-6 text-center">
          <span className="relative mb-[18px] inline-block h-[132px] w-[132px]">
            <span
              className="absolute inset-0 flex flex-col items-center justify-center gap-[7px] overflow-hidden rounded-full"
              style={{
                background: cores.placeholderCapa,
                border: "2px solid rgba(255,255,255,.75)",
                boxShadow: "0 0 44px -12px rgba(255,255,255,.6)",
              }}
            >
              <span aria-hidden="true" className="flex flex-col items-center gap-[3px]">
                <span
                  style={{
                    width: 22,
                    height: 22,
                    border: "2px solid rgba(255,255,255,.5)",
                    borderRadius: "50%",
                  }}
                />
                <span
                  style={{
                    width: 40,
                    height: 18,
                    border: "2px solid rgba(255,255,255,.5)",
                    borderBottom: "none",
                    borderRadius: "99px 99px 0 0",
                  }}
                />
              </span>
              <span
                className="font-mono text-rotulo tracking-rotulo"
                style={{ color: "rgba(255,255,255,.6)" }}
              >
                foto da mentora
              </span>
              <Capa caminhos={["/assets/marca/mentora.png"]} alt="Foto da mentora" />
            </span>
            <span
              aria-label="Perfil verificado"
              className="absolute right-[10px] top-[10px] grid h-8 w-8 place-items-center rounded-full text-realce text-white"
              style={{ background: cores.verificado, border: "2px solid #05070f" }}
            >
              ✓
            </span>
          </span>

          <p className="mb-2 mt-0 text-rotulo uppercase tracking-rotulo text-marfim">Mentoria</p>
          <p
            className="m-0 font-titulo font-semibold leading-[1.15] tracking-rotulo"
            style={{ fontSize: tipografia.marcaLogin, color: "#ffffff" }}
          >
            CAMINHO DO DESBLOQUEIO
          </p>
          <p
            className="mb-0 mt-[5px] font-titulo font-semibold leading-[1.15] tracking-rotulo"
            style={{ fontSize: tipografia.marcaLogin, color: "#ffffff" }}
          >
            PARA BÊNÇÃOS ILIMITADAS
          </p>
        </div>

        <form
          onSubmit={enviar}
          className="rounded-[22px] px-[22px] pb-6 pt-[26px]"
          style={{
            background: cores.cartaoForte,
            border: "1px solid rgba(255,255,255,.2)",
            boxShadow:
              "0 40px 90px -50px rgba(255,255,255,.35), 0 20px 60px rgba(0,0,0,.6)",
          }}
        >
          <h1
            className="text-heroi m-0 text-center font-bold leading-[1.2] text-white"
          >
            Bem-vinda de volta
          </h1>
          <p
            className="mb-[22px] mt-2 text-center text-corpo"
            style={{ color: cores.textoSecundario }}
          >
            Entre para continuar sua jornada
          </p>

          <label
            htmlFor="aluna-nome"
            className="mb-2 block text-apoio font-bold"
            style={{ color: "rgba(243,236,225,.75)" }}
          >
            Seu nome
          </label>
          <div className="relative mb-4 flex">
            <span className="absolute left-[17px] top-1/2 -translate-y-1/2">
              <SilhuetaPessoa />
            </span>
            <input
              id="aluna-nome"
              type="text"
              value={nome}
              onChange={(e) => {
                setNome(e.target.value);
                setErro("");
              }}
              onFocus={() => setFocado("nome")}
              onBlur={() => setFocado("")}
              autoComplete="off"
              placeholder="Digite seu nome"
              style={{ ...CAMPO, padding: "0 16px 0 48px", ...foco("nome") }}
            />
          </div>

          <label
            htmlFor="aluna-codigo"
            className="mb-2 block text-apoio font-bold"
            style={{ color: "rgba(243,236,225,.75)" }}
          >
            Seu código
          </label>
          <div className="relative flex">
            <span className="absolute left-[17px] top-1/2 -translate-y-1/2">
              <SilhuetaCadeado />
            </span>
            <input
              id="aluna-codigo"
              type={mostrarCodigo ? "text" : "password"}
              value={codigo}
              onChange={(e) => {
                setCodigo(e.target.value);
                setErro("");
              }}
              onFocus={() => setFocado("codigo")}
              onBlur={() => setFocado("")}
              inputMode="numeric"
              autoComplete="off"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="Digite seu código"
              style={{ ...CAMPO, padding: "0 52px 0 48px", ...foco("codigo") }}
            />
            <button
              type="button"
              onClick={() => setMostrarCodigo((v) => !v)}
              aria-label={mostrarCodigo ? "Ocultar código" : "Mostrar código"}
              title={mostrarCodigo ? "Ocultar código" : "Mostrar código"}
              className="absolute right-[6px] top-1/2 grid h-[42px] w-[42px] -translate-y-1/2 place-items-center border-none bg-transparent text-realce"
              style={{ color: "rgba(255,255,255,.8)", cursor: "pointer" }}
            >
              {mostrarCodigo ? "◎" : "◉"}
            </button>
          </div>

          {erro ? (
            <p className="mb-0 mt-3 text-corpo" style={{ color: "#e6b8a0" }}>
              {erro}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={entrando}
            className="relative mt-[22px] flex min-h-[56px] w-full items-center justify-center rounded-pilula border-none px-[54px] py-4 text-realce font-bold transition-opacity hover:opacity-90"
            style={{
              color: "#000000",
              background: "#ffffff",
              cursor: entrando ? "wait" : "pointer",
              opacity: entrando ? 0.7 : 1,
            }}
          >
            {entrando ? "Entrando..." : "Entrar na mentoria"}
            <span
              aria-hidden="true"
              className="absolute right-2 top-1/2 grid h-[38px] w-[38px] -translate-y-1/2 place-items-center rounded-full text-realce"
              style={{ color: "#000000", background: "rgba(26,20,8,.14)" }}
            >
              →
            </span>
          </button>

          <div className="my-[22px] mb-4 flex items-center gap-3">
            <span className="h-px flex-1" style={{ background: "rgba(243,236,225,.12)" }} />
            <span className="text-apoio" style={{ color: cores.textoSecundarioForte }}>
              ambiente exclusivo
            </span>
            <span className="h-px flex-1" style={{ background: "rgba(243,236,225,.12)" }} />
          </div>

          <p
            className="m-0 text-center text-apoio leading-[1.6]"
            style={{ color: "rgba(243,236,225,.5)" }}
          >
            Acesso reservado às alunas da mentoria.
          </p>
        </form>

        <div className="mt-[26px] flex justify-center gap-[26px]">
          {SELOS.map((selo) => (
            <span
              key={selo.rotulo}
              className="flex flex-col items-center gap-[7px] text-apoio tracking-rotulo"
              style={{ color: cores.textoSecundarioForte }}
            >
              <span
                className="grid h-[26px] w-[26px] place-items-center rounded-full text-apoio"
                style={{
                  color: "rgba(255,255,255,.7)",
                  border: "1px solid rgba(255,255,255,.35)",
                }}
              >
                {selo.glifo}
              </span>
              {selo.rotulo}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
