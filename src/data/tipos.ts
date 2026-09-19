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
  /** A qual produto este módulo pertence. Nulo só em base antiga. */
  produtoId: string | null;
  bloqueadoGeral: boolean;
  /** A arte da capa já traz o título; a tela não sobrepõe o dela. */
  tituloNaArte: boolean;
  aulas: Aula[];
  /** Conteúdos da seção — pendurados no módulo, fora de qualquer aula. */
  conteudos: Conteudo[];
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
  /** Passo a passo do exercício, uma linha por passo. Vazio = não tem. */
  exercicio: string | null;
  capaPath: string | null;
  bloqueadoGeral: boolean;
  /** Conteúdos extras desta aula, além do vídeo e do material de sempre. */
  conteudos: Conteudo[];
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
  /** Os produtos desta categoria, na ordem definida no painel. */
  produtos: Produto[];
};

/** Um pedaço de conteúdo. O mesmo formato serve para todos os tipos. */
export type TipoConteudo = "video" | "audio" | "texto" | "pdf" | "link" | "imagem";

export type Conteudo = {
  id: string;
  produtoId: string;
  /** Onde ele está pendurado. Os três nulos = conteúdo direto do produto. */
  moduloId: string | null;
  aulaId: string | null;
  presenteId: string | null;
  tipo: TipoConteudo;
  titulo: string;
  texto: string | null;
  arquivoPath: string | null;
  url: string | null;
  videoProvider: string | null;
  videoRef: string | null;
  ordem: number;
  publicado: boolean;
};

/**
 * O container universal.
 *
 * `categoriaId` diz ONDE ele aparece — e só isso. Não diz o que ele tem
 * dentro: um produto pode ter módulos e aulas, pode ter itens de
 * acervo, pode ter conteúdo direto, ou qualquer combinação.
 */
export type Produto = {
  id: string;
  categoriaId: string;
  titulo: string;
  descricao: string;
  capaPath: string | null;
  ordem: number;
  publicado: boolean;
  bloqueadoGeral: boolean;
  modulos: Modulo[];
  presentes: Presente[];
  /** Conteúdo pendurado direto no produto, sem módulo nem item. */
  conteudos: Conteudo[];
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
  /** A qual produto este item pertence. Nulo só em base antiga. */
  produtoId: string | null;
  /** Conteúdos deste item. */
  conteudos: Conteudo[];
};

export type Catalogo = {
  modulos: Modulo[];
  categorias: Categoria[];
  aoVivo: Record<string, AulaAoVivo>;
  /** Todos os produtos, na ordem de categoria e depois de posição. */
  produtos: Produto[];
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
