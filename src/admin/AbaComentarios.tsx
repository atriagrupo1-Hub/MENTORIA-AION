import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  comentariosParaModerar,
  moderarComentario,
  responderComentario,
  type ComentarioParaModerar,
} from "./dados";
import type { PedidoConfirmacao } from "./Confirmacao";
import {
  botaoNeutro,
  botaoNeutroGrande,
  botaoOuro,
  botaoRemover,
  aba,
  campo,
  etiqueta,
  painel as tema,
  cartao,
  rotulo,
} from "./estilos";

/**
 * Moderação e resposta dos comentários.
 *
 * As funções no banco existiam desde o primeiro dia —
 * `comentarios_para_moderacao()` e `moderar_comentario()` — mas não
 * havia por onde chamá-las: para tirar um comentário do ar era preciso
 * abrir o Supabase e escrever SQL. No dia em que alguém escrever o que
 * não devia, isso não é uma opção.
 *
 * Três estados, e nenhum deles apaga a linha:
 *
 *   publicado — a aluna vê.
 *   oculto    — some da vista dela; volta a qualquer momento.
 *   removido  — some também, e é o registro de que foi retirado.
 *
 * O item (I) do modelo pede histórico preservado, e é por isso que nem
 * "removido" apaga: quem moderou e quando ficam gravados, e é o que
 * permite desfazer um engano — e responder "quem tirou isso do ar?".
 *
 * Responder também mora aqui, e não na tela da aula. A pergunta da
 * aluna chega nesta lista; ir procurar de que aula ela era, abrir a
 * aula pela área de aluna e achar o comentário de novo é o caminho que
 * faz a resposta não acontecer.
 *
 * A resposta sai sempre assinada com o nome real de quem a escreveu —
 * `nome_visivel` entra como verdadeiro, e a coluna não é alcançável
 * daqui de outro jeito. Não há resposta anônima da equipe, de
 * propósito: uma resposta sem nome é pior que nenhuma.
 *
 * A autoria dos comentários aparece aqui e em nenhum outro lugar. A
 * coluna `autora_id` não é concedida ao navegador; quem a lê é a função
 * no banco, que confere o papel lá dentro. Pela tela da aluna, o
 * comentário de uma colega continua sem dono.
 */

const ROTULO: Record<ComentarioParaModerar["status"], string> = {
  publicado: "no ar",
  oculto: "oculto",
  removido: "removido",
};

const COR: Record<ComentarioParaModerar["status"], string> = {
  publicado: tema.textoSecundario,
  oculto: tema.textoTerciario,
  removido: tema.perigo,
};

/** Data por extenso, curta. "14 set, 15:32". */
function quando(iso: string): string {
  const d = new Date(iso);
  return d
    .toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(".", "");
}

