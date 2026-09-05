import { CATEGORIAS_PADRAO, MODULOS, VIDEOS_SEMENTE } from "./catalogo";
import type {
  Aluna,
  AtividadeAluna,
  Catalogo,
  Categoria,
  Modulo,
} from "./tipos";

/**
 * Adaptador de dados local.
 *
 * É o único lugar que conhece a origem dos dados. Enquanto o Supabase
 * não está ligado, o catálogo, as alunas e a atividade ficam no
 * navegador. Ao ligar o banco, apenas este arquivo muda: as telas
 * consomem o mesmo formato.
 *
 * Atenção: isto NÃO é autoridade de acesso. Em produção, liberação,
 * bloqueio e progresso são decididos pelo Supabase, e o aplicativo não
 * concede acesso sem resposta do banco.
 */

const CHAVE_CATALOGO = "aion-catalogo-v1";
const CHAVE_ALUNAS = "aion-alunas-v1";
const CHAVE_ATIVIDADE = "aion-atividade-v1";
const CHAVE_SESSAO = "aion-sessao-v1";

function ler<T>(chave: string): T | null {
  try {
    const cru = localStorage.getItem(chave);
    return cru ? (JSON.parse(cru) as T) : null;
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: unknown): void {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* armazenamento indisponível — a tela segue funcionando */
  }
}

export function idAula(numeroModulo: number, numeroAula: number): string {
  return `aula-${numeroModulo}-${numeroAula}`;
}

export function idModulo(numeroModulo: number): string {
  return `modulo-${numeroModulo}`;
}

function catalogoSemente(): Catalogo {
  const modulos: Modulo[] = MODULOS.map((m, ordem) => ({
    id: idModulo(m.numero),
    numero: m.numero,
    titulo: m.titulo,
    intro: m.intro,
    ordem,
    bloqueadoGeral: false,
    aulas: m.aulas.map((titulo, i) => {
      const ref = VIDEOS_SEMENTE[`${m.numero}-${i}`] ?? null;
      return {
        id: idAula(m.numero, i),
        moduloId: idModulo(m.numero),
        numero: i + 1,
        titulo,
        ordem: i,
        duracaoSegundos: null,
        videoProvider: ref ? "youtube" : null,
        videoRef: ref,
        materialPath: null,
        capaPath: null,
        bloqueadoGeral: false,
      };
    }),
  }));

  const categorias: Categoria[] = CATEGORIAS_PADRAO.map((titulo, ordem) => ({
    id: `categoria-${ordem}`,
    titulo,
    ordem,
    destacada: false,
    bloqueadaGeral: false,
    presentes: [],
  }));

  return { modulos, categorias, aoVivo: {} };
}

export function carregarCatalogo(): Catalogo {
  return ler<Catalogo>(CHAVE_CATALOGO) ?? catalogoSemente();
}

export function salvarCatalogo(catalogo: Catalogo): void {
  gravar(CHAVE_CATALOGO, catalogo);
}

export function carregarAlunas(): Aluna[] {
  return ler<Aluna[]>(CHAVE_ALUNAS) ?? [];
}

export function salvarAlunas(alunas: Aluna[]): void {
  gravar(CHAVE_ALUNAS, alunas);
}

export function carregarAtividade(alunaId: string): AtividadeAluna {
  const todas = ler<Record<string, AtividadeAluna>>(CHAVE_ATIVIDADE) ?? {};
  return (
    todas[alunaId] ?? {
      alunaId,
      progresso: {},
      curtidas: [],
      comentarios: [],
    }
  );
}

export function salvarAtividade(atividade: AtividadeAluna): void {
  const todas = ler<Record<string, AtividadeAluna>>(CHAVE_ATIVIDADE) ?? {};
  todas[atividade.alunaId] = atividade;
  gravar(CHAVE_ATIVIDADE, todas);
}

/**
 * Sessão da aluna. Guarda o id e, quando não há turma cadastrada, a
 * conta improvisada da demonstração — sem isso, recarregar a página
 * derruba o acesso.
 *
 * Em produção, aqui fica apenas o token do Supabase Auth: nenhuma
 * decisão de acesso sai deste valor.
 */
export type Sessao = { alunaId: string; visitante: Aluna | null };

export function carregarSessao(): Sessao | null {
  return ler<Sessao>(CHAVE_SESSAO);
}

export function salvarSessao(sessao: Sessao | null): void {
  if (sessao === null) {
    try {
      localStorage.removeItem(CHAVE_SESSAO);
    } catch {
      /* ignora */
    }
    return;
  }
  gravar(CHAVE_SESSAO, sessao);
}

export { catalogoSemente };
