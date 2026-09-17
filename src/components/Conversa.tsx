import { useState, type FormEvent } from "react";
import type { ComentarioPublico } from "@/data/api";

/**
 * A conversa de uma aula: comentários e as respostas embaixo deles.
 *
 * Um nível, e o banco é quem garante — a resposta não entra se o alvo
 * já for uma resposta. Aqui a regra é só desenho: é por isso que não
 * existe botão "Responder" dentro de uma resposta.
 *
 * O recuo é o que diz que isto responde aquilo. Um nível só porque no
 * celular cada nível come largura, e a partir do terceiro o texto vira
 * uma coluna estreita encostada na borda.
 *
 * Quem é dono do texto escrito é este componente, e não a tela da aula.
 * A caixa aberta e o rascunho não interessam a mais ninguém, e deixá-los
 * aqui é o que permite medir esta conversa sozinha, sem montar a aula
 * inteira em volta.
 */

/** O preto e branco desta tela: uma linha e um cinza, e nada mais. */
const LINHA = "rgba(255,255,255,.4)";
const SUAVE = "rgba(255,255,255,.62)";

export type Conversas = { pai: ComentarioPublico; respostas: ComentarioPublico[] }[];

/**
 * Uma linha de comentário: quem escreveu, e o que escreveu.
 *
 * Três casos no nome, e o terceiro é o que importa: nulo quer dizer
 * comentário escrito quando o aplicativo ainda prometia anonimato.
 * Esses continuam anônimos para sempre — a promessa valia na hora em
 * que foi feita.
 *
 * O selo de Instrutor não é decidido aqui. A tela não teria como: o
 * papel das outras pessoas não é legível pelo navegador. Ele vem
 * calculado pelo banco, junto com o comentário.
 */
function LinhaComentario({ c }: { c: ComentarioPublico }) {
  return (
    <>
      <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-apoio font-bold text-white">
        <span>{c.minha ? "Você" : (c.autoraNome ?? "Anônimo")}</span>
        {c.ehInstrutor ? (
          <span
            className="rounded-mini px-2 py-[3px] text-rotulo font-bold uppercase tracking-rotulo"
            style={{ border: `1px solid ${LINHA}` }}
          >
            Instrutor
          </span>
        ) : null}
      </p>
      <p className="mb-0 mt-2 text-corpo text-white/85">{c.texto}</p>
    </>
  );
}

export function Conversa({
  conversas,
  aoResponder,
}: {
  conversas: Conversas;
  /** Devolve `false` quando não deu para publicar — e aí nada se perde. */
  aoResponder: (paiId: string, texto: string) => Promise<boolean>;
}) {
  /*
   * Uma caixa de cada vez, de propósito. Deixar várias abertas espalha
   * rascunhos pela página e a aluna perde de vista onde estava
   * escrevendo — abrir uma fecha a outra, e o texto não fica pendurado
   * numa caixa que saiu da tela.
   */
  const [respondendo, setRespondendo] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState("");

  function fechar() {
    setRespondendo(null);
    setRascunho("");
  }

  async function enviar(e: FormEvent, pai: string) {
    e.preventDefault();
    const texto = rascunho.trim();
    if (!texto) return;
    fechar();
    if (!(await aoResponder(pai, texto))) {
      // Falhando, a caixa volta a abrir no mesmo comentário e com o
      // mesmo texto: o que ela escreveu não se perde por causa de uma
      // conexão ruim.
      setRespondendo(pai);
      setRascunho(texto);
    }
  }

  return (
    <div className="mt-2 flex flex-col">
      {conversas.map(({ pai, respostas }) => (
        <div
          key={pai.id}
          className="py-4"
          style={{ borderTop: "1px solid rgba(255,255,255,.08)" }}
        >
          <LinhaComentario c={pai} />

          {respostas.length > 0 ? (
            <div
              className="mt-4 flex flex-col gap-4 pl-4"
              style={{ borderLeft: "1px solid rgba(255,255,255,.14)" }}
            >
              {respostas.map((r) => (
                <div key={r.id}>
                  <LinhaComentario c={r} />
                </div>
              ))}
            </div>
          ) : null}

          {respondendo === pai.id ? (
            <form
              onSubmit={(e) => void enviar(e, pai.id)}
              className="mt-4 flex flex-wrap items-center gap-2 pl-4"
            >
              <input
                type="text"
                autoFocus
                value={rascunho}
                onChange={(e) => setRascunho(e.target.value)}
                placeholder={`Responder a ${pai.minha ? "você" : (pai.autoraNome ?? "Anônimo")}`}
                aria-label="Escrever resposta"
                className="min-h-[46px] w-full flex-1 rounded-botao px-4 text-corpo text-white"
                style={{ background: "transparent", border: `1px solid ${LINHA}` }}
              />
              {rascunho.trim() ? (
                <button
                  type="submit"
                  className="min-h-[46px] flex-none rounded-botao border-none px-4 text-corpo font-semibold hover:opacity-90"
                  style={{ color: "#000000", background: "#ffffff", cursor: "pointer" }}
                >
                  Responder
                </button>
              ) : null}
              <button
                type="button"
                onClick={fechar}
                className="min-h-[46px] flex-none border-none bg-transparent px-2 text-apoio underline underline-offset-4 hover:opacity-80"
                style={{ color: SUAVE, cursor: "pointer" }}
              >
                Cancelar
              </button>
            </form>
          ) : (
            <button
              onClick={() => {
                setRespondendo(pai.id);
                setRascunho("");
              }}
              className="mt-3 min-h-[44px] border-none bg-transparent pr-3 text-apoio font-semibold hover:opacity-80"
              style={{ color: SUAVE, cursor: "pointer" }}
            >
              Responder
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
