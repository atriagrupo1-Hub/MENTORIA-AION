/**
 * Catálogo da mentoria, transcrito do protótipo sem alteração.
 *
 * O aplicativo NÃO lê este arquivo: o catálogo vem das tabelas `modulos`
 * e `aulas` do Supabase. Ele ficou como origem da migration
 * `0004_catalogo.sql`, que foi gerada a partir daqui — é o registro de
 * onde os 11 módulos e as 50 aulas vieram, e de que nada foi renomeado
 * nem reordenado no caminho (item 11 do README do handoff).
 */

export type ModuloSemente = {
  numero: number;
  titulo: string;
  intro: string;
  aulas: string[];
};

export const MODULOS: ModuloSemente[] = [
  {
    numero: 0,
    titulo: "BOAS-VINDAS E DIAGNÓSTICO",
    intro: "O ponto de partida da sua jornada: entender onde você está hoje e o que deseja construir a partir de agora.",
    aulas: [
      "Você não entrou em mais um curso",
      "Seu ponto de partida e a vida que deseja construir",
    ],
  },
  {
    numero: 1,
    titulo: "DESCOBRINDO O VERDADEIRO BLOQUEIO",
    intro: "Antes de mudar os resultados, é preciso ver com clareza o processo invisível que os produz.",
    aulas: [
      "Os frutos que você vê não são o começo",
      "O processo invisível por trás dos resultados",
      "O Ciclo da Escassez e o Ciclo da Prosperidade",
      "O mapa dos resultados que se repetem",
    ],
  },
  {
    numero: 2,
    titulo: "ENCONTRANDO A ORIGEM DOS BLOQUEIOS",
    intro: "Uma volta cuidadosa à formação das suas crenças, desde antes das primeiras palavras.",
    aulas: [
      "Ninguém nasce acreditando tudo o que acredita hoje",
      "A Primeira Escrita da Vida: heranças e período pré-natal",
      "Antes das palavras: a fase pré-verbal",
      "Quando as palavras começaram a definir o mundo",
      "Quem e o que participou da sua formação",
    ],
  },
  {
    numero: 3,
    titulo: "DESCONSTRUINDO AS CRENÇAS LIMITANTES",
    intro: "O trabalho central da mentoria: separar o fato do significado e enfraquecer a crença antiga.",
    aulas: [
      "O fato e o significado que você deu a ele",
      "Como uma interpretação se transforma em crença",
      "Os hábitos da mente e a identidade antiga",
      "Crenças de dinheiro, prosperidade e escassez",
      "Merecimento, culpa, sofrimento e abundância",
      "Relacionamentos, saúde e envelhecimento",
      "A verdade que enfraquece a crença antiga",
    ],
  },
  {
    numero: 4,
    titulo: "RESTAURANDO A FORMA CORRETA DE ORAR",
    intro: "Sua oração revela aquilo em que você realmente acredita. Aqui ela é restaurada.",
    aulas: [
      "O que sua oração revela sobre aquilo em que você acredita",
      "Fé, desespero, perseverança e insegurança",
      "Esperar em Deus sem abandonar sua responsabilidade",
      "Sua nova prática de oração",
    ],
  },
  {
    numero: 5,
    titulo: "CONSTRUINDO UMA NOVA IDENTIDADE",
    intro: "A identidade antiga não precisa continuar governando a sua vida. Uma nova forma de pensar começa aqui.",
    aulas: [
      "A identidade antiga não precisa continuar governando",
      "Nascer de novo: uma nova forma de pensar e viver",
      "Quem você decidiu se tornar",
      "Autorização interna para receber, crescer e administrar",
      "As primeiras evidências da nova identidade",
    ],
  },
  {
    numero: 6,
    titulo: "REPROGRAMANDO O AMBIENTE",
    intro: "O que você vê, ouve e convive todos os dias sustenta ou desmonta a mudança.",
    aulas: [
      "Seu ambiente repete uma identidade todos os dias",
      "Ambiente físico e emocional",
      "Televisão, notícias e redes sociais",
      "Pessoas, limites e uma rotina que protege a mudança",
    ],
  },
  {
    numero: 7,
    titulo: "REPROGRAMANDO O VERBO",
    intro: "A palavra dita e a palavra interior passam a caminhar em coerência com a nova identidade.",
    aulas: [
      "As três formas do verbo",
      "A linguagem da identidade antiga",
      "Reconhecer sem condenar e afirmar com coerência",
      "O verbo, a oração e o novo diálogo interior",
    ],
  },
  {
    numero: 8,
    titulo: "FORTALECENDO O ESTADO INTERIOR",
    intro: "Paz, esperança e confiança deixam de ser sentimentos ocasionais e passam a ser um estado cultivado.",
    aulas: [
      "O estado interior participa de suas respostas",
      "Paz, esperança e confiança",
      "Ansiedade e medo sem governo automático",
      "Frustração, culpa e disciplina emocional",
      "Imaginação e visualização do futuro",
    ],
  },
  {
    numero: 9,
    titulo: "TRANSFORMANDO A FÉ EM AÇÃO",
    intro: "Fé e responsabilidade caminham juntas. Aqui a mudança interior encontra as decisões práticas.",
    aulas: [
      "Fé e responsabilidade caminham juntas",
      "A menor ação coerente e o poder da decisão",
      "Da ação ao hábito que confirma a nova identidade",
      "Ação nas finanças, organização, administração e trabalho",
      "Plano Integrado de Fé em Ação",
    ],
  },
  {
    numero: 10,
    titulo: "CONSOLIDANDO A NOVA VIDA",
    intro: "Consolidar não é terminar. É seguir com autonomia, administrando as novas bênçãos.",
    aulas: [
      "Consolidar não é terminar",
      "Sinais de retorno à identidade antiga",
      "O Protocolo de Retorno",
      "Seus ciclos de 21, 60 e 90 dias",
      "Administrando as novas bênçãos e seguindo com autonomia",
    ],
  },
];

/** Categorias do acervo de presentes. */
export const CATEGORIAS_PADRAO = [
  "Lançamentos",
  "Frequências",
  "Ebooks",
  "Documentários",
] as const;

/**
 * Vídeos de demonstração já cadastrados no protótipo (módulos 1 e 2).
 * Migram como aulas reais — decisão 3 do modelo de dados.
 */
export const VIDEOS_SEMENTE: Record<string, string> = {
  "1-0": "hTfKpAWkgJY",
  "1-1": "SrDEtSlqJC4",
  "1-2": "DAoJO2tFQO4",
  "1-3": "k3TsKpLHx1g",
  "2-0": "SrDEtSlqJC4",
  "2-1": "hTfKpAWkgJY",
  "2-2": "k3TsKpLHx1g",
  "2-3": "DAoJO2tFQO4",
  "2-4": "SrDEtSlqJC4",
};
