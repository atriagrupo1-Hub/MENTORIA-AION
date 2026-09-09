import { chavePublica, enderecoEntrar, supabase } from "./supabase";
import type { Catalogo, Categoria, Modulo, Presente } from "./tipos";

/**
 * Toda a conversa com o Supabase passa por aqui.
 *
 * Regra do item 8 do README do handoff: o banco é a única autoridade
 * sobre autenticação, liberações, bloqueios e progresso. Nenhuma função
 * deste arquivo decide acesso — todas perguntam. Falhando a resposta, o
 * chamador mostra erro e não concede nada.
 */

export type FalhaLogin = {
  status: number;
  erro: string;
  mensagem: string;
};

export type PerfilSessao = {
  id: string;
  nome: string;
  login: string;
  papel: "aluna" | "admin";
  status: "ativa" | "bloqueada";
  primeiroAcessoEm: string | null;
  criadaEm: string;
  /** Fim do acesso. Nulo quer dizer sem prazo. */
  acessoAte: string | null;
};

/** Chama a Edge Function `entrar` e guarda a sessão devolvida. */
export async function entrar(
  login: string,
  codigo: string,
): Promise<{ ok: true } | { ok: false; falha: FalhaLogin }> {
  let resposta: Response;
  try {
    resposta = await fetch(enderecoEntrar, {
      method: "POST",
      headers: { apikey: chavePublica, "Content-Type": "application/json" },
      body: JSON.stringify({ login, codigo }),
    });
  } catch {
    return {
      ok: false,
      falha: {
        status: 0,
        erro: "sem_conexao",
        mensagem: "Não conseguimos falar com o servidor. Confira sua conexão e tente de novo.",
      },
    };
  }

  const corpo = await resposta.json().catch(() => ({}));

  if (!resposta.ok || !corpo?.access_token) {
    return {
      ok: false,
      falha: {
        status: resposta.status,
        erro: corpo?.erro ?? "indisponivel",
        mensagem:
          corpo?.mensagem ??
          "Não foi possível entrar agora. Tente de novo em alguns instantes.",
      },
    };
  }

  const { error } = await supabase.auth.setSession({
    access_token: corpo.access_token,
    refresh_token: corpo.refresh_token,
  });

  if (error) {
    return {
      ok: false,
      falha: {
        status: 500,
        erro: "sessao_invalida",
        mensagem: "Não foi possível abrir sua sessão. Tente de novo.",
      },
    };
  }

  return { ok: true };
}

export async function sair(): Promise<void> {
  await supabase.auth.signOut();
}

export async function temSessao(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}

/** Perfil de quem está logada. Vem por função, nunca da tabela direto. */
export async function meuPerfil(): Promise<PerfilSessao | null> {
  const { data, error } = await supabase.rpc("meu_perfil");
  if (error) throw new Error(`meu_perfil: ${error.message}`);
  const linha = Array.isArray(data) ? data[0] : data;
  if (!linha) return null;
  return {
    id: linha.id,
    nome: linha.nome,
    login: linha.login,
    papel: linha.papel,
    status: linha.status,
    primeiroAcessoEm: linha.primeiro_acesso_em,
    criadaEm: linha.criada_em,
    acessoAte: linha.acesso_ate,
  };
}

type LinhaModulo = {
  id: string;
  numero: number;
  titulo: string;
  intro: string | null;
  capa_path: string | null;
  cor_destaque: string | null;
  ordem: number;
  bloqueado_geral: boolean;
  titulo_na_arte: boolean;
};

type LinhaAula = {
  id: string;
  modulo_id: string;
  numero: number;
  titulo: string;
  ordem: number;
  duracao_segundos: number | null;
  capa_path: string | null;
  bloqueado_geral: boolean;
};

type LinhaCategoria = {
  id: string;
  titulo: string;
  ordem: number;
  destacada: boolean;
  bloqueada_geral: boolean;
};

