/*
 * Teste do site NO AR — souaion.com, não o código aqui da máquina.
 *
 * Tudo que eu consigo medir daqui é o código construído localmente. O
 * que a aluna abre é o que a Cloudflare Pages publicou, e essa
 * diferença só fecha abrindo o endereço de verdade. Este arquivo faz
 * isso, do seu computador, onde a rede não é bloqueada.
 *
 * Rodar:  node previa/producao.mjs
 * Ver a janela abrir:  node previa/producao.mjs --olhando
 *
 * Para também entrar como aluna, sem escrever senha em lugar nenhum:
 *   PowerShell:  $env:ALUNA_NOME="..."; $env:ALUNA_CODIGO="..."
 * Sem essas duas, o teste roda só a parte que não precisa de conta.
 */
import { chromium } from "playwright";

const SITE = process.env.SITE || "https://souaion.com";
const NOME = process.env.ALUNA_NOME || "";
const CODIGO = process.env.ALUNA_CODIGO || "";
const OLHANDO = process.argv.includes("--olhando");

const falhas = [];
const ok = (nome, certo, detalhe = "") =>
  certo
    ? console.log("  ok    " + nome)
    : (falhas.push(nome), console.log("  FALHA " + nome + (detalhe ? "  — " + detalhe : "")));

console.log(`\nTestando ${SITE}\n`);

const nav = await chromium.launch({
  headless: !OLHANDO,
  slowMo: OLHANDO ? 300 : 0,
  /* CHROME só é preciso em máquina onde o navegador do Playwright mora
     fora do lugar padrão; no seu computador, deixe em branco. */
  ...(process.env.CHROME ? { executablePath: process.env.CHROME } : {}),
});

/* ---------- 1. o site responde e é o aplicativo ---------- */
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const pg = await ctx.newPage();

/*
 * Medir a REDE, não o console.
 *
 * O texto que o navegador escreve no console é o mesmo para uma recusa
 * esperada e para um defeito — "Failed to load resource: 401" —, e o
 * endereço nem sempre vem junto. Escutando a resposta, o endereço é o
 * da própria resposta: nunca falta e nunca mente.
 */
const recusas = [];
pg.on("response", (r) => {
  if (r.status() >= 400) recusas.push({ url: r.url(), status: r.status() });
});
/* Erro de JavaScript não é resposta de rede; continua vindo por aqui. */
const quebras = [];
pg.on("pageerror", (e) => quebras.push(String(e)));

let resposta;
try {
  resposta = await pg.goto(SITE, { waitUntil: "networkidle", timeout: 45000 });
} catch (e) {
  console.log("  FALHA o site não abriu — " + e.message);
  await nav.close();
  process.exit(1);
}
ok("o site responde", resposta.status() === 200, "veio " + resposta.status());
ok("é o aplicativo, não uma página de erro", (await pg.locator("#root").count()) > 0);

/* ---------- 2. o que está no ar é a versão de hoje ---------- */
const folhas = await pg.evaluate(() =>
  [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href),
);
let daVez = false;
for (const f of folhas) {
  const r = await pg.request.get(f);
  if ((await r.text()).includes("data-painel")) daVez = true;
}
ok(
  "no ar está a versão com as últimas correções",
  daVez,
  "a folha publicada não tem a regra `data-painel` — a Pages ainda não construiu o último envio",
);

/* ---------- 3. a tela de entrada ---------- */
ok("a tela de entrada aparece", (await pg.getByText("Entre para continuar").count()) > 0);
ok("tem onde escrever o nome", (await pg.locator("#aluna-nome").count()) > 0);
ok("tem onde escrever o código", (await pg.locator("#aluna-codigo").count()) > 0);
ok("tem o botão de entrar", (await pg.getByRole("button", { name: /Entrar na mentoria/i }).count()) > 0);

const rolaDeLado = await pg.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
);
ok("no celular não sobra nada para o lado", !rolaDeLado);

/* ---------- 4. erro de entrada tem resposta escrita ---------- */
/*
 * Nome que não existe, de propósito: errar o código de uma aluna de
 * verdade conta como tentativa e tranca a conta dela por 15 minutos.
 */
await pg.locator("#aluna-nome").fill("zzz-nao-existe-zzz");
await pg.locator("#aluna-codigo").fill("000000");
await pg.getByRole("button", { name: /Entrar na mentoria/i }).click();
await pg.waitForTimeout(4000);
const textoDepois = await pg.locator("body").innerText();
ok(
  "acesso inválido: a aluna lê o motivo",
  /não encontramos|inválid|incorret|confira/i.test(textoDepois),
  textoDepois.slice(0, 160).replace(/\n/g, " "),
);
ok("acesso inválido: não virou tela branca", (await pg.locator("#aluna-nome").count()) > 0);

