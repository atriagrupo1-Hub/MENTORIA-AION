import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Aviso } from "@/components/Aviso";
import { Capa, capaAula, capaModulo } from "@/components/Capa";
import { Play } from "@/components/Icones";
import { useAviso } from "@/components/useAviso";
import { tituloEmFrase } from "@/data/derivados";
import * as api from "@/data/api";
import type { ComentarioPublico } from "@/data/api";
import { minutosDaAula, relogio, rotuloDuracao, useEstado } from "@/data/estado";
import { cores, paleta } from "@/design/tokens";

const VELOCIDADES = ["0,5x", "0,75x", "Normal", "1,25x", "1,5x", "1,75x", "2x"];
const RESOLUCOES = ["Automática (720p)", "360p", "480p", "720p", "1080p"];

const ACAO: React.CSSProperties = {
  display: "flex",
  flex: "1 1 0",
  minWidth: 62,
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
  padding: "4px 2px",
  fontSize: 12,
  color: "rgba(255,255,255,.72)",
  background: "none",
  border: "none",
  cursor: "pointer",
  transition: "color .3s ease",
};

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
  const [painel, setPainel] = useState<"" | "material" | "exercicio">("");
  const [comentariosAbertos, setComentariosAbertos] = useState(true);
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

  async function enviarComentario(e: FormEvent) {
    e.preventDefault();
    const texto = rascunho.trim();
    if (!texto || !aulaId) return;
    setRascunho("");
    try {
      await api.comentar(aulaId, texto, segundoAtual);
      setComentarios(await api.comentariosDaAula(aulaId));
    } catch {
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

      <div className="sticky top-0 z-50 aspect-video w-full overflow-hidden bg-black">
        <Capa
          caminhos={[capaAula(modulo.numero, aula.ordem), capaModulo(modulo.numero)]}
          alt={`Capa da Aula ${aula.numero} — ${aula.titulo}`}
          opacidade={tocando ? 0.55 : 1}
        />

        <button
          onClick={fechar}
          aria-label="Fechar e voltar ao módulo"
          className="absolute right-[10px] top-[10px] z-[6] flex h-10 w-10 items-center justify-center border-none bg-transparent text-[22px] leading-none text-white hover:opacity-75"
          style={{ cursor: "pointer", textShadow: "0 1px 6px rgba(0,0,0,.8)" }}
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
                background: cores.ouro,
                width: `${pctVideo}%`,
                transition: "width .4s linear",
              }}
            />
            <span
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ left: `${pctVideo}%`, background: cores.ouro }}
            />
          </div>
        </div>
        )}
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
          Módulo {modulo.numero} • Aula {aula.numero} • {rotuloDuracao(modulo, aula)} •{" "}
          {feita ? "Aula concluída" : tocando || pctVideo > 0 ? "Aula em andamento" : "Disponível"}
        </p>

        <div className="flex items-center gap-3 pb-1 pt-[14px]">
          <span
            className="relative h-[46px] flex-[0_0_46px] overflow-hidden rounded-full"
            style={{ background: cores.placeholderCapa }}
          >
            <Capa
              caminhos={[capaModulo(modulo.numero)]}
              alt={`Capa do Módulo ${modulo.numero}`}
            />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
            <span className="text-[16px] font-bold text-white">Módulo {modulo.numero}</span>
            <span className="truncate text-[14px] text-white/55">
              {tituloEmFrase(modulo.titulo)}
            </span>
          </span>
          <button
            onClick={marcarConcluida}
            className="min-h-[36px] flex-none whitespace-nowrap rounded-pilula px-[14px] py-[9px] text-[12px]"
            style={{
              color: feita ? "#8fe0ac" : "rgba(255,255,255,.65)",
              background: feita ? cores.concluidoSelo : "transparent",
              border: `1px solid ${feita ? cores.concluidoSelo : "rgba(255,255,255,.22)"}`,
              cursor: "pointer",
            }}
          >
            {feita ? "Aula concluída" : "Marcar concluída"}
          </button>
        </div>

        <div className="sem-barra flex items-stretch overflow-x-auto pb-1 pt-3">
          {[
            { rotulo: "Anterior", glifo: "‹", acao: irParaAnterior, circulo: true },
            { rotulo: "Próxima", glifo: "›", acao: irParaProxima, circulo: true },
            {
              rotulo: "Curtir",
              glifo: curtiu(aula.id) ? "♥" : "♡",
              acao: () => void alternarCurtida(aula.id),
              cor: curtiu(aula.id) ? cores.ouroMedio : "rgba(255,255,255,.72)",
            },
            { rotulo: "Material", glifo: "▤", acao: () => setPainel("material") },
            { rotulo: "Exercício", glifo: "✎", acao: () => setPainel("exercicio") },
          ].map((item, i) => (
            <span key={item.rotulo} className="contents">
              {i > 0 ? (
                <span
                  className="h-[34px] w-px flex-none self-center"
                  style={{ background: "rgba(255,255,255,.12)" }}
                />
              ) : null}
              <button onClick={item.acao} style={ACAO} className="hover:!text-white">
                <span
                  className="grid h-[34px] place-items-center text-[19px] leading-none"
                  style={{
                    width: item.circulo ? 34 : undefined,
                    border: item.circulo ? "1px solid rgba(255,255,255,.35)" : undefined,
                    borderRadius: item.circulo ? "50%" : undefined,
                    color: item.cor,
                  }}
                >
                  {item.glifo}
                </span>
                {item.rotulo}
              </button>
            </span>
          ))}
        </div>

        {painel ? (
          <div className="mt-[10px] rounded-botao p-4" style={{ background: "#141414" }}>
            <div className="mb-[10px] flex items-center gap-[10px]">
              <h3 className="m-0 flex-1 text-[15px] font-bold text-white">
                {painel === "material" ? "Material complementar" : "Exercício da aula"}
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

            {painel === "material" ? (
              <div className="flex flex-col">
                <a
                  href={
                    aula.materialPath ??
                    `/assets/materiais/modulo-${modulo.numero}-aula-${aula.numero}.pdf`
                  }
                  target="_blank"
                  rel="noopener"
                  className="flex min-h-[48px] items-center gap-3 py-[10px] text-white no-underline"
                  style={{ borderBottom: "1px solid rgba(255,255,255,.08)" }}
                >
                  <span className="text-[10px] tracking-[.12em]" style={{ color: cores.ouro }}>
                    PDF
                  </span>
                  <span className="text-[14px]">Guia da aula</span>
                </a>
              </div>
            ) : null}

            <p className="mb-0 mt-[10px] text-[14px] leading-[1.6] text-white/70">
              {painel === "material"
                ? "O material desta aula será disponibilizado aqui."
                : `Escreva o que esta aula revelou a você sobre: ${aula.titulo}.`}
            </p>
          </div>
        ) : null}

        <section className="mt-[14px] rounded-botao p-4" style={{ background: "#141414" }}>
          <div className="flex items-center gap-[10px]">
            <h2 className="m-0 text-[17px] font-bold text-white">Comentários</h2>
            <span className="text-[15px] text-white/55">{comentarios.length}</span>
            <button
              onClick={() => setComentariosAbertos((v) => !v)}
              aria-label="Mostrar ou ocultar comentários"
              className="ml-auto grid h-[34px] w-[34px] place-items-center rounded-full bg-transparent text-[14px] text-white/70 hover:text-white"
              style={{ border: "1px solid rgba(255,255,255,.18)", cursor: "pointer" }}
            >
              {comentariosAbertos ? "⌃" : "⌄"}
            </button>
          </div>

          {comentariosAbertos ? (
            <div className="mt-3">
              <form onSubmit={enviarComentario} className="flex flex-col gap-2">
                <input
                  type="text"
                  value={rascunho}
                  onChange={(e) => setRascunho(e.target.value)}
                  placeholder="Adicionar comentário neste momento..."
                  aria-label="Adicionar comentário"
                  className="min-h-[46px] w-full rounded-pilula px-[18px] text-[14px] text-white outline-none"
                  style={{ background: "#1f1f1f", border: "1px solid rgba(255,255,255,.1)" }}
                />
                <div className="flex items-center gap-3">
                  <p className="m-0 flex-1 text-[12px] text-white/45">
                    Seu nome não será exibido
                  </p>
                  {rascunho.trim() ? (
                    <button
                      type="submit"
                      className="min-h-[34px] rounded-pilula border-none px-4 py-2 text-[13px] font-bold hover:opacity-[.88]"
                      style={{
                        color: cores.ouroTexto,
                        background: cores.ouro,
                        cursor: "pointer",
                      }}
                    >
                      Comentar em {relogio(segundoAtual)}
                    </button>
                  ) : null}
                </div>
              </form>

              <div className="mt-[6px] flex flex-col">
                {comentarios.map((c) => (
                  <div
                    key={c.id}
                    className="py-[14px]"
                    style={{ borderBottom: "1px solid rgba(255,255,255,.08)" }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-bold text-white">Anônimo</span>
                      <span className="text-[13px] text-white/35">•</span>
                      <button
                        onClick={() => setPctVideo((c.posicaoSegundos / duracaoSeg) * 100)}
                        aria-label="Voltar para este momento do vídeo"
                        className="rounded-[5px] border-none px-[9px] py-[3px] text-[12px]"
                        style={{
                          color: cores.ouroMedio,
                          background: "rgba(212,177,112,.14)",
                          cursor: "pointer",
                        }}
                      >
                        {relogio(c.posicaoSegundos)}
                      </button>
                      <span className="ml-auto text-[12px] text-white/35">
                        {new Date(c.criadoEm).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                    </div>
                    <p className="mb-0 mt-[7px] text-[14px] leading-[1.55] text-white/85">
                      {c.texto}
                    </p>
                  </div>
                ))}
              </div>

              {comentarios.length === 0 ? (
                <p className="mb-0 mt-[14px] text-[14px] text-white/45">
                  Seja a primeira a comentar nesta aula.
                </p>
              ) : null}
            </div>
          ) : null}
        </section>

        <h2
          className="mb-3 mt-[26px] text-[13px] font-bold uppercase tracking-[.22em]"
          style={{ color: cores.ouro }}
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
                      style={{ color: "#0a1a11", background: cores.concluidoSelo }}
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
                        style={{ background: cores.ouro, width: `${assistido}%` }}
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
