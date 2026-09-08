import { useState, type FormEvent } from "react";
import { Aviso } from "@/components/Aviso";
import { useAviso } from "@/components/useAviso";
import { useEstado } from "@/data/estado";
import { cores } from "@/design/tokens";
import { AbaAlunas } from "./AbaAlunas";
import { AbaConteudo } from "./AbaConteudo";
import { AbaPresentes } from "./AbaPresentes";
import { Confirmacao, type PedidoConfirmacao } from "./Confirmacao";
import { aba, campo } from "./estilos";
import { usePainel } from "./usePainel";

const FUNDO =
  "linear-gradient(180deg, rgba(157,117,54,.28) 0px, rgba(157,117,54,.08) 220px, rgba(5,7,15,0) 420px) no-repeat, #05070f";

/**
 * Painel administrativo.
 *
 * A senha `mentoria` do protótipo não existe mais. Quem entra aqui entra
 * com o mesmo nome e código de qualquer aluna; o que abre o painel é o
 * papel `admin` no banco, conferido pelo Supabase. Um token de aluna não
 * passa — e mesmo que a tela fosse burlada, a RLS recusaria cada escrita.
 */
export function PainelAdmin() {
  const { aluna, entrar, sair, carregando: carregandoSessao } = useEstado();
  const ehAdmin = aluna?.papel === "admin";

  if (carregandoSessao) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: FUNDO }}>
        <p className="m-0 text-[15px]" style={{ color: cores.textoSecundario }}>
          Carregando…
        </p>
      </div>
    );
  }

  if (!ehAdmin) {
    return <EntradaAdmin entrar={entrar} logada={Boolean(aluna)} sair={sair} />;
  }

  return <PainelLogado />;
}

