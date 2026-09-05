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

/** Caminhos oficiais das capas — convenção do item 10 do README. */
export const capaModulo = (numero: number) => `/assets/capas/modulo-${numero}.png`;
export const capaAula = (numero: number, ordem: number) =>
  `/assets/capas/modulo-${numero}-aula-${ordem + 1}.png`;
export const capaAoVivo = (numero: number) =>
  `/assets/capas/ao-vivo-modulo-${numero}.png`;
export const capaPresente = (indice: number) =>
  `/assets/capas/presente-${indice + 1}.png`;

export const fundoReserva = cores.placeholderCapa;
