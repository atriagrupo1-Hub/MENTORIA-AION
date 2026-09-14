import { useNavigate, useParams } from "react-router-dom";
import { Aviso } from "@/components/Aviso";
import { Capa, capaAoVivo, capaAula, capaModulo } from "@/components/Capa";
import { Play } from "@/components/Icones";
import { useAviso } from "@/components/useAviso";
import {
  estadoDoModulo,
  rotuloBotaoModulo,
  rotuloConcluidas,
  rotuloEstadoModulo,
  type EstadoModulo,
} from "@/data/derivados";
import { rotuloDuracao, useEstado } from "@/data/estado";
import { cores, paleta } from "@/design/tokens";

/*
 * A capa do módulo abre a tela.
 *
 * Ela era um cartãozinho no meio da página, com margem dos dois lados e
 * cantos arredondados — o desenho de uma miniatura, não o de uma
 * abertura. No celular a arte passa a ocupar da borda esquerda à direita
 * e a maior parte da primeira tela, com o nome do módulo escrito dentro
 * dela. É como Netflix e Apple TV apresentam um título: a imagem e o
 * nome são a mesma coisa, não duas.
 *
 * O degradê por cima da arte não é enfeite. Ele é o que garante que o
 * texto branco continue legível sobre qualquer capa — clara, escura, ou
 * cheia de detalhe no pé — sem precisar de uma tarja sólida por baixo.
 * A última parada é preto puro, a mesma cor do fundo do aplicativo, para
 * a arte terminar sem costura visível.
 *
 * Na tela de computador a abertura continua sendo a de antes: capa em pé
 * à esquerda, texto à direita. As capas são retratos (2:3); esticadas na
 * largura de um monitor, sobraria uma tira do meio da arte e nada mais.
 */

/*
 * 44 pixels de altura, e não 34.
 *
 * É a medida mínima que Apple e Google publicam para alvo de toque, e
 * ela não é arbitrária: é o tamanho da polpa do dedo. Abaixo disso, a
 * aluna erra — e errar num botão que flutua sobre a capa, com o dedo
 * tapando o que ele mesmo está tentando acertar, erra mais ainda.
 */
const NAV: React.CSSProperties = {
  minHeight: 44,
  padding: "8px 14px",
  fontSize: 13,
  fontWeight: 700,
  whiteSpace: "nowrap",
  color: "#ffffff",
  background: "rgba(255,255,255,.14)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  border: "none",
  borderRadius: 99,
  cursor: "pointer",
};

/** Pílula redonda para ‹ e ›: sobre a arte, ocupam pouco e continuam alcançáveis. */
const SETA: React.CSSProperties = {
  ...NAV,
  width: 44,
  padding: 0,
  display: "grid",
  placeItems: "center",
  fontSize: 15,
};

const LINHA = "rgba(255,255,255,.08)";
const SUAVE = "rgba(255,255,255,.55)";

