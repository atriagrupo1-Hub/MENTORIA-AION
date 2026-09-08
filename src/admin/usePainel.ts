import { useCallback, useEffect, useState } from "react";
import type { Catalogo } from "@/data/tipos";
import * as dados from "./dados";
import type { AlunaAdmin } from "./dados";

export type Midia = { provider: string; ref: string };

/**
 * Dados do painel, sempre vindos do banco.
 *
 * Toda escrita é seguida de uma releitura: a tela mostra o que o banco
 * aceitou, não o que ela supôs que aconteceria. É mais chamadas, e é o
 * que impede o painel de divergir do que a aluna enxerga.
 */
export function usePainel() {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [catalogo, setCatalogo] = useState<Catalogo>({
    modulos: [],
    categorias: [],
    aoVivo: {},
  });
  const [alunas, setAlunas] = useState<AlunaAdmin[]>([]);
  const [midiaAulas, setMidiaAulas] = useState<Map<string, Midia>>(new Map());
  const [midiaPresentes, setMidiaPresentes] = useState<Map<string, Midia>>(new Map());

  const recarregar = useCallback(async () => {
    setErro(null);
    try {
      const [cat, lista, mAulas, mPresentes] = await Promise.all([
        dados.carregarCatalogo(),
        dados.listarAlunas(),
        dados.midiaDasAulas(),
        dados.midiaDosPresentes(),
      ]);
      setCatalogo(cat);
      setAlunas(lista);
      setMidiaAulas(mAulas);
      setMidiaPresentes(mPresentes);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha ao carregar o painel.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  /** Executa a escrita e relê. Devolve a mensagem de falha, ou null. */
  const executar = useCallback(
    async (acao: () => Promise<void>): Promise<string | null> => {
      try {
        await acao();
        await recarregar();
        return null;
      } catch (falha) {
        return falha instanceof Error ? falha.message : "Não foi possível salvar.";
      }
    },
    [recarregar],
  );

  return {
    carregando,
    erro,
    catalogo,
    alunas,
    midiaAulas,
    midiaPresentes,
    recarregar,
    executar,
  };
}

export type Painel = ReturnType<typeof usePainel>;
