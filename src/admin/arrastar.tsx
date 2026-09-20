import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Arrastar para reordenar.
 *
 * Eventos de ponteiro, e não o drag-and-drop nativo do HTML: o nativo
 * simplesmente não existe no toque, e o painel é aberto no celular.
 * Com `pointer*` o mesmo código serve mouse, caneta e dedo.
 *
 * O gesto começa no item e continua na JANELA.
 *
 * Escutar `pointermove` no próprio item parecia o caminho curto e não
 * é: o item é redesenhado no meio do arrasto — a opacidade muda, a
 * lista relê —, e aí o navegador manda um `pointercancel` e o gesto
 * morre no meio, sem gravar nada. A janela não é redesenhada.
 *
 * Três cuidados moram aqui, para as quatro listas não os repetirem:
 *
 *   1. Arrastar não é clicar. Só vira arrasto depois de 6px de
 *      movimento — abaixo disso o clique continua fazendo o que
 *      sempre fez, que é abrir a categoria ou o produto.
 *   2. O `click` que vem junto com o fim do arrasto é engolido, senão
 *      todo arrasto terminava abrindo o que foi solto.
 *   3. `touch-action: none` no item, senão o navegador entende o
 *      gesto como rolagem e a lista foge da mão.
 *
 * E o gesto APARECE: o item acompanha o ponteiro, levantado, e a
 * lista abre espaço onde ele vai cair. Antes ele ficava parado a 50%
 * de opacidade e o destino era uma linha de 2px — arrastava-se no
 * escuro, descobrindo o resultado só depois de soltar.
 *
 * Quem decide o que fazer com a ordem nova é quem monta: o hook chama
 * `aoSoltar` UMA vez, com os ids já reordenados, e não grava nada.
 */

const LIMIAR = 6;

/**
 * Quanto tempo os vizinhos levam para abrir espaço.
 *
 * Mais rápido que isto e a lista "pula" — o olho não vê o movimento,
 * só o antes e o depois. Mais lento e o gesto começa a arrastar peso.
 */
const DESLIZE = "transform 120ms cubic-bezier(.22,.61,.36,1)";

export type Arrasto = {
  /** Índice sendo carregado, ou -1. */
  daOrigem: number;
  /** Índice onde ele cairia, ou -1. */
  noDestino: number;
  /** Para onde o ponteiro levou o item, em pixels. */
  desvio: { x: number; y: number };
  /** O passo que os vizinhos dão para abrir espaço, em pixels. */
  passo: number;
  /** Na fileira o espaço abre de lado; nas listas, de cima para baixo. */
  sentido: "linha" | "coluna";
  /** Props para a raiz de cada item da lista. */
  props: (indice: number) => {
    onPointerDown: (e: React.PointerEvent) => void;
    onDragStart: (e: React.DragEvent) => void;
    onClickCapture: (e: React.MouseEvent) => void;
    style: React.CSSProperties;
  };
};

type Gesto = {
  x: number;
  y: number;
  indice: number;
  lista: HTMLElement;
  /** Tamanho do item mais o espaço até o vizinho, no eixo do gesto. */
  passo: number;
  sentido: "linha" | "coluna";
  /**
   * Onde cada item estava quando o gesto começou, em coordenadas da
   * página.
   *
   * O alvo NÃO pode ser lido das caixas de agora: o item arrastado
   * anda com o ponteiro e os vizinhos abrem espaço, então as caixas
   * de agora são consequência do gesto. Medir nelas é perguntar ao
   * próprio movimento onde ele deveria ir — o item ficava se achando
   * como destino, e a ordem nunca mudava.
   */
  caixas: Array<{ e: number; d: number; c: number; b: number }>;
};

/**
 * O eixo da lista e o tamanho de um passo, lidos do DOM.
 *
 * Lado a lado ou empilhado é o `flex-direction` na prática: o item e o
 * VIZINHO DE VERDADE — o de antes ou o de depois — com o mesmo topo
 * estão em linha. Tem que ser o vizinho: medindo contra "o primeiro
 * irmão diferente de mim", arrastar o quarto chip dava um passo de
 * três casas, e a lista abria um buraco enorme.
 *
 * E o passo é a distância entre os dois — de esquerda a esquerda na
 * fileira, de topo a topo na lista —, que é exatamente quanto cada
 * vizinho anda para abrir espaço.
 */
