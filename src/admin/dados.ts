import { supabase } from "@/data/supabase";
import type { Catalogo } from "@/data/tipos";

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
  /** Quando a aluna foi cadastrada. É a base de contagem do prazo. */
  criadaEm: string;
  /** Fim do acesso. Nulo quer dizer sem prazo. */
  acessoAte: string | null;
  acessos: string[];
};

export async function listarAlunas(): Promise<AlunaAdmin[]> {
  const [perfis, credenciais, acessos] = await Promise.all([
    supabase.from("profiles").select("*").eq("papel", "aluna").order("nome"),
    supabase.from("credenciais").select("aluna_id, codigo"),
    supabase.from("acessos").select("aluna_id, escopo, aula_id, modulo_id"),
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

  const porAluna = new Map<string, string[]>();
  for (const a of (acessos.data ?? []) as Array<{
    aluna_id: string;
    escopo: string;
    aula_id: string | null;
  }>) {
    if (a.escopo !== "aula" || !a.aula_id) continue;
    const lista = porAluna.get(a.aluna_id) ?? [];
    lista.push(a.aula_id);
    porAluna.set(a.aluna_id, lista);
  }

  return (perfis.data ?? []).map(
    (p: {
      id: string;
      nome: string;
      login: string;
      status: "ativa" | "bloqueada";
      criada_em: string;
      acesso_ate: string | null;
    }) => ({
      id: p.id,
      nome: p.nome,
      login: p.login,
      codigo: codigos.get(p.id) ?? "",
      status: p.status,
      criadaEm: p.criada_em,
      acessoAte: p.acesso_ate,
      acessos: porAluna.get(p.id) ?? [],
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
 * Ritmo de liberação — a regra geral, uma só para todas.
 *
 * A contagem, essa é individual: parte de `criada_em` de cada aluna. A
 * tabela tem linha única (a chave é um booleano que só aceita `true`),
 * então não existe o caso "qual das configurações vale?".
 */
export type Ritmo = "imediato" | "por_dias" | "por_conclusao" | "aulas_por_semana";

export type Configuracao = {
  ritmo: Ritmo;
  ritmoDias: number;
  aulasPorSemana: number;
};

export const CONFIGURACAO_PADRAO: Configuracao = {
  ritmo: "imediato",
  ritmoDias: 15,
  aulasPorSemana: 2,
};

export async function carregarConfiguracao(): Promise<Configuracao> {
  const { data, error } = await supabase
    .from("configuracoes")
    .select("ritmo, ritmo_dias, aulas_por_semana")
    .maybeSingle();
  if (error) throw new Error(`configuração: ${error.message}`);
  if (!data) return CONFIGURACAO_PADRAO;
  return {
    ritmo: data.ritmo as Ritmo,
    ritmoDias: data.ritmo_dias,
    aulasPorSemana: data.aulas_por_semana,
  };
}

export async function salvarConfiguracao(c: Configuracao): Promise<void> {
  const { error } = await supabase
    .from("configuracoes")
    .update({
      ritmo: c.ritmo,
      ritmo_dias: c.ritmoDias,
      aulas_por_semana: c.aulasPorSemana,
      atualizada_em: new Date().toISOString(),
    })
    .eq("id", true);
  if (error) throw new Error(`configuração: ${error.message}`);
}

export async function cadastrarAluna(
  nome: string,
  login: string,
  codigo: string,
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
    body: JSON.stringify({ nome, login, codigo }),
  });

  if (resposta.ok) return { ok: true };

  const corpo = await resposta.json().catch(() => ({}));
  return {
    ok: false,
    mensagem: corpo?.mensagem ?? "Não foi possível cadastrar a aluna agora.",
  };
}

export async function definirStatus(
  alunaId: string,
  status: "ativa" | "bloqueada",
): Promise<void> {
  const { error } = await supabase.from("profiles").update({ status }).eq("id", alunaId);
  if (error) throw new Error(`bloquear: ${error.message}`);
}

export async function removerAluna(alunaId: string): Promise<void> {
  // A cascata de `profiles` leva acessos, progresso, curtidas e
  // comentários junto. A linha de `auth.users` fica; removê-la exige a
  // chave de serviço, e a conta sem perfil não entra em lugar nenhum.
  const { error } = await supabase.from("profiles").delete().eq("id", alunaId);
  if (error) throw new Error(`remover: ${error.message}`);
}

/**
 * Substitui as liberações de uma aluna pelas escolhidas no painel.
 * Apaga e reinsere: é o que mantém a lista igual ao que a tela mostra.
 */
export async function salvarAcessos(alunaId: string, aulaIds: string[]): Promise<void> {
  const apagou = await supabase.from("acessos").delete().eq("aluna_id", alunaId);
  if (apagou.error) throw new Error(`acessos: ${apagou.error.message}`);

  if (aulaIds.length === 0) return;

  const inserir = await supabase.from("acessos").insert(
    aulaIds.map((aulaId) => ({ aluna_id: alunaId, escopo: "aula", aula_id: aulaId })),
  );
  if (inserir.error) throw new Error(`acessos: ${inserir.error.message}`);
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
  patch: Partial<{ titulo: string; numero: number; ordem: number; bloqueado_geral: boolean; capa_path: string | null }>,
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
