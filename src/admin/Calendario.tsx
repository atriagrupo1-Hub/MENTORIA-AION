import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { painel as tema, RAIO } from "./estilos";

/**
 * Calendário para escolher quando uma aula abre.
 *
 * Aqui havia o campo de data do próprio navegador, e ele estragava a
 * edição de dois jeitos.
 *
 * O primeiro é visível: o calendário do navegador só abre por um ícone
 * de doze pixels na ponta do campo. Clicar no texto põe o cursor num
 * dos três pedaços — dia, mês ou ano — e a pessoa fica digitando número
 * às cegas, sem ver um mês inteiro em lugar nenhum.
 *
 * O segundo é pior porque não se vê: aquele campo dispara a cada tecla.
 * Digitar "22" no dia mandava DUAS gravações ao banco, cada uma com uma
 * data diferente — e a resposta da primeira voltava e reescrevia o
 * campo no meio da digitação, jogando o cursor para trás. Quem estava
 * editando via o número saltar sozinho e concluía, com razão, que a
 * tela estava quebrada.
 *
 * Este calendário grava uma vez, quando alguém escolhe um dia. Entre
 * abrir e escolher, nada sai daqui.
 *
 * Dia no passado é aceito de propósito: pôr ontem é como se diz "abre
 * agora" quando se está montando um cronograma para trás.
 */

const DIAS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** Meia-noite local. Comparar dias exige jogar fora as horas. */
function dia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function mesmoDia(a: Date, b: Date): boolean {
  return dia(a).getTime() === dia(b).getTime();
}

