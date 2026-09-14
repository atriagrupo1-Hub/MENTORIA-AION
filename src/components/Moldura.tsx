import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEstado } from "@/data/estado";
import { useJornada } from "@/data/useJornada";
import { cores, fundoApp } from "@/design/tokens";
import { BarraInferior, ESPACO_DA_BARRA } from "./BarraInferior";
import { Cabecalho } from "./Cabecalho";
import { ConviteInstalar } from "./ConviteInstalar";
import { EsqueletoInicio } from "./Esqueleto";
import { RolarAoTopo } from "./RolarAoTopo";

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

  /*
   * Carregando, a casca já é a de verdade.
   *
   * O cabeçalho e a barra do rodapé não dependem do banco: são o nome
   * da mentoria e quatro abas, iguais sempre. Mostrá-los no primeiro
   * quadro é o que faz o aplicativo abrir em vez de piscar — e o que
   * espera vira só o miolo, com a forma do que está vindo.
   */
  if (carregando) {
    return (
      <div className={`min-h-screen ${ESPACO_DA_BARRA}`} style={{ background: "#000000" }}>
        <Cabecalho percentualGeral={0} carregando />
        <EsqueletoInicio />
        <BarraInferior />
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
          className="m-0 max-w-[460px] font-titulo text-titulo leading-[1.3] text-marfim"
        >
          Não conseguimos carregar seu conteúdo agora.
        </p>
        <p
          className="m-0 max-w-[460px] text-corpo"
          style={{ color: cores.textoSecundario }}
        >
          Suas aulas estão guardadas. Tente de novo em alguns instantes.
        </p>
        <button
          onClick={() => void recarregar()}
          className="min-h-[52px] rounded-pilula border-none px-7 text-realce font-bold"
          style={{ color: "#000000", background: "#ffffff", cursor: "pointer" }}
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  const naAula = local.pathname.startsWith("/aula/");
  const naPaginaDoModulo = local.pathname.startsWith("/modulo/");

  return (
    <div
      className={`min-h-screen ${naAula ? "" : ESPACO_DA_BARRA}`}
      style={{ background: naAula ? "#000000" : fundoApp(moduloAtual?.numero ?? 0) }}
    >
      <RolarAoTopo />
      {naAula ? null : (
        <Cabecalho percentualGeral={percentualGeral} soComputador={naPaginaDoModulo} />
      )}
      <Outlet />
      {naAula ? null : <ConviteInstalar />}
      {naAula ? null : <BarraInferior />}
    </div>
  );
}
