/** Barra de progresso na cor do módulo. */
export function Barra({
  percentual,
  trilho,
  preenchimento,
  altura = 5,
  larguraMaxima,
}: {
  percentual: number;
  trilho: string;
  preenchimento: string;
  altura?: number;
  larguraMaxima?: number;
}) {
  return (
    <span
      className="block overflow-hidden rounded-pilula"
      style={{ height: altura, background: trilho, maxWidth: larguraMaxima }}
    >
      <span
        className="block h-full rounded-pilula"
        style={{
          background: preenchimento,
          width: `${percentual}%`,
          transition: "width .9s cubic-bezier(.22,.61,.36,1)",
        }}
      />
    </span>
  );
}
