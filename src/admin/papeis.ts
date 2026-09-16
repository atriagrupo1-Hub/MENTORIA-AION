/**
 * Os papéis, num lugar só.
 *
 * Havia um papel — `admin` — e a tela perguntava `papel === "admin"` em
 * dois lugares. Agora são quatro valores e três perguntas diferentes, e
 * espalhar isso pelos componentes é como se erra: um `=== "admin"`
 * esquecido num canto tranca o dono para fora do próprio painel.
 *
 * Nada aqui decide coisa alguma de verdade. Quem decide é o banco, por
 * `eh_dono()`, `eh_admin()` e `eh_equipe()` — as mesmas três perguntas,
 * escritas lá. Estas funções existem só para a tela não oferecer um
 * botão que o banco vai recusar.
 */

export type Papel = "aluna" | "dono" | "admin" | "suporte";

/** O papel escrito como se fala. */
export const NOME_DO_PAPEL: Record<Exclude<Papel, "aluna">, string> = {
  dono: "Dono",
  admin: "Administrador",
  suporte: "Suporte",
};

/** Os dois papéis que o dono pode criar. */
export const PAPEIS_QUE_SE_CRIA = ["suporte", "admin"] as const;
export type PapelNovo = (typeof PAPEIS_QUE_SE_CRIA)[number];

/** Trabalha aqui: abre o painel. */
export function ehEquipe(papel: Papel | undefined): boolean {
  return papel === "dono" || papel === "admin" || papel === "suporte";
}

/** Faz tudo no painel, menos mexer na equipe. */
export function ehAdmin(papel: Papel | undefined): boolean {
  return papel === "dono" || papel === "admin";
}

/** Manda. Só ele mexe na equipe. */
export function ehDono(papel: Papel | undefined): boolean {
  return papel === "dono";
}
