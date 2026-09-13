import { NavLink, useNavigate } from "react-router-dom";

/*
 * Aba de texto, não pílula contornada.
 *
 * Quatro cápsulas com borda lado a lado é desenho de site, não de
 * aplicativo — e é o que mais entregava amadorismo no alto da tela.
 * Aqui a aba é só a palavra: apagada quando não está na tela atual,
 * branca e sublinhada quando está. É o que Netflix, Apple TV e Spotify
 * fazem, pela mesma razão: a navegação não deve competir com o conteúdo.
 */
const PILULA: React.CSSProperties = {
  minHeight: 40,
  padding: "0 2px",
  fontSize: 15,
  color: "rgba(255,255,255,.5)",
  background: "transparent",
  border: "none",
  borderBottom: "2px solid transparent",
  borderRadius: 0,
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
      className="sticky top-0 z-40 flex flex-wrap items-center gap-x-[26px] gap-y-[18px] px-7 pb-4 cel-sm:px-4 cel-sm:gap-y-3"
      style={{
        // Instalado no celular, a página começa atrás do relógio e da
        // bateria — é o `viewport-fit=cover` do index.html. Reservar a
        // faixa aqui devolve o topo ao aparelho. No navegador comum a
        // medida é zero e nada muda.
        paddingTop: "calc(16px + env(safe-area-inset-top))",
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
        <span className="text-[11px] uppercase tracking-[.28em] text-[rgba(255,255,255,.4)] cel:text-[9px] cel:tracking-[.22em]">
          Bênçãos Ilimitadas
        </span>
      </button>

      <nav className="sem-barra ml-auto flex gap-[26px] cel:ml-0 cel:flex-[1_1_100%] cel:justify-center cel:gap-[22px] cel:overflow-x-auto cel:py-[2px]">
        {ABAS.map((aba) => (
          <NavLink
            key={aba.para}
            to={aba.para}
            style={({ isActive }) => ({
              ...PILULA,
              ...(isActive
                ? { color: "#ffffff", fontWeight: 600, borderBottomColor: "#ffffff" }
                : null),
            })}
            className="shrink-0 hover:!text-white"
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
