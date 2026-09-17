import { useState, type FormEvent } from "react";
import { Aviso } from "@/components/Aviso";
import { useAviso } from "@/components/useAviso";
import { useEstado } from "@/data/estado";
import { AbaAlunas } from "./AbaAlunas";
import { AbaComentarios } from "./AbaComentarios";
import { AbaConteudo } from "./AbaConteudo";
import { AbaEquipe } from "./AbaEquipe";
import { AbaPresentes } from "./AbaPresentes";
import { ehAdmin as podeTudo, ehDono, ehEquipe, NOME_DO_PAPEL } from "./papeis";
import { Confirmacao, type PedidoConfirmacao } from "./Confirmacao";
import { aba, botaoNeutro, botaoOuro, campo, painel as tema } from "./estilos";
import { usePainel } from "./usePainel";

const FUNDO = tema.fundo;

/** A marca, em branco, uma vez por tela. */
function Marca({ altura = 38 }: { altura?: number }) {
  return <img src="/marca-painel.png" alt="AIÓN" height={altura} style={{ height: altura }} />;
}

/**
 * Painel administrativo.
 *
 * A senha `mentoria` do protótipo não existe mais. Quem entra aqui entra
 * com o mesmo nome e código de qualquer aluna; o que abre o painel é o
 * papel no banco, conferido pelo Supabase. Um token de aluna não passa —
 * e mesmo que a tela fosse burlada, a RLS recusaria cada escrita.
 *
 * São três papéis de equipe, e o que muda entre eles é quanto do painel
 * aparece. O suporte vê Alunas e Comentários; o administrador vê tudo;
 * só o dono age na aba da equipe. A tela esconde o que a pessoa não
 * pode fazer — e o banco recusa mesmo assim, porque esconder botão não
 * é permissão.
 */
