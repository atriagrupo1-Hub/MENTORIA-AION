import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

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
  /**
   * Pede um endereço novo ao servidor e devolve se conseguiu.
   *
   * Com URL assinada o endereço tem prazo. Expirando com a aula aberta,
   * o vídeo para de carregar e não há nada que o player possa fazer
   * sozinho: só o servidor assina. Esta é a porta para pedir outro.
   */
  aoRenovar?: () => Promise<boolean>;
  aoTocar?: (tocando: boolean) => void;
  /**
   * Onde o vídeo está. `agora` pede para gravar sem esperar a próxima
   * janela: é o que garante que "de onde parei" seja o minuto certo.
   */
  aoProgredir?: (segundos: number, duracao: number, agora?: boolean) => void;
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
  aoRenovar,
  aoTocar,
  aoProgredir,
  aoTerminar,
}: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const moldura = useRef<HTMLDivElement>(null);
  const ultimaGravacao = useRef(0);
  const [comecou, setComecou] = useState(false);
  const [terminou, setTerminou] = useState(false);
  const [falhou, setFalhou] = useState(false);
  /** Onde o vídeo estava quando falhou, para voltar ao mesmo ponto. */
  const retomarDe = useRef(0);
  /** Estava tocando na hora da falha? Se sim, volta tocando. */
  const tocavaAntes = useRef(false);
  /** Quando foi a última renovação, para não entrar em laço. */
  const ultimaRenovacao = useRef(0);
  /** Há um pedido de endereço em curso. */
  const renovando = useRef(false);
  /*
   * Conta as renovações, e serve só para religar a fonte.
   *
   * O endereço novo quase sempre é diferente do velho, e trocá-lo já
   * religaria sozinho. "Quase sempre" não basta: enquanto a chave de
   * assinatura não estiver configurada, o servidor devolve o mesmo
   * identificador, e aí nada mudaria — o vídeo ficaria parado sem
   * ninguém tentar de novo. Contando as tentativas, a fonte recomeça
   * de qualquer jeito.
   */
  const [tentativa, setTentativa] = useState(0);

  /**
   * O endereço falhou. Pede outro ao servidor, uma vez.
   *
   * Quase sempre é o prazo da assinatura que acabou — a aula ficou
   * aberta numa aba, ou o celular dormiu no meio dela. Renovar resolve
   * sem a aluna saber que houve problema. Dando errado de novo, aí sim
   * a tela avisa: pode ser a internet, ou o acesso dela ter mudado.
   *
   * A trava de trinta segundos existe porque o hls.js repete o erro
   * enquanto não conseguir carregar; sem ela, seria um pedido por
   * tentativa, em rajada.
   */
  const renovar = useCallback(async () => {
    // Um pedido já em curso: o erro que chega agora é o mesmo de antes,
    // repetido pela biblioteca. Esperar é melhor que declarar falha.
    if (renovando.current) return;
    const agora = Date.now();
    if (!aoRenovar || agora - ultimaRenovacao.current < 30_000) {
      setFalhou(true);
      return;
    }
    ultimaRenovacao.current = agora;
    renovando.current = true;
    const v = video.current;
    if (v) {
      if (v.currentTime > 0) retomarDe.current = v.currentTime;
      tocavaAntes.current = !v.paused;
    }
    const deuCerto = await aoRenovar().catch(() => false);
    renovando.current = false;
    if (!deuCerto) {
      setFalhou(true);
      return;
    }
    setTentativa((n) => n + 1);
  }, [aoRenovar]);

  // ---- a fonte ----
  useEffect(() => {
    const v = video.current;
    if (!v || !identificador) return;
    const manifesto = `https://videodelivery.net/${identificador}/manifest/video.m3u8`;
    setFalhou(false);

    // O Safari toca este formato sozinho, e melhor do que qualquer
    // biblioteca faria: é o mesmo caminho do vídeo nativo do iOS.
    if (v.canPlayType("application/vnd.apple.mpegurl")) {
      v.src = manifesto;
      // No Safari o erro chega como evento do próprio vídeo: endereço
      // vencido devolve 403, e o elemento dispara `error`.
      const aoErrar = () => void renovar();
      v.addEventListener("error", aoErrar);
      return () => v.removeEventListener("error", aoErrar);
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
      /*
       * Erro grave é o que a biblioteca não resolve sozinha. Os leves
       * ela recupera — um segmento que demorou, um corte de rede — e
       * interromper nesses casos seria trocar uma pausa de um segundo
       * por uma tela de erro.
       */
      hls.on(Hls.Events.ERROR, (_evento, dados) => {
        if (!dados.fatal) return;
        void renovar();
      });
      hls.loadSource(manifesto);
      hls.attachMedia(atual);
    });
    return () => {
      cancelado = true;
      dispensar?.();
    };
  }, [identificador, tentativa, renovar]);

  // ---- retomar de onde parou ----
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    /*
     * Duas retomadas moram aqui, e a ordem importa.
     *
     * `retomarDe` é o ponto em que o vídeo estava quando o endereço
     * falhou — vale mais que o minuto guardado no banco, que pode ser
     * de quinze segundos atrás. Sem ele, uma renovação no meio da aula
     * jogaria a aluna para trás toda vez.
     */
    const alvo = retomarDe.current > 0 ? retomarDe.current : comecarEm;
    if (alvo <= 0) return;
    function retomar() {
      // Perto do fim não faz sentido retomar: ela veio rever.
      if (Number.isFinite(v!.duration) && alvo > v!.duration - 15) return;
      v!.currentTime = alvo;
      if (tocavaAntes.current) {
        tocavaAntes.current = false;
        void v!.play().catch(() => undefined);
      }
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
      // Sem `agora`, uma pausa a oito segundos da última gravação era
      // descartada — e oito segundos é exatamente o que ela perderia ao
      // voltar. Pausar é o momento em que "onde parei" fica decidido.
      if (Number.isFinite(v.duration)) aoProgredir?.(v.currentTime, v.duration, true);
    };
    const aoAndar = () => {
      retomarDe.current = v.currentTime;
      if (!Number.isFinite(v.duration)) return;
      if (v.currentTime - ultimaGravacao.current < SEGUNDOS_ENTRE_GRAVACOES) return;
      ultimaGravacao.current = v.currentTime;
      aoProgredir?.(v.currentTime, v.duration);
    };
    const aoAcabar = () => {
      setTerminou(true);
      aoTocar?.(false);
      if (Number.isFinite(v.duration)) aoProgredir?.(v.duration, v.duration, true);
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

  /*
   * ---- saindo do aplicativo, a posição vai junto ----
   *
   * Fechar o app, trocar de aba, apertar o botão de início: em nenhum
   * desses o navegador promete outro momento depois. `visibilitychange`
   * é o último aviso que ele dá, e no iPhone é o único — `unload` não
   * chega a acontecer. Aqui a posição é gravada na hora, sem esperar a
   * janela dos quinze segundos.
   *
   * O `pause` acima cobre a maioria dos casos, porque o sistema pausa o
   * vídeo ao mandar o app para trás. Isto é a rede embaixo: sai barato
   * (uma gravação) e é o que decide se ela volta no minuto certo.
   */
  useEffect(() => {
    function guardar() {
      const v = video.current;
      if (!v || !Number.isFinite(v.duration) || v.currentTime <= 0) return;
      aoProgredir?.(v.currentTime, v.duration, true);
    }
    // `pagehide` já é a saída; `visibilitychange` dispara também na
    // volta, e aí não há nada a guardar.
    function aoEsconder() {
      if (document.visibilityState === "hidden") guardar();
    }
    document.addEventListener("visibilitychange", aoEsconder);
    window.addEventListener("pagehide", guardar);
    return () => {
      document.removeEventListener("visibilitychange", aoEsconder);
      window.removeEventListener("pagehide", guardar);
    };
  }, [aoProgredir]);

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

      {comecou || falhou ? null : (
        <div className="absolute inset-0 z-[3]">{capa}</div>
      )}

      {falhou ? (
        <div className="absolute inset-0 z-[6] flex flex-col items-center justify-center gap-4 px-6 text-center"
             style={{ background: "rgba(0,0,0,.86)" }}>
          <p className="m-0 max-w-[300px] text-[15px] leading-[1.6] text-white">
            Não conseguimos carregar este vídeo agora.
          </p>
          <button
            onClick={() => {
              ultimaRenovacao.current = 0;
              setFalhou(false);
              void renovar();
            }}
            className="min-h-[46px] rounded-pilula border-none px-6 text-[15px] font-bold"
            style={{ color: "#000000", background: "#ffffff", cursor: "pointer" }}
          >
            Tentar de novo
          </button>
        </div>
      ) : null}

      {falhou || (comecou && !terminou) ? null : (
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