export function PaginaModulo() {
  const { mi } = useParams();
  const numero = Number(mi);
  const { catalogo, moduloLiberado, moduloVisivel, aulaBloqueada, concluida } = useEstado();
  const navegar = useNavigate();
  const aviso = useAviso();

  const modulo = catalogo.modulos.find((m) => m.numero === numero);
  // Módulo que não é dela responde igual a módulo inexistente: digitar o
  // endereço na barra não pode revelar que ele existe.
  if (!modulo || !moduloVisivel(modulo)) {
    return <main className="p-8">Módulo não encontrado.</main>;
  }

  const e = estadoDoModulo(modulo, moduloLiberado(modulo), concluida);
  const cor = paleta(modulo.numero);
  const aoVivo = catalogo.aoVivo[modulo.id];
  const proxima = modulo.aulas.findIndex((a) => !concluida(a.id));

  function irPara(destino: number) {
    const alvo = catalogo.modulos.filter(moduloVisivel).find((m) => m.numero === destino);
    if (!alvo) {
      aviso.mostrar(
        destino < numero
          ? "Este é o primeiro módulo da sua jornada."
          : "Este é o último módulo da sua jornada.",
      );
      return;
    }
    navegar(`/modulo/${destino}`);
  }

  function abrirAula(ordem: number) {
    const aula = modulo!.aulas[ordem];
    if (!aula) return;
    if (aulaBloqueada(modulo!, aula)) {
      aviso.mostrar("Esta aula será liberada no momento certo da sua jornada.");
      return;
    }
    navegar(`/aula/${modulo!.numero}/${ordem}`);
  }

  const iniciar = () => abrirAula(proxima >= 0 ? proxima : 0);

  return (
    <main className="entra pb-24">
      {/* ---------- abertura no celular: a arte é a tela ---------- */}
      <section
        className="relative hidden w-full overflow-hidden cel:block"
        style={{ height: "62vh", minHeight: 380 }}
      >
        <Capa
          caminhos={[capaModulo(modulo.numero)]}
          alt={`Capa do Módulo ${modulo.numero} — ${modulo.titulo}`}
          style={{ background: cores.placeholderCapa }}
        />
        <span
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,.6) 70%, #000000 100%)",
          }}
        />

        <div
          className="absolute inset-x-5 flex items-center gap-2"
          // Instalado no celular, a página começa atrás do relógio e da
          // bateria; a faixa do aparelho é devolvida aqui.
          style={{ top: "calc(12px + env(safe-area-inset-top))" }}
        >
          <button onClick={() => navegar("/inicio")} style={NAV}>
            ‹ Todos
          </button>
          <div className="ml-auto flex gap-2">
            <button onClick={() => irPara(numero - 1)} style={SETA} aria-label="Módulo anterior">
              ‹
            </button>
            <button onClick={() => irPara(numero + 1)} style={SETA} aria-label="Próximo módulo">
              ›
            </button>
          </div>
        </div>

        <div className="absolute inset-x-5 bottom-6">
          <p className="m-0 text-rotulo uppercase tracking-rotulo" style={{ color: SUAVE }}>
            Módulo {modulo.numero} · {rotuloEstadoModulo(e)}
          </p>
          {modulo.tituloNaArte ? null : (
            <h1
              className="text-heroi mb-0 mt-3 font-titulo font-semibold text-marfim"
            >
              {modulo.titulo}
            </h1>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-[1240px] px-7 cel-sm:px-5">
        {/* ---------- o que vem depois da arte, no celular ---------- */}
        <div className="hidden flex-col gap-5 pt-5 cel:flex">
          <p className="m-0 text-corpo text-[#b9ac9a]">{modulo.intro}</p>
          <Progresso estado={e} />
          <BotaoIniciar estado={e} aoClicar={iniciar} largo />
        </div>

        {/* ---------- abertura na tela grande ---------- */}
        <div className="cel:hidden">
          <div className="sem-barra mb-6 flex items-center gap-2 overflow-x-auto pt-9">
            <button onClick={() => navegar("/inicio")} style={NAV}>
              ‹ Todos
            </button>
            <button onClick={() => irPara(numero - 1)} style={NAV}>
              ‹ Anterior
            </button>
            <button onClick={() => irPara(numero + 1)} style={NAV}>
              Próximo ›
            </button>
          </div>

          <section className="flex flex-wrap gap-10">
            <div
              className="relative mx-auto aspect-[2/3] max-w-full flex-[0_0_clamp(190px,58vw,268px)] overflow-hidden rounded-[20px]"
              style={{
                background: cores.placeholderCapa,
                border: `1px solid rgba(${cor.rgb},.18)`,
              }}
            >
              <Capa
                caminhos={[capaModulo(modulo.numero)]}
                alt={`Capa do Módulo ${modulo.numero} — ${modulo.titulo}`}
              />
              {modulo.tituloNaArte ? null : (
                <>
                  <span
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(180deg, rgba(5,8,16,.1), rgba(5,8,16,.9))",
                    }}
                  />
                  <span className="absolute inset-x-5 bottom-6 font-titulo text-titulo leading-[1.15] text-marfim">
                    {modulo.titulo}
                  </span>
                </>
              )}
            </div>

            <div className="flex flex-[1_1_420px] flex-col gap-3">
              <p className="m-0 text-rotulo uppercase tracking-rotulo" style={{ color: SUAVE }}>
                Módulo {modulo.numero} · {rotuloEstadoModulo(e)}
              </p>
              <h1
                className="text-titulo m-0 font-titulo font-semibold text-marfim"
              >
                {modulo.titulo}
              </h1>
              <p className="m-0 max-w-[640px] text-corpo text-[#b9ac9a]">
                {modulo.intro}
              </p>
              <div className="mt-1 max-w-[460px]">
                <Progresso estado={e} />
              </div>
              <div className="mt-2">
                <BotaoIniciar estado={e} aoClicar={iniciar} largo={false} />
              </div>
            </div>
          </section>
        </div>

        {/* ---------- as aulas ---------- */}
        <section className="mt-11 cel:mt-8">
          <h2
            className="mb-4 mt-0 text-rotulo font-semibold uppercase tracking-rotulo"
            style={{ color: SUAVE }}
          >
            Aulas deste módulo
          </h2>

          <div className="flex flex-col">
            {modulo.aulas.map((aula) => {
              const feita = concluida(aula.id);
              const travada = aulaBloqueada(modulo, aula);
              return (
                <LinhaDaAula
                  key={aula.id}
                  aoAbrir={() => abrirAula(aula.ordem)}
                  caminhos={[capaAula(modulo.numero, aula.ordem), capaModulo(modulo.numero)]}
                  alt={`Capa da Aula ${aula.numero} — ${aula.titulo}`}
                  titulo={`${aula.numero}. ${aula.titulo}`}
                  detalhe={`${rotuloDuracao(modulo, aula)} · ${
                    travada ? "Bloqueada" : feita ? "Concluída" : "Disponível"
                  }`}
                  travada={travada}
                  feita={feita}
                />
              );
            })}

            <LinhaDaAula
              aoAbrir={() => {
                if (!aoVivo?.liberada) {
                  aviso.mostrar(
                    "Este encontro ao vivo será liberado no momento certo da sua jornada.",
                  );
                  return;
                }
                navegar(`/ao-vivo/${modulo.numero}`);
              }}
              caminhos={[capaAoVivo(modulo.numero), capaModulo(modulo.numero)]}
              alt={`Capa da aula ao vivo do Módulo ${modulo.numero}`}
              titulo={`${modulo.aulas.length + 1}. Aula ao vivo`}
              detalhe={`${aoVivo?.quandoTexto ?? "Encontro de 1 hora"} · ${
                aoVivo?.liberada ? "Disponível" : "Libera em breve"
              }`}
              travada={!aoVivo?.liberada}
              feita={false}
            />
          </div>
        </section>
      </div>

      <Aviso mensagem={aviso.mensagem} aoFechar={aviso.limpar} />
    </main>
  );
}

