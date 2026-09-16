import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { PainelAdmin } from "./admin/PainelAdmin";
import { CAMINHO_APP, CAMINHO_PAINEL } from "./enderecos";
import { ProvedorEstado } from "./data/estado";
import "./index.css";

/*
 * Duas portas no mesmo domínio, e qual delas foi aberta decide tudo.
 *
 *   souaion.com/appmentoria      → a área da aluna, com suas rotas
 *   souaion.com/admappmentoria   → o painel, que não tem rotas
 *
 * São caminhos irmãos, e um roteador só aceita um `basename`. Então o
 * `basename` é escolhido aqui, uma vez, pelo caminho de entrada — e
 * dali para dentro nada mais precisa saber onde o aplicativo mora. As
 * vinte e quatro navegações da área da aluna continuam dizendo
 * `/inicio` e `/modulo/3`, como sempre disseram.
 *
 * O painel não entra no roteador da aluna de propósito. Ele não tem
 * rota nenhuma — é uma tela só, com abas — e deixá-lo fora significa
 * que o endereço dele não é adivinhável a partir do endereço dela.
 */
const noPainel =
  window.location.pathname === CAMINHO_PAINEL ||
  window.location.pathname.startsWith(CAMINHO_PAINEL + "/");

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
    <BrowserRouter basename={noPainel ? CAMINHO_PAINEL : CAMINHO_APP}>
      <ProvedorEstado>{noPainel ? <PainelAdmin /> : <App />}</ProvedorEstado>
    </BrowserRouter>
  </StrictMode>,
);