function medirLista(raiz: HTMLElement, lista: HTMLElement) {
  const filhos = Array.from(lista.children) as HTMLElement[];
  const eu = raiz.getBoundingClientRect();
  const meu = filhos.indexOf(raiz);

  const caixas = filhos.map((f) => {
    const r = f.getBoundingClientRect();
    return {
      e: r.left + window.scrollX,
      d: r.right + window.scrollX,
      c: r.top + window.scrollY,
      b: r.bottom + window.scrollY,
    };
  });

  const vizinhos = [filhos[meu + 1], filhos[meu - 1]]
    .filter(Boolean)
    .map((f) => f.getBoundingClientRect());

  /*
   * A fileira quebra linha (`flex-wrap`), então o vizinho seguinte
   * pode estar na linha de baixo. Quem manda é o que estiver na MESMA
   * linha; não havendo nenhum, a lista é empilhada.
   */
  const aoLado = vizinhos.find((r) => Math.abs(r.top - eu.top) < eu.height / 2);
  const sentido: "linha" | "coluna" = aoLado ? "linha" : "coluna";

  const outro = aoLado ?? vizinhos[0];
  const passo = !outro
    ? 0
    : sentido === "linha"
      ? Math.abs(outro.left - eu.left)
      : Math.abs(outro.top - eu.top);

  return { sentido, passo, caixas };
}

export function useArrastar(
  ids: string[],
  aoSoltar: (novaOrdem: string[]) => void,
): Arrasto {
  const [daOrigem, setDaOrigem] = useState(-1);
  const [noDestino, setNoDestino] = useState(-1);
  const [desvio, setDesvio] = useState({ x: 0, y: 0 });
  const [medida, setMedida] = useState<{ passo: number; sentido: "linha" | "coluna" }>({
    passo: 0,
    sentido: "coluna",
  });
  const gesto = useRef<Gesto | null>(null);
  const passou = useRef(false);
  const destino = useRef(-1);
  const [ativo, setAtivo] = useState(false);

  /*
   * Soltar dispara um `click` no item. Sem esta trava, todo arrasto
   * terminava abrindo o que foi solto. Ela vale só para o clique
   * DESTE gesto: o `click` chega junto com o `pointerup`, antes de
   * qualquer timeout, e o `setTimeout(0)` fecha a janela logo depois.
   */
  const acabouDeArrastar = useRef(false);

  const idsAgora = useRef(ids);
  idsAgora.current = ids;
  const soltarAgora = useRef(aoSoltar);
  soltarAgora.current = aoSoltar;

  useEffect(() => {
    if (!ativo) return;

    const mover = (e: PointerEvent) => {
      const de = gesto.current;
      if (!de) return;

      if (!passou.current) {
        if (Math.hypot(e.clientX - de.x, e.clientY - de.y) < LIMIAR) return;
        passou.current = true;
        setDaOrigem(de.indice);
        setMedida({ passo: de.passo, sentido: de.sentido });
      }

      setDesvio({ x: e.clientX - de.x, y: e.clientY - de.y });

      // Onde cairia: o item cuja caixa ORIGINAL está sob o ponteiro.
      const sob = de.caixas.findIndex(
        (r) => e.pageX >= r.e && e.pageX <= r.d && e.pageY >= r.c && e.pageY <= r.b,
      );
      destino.current = sob;
      setNoDestino(sob);
    };

    const soltar = () => {
      const de = gesto.current;
      const ate = destino.current;
      const arrastou = passou.current;

      gesto.current = null;
      passou.current = false;
      destino.current = -1;
      setDaOrigem(-1);
      setNoDestino(-1);
      setDesvio({ x: 0, y: 0 });
      setAtivo(false);

      // Clique curto: não era arrasto, e o clique segue o caminho dele.
      if (!arrastou || !de) return;

      acabouDeArrastar.current = true;
      window.setTimeout(() => {
        acabouDeArrastar.current = false;
      }, 0);

      const lista = idsAgora.current;
      // Soltou fora da lista, ou no mesmo lugar: nada a gravar.
      if (ate < 0 || ate >= lista.length || ate === de.indice) return;

      const nova = [...lista];
      const [movido] = nova.splice(de.indice, 1);
      nova.splice(ate, 0, movido);
      soltarAgora.current(nova);
    };

    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", soltar);
    return () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("pointercancel", soltar);
    };
  }, [ativo]);

  const props = useCallback(
    (indice: number) => ({
      onPointerDown: (e: React.PointerEvent) => {
        /*
         * Só o botão principal, e nunca a partir de um controle.
         *
         * As linhas têm botões dentro — ↑ ↓, Remover, Ocultar — e um
         * arrasto que começasse neles roubaria o clique do botão. O
         * chip da fileira É um botão, e por isso a comparação é com a
         * raiz do item, não com "existe um botão no caminho".
         */
        if (e.button !== 0) return;
        const raiz = e.currentTarget as HTMLElement;
        const controle = (e.target as HTMLElement).closest(
          "button, a, input, select, textarea",
        );
        if (controle && controle !== raiz) return;
        if (!raiz.parentElement) return;

        /*
         * Para aqui.
         *
         * As listas são aninhadas — conteúdos dentro do módulo, mídia
         * dentro do conteúdo — e sem isto o `pointerdown` subia e
         * começava o arrasto do pai também.
         */
        e.stopPropagation();

        gesto.current = {
          x: e.clientX,
          y: e.clientY,
          indice,
          lista: raiz.parentElement,
          ...medirLista(raiz, raiz.parentElement),
        };
        passou.current = false;
        destino.current = -1;
        setAtivo(true);
      },

      /*
       * Mata o arrasto nativo do navegador.
       *
       * Sem isto, o segundo arrasto da página não funcionava: o
       * primeiro deixava texto selecionado pelo caminho, o seguinte
       * começava em cima da seleção, e o Chrome entendia como
       * "arrastar o texto selecionado" — uma operação nativa que
       * ENGOLE os `pointermove`. Medido: 13 eventos no primeiro
       * arrasto, 2 no segundo.
       *
       * `user-select: none` no item impede a seleção de nascer, e
       * este `dragstart` fecha a porta por onde ela entraria de novo,
       * em imagem ou link dentro da linha.
       */
      onDragStart: (e: React.DragEvent) => e.preventDefault(),

      onClickCapture: (e: React.MouseEvent) => {
        if (!acabouDeArrastar.current) return;
        e.preventDefault();
        e.stopPropagation();
      },

      style: estiloDoItem(
        indice,
        daOrigem,
        noDestino,
        desvio,
        medida.passo,
        medida.sentido,
      ),
    }),
    [daOrigem, noDestino, desvio, medida],
  );

  return { daOrigem, noDestino, desvio, passo: medida.passo, sentido: medida.sentido, props };
}