type LinhaPresente = {
  id: string;
  categoria_id: string;
  titulo: string;
  descricao: string | null;
  duracao_texto: string | null;
  capa_path: string | null;
  ordem: number;
  bloqueado_geral: boolean;
};

/**
 * Catálogo inteiro, incluindo o que a aluna ainda não tem liberado — as
 * telas mostram módulo bloqueado com capa e título, e a liberação vem
 * separada, de `minhasAulas()`. Nenhum endereço de vídeo vem junto: a
 * mídia mora em tabela própria, fechada, e sai só por função.
 */
/**
 * Situação de cada módulo para a aluna que está logada.
 *
 * Só vêm os módulos em que ela tem alguma aula atribuída. Módulo
 * ausente desta lista é módulo oculto — a tela não desenha. Com
 * `abertas = 0` e uma `proximaAbertura`, é o "libera em breve".
 */
export type ModuloDaAluna = {
  moduloId: string;
  atribuidas: number;
  abertas: number;
  proximaAbertura: string | null;
};

export async function meusModulos(): Promise<Map<string, ModuloDaAluna>> {
  const { data, error } = await supabase.rpc("meus_modulos");
  if (error) throw new Error(`meus_modulos: ${error.message}`);
  const mapa = new Map<string, ModuloDaAluna>();
  for (const l of (data ?? []) as Array<{
    modulo_id: string;
    atribuidas: number;
    abertas: number;
    proxima_abertura: string | null;
  }>) {
    mapa.set(l.modulo_id, {
      moduloId: l.modulo_id,
      atribuidas: l.atribuidas,
      abertas: l.abertas,
      proximaAbertura: l.proxima_abertura,
    });
  }
  return mapa;
}

export async function carregarCatalogo(): Promise<Catalogo> {
  const [modulos, aulas, categorias, presentes, aoVivo] = await Promise.all([
    supabase.from("modulos").select("*").order("ordem"),
    supabase.from("aulas").select("*").order("ordem"),
    supabase.from("categorias").select("*").order("ordem"),
    supabase.from("presentes").select("*").order("ordem"),
    supabase.from("aulas_ao_vivo").select("*"),
  ]);

  for (const r of [modulos, aulas, categorias, presentes, aoVivo]) {
    if (r.error) throw new Error(`catálogo: ${r.error.message}`);
  }

  const porModulo = new Map<string, LinhaAula[]>();
  for (const a of (aulas.data ?? []) as LinhaAula[]) {
    const lista = porModulo.get(a.modulo_id) ?? [];
    lista.push(a);
    porModulo.set(a.modulo_id, lista);
  }

  const listaModulos: Modulo[] = ((modulos.data ?? []) as LinhaModulo[]).map((m) => ({
    id: m.id,
    numero: m.numero,
    titulo: m.titulo,
    intro: m.intro ?? "",
    ordem: m.ordem,
    bloqueadoGeral: m.bloqueado_geral,
    tituloNaArte: m.titulo_na_arte,
    aulas: (porModulo.get(m.id) ?? [])
      .sort((x, y) => x.ordem - y.ordem)
      .map((a) => ({
        id: a.id,
        moduloId: a.modulo_id,
        numero: a.numero,
        titulo: a.titulo,
        ordem: a.ordem,
        duracaoSegundos: a.duracao_segundos,
        videoProvider: null,
        videoRef: null,
        materialPath: null,
        capaPath: a.capa_path,
        bloqueadoGeral: a.bloqueado_geral,
      })),
  }));

  const porCategoria = new Map<string, LinhaPresente[]>();
  for (const p of (presentes.data ?? []) as LinhaPresente[]) {
    const lista = porCategoria.get(p.categoria_id) ?? [];
    lista.push(p);
    porCategoria.set(p.categoria_id, lista);
  }

  const listaCategorias: Categoria[] = ((categorias.data ?? []) as LinhaCategoria[]).map(
    (c) => ({
      id: c.id,
      titulo: c.titulo,
      ordem: c.ordem,
      destacada: c.destacada,
      bloqueadaGeral: c.bloqueada_geral,
      presentes: (porCategoria.get(c.id) ?? [])
        .sort((x, y) => x.ordem - y.ordem)
        .map(
          (p): Presente => ({
            id: p.id,
            categoriaId: p.categoria_id,
            titulo: p.titulo,
            descricao: p.descricao ?? "",
            duracaoTexto: p.duracao_texto ?? "",
            capaPath: p.capa_path,
            videoProvider: null,
            videoRef: null,
            ordem: p.ordem,
            bloqueadoGeral: p.bloqueado_geral,
          }),
        ),
    }),
  );

  const mapaAoVivo: Catalogo["aoVivo"] = {};
  for (const v of (aoVivo.data ?? []) as Array<{
    id: string;
    modulo_id: string;
    quando_texto: string | null;
    liberada: boolean;
  }>) {
    mapaAoVivo[v.modulo_id] = {
      moduloId: v.modulo_id,
      quandoTexto: v.quando_texto,
      liberada: v.liberada,
    };
  }

  return { modulos: listaModulos, categorias: listaCategorias, aoVivo: mapaAoVivo };
}

