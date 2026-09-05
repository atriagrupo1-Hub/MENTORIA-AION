/**
 * Ícones desenhados em CSS, como no protótipo — nenhum arquivo de
 * imagem e nenhuma biblioteca.
 */

export function Play({ tamanho = 15, cor = "#000000" }: { tamanho?: number; cor?: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block"
      style={{
        width: 0,
        height: 0,
        borderLeft: `${tamanho}px solid ${cor}`,
        borderTop: `${Math.round(tamanho * 0.6)}px solid transparent`,
        borderBottom: `${Math.round(tamanho * 0.6)}px solid transparent`,
      }}
    />
  );
}

export function Cadeado({
  largura = 46,
  cor = "rgba(243,236,225,.16)",
  corArco = "rgba(243,236,225,.18)",
}: {
  largura?: number;
  cor?: string;
  corArco?: string;
}) {
  const arco = Math.round(largura * 0.56);
  return (
    <span aria-hidden="true" className="flex flex-col items-center">
      <span
        style={{
          width: arco,
          height: Math.round(arco * 0.7),
          border: `${Math.max(2, Math.round(largura / 12))}px solid ${corArco}`,
          borderBottom: "none",
          borderRadius: "99px 99px 0 0",
        }}
      />
      <span
        style={{
          width: largura,
          height: Math.round(largura * 0.78),
          marginTop: -1,
          background: cor,
          borderRadius: Math.max(2, Math.round(largura / 8)),
        }}
      />
    </span>
  );
}

export function Mais({ tamanho = 16, cor = "#ffffff" }: { tamanho?: number; cor?: string }) {
  return (
    <span
      aria-hidden="true"
      className="relative inline-block"
      style={{ width: tamanho, height: tamanho }}
    >
      <span
        className="absolute"
        style={{ left: 0, top: tamanho / 2 - 1, width: tamanho, height: 2, background: cor }}
      />
      <span
        className="absolute"
        style={{ left: tamanho / 2 - 1, top: 0, width: 2, height: tamanho, background: cor }}
      />
    </span>
  );
}

export function SilhuetaPessoa({ escala = 1 }: { escala?: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex flex-col items-center"
      style={{ gap: 2 * escala }}
    >
      <span
        style={{
          width: 8 * escala,
          height: 8 * escala,
          border: `${1.5 * escala}px solid rgba(226,196,133,.8)`,
          borderRadius: "50%",
        }}
      />
      <span
        style={{
          width: 15 * escala,
          height: 7 * escala,
          border: `${1.5 * escala}px solid rgba(226,196,133,.8)`,
          borderBottom: "none",
          borderRadius: "99px 99px 0 0",
        }}
      />
    </span>
  );
}

export function SilhuetaCadeado() {
  return (
    <span aria-hidden="true" className="flex flex-col items-center">
      <span
        style={{
          width: 9,
          height: 6,
          border: "1.5px solid rgba(226,196,133,.75)",
          borderBottom: "none",
          borderRadius: "99px 99px 0 0",
        }}
      />
      <span
        style={{ width: 15, height: 11, background: "rgba(226,196,133,.75)", borderRadius: 2 }}
      />
    </span>
  );
}
