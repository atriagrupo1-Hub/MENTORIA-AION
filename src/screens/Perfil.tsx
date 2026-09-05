import { useNavigate } from "react-router-dom";
import { useEstado } from "@/data/estado";
import { useJornada } from "@/data/useJornada";
import { paleta } from "@/design/tokens";

export function Perfil() {
  const { aluna, sair } = useEstado();
  const { percentualGeral, totalConcluidas, totalAulas, liberados, modulos, moduloAtual } =
    useJornada();
  const navegar = useNavigate();

  const cor = paleta(moduloAtual?.numero ?? 0);
  const cartao: React.CSSProperties = {
    background: `linear-gradient(165deg, rgba(${cor.rgb},.14), rgba(6,9,18,.94) 68%)`,
    border: `1px solid rgba(${cor.rgb},.3)`,
  };

  const estatisticas = [
    { rotulo: "Progresso geral", valor: `${percentualGeral}%`, destaque: true },
    {
      rotulo: "Aulas concluídas",
      valor: `${totalConcluidas}`,
      complemento: `de ${totalAulas}`,
    },
    {
      rotulo: "Módulo atual",
      texto: `Módulo ${moduloAtual?.numero ?? 0} — ${moduloAtual?.titulo ?? ""}`,
    },
    {
      rotulo: "Módulos liberados",
      valor: `${liberados}`,
      complemento: `de ${modulos.length}`,
    },
  ];

  return (
    <main className="rise-in mx-auto max-w-[1360px] px-7 pb-[90px] pt-[22px] cel-sm:px-[18px]">
      <p className="mb-[10px] mt-0 text-[13px] uppercase tracking-[.3em] text-[#a58a52]">
        Sua jornada
      </p>
      <h1
        className="m-0 font-titulo font-semibold leading-[1.12] text-marfim"
        style={{ fontSize: "clamp(31px, 8vw, 52px)" }}
      >
        Bem-vinda, {aluna?.nome ?? "Aluna"}.
      </h1>
      <p
        className="mb-0 mt-4 max-w-[720px] leading-[1.55] text-[#cbbfae]"
        style={{ fontSize: "clamp(18px, 4.6vw, 22px)" }}
      >
        Continue avançando no seu Caminho do Desbloqueio.
      </p>
      <p className="mb-0 mt-3 max-w-[640px] text-[18px] leading-[1.6] text-terciario">
        Cada aula representa um passo consciente na construção da sua nova vida.
      </p>

      <section className="mt-11 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        {estatisticas.map((item) => (
          <div key={item.rotulo} className="rounded-cartao p-5" style={cartao}>
            <p
              className="mb-2 mt-0 text-[12px] uppercase tracking-[.16em]"
              style={{ color: cor.destaque }}
            >
              {item.rotulo}
            </p>
            {item.texto ? (
              <p className="m-0 text-[16px] leading-[1.45] text-marfim">{item.texto}</p>
            ) : (
              <p
                className="m-0 font-titulo text-[32px]"
                style={{ color: item.destaque ? cor.destaque : "#f6efe3" }}
              >
                {item.valor}
                {item.complemento ? (
                  <span className="text-[18px] text-terciario"> {item.complemento}</span>
                ) : null}
              </p>
            )}
          </div>
        ))}
      </section>

      <section className="mt-[34px] flex flex-wrap gap-3">
        <button
          onClick={() => {
            sair();
            navegar("/");
          }}
          className="min-h-[56px] flex-[1_1_220px] rounded-botao bg-transparent px-5 py-4 text-[15px] font-bold transition-colors hover:text-white"
          style={{
            color: "#f4e0b0",
            border: "1px solid rgba(212,177,112,.5)",
            cursor: "pointer",
          }}
        >
          Sair da área de membros
        </button>
      </section>
    </main>
  );
}
