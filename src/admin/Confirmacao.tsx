import { useEffect, useRef, useState, type FormEvent } from "react";
import { botaoNeutro, botaoOuro, painel as tema } from "./estilos";

export type PedidoConfirmacao = {
  titulo: string;
  mensagem: string;
  executar: () => void;
  /**
   * O que este pedido faz com o dado.
   *
   * `destrutivo` (o padrão) é o que sempre foi: vermelho, e só passa
   * depois de digitar REMOVER.
   *
   * `normal` é para o que NÃO apaga nada — liberar uma aula para a
   * turma, gerar um cronograma, tirar o prazo. Antes essas ações
   * passavam pela mesma porta vermelha e pediam a palavra REMOVER,
   * o que é errado de duas maneiras: diz à pessoa que ela está
   * destruindo algo quando está criando, e — pior — ensina a digitar
   * REMOVER por reflexo, que é exatamente o que a trava existe para
   * impedir. Uma trava que se usa dez vezes por dia deixa de ser trava.
   */
  tom?: "destrutivo" | "normal";
  /** O texto do botão que confirma. Padrão conforme o tom. */
  rotuloConfirmar?: string;
};

export function Confirmacao({
  pedido,
  aoCancelar,
}: {
  pedido: PedidoConfirmacao;
  aoCancelar: () => void;
}) {
  const destrutivo = (pedido.tom ?? "destrutivo") === "destrutivo";
  const [texto, setTexto] = useState("");
  const pronto = !destrutivo || texto.trim().toUpperCase() === "REMOVER";
  const caixa = useRef<HTMLFormElement>(null);

  /*
   * Esc fecha, e o foco entra na caixa ao abrir.
   *
   * Sem isto, quem navega por teclado abria o modal e continuava com o
   * foco lá atrás, na página de baixo: era possível tabular pelos
   * botões escondidos atrás do escurecimento. E a única saída era o
   * mouse — o calendário desta mesma pasta já fecha com Esc, o modal
   * não fechava.
   */
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoCancelar();
    };
    document.addEventListener("keydown", escape);
    const alvo = caixa.current?.querySelector<HTMLElement>("input, button");
    alvo?.focus();
    return () => document.removeEventListener("keydown", escape);
  }, [aoCancelar]);

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!pronto) return;
    pedido.executar();
    aoCancelar();
  }

  const rotulo =
    pedido.rotuloConfirmar ?? (destrutivo ? "Remover definitivamente" : "Confirmar");

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-5"
      style={{ background: "rgba(3,5,10,.82)" }}
      role="dialog"
      aria-modal="true"
      aria-label={pedido.titulo}
    >
      <form
        ref={caixa}
        onSubmit={enviar}
        className="entra w-full max-w-[430px] px-6 py-6"
        style={{
          background: tema.superficie,
          border: `1px solid ${destrutivo ? tema.perigoLinha : tema.linha}`,
          borderRadius: 12,
          boxShadow: "0 40px 90px rgba(0,0,0,.7)",
        }}
      >
        <h2 className="mb-2 mt-0 text-[19px] font-semibold" style={{ color: tema.texto }}>
          {pedido.titulo}
        </h2>
        <p className="mb-[18px] mt-0 text-[14px] leading-[1.6] text-[rgba(255,255,255,.58)]">
          {pedido.mensagem}
        </p>

        {destrutivo ? (
          <>
            <label
              htmlFor="confirmar-remocao"
              className="mb-2 block text-[10px] uppercase"
              style={{ letterSpacing: ".16em", color: tema.textoSecundario }}
            >
              Escreva REMOVER para confirmar
            </label>
            <input
              id="confirmar-remocao"
              type="text"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              autoComplete="off"
              placeholder="REMOVER"
              className="min-h-[46px] w-full px-4 text-[15px] tracking-[.1em]"
              style={{
                color: tema.texto,
                background: tema.fundo,
                border: `1px solid ${tema.perigoLinha}`,
                borderRadius: 8,
              }}
            />
          </>
        ) : null}

        <div className="mt-[18px] flex flex-wrap justify-end gap-[10px]">
          <button
            type="button"
            onClick={aoCancelar}
            style={{ ...botaoNeutro, minHeight: 44, padding: "0 18px", fontSize: 14 }}
          >
            Cancelar
          </button>
          {destrutivo ? (
            <button
              type="submit"
              disabled={!pronto}
              className="min-h-[44px] border-none px-6 text-[14px] font-semibold"
              style={{
                /*
                  Branco sobre o vermelho dava 3,33:1 — abaixo do mínimo
                  para texto normal, justamente no rótulo da ação que
                  não tem volta. Preto sobre o mesmo vermelho dá 6,3:1.
                */
                color: pronto ? "#1a0a08" : tema.textoSecundario,
                background: pronto ? tema.perigo : "transparent",
                border: `1px solid ${pronto ? tema.perigo : tema.linha}`,
                borderRadius: 8,
                cursor: pronto ? "pointer" : "not-allowed",
              }}
            >
              {rotulo}
            </button>
          ) : (
            <button
              type="submit"
              style={{ ...botaoOuro, minHeight: 44, padding: "0 20px", fontSize: 14 }}
            >
              {rotulo}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
