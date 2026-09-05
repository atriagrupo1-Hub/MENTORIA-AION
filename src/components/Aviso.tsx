import { useEffect } from "react";

/**
 * Faixa centralizada na base da tela, por 3,6 a 4,2 segundos
 * (item 6 do README).
 */
export function Aviso({
  mensagem,
  aoFechar,
  duracao = 4200,
}: {
  mensagem: string;
  aoFechar: () => void;
  duracao?: number;
}) {
  useEffect(() => {
    if (!mensagem) return;
    const t = window.setTimeout(aoFechar, duracao);
    return () => window.clearTimeout(t);
  }, [mensagem, aoFechar, duracao]);

  if (!mensagem) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[34px] z-[90] flex justify-center px-5">
      <div
        role="status"
        className="rise-in max-w-[560px] rounded-cartao px-7 py-5 text-center text-[18px] leading-[1.5]"
        style={{
          color: "#f6efe3",
          background: "linear-gradient(135deg, rgba(22,32,55,.97), rgba(7,10,20,.97))",
          border: "1px solid rgba(212,177,112,.45)",
          boxShadow: "0 30px 70px rgba(0,0,0,.7)",
        }}
      >
        {mensagem}
      </div>
    </div>
  );
}
