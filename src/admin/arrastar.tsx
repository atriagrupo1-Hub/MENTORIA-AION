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
 * Quem decide o que fazer com a ordem nova é quem monta: o hook chama
 * `aoSoltar` UMA vez, com os ids já reordenados, e não grava nada.
 */

const LIMIAR = 6;

export type Arrasto = {
  /** Índice sendo carregado, ou -1. */
  daOrigem: number;
  /** Índice onde ele cairia, ou -1. */
  noDestino: number;
  /** Props para a raiz de cada item da lista. */
  props: (indice: number) => {
    onPointerDown: (e: React.PointerEvent) => void;
    onDragStart: (e: React.DragEvent) => void;
    onClickCapture: (e: React.MouseEvent) => void;
    style: React.CSSProperties;
  };
};

type Gesto = { x: number; y: number; indice: number; lista: HTMLElement };

export function useArrastar(
  ids: string[],
  aoSoltar: (novaOrdem: string[]) => void,
): Arrasto {
  const [daOrigem, setDaOrigem] = useState(-1);
  const [noDestino, setNoDestino] = useState(-1);
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
      }

      /*
       * Onde cairia: o item cuja caixa está sob o ponteiro.
       *
       * Lido do DOM a cada movimento, e não de uma lista de medidas
       * guardada no começo: a fileira quebra linha, e as caixas mudam
       * de lugar enquanto se arrasta.
       */
      const filhos = Array.from(de.lista.children) as HTMLElement[];
      const sob = filhos.findIndex((f) => {
        const r = f.getBoundingClientRect();
        return (
          e.clientX >= r.left &&
          e.clientX <= r.right &&
          e.clientY >= r.top &&
          e.clientY <= r.bottom
        );
      });
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

      style: {
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        opacity: daOrigem === indice ? 0.5 : 1,
        cursor: daOrigem >= 0 ? "grabbing" : "grab",
      } as React.CSSProperties,
    }),
    [daOrigem],
  );

  return { daOrigem, noDestino, props };
}

/**
 * A marca de onde o item vai cair: uma linha de 2px na borda que o
 * gesto encosta. Horizontal na fileira, vertical na lista.
 */
export function marcaDoDestino(
  arrasto: Arrasto,
  indice: number,
  sentido: "linha" | "coluna",
): React.CSSProperties {
  const marcado =
    arrasto.daOrigem >= 0 && arrasto.noDestino === indice && arrasto.daOrigem !== indice;
  if (!marcado) return {};

  // Vindo de trás, cai depois deste; vindo da frente, antes dele.
  const depois = arrasto.daOrigem < indice;
  const traco = "2px solid #ffffff";
  if (sentido === "linha") {
    return depois ? { borderRight: traco } : { borderLeft: traco };
  }
  return depois ? { borderBottom: traco } : { borderTop: traco };
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