export type AulaLiberada = {
  aulaId: string;
  posicaoSegundos: number;
  concluida: boolean;
  duracaoSegundos: number | null;
};

/**
 * O que a aluna pode ver, decidido pelo banco numa consulta só.
 * O aplicativo não recalcula liberação — apenas lê esta lista.
 */
export async function minhasAulas(): Promise<AulaLiberada[]> {
  const { data, error } = await supabase.rpc("minhas_aulas");
  if (error) throw new Error(`minhas_aulas: ${error.message}`);
  return (data ?? []).map(
    (l: {
      aula_id: string;
      posicao_segundos: number;
      concluida: boolean;
      duracao_segundos: number | null;
    }) => ({
      aulaId: l.aula_id,
      posicaoSegundos: l.posicao_segundos,
      concluida: l.concluida,
      duracaoSegundos: l.duracao_segundos,
    }),
  );
}

/** Presentes liberados: a decisão é do banco, uma pergunta por presente. */
export async function presentesLiberados(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const respostas = await Promise.all(
    ids.map(async (id) => {
      const { data, error } = await supabase.rpc("pode_ver_presente", { p_presente: id });
      if (error) return [id, false] as const;
      return [id, Boolean(data)] as const;
    }),
  );
  return new Set(respostas.filter(([, pode]) => pode).map(([id]) => id));
}

export async function curtidas(): Promise<Set<string>> {
  const { data, error } = await supabase.from("curtidas").select("aula_id");
  if (error) throw new Error(`curtidas: ${error.message}`);
  return new Set((data ?? []).map((c: { aula_id: string }) => c.aula_id));
}

export type ComentarioPublico = {
  id: string;
  aulaId: string;
  texto: string;
  posicaoSegundos: number;
  criadoEm: string;
  minha: boolean;
};

/**
 * Comentários de uma aula. A view não traz autoria — o anonimato é
 * privilégio de coluna no banco, não escolha da tela. `meus_comentarios`
 * diz quais são da própria aluna, para ela poder editar e remover.
 */
export async function comentariosDaAula(aulaId: string): Promise<ComentarioPublico[]> {
  const [publicos, meus] = await Promise.all([
    supabase
      .from("comentarios_publicos")
      .select("*")
      .eq("aula_id", aulaId)
      .order("criado_em", { ascending: false }),
    supabase.rpc("meus_comentarios", { p_aula: aulaId }),
  ]);

  if (publicos.error) throw new Error(`comentarios: ${publicos.error.message}`);

  const meusIds = new Set(
    (meus.data ?? []).map((c: { id: string }) => c.id),
  );

  return (publicos.data ?? []).map(
    (c: {
      id: string;
      aula_id: string;
      texto: string;
      posicao_segundos: number;
      criado_em: string;
    }) => ({
      id: c.id,
      aulaId: c.aula_id,
      texto: c.texto,
      posicaoSegundos: c.posicao_segundos,
      criadoEm: c.criado_em,
      minha: meusIds.has(c.id),
    }),
  );
}

