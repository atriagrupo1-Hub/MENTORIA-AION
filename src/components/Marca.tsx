/**
 * A marca AIÓN — o símbolo e a palavra, sem o slogan.
 *
 * Estava definida dentro de `PainelAdmin.tsx` e só existia lá; a tela
 * de entrada da aluna abria com um círculo e um desenho de chave, que
 * era do protótipo. Agora as duas portas do produto abrem com a mesma
 * marca, e ela mora num lugar só.
 *
 * O arquivo é PNG com fundo transparente, e precisa ser: o fundo do
 * aplicativo é preto puro, mas o cartão de entrada do painel é
 * `#0b0b0d` — a arte veio sobre preto sólido e, se fosse usada assim,
 * desenharia um retângulo escuro sobre o cartão.
 */
export function Marca({ altura = 38 }: { altura?: number }) {
  return (
    <img
      src="/marca-aion.png"
      alt="AIÓN"
      height={altura}
      /*
        A proporção da arte é 344×264. Declarar as duas medidas evita o
        salto de layout enquanto a imagem carrega — a mesma regra que as
        capas das aulas já seguem.
      */
      width={Math.round((altura * 344) / 264)}
      style={{ height: altura, width: "auto" }}
    />
  );
}