function EntradaAdmin({
  entrar,
  logada,
  sair,
}: {
  entrar: (login: string, codigo: string) => Promise<string | null>;
  logada: boolean;
  sair: () => Promise<void>;
}) {
  const [login, setLogin] = useState("");
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");
  const [entrando, setEntrando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (entrando) return;
    setEntrando(true);
    setErro("");
    try {
      const falha = await entrar(login, codigo);
      if (falha) setErro(falha);
    } finally {
      setEntrando(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: FUNDO }}>
      <div className="flex min-h-screen items-center justify-center px-[18px] py-8">
        <form
          onSubmit={enviar}
          className="rise-in w-full max-w-[420px] rounded-[20px] px-6 py-7"
          style={{
            background: cores.cartaoForte,
            border: "1px solid rgba(212,177,112,.2)",
            boxShadow: "0 40px 90px -50px rgba(212,177,112,.35)",
          }}
        >
          <p className="mb-2 mt-0 text-center text-[11px] uppercase tracking-[.3em] text-marfim">
            Mentoria
          </p>
          <h1
            className="mb-1 mt-0 text-center font-titulo text-[26px] font-semibold tracking-[.08em]"
            style={{ color: cores.ouroSuave }}
          >
            PAINEL ADMINISTRATIVO
          </h1>
          <p className="mb-6 mt-0 text-center text-[14px] text-[rgba(243,236,225,.6)]">
            Acesso restrito à equipe da mentoria.
          </p>

          {logada ? (
            <>
              <p className="mb-5 mt-0 text-center text-[14px]" style={{ color: "#e6b8a0" }}>
                Esta conta não tem acesso ao painel.
              </p>
              <button
                type="button"
                onClick={() => void sair()}
                className="min-h-[54px] w-full rounded-pilula border-none text-[16px] font-bold"
                style={{
                  color: cores.ouroTexto,
                  background: cores.botaoOuro,
                  cursor: "pointer",
                }}
              >
                Sair e entrar com outra conta
              </button>
            </>
          ) : (
            <>
              <label
                htmlFor="admin-login"
                className="mb-2 block text-[12px] font-bold text-[rgba(243,236,225,.75)]"
              >
                Seu nome de acesso
              </label>
              <input
                id="admin-login"
                type="text"
                value={login}
                onChange={(e) => {
                  setLogin(e.target.value);
                  setErro("");
                }}
                autoComplete="off"
                placeholder="admin"
                style={{ ...campo, height: 54, width: "100%", borderRadius: 12 }}
              />

              <label
                htmlFor="admin-codigo"
                className="mb-2 mt-4 block text-[12px] font-bold text-[rgba(243,236,225,.75)]"
              >
                Seu código
              </label>
              <input
                id="admin-codigo"
                type="password"
                value={codigo}
                onChange={(e) => {
                  setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setErro("");
                }}
                inputMode="numeric"
                autoComplete="off"
                placeholder="••••••"
                style={{ ...campo, height: 54, width: "100%", borderRadius: 12 }}
              />

              {erro ? (
                <p className="mb-0 mt-3 text-[14px]" style={{ color: "#e6b8a0" }}>
                  {erro}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={entrando}
                className="mt-5 min-h-[54px] w-full rounded-pilula border-none text-[16px] font-bold hover:opacity-90"
                style={{
                  color: cores.ouroTexto,
                  background: cores.botaoOuro,
                  cursor: entrando ? "wait" : "pointer",
                  opacity: entrando ? 0.7 : 1,
                }}
              >
                {entrando ? "Entrando..." : "Entrar no painel"}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

function PainelLogado() {
  const { sair } = useEstado();
  const painel = usePainel();
  const aviso = useAviso();
  const [abaAtiva, setAbaAtiva] = useState<"alunas" | "conteudo">("alunas");
  const [subaba, setSubaba] = useState("mentoria");
  const [pedido, setPedido] = useState<PedidoConfirmacao | null>(null);

  const { catalogo, alunas, carregando, erro } = painel;
  const ativas = alunas.filter((a) => a.status === "ativa").length;
  const totalAulas = catalogo.modulos.reduce((s, m) => s + m.aulas.length, 0);
  const totalPresentes = catalogo.categorias.reduce((s, c) => s + c.presentes.length, 0);

  const resumoAlunas =
    alunas.length === 0
      ? "Nenhuma aluna"
      : `${alunas.length} ${alunas.length === 1 ? "aluna" : "alunas"} · ${ativas} ${
          ativas === 1 ? "ativa" : "ativas"
        }`;

  const sozinhaId = subaba.startsWith("solo:") ? subaba.slice(5) : null;

  const resumoConteudo = sozinhaId
    ? `${catalogo.categorias.find((c) => c.id === sozinhaId)?.presentes.length ?? 0} presentes`
    : subaba === "presentes"
      ? `${catalogo.categorias.length} ${
          catalogo.categorias.length === 1 ? "categoria" : "categorias"
        } · ${totalPresentes} ${totalPresentes === 1 ? "presente" : "presentes"}`
      : `${catalogo.modulos.length} ${
          catalogo.modulos.length === 1 ? "módulo" : "módulos"
        } · ${totalAulas} ${totalAulas === 1 ? "aula" : "aulas"}`;

  const subabas = [
    { nome: "Mentoria", chave: "mentoria" },
    { nome: "Presentes", chave: "presentes" },
    ...catalogo.categorias
      .filter((c) => c.destacada)
      .map((c) => ({ nome: c.titulo, chave: `solo:${c.id}` })),
  ];

  return (
    <div className="min-h-screen" style={{ background: FUNDO }}>
      <div className="rise-in-rapido mx-auto max-w-[1180px] px-5 pb-[90px] pt-[26px]">
        <header className="mb-[26px] flex flex-wrap items-center gap-3">
          <div className="flex-[1_1_240px]">
            <p className="mb-1 mt-0 text-[11px] uppercase tracking-[.28em] text-[#a58a52]">
              Painel administrativo
            </p>
            <h1
              className="m-0 font-titulo font-semibold text-marfim"
              style={{ fontSize: "clamp(24px, 5vw, 32px)" }}
            >
              {abaAtiva === "conteudo" ? "Conteúdo da mentoria" : "Alunas da mentoria"}
            </h1>
          </div>
          <span className="text-[14px] text-[rgba(243,236,225,.6)]">
            {carregando ? "Carregando…" : abaAtiva === "conteudo" ? resumoConteudo : resumoAlunas}
          </span>
          <button
            onClick={() => void sair()}
            className="min-h-[40px] rounded-pilula px-4 text-[14px] text-marfim-corpo"
            style={{
              background: "rgba(255,255,255,.06)",
              border: "1px solid rgba(255,255,255,.16)",
              cursor: "pointer",
            }}
          >
            Sair
          </button>
        </header>

        {erro ? (
          <p
            className="mb-5 rounded-botao p-4 text-[14px]"
            style={{
              color: cores.alerta,
              background: "rgba(230,168,154,.06)",
              border: "1px solid rgba(230,168,154,.3)",
            }}
          >
            {erro}
          </p>
        ) : null}

        <div className="mb-[22px] flex gap-[10px]">
          <button onClick={() => setAbaAtiva("alunas")} style={aba(abaAtiva === "alunas")}>
            Alunas
          </button>
          <button onClick={() => setAbaAtiva("conteudo")} style={aba(abaAtiva === "conteudo")}>
            Conteúdo
          </button>
        </div>

        {abaAtiva === "alunas" ? (
          <AbaAlunas painel={painel} pedirConfirmacao={setPedido} avisar={aviso.mostrar} />
        ) : (
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              {subabas.map((s) => (
                <button
                  key={s.chave}
                  onClick={() => setSubaba(s.chave)}
                  style={aba(subaba === s.chave)}
                >
                  {s.nome}
                </button>
              ))}
            </div>

            {subaba === "mentoria" ? (
              <AbaConteudo
                painel={painel}
                pedirConfirmacao={setPedido}
                avisar={aviso.mostrar}
              />
            ) : (
              <AbaPresentes
                painel={painel}
                categoriaSozinha={sozinhaId}
                pedirConfirmacao={setPedido}
                avisar={aviso.mostrar}
              />
            )}
          </div>
        )}
      </div>

      {pedido ? <Confirmacao pedido={pedido} aoCancelar={() => setPedido(null)} /> : null}
      <Aviso mensagem={aviso.mensagem} aoFechar={aviso.limpar} duracao={3600} />
    </div>
  );
}