/**
 * Como cada item se desenha durante o gesto.
 *
 *   o arrastado  — acompanha o ponteiro, levantado e por cima;
 *   os do meio   — andam uma casa, abrindo o buraco onde ele cai;
 *   o resto      — parado.
 *
 * `pointerEvents: none` no arrastado não é detalhe: sem isso ele fica
 * sob o próprio cursor e é ele que o `elementFromPoint` encontra —
 * o destino passaria a ser sempre ele mesmo.
 */
function estiloDoItem(
  indice: number,
  daOrigem: number,
  noDestino: number,
  desvio: { x: number; y: number },
  passo: number,
  sentido: "linha" | "coluna",
): React.CSSProperties {
  const base: React.CSSProperties = {
    touchAction: "none",
    userSelect: "none",
    WebkitUserSelect: "none",
    cursor: daOrigem >= 0 ? "grabbing" : "grab",
  };

  if (daOrigem < 0) return base;

  if (indice === daOrigem) {
    return {
      ...base,
      transform: `translate(${desvio.x}px, ${desvio.y}px) scale(1.03)`,
      transition: "none",
      zIndex: 40,
      position: "relative",
      opacity: 0.95,
      pointerEvents: "none",
      boxShadow: "0 18px 40px -18px rgba(0,0,0,.9)",
    };
  }

  /*
   * Quem abre espaço: os que estão entre a origem e o destino. Subindo,
   * eles descem uma casa; descendo, eles sobem uma.
   */
  const noCaminho =
    noDestino >= 0 &&
    (daOrigem < noDestino
      ? indice > daOrigem && indice <= noDestino
      : indice >= noDestino && indice < daOrigem);

  if (!noCaminho) return { ...base, transform: "none", transition: DESLIZE };

  const anda = daOrigem < noDestino ? -passo : passo;
  return {
    ...base,
    transform: sentido === "linha" ? `translateX(${anda}px)` : `translateY(${anda}px)`,
    transition: DESLIZE,
  };
}

/**
 * Um `useArrastar` por lista, dentro de um `map`.
 *
 * Hook não se chama em laço, e os conteúdos de cada módulo são uma
 * lista própria — arrastar um conteúdo do Módulo 1 nunca o leva para o
 * Módulo 2. Este invólucro dá a cada uma o seu.
 */
export function Arrastavel({
  ids,
  aoSoltar,
  children,
}: {
  ids: string[];
  aoSoltar: (novaOrdem: string[]) => void;
  children: (arrasto: Arrasto) => React.ReactNode;
}) {
  const arrasto = useArrastar(ids, aoSoltar);
  return children(arrasto) as React.ReactElement;
}
