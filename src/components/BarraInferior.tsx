import { NavLink } from "react-router-dom";

/**
 * Navegação no rodapé, no celular.
 *
 * As abas moravam no topo, onde o polegar não alcança sem reposicionar a
 * mão — e num aparelho grande isso é um gesto a cada troca de seção.
 * Embaixo elas caem no arco natural do polegar, que é a razão de todo
 * aplicativo de porte ter feito essa mudança.
 *
 * Só no celular. Numa tela de computador o rodapé é longe do olho e do
 * cursor, então lá as abas continuam no cabeçalho.
 *
 * A barra não some ao rolar: sumir obriga a aluna a procurar de volta. E
 * ela se afasta sozinha da faixa de gestos do iPhone, para o dedo nunca
 * errar o alvo.
 */

const BRANCO = "#ffffff";
const APAGADO = "rgba(255,255,255,.42)";

const ABAS = [
  { chave: "inicio", rotulo: "Início", para: "/inicio" },
  { chave: "modulos", rotulo: "Módulos", para: "/modulos" },
  { chave: "presentes", rotulo: "Presentes", para: "/presentes" },
  { chave: "perfil", rotulo: "Perfil", para: "/perfil" },
] as const;

/**
 * Ícones de traço, desenhados aqui mesmo.
 *
 * Traço em vez de preenchido: envelhece melhor, combina com o preto e
 * branco do resto, e preenchido puxa a tela para o infantil.
 */
function Icone({ nome, cor }: { nome: string; cor: string }) {
  const comum = {
    width: 23,
    height: 23,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: cor,
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (nome === "inicio") {
    return (
      <svg {...comum}>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5.5 9.5V20h13V9.5" />
      </svg>
    );
  }
  if (nome === "modulos") {
    return (
      <svg {...comum}>
        <rect x="3" y="4" width="18" height="6" rx="1.5" />
        <rect x="3" y="14" width="18" height="6" rx="1.5" />
      </svg>
    );
  }
  if (nome === "presentes") {
    return (
      <svg {...comum}>
        <rect x="3" y="8.5" width="18" height="12" rx="1.5" />
        <path d="M3 12.5h18M12 8.5V20.5" />
        <path d="M12 8.5S10.5 4 8 4a2.2 2.2 0 0 0 0 4.5zM12 8.5S13.5 4 16 4a2.2 2.2 0 0 1 0 4.5z" />
      </svg>
    );
  }
  return (
    <svg {...comum}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.8 20.2a7.4 7.4 0 0 1 14.4 0" />
    </svg>
  );
}

/**
 * A folga que o conteúdo reserva para não terminar debaixo da barra.
 * Só no celular: na tela grande a barra não existe, e a folga seria um
 * vazio no fim de toda página.
 */
export const ESPACO_DA_BARRA = "cel:pb-[calc(64px+env(safe-area-inset-bottom))]";

export function BarraInferior() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 hidden cel:flex"
      style={{
        background: "rgba(0,0,0,.92)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        borderTop: "1px solid rgba(255,255,255,.08)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {ABAS.map((a) => (
        <NavLink
          key={a.chave}
          to={a.para}
          className="flex flex-1 flex-col items-center justify-center gap-[5px] pb-[9px] pt-[10px] no-underline"
        >
          {({ isActive }) => (
            <>
              <Icone nome={a.chave} cor={isActive ? BRANCO : APAGADO} />
              <span
                className="text-[10.5px]"
                style={{ color: isActive ? BRANCO : APAGADO, fontWeight: isActive ? 600 : 400 }}
              >
                {a.rotulo}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
