import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEstado } from "@/data/estado";
import { useJornada } from "@/data/useJornada";
import { fundoApp } from "@/design/tokens";
import { Cabecalho } from "./Cabecalho";

/**
 * Casca do aplicativo da aluna: degradê do topo na cor do módulo atual
 * e cabeçalho fixo. O cabeçalho desaparece por completo na tela da aula.
 */
export function Moldura() {
  const { aluna } = useEstado();
  const { percentualGeral, moduloAtual } = useJornada();
  const local = useLocation();

  if (!aluna) return <Navigate to="/" replace />;

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
