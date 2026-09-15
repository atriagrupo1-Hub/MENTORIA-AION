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
          border: `${1.5 * escala}px solid rgba(255,255,255,.8)`,
          borderRadius: "50%",
        }}
      />
      <span
        style={{
          width: 15 * escala,
          height: 7 * escala,
          border: `${1.5 * escala}px solid rgba(255,255,255,.8)`,
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
          border: "1.5px solid rgba(255,255,255,.75)",
          borderBottom: "none",
          borderRadius: "99px 99px 0 0",
        }}
      />
      <span
        style={{ width: 15, height: 11, background: "rgba(255,255,255,.75)", borderRadius: 2 }}
      />
    </span>
  );
}

/**
 * A chave, no círculo da tela de entrada.
 *
 * Ali havia a foto da mentora, e enquanto ela não chegava havia um
 * quadrado cinza escrito "foto da mentora" — a primeira coisa que a
 * aluna via ao abrir o aplicativo era um espaço vazio pedindo para ser
 * preenchido.
 *
 * Uma chave e não um cadeado, embora o cadeado já exista neste arquivo:
 * cadeado é o que a aluna vê na aula que ainda não abriu, e repeti-lo
 * na porta de entrada diria "fechado" bem onde ela está entrando. A
 * chave diz o contrário — e diz o nome da mentoria, que é Caminho do
 * Desbloqueio.
 *
 * Desenhada aqui, como as outras: nenhum arquivo de imagem, nada que
 * dependa de alguém mandar um PNG depois.
 */
export function Chave({
  altura = 56,
  cor = "rgba(255,255,255,.92)",
}: {
  altura?: number;
  cor?: string;
}) {
  const anel = Math.round(altura * 0.44);
  const traco = Math.max(2, Math.round(altura / 14));
  const haste = altura - anel;
  const dente = (proporcao: number) => Math.round(anel * proporcao);
  return (
    <span
      aria-hidden="true"
      className="flex flex-col items-center"
      style={{ height: altura }}
    >
      <span
        style={{
          width: anel,
          height: anel,
          border: `${traco}px solid ${cor}`,
          borderRadius: "50%",
        }}
      />
      {/*
        A haste nasce meio traço à esquerda do centro para que a coluna
        inteira — anel e haste — fique alinhada no eixo do círculo. Os
        dentes saem só de um lado, como numa chave de verdade.
      */}
      <span
        className="relative"
        style={{ width: traco, height: haste, background: cor }}
      >
        <span
          className="absolute"
          style={{
            left: traco,
            top: Math.round(haste * 0.5),
            width: dente(0.46),
            height: traco,
            background: cor,
          }}
        />
        <span
          className="absolute"
          style={{
            left: traco,
            top: Math.round(haste * 0.78),
            width: dente(0.3),
            height: traco,
            background: cor,
          }}
        />
      </span>
    </span>
  );
}
