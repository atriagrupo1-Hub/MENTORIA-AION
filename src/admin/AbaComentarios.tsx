import { useCallback, useEffect, useState } from "react";
import {
  comentariosParaModerar,
  moderarComentario,
  type ComentarioParaModerar,
} from "./dados";
import type { PedidoConfirmacao } from "./Confirmacao";
import { botaoNeutro, botaoRemover, aba, etiqueta, painel as tema, cartao, rotulo } from "./estilos";

/**
 * Moderação dos comentários.
 *
 * A tela que faltava. As funções no banco existiam desde o primeiro dia
 * — `comentarios_para_moderacao()` e `moderar_comentario()` — mas não
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
 * A autoria aparece aqui e em nenhum outro lugar. A coluna `autora_id`
 * não é concedida ao navegador; quem a lê é a função no banco, que
 * confere o papel `admin` lá dentro. Pela tela da aluna, o comentário de
 * uma colega continua sem dono.
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
  pedirConfirmacao,
  avisar,
}: {
  pedirConfirmacao: (p: PedidoConfirmacao) => void;
  avisar: (m: string) => void;
}) {
  const [lista, setLista] = useState<ComentarioParaModerar[] | null>(null);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState<"todos" | ComentarioParaModerar["status"]>("publicado");

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
    (lista ?? []).filter((c) => c.respostaA === id && c.status === "publicado").length;

  const quantasRespostas = (n: number) =>
    n === 1 ? "1 resposta" : `${n} respostas`;

  async function mudar(c: ComentarioParaModerar, status: ComentarioParaModerar["status"]) {
    const penduradas = c.respostaA ? 0 : respostasDe(c.id);
    try {
      await moderarComentario(c.id, status);
      // Muda na lista sem recarregar tudo: a administradora costuma
      // moderar vários seguidos, e recarregar a cada um faria a lista
      // saltar debaixo do cursor.
      setLista((atual) =>
        (atual ?? []).map((x) => (x.id === c.id ? { ...x, status } : x)),
      );
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

  const visiveis = (lista ?? []).filter((c) => filtro === "todos" || c.status === filtro);
  const contar = (s: ComentarioParaModerar["status"]) =>
    (lista ?? []).filter((c) => c.status === s).length;

  const FILTROS = [
    { chave: "publicado" as const, nome: `No ar (${contar("publicado")})` },
    { chave: "oculto" as const, nome: `Ocultos (${contar("oculto")})` },
    { chave: "removido" as const, nome: `Removidos (${contar("removido")})` },
    { chave: "todos" as const, nome: "Todos" },
  ];

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
      ) : visiveis.length === 0 ? (
        <p className="text-[14px]" style={{ color: tema.textoSecundario }}>
          {filtro === "publicado"
            ? "Nenhum comentário no ar."
            : "Nada aqui."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {visiveis.map((c) => (
            <div key={c.id} className="p-4" style={cartao}>
              <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="text-[15px] font-semibold" style={{ color: tema.texto }}>
                  {c.autoraNome}
                </span>
                {c.ehInstrutor ? <span style={etiqueta(tema.textoSecundario)}>instrutor</span> : null}
                {c.respostaA ? (
                  <span className="text-[13px]" style={{ color: tema.textoTerciario }}>
                    ↳ resposta
                  </span>
                ) : null}
                <span style={rotulo}>
                  Módulo {c.moduloNumero} · Aula {c.aulaNumero}
                </span>
                <span className="text-[13px]" style={{ color: tema.textoTerciario }}>
                  {quando(c.criadoEm)}
                </span>
                <span className="ml-auto" style={etiqueta(COR[c.status])}>
                  {ROTULO[c.status]}
                </span>
              </div>

              <p
                className="m-0 whitespace-pre-wrap text-[14px] leading-[1.6]"
                style={{ color: tema.texto }}
              >
                {c.texto}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {c.status === "publicado" ? (
                  <button onClick={() => void mudar(c, "oculto")} style={botaoNeutro}>
                    Ocultar das alunas
                  </button>
                ) : (
                  <button onClick={() => void mudar(c, "publicado")} style={botaoNeutro}>
                    Devolver ao ar
                  </button>
                )}

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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
