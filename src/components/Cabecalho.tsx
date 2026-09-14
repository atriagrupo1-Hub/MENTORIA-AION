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
 *
 * `soComputador` some com ele também no celular. É o que a página do
 * módulo pede: lá a capa começa colada no alto da tela, e um cabeçalho
 * empurrando a arte para baixo desfaz justamente o efeito. No celular a
 * navegação está no rodapé, então nada se perde.
 */
export function Cabecalho({
  percentualGeral,
  soComputador = false,
}: {
  percentualGeral: number;
  soComputador?: boolean;
}) {
  const navegar = useNavigate();

  return (
    <header
      className={`sticky top-0 z-40 flex flex-wrap items-center gap-x-[26px] gap-y-[18px] px-7 pb-4 cel-sm:px-4 cel-sm:gap-y-3 ${
        soComputador ? "cel:hidden" : ""
      }`}
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
        style={{ cursor: "pointer" }}
      >
        <span className="font-titulo text-titulo font-semibold text-marfim cel:text-realce">
          Caminho do Desbloqueio
        </span>
        <span className="text-rotulo uppercase tracking-marca text-[rgba(255,255,255,.4)]">
          Bênçãos Ilimitadas
        </span>
      </button>

      {/* No celular a navegação está no rodapé; aqui ela só existe na tela grande. */}
      <nav className="sem-barra ml-auto flex gap-[26px] cel:hidden">
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
          <div className="mb-[6px] flex justify-between text-apoio text-[#a89f92]">
            <span>Seu progresso</span>
            <span style={{ color: "#ffffff" }}>{percentualGeral}%</span>
          </div>
          <div
            className="h-[6px] overflow-hidden rounded-pilula"
            style={{ background: "rgba(243,236,225,.12)" }}
          >
            <div
              className="h-full rounded-pilula"
              style={{
                background: "#ffffff",
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
