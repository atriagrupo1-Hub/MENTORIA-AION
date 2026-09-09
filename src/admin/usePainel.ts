import { useCallback, useEffect, useState } from "react";
import { useEstado } from "@/data/estado";
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
  const { recarregar: recarregarSessao } = useEstado();
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
  const [configuracao, setConfiguracao] = useState<dados.Configuracao>(
    dados.CONFIGURACAO_PADRAO,
  );

  const recarregar = useCallback(async () => {
    setErro(null);
    try {
      const [cat, lista, mAulas, mPresentes, cfg] = await Promise.all([
        dados.carregarCatalogo(),
        dados.listarAlunas(),
        dados.midiaDasAulas(),
        dados.midiaDosPresentes(),
        dados.carregarConfiguracao(),
      ]);
      setCatalogo(cat);
      setAlunas(lista);
      setMidiaAulas(mAulas);
      setMidiaPresentes(mPresentes);
      setConfiguracao(cfg);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha ao carregar o painel.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  /**
   * Executa a escrita e relê. Devolve a mensagem de falha, ou null.
   *
   * `Promise<unknown>` e não `Promise<void>`: algumas escritas devolvem
   * valor — `definir_acesso` responde com a data gravada — e o que
   * interessa aqui é só ter esperado e relido.
   */
  const executar = useCallback(
    async (acao: () => Promise<unknown>): Promise<string | null> => {
      try {
        await acao();
        await recarregar();
        return null;
      } catch (falha) {
        const mensagem =
          falha instanceof Error ? falha.message : "Não foi possível salvar.";

        /*
         * `sem_permissao` aqui quase nunca é falta de permissão de
         * verdade: é a sessão ter deixado de ser de administradora.
         *
         * O navegador guarda UMA sessão. Entrando como aluna noutra aba
         * para conferir a experiência dela, a sessão da administradora é
         * substituída — e esta aba continua mostrando os dados de antes,
         * mas cada gravação sai com o token da aluna. O banco recusa,
         * corretamente, e a tela dizia apenas "sem_permissao".
         *
         * Reler a sessão faz o painel perceber e voltar para a entrada,
         * em vez de deixar você clicando contra uma parede.
         */
        if (mensagem.includes("sem_permissao")) {
          void recarregarSessao();
          return (
            "Sua sessão de administradora foi substituída — este navegador entrou " +
            "como aluna. Entre de novo para continuar. Para ver a área da aluna sem " +
            "perder o painel, use uma janela anônima."
          );
        }

        return mensagem;
      }
    },
    [recarregar, recarregarSessao],
  );

  return {
    carregando,
    erro,
    catalogo,
    alunas,
    midiaAulas,
    midiaPresentes,
    configuracao,
    recarregar,
    executar,
  };
}

export type Painel = ReturnType<typeof usePainel>;
