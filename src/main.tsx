import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { ProvedorEstado } from "./data/estado";
import "./index.css";

/**
 * Service worker: guarda só os arquivos do programa, e por isso é
 * registrado depois que a página carregou — nunca disputa banda com o
 * primeiro desenho da tela. Ver `public/sw.js`.
 */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // Sem service worker o app funciona igual; só não instala no Android.
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ProvedorEstado>
        <App />
      </ProvedorEstado>
    </BrowserRouter>
  </StrictMode>,
);
