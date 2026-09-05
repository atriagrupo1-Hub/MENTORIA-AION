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
        verificado: "#1d9bf0",
      },
      fontFamily: {
        titulo: ["'Cormorant Garamond'", "Georgia", "serif"],
        corpo: ["Lato", "Helvetica", "Arial", "sans-serif"],
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
