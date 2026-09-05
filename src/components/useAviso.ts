import { useCallback, useState } from "react";

export function useAviso() {
  const [mensagem, setMensagem] = useState("");
  const mostrar = useCallback((texto: string) => setMensagem(texto), []);
  const limpar = useCallback(() => setMensagem(""), []);
  return { mensagem, mostrar, limpar };
}
