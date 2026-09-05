import { NavLink, useNavigate } from "react-router-dom";

const PILULA: React.CSSProperties = {
  minHeight: 44,
  padding: "0 20px",
  fontSize: 15,
  color: "#ffffff",
  background: "rgba(255,255,255,.1)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,.4)",
  borderRadius: 99,
  cursor: "pointer",
  whiteSpace: "nowrap",
  display: "flex",
  alignItems: "center",
};

const ABAS = [
  { rotulo: "Início", para: "/inicio" },
  { rotulo: "Módulos", para: "/modulos" },
  { rotulo: "Presentes", para: "/presentes" },
  { rotulo: "Perfil", para: "/perfil" },
];

/**
 * Cabeçalho fixo sobre o degradê do módulo. Some por completo na tela
 * da aula. O ícone de alternar celular/computador do protótipo não vem
 * para produção (item 11 do README).
 */
export function Cabecalho({ percentualGeral }: { percentualGeral: number }) {
  const navegar = useNavigate();

  return (
    <header
      className="sticky top-0 z-40 flex flex-wrap items-center gap-x-[26px] gap-y-[18px] px-7 py-4 cel-sm:px-4 cel-sm:gap-y-3"
      style={{
        background: "transparent",
        backdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(255,255,255,.08)",
      }}
    >
      <button
        onClick={() => navegar("/inicio")}
        className="flex flex-col gap-1 border-none bg-transparent p-0 text-left cel:flex-[1_1_100%] cel:items-center cel:text-center"
      >
        <span className="font-titulo text-[23px] font-semibold text-marfim cel:text-[17px]">
          Caminho do Desbloqueio
        </span>
        <span className="text-[11px] uppercase tracking-[.28em] text-[#a58a52] cel:text-[9px] cel:tracking-[.22em]">
          Bênçãos Ilimitadas
        </span>
      </button>

      <nav className="sem-barra ml-auto flex gap-[10px] cel:ml-0 cel:flex-[1_1_100%] cel:justify-center cel:gap-2 cel:overflow-x-auto cel:py-[2px]">
        {ABAS.map((aba) => (
          <NavLink
            key={aba.para}
            to={aba.para}
            style={({ isActive }) => ({
              ...PILULA,
              ...(isActive
                ? {
                    background: "rgba(255,255,255,.18)",
                    borderColor: "rgba(255,255,255,.75)",
                    boxShadow:
                      "inset 0 -14px 26px -14px rgba(255,226,160,.4), 0 18px 36px -20px rgba(200,155,70,.6)",
                  }
                : null),
            })}
            className="shrink-0 hover:!bg-white/[.18]"
          >
            {aba.rotulo}
          </NavLink>
        ))}
      </nav>

      <div className="flex min-w-[190px] items-center gap-3 cel:hidden">
        <div className="min-w-[110px] flex-1">
          <div className="mb-[6px] flex justify-between text-[13px] text-[#a89f92]">
            <span>Seu progresso</span>
            <span className="text-ouro-medio">{percentualGeral}%</span>
          </div>
          <div
            className="h-[6px] overflow-hidden rounded-pilula"
            style={{ background: "rgba(243,236,225,.12)" }}
          >
            <div
              className="h-full rounded-pilula"
              style={{
                background: "linear-gradient(90deg, #b8934f, #f0dca8)",
                width: `${percentualGeral}%`,
                transition: "width .9s cubic-bezier(.22,.61,.36,1)",
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
