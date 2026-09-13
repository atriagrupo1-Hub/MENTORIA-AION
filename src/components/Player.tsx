import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * O player da aula.
 *
 * Antes o vídeo vinha dentro de um quadro fechado do Cloudflare. Tocava
 * bem, mas de fora ninguém sabia nada: nem que terminou, nem em que
 * minuto estava, nem como pedir tela cheia. Cinco coisas que a aluna
 * pedia dependiam de abrir esse quadro.
 *
 * Agora o vídeo é do app. O endereço é o mesmo do Cloudflare Stream —
 * só que o manifesto em vez do quadro —, então nada muda no que você
 * cadastra no painel nem em como o vídeo é protegido.
 *
 * Tela cheia, e a diferença entre os dois sistemas:
 *
 *   Android — a tela cheia é do app, e ali dá para travar a orientação.
 *             A aluna toca em assistir e o celular deita sozinho.
 *   iPhone  — o Safari não implementa a trava de orientação, então
 *             chamamos a tela cheia nativa do próprio iOS: aquele player
 *             preto do YouTube no Safari. Ele ocupa a tela toda na hora
 *             e gira quando a aluna vira o aparelho.
 *
 * Os controles são os do navegador, de propósito. São os que a aluna já
 * conhece de todo vídeo que ela assiste, funcionam com leitor de tela e
 * com legenda, e não há nada que eu fizesse à mão que ficasse melhor.
 */

type Props = {
  /** O uid do vídeo no Stream — ou o token, quando houver URL assinada. */
  identificador: string;
  /** A capa, enquanto o vídeo não começou. */
  capa?: ReactNode;
  /** Onde retomar, em segundos. Zero começa do início. */
  comecarEm?: number;
  aoTocar?: (tocando: boolean) => void;
  aoProgredir?: (segundos: number, duracao: number) => void;
  aoTerminar?: () => void;
};