export function AbaComentarios({
  meuNome,
  pedirConfirmacao,
  avisar,
}: {
  /** O nome real de quem está logada. É com ele que a resposta sai. */
  meuNome: string;
  pedirConfirmacao: (p: PedidoConfirmacao) => void;
  avisar: (m: string) => void;
}) {
  const [lista, setLista] = useState<ComentarioParaModerar[] | null>(null);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState<"todos" | ComentarioParaModerar["status"]>("publicado");
  const [respondendo, setRespondendo] = useState("");

  const carregar = useCallback(async () => {
    try {
      setErro("");
      setLista(await comentariosParaModerar());
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível carregar.");
      setLista([]);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const todos = lista ?? [];

  /*
   * Quantas respostas caem junto.
   *
   * A leitura das alunas esconde a resposta cuja raiz saiu do ar —
   * senão metade da conversa ficaria pendurada, sem o que ela
   * respondia. O efeito é real e invisível daqui: ocultar um
   * comentário some com as respostas dele também. Esta tela precisa
   * dizer isso antes, não depois.
   */
  const respostasDe = (id: string) =>
    todos.filter((c) => c.respostaA === id && c.status === "publicado").length;

  const quantasRespostas = (n: number) => (n === 1 ? "1 resposta" : `${n} respostas`);

  async function mudar(c: ComentarioParaModerar, status: ComentarioParaModerar["status"]) {
    const penduradas = c.respostaA ? 0 : respostasDe(c.id);
    try {
      await moderarComentario(c.id, status);
      // Muda na lista sem recarregar tudo: quem modera costuma moderar
      // vários seguidos, e recarregar a cada um faria a lista saltar
      // debaixo do cursor.
      setLista((atual) => (atual ?? []).map((x) => (x.id === c.id ? { ...x, status } : x)));
      const junto =
        penduradas > 0 && status !== "publicado"
          ? ` ${quantasRespostas(penduradas)} saíram junto.`
          : "";
      avisar(
        status === "publicado"
          ? c.respostaA
            ? "Resposta de volta ao ar."
            : "Comentário de volta ao ar."
          : status === "oculto"
            ? `Comentário oculto das alunas.${junto}`
            : `Comentário removido.${junto}`,
      );
    } catch (falha) {
      avisar(falha instanceof Error ? falha.message : "Não foi possível moderar.");
    }
  }

  async function responder(raiz: ComentarioParaModerar, texto: string): Promise<boolean> {
    try {
      await responderComentario(raiz.aulaId, raiz.id, texto);
      setRespondendo("");
      // Aqui recarrega mesmo: a linha nova tem identificador e data do
      // banco, e inventá-los aqui daria uma resposta que some no
      // próximo carregamento.
      await carregar();
      avisar(`Respondido a ${raiz.autoraNome}.`);
      return true;
    } catch (falha) {
      avisar(falha instanceof Error ? falha.message : "Não foi possível responder.");
      return false;
    }
  }

  /*
   * A lista é de conversas, não de linhas soltas.
   *
   * Antes cada resposta aparecia como um item à parte, marcado
   * "↳ resposta", longe do que respondia — e a pergunta da aluna e a
   * resposta da equipe podiam ficar a dez cartões de distância. Para
   * responder é preciso ver a conversa.
   *
   * O filtro continua valendo, mas uma raiz aparece quando ela OU
   * alguma resposta dela combina: uma resposta oculta embaixo de um
   * comentário no ar não pode sumir da vista de quem procura o que
   * está oculto.
   */
  const respostas = (id: string) =>
    todos
      .filter((c) => c.respostaA === id)
      .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));

  const raizes = todos
    .filter((c) => c.respostaA === null)
    .filter((r) => {
      if (filtro === "todos") return true;
      return r.status === filtro || respostas(r.id).some((f) => f.status === filtro);
    });

  const contar = (s: ComentarioParaModerar["status"]) =>
    todos.filter((c) => c.status === s).length;

  const FILTROS = [
    { chave: "publicado" as const, nome: `No ar (${contar("publicado")})` },
    { chave: "oculto" as const, nome: `Ocultos (${contar("oculto")})` },
    { chave: "removido" as const, nome: `Removidos (${contar("removido")})` },
    { chave: "todos" as const, nome: "Todos" },
  ];

  /** O cabeçalho de um comentário: quem, quando, de que aula, e como está. */
  const Cabecalho = ({ c }: { c: ComentarioParaModerar }) => (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="text-[15px] font-semibold" style={{ color: tema.texto }}>
        {c.autoraNome}
      </span>
      {c.ehInstrutor ? <span style={etiqueta(tema.textoSecundario)}>instrutor</span> : null}
      {c.respostaA ? null : (
        <span style={rotulo}>
          Módulo {c.moduloNumero} · Aula {c.aulaNumero}
        </span>
      )}
      <span className="text-[13px]" style={{ color: tema.textoTerciario }}>
        {quando(c.criadoEm)}
      </span>
      <span className="ml-auto" style={etiqueta(COR[c.status])}>
        {ROTULO[c.status]}
      </span>
    </div>
  );

  /** Os botões de moderação, iguais para raiz e resposta. */
  const Acoes = ({ c }: { c: ComentarioParaModerar }) => (
    <div className="mt-4 flex flex-wrap gap-2">
      {/*
        Ocultar uma raiz derruba as respostas dela em cascata — e a tela
        só contava isso DEPOIS, no aviso. A porta vizinha ("Remover")
        contava antes. Duas portas para o mesmo efeito, uma só com
        pergunta; agora as duas perguntam quando há respostas em jogo.
      */}
      {c.status === "publicado" ? (
        <button
          onClick={() => {
            const penduradas = c.respostaA ? 0 : respostasDe(c.id);
            if (penduradas === 0) {
              void mudar(c, "oculto");
              return;
            }
            pedirConfirmacao({
              tom: "normal",
              rotuloConfirmar: "Ocultar",
              titulo: `Ocultar o comentário de ${c.autoraNome}?`,
              mensagem:
                `${quantasRespostas(penduradas)} embaixo dele saem junto — sem o ` +
                "comentário, elas não teriam o que responder. Nada é apagado, e " +
                "devolver ao ar traz tudo de volta.",
              executar: () => void mudar(c, "oculto"),
            });
          }}
          style={botaoNeutro}
        >
          Ocultar das alunas
        </button>
      ) : (
        <button onClick={() => void mudar(c, "publicado")} style={botaoNeutro}>
          Devolver ao ar
        </button>
      )}

      {c.respostaA === null && c.status === "publicado" ? (
        <button
          onClick={() => setRespondendo(respondendo === c.id ? "" : c.id)}
          style={respondendo === c.id ? botaoNeutro : botaoOuro}
        >
          {respondendo === c.id ? "Fechar resposta" : "Responder"}
        </button>
      ) : null}

      {c.status === "removido" ? null : (
        <button
          onClick={() =>
            pedirConfirmacao({
              titulo: c.respostaA ? "Remover resposta" : "Remover comentário",
              mensagem:
                `${c.respostaA ? "A resposta" : "O comentário"} de ${c.autoraNome} sai do ar. ` +
                (!c.respostaA && respostasDe(c.id) > 0
                  ? `${quantasRespostas(respostasDe(c.id))} embaixo dele saem junto — sem o comentário, elas não teriam o que responder. `
                  : "") +
                "O texto continua guardado, e você pode devolvê-lo depois.",
              executar: () => void mudar(c, "removido"),
            })
          }
          style={botaoRemover}
        >
          Remover
        </button>
      )}
    </div>
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap" style={{ borderBottom: `1px solid ${tema.linhaSuave}` }}>
        {FILTROS.map((f) => (
          <button key={f.chave} onClick={() => setFiltro(f.chave)} style={aba(filtro === f.chave)}>
            {f.nome}
          </button>
        ))}
      </div>

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

      {lista === null ? (
        <p className="text-[14px]" style={{ color: tema.textoSecundario }}>
          Carregando…
        </p>
      ) : raizes.length === 0 ? (
        <p className="text-[14px]" style={{ color: tema.textoSecundario }}>
          {filtro === "publicado" ? "Nenhum comentário no ar." : "Nada aqui."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {raizes.map((r) => (
            <div key={r.id} className="p-4" style={cartao}>
              <Cabecalho c={r} />

              <p
                className="m-0 whitespace-pre-wrap text-[14px] leading-[1.6]"
                style={{ color: tema.texto }}
              >
                {r.texto}
              </p>

              <Acoes c={r} />

              {/*
                As respostas ficam recuadas e presas por uma linha à
                esquerda. É o mesmo desenho da tela da aluna — quem
                responde aqui vê a conversa do jeito que ela vai
                aparecer lá.
              */}
              {respostas(r.id).map((f) => (
                <div
                  key={f.id}
                  className="mt-4 pl-4"
                  style={{ borderLeft: `2px solid ${tema.linhaSuave}` }}
                >
                  <Cabecalho c={f} />
                  <p
                    className="m-0 whitespace-pre-wrap text-[14px] leading-[1.6]"
                    style={{ color: tema.texto }}
                  >
                    {f.texto}
                  </p>
                  <Acoes c={f} />
                </div>
              ))}

              {respondendo === r.id ? (
                <Resposta
                  meuNome={meuNome}
                  paraQuem={r.autoraNome}
                  aoEnviar={(texto) => responder(r, texto)}
                  aoCancelar={() => setRespondendo("")}
                />
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * A caixa de resposta.
 *
 * Diz com que nome a resposta vai sair antes de alguém escrever. Numa
 * equipe de três pessoas dividindo uma aba, saber depois é tarde: a
 * resposta já está no ar, assinada.
 */
function Resposta({
  meuNome,
  paraQuem,
  aoEnviar,
  aoCancelar,
}: {
  meuNome: string;
  paraQuem: string;
  aoEnviar: (texto: string) => Promise<boolean>;
  aoCancelar: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (enviando || texto.trim().length === 0) return;
    setEnviando(true);
    try {
      const deu = await aoEnviar(texto.trim());
      if (deu) setTexto("");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={enviar}
      className="mt-4 pl-4"
      style={{ borderLeft: `2px solid ${tema.linha}` }}
    >
      <p className="mb-2 mt-0 text-[13px]" style={{ color: tema.textoTerciario }}>
        Respondendo {paraQuem} como <span style={{ color: tema.texto }}>{meuNome}</span> — a aluna
        vê este nome.
      </p>

      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={3}
        autoFocus
        aria-label={`Resposta a ${paraQuem}`}
        placeholder="Escreva a resposta…"
        style={{
          ...campo,
          width: "100%",
          padding: "10px 14px",
          lineHeight: 1.6,
          resize: "vertical",
        }}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={texto.trim().length === 0 || enviando}
          style={{
            ...botaoOuro,
            opacity: texto.trim().length === 0 || enviando ? 0.4 : 1,
            cursor: texto.trim().length === 0 || enviando ? "default" : "pointer",
          }}
        >
          {enviando ? "Enviando…" : "Enviar resposta"}
        </button>
        <button type="button" onClick={aoCancelar} style={botaoNeutroGrande}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
