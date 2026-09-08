import { createClient } from "@supabase/supabase-js";

/**
 * Cliente do Supabase.
 *
 * A chave usada aqui é a publicável: ela existe para rodar no navegador
 * e não concede nada por si só — quem decide o que cada conta alcança é
 * a RLS do banco. A chave de serviço nunca chega ao front; vive apenas
 * dentro da Edge Function `entrar`.
 *
 * `persistSession` guarda a sessão no navegador. É o que o item 8 do
 * README do handoff permite: sessão e posição recente do vídeo, como
 * cache descartável. Nenhuma decisão de acesso sai daí.
 */

const URL_SUPABASE = import.meta.env.VITE_SUPABASE_URL;
const CHAVE_PUBLICA = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!URL_SUPABASE || !CHAVE_PUBLICA) {
  throw new Error(
    "Faltam VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY. Copie .env.exemplo para .env e preencha.",
  );
}

export const supabase = createClient(URL_SUPABASE, CHAVE_PUBLICA, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "aion-sessao",
  },
});

export const enderecoEntrar = `${URL_SUPABASE}/functions/v1/entrar`;
export const chavePublica = CHAVE_PUBLICA;
