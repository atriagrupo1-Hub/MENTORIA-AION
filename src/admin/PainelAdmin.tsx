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

/**
 * Senha fixa do protótipo. Em produção, conta com papel de admin —
 * a palavra sai do código e vira uma linha com `papel = 'admin'`.
 */
const SENHA_PROTOTIPO = "mentoria";
const CHAVE_SESSAO_ADMIN = "aion-admin-v1";

export function PainelAdmin() {
  const { catalogo, alunas } = useEstado();
  const aviso = useAviso();
  const [autenticada, setAutenticada] = useState(() => {
    try {
      return localStorage.getItem(CHAVE_SESSAO_ADMIN) === "1";
    } catch {
      return false;
    }
  });
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [abaAtiva, setAbaAtiva] = useState<"alunas" | "conteudo">("alunas");
  const [subaba, setSubaba] = useState("mentoria");
  const [pedido, setPedido] = useState<PedidoConfirmacao | null>(null);

  function entrar(e: FormEvent) {
    e.preventDefault();
    if (senha.trim() !== SENHA_PROTOTIPO) {
      setErro("Senha incorreta.");
      return;
    }
    setAutenticada(true);
    setSenha("");
    setErro("");
    try {
      localStorage.setItem(CHAVE_SESSAO_ADMIN, "1");
    } catch {
      /* ignora */
    }
  }

  function sair() {
    setAutenticada(false);
    try {
      localStorage.removeItem(CHAVE_SESSAO_ADMIN);
    } catch {
      /* ignora */
    }
  }

  const fundo =
    "linear-gradient(180deg, rgba(157,117,54,.28) 0px, rgba(157,117,54,.08) 220px, rgba(5,7,15,0) 420px) no-repeat, #05070f";

  if (!autenticada) {
    return (
      <div className="min-h-screen" style={{ background: fundo }}>
        <div className="flex min-h-screen items-center justify-center px-[18px] py-8">
          <form
            onSubmit={entrar}
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

            <label
              htmlFor="admin-senha"
              className="mb-2 block text-[12px] font-bold text-[rgba(243,236,225,.75)]"
            >
              Senha de administradora
            </label>
            <input
              id="admin-senha"
              type="password"
              value={senha}
              onChange={(e) => {
                setSenha(e.target.value);
                setErro("");
              }}
              placeholder="Digite a senha"
              style={{ ...campo, height: 54, width: "100%", borderRadius: 12 }}
            />

            {erro ? (
              <p className="mb-0 mt-3 text-[14px]" style={{ color: "#e6b8a0" }}>
                {erro}
              </p>
            ) : null}

            <button
              type="submit"
              className="mt-5 min-h-[54px] w-full rounded-pilula border-none text-[16px] font-bold hover:opacity-90"
              style={{
                color: cores.ouroTexto,
                background: cores.botaoOuro,
                cursor: "pointer",
              }}
            >
              Entrar no painel
            </button>
          </form>
        </div>
      </div>
    );
  }

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
    <div className="min-h-screen" style={{ background: fundo }}>
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
            {abaAtiva === "conteudo" ? resumoConteudo : resumoAlunas}
          </span>
          <button
            onClick={sair}
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

        <div className="mb-[22px] flex gap-[10px]">
          <button onClick={() => setAbaAtiva("alunas")} style={aba(abaAtiva === "alunas")}>
            Alunas
          </button>
          <button onClick={() => setAbaAtiva("conteudo")} style={aba(abaAtiva === "conteudo")}>
            Conteúdo
          </button>
        </div>

        {abaAtiva === "alunas" ? (
          <AbaAlunas pedirConfirmacao={setPedido} avisar={aviso.mostrar} />
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
              <AbaConteudo pedirConfirmacao={setPedido} avisar={aviso.mostrar} />
            ) : (
              <AbaPresentes
                categoriaSozinha={sozinhaId}
                pedirConfirmacao={setPedido}
                avisar={aviso.mostrar}
              />
            )}
          </div>
        )}
      </div>

      {pedido ? (
        <Confirmacao pedido={pedido} aoCancelar={() => setPedido(null)} />
      ) : null}
      <Aviso mensagem={aviso.mensagem} aoFechar={aviso.limpar} duracao={3600} />
    </div>
  );
}