/* ---------- 5. entrando de verdade (só se você passar os dois) ---------- */
if (NOME && CODIGO) {
  await pg.goto(SITE, { waitUntil: "networkidle" });
  await pg.locator("#aluna-nome").fill(NOME);
  await pg.locator("#aluna-codigo").fill(CODIGO);
  await pg.getByRole("button", { name: /Entrar na mentoria/i }).click();
  await pg.waitForTimeout(6000);

  const entrou = !/Entre para continuar/i.test(await pg.locator("body").innerText());
  ok("a aluna entra com nome e código", entrou, pg.url());

  if (entrou) {
    const corpo = await pg.locator("body").innerText();
    ok("a área dela tem conteúdo", corpo.trim().length > 60);
    ok("nenhum erro cru na tela", !/undefined|NaN|\[object Object\]|Error:/i.test(corpo));

    /*
     * Procurar a aula QUE TEM vídeo.
     *
     * A conta tem uma só, e abrir a primeira que aparece nunca ia
     * alcançá-la. Abre a primeira e anda pelo botão "Próxima aula",
     * parando assim que alguma pedir o vídeo e receber 200. A
     * navegação da aula é por código, não por link — andar pelo botão
     * é o único jeito sem adivinhar endereços.
     */
    const primeira = pg
      .locator('a[href*="/aula/"], button')
      .filter({ hasText: /aula|assistir|continuar/i })
      .first();

    if ((await primeira.count()) === 0) {
      console.log("  aviso  não achei por onde abrir uma aula");
    } else {
      const LIMITE = 15;
      let olhadas = 0;
      let achou = null;

      /*
       * A espera é armada ANTES do clique. Armada depois, o pedido do
       * vídeo já teria ido e voltado, e o teste ficaria esperando um
       * segundo pedido que nunca vem.
       */
      const esperarVideo = () =>
        pg
          .waitForResponse((r) => r.url().includes("video-assinado"), { timeout: 9000 })
          .catch(() => null);

      let espera = esperarVideo();
      await primeira.click();

      for (;;) {
        olhadas++;
        const resp = await espera;
        if (resp && resp.status() === 200) {
          achou = resp;
          break;
        }
        if (olhadas >= LIMITE) break;

        const proxima = pg.getByRole("button", { name: "Próxima aula" });
        if ((await proxima.count()) === 0) break;
        if (!(await proxima.first().isEnabled())) break;

        espera = esperarVideo();
        await proxima.first().click();
        await pg.waitForTimeout(1500);
      }

      if (achou) {
        ok("o vídeo foi pedido e liberado", achou.status() === 200, "veio " + achou.status());
        await pg.waitForTimeout(3000);
        ok("o tocador aparece na tela", (await pg.locator("video").count()) > 0);
        console.log("\n  >> o caminho do vídeo está provado: pedido, assinado, e o tocador na tela.");
      } else {
        console.log(
          `\n  aviso  olhei ${olhadas} aula(s) e nenhuma tem vídeo. Normal enquanto` +
            " só houver um vídeo na conta — mas o caminho do vídeo continua SEM PROVA" +
            " em produção. Depois de subir os vídeos, rode de novo.",
        );
      }
    }
  }
} else {
  console.log("\n  (sem ALUNA_NOME e ALUNA_CODIGO: a parte de entrar não rodou)");
}

/* ---------- 6. o que o servidor recusou ---------- */
/*
 * O que NÃO é defeito:
 *
 * - 401/403/423/429 vindos de `entrar`. É a recusa do acesso inválido
 *   que este mesmo teste provoca, de propósito. Resposta 4xx no
 *   console não quer dizer defeito: quer dizer que o servidor
 *   respondeu "não", que é o certo.
 * - 403 de `video-assinado`: aula sem vídeo.
 * - capa que não existe, favicon.
 */
const esperada = (r) =>
  /functions\/v1\/entrar/.test(r.url) ||
  (/video-assinado/.test(r.url) && r.status === 403) ||
  /\/capas\//.test(r.url) ||
  /favicon/i.test(r.url);

const graves = recusas.filter((r) => !esperada(r));
ok(
  "nenhuma recusa inesperada do servidor",
  graves.length === 0,
  graves.slice(0, 3).map((r) => r.status + " em " + r.url).join(" | "),
);
ok("nenhum erro de JavaScript na tela", quebras.length === 0, quebras.slice(0, 2).join(" | "));

await pg.screenshot({ path: "previa/producao-390.png", fullPage: false });
await ctx.close();
await nav.close();

console.log(
  falhas.length
    ? `\n${falhas.length} FALHA(S) — me mande esta saída e a imagem previa/producao-390.png\n`
    : "\nTUDO OK — o site no ar está funcionando\n",
);
process.exit(falhas.length ? 1 : 0);
