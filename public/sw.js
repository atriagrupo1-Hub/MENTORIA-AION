/**
 * Service worker — guarda o programa, nunca os dados.
 *
 * A regra do item 8 do README continua valendo inteira: o Supabase é a
 * única autoridade sobre autenticação, liberações e progresso. Por isso
 * este arquivo só toca em pedidos GET do próprio domínio. Tudo que vai
 * para o Supabase e para o Cloudflare Stream é de outra origem e passa
 * direto, sem nunca ser guardado — não existe resposta de liberação
 * dentro deste cache.
 *
 * Os arquivos de `/assets/` têm a versão carimbada no nome
 * (`index-B7c001H2.js`), então guardá-los para sempre é seguro: build
 * novo gera nome novo. O `index.html` é o contrário — é ele que aponta
 * para os nomes novos, então vai sempre à rede primeiro, e a cópia
 * guardada só serve quando não há internet.
 */

const CACHE = "aion-v1";
const CASCA = "/index.html";

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE).then((c) => c.add(CASCA)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const pedido = evento.request;
  if (pedido.method !== "GET") return;

  const endereco = new URL(pedido.url);
  if (endereco.origin !== self.location.origin) return;

  // Navegação: a rede manda. Sem rede, a casca guardada evita a tela de
  // erro do navegador — e a aluna vê o aviso do próprio app.
  if (pedido.mode === "navigate") {
    evento.respondWith(
      fetch(pedido).catch(() => caches.match(CASCA).then((r) => r ?? Response.error())),
    );
    return;
  }

  // Arquivos com versão no nome: guardados na primeira visita.
  if (endereco.pathname.startsWith("/assets/")) {
    evento.respondWith(
      caches.match(pedido).then(
        (guardado) =>
          guardado ??
          fetch(pedido).then((resposta) => {
            if (resposta.ok) {
              const copia = resposta.clone();
              caches.open(CACHE).then((c) => c.put(pedido, copia));
            }
            return resposta;
          }),
      ),
    );
  }
});