/** iPhone e iPad: é neles que a tela cheia tem de ser a do sistema. */
function ehIOS(): boolean {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

type VideoIOS = HTMLVideoElement & { webkitEnterFullscreen?: () => void };
type OrientacaoTravavel = ScreenOrientation & {
  lock?: (o: string) => Promise<void>;
  unlock?: () => void;
};

/** Guardar a posição a cada cinco segundos basta, e poupa o banco. */
const SEGUNDOS_ENTRE_GRAVACOES = 5;

export function Player({
  identificador,
  capa,
  comecarEm = 0,
  aoTocar,
  aoProgredir,
  aoTerminar,
}: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const moldura = useRef<HTMLDivElement>(null);
  const ultimaGravacao = useRef(0);
  const [comecou, setComecou] = useState(false);
  const [terminou, setTerminou] = useState(false);

  // ---- a fonte ----
  useEffect(() => {
    const v = video.current;
    if (!v || !identificador) return;
    const manifesto = `https://videodelivery.net/${identificador}/manifest/video.m3u8`;

    // O Safari toca este formato sozinho, e melhor do que qualquer
    // biblioteca faria: é o mesmo caminho do vídeo nativo do iOS.
    if (v.canPlayType("application/vnd.apple.mpegurl")) {
      v.src = manifesto;
      return;
    }

    /*
     * Fora do Safari a biblioteca é buscada só agora, e num pacote à
     * parte. Ela pesa mais de meio megabyte: embutida no programa, toda
     * aluna pagaria essa espera para abrir a tela inicial, inclusive no
     * iPhone, que nem precisa dela.
     */
    let dispensar: (() => void) | null = null;
    let cancelado = false;
    void import("hls.js").then(({ default: Hls }) => {
      const atual = video.current;
      if (cancelado || !atual) return;
      if (!Hls.isSupported()) {
        atual.src = manifesto;
        return;
      }
      const hls = new Hls({ enableWorker: true });
      dispensar = () => hls.destroy();
      hls.loadSource(manifesto);
      hls.attachMedia(atual);
    });
    return () => {
      cancelado = true;
      dispensar?.();
    };
  }, [identificador]);

  // ---- retomar de onde parou ----
  useEffect(() => {
    const v = video.current;
    if (!v || comecarEm <= 0) return;
    function retomar() {
      const alvo = comecarEm;
      // Perto do fim não faz sentido retomar: ela veio rever.
      if (Number.isFinite(v!.duration) && alvo > v!.duration - 15) return;
      v!.currentTime = alvo;
    }
    v.addEventListener("loadedmetadata", retomar, { once: true });
    return () => v.removeEventListener("loadedmetadata", retomar);
  }, [comecarEm, identificador]);

  // ---- o que o app passa a saber ----
  useEffect(() => {
    const v = video.current;
    if (!v) return;

    const aoIniciar = () => {
      setComecou(true);
      setTerminou(false);
      aoTocar?.(true);
    };
    const aoPausar = () => {
      aoTocar?.(false);
      if (Number.isFinite(v.duration)) aoProgredir?.(v.currentTime, v.duration);
    };
    const aoAndar = () => {
      if (!Number.isFinite(v.duration)) return;
      if (v.currentTime - ultimaGravacao.current < SEGUNDOS_ENTRE_GRAVACOES) return;
      ultimaGravacao.current = v.currentTime;
      aoProgredir?.(v.currentTime, v.duration);
    };
    const aoAcabar = () => {
      setTerminou(true);
      aoTocar?.(false);
      if (Number.isFinite(v.duration)) aoProgredir?.(v.duration, v.duration);
      aoTerminar?.();
    };

    v.addEventListener("play", aoIniciar);
    v.addEventListener("pause", aoPausar);
    v.addEventListener("timeupdate", aoAndar);
    v.addEventListener("ended", aoAcabar);
    return () => {
      v.removeEventListener("play", aoIniciar);
      v.removeEventListener("pause", aoPausar);
      v.removeEventListener("timeupdate", aoAndar);
      v.removeEventListener("ended", aoAcabar);
    };
  }, [aoTocar, aoProgredir, aoTerminar]);

  // ---- saindo da tela cheia, a orientação volta a ser dela ----
  useEffect(() => {
    function aoMudar() {
      if (document.fullscreenElement) return;
      try {
        (screen.orientation as OrientacaoTravavel | undefined)?.unlock?.();
      } catch {
        // Navegador sem trava de orientação: não havia o que destravar.
      }
    }
    document.addEventListener("fullscreenchange", aoMudar);
    return () => document.removeEventListener("fullscreenchange", aoMudar);
  }, []);

  async function assistir() {
    const v = video.current as VideoIOS | null;
    if (!v) return;

    try {
      await v.play();
    } catch {
      // Alguns navegadores recusam tocar sem gesto; o toque no botão é
      // um gesto, então isto raramente acontece. Se acontecer, os
      // controles do próprio vídeo continuam ali.
    }

    if (ehIOS() && typeof v.webkitEnterFullscreen === "function") {
      v.webkitEnterFullscreen();
      return;
    }

    const caixa = moldura.current;
    if (!caixa?.requestFullscreen) return;
    try {
      await caixa.requestFullscreen();
      await (screen.orientation as OrientacaoTravavel | undefined)?.lock?.("landscape");
    } catch {
      // Sem tela cheia ou sem trava, o vídeo segue tocando na caixa. É
      // uma comodidade a menos, nunca um impedimento.
    }
  }

  return (
    <div ref={moldura} className="relative h-full w-full bg-black">
      <video
        ref={video}
        controls={comecou}
        playsInline
        preload="metadata"
        className="h-full w-full bg-black"
      />

      {comecou ? null : (
        <div className="absolute inset-0 z-[3]">{capa}</div>
      )}

      {comecou && !terminou ? null : (
        <button
          onClick={() => void assistir()}
          aria-label={terminou ? "Assistir novamente" : "Assistir aula"}
          className="absolute inset-0 z-[5] flex flex-col items-center justify-center gap-3 border-none bg-transparent"
          style={{ cursor: "pointer" }}
        >
          <span
            className="grid h-[84px] w-[84px] place-items-center rounded-full transition-transform duration-300 hover:scale-105"
            style={{ background: "rgba(0,0,0,.45)", border: "2px solid #ffffff" }}
          >
            <span
              className="ml-[6px] block h-0 w-0"
              style={{
                borderTop: "13px solid transparent",
                borderBottom: "13px solid transparent",
                borderLeft: "22px solid #ffffff",
              }}
            />
          </span>
          {terminou ? (
            <span className="text-[14px] font-semibold text-white">Assistir novamente</span>
          ) : null}
        </button>
      )}
    </div>
  );
}
