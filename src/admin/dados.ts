import { supabase } from "@/data/supabase";
import type { Catalogo } from "@/data/tipos";
import { NOME_DO_PAPEL, type PapelNovo } from "./papeis";

/**
 * Dados do painel administrativo.
 *
 * A administradora escreve direto nas tabelas — a RLS permite, porque
 * confere `eh_admin()` no banco. A única exceção é criar aluna, que
 * exige escrever em `auth.users` e por isso passa pela Edge Function
 * `cadastrar-aluna`.
 *
 * A autoria dos comentários e o código de acesso não são colunas
 * alcançáveis nem por ela: vêm por função.
 */

export type AlunaAdmin = {
  id: string;
  nome: string;
  login: string;
  codigo: string;
  status: "ativa" | "bloqueada";
  /** Só dígitos, com DDD. Nulo quer dizer que ninguém preencheu. */
  celular: string | null;
  /** Quando a aluna foi cadastrada. É a base de contagem do prazo. */
  criadaEm: string;
  /** Quando ela entrou pela primeira vez. Nulo = nunca entrou. */
  primeiroAcessoEm: string | null;
  /** Última renovação. Nulo = nunca renovou. Não mexe em `criadaEm`. */
  renovadaEm: string | null;
  /** Quantas vezes já renovou. */
  renovacoes: number;
  /** A última vez que ela apareceu. */
  ultimoAcessoEm: string | null;
  /** Fim do acesso. Nulo quer dizer sem prazo. */
  acessoAte: string | null;
  /** Aulas que ela tem, e quando cada uma abre. Nulo = já aberta. */
  cronograma: Map<string, string | null>;
};

export async function listarAlunas(): Promise<AlunaAdmin[]> {
  const [perfis, credenciais, acessos] = await Promise.all([
    supabase.from("profiles").select("*").eq("papel", "aluna").order("nome"),
    supabase.from("credenciais").select("aluna_id, codigo"),
    supabase.from("acessos").select("aluna_id, escopo, aula_id, abre_em"),
  ]);

  if (perfis.error) throw new Error(`alunas: ${perfis.error.message}`);
  if (credenciais.error) throw new Error(`códigos: ${credenciais.error.message}`);
  if (acessos.error) throw new Error(`acessos: ${acessos.error.message}`);

  const codigos = new Map(
    (credenciais.data ?? []).map((c: { aluna_id: string; codigo: string }) => [
      c.aluna_id,
      c.codigo,
    ]),
  );

  const porAluna = new Map<string, Map<string, string | null>>();
  for (const a of (acessos.data ?? []) as Array<{
    aluna_id: string;
    escopo: string;
    aula_id: string | null;
    abre_em: string | null;
  }>) {
    if (a.escopo !== "aula" || !a.aula_id) continue;
    const mapa = porAluna.get(a.aluna_id) ?? new Map<string, string | null>();
    mapa.set(a.aula_id, a.abre_em);
    porAluna.set(a.aluna_id, mapa);
  }

  return (perfis.data ?? []).map(
    (p: {
      id: string;
      nome: string;
      login: string;
      status: "ativa" | "bloqueada";
      celular: string | null;
      criada_em: string;
      primeiro_acesso_em: string | null;
      ultimo_acesso_em: string | null;
      renovada_em: string | null;
      renovacoes: number | null;
      acesso_ate: string | null;
    }) => ({
      id: p.id,
      nome: p.nome,
      login: p.login,
      codigo: codigos.get(p.id) ?? "",
      status: p.status,
      celular: p.celular ?? null,
      criadaEm: p.criada_em,
      primeiroAcessoEm: p.primeiro_acesso_em,
      ultimoAcessoEm: p.ultimo_acesso_em,
      renovadaEm: p.renovada_em,
      renovacoes: p.renovacoes ?? 0,
      acessoAte: p.acesso_ate,
      cronograma: porAluna.get(p.id) ?? new Map<string, string | null>(),
    }),
  );
}

/**
 * Prazo de acesso.
 *
 * As duas contas ficam no banco, não aqui: `definir` conta a partir do
 * cadastro da aluna, `estender` soma ao prazo vigente. Feito no
 * navegador, o segundo seria ler-modificar-gravar, e dois cliques
 * seguidos perderiam um dos acréscimos.
 */
