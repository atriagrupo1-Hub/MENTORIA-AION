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

/*
 * WebP, e não PNG.
 *
 * As mesmas artes, na mesma qualidade visível, pesam 9% do que pesavam:
 * 83 MB viraram 7,2 MB nas 56 capas. Numa tela com seis delas, a aluna
 * baixava 9 MB e passa a baixar 800 KB — que no celular em rede fraca é
 * a diferença entre esperar e não esperar.
 */
export const capaModulo = (numero: number) => nomeDaCapa(`modulo-${numero}.webp`);
export const capaAula = (numero: number, ordem: number) =>
  nomeDaCapa(`modulo-${numero}-aula-${ordem + 1}.webp`);
export const capaAoVivo = (numero: number) => nomeDaCapa(`ao-vivo-modulo-${numero}.webp`);
export const capaPresente = (indice: number) => nomeDaCapa(`presente-${indice + 1}.webp`);

export const fundoReserva = cores.placeholderCapa;
