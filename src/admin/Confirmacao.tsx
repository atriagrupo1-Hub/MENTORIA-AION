import { useState, type FormEvent } from "react";
import { botaoNeutro, painel as tema } from "./estilos";

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
        className="rise-in-rapido w-full max-w-[430px] px-6 py-6"
        style={{
          background: tema.superficie,
          border: `1px solid ${tema.perigoLinha}`,
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

        <label
          htmlFor="confirmar-remocao"
          className="mb-2 block text-[10px] uppercase"
          style={{ letterSpacing: ".16em", color: tema.textoTerciario }}
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
          className="min-h-[46px] w-full px-4 text-[15px] tracking-[.1em] outline-none"
          style={{
            color: tema.texto,
            background: tema.fundo,
            border: `1px solid ${tema.perigoLinha}`,
            borderRadius: 8,
          }}
        />

        <div className="mt-[18px] flex flex-wrap justify-end gap-[10px]">
          <button
            type="button"
            onClick={aoCancelar}
            style={{ ...botaoNeutro, minHeight: 44, padding: "0 18px", fontSize: 14 }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!pronto}
            className="min-h-[44px] border-none px-6 text-[14px] font-semibold"
            style={{
              color: pronto ? "#ffffff" : tema.textoTerciario,
              background: pronto ? tema.perigo : "transparent",
              border: `1px solid ${pronto ? tema.perigo : tema.linha}`,
              borderRadius: 8,
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
