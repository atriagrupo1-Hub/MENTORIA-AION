import { cores } from "@/design/tokens";

export const campo: React.CSSProperties = {
  minHeight: 48,
  padding: "0 16px",
  fontSize: 15,
  color: cores.textoCorpo,
  background: "rgba(8,12,24,.85)",
  border: "1px solid rgba(212,177,112,.24)",
  borderRadius: 10,
  outline: "none",
};

export const botaoOuro: React.CSSProperties = {
  minHeight: 48,
  padding: "0 24px",
  fontSize: 15,
  fontWeight: 700,
  color: cores.ouroTexto,
  background: cores.botaoOuro,
  border: "none",
  borderRadius: 99,
  cursor: "pointer",
};

export const botaoNeutro: React.CSSProperties = {
  minHeight: 38,
  padding: "0 14px",
  fontSize: 13,
  color: cores.textoCorpo,
  background: "rgba(255,255,255,.06)",
  border: "1px solid rgba(255,255,255,.16)",
  borderRadius: 99,
  cursor: "pointer",
};

export const botaoRemover: React.CSSProperties = {
  ...botaoNeutro,
  color: cores.alerta,
  background: "rgba(255,255,255,.04)",
  border: "1px solid rgba(230,168,154,.3)",
};

export function aba(ativa: boolean): React.CSSProperties {
  return {
    minHeight: 42,
    padding: "0 20px",
    fontSize: 14,
    fontWeight: 700,
    color: ativa ? cores.ouroTexto : cores.textoCorpo,
    background: ativa ? cores.botaoOuro : "rgba(255,255,255,.06)",
    border: `1px solid ${ativa ? "transparent" : "rgba(255,255,255,.16)"}`,
    borderRadius: 99,
    cursor: "pointer",
  };
}
