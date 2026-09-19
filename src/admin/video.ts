/**
 * Leitura de endereço de vídeo.
 *
 * Vive num módulo próprio porque três telas do painel precisam dela —
 * as aulas, os presentes e o editor universal de conteúdo. Deixá-la em
 * `AbaConteudo` fazia o editor importar a aba e a aba importar o
 * editor: um ciclo que hoje funciona por acidente de içamento, e que
 * para de funcionar no dia em que alguém trocar a declaração por uma
 * constante.
 */

/** Extrai o identificador do vídeo a partir de um link ou do próprio id. */
export function idDoVideo(entrada: string): string {
  const s = String(entrada).trim();
  if (!s) return "";
  const comQuery = s.match(/[?&]v=([\w-]{6,})/);
  if (comQuery) return comQuery[1];
  const curto =
    s.match(/youtu\.be\/([\w-]{6,})/) ??
    s.match(/embed\/([\w-]{6,})/) ??
    s.match(/videodelivery\.net\/([\w-]{6,})/) ??
    s.match(/cloudflarestream\.com\/([\w-]{6,})/);
  if (curto) return curto[1];
  if (/^[\w-]{6,}$/.test(s)) return s;
  return "";
}

/** O provedor é deduzido do link. Sem link reconhecível, Cloudflare Stream. */
export function provedorDoLink(entrada: string): string {
  const s = entrada.toLowerCase();
  if (s.includes("youtu")) return "youtube";
  if (s.includes("vimeo")) return "vimeo";
  return "stream";
}