/** "22/09/2026" — curto, porque cabe numa linha com mais quatro coisas. */
export function dataCurtaBR(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function Calendario({
  valor,
  aoEscolher,
  desabilitado = false,
}: {
  /** A data escolhida hoje. Nula mostra o rótulo de vazio. */
  valor: Date | null;
  aoEscolher: (d: Date) => void;
  desabilitado?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [mes, setMes] = useState(() => dia(valor ?? new Date()));
  const [desvio, setDesvio] = useState(0);
  const caixa = useRef<HTMLDivElement>(null);
  const folha = useRef<HTMLDivElement>(null);

  /*
   * Abrir sempre mostra o mês da data escolhida.
   *
   * Sem isto, quem navegasse até dezembro, fechasse e reabrisse cairia
   * em dezembro de novo — num painel onde se percorre uma aula depois
   * da outra, cada uma com uma data diferente, isso vira uma caça ao
   * mês certo a cada linha.
   */
  useEffect(() => {
    if (aberto) setMes(dia(valor ?? new Date()));
  }, [aberto, valor]);

  /*
   * Puxa o calendário de volta quando ele passa da borda da tela.
   *
   * Ele é ancorado à direita do campo, que é o certo no computador. No
   * celular o campo fica perto da margem esquerda, e a folha — 252px de
   * largura — começava 83px fora da tela: um terço do mês, incluindo a
   * coluna de domingo, simplesmente não existia. Medido, não suposto.
   *
   * `useLayoutEffect` e não `useEffect`: a correção precisa acontecer
   * antes de o navegador pintar, senão o calendário aparece torto e
   * salta para o lugar.
   */
  useLayoutEffect(() => {
    if (!aberto) {
      setDesvio(0);
      return;
    }
    const el = folha.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const margem = 8;
    if (r.left < margem) setDesvio(margem - r.left);
    else if (r.right > window.innerWidth - margem) {
      setDesvio(window.innerWidth - margem - r.right);
    }
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const foraDaqui = (e: MouseEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    document.addEventListener("pointerdown", foraDaqui);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", foraDaqui);
      document.removeEventListener("keydown", escape);
    };
  }, [aberto]);

  const hoje = dia(new Date());
  const primeiro = new Date(mes.getFullYear(), mes.getMonth(), 1);
  const diasNoMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const vazios = primeiro.getDay();

  function escolher(numero: number) {
    aoEscolher(new Date(mes.getFullYear(), mes.getMonth(), numero));
    setAberto(false);
  }

  function andarMes(passo: number) {
    setMes(new Date(mes.getFullYear(), mes.getMonth() + passo, 1));
  }

  return (
    <div ref={caixa} className="relative flex-none">
      <button
        type="button"
        disabled={desabilitado}
        onClick={() => setAberto((v) => !v)}
        aria-label={valor ? `Mudar a data, hoje ${dataCurtaBR(valor)}` : "Escolher a data"}
        aria-expanded={aberto}
        style={{
          minHeight: 34,
          minWidth: 132,
          padding: "0 10px",
          fontSize: 12,
          color: tema.texto,
          background: aberto ? tema.superficieAlta : tema.superficie,
          border: `1px solid ${aberto ? tema.texto : tema.linha}`,
          borderRadius: RAIO,
          cursor: desabilitado ? "default" : "pointer",
          opacity: desabilitado ? 0.5 : 1,
        }}
      >
        {valor ? dataCurtaBR(valor) : "escolher data"}
      </button>

      {aberto ? (
        <div
          ref={folha}
          role="dialog"
          aria-label="Calendário"
          /*
            À direita e para baixo, com um empurrão lateral quando
            passa da borda (ver o efeito acima). Na última linha isto pode
            passar da borda de baixo do painel — e passar é melhor que a
            alternativa: um calendário que decide sozinho abrir para
            cima muda de lugar entre uma linha e outra, e a pessoa perde
            de vista onde ele vai aparecer.
          */
          className="absolute right-0 top-full z-50 mt-1 p-3"
          style={{
            width: 252,
            background: tema.superficieAlta,
            border: `1px solid ${tema.linha}`,
            borderRadius: RAIO + 2,
            boxShadow: "0 24px 50px rgba(0,0,0,.7)",
            transform: desvio ? `translateX(${desvio}px)` : undefined,
          }}
        >
          <div className="mb-2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => andarMes(-1)}
              aria-label="Mês anterior"
              style={seta}
            >
              ‹
            </button>
            <span
              className="flex-1 text-center text-[13px] font-semibold"
              style={{ color: tema.texto }}
            >
              {MESES[mes.getMonth()]} de {mes.getFullYear()}
            </span>
            <button
              type="button"
              onClick={() => andarMes(1)}
              aria-label="Próximo mês"
              style={seta}
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-[2px]">
            {DIAS.map((d, i) => (
              <span
                key={i}
                className="grid h-6 place-items-center text-[10px] uppercase"
                style={{ color: tema.textoTerciario }}
              >
                {d}
              </span>
            ))}

            {Array.from({ length: vazios }, (_, i) => (
              <span key={`vazio-${i}`} />
            ))}

            {Array.from({ length: diasNoMes }, (_, i) => {
              const numero = i + 1;
              const data = new Date(mes.getFullYear(), mes.getMonth(), numero);
              const escolhido = valor !== null && mesmoDia(data, valor);
              const eHoje = mesmoDia(data, hoje);
              return (
                <button
                  key={numero}
                  type="button"
                  onClick={() => escolher(numero)}
                  aria-label={`${numero} de ${MESES[mes.getMonth()]}`}
                  aria-current={escolhido ? "date" : undefined}
                  className="grid h-[30px] place-items-center text-[12px]"
                  style={{
                    color: escolhido ? "#000" : tema.texto,
                    background: escolhido ? tema.texto : "transparent",
                    // O dia de hoje ganha só um contorno. Preenchê-lo
                    // disputaria com o dia escolhido, e são coisas
                    // diferentes: um é onde estamos, o outro é o que vale.
                    border: `1px solid ${eHoje && !escolhido ? tema.linha : "transparent"}`,
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  {numero}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              aoEscolher(hoje);
              setAberto(false);
            }}
            className="mt-2 w-full"
            style={{
              minHeight: 32,
              fontSize: 12,
              color: tema.textoSecundario,
              background: "transparent",
              border: `1px solid ${tema.linhaSuave}`,
              borderRadius: RAIO,
              cursor: "pointer",
            }}
          >
            Hoje
          </button>
        </div>
      ) : null}
    </div>
  );
}

const seta: React.CSSProperties = {
  display: "grid",
  placeItems: "center",
  width: 30,
  height: 30,
  fontSize: 16,
  color: tema.texto,
  background: "transparent",
  border: `1px solid ${tema.linhaSuave}`,
  borderRadius: 6,
  cursor: "pointer",
};
