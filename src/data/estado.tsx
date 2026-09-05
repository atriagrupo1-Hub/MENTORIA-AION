import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  carregarAlunas,
  carregarAtividade,
  carregarCatalogo,
  carregarSessao,
  salvarAlunas,
  salvarAtividade,
  salvarCatalogo,
  salvarSessao,
} from "./repositorio";
import type {
  Aluna,
  AtividadeAluna,
  Aula,
  Catalogo,
  Modulo,
} from "./tipos";

/**
 * Duração de demonstração do protótipo. Em produção a plataforma grava
 * a duração real informada pelo player na primeira reprodução
 * (`aulas.duracao_segundos`); enquanto o campo estiver vazio, é este
 * valor que aparece na tela.
 */
export function duracaoDemo(numeroModulo: number, ordemAula: number): number {
  return 11 + ((numeroModulo * 5 + ordemAula * 7) % 15);
}

export function minutosDaAula(modulo: Modulo, aula: Aula): number {
  if (aula.duracaoSegundos) return Math.round(aula.duracaoSegundos / 60);
  return duracaoDemo(modulo.numero, aula.ordem);
}

export function rotuloDuracao(modulo: Modulo, aula: Aula): string {
  return `${minutosDaAula(modulo, aula)} min`;
}

export function relogio(segundos: number): string {
  const s = Math.max(0, Math.round(segundos));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

type Estado = {
  catalogo: Catalogo;
  alunas: Aluna[];
  aluna: Aluna | null;
  atividade: AtividadeAluna;
  /** Verdadeiro quando nenhuma aluna foi cadastrada — modo demonstração. */
  semTurma: boolean;

  entrar: (nome: string, codigo: string) => string | null;
  sair: () => void;

  aulaLiberada: (modulo: Modulo, aula: Aula) => boolean;
  aulaBloqueada: (modulo: Modulo, aula: Aula) => boolean;
  moduloLiberado: (modulo: Modulo) => boolean;
  presenteLiberado: (categoriaId: string, presenteId: string) => boolean;

  concluida: (aulaId: string) => boolean;
  percentualAssistido: (aulaId: string) => number;
  curtiu: (aulaId: string) => boolean;

  alternarConcluida: (aulaId: string) => boolean;
  alternarCurtida: (aulaId: string) => void;
  registrarPosicao: (aulaId: string, percentual: number, segundos: number) => void;
  comentar: (aulaId: string, texto: string, segundos: number) => void;

  atualizarCatalogo: (catalogo: Catalogo) => void;
  atualizarAlunas: (alunas: Aluna[]) => void;
};

const Contexto = createContext<Estado | null>(null);

const SEM_ATIVIDADE: AtividadeAluna = {
  alunaId: "",
  progresso: {},
  curtidas: [],
  comentarios: [],
};

export function ProvedorEstado({ children }: { children: ReactNode }) {
  const [catalogo, setCatalogo] = useState<Catalogo>(() => carregarCatalogo());
  const [alunas, setAlunas] = useState<Aluna[]>(() => carregarAlunas());
  const [alunaId, setAlunaId] = useState<string | null>(
    () => carregarSessao()?.alunaId ?? null,
  );
  const [atividade, setAtividade] = useState<AtividadeAluna>(() => {
    const sessao = carregarSessao();
    return sessao ? carregarAtividade(sessao.alunaId) : SEM_ATIVIDADE;
  });

  /** Conta improvisada quando ainda não há turma cadastrada. */
  const [visitante, setVisitante] = useState<Aluna | null>(
    () => carregarSessao()?.visitante ?? null,
  );

  const aluna = useMemo(
    () => alunas.find((a) => a.id === alunaId) ?? visitante,
    [alunas, alunaId, visitante],
  );

  const semTurma = alunas.length === 0;

  const gravarAtividade = useCallback((proxima: AtividadeAluna) => {
    setAtividade(proxima);
    if (proxima.alunaId) salvarAtividade(proxima);
  }, []);

  const entrar = useCallback<Estado["entrar"]>(
    (nome, codigo) => {
      const chave = nome.trim().toLowerCase();
      if (!chave || !codigo.trim()) {
        return "Preencha seu nome e seu código para entrar.";
      }

      if (alunas.length === 0) {
        // Sem turma cadastrada, o protótipo abre em demonstração.
        const conta: Aluna = {
          id: "demo",
          nome: nome.trim().charAt(0).toUpperCase() + nome.trim().slice(1),
          login: chave,
          codigo,
          status: "ativa",
          acessos: [],
          acessosPresentes: [],
        };
        setVisitante(conta);
        setAlunaId(conta.id);
        salvarSessao({ alunaId: conta.id, visitante: conta });
        gravarAtividade(carregarAtividade(conta.id));
        return null;
      }

      const encontrada = alunas.find(
        (a) => a.login.toLowerCase() === chave || a.nome.toLowerCase() === chave,
      );
      if (!encontrada) {
        return "Não encontramos este acesso. Confira o nome informado.";
      }
      if (encontrada.status === "bloqueada") {
        return "Seu acesso está temporariamente suspenso. Fale com a equipe da mentoria.";
      }
      if (encontrada.codigo && encontrada.codigo !== codigo.trim()) {
        return "Código incorreto. Confira os números informados.";
      }

      setAlunaId(encontrada.id);
      setVisitante(null);
      salvarSessao({ alunaId: encontrada.id, visitante: null });
      gravarAtividade(carregarAtividade(encontrada.id));
      return null;
    },
    [alunas, gravarAtividade],
  );

  const sair = useCallback(() => {
    setAlunaId(null);
    setVisitante(null);
    salvarSessao(null);
    setAtividade(SEM_ATIVIDADE);
  }, []);

  const moduloLiberado = useCallback<Estado["moduloLiberado"]>(
    (modulo) => {
      if (modulo.bloqueadoGeral) return false;
      if (semTurma || !aluna) return true;
      return modulo.aulas.some((a) => aluna.acessos.includes(a.id));
    },
    [aluna, semTurma],
  );

  const aulaLiberada = useCallback<Estado["aulaLiberada"]>(
    (modulo, aula) => {
      if (modulo.bloqueadoGeral || aula.bloqueadoGeral) return false;
      if (semTurma || !aluna) return true;
      return aluna.acessos.includes(aula.id);
    },
    [aluna, semTurma],
  );

  const concluida = useCallback<Estado["concluida"]>(
    (aulaId) => Boolean(atividade.progresso[aulaId]?.concluidaEm),
    [atividade],
  );

  const aulaBloqueada = useCallback<Estado["aulaBloqueada"]>(
    (modulo, aula) => {
      if (!aulaLiberada(modulo, aula)) return true;
      // Com turma cadastrada, a liberação da administradora decide sozinha.
      if (!semTurma && aluna) return false;
      // Em demonstração, a aula abre depois da anterior concluída.
      if (aula.ordem === 0) return false;
      const anterior = modulo.aulas[aula.ordem - 1];
      return anterior ? !concluida(anterior.id) : false;
    },
    [aluna, aulaLiberada, concluida, semTurma],
  );

  const presenteLiberado = useCallback<Estado["presenteLiberado"]>(
    (categoriaId, presenteId) => {
      const categoria = catalogo.categorias.find((c) => c.id === categoriaId);
      if (!categoria || categoria.bloqueadaGeral) return false;
      const presente = categoria.presentes.find((p) => p.id === presenteId);
      if (!presente || presente.bloqueadoGeral) return false;
      if (!presente.videoRef) return false;
      if (semTurma || !aluna) return true;
      return aluna.acessosPresentes.includes(presenteId);
    },
    [aluna, catalogo, semTurma],
  );

  const percentualAssistido = useCallback<Estado["percentualAssistido"]>(
    (aulaId) => atividade.progresso[aulaId]?.percentualAssistido ?? 0,
    [atividade],
  );

  const curtiu = useCallback<Estado["curtiu"]>(
    (aulaId) => atividade.curtidas.includes(aulaId),
    [atividade],
  );

  const alternarConcluida = useCallback<Estado["alternarConcluida"]>(
    (aulaId) => {
      const atual = atividade.progresso[aulaId];
      const virouConcluida = !atual?.concluidaEm;
      const progresso = { ...atividade.progresso };
      progresso[aulaId] = {
        aulaId,
        posicaoSegundos: atual?.posicaoSegundos ?? 0,
        percentualAssistido: atual?.percentualAssistido ?? 0,
        concluidaEm: virouConcluida ? new Date().toISOString() : null,
      };
      gravarAtividade({ ...atividade, progresso });
      return virouConcluida;
    },
    [atividade, gravarAtividade],
  );

  const alternarCurtida = useCallback<Estado["alternarCurtida"]>(
    (aulaId) => {
      const curtidas = atividade.curtidas.includes(aulaId)
        ? atividade.curtidas.filter((x) => x !== aulaId)
        : [...atividade.curtidas, aulaId];
      gravarAtividade({ ...atividade, curtidas });
    },
    [atividade, gravarAtividade],
  );

  const registrarPosicao = useCallback<Estado["registrarPosicao"]>(
    (aulaId, percentual, segundos) => {
      const atual = atividade.progresso[aulaId];
      const progresso = { ...atividade.progresso };
      progresso[aulaId] = {
        aulaId,
        posicaoSegundos: segundos,
        percentualAssistido: Math.round(percentual),
        concluidaEm: atual?.concluidaEm ?? null,
      };
      gravarAtividade({ ...atividade, progresso });
    },
    [atividade, gravarAtividade],
  );

  const comentar = useCallback<Estado["comentar"]>(
    (aulaId, texto, segundos) => {
      const comentario = {
        id: `c-${Date.now()}`,
        aulaId,
        autoraId: atividade.alunaId,
        texto: texto.slice(0, 600),
        posicaoSegundos: Math.round(segundos),
        criadoEm: new Date().toISOString(),
      };
      gravarAtividade({
        ...atividade,
        comentarios: [comentario, ...atividade.comentarios],
      });
    },
    [atividade, gravarAtividade],
  );

  const atualizarCatalogo = useCallback<Estado["atualizarCatalogo"]>((proximo) => {
    setCatalogo(proximo);
    salvarCatalogo(proximo);
  }, []);

  const atualizarAlunas = useCallback<Estado["atualizarAlunas"]>((proximas) => {
    setAlunas(proximas);
    salvarAlunas(proximas);
  }, []);

  const valor: Estado = {
    catalogo,
    alunas,
    aluna,
    atividade,
    semTurma,
    entrar,
    sair,
    aulaLiberada,
    aulaBloqueada,
    moduloLiberado,
    presenteLiberado,
    concluida,
    percentualAssistido,
    curtiu,
    alternarConcluida,
    alternarCurtida,
    registrarPosicao,
    comentar,
    atualizarCatalogo,
    atualizarAlunas,
  };

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useEstado(): Estado {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useEstado precisa estar dentro de ProvedorEstado");
  return valor;
}
