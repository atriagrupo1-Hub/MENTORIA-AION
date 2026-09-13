import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Aviso } from "@/components/Aviso";
import { Capa, capaAula, capaModulo } from "@/components/Capa";
import { Play } from "@/components/Icones";
import { useAviso } from "@/components/useAviso";
import * as api from "@/data/api";
import type { ComentarioPublico } from "@/data/api";
import { minutosDaAula, relogio, rotuloDuracao, useEstado } from "@/data/estado";
import { cores, paleta } from "@/design/tokens";

const VELOCIDADES = ["0,5x", "0,75x", "Normal", "1,25x", "1,5x", "1,75x", "2x"];
const RESOLUCOES = ["Automática (720p)", "360p", "480p", "720p", "1080p"];

/**
 * Os passos do exercício, como a administradora escreveu no painel:
 * uma linha, um passo. Linha em branco não vira passo — assim ela pode
 * espaçar o texto enquanto escreve sem que apareça um número vazio.
 */
function passosDoExercicio(texto: string | null | undefined): string[] {
  return (texto ?? "")
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean);
}

/** O preto e branco desta tela: uma linha e um cinza, e nada mais. */
const LINHA = "rgba(255,255,255,.22)";
const SUAVE = "rgba(255,255,255,.62)";

export function TelaAula() {
  const { mi, li } = useParams();
  const numeroModulo = Number(mi);
  const ordem = Number(li);
  const navegar = useNavigate();
  const aviso = useAviso();
  const estado = useEstado();
  const {
    catalogo,
    concluida,
    curtiu,
    alternarConcluida,
    alternarCurtida,
    registrarPosicao,
    aulaBloqueada,
    moduloLiberado,
    moduloVisivel,
  } = estado;

  const [tocando, setTocando] = useState(false);
  const [pctVideo, setPctVideo] = useState(0);
  const [menuAberto, setMenuAberto] = useState(false);
  const [velocidade, setVelocidade] = useState(2);
  const [resolucao, setResolucao] = useState(0);
  const [painel, setPainel] = useState<"" | "exercicio">("");
  const [comentariosAbertos, setComentariosAbertos] = useState(false);
  const secaoComentarios = useRef<HTMLElement>(null);
  const [rascunho, setRascunho] = useState("");
  const [saindo, setSaindo] = useState(false);
  const [comentarios, setComentarios] = useState<ComentarioPublico[]>([]);
  const [video, setVideo] = useState<api.Video | null>(null);
  const timer = useRef<number | null>(null);

  const modulo = catalogo.modulos.find((m) => m.numero === numeroModulo);
  const aula = modulo?.aulas[ordem];

  const aulaId = aula?.id ?? null;

  useEffect(() => {
    setTocando(false);
    setPctVideo(0);
    setPainel("");
    if (timer.current) window.clearInterval(timer.current);
  }, [numeroModulo, ordem]);

  // Comentários e endereço do vídeo vêm do banco, por aula. O endereço
  // só é devolvido depois de o servidor conferir a liberação.
  useEffect(() => {
    if (!aulaId) return;
    let valeAinda = true;
    setComentarios([]);
    setVideo(null);
    void api
      .comentariosDaAula(aulaId)
      .then((lista) => valeAinda && setComentarios(lista))
      .catch(() => undefined);
    void api
      .videoDaAula(aulaId)
      .then((v) => valeAinda && setVideo(v))
      .catch(() => undefined);
    return () => {
      valeAinda = false;
    };
  }, [aulaId]);

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);

  /*
   * Aula que não é dela responde igual a aula que não existe.
   *
   * A interface já não deixa clicar, e o vídeo já não sai do servidor —
   * mas digitando o endereço na barra a tela abria assim mesmo, com
   * título, descrição e comentários de uma aula que ela não tem. Não é
   * vazamento de conteúdo pago, e o vídeo continuava sem tocar; é
   * apenas que não se confirma a ninguém o que existe do outro lado da
   * porta. É a mesma resposta que a página de módulo já dava.
   */
  if (!modulo || !aula || !moduloVisivel(modulo) || aulaBloqueada(modulo, aula)) {
    return <main className="p-8">Aula não encontrada.</main>;
  }

  const cor = paleta(modulo.numero);
  const feita = concluida(aula.id);
  const passos = passosDoExercicio(aula.exercicio);
  const duracaoSeg = minutosDaAula(modulo, aula) * 60;
  const segundoAtual = (pctVideo / 100) * duracaoSeg;


  /*
   * O avanço simulado é herança do protótipo, que não tinha vídeo: um
   * relógio empurrava a barra para a demonstração parecer viva.
   *
   * Com vídeo de verdade ele não pode rodar. Primeiro porque duplicaria
   * a barra do player do Cloudflare na tela. Segundo, e pior, porque
   * gravaria em `progresso` uma posição inventada — e é dela que sai o
   * "continue de onde parou". Progresso fingido é pior que progresso
   * nenhum: leva a aluna de volta ao ponto errado.
   *
   * Enquanto o player real não for conduzido pelo app, quem marca a
   * conclusão é a própria aluna, no botão.
   */
  function alternarPlay() {
    if (tocando) {
      if (timer.current) window.clearInterval(timer.current);
      setTocando(false);
      if (!video) registrarPosicao(aula!.id, (pctVideo / 100) * duracaoSeg, duracaoSeg);
      return;
    }
    setTocando(true);
    if (video) return;                       // o player do Cloudflare assume
    setPctVideo((v) => (v >= 100 ? 0 : v));
    if (timer.current) window.clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      setPctVideo((anterior) => {
        const proximo = Math.min(100, anterior + 1.5);
        registrarPosicao(aula!.id, (proximo / 100) * duracaoSeg, duracaoSeg);
        if (proximo >= 100) {
          if (timer.current) window.clearInterval(timer.current);
          setTocando(false);
        }
        return proximo;
      });
    }, 320);
  }

  function fechar() {
    setSaindo(true);
    window.setTimeout(() => navegar(`/modulo/${modulo!.numero}`), 280);
  }

  function irParaAnterior() {
    if (ordem > 0) return navegar(`/aula/${numeroModulo}/${ordem - 1}`);
    const anterior = catalogo.modulos.find((m) => m.numero === numeroModulo - 1);
    if (anterior && moduloLiberado(anterior)) {
      return navegar(`/aula/${anterior.numero}/${anterior.aulas.length - 1}`);
    }
    aviso.mostrar("Esta é a primeira aula da mentoria.");
  }

  function irParaProxima() {
    if (ordem + 1 < modulo!.aulas.length) {
      return navegar(`/aula/${numeroModulo}/${ordem + 1}`);
    }
    const seguinte = catalogo.modulos.find((m) => m.numero === numeroModulo + 1);
    if (!seguinte) {
      aviso.mostrar("Você chegou à última aula da mentoria.");
      return;
    }
    if (!moduloLiberado(seguinte)) {
      aviso.mostrar("Este módulo será liberado no momento certo da sua jornada.");
      return;
    }
    navegar(`/aula/${seguinte.numero}/0`);
  }

  /*
   * Concluir uma aula não libera nada.
   *
   * No protótipo liberava: terminar a aula abria a próxima, e terminar
   * o módulo abria o seguinte. Com o cronograma por aluna, quem abre é
   * a data que a administradora marcou — a conclusão só registra que a
   * aluna assistiu.
   *
   * O aviso antigo prometia uma liberação que não ia acontecer. A aluna
   * concluía, ia procurar a próxima aula e encontrava a data.
   */
  async function marcarConcluida() {
    const virou = await alternarConcluida(aula!.id);
    if (!virou) return;
    const ultimaDoModulo = ordem + 1 >= modulo!.aulas.length;
    aviso.mostrar(
      ultimaDoModulo ? "Módulo concluído." : "Aula concluída.",
    );
  }

  /*
   * O comentário aparece na hora, antes do banco confirmar.
   *
   * Antes eram duas idas a São Paulo em sequência — gravar e reler a
   * lista inteira — e a aluna ficava olhando para o nada no meio. Agora
   * ela vê o que escreveu imediatamente; a gravação acontece atrás, e a
   * releitura acerta os identificadores. Falhando, o texto volta para o
   * campo e a linha provisória some: nada fica no ar dizendo que foi
   * publicado quando não foi.
   */
  async function enviarComentario(e: FormEvent) {
    e.preventDefault();
    const texto = rascunho.trim();
    if (!texto || !aulaId) return;
    setRascunho("");
    setComentariosAbertos(true);

    const provisorio: api.ComentarioPublico = {
      id: `provisorio-${Date.now()}`,
      aulaId,
      texto,
      posicaoSegundos: 0,
      criadoEm: new Date().toISOString(),
      minha: true,
    };
    setComentarios((atuais) => [provisorio, ...atuais]);

    try {
      await api.comentar(aulaId, texto, segundoAtual);
      setComentarios(await api.comentariosDaAula(aulaId));
    } catch {
      setComentarios((atuais) => atuais.filter((c) => c.id !== provisorio.id));
      setRascunho(texto);
      aviso.mostrar("Não conseguimos publicar seu comentário. Tente de novo.");
    }
  }

  return (
    <main
      data-saindo={saindo ? "1" : "0"}
      className="tela-aula mx-auto max-w-[1080px] pb-[90px]"
    >
      {/*
        O escurecimento da tela inteira vinha do protótipo, onde não
        havia vídeo: servia para dar clima à demonstração. Com o player
        do Cloudflare na tela ele só atrapalha — some tudo em volta e a
        aula fica flutuando no preto. Fica apenas onde ainda não há
        vídeo cadastrado.
      */}
      {tocando && !video ? (
        <div
          className="rise-in pointer-events-none fixed inset-0 z-[45]"
          style={{ background: "rgba(0,0,0,.9)" }}
        />
      ) : null}

      {/*
        A faixa da barra de status, em preto, acima do vídeo — como faz
        qualquer aplicativo de vídeo no celular. Sem ela o relógio e a
        bateria caem em cima da arte da aula, porque o `viewport-fit=cover`
        do index.html manda a página começar atrás deles. No navegador de
        computador a medida é zero e a faixa não existe.
      */}
      <div className="sticky top-0 z-50 w-full bg-black">
        <div style={{ height: "env(safe-area-inset-top)" }} />
        <div className="relative aspect-video w-full overflow-hidden">
          <Capa
            caminhos={[capaAula(modulo.numero, aula.ordem), capaModulo(modulo.numero)]}
            alt={`Capa da Aula ${aula.numero} — ${aula.titulo}`}
            opacidade={tocando ? 0.55 : 1}
          />

          <button
            onClick={fechar}
            aria-label="Fechar e voltar ao módulo"
            /*
              Era um símbolo fino, sem fundo, colado no canto — onde o
              polegar tem menos precisão e onde ficam os botões do
              próprio navegador. Agora tem 44 px de alvo, um disco escuro
              por trás para existir contra a arte clara, e folga da
              quina.
            */
            className="absolute right-[14px] top-[14px] z-[6] flex h-11 w-11 items-center justify-center rounded-full border-none text-[19px] leading-none text-white hover:opacity-80"
            style={{
              background: "rgba(0,0,0,.55)",
              backdropFilter: "blur(6px)",
              cursor: "pointer",
            }}
          >
            ✕
          </button>

          {tocando && video ? (
            <iframe
              src={api.enderecoDoVideo(video)}
              title={aula.titulo}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="absolute inset-0 z-[4] h-full w-full border-0"
            />
          ) : null}

          {/* A camada de play não intercepta cliques fora do círculo. */}
          {!video && !tocando ? (
            <span
              className="absolute left-1/2 top-1/2 z-[5] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-pilula px-4 py-2 text-[13px]"
              style={{
                color: "rgba(255,255,255,.85)",
                background: "rgba(0,0,0,.5)",
                border: "1px solid rgba(255,255,255,.2)",
              }}
            >
              Vídeo em breve
            </span>
          ) : null}

          {video && !tocando ? (
            <button
              onClick={alternarPlay}
              aria-label="Assistir aula"
              className="absolute left-1/2 top-1/2 z-[5] flex h-[88px] w-[88px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition-transform duration-300 hover:scale-105"
              style={{
                background: "rgba(0,0,0,.3)",
                border: "3px solid #ffffff",
                cursor: "pointer",
              }}
            >
              <span className="ml-[6px]">
                <Play tamanho={26} cor="#ffffff" />
              </span>
            </button>
          ) : null}

          {/*
            Um player só: com o do Cloudflare na tela, a barra do app sai.

            Sai do DOM, e não por `hidden`: a classe `flex` declara
            `display:flex`, que vence o atributo. Escondido assim, ele
            continuava aparecendo.
          */}
          {tocando && video ? null : (
          <div className="absolute inset-x-[6px] bottom-[6px] z-[5] flex h-3 items-center">
            <div className="relative h-[3px] w-full" style={{ background: "rgba(255,255,255,.3)" }}>
              <div
                className="h-full"
                style={{
                  background: "#ffffff",
                  width: `${pctVideo}%`,
                  transition: "width .4s linear",
                }}
              />
              <span
                className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ left: `${pctVideo}%`, background: "#ffffff" }}
              />
            </div>
        </div>
        )}
        </div>
      </div>

      <div className="relative z-20 bg-black px-4 pt-[14px]">
        <div className="flex items-start gap-[10px]">
          <h1
            className="m-0 min-w-0 flex-1 font-bold leading-[1.3] text-white"
            style={{ fontSize: "clamp(17px, 4.4vw, 21px)" }}
          >
            {aula.numero}. {aula.titulo}
          </h1>
          {/*
            Velocidade e resolução do app nunca tocaram no vídeo: são do
            protótipo. O player do Cloudflare traz as duas de verdade,
            no próprio quadro. Manter as nossas seria oferecer botões
            que não fazem nada.
          */}
          {video ? null : (
          <div className="relative flex-none">
            <button
              onClick={() => setMenuAberto((v) => !v)}
              aria-label="Opções do player"
              className="flex h-10 w-[34px] flex-col items-center justify-center gap-[3px] border-none bg-transparent hover:opacity-70"
              style={{ cursor: "pointer" }}
            >
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-1 w-1 rounded-full bg-white" />
              ))}
            </button>

            {menuAberto ? (
              <div
                className="absolute right-0 top-[44px] z-40 w-[300px] max-w-[calc(100vw-32px)] rounded-botao p-[6px]"
                style={{
                  background: "#1b1b1b",
                  border: "1px solid rgba(255,255,255,.1)",
                  boxShadow: "0 24px 50px rgba(0,0,0,.7)",
                }}
              >
                {[
                  {
                    rotulo: "Velocidade",
                    valor: VELOCIDADES[velocidade],
                    ciclar: () => setVelocidade((v) => (v + 1) % VELOCIDADES.length),
                  },
                  {
                    rotulo: "Resolução",
                    valor: RESOLUCOES[resolucao],
                    ciclar: () => setResolucao((v) => (v + 1) % RESOLUCOES.length),
                  },
                ].map((item) => (
                  <button
                    key={item.rotulo}
                    onClick={item.ciclar}
                    className="flex min-h-[52px] w-full items-center rounded-lg border-none bg-transparent px-3 hover:bg-white/[.07]"
                    style={{ cursor: "pointer" }}
                  >
                    <span className="flex-1 text-left text-[16px] text-white">
                      {item.rotulo}
                    </span>
                    <span className="text-[15px] text-white/60">{item.valor}</span>
                    <span className="ml-[10px] text-[17px] text-white/60">›</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          )}
        </div>

        <p className="mb-0 mt-1 text-[14px] text-white/55">
          Módulo {modulo.numero} • Aula {aula.numero}
        </p>

        {/*
          A fileira de ações, em preto e branco.

          Dois grupos, como faz todo aplicativo de aula: à esquerda o que
          ela sente sobre a aula, à direita para onde ela vai. Nada de
          divisórias entre cinco itens iguais nem de cor para chamar
          atenção — numa tela que a aluna abre cinquenta vezes, cor vira
          ruído. O único destaque é o botão de concluir, e ele muda de
          estado, não de cor.
        */}
        <div className="flex flex-wrap items-center gap-3 pb-1 pt-4">
          <div
            className="flex items-center overflow-hidden rounded-pilula"
            style={{ border: `1px solid ${LINHA}` }}
          >
            <button
              onClick={() => void alternarCurtida(aula.id)}
              aria-label={curtiu(aula.id) ? "Descurtir" : "Curtir"}
              aria-pressed={curtiu(aula.id)}
              className="flex h-[42px] items-center gap-2 border-none bg-transparent px-[15px] text-[16px] hover:opacity-80"
              style={{ color: curtiu(aula.id) ? "#ffffff" : SUAVE, cursor: "pointer" }}
            >
              {curtiu(aula.id) ? "♥" : "♡"}
            </button>
            <span className="h-[18px] w-px flex-none" style={{ background: LINHA }} />
            <button
              onClick={() => {
                setComentariosAbertos(true);
                secaoComentarios.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
              aria-label="Ir para os comentários"
              className="flex h-[42px] items-center gap-2 border-none bg-transparent px-[15px] text-[15px] hover:opacity-80"
              style={{ color: SUAVE, cursor: "pointer" }}
            >
              <span className="text-[16px] leading-none">💬</span>
              {comentarios.length > 0 ? (
                <span className="text-[14px]">{comentarios.length}</span>
              ) : null}
            </button>
          </div>

          <span className="flex-1" />

          <div className="flex items-center gap-[10px]">
            <button
              onClick={irParaAnterior}
              aria-label="Aula anterior"
              className="grid h-[42px] w-[42px] place-items-center rounded-full bg-transparent text-[18px] hover:opacity-80"
              style={{ border: `1px solid ${LINHA}`, color: SUAVE, cursor: "pointer" }}
            >
              ←
            </button>

            <button
              onClick={marcarConcluida}
              aria-pressed={feita}
              className="flex h-[42px] items-center gap-2 rounded-pilula px-[18px] text-[14px] font-semibold hover:opacity-90"
              style={{
                color: feita ? "#000000" : "#ffffff",
                background: feita ? "#ffffff" : "transparent",
                border: `1px solid ${feita ? "#ffffff" : LINHA}`,
                cursor: "pointer",
              }}
            >
              <span className="text-[15px] leading-none">✓</span>
              {feita ? "Concluída" : "Concluir"}
            </button>

            <button
              onClick={irParaProxima}
              aria-label="Próxima aula"
              className="grid h-[42px] w-[42px] place-items-center rounded-full bg-transparent text-[18px] hover:opacity-80"
              style={{ border: `1px solid ${LINHA}`, color: SUAVE, cursor: "pointer" }}
            >
              →
            </button>
          </div>
        </div>

        {/* O exercício ganha a própria linha: é leitura, não navegação. */}
        {feita && passos.length > 0 ? (
          <button
            onClick={() => setPainel(painel === "exercicio" ? "" : "exercicio")}
            className="mt-3 flex min-h-[46px] w-full items-center gap-3 rounded-botao px-4 text-[14px] hover:opacity-85"
            style={{
              color: "#ffffff",
              background: "transparent",
              border: `1px solid ${LINHA}`,
              cursor: "pointer",
            }}
          >
            <span className="text-[15px] leading-none" style={{ color: SUAVE }}>
              ✎
            </span>
            <span className="flex-1 text-left">Exercício da aula</span>
            <span className="text-[15px] leading-none" style={{ color: SUAVE }}>
              {painel === "exercicio" ? "⌃" : "⌄"}
            </span>
          </button>
        ) : null}

        {painel === "exercicio" ? (
          <div className="mt-[10px] rounded-botao p-4" style={{ background: "#141414" }}>
            <div className="mb-3 flex items-center gap-[10px]">
              <h3 className="m-0 flex-1 text-[15px] font-bold text-white">
                Exercício da aula
              </h3>
              <button
                onClick={() => setPainel("")}
                aria-label="Fechar"
                className="h-[30px] w-[30px] border-none bg-transparent text-[16px] text-white/60 hover:text-white"
                style={{ cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <ol className="m-0 flex list-none flex-col gap-[14px] p-0">
              {passos.map((passo, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    className="grid h-[26px] w-[26px] flex-none place-items-center rounded-full text-[12px] font-bold"
                    style={{ color: "#ffffff", border: `1px solid ${LINHA}` }}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 pt-[3px] text-[14px] leading-[1.6] text-white/80">
                    {passo}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {/*
          Comentários.

          Convite primeiro, campo depois, lista fechada — a aluna acabou
          de assistir e o que se quer dela é a impressão fresca, não a
          leitura das outras. A lista abre num toque.

          Sem data e sem o carimbo de minuto: a data não ajudava a
          ninguém, e o minuto do vídeo virou promessa vazia quando o
          player passou a ser o do Cloudflare — clicar nele mexia numa
          barra que não é o vídeo. Quando o app conversar com o player
          de verdade, ele volta funcionando.
        */}
        <section
          ref={secaoComentarios}
          className="mt-[18px] rounded-botao p-4"
          style={{ background: "#101010", border: `1px solid ${LINHA}` }}
        >
          <p className="mb-3 mt-0 text-[15px] text-white">
            O que você achou desta aula?{" "}
            <span className="font-bold underline underline-offset-4">Comente!</span>
          </p>

          <form onSubmit={enviarComentario} className="flex items-center gap-2">
            <input
              type="text"
              value={rascunho}
              onChange={(e) => setRascunho(e.target.value)}
              placeholder="Adicione seu comentário aqui"
              aria-label="Adicionar comentário"
              className="min-h-[46px] w-full flex-1 rounded-botao px-4 text-[14px] text-white outline-none"
              style={{ background: "transparent", border: `1px solid ${LINHA}` }}
            />
            {rascunho.trim() ? (
              <button
                type="submit"
                className="min-h-[46px] flex-none rounded-botao border-none px-4 text-[14px] font-semibold hover:opacity-90"
                style={{ color: "#000000", background: "#ffffff", cursor: "pointer" }}
              >
                Enviar
              </button>
            ) : null}
          </form>

          <div className="mt-3 flex items-center">
            <span className="flex-1 text-[12px]" style={{ color: SUAVE }}>
              Seu nome não será exibido
            </span>
            {comentarios.length > 0 ? (
              <button
                onClick={() => setComentariosAbertos((v) => !v)}
                className="border-none bg-transparent text-[13px] underline underline-offset-4 hover:opacity-80"
                style={{ color: SUAVE, cursor: "pointer" }}
              >
                {comentariosAbertos
                  ? "Ocultar comentários"
                  : `Ver comentários (${comentarios.length})`}
              </button>
            ) : null}
          </div>

          {comentariosAbertos && comentarios.length > 0 ? (
            <div className="mt-2 flex flex-col">
              {comentarios.map((c) => (
                <div
                  key={c.id}
                  className="py-[14px]"
                  style={{ borderTop: "1px solid rgba(255,255,255,.08)" }}
                >
                  <p className="m-0 text-[13px] font-bold text-white">
                    {c.minha ? "Você" : "Anônimo"}
                  </p>
                  <p className="mb-0 mt-[6px] text-[14px] leading-[1.55] text-white/85">
                    {c.texto}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <h2
          className="mb-3 mt-[26px] text-[13px] font-bold uppercase tracking-[.22em]"
          style={{ color: SUAVE }}
        >
          Aulas do módulo {modulo.numero}
        </h2>

        <div className="flex flex-col">
          {modulo.aulas.map((outra) => {
            const feitaOutra = concluida(outra.id);
            const travada = aulaBloqueada(modulo, outra);
            const assistido = estado.percentualAssistido(outra.id);
            const atual = outra.ordem === ordem;
            return (
              <button
                key={outra.id}
                onClick={() => {
                  if (travada) {
                    aviso.mostrar("Esta aula será liberada no momento certo da sua jornada.");
                    return;
                  }
                  navegar(`/aula/${modulo.numero}/${outra.ordem}`);
                }}
                className="flex items-start gap-[14px] border-none bg-transparent py-3 text-left transition-opacity hover:opacity-[.82]"
                style={{ borderBottom: "1px solid rgba(255,255,255,.08)", cursor: "pointer" }}
              >
                <span
                  className="relative aspect-video flex-[0_0_clamp(126px,34vw,150px)] overflow-hidden rounded-mini"
                  style={{ background: cores.placeholderCapa }}
                >
                  <Capa
                    caminhos={[
                      capaAula(modulo.numero, outra.ordem),
                      capaModulo(modulo.numero),
                    ]}
                    alt={`Capa da Aula ${outra.numero} — ${outra.titulo}`}
                  />
                  <span
                    className="absolute inset-0"
                    style={{ background: travada ? "rgba(0,0,0,.62)" : "rgba(0,0,0,.28)" }}
                  />

                  {!travada && !feitaOutra ? (
                    <span
                      className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
                      style={{ border: "2px solid rgba(255,255,255,.92)" }}
                    >
                      <span className="ml-[3px]">
                        <Play tamanho={12} cor="#ffffff" />
                      </span>
                    </span>
                  ) : null}

                  {travada ? (
                    <span
                      className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full"
                      style={{ border: "2px solid rgba(255,255,255,.85)" }}
                    >
                      <span
                        style={{
                          width: 9,
                          height: 6,
                          border: "2px solid rgba(255,255,255,.9)",
                          borderBottom: "none",
                          borderRadius: "99px 99px 0 0",
                        }}
                      />
                      <span
                        style={{
                          width: 14,
                          height: 10,
                          background: "rgba(255,255,255,.9)",
                          borderRadius: 2,
                        }}
                      />
                    </span>
                  ) : null}

                  {feitaOutra && !travada ? (
                    <span
                      className="absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[19px]"
                      style={{ color: "#000000", background: "#ffffff" }}
                    >
                      ✓
                    </span>
                  ) : null}

                  <span
                    className="absolute bottom-[6px] right-[6px] rounded-[3px] px-[6px] py-[2px] text-[11px] text-white"
                    style={{ background: "rgba(0,0,0,.78)" }}
                  >
                    {relogio(minutosDaAula(modulo, outra) * 60)}
                  </span>

                  {!travada && !feitaOutra && assistido > 0 ? (
                    <span
                      className="absolute inset-x-0 bottom-0 h-[3px]"
                      style={{ background: "rgba(255,255,255,.28)" }}
                    >
                      <span
                        className="block h-full"
                        style={{ background: "#ffffff", width: `${assistido}%` }}
                      />
                    </span>
                  ) : null}

                  {atual ? (
                    <span
                      className="absolute inset-x-0 bottom-0 h-[3px]"
                      style={{ background: cor.destaque }}
                    />
                  ) : null}
                </span>

                <span className="flex min-w-0 flex-1 flex-col gap-1 pt-[2px]">
                  <span
                    className="text-[15px] font-bold leading-[1.35]"
                    style={{ color: atual ? "#ffffff" : "rgba(255,255,255,.62)" }}
                  >
                    {outra.numero}. {outra.titulo}
                  </span>
                  <span className="text-[13px] text-white/50">
                    {rotuloDuracao(modulo, outra)} •{" "}
                    {travada
                      ? "Bloqueada"
                      : feitaOutra
                        ? "Concluída"
                        : assistido > 0
                          ? "Em andamento"
                          : "Disponível"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Aviso mensagem={aviso.mensagem} aoFechar={aviso.limpar} />
    </main>
  );
}
