/**
 * Formas de dados da área de membros.
 *
 * Os nomes seguem o modelo aprovado (`Modelo de Dados.md`) para que a
 * troca da fonte local pelo Supabase seja uma troca de adaptador, não
 * uma reescrita das telas.
 */

export type Modulo = {
  id: string;
  numero: number;
  titulo: string;
  intro: string;
  ordem: number;
  bloqueadoGeral: boolean;
  /** A arte da capa já traz o título; a tela não sobrepõe o dela. */
  tituloNaArte: boolean;
  aulas: Aula[];
};

export type Aula = {
  id: string;
  moduloId: string;
  numero: number;
  titulo: string;
  ordem: number;
  duracaoSegundos: number | null;
  videoProvider: string | null;
  videoRef: string | null;
  materialPath: string | null;
  capaPath: string | null;
  bloqueadoGeral: boolean;
};

export type AulaAoVivo = {
  moduloId: string;
  quandoTexto: string | null;
  liberada: boolean;
};

export type Categoria = {
  id: string;
  titulo: string;
  ordem: number;
  destacada: boolean;
  bloqueadaGeral: boolean;
  presentes: Presente[];
};

export type Presente = {
  id: string;
  categoriaId: string;
  titulo: string;
  descricao: string;
  duracaoTexto: string;
  capaPath: string | null;
  videoProvider: string | null;
  videoRef: string | null;
  ordem: number;
  bloqueadoGeral: boolean;
};

export type Catalogo = {
  modulos: Modulo[];
  categorias: Categoria[];
  aoVivo: Record<string, AulaAoVivo>;
};

export type StatusConta = "ativa" | "bloqueada";

export type Aluna = {
  id: string;
  nome: string;
  login: string;
  codigo: string;
  status: StatusConta;
  /** Ids das aulas liberadas. Em produção vem da tabela `acessos`. */
  acessos: string[];
  /** Ids dos presentes liberados. */
  acessosPresentes: string[];
};

export type Progresso = {
  aulaId: string;
  posicaoSegundos: number;
  percentualAssistido: number;
  concluidaEm: string | null;
};

export type Comentario = {
  id: string;
  aulaId: string;
  autoraId: string;
  texto: string;
  posicaoSegundos: number;
  criadoEm: string;
};

export type AtividadeAluna = {
  alunaId: string;
  progresso: Record<string, Progresso>;
  curtidas: string[];
  comentarios: Comentario[];
};