export type Prazo = { dias: number; meses: number; anos: number };

export async function definirAcesso(alunaId: string, p: Prazo): Promise<string | null> {
  const { data, error } = await supabase.rpc("definir_acesso", {
    p_aluna: alunaId,
    p_dias: p.dias,
    p_meses: p.meses,
    p_anos: p.anos,
  });
  if (error) throw new Error(`prazo: ${error.message}`);
  return (data as string | null) ?? null;
}

export async function estenderAcesso(alunaId: string, p: Prazo): Promise<string | null> {
  const { data, error } = await supabase.rpc("estender_acesso", {
    p_aluna: alunaId,
    p_dias: p.dias,
    p_meses: p.meses,
    p_anos: p.anos,
  });
  if (error) throw new Error(`prazo: ${error.message}`);
  return (data as string | null) ?? null;
}

/**
 * Intervalo padrão entre aulas, em dias.
 *
 * Não decide acesso nenhum: é só o número que já vem preenchido no
 * formulário quando você monta o cronograma de uma aluna. Quem decide é
 * a data gravada em cada aula.
 */
export type Configuracao = { intervaloDias: number };

export const CONFIGURACAO_PADRAO: Configuracao = { intervaloDias: 5 };

export async function carregarConfiguracao(): Promise<Configuracao> {
  const { data, error } = await supabase
    .from("configuracoes")
    .select("intervalo_dias")
    .maybeSingle();
  if (error) throw new Error(`configuração: ${error.message}`);
  if (!data) return CONFIGURACAO_PADRAO;
  return { intervaloDias: data.intervalo_dias };
}

export async function salvarConfiguracao(c: Configuracao): Promise<void> {
  const { error } = await supabase
    .from("configuracoes")
    .update({ intervalo_dias: c.intervaloDias, atualizada_em: new Date().toISOString() })
    .eq("id", true);
  if (error) throw new Error(`configuração: ${error.message}`);
}

