/**
 * Edge Function `video-assinado`
 *
 * Entrega o endereço de um vídeo — assinado, e de curta duração.
 *
 * O problema que ela resolve: sem assinatura, o endereço do Cloudflare
 * Stream é permanente. A aluna copia o link da barra do navegador,
 * manda no WhatsApp, e quem receber assiste — sem login, sem liberação,
 * sem prazo. A conferência que o banco faz protege quem DESCOBRE a
 * referência; não protege a referência depois de vazada.
 *
 * Com assinatura, o endereço vale poucos minutos e só para quem o
 * pediu. Vazado, morre sozinho.
 *
 * A autoridade continua sendo o banco, não esta função. Ela chama
 * `video_da_aula()` COM O TOKEN DA ALUNA, e não com a chave de serviço:
 * assim `auth.uid()` é ela, e todas as regras já provadas valem —
 * publicação, bloqueio geral, conta ativa, prazo de acesso e a data do
 * cronograma. Sem liberação, o banco não devolve a referência, e esta
 * função não tem o que assinar.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const URL_SUPABASE = Deno.env.get("SUPABASE_URL")!;
const CHAVE_ANONIMA = Deno.env.get("SUPABASE_ANON_KEY")!;

/** Identificador da chave de assinatura, criado no painel do Stream. */
const CHAVE_ID = Deno.env.get("STREAM_CHAVE_ID") ?? "";

/** A chave privada, em JWK base64 — como o Cloudflare a entrega. */
const CHAVE_JWK = Deno.env.get("STREAM_CHAVE_JWK") ?? "";

/** Quanto tempo o endereço vale. Curto de propósito. */
const MINUTOS_DE_VALIDADE = Number(Deno.env.get("STREAM_MINUTOS") ?? "120");

const ORIGENS = (Deno.env.get("ORIGENS_PERMITIDAS") ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function cabecalhosCors(origem: string | null): Record<string, string> {
  const permitida = ORIGENS.length === 0
    ? (origem ?? "*")
    : ORIGENS.includes(origem ?? "")
      ? origem!
      : ORIGENS[0];
  return {
    "Access-Control-Allow-Origin": permitida,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function resposta(corpo: unknown, status: number, origem: string | null): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: {
      ...cabecalhosCors(origem),
      "Content-Type": "application/json",
      // Endereço assinado é de uso único e curto: guardar em cache
      // intermediário serviria justamente para ele ser reaproveitado.
      "Cache-Control": "no-store",
    },
  });
}

/** base64url sem padding, como o JWT exige. */
function base64url(dados: Uint8Array | string): string {
  const bytes = typeof dados === "string" ? new TextEncoder().encode(dados) : dados;
  let bruto = "";
  for (const b of bytes) bruto += String.fromCharCode(b);
  return btoa(bruto).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Assina o token de reprodução do Stream.
 *
 * O Cloudflare aceita, no lugar do identificador do vídeo, um JWT
 * assinado com a chave da conta. `sub` é o vídeo, `exp` é o fim da
 * validade, e `kid` diz qual chave conferir.
 */
async function assinar(uid: string): Promise<string> {
  const jwk = JSON.parse(atob(CHAVE_JWK));

  const chave = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const agora = Math.floor(Date.now() / 1000);
  const cabecalho = { alg: "RS256", kid: CHAVE_ID };
  const conteudo = {
    sub: uid,
    kid: CHAVE_ID,
    exp: agora + MINUTOS_DE_VALIDADE * 60,
    // Um minuto de folga para trás: relógios de servidor não batem ao
    // segundo, e um `nbf` no futuro recusaria o próprio token recém-feito.
    nbf: agora - 60,
  };

  const corpo = `${base64url(JSON.stringify(cabecalho))}.${base64url(JSON.stringify(conteudo))}`;
  const assinatura = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    chave,
    new TextEncoder().encode(corpo),
  );

  return `${corpo}.${base64url(new Uint8Array(assinatura))}`;
}

Deno.serve(async (req) => {
  const origem = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cabecalhosCors(origem) });
  }
  if (req.method !== "POST") {
    return resposta({ erro: "metodo_nao_permitido" }, 405, origem);
  }

  const autorizacao = req.headers.get("Authorization") ?? "";
  if (!autorizacao.startsWith("Bearer ")) {
    return resposta({ erro: "sem_sessao" }, 401, origem);
  }

  let aulaId = "";
  let presenteId = "";
  let aoVivoId = "";
  try {
    const corpo = await req.json();
    aulaId = String(corpo?.aulaId ?? "");
    presenteId = String(corpo?.presenteId ?? "");
    aoVivoId = String(corpo?.aoVivoId ?? "");
  } catch {
    return resposta({ erro: "corpo_invalido" }, 400, origem);
  }

  const alvos = [aulaId, presenteId, aoVivoId].filter(Boolean);
  if (alvos.length !== 1) {
    return resposta({ erro: "alvo_invalido" }, 400, origem);
  }

  // Cliente COM O TOKEN DA ALUNA. É o ponto central desta função: quem
  // decide se ela pode ver continua sendo o banco, com as regras que já
  // estão provadas em teste.
  const comoAluna = createClient(URL_SUPABASE, CHAVE_ANONIMA, {
    global: { headers: { Authorization: autorizacao } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const chamada = aulaId
    ? comoAluna.rpc("video_da_aula", { p_aula: aulaId })
    : presenteId
      ? comoAluna.rpc("video_do_presente", { p_presente: presenteId })
      : comoAluna.rpc("video_da_ao_vivo", { p_ao_vivo: aoVivoId });

  const { data, error } = await chamada;

  if (error) {
    console.error("falha ao consultar a midia", error.message);
    return resposta({ erro: "indisponivel" }, 503, origem);
  }

  const linha = Array.isArray(data) ? data[0] : data;
  if (!linha?.ref) {
    // Sem liberação, ou sem mídia cadastrada. A resposta é a mesma nos
    // dois casos, de propósito: não se diz a ninguém que o vídeo existe
    // mas está fechado para ela.
    return resposta({ erro: "sem_acesso" }, 403, origem);
  }

  const provedor = String(linha.provider);
  const ref = String(linha.ref);

  // Vimeo e YouTube não passam por aqui: não têm assinatura, e o
  // endereço deles é o que é. Ficam como saída de emergência, e é por
  // isso que o conteúdo pago mora no Stream.
  if (provedor !== "stream") {
    return resposta({ provedor, ref, assinado: false }, 200, origem);
  }

  if (!CHAVE_ID || !CHAVE_JWK) {
    // Sem chave configurada, entrega o uid como antes. Deixa o site
    // funcionar enquanto a chave não existe, sem fingir que assinou.
    console.warn("chave de assinatura ausente; devolvendo uid sem assinar");
    return resposta({ provedor, ref, assinado: false }, 200, origem);
  }

  try {
    const token = await assinar(ref);
    return resposta(
      { provedor, ref: token, assinado: true, validoPor: MINUTOS_DE_VALIDADE * 60 },
      200,
      origem,
    );
  } catch (falha) {
    console.error("falha ao assinar", falha instanceof Error ? falha.message : falha);
    return resposta({ erro: "indisponivel" }, 503, origem);
  }
});
