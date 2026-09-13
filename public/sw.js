/**
 * Service worker — guarda o programa, nunca os dados.
 *
 * A regra do item 8 do README continua valendo inteira: o Supabase é a
 * única autoridade sobre autenticação, liberações e progresso. Por isso
 * este arquivo só toca em pedidos GET do próprio domínio, e dentro
 * disso só em `/assets/`. Tudo que vai para o Supabase e para o
 * Cloudflare Stream é de outra origem e passa direto — não existe
 * resposta de liberação dentro deste cache.
 *
 * Ele NÃO intercepta a navegação. Foi a primeira coisa a sair quando o
 * Safari travou ao abrir o site: um service worker que responde pela
 * navegação assume um papel que o navegador fazia sozinho e bem, e o
 * ganho seria só uma tela de erro mais bonita quando falta internet.
 * Não vale o risco de ficar entre a aluna e a primeira tela.
 *
 * Sobra o que é seguro: os arquivos de `/assets/` têm a versão carimbada
 * no nome (`index-B7c001H2.js`), então guardá-los para sempre não prende
 * ninguém numa versão velha — build novo gera nome novo. É também o que
 * mantém o convite de instalar disponível no Android, que exige um
 * `fetch` registrado.
 */

const CACHE = "aion-assets-v2";

self.addEventListener("install", () => {
  // Nada a pré-carregar: o cache se enche sozinho, conforme a aluna usa.
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n)))),
  );
  // Sem `clients.claim()`: uma aba já aberta continua com quem a
  // carregou. Trocar o controlador no meio da vida da página é
  // justamente o tipo de surpresa que queremos longe daqui.
});

self.addEventListener("fetch", (evento) => {
  const pedido = evento.request;
  if (pedido.method !== "GET" || pedido.mode === "navigate") return;

  const endereco = new URL(pedido.url);
  if (endereco.origin !== self.location.origin) return;
  if (!endereco.pathname.startsWith("/assets/")) return;

  evento.respondWith(
    caches
      .match(pedido)
      .then(
        (guardado) =>
          guardado ??
          fetch(pedido).then((resposta) => {
            if (resposta.ok) {
              const copia = resposta.clone();
              caches.open(CACHE).then((c) => c.put(pedido, copia));
            }
            return resposta;
          }),
      )
      // Qualquer tropeço no cache: entrega o que vier da rede. O pior
      // que pode acontecer é o app não ficar guardado — nunca não abrir.
      .catch(() => fetch(pedido)),
  );
});
