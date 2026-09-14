import { useEffect, useState } from "react";
import { cores } from "@/design/tokens";

/**
 * Convite para deixar a mentoria na tela inicial do celular.
 *
 * Os dois sistemas fazem isto de formas diferentes, e a diferença não é
 * de gosto: o Android avisa o site que dá para instalar, e aí basta um
 * botão. A Apple não avisa nada e não deixa nenhum site abrir a
 * instalação, então no iPhone o caminho é pelo menu Compartilhar e a
 * única coisa que podemos fazer é mostrar onde ele fica.
 *
 * Nada aqui decide acesso. A dispensa fica guardada no navegador só
 * para o convite não voltar todo dia — some quando ela instala.
 */

const DISPENSADO = "aion-convite-instalar";

/** O evento que o Chrome dispara quando a instalação está disponível. */
type EventoInstalar = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function jaInstalado(): boolean {
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  // O Safari não implementa `display-mode`; usa esta marca própria.
  return (navigator as { standalone?: boolean }).standalone === true;
}

function ehIPhone(): boolean {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPad recente se apresenta como Mac; o toque é o que o distingue.
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

export function ConviteInstalar() {
  const [visivel, setVisivel] = useState(false);
  const [convite, setConvite] = useState<EventoInstalar | null>(null);
  const [iPhone, setIPhone] = useState(false);

  useEffect(() => {
    if (jaInstalado()) return;
    try {
      if (localStorage.getItem(DISPENSADO)) return;
    } catch {
      // Navegador com armazenamento bloqueado: mostra o convite.
    }
    // Celular só. Numa tela grande o convite atrapalha e não ajuda.
    if (!window.matchMedia?.("(pointer: coarse)").matches) return;

    setIPhone(ehIPhone());
    setVisivel(true);

    function aoPoderInstalar(e: Event) {
      e.preventDefault();
      setConvite(e as EventoInstalar);
    }
    window.addEventListener("beforeinstallprompt", aoPoderInstalar);

    function aoInstalar() {
      setVisivel(false);
    }
    window.addEventListener("appinstalled", aoInstalar);

    return () => {
      window.removeEventListener("beforeinstallprompt", aoPoderInstalar);
      window.removeEventListener("appinstalled", aoInstalar);
    };
  }, []);

  if (!visivel) return null;

  function dispensar() {
    setVisivel(false);
    try {
      localStorage.setItem(DISPENSADO, "1");
    } catch {
      // Sem armazenamento, o convite volta na próxima visita. Tudo bem.
    }
  }

  async function instalar() {
    if (!convite) return;
    await convite.prompt();
    await convite.userChoice;
    setConvite(null);
    dispensar();
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[90] px-3 pb-3"
      // Acima da barra do rodapé, não em cima dela.
      style={{ paddingBottom: "calc(76px + env(safe-area-inset-bottom))" }}
    >
      <div
        className="entra mx-auto flex max-w-[520px] items-start gap-3 rounded-cartao-lg p-4"
        style={{
          background: "linear-gradient(170deg, rgba(16,24,42,.98), rgba(6,9,18,.99))",
          border: "1px solid rgba(255,255,255,.34)",
          boxShadow: "0 24px 60px rgba(0,0,0,.65)",
        }}
      >
        <img
          src="/icone-192.png"
          alt=""
          width={44}
          height={44}
          className="flex-none rounded-[11px]"
        />

        <div className="min-w-0 flex-1">
          <p className="mb-1 mt-0 text-corpo font-bold text-marfim">
            Deixe a mentoria na sua tela inicial
          </p>

          {iPhone ? (
            <>
              <p
                className="mb-0 mt-0 text-apoio leading-[1.6]"
                style={{ color: cores.textoSecundarioForte }}
              >
                Toque em <IconeCompartilhar /> <strong>Compartilhar</strong>, aqui embaixo, e
                escolha <strong>Adicionar à Tela de Início</strong>.
              </p>
              <p
                className="mb-0 mt-2 text-apoio"
                style={{ color: cores.textoSecundario }}
              >
                Não encontrou essa opção? Abra este endereço no Safari.
              </p>
            </>
          ) : convite ? (
            <>
              <p
                className="mb-3 mt-0 text-apoio leading-[1.6]"
                style={{ color: cores.textoSecundarioForte }}
              >
                Abre em tela cheia, como um aplicativo.
              </p>
              <button
                onClick={() => void instalar()}
                className="min-h-[42px] rounded-pilula border-none px-5 text-corpo font-bold"
                style={{ color: "#000000", background: "#ffffff", cursor: "pointer" }}
              >
                Instalar
              </button>
            </>
          ) : (
            <>
              <p
                className="mb-0 mt-0 text-apoio leading-[1.6]"
                style={{ color: cores.textoSecundarioForte }}
              >
                Toque no menu <strong>⋮</strong> do navegador e escolha{" "}
                <strong>Instalar aplicativo</strong>.
              </p>
              <p
                className="mb-0 mt-2 text-apoio"
                style={{ color: cores.textoSecundario }}
              >
                Não encontrou essa opção? Abra este endereço no Chrome.
              </p>
            </>
          )}
        </div>

        <button
          onClick={dispensar}
          aria-label="Dispensar"
          className="-mr-1 -mt-1 flex-none rounded-pilula px-3 py-2 text-realce leading-none"
          style={{
            color: cores.textoSecundario,
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

/** O glifo do botão Compartilhar do iPhone, para ela reconhecer na tela. */
function IconeCompartilhar() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={14}
      height={14}
      fill="none"
      stroke={"#ffffff"}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block align-[-2px]"
      aria-hidden="true"
    >
      <path d="M12 15V3" />
      <path d="M8 7l4-4 4 4" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}
