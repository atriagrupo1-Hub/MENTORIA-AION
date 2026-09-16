/**
 * O celular da aluna: guardar, mostrar e chamar no WhatsApp.
 *
 * No banco vai só o número, sem parênteses nem traço. Guardar formatado
 * faria "(11) 98765-4321" e "11987654321" virarem dois números
 * diferentes na hora de procurar — e o WhatsApp não aceita pontuação
 * de qualquer jeito.
 */

/** Tira tudo que não é número. É o que vai para o banco. */
export function soDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

/**
 * Como a colaboradora lê: (11) 98765-4321.
 *
 * Número brasileiro tem 10 ou 11 dígitos com DDD — 11 quando é celular,
 * que começa com 9. Fora desse feitio, devolve como está: pode ser um
 * número de fora, e inventar um formato brasileiro para ele deixaria a
 * tela mentindo sobre o que está guardado.
 */
export function formatar(celular: string | null): string {
  const d = soDigitos(celular ?? "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return celular ?? "";
}

/**
 * Formata enquanto a pessoa digita, sem atrapalhar.
 *
 * Parar de formatar acima de 11 dígitos é de propósito: quem cola um
 * número com o código do país — 5511987654321 — veria o formato
 * brasileiro se desmanchar no meio da digitação, e ia achar que o campo
 * estragou o número.
 */
export function formatarDigitando(texto: string): string {
  const d = soDigitos(texto).slice(0, 15);
  if (d.length > 11) return d;
  if (d.length > 7) return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
  if (d.length > 2) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length > 0) return `(${d}`;
  return "";
}

/**
 * O endereço que abre a conversa no WhatsApp.
 *
 * O 55 entra quando o número tem só DDD e número, que é como quase toda
 * brasileira digita. Já vindo com o código do país — 13 dígitos, ou
 * qualquer coisa fora do feitio nacional — passa intacto: acrescentar
 * 55 ali produziria um número que não existe.
 *
 * Nulo quer dizer que não dá para chamar, e a tela não deve mostrar o
 * botão. Melhor ausente que levando a uma conversa vazia com um número
 * errado.
 */
export function linkWhatsApp(celular: string | null, mensagem?: string): string | null {
  const d = soDigitos(celular ?? "");
  if (d.length < 10) return null;
  const numero = d.length === 10 || d.length === 11 ? `55${d}` : d;
  const texto = mensagem?.trim() ? `?text=${encodeURIComponent(mensagem.trim())}` : "";
  return `https://wa.me/${numero}${texto}`;
}
