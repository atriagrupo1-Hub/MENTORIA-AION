import { execSync } from "node:child_process";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * A versão publicada, carimbada dentro do pacote.
 *
 * Existe para acabar com uma dúvida que já custou tempo mais de uma vez:
 * "mudei, publiquei — e a tela continua igual". Sem um número visível não
 * dá para saber se o envio não chegou ou se o celular está mostrando o
 * que guardou. Com ele, um olhar responde.
 *
 * No Cloudflare vem da variável do próprio build; aqui vem do git; e se
 * nenhum dos dois responder, o build não pode quebrar por causa disso.
 */
function versaoPublicada(): string {
  const doCloudflare = process.env.CF_PAGES_COMMIT_SHA;
  if (doCloudflare) return doCloudflare.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "local";
  }
}

export default defineConfig({
  plugins: [react()],
  define: { __VERSAO__: JSON.stringify(versaoPublicada()) },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: { port: 5173 },
});