export function PainelAdmin() {
  const { aluna, entrar, sair, carregando: carregandoSessao } = useEstado();
  const daEquipe = ehEquipe(aluna?.papel);

  if (carregandoSessao) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: FUNDO }}>
        <p className="m-0 text-[14px]" style={{ color: tema.textoSecundario }}>
          Carregando…
        </p>
      </div>
    );
  }

  if (!daEquipe) {
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
          className="entra w-full max-w-[380px] px-7 py-8"
          style={{
            background: tema.superficie,
            border: `1px solid ${tema.linhaSuave}`,
            borderRadius: 12,
          }}
        >
          <div className="mb-6 flex flex-col items-center gap-4">
            <Marca altura={80} />
            <p
              className="m-0 text-[10px] uppercase"
              style={{ letterSpacing: ".22em", color: tema.textoTerciario }}
            >
              Painel administrativo
            </p>
          </div>

          {logada ? (
            <>
              <p
                className="mb-5 mt-0 text-center text-[14px]"
                style={{ color: tema.perigo }}
              >
                Esta conta não tem acesso ao painel.
              </p>
              <button
                type="button"
                onClick={() => void sair()}
                style={{ ...botaoOuro, minHeight: 48, width: "100%", fontSize: 15 }}
              >
                Sair e entrar com outra conta
              </button>
            </>
          ) : (
            <>
              <label
                htmlFor="admin-login"
                className="mb-2 block text-[10px] uppercase"
                style={{ letterSpacing: ".16em", color: tema.textoTerciario }}
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
                style={{ ...campo, height: 48, width: "100%" }}
              />
              {/*
                Aqui vai o LOGIN, não o e-mail. `verificar_codigo()`
                procura `profiles.login` e nada mais — o e-mail existe
                em `auth.users` só porque o Auth exige um por conta.
                Quem digita o e-mail recebe "Não encontramos este
                acesso", que é verdade e não ajuda em nada.

                O placeholder já traz a resposta, mas some no instante
                em que se digita por cima — justamente quando ela faria
                falta. Isto é aviso, não trava: o botão continua ativo.
              */}
              {login.includes("@") ? (
                <p
                  className="mb-0 mt-2 text-[13px] leading-[1.5]"
                  style={{ color: tema.textoSecundario }}
                >
                  Aqui vai o seu nome de acesso (por exemplo:{" "}
                  <strong style={{ color: tema.texto }}>admin</strong>), não o e-mail.
                </p>
              ) : null}

              <label
                htmlFor="admin-codigo"
                className="mb-2 mt-5 block text-[10px] uppercase"
                style={{ letterSpacing: ".16em", color: tema.textoTerciario }}
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
                style={{ ...campo, height: 48, width: "100%" }}
              />

              {erro ? (
                <p className="mb-0 mt-3 text-[13px]" style={{ color: tema.perigo }}>
                  {erro}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={entrando}
                className="mt-6 hover:opacity-90"
                style={{
                  ...botaoOuro,
                  minHeight: 48,
                  width: "100%",
                  fontSize: 15,
                  cursor: entrando ? "wait" : "pointer",
                  opacity: entrando ? 0.6 : 1,
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

type Chave = "alunas" | "conteudo" | "comentarios" | "equipe";

const TITULO: Record<Chave, string> = {
  alunas: "Alunas da mentoria",
  conteudo: "Conteúdo da mentoria",
  comentarios: "Comentários das alunas",
  equipe: "Quem trabalha no painel",
};

function PainelLogado() {
  const { aluna, sair } = useEstado();
  const painel = usePainel();
  const aviso = useAviso();
  const [abaAtiva, setAbaAtiva] = useState<Chave>("alunas");
  const [subaba, setSubaba] = useState("mentoria");
  const [pedido, setPedido] = useState<PedidoConfirmacao | null>(null);

  const papel = aluna?.papel;
  const meuNome = aluna?.nome ?? "";

  /*
   * As abas que esta pessoa vê.
   *
   * O suporte fica com duas: as alunas e os comentários. Não é
   * economia de tela — é o que ele pode fazer. Mostrar "Conteúdo"
   * para quem o banco vai recusar a cada clique seria pior que não
   * mostrar.
   */
  const ABAS: Array<{ chave: Chave; nome: string }> = [
    { chave: "alunas", nome: "Alunas" },
    ...(podeTudo(papel) ? [{ chave: "conteudo" as const, nome: "Conteúdo" }] : []),
    { chave: "comentarios", nome: "Comentários" },
    ...(podeTudo(papel) ? [{ chave: "equipe" as const, nome: "Equipe" }] : []),
  ];

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
      {/* Barra da marca. Fica separada do conteúdo por uma linha só. */}
      <div style={{ borderBottom: `1px solid ${tema.linhaSuave}` }}>
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-4 px-6 py-4">
          <Marca altura={38} />
          <span
            className="text-[10px] uppercase"
            style={{ letterSpacing: ".2em", color: tema.textoTerciario }}
          >
            Painel administrativo
          </span>
          <span className="flex-1" />
          {/*
            Quem está usando, e com que papel. Numa equipe que divide o
            mesmo painel, é a diferença entre "isto não funciona" e
            "isto não é meu para fazer".
          */}
          {papel && papel !== "aluna" ? (
            <span className="text-[11px]" style={{ color: tema.textoSecundario }}>
              {meuNome} · {NOME_DO_PAPEL[papel]}
            </span>
          ) : null}
          <span className="text-[11px]" style={{ color: tema.textoTerciario }}>
            versão {__VERSAO__}
          </span>
          <button onClick={() => void sair()} style={botaoNeutro}>
            Sair
          </button>
        </div>
      </div>

      <div className="entra mx-auto max-w-[1180px] px-6 pb-[90px] pt-9">
        <header className="mb-7 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="m-0 text-[27px] font-semibold" style={{ color: tema.texto }}>
            {TITULO[abaAtiva]}
          </h1>
          <span className="text-[14px]" style={{ color: tema.textoSecundario }}>
            {abaAtiva === "equipe"
              ? ehDono(papel)
                ? "Você decide quem entra e quem sai"
                : "Quem tem acesso a este painel"
              : abaAtiva === "comentarios"
                ? "O que elas escreveram nas aulas — e onde você responde"
                : carregando
                  ? "Carregando…"
                  : abaAtiva === "conteudo"
                    ? resumoConteudo
                    : resumoAlunas}
          </span>
        </header>

        {erro ? (
          <p
            className="mb-5 p-4 text-[14px]"
            style={{
              color: tema.perigo,
              background: tema.perigoFundo,
              border: `1px solid ${tema.perigoLinha}`,
              borderRadius: 8,
            }}
          >
            {erro}
          </p>
        ) : null}

        {/*
          `flex-wrap` não é enfeite: era a única fila do painel sem ele.
          As quatro abas somam ~350px e a largura útil do celular é 342px
          — e `index.css` tem `overflow-x: clip`, então o que passa é
          CORTADO, não rolável. A aba Equipe simplesmente não existia em
          tela pequena.
        */}
        <div
          className="mb-7 flex flex-wrap"
          style={{ borderBottom: `1px solid ${tema.linhaSuave}` }}
        >
          {ABAS.map((a) => (
            <button key={a.chave} onClick={() => setAbaAtiva(a.chave)} style={aba(abaAtiva === a.chave)}>
              {a.nome}
            </button>
          ))}
        </div>

        {abaAtiva === "comentarios" ? (
          <AbaComentarios
            meuNome={meuNome}
            pedirConfirmacao={setPedido}
            avisar={aviso.mostrar}
          />
        ) : abaAtiva === "equipe" ? (
          <AbaEquipe meuPapel={papel} pedirConfirmacao={setPedido} avisar={aviso.mostrar} />
        ) : abaAtiva === "alunas" ? (
          <AbaAlunas
            painel={painel}
            meuPapel={papel}
            pedirConfirmacao={setPedido}
            avisar={aviso.mostrar}
          />
        ) : (
          <div>
            <div
              className="mb-5 flex flex-wrap"
              style={{ borderBottom: `1px solid ${tema.linhaSuave}` }}
            >
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
