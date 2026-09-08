import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEstado } from "@/data/estado";
import { useJornada } from "@/data/useJornada";
import { cores, fundoApp } from "@/design/tokens";
import { Cabecalho } from "./Cabecalho";

/**
 * Casca do aplicativo da aluna: degradê do topo na cor do módulo atual
 * e cabeçalho fixo, que desaparece na tela da aula.
 *
 * Também é o portão: enquanto o banco não respondeu, nada é mostrado; e
 * falhando a resposta, mostra o erro em vez de adivinhar. É a regra do
 * item 8 do README — não sendo possível validar, o aplicativo não
 * concede acesso.
 */
export function Moldura() {
  const { aluna, carregando, erro, recarregar } = useEstado();
  const { percentualGeral, moduloAtual } = useJornada();
  const local = useLocation();

  if (carregando) {
    return (
      <div
        className="flex min-h-screen items-center justify-center px-6"
        style={{ background: "#000000" }}
      >
        <p className="m-0 text-[15px]" style={{ color: cores.textoSecundario }}>
          Carregando sua jornada…
        </p>
      </div>
    );
  }

  if (!aluna) return <Navigate to="/" replace />;

  if (erro) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center"
        style={{ background: "#000000" }}
      >
        <p
          className="m-0 max-w-[460px] font-titulo leading-[1.3] text-marfim"
          style={{ fontSize: "clamp(21px, 5vw, 27px)" }}
        >
          Não conseguimos carregar seu conteúdo agora.
        </p>
        <p
          className="m-0 max-w-[460px] text-[15px] leading-[1.6]"
          style={{ color: cores.textoSecundario }}
        >
          Suas aulas estão guardadas. Tente de novo em alguns instantes.
        </p>
        <button
          onClick={() => void recarregar()}
          className="min-h-[52px] rounded-pilula border-none px-7 text-[16px] font-bold"
          style={{ color: cores.ouroTexto, background: cores.botaoOuro, cursor: "pointer" }}
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  const naAula = local.pathname.startsWith("/aula/");

  return (
    <div
      className="min-h-screen"
      style={{ background: naAula ? "#000000" : fundoApp(moduloAtual?.numero ?? 0) }}
    >
      {naAula ? null : <Cabecalho percentualGeral={percentualGeral} />}
      <Outlet />
    </div>
  );
}
