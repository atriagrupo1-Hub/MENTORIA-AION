import { urlDaCapa } from "@/data/api";
import { cores } from "@/design/tokens";

/**
 * Capa com proporção mantida e fundo de reserva em degradê.
 * Item 10 do README: a imagem nunca deixa espaço vazio ao falhar.
 */
export function Capa({
  caminhos,
  alt,
  opacidade = 1,
  className = "",
  style,
}: {
  caminhos: string[];
  alt: string;
  opacidade?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      role="img"
      aria-label={alt}
      className={`absolute inset-0 ${className}`}
      style={{
        backgroundImage: caminhos.map((p) => `url("${p}")`).join(", "),
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "transparent",
        opacity: opacidade,
        transition: "opacity .8s ease",
        ...style,
      }}
    />
  );
}

/**
 * Capas — depósito `capas` do Supabase Storage.
 *
 * O banco guarda só o caminho relativo (`modulo-0.png`), nunca a URL: é
 * o item (J) do modelo. Aqui o caminho vira endereço público. O depósito
 * é público de propósito — a capa não tem valor isolado e aparece antes
 * de qualquer conferência de liberação.
 *
 * Os nomes seguem a convenção do item 10 do README do handoff.
 */
const nomeDaCapa = (caminho: string) => urlDaCapa(caminho) ?? "";

export const capaModulo = (numero: number) => nomeDaCapa(`modulo-${numero}.png`);
export const capaAula = (numero: number, ordem: number) =>
  nomeDaCapa(`modulo-${numero}-aula-${ordem + 1}.png`);
export const capaAoVivo = (numero: number) => nomeDaCapa(`ao-vivo-modulo-${numero}.png`);
export const capaPresente = (indice: number) => nomeDaCapa(`presente-${indice + 1}.png`);

export const fundoReserva = cores.placeholderCapa;