export async function comentar(
  aulaId: string,
  texto: string,
  posicaoSegundos: number,
): Promise<void> {
  const { data: sessao } = await supabase.auth.getUser();
  if (!sessao.user) throw new Error("sem sessão");
  const { error } = await supabase.from("comentarios").insert({
    aula_id: aulaId,
    autora_id: sessao.user.id,
    texto,
    posicao_segundos: Math.round(posicaoSegundos),
  });
  if (error) throw new Error(`comentar: ${error.message}`);
}

export async function removerMeuComentario(id: string): Promise<void> {
  const { error } = await supabase.rpc("remover_meu_comentario", { p_comentario: id });
  if (error) throw new Error(`remover comentário: ${error.message}`);
}

export async function salvarPosicao(aulaId: string, segundos: number): Promise<void> {
  const { error } = await supabase.rpc("salvar_posicao", {
    p_aula: aulaId,
    p_segundos: Math.round(segundos),
  });
  if (error) throw new Error(`salvar posição: ${error.message}`);
}

export async function marcarConcluida(aulaId: string, concluida: boolean): Promise<void> {
  const { error } = await supabase.rpc("marcar_concluida", {
    p_aula: aulaId,
    p_concluida: concluida,
  });
  if (error) throw new Error(`marcar concluída: ${error.message}`);
}

export async function alternarCurtida(aulaId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("alternar_curtida", { p_aula: aulaId });
  if (error) throw new Error(`curtir: ${error.message}`);
  return Boolean(data);
}

export async function registrarDuracao(aulaId: string, segundos: number): Promise<void> {
  await supabase.rpc("registrar_duracao", {
    p_aula: aulaId,
    p_segundos: Math.round(segundos),
  });
}

export type Video = { provider: string; ref: string };

/**
 * Endereço do vídeo. Só sai do servidor depois de conferida a liberação;
 * a tabela de mídia é fechada à aluna.
 */
export async function videoDaAula(aulaId: string): Promise<Video | null> {
  const { data, error } = await supabase.rpc("video_da_aula", { p_aula: aulaId });
  if (error) return null;
  const linha = Array.isArray(data) ? data[0] : data;
  return linha ? { provider: linha.provider, ref: linha.ref } : null;
}

export async function videoDoPresente(presenteId: string): Promise<Video | null> {
  const { data, error } = await supabase.rpc("video_do_presente", {
    p_presente: presenteId,
  });
  if (error) return null;
  const linha = Array.isArray(data) ? data[0] : data;
  return linha ? { provider: linha.provider, ref: linha.ref } : null;
}

/**
 * Endereço para embutir o player, a partir do par provedor + referência.
 *
 * Trocar de serviço é trocar o `video_provider` das linhas de mídia — o
 * resto do aplicativo não muda. `stream` é o Cloudflare Stream, que é a
 * hospedagem decidida; `youtube` só existe para conteúdo herdado.
 */
export function enderecoDoVideo(video: Video): string {
  const opcoes = "autoplay=1&playsinline=1";
  switch (video.provider) {
    case "stream":
      return `https://iframe.videodelivery.net/${video.ref}?${opcoes}`;
    case "vimeo":
      return `https://player.vimeo.com/video/${video.ref}?${opcoes}`;
    case "youtube":
      return `https://www.youtube.com/embed/${video.ref}?${opcoes}&rel=0`;
    default:
      return "";
  }
}

/** Endereço público de uma capa no depósito `capas`. */
export function urlDaCapa(caminho: string | null): string | null {
  if (!caminho) return null;
  const { data } = supabase.storage.from("capas").getPublicUrl(caminho);
  return data.publicUrl;
}
