import { useState, type FormEvent } from "react";
import { cores } from "@/design/tokens";

export type PedidoConfirmacao = {
  titulo: string;
  mensagem: string;
  executar: () => void;
};

/**
 * Ações destrutivas exigem digitar REMOVER (item 5 do README).
 * O botão vermelho só habilita com a palavra correta.
 */
export function Confirmacao({
  pedido,
  aoCancelar,
}: {
  pedido: PedidoConfirmacao;
  aoCancelar: () => void;
}) {
  const [texto, setTexto] = useState("");
  const pronto = texto.trim().toUpperCase() === "REMOVER";

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!pronto) return;
    pedido.executar();
    aoCancelar();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-5"
      style={{ background: "rgba(3,5,10,.82)" }}
    >
      <form
        onSubmit={enviar}
        className="rise-in-rapido w-full max-w-[430px] rounded-cartao-lg px-[22px] py-6"
        style={{
          background: "linear-gradient(170deg, rgba(16,24,42,.98), rgba(6,9,18,.99))",
          border: "1px solid rgba(230,168,154,.35)",
          boxShadow: "0 40px 90px rgba(0,0,0,.7)",
        }}
      >
        <h2 className="mb-2 mt-0 font-titulo text-[24px] font-semibold text-marfim">
          {pedido.titulo}
        </h2>
        <p className="mb-[18px] mt-0 text-[14px] leading-[1.6] text-[rgba(243,236,225,.65)]">
          {pedido.mensagem}
        </p>

        <label
          htmlFor="confirmar-remocao"
          className="mb-2 block text-[12px] font-bold text-[rgba(243,236,225,.75)]"
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
          className="min-h-[50px] w-full rounded-campo px-4 text-[15px] tracking-[.1em] outline-none"
          style={{
            color: cores.textoCorpo,
            background: "rgba(8,12,24,.9)",
            border: "1px solid rgba(230,168,154,.3)",
          }}
        />

        <div className="mt-[18px] flex flex-wrap justify-end gap-[10px]">
          <button
            type="button"
            onClick={aoCancelar}
            className="min-h-[46px] rounded-pilula px-5 text-[14px]"
            style={{
              color: cores.textoCorpo,
              background: "rgba(255,255,255,.06)",
              border: "1px solid rgba(255,255,255,.16)",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!pronto}
            className="min-h-[46px] rounded-pilula border-none px-6 text-[14px] font-bold"
            style={{
              color: pronto ? "#ffffff" : "rgba(243,236,225,.4)",
              background: pronto ? cores.alertaForte : "rgba(255,255,255,.06)",
              cursor: pronto ? "pointer" : "not-allowed",
            }}
          >
            Remover definitivamente
          </button>
        </div>
      </form>
    </div>
  );
}
