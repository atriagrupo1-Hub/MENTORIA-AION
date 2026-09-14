import type { Config } from "tailwindcss";

/**
 * Tokens do item 3 do README do handoff. Cores, tipografia, raios e
 * transições aprovados — não redesenhar.
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#000000",
        marfim: "#f6efe3",
        "marfim-corpo": "#f3ece1",
        terciario: "#8d8477",
        ouro: "#d4b170",
        "ouro-claro": "#f0dca8",
        "ouro-medio": "#e2c485",
        "ouro-suave": "#e8cf9a",
        "ouro-escuro": "#b8934f",
        "ouro-texto": "#1a1408",
        concluido: "#9dc08b",
        "concluido-selo": "#5cc98a",
        alerta: "#e6a89a",
        "alerta-forte": "#b4453c",
      },
      fontFamily: {
        titulo: ["'Cormorant Garamond'", "Georgia", "serif"],
        corpo: ["Lato", "Helvetica", "Arial", "sans-serif"],
      },

      /*
       * A escala de texto.
       *
       * Antes havia dezessete tamanhos soltos pelas telas da aluna — 9,
       * 10, 10.5, 11, 12, 13, 14, 15, 16, 17, 18, 19, 22, 23, 25, 27,
       * 32 — mais nove rampas `clamp()` diferentes, cada uma inventada
       * na hora em que a tela foi escrita.
       *
       * Ninguém percebe um tamanho isolado. O que se percebe é o
       * conjunto: quando dois textos têm papéis diferentes mas quase o
       * mesmo tamanho, a tela fica sem hierarquia e o olho não sabe
       * onde pousar. É o que separa uma tela desenhada de uma tela
       * remendada, e era um dos motivos de o aplicativo parecer amador.
       *
       * Sete degraus, cada um com um trabalho. Cada um já traz a
       * entrelinha certa, porque o espaço entre as linhas é parte do
       * tamanho, não uma decisão à parte — texto corrido respira mais,
       * título respira menos.
       *
       * Os dois maiores crescem com a tela. Um título fixo que cabe no
       * celular fica pequeno no monitor, e o que enche o monitor não
       * cabe no celular.
       */
      fontSize: {
        rotulo: ["11px", { lineHeight: "1.4" }],
        apoio: ["13px", { lineHeight: "1.5" }],
        corpo: ["15px", { lineHeight: "1.6" }],
        realce: ["17px", { lineHeight: "1.35" }],
        secao: ["19px", { lineHeight: "1.3" }],
        titulo: ["clamp(21px, 5vw, 27px)", { lineHeight: "1.22" }],
        heroi: ["clamp(26px, 6.5vw, 40px)", { lineHeight: "1.14" }],
      },

      /*
       * Espaçamento entre letras: dois valores, e cada um tem razão.
       *
       * Havia nove — de .04em a .3em —, e a maior parte em rótulos
       * pequenos em maiúsculas. Espaçamento largo demais deixa de ser
       * elegância e vira ruído: as letras se soltam da palavra e o olho
       * lê letra por letra.
       *
       * `rotulo` é o que se usa nos micro-rótulos. `marca` é mais largo
       * de propósito, e vale só para o nome da mentoria no cabeçalho:
       * ali o texto não é informação a ler, é assinatura a reconhecer.
       */
      letterSpacing: {
        rotulo: ".12em",
        marca: ".2em",
      },
      borderRadius: {
        mini: "6px",
        campo: "10px",
        botao: "12px",
        cartao: "16px",
        "cartao-lg": "18px",
        pilula: "99px",
      },
      transitionTimingFunction: {
        suave: "cubic-bezier(.22,.61,.36,1)",
      },
      screens: {
        // Pontos de quebra do protótipo (item 3 do README).
        cel: { max: "640px" },
        "cel-sm": { max: "560px" },
      },
    },
  },
  plugins: [],
} satisfies Config;
