/**
 * O que a aluna vê enquanto o banco responde.
 *
 * A regra do item 8 do README continua inteira: nada aqui decide
 * acesso, e nada aqui é conteúdo. São formas vazias. O conteúdo só
 * aparece depois que o Supabase respondeu — se não responder, o que
 * entra é a tela de erro, nunca um palpite.
 *
 * O desenho imita a tela Início, que é onde o aplicativo abre. Um
 * esqueleto que não se parece com o que vem depois é pior que nenhum:
 * o conteúdo chega e salta de lugar, e o salto assusta mais do que a
 * espera. Este tem a capa no mesmo lugar, o texto nas mesmas linhas e
 * os botões na mesma altura.
 */

/** Um bloco vazio. `className` diz o tamanho e o arredondamento. */
export function Bloco({ className = "" }: { className?: string }) {
  return <span className={`esqueleto block ${className}`} aria-hidden="true" />;
}

export function EsqueletoInicio() {
  return (
    <main className="mx-auto max-w-[1360px] px-7 pb-24 pt-5 cel-sm:px-5">
      {/*
        O leitor de tela não deve ler forma nenhuma. Ele lê esta frase,
        uma vez, e cala — e quando o conteúdo chega, lê o conteúdo.
      */}
      <p className="sr-only" role="status">
        Carregando sua jornada.
      </p>

      <section className="mx-auto mt-1 max-w-[820px]">
        <Bloco className="aspect-video w-full rounded-botao" />

        <div className="flex flex-col gap-3 pt-3">
          <Bloco className="h-3 w-[140px] rounded-pilula" />
          <Bloco className="h-3 w-[220px] rounded-pilula" />
          <Bloco className="h-4 w-full max-w-[420px] rounded-pilula" />
          <Bloco className="h-3 w-[160px] rounded-pilula" />
        </div>

        {/*
          `cel:flex-none` não é enfeite. No celular a fila vira coluna, e
          aí `flex-1` passa a mandar na ALTURA: os dois blocos nasciam
          com zero de altura e o esqueleto ficava sem botões, com um
          buraco no lugar deles. Na tela grande a fila é horizontal e o
          `flex-1` faz o que deve, que é repartir a largura.
        */}
        <div className="flex w-full flex-wrap justify-center gap-3 pt-3 cel:flex-col">
          <Bloco className="h-14 min-w-[240px] flex-1 rounded-pilula cel:w-full cel:min-w-0 cel:flex-none" />
          <Bloco className="h-14 min-w-[240px] flex-1 rounded-pilula cel:w-full cel:min-w-0 cel:flex-none" />
        </div>
      </section>

      <div className="mt-12 flex flex-col gap-4">
        <Bloco className="h-3 w-[120px] rounded-pilula" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <Bloco className="aspect-[2/3] w-[72px] flex-none rounded-campo" />
            <div className="flex flex-1 flex-col gap-2">
              <Bloco className="h-3 w-[120px] rounded-pilula" />
              <Bloco className="h-4 w-full max-w-[260px] rounded-pilula" />
              <Bloco className="h-1 w-full max-w-[220px] rounded-pilula" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

/**
 * A lista de comentários, enquanto ela chega.
 *
 * Aqui o esqueleto ganha ainda mais: os comentários vêm por aula, então
 * a espera se repete a cada aula aberta. Um espaço vazio que de repente
 * enche é o que fazia a seção parecer lenta mesmo quando não era.
 */
export function EsqueletoComentarios({ quantos = 2 }: { quantos?: number }) {
  return (
    <div className="flex flex-col gap-5" aria-hidden="true">
      {Array.from({ length: quantos }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Bloco className="h-3 w-[120px] rounded-pilula" />
          <Bloco className="h-3 w-full rounded-pilula" />
          <Bloco className="h-3 w-[70%] rounded-pilula" />
        </div>
      ))}
    </div>
  );
}