export async function cadastrarAluna(
  nome: string,
  login: string,
  codigo: string,
  celular: string,
): Promise<{ ok: true } | { ok: false; mensagem: string }> {
  const { data: sessao } = await supabase.auth.getSession();
  if (!sessao.session) return { ok: false, mensagem: "Sua sessão expirou. Entre de novo." };

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cadastrar-aluna`;
  const resposta = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessao.session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ nome, login, codigo, celular }),
  });

  if (resposta.ok) return { ok: true };

  const corpo = await resposta.json().catch(() => ({}));
  return {
    ok: false,
    mensagem: corpo?.mensagem ?? "Não foi possível cadastrar a aluna agora.",
  };
}

/*
 * Bloquear e remover aluna passam por função, e não por `update` e
 * `delete` soltos como antes.
 *
 * Não é preciosismo. Escrever direto em `profiles` exige a política do
 * administrador, e o suporte não a tem — não pode ter: a mesma
 * permissão que deixa bloquear uma aluna deixaria mexer no papel de
 * quem quisesse, inclusive no próprio. As funções fazem exatamente as
 * duas coisas que o suporte pode fazer, e conferem no banco que o alvo
 * é mesmo uma aluna.
 */

export async function definirStatus(
  alunaId: string,
  status: "ativa" | "bloqueada",
): Promise<void> {
  const { error } = await supabase.rpc("definir_status_aluna", {
    p_aluna: alunaId,
    p_status: status,
  });
  if (error) throw new Error(`bloquear: ${error.message}`);
}

export async function removerAluna(alunaId: string): Promise<void> {
  // A cascata de `profiles` leva acessos, progresso, curtidas e
  // comentários junto. A linha de `auth.users` fica; removê-la exige a
  // chave de serviço, e a conta sem perfil não entra em lugar nenhum.
  const { error } = await supabase.rpc("remover_aluna", { p_aluna: alunaId });
  if (error) throw new Error(`remover: ${error.message}`);
}

/**
 * Substitui as liberações de uma aluna pelas escolhidas no painel.
 * Apaga e reinsere: é o que mantém a lista igual ao que a tela mostra.
 */
/**
 * Cronograma — quando cada aula abre para cada aluna.
 *
 * Escrever data é sempre pelo banco, nunca por `update` solto: gerar 50
 * linhas em sequência precisa ser uma operação só, senão uma falha no
 * meio deixaria a aluna com meio curso.
 */

/**
 * Gera o cronograma inteiro: apaga o que ela tinha e escreve de novo,
 * uma aula a cada `intervaloDias`, a partir de `inicio`.
 *
 * `intervaloDias = 0` abre tudo na hora. Módulo fora de `moduloIds` não
 * recebe linha nenhuma — é assim que ele fica oculto para ela.
 */
export async function gerarCronograma(
  alunaId: string,
  moduloIds: string[],
  intervaloDias: number,
  inicio: Date,
): Promise<number> {
  const { data, error } = await supabase.rpc("gerar_cronograma", {
    p_aluna: alunaId,
    p_modulos: moduloIds,
    p_intervalo: intervaloDias,
    p_inicio: inicio.toISOString(),
  });
  if (error) throw new Error(`cronograma: ${error.message}`);
  return (data as number) ?? 0;
}

/** O mesmo cronograma em várias alunas de uma vez — a turma. */
export async function gerarCronogramaLote(
  alunaIds: string[],
  moduloIds: string[],
  intervaloDias: number,
  inicio: Date,
): Promise<number> {
  const { data, error } = await supabase.rpc("gerar_cronograma_lote", {
    p_alunas: alunaIds,
    p_modulos: moduloIds,
    p_intervalo: intervaloDias,
    p_inicio: inicio.toISOString(),
  });
  if (error) throw new Error(`cronograma: ${error.message}`);
  return (data as number) ?? 0;
}

/** Ajusta uma aula: data nova, ou `null` para abrir agora. */
export async function definirAbertura(
  alunaId: string,
  aulaId: string,
  abreEm: Date | null,
): Promise<void> {
  const { error } = await supabase.rpc("definir_abertura", {
    p_aluna: alunaId,
    p_aula: aulaId,
    p_abre_em: abreEm ? abreEm.toISOString() : null,
  });
  if (error) throw new Error(`abertura: ${error.message}`);
}

/** Tira a aula da aluna. Some da tela dela. */
export async function removerAulaDaAluna(alunaId: string, aulaId: string): Promise<void> {
  const { error } = await supabase.rpc("remover_aula_da_aluna", {
    p_aluna: alunaId,
    p_aula: aulaId,
  });
  if (error) throw new Error(`abertura: ${error.message}`);
}

// ---------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------

export async function criarModulo(titulo: string, numero: number, ordem: number) {
  const { error } = await supabase
    .from("modulos")
    .insert({ titulo: titulo.toUpperCase(), numero, ordem });
  if (error) throw new Error(`criar módulo: ${error.message}`);
}

export async function atualizarModulo(
  id: string,
  patch: Partial<{
    titulo: string;
    intro: string;
    bloqueado_geral: boolean;
    titulo_na_arte: boolean;
  }>,
) {
  const { error } = await supabase.from("modulos").update(patch).eq("id", id);
  if (error) throw new Error(`módulo: ${error.message}`);
}

export async function removerModulo(id: string) {
  const { error } = await supabase.from("modulos").delete().eq("id", id);
  if (error) throw new Error(`remover módulo: ${error.message}`);
}

export async function criarAula(
  moduloId: string,
  titulo: string,
  numero: number,
  ordem: number,
) {
  const { error } = await supabase
    .from("aulas")
    .insert({ modulo_id: moduloId, titulo, numero, ordem });
  if (error) throw new Error(`criar aula: ${error.message}`);
}

export async function atualizarAula(
  id: string,
  patch: Partial<{
    titulo: string;
    numero: number;
    ordem: number;
    bloqueado_geral: boolean;
    capa_path: string | null;
    exercicio: string | null;
  }>,
) {
  const { error } = await supabase.from("aulas").update(patch).eq("id", id);
  if (error) throw new Error(`aula: ${error.message}`);
}

export async function removerAula(id: string) {
  const { error } = await supabase.from("aulas").delete().eq("id", id);
  if (error) throw new Error(`remover aula: ${error.message}`);
}

/**
 * Troca duas aulas de posição numa transação só. As constraints de
 * `numero` são adiáveis justamente para isto — dois UPDATEs separados
 * quebrariam no primeiro.
 */
export async function trocarOrdemDasAulas(
  a: { id: string; numero: number; ordem: number },
  b: { id: string; numero: number; ordem: number },
) {
  const { error } = await supabase.rpc("trocar_ordem_aulas", {
    p_aula_a: a.id,
    p_aula_b: b.id,
  });
  if (error) throw new Error(`reordenar: ${error.message}`);
}

export async function definirMidiaDaAula(
  aulaId: string,
  provider: string,
  ref: string,
): Promise<void> {
  if (!ref) {
    const { error } = await supabase.from("aula_midia").delete().eq("aula_id", aulaId);
    if (error) throw new Error(`mídia: ${error.message}`);
    return;
  }
  const { error } = await supabase
    .from("aula_midia")
    .upsert({ aula_id: aulaId, video_provider: provider, video_ref: ref });
  if (error) throw new Error(`mídia: ${error.message}`);
}

export async function midiaDasAulas(): Promise<Map<string, { provider: string; ref: string }>> {
  const { data, error } = await supabase.from("aula_midia").select("*");
  if (error) throw new Error(`mídia: ${error.message}`);
  return new Map(
    (data ?? []).map((m: { aula_id: string; video_provider: string; video_ref: string }) => [
      m.aula_id,
      { provider: m.video_provider, ref: m.video_ref },
    ]),
  );
}

// ---------------------------------------------------------------------
// Presentes
// ---------------------------------------------------------------------

export async function criarCategoria(titulo: string, ordem: number) {
  const { error } = await supabase.from("categorias").insert({ titulo, ordem });
  if (error) throw new Error(`criar categoria: ${error.message}`);
}

export async function atualizarCategoria(
  id: string,
  patch: Partial<{ titulo: string; destacada: boolean; bloqueada_geral: boolean }>,
) {
  const { error } = await supabase.from("categorias").update(patch).eq("id", id);
  if (error) throw new Error(`categoria: ${error.message}`);
}

export async function removerCategoria(id: string) {
  const { error } = await supabase.from("categorias").delete().eq("id", id);
  if (error) throw new Error(`remover categoria: ${error.message}`);
}

export async function criarPresente(categoriaId: string, titulo: string, ordem: number) {
  const { error } = await supabase
    .from("presentes")
    .insert({ categoria_id: categoriaId, titulo, ordem });
  if (error) throw new Error(`criar presente: ${error.message}`);
}

export async function atualizarPresente(
  id: string,
  patch: Partial<{
    titulo: string;
    descricao: string;
    duracao_texto: string;
    capa_path: string | null;
    categoria_id: string;
    ordem: number;
    bloqueado_geral: boolean;
  }>,
) {
  const { error } = await supabase.from("presentes").update(patch).eq("id", id);
  if (error) throw new Error(`presente: ${error.message}`);
}

export async function removerPresente(id: string) {
  const { error } = await supabase.from("presentes").delete().eq("id", id);
  if (error) throw new Error(`remover presente: ${error.message}`);
}

export async function definirMidiaDoPresente(
  presenteId: string,
  provider: string,
  ref: string,
): Promise<void> {
  if (!ref) {
    const { error } = await supabase
      .from("presente_midia")
      .delete()
      .eq("presente_id", presenteId);
    if (error) throw new Error(`mídia: ${error.message}`);
    return;
  }
  const { error } = await supabase
    .from("presente_midia")
    .upsert({ presente_id: presenteId, video_provider: provider, video_ref: ref });
  if (error) throw new Error(`mídia: ${error.message}`);
}

export async function midiaDosPresentes(): Promise<
  Map<string, { provider: string; ref: string }>
> {
  const { data, error } = await supabase.from("presente_midia").select("*");
  if (error) throw new Error(`mídia: ${error.message}`);
  return new Map(
    (data ?? []).map(
      (m: { presente_id: string; video_provider: string; video_ref: string }) => [
        m.presente_id,
        { provider: m.video_provider, ref: m.video_ref },
      ],
    ),
  );
}

/** Catálogo completo, para o painel. Reaproveita a leitura da aluna. */
export { carregarCatalogo } from "@/data/api";
export type { Catalogo };

// ---------------------------------------------------------------------
// Moderação de comentários
//
// A autoria só sai do banco por aqui. A coluna `autora_id` não é
// concedida ao papel `authenticated`, e a administradora é
// `authenticated` como qualquer aluna — o que a distingue é o papel
// `admin`, que a função confere lá dentro. É o mesmo padrão da mídia e
// das credenciais.
// ---------------------------------------------------------------------

export type ComentarioParaModerar = {
  id: string;
  aulaId: string;
  moduloNumero: number;
  aulaNumero: number;
  autoraId: string;
  autoraNome: string;
  texto: string;
  status: "publicado" | "oculto" | "removido";
  criadoEm: string;
  /** Nulo = comentário de primeiro nível; preenchido = é uma resposta. */
  respostaA: string | null;
  ehInstrutor: boolean;
};

export async function comentariosParaModerar(): Promise<ComentarioParaModerar[]> {
  const { data, error } = await supabase.rpc("comentarios_para_moderacao", { p_aula: null });
  if (error) throw new Error(`comentários: ${error.message}`);
  return (data ?? []).map(
    (c: {
      id: string;
      aula_id: string;
      modulo_numero: number;
      aula_numero: number;
      autora_id: string;
      autora_nome: string;
      texto: string;
      status: ComentarioParaModerar["status"];
      criado_em: string;
      resposta_a: string | null;
      eh_instrutor: boolean;
    }) => ({
      id: c.id,
      aulaId: c.aula_id,
      moduloNumero: c.modulo_numero,
      aulaNumero: c.aula_numero,
      autoraId: c.autora_id,
      autoraNome: c.autora_nome,
      texto: c.texto,
      status: c.status,
      criadoEm: c.criado_em,
      respostaA: c.resposta_a,
      ehInstrutor: c.eh_instrutor,
    }),
  );
}

/**
 * Ocultar tira o comentário da vista das alunas; publicar devolve.
 *
 * Nenhum dos dois apaga a linha — o item (I) do modelo pede histórico
 * preservado, e quem moderou e quando fica gravado. É o que permite
 * desfazer, e é o que responde "quem tirou isso do ar?".
 */
export async function moderarComentario(
  id: string,
  status: ComentarioParaModerar["status"],
): Promise<void> {
  const { error } = await supabase.rpc("moderar_comentario", {
    p_comentario: id,
    p_status: status,
  });
  if (error) throw new Error(`moderar: ${error.message}`);
}

// =====================================================================
// A ficha da aluna
// =====================================================================

export type Ficha = {
  aulasAtribuidas: number;
  aulasAbertas: number;
  aulasConcluidas: number;
  comentarios: number;
  curtidas: number;
  /** Quando ela mexeu numa aula pela última vez. Nulo = nunca abriu. */
  ultimaAtividadeEm: string | null;
  ultimaModulo: number | null;
  ultimaAula: number | null;
  ultimaTitulo: string | null;
};

/**
 * Os números de uma aluna, numa viagem só.
 *
 * Cruza `progresso`, `acessos`, `comentarios` e `curtidas` — tabelas que
 * o navegador não alcança. Quem cruza é o banco, que confere o papel
 * `admin` lá dentro antes de devolver qualquer coisa.
 */
export async function fichaDaAluna(alunaId: string): Promise<Ficha> {
  const { data, error } = await supabase.rpc("ficha_da_aluna", { p_aluna: alunaId });
  if (error) throw new Error(`ficha: ${error.message}`);
  const l = (Array.isArray(data) ? data[0] : data) as {
    aulas_atribuidas: number;
    aulas_abertas: number;
    aulas_concluidas: number;
    comentarios: number;
    curtidas: number;
    ultima_atividade_em: string | null;
    ultima_modulo: number | null;
    ultima_aula: number | null;
    ultima_titulo: string | null;
  } | null;
  return {
    aulasAtribuidas: l?.aulas_atribuidas ?? 0,
    aulasAbertas: l?.aulas_abertas ?? 0,
    aulasConcluidas: l?.aulas_concluidas ?? 0,
    comentarios: l?.comentarios ?? 0,
    curtidas: l?.curtidas ?? 0,
    ultimaAtividadeEm: l?.ultima_atividade_em ?? null,
    ultimaModulo: l?.ultima_modulo ?? null,
    ultimaAula: l?.ultima_aula ?? null,
    ultimaTitulo: l?.ultima_titulo ?? null,
  };
}

export type ComentarioDaAutora = {
  id: string;
  moduloNumero: number;
  aulaNumero: number;
  texto: string;
  status: "publicado" | "oculto" | "removido";
  criadoEm: string;
  ehResposta: boolean;
};

/** O que esta aluna escreveu, do mais recente para o mais antigo. */
export async function comentariosDaAutora(alunaId: string): Promise<ComentarioDaAutora[]> {
  const { data, error } = await supabase.rpc("comentarios_da_autora", { p_aluna: alunaId });
  if (error) throw new Error(`comentários: ${error.message}`);
  return (data ?? []).map(
    (c: {
      id: string;
      modulo_numero: number;
      aula_numero: number;
      texto: string;
      status: ComentarioDaAutora["status"];
      criado_em: string;
      resposta_a: string | null;
    }) => ({
      id: c.id,
      moduloNumero: c.modulo_numero,
      aulaNumero: c.aula_numero,
      texto: c.texto,
      status: c.status,
      criadoEm: c.criado_em,
      ehResposta: c.resposta_a !== null,
    }),
  );
}

/**
 * Corrigir nome, nome de acesso e celular.
 *
 * O nome importa mais do que parece: é ele que as outras alunas veem nos
 * comentários. Cadastrado errado, ficava errado para sempre.
 *
 * A conferência de nome de acesso repetido mora no banco, junto da
 * escrita. Feita aqui, duas colaboradoras salvando ao mesmo tempo
 * poderiam passar as duas.
 */
export async function editarAluna(
  alunaId: string,
  nome: string,
  login: string,
  celular: string,
): Promise<void> {
  const { error } = await supabase.rpc("editar_aluna", {
    p_aluna: alunaId,
    p_nome: nome,
    p_login: login,
    p_celular: celular,
  });
  if (!error) return;
  const conhecidos: Record<string, string> = {
    login_em_uso: "Já existe uma aluna com este nome de acesso.",
    nome_vazio: "Informe o nome da aluna.",
    login_vazio: "Informe o nome de acesso.",
    sem_permissao: "Você não tem permissão para isto.",
    aluna_nao_encontrada: "Esta aluna não existe mais.",
  };
  const chave = Object.keys(conhecidos).find((k) => error.message.includes(k));
  throw new Error(chave ? conhecidos[chave] : `salvar: ${error.message}`);
}

/**
 * Renova o acesso: soma prazo E carimba a renovação, de uma vez só.
 *
 * As duas coisas juntas de propósito. Estendendo sem carimbar, a aluna
 * ganha prazo e não aparece em Renovadas; carimbando sem estender, ela
 * aparece como renovada sem ter ganhado um dia. Numa função só do
 * banco, ou acontecem as duas ou não acontece nenhuma.
 *
 * A data de entrada não é tocada. Renovar não é entrar de novo.
 */
export async function renovarAcesso(alunaId: string, p: Prazo): Promise<string | null> {
  const { data, error } = await supabase.rpc("renovar_acesso", {
    p_aluna: alunaId,
    p_dias: p.dias,
    p_meses: p.meses,
    p_anos: p.anos,
  });
  if (error) {
    if (error.message.includes("prazo_vazio")) throw new Error("Informe quanto tempo renovar.");
    if (error.message.includes("sem_permissao")) throw new Error("Você não tem permissão para isto.");
    throw new Error(`renovar: ${error.message}`);
  }
  return (data as string | null) ?? null;
}

// =====================================================================
// Liberar para a turma inteira
// =====================================================================

export type Liberacao = { liberadas: number; jaTinham: number };

/**
 * Dá esta aula a todas as alunas que ainda não a têm.
 *
 * Quem já tem fica com a data que já tinha. Isso é garantido pelo banco,
 * num `on conflict do nothing` — e não pela intenção de quem clica.
 * Fosse pela intenção, um dia alguém liberaria uma aula para a turma e
 * jogaria todas as datas ajustadas à mão para a mesma data, sem aviso e
 * sem volta.
 *
 * `abreEm` nulo abre agora para quem receber.
 */
export async function liberarAulaParaTodas(
  aulaId: string,
  abreEm: Date | null,
): Promise<Liberacao> {
  const { data, error } = await supabase.rpc("liberar_aula_para_todas", {
    p_aula: aulaId,
    p_abre_em: abreEm ? abreEm.toISOString() : null,
  });
  if (error) throw new Error(`liberar: ${error.message}`);
  const l = (Array.isArray(data) ? data[0] : data) as
    | { liberadas: number; ja_tinham: number }
    | null;
  return { liberadas: l?.liberadas ?? 0, jaTinham: l?.ja_tinham ?? 0 };
}

/** O mesmo para um presente. Quem já o alcança pelo acervo ou pela
 *  categoria não ganha linha nova — seria permissão que não muda nada. */
export async function liberarPresenteParaTodas(presenteId: string): Promise<Liberacao> {
  const { data, error } = await supabase.rpc("liberar_presente_para_todas", {
    p_presente: presenteId,
  });
  if (error) throw new Error(`liberar: ${error.message}`);
  const l = (Array.isArray(data) ? data[0] : data) as
    | { liberados: number; ja_tinham: number }
    | null;
  return { liberadas: l?.liberados ?? 0, jaTinham: l?.ja_tinham ?? 0 };
}

/** "3 alunas receberam. 2 já tinham." — a frase que a tela mostra depois. */
export function resumoDaLiberacao(l: Liberacao, oQue: "aula" | "presente"): string {
  const alvo = oQue === "aula" ? "a aula" : "o presente";
  if (l.liberadas === 0) {
    return l.jaTinham === 0
      ? "Nenhuma aluna cadastrada ainda."
      : `Ninguém recebeu: todas as ${l.jaTinham} já tinham ${alvo}.`;
  }
  const receberam =
    l.liberadas === 1 ? "1 aluna recebeu" : `${l.liberadas} alunas receberam`;
  if (l.jaTinham === 0) return `${receberam}.`;
  return `${receberam}. Outra${l.jaTinham === 1 ? "" : "s"} ${l.jaTinham} já tinha${
    l.jaTinham === 1 ? "" : "m"
  }.`;
}

// =====================================================================
// A equipe
//
// Quem trabalha no painel. Não são alunas: `listarAlunas` filtra por
// `papel = 'aluna'` e nunca os traz.
//
// Só o dono age aqui. As quatro funções abaixo chamam funções do banco
// que conferem `eh_dono()` lá dentro e devolvem em silêncio quando não
// é — a tela esconde os botões, e o banco recusa mesmo assim. As duas
// coisas, não uma.
// =====================================================================

export type Colaborador = {
  id: string;
  nome: string;
  login: string;
  papel: "dono" | "admin" | "suporte";
  status: "ativa" | "bloqueada";
  /**
   * Nulo quando quem está olhando não é o dono.
   *
   * Não é a tela escondendo: a função no banco devolve nulo. Com o
   * código na mão, um administrador entraria como o dono, e a regra de
   * que só o dono mexe na equipe viraria enfeite.
   */
  codigo: string | null;
  criadaEm: string;
  ultimoAcessoEm: string | null;
  /** Quem está olhando. Ninguém remove nem bloqueia a si mesmo. */
  souEu: boolean;
};

export async function listarEquipe(): Promise<Colaborador[]> {
  const { data, error } = await supabase.rpc("equipe_do_painel");
  if (error) throw new Error(`equipe: ${error.message}`);
  return (data ?? []).map(
    (c: {
      id: string;
      nome: string;
      login: string;
      papel: Colaborador["papel"];
      status: Colaborador["status"];
      codigo: string | null;
      criada_em: string;
      ultimo_acesso_em: string | null;
      sou_eu: boolean;
    }) => ({
      id: c.id,
      nome: c.nome,
      login: c.login,
      papel: c.papel,
      status: c.status,
      codigo: c.codigo,
      criadaEm: c.criada_em,
      ultimoAcessoEm: c.ultimo_acesso_em,
      souEu: c.sou_eu,
    }),
  );
}

/**
 * Cria a conta de um colaborador.
 *
 * Passa por Edge Function pelo mesmo motivo que o cadastro de aluna:
 * escrever em `auth.users` exige a chave de serviço, que não pode viver
 * no navegador. A diferença é a porta — ali é a equipe, aqui é só o
 * dono, conferido no banco.
 */
export async function cadastrarColaborador(
  nome: string,
  login: string,
  codigo: string,
  papel: PapelNovo,
): Promise<{ ok: true } | { ok: false; mensagem: string }> {
  const { data: sessao } = await supabase.auth.getSession();
  if (!sessao.session) return { ok: false, mensagem: "Sua sessão expirou. Entre de novo." };

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cadastrar-colaborador`;
  const resposta = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessao.session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ nome, login, codigo, papel }),
  });

  if (resposta.ok) return { ok: true };

  const corpo = await resposta.json().catch(() => ({}));
  return {
    ok: false,
    mensagem: corpo?.mensagem ?? "Não foi possível cadastrar agora.",
  };
}