/**
 * A barra de progresso e a conta de aulas, na mesma linha.
 *
 * Eram três informações empilhadas — a barra, "5 aulas · 0 concluídas" e
 * "0% do módulo concluído". As duas últimas dizem a mesma coisa, e a
 * porcentagem já está desenhada na barra. Ficou uma linha só.
 */
function Progresso({ estado }: { estado: EstadoModulo }) {
  return (
    <div className="flex items-center gap-4">
      <div
        className="h-[3px] flex-1 overflow-hidden rounded-pilula"
        style={{ background: "rgba(255,255,255,.16)" }}
      >
        <div
          className="h-full rounded-pilula"
          style={{
            background: "#ffffff",
            width: `${estado.percentual}%`,
            transition: "width .9s cubic-bezier(.22,.61,.36,1)",
          }}
        />
      </div>
      <span className="flex-none text-corpo" style={{ color: SUAVE }}>
        {estado.total === 1 ? "1 aula" : `${estado.total} aulas`} ·{" "}
        {rotuloConcluidas(estado.concluidas)}
      </span>
    </div>
  );
}

function BotaoIniciar({
  estado,
  aoClicar,
  largo,
}: {
  estado: EstadoModulo;
  aoClicar: () => void;
  largo: boolean;
}) {
  return (
    <button
      onClick={aoClicar}
      className={`flex min-h-[56px] items-center justify-center gap-3 border-none bg-white px-7 py-4 text-realce font-bold text-black transition-opacity hover:opacity-[.86] ${
        largo ? "w-full rounded-cartao" : "self-start rounded-pilula"
      }`}
      style={{ cursor: "pointer" }}
    >
      <Play tamanho={14} />
      {rotuloBotaoModulo(estado)}
    </button>
  );
}

/**
 * Uma linha da lista: miniatura, título e uma linha só de detalhe.
 *
 * Duração e situação moravam em duas linhas separadas, o que dava três
 * alturas de texto por aula e uma lista que só cabia inteira rolando
 * bastante. Juntas num ponto médio dizem o mesmo em menos espaço.
 */
function LinhaDaAula({
  aoAbrir,
  caminhos,
  alt,
  titulo,
  detalhe,
  travada,
  feita,
}: {
  aoAbrir: () => void;
  caminhos: string[];
  alt: string;
  titulo: string;
  detalhe: string;
  travada: boolean;
  feita: boolean;
}) {
  return (
    <button
      onClick={aoAbrir}
      className="flex items-start gap-4 border-none bg-transparent py-4 text-left transition-opacity hover:opacity-80"
      style={{ borderBottom: `1px solid ${LINHA}`, cursor: "pointer" }}
    >
      <span
        className="relative aspect-video flex-[0_0_132px] overflow-hidden rounded-mini cel:flex-[0_0_104px]"
        style={{ background: cores.placeholderCapa }}
      >
        <Capa caminhos={caminhos} alt={alt} />
        <span
          className="absolute inset-0"
          style={{ background: travada ? "rgba(0,0,0,.62)" : "rgba(0,0,0,.28)" }}
        />
        <span
          className="absolute left-1/2 top-1/2 flex h-[34px] w-[34px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
          style={{ border: "2px solid rgba(255,255,255,.9)" }}
        >
          {travada ? (
            <Cadeado />
          ) : (
            <span className="ml-1">
              <Play tamanho={10} cor="#ffffff" />
            </span>
          )}
        </span>
      </span>

      <span className="flex flex-1 flex-col gap-2 pt-1">
        <span className="text-realce font-semibold text-white">{titulo}</span>
        <span className="text-corpo" style={{ color: SUAVE }}>
          {feita ? "✓ " : ""}
          {detalhe}
        </span>
      </span>
    </button>
  );
}

function Cadeado() {
  return (
    <span className="flex flex-col items-center">
      <span
        style={{
          width: 9,
          height: 6,
          border: "2px solid rgba(255,255,255,.9)",
          borderBottom: "none",
          borderRadius: "99px 99px 0 0",
        }}
      />
      <span style={{ width: 14, height: 10, background: "rgba(255,255,255,.9)", borderRadius: 2 }} />
    </span>
  );
}
