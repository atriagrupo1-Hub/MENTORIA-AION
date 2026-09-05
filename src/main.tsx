import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { ProvedorEstado } from "./data/estado";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ProvedorEstado>
        <App />
      </ProvedorEstado>
    </BrowserRouter>
  </StrictMode>,
);