export async function removerColaborador(id: string): Promise<void> {
  const { error } = await supabase.rpc("remover_colaborador", { p_id: id });
  if (error) throw new Error(`remover: ${error.message}`);
}

export async function bloquearColaborador(
  id: string,
  status: "ativa" | "bloqueada",
): Promise<void> {
  const { error } = await supabase.rpc("bloquear_colaborador", {
    p_id: id,
    p_status: status,
  });
  if (error) throw new Error(`bloquear: ${error.message}`);
}

/**
 * Troca o código de acesso de alguém.
 *
 * Zera a contagem de tentativas erradas e solta a tranca de quinze
 * minutos junto — quem pede código novo costuma ser exatamente quem
 * acabou de errar cinco vezes, e o código novo não adiantaria nada até
 * o relógio virar.
 */
export async function mudarCodigo(id: string, codigo: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("mudar_codigo", {
    p_id: id,
    p_codigo: codigo,
  });
  if (error) throw new Error(`código: ${error.message}`);
  return data === true;
}

/** "Suporte", "Administrador", "Dono" — o papel como se fala. */
export function nomeDoPapel(p: Colaborador["papel"]): string {
  return NOME_DO_PAPEL[p];
}

// =====================================================================
// Responder um comentário, de dentro do painel
// =====================================================================

/**
 * Responde um comentário sem sair da aba.
 *
 * A resposta entra como qualquer outra: mesma tabela, `resposta_a`
 * apontando para a raiz, `nome_visivel` no padrão — que é verdadeiro.
 * Por isso ela sai assinada com o nome real de quem respondeu, e é
 * assim que a aluna a vê. Não há como responder anonimamente daqui, e é
 * de propósito: uma resposta da equipe sem nome é pior que nenhuma.
 *
 * Quem confere se a resposta vale é o banco. Ela tem de apontar para um
 * comentário publicado, da mesma aula, que não seja ele próprio uma
 * resposta — `pode_responder()`. Não existe segundo nível, e mudar o
 * pedido daqui não cria um.
 */
export async function responderComentario(
  aulaId: string,
  respostaA: string,
  texto: string,
): Promise<void> {
  const { data: sessao } = await supabase.auth.getUser();
  if (!sessao.user) throw new Error("sem sessão");

  const { error } = await supabase.from("comentarios").insert({
    aula_id: aulaId,
    autora_id: sessao.user.id,
    texto,
    posicao_segundos: 0,
    resposta_a: respostaA,
  });
  if (error) throw new Error(`responder: ${error.message}`);
}
