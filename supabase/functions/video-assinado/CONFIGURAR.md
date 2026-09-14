# Ligar as URLs assinadas

Este é o passo que fecha o acesso aos vídeos pagos. O código já está
pronto e publicado dos dois lados — falta a chave, e a chave só pode ser
criada por quem tem a conta do Cloudflare.

**Nada aqui deve passar por conversa, e-mail ou pelo repositório.** A
chave privada assina o acesso a todo o conteúdo pago da mentoria: quem a
tiver fabrica endereços válidos para qualquer aula, para sempre. Ela vai
do Cloudflare direto para os segredos do Supabase, e mais nada.

---

## O que muda

**Hoje**, o app monta o endereço do vídeo assim:

    https://videodelivery.net/<ID-DO-VIDEO>/manifest/video.m3u8

Esse `<ID-DO-VIDEO>` é permanente. Quem abrir as ferramentas do
navegador numa aula copia o identificador em alguns segundos — e a
partir daí o vídeo toca fora do aplicativo, sem login, para sempre.

**Depois**, no lugar do identificador vai um token que o Supabase assina
na hora, para aquela aluna e aquela aula, com prazo curto. Link copiado
morre sozinho.

**O que isto não resolve:** ninguém impede gravação de tela. Assinatura
protege o arquivo, não a imagem. O que ela evita é o caso real e comum —
o endereço circulando num grupo de mensagens.

---

## Passo 1 — criar a chave, no Cloudflare

No painel do Cloudflare, em **Stream → Settings → Signing keys**, crie
uma chave. Guarde os dois valores que ele mostra **uma única vez**:

- o **ID da chave** (uma sequência curta);
- a **chave privada em JWK**, que vem já em base64 — uma linha longa.

Se a tela do painel não oferecer a criação, o mesmo se faz pela API:

```
POST https://api.cloudflare.com/client/v4/accounts/<CONTA>/stream/keys
```

A resposta traz `result.id` e `result.jwk`. São exatamente os dois
valores acima.

> Se você perder a chave privada, não há como recuperá-la. Crie outra e
> troque o segredo no Supabase; a antiga pode ser apagada depois.

## Passo 2 — guardar a chave no Supabase

No painel do Supabase, em **Edge Functions → Secrets**, crie:

| Nome | Valor |
|---|---|
| `STREAM_CHAVE_ID` | o ID da chave |
| `STREAM_CHAVE_JWK` | a chave privada em JWK base64 |
| `STREAM_MINUTOS` | `120` (opcional — é o padrão) |
| `ORIGENS_PERMITIDAS` | `https://mentoria-aion.pages.dev` |

Cole a chave privada **direto no campo do Supabase**. Não passe por
nenhum outro lugar no caminho.

`ORIGENS_PERMITIDAS` não é a proteção — é uma cerca a mais. Quem decide
continua sendo o banco.

## Passo 3 — exigir assinatura, no Cloudflare

Enquanto os vídeos aceitarem endereço sem assinatura, assinar não muda
nada: o identificador antigo continua tocando. Em cada vídeo, ligue
**Require Signed URLs**.

Pela API, um vídeo de cada vez:

```
POST https://api.cloudflare.com/client/v4/accounts/<CONTA>/stream/<VIDEO>
     {"requireSignedURLs": true}
```

Nos vídeos que você ainda vai subir, dá para já subir com a exigência
ligada — é uma opção do envio.

**Faça este passo por último**, e comece por uma aula só. Assim dá para
conferir que ela toca antes de fechar as outras 49.

---

## Como saber se funcionou

Abra uma aula no aplicativo e olhe o endereço que o vídeo carrega (aba
**Rede**, das ferramentas do navegador).

- **Assinado:** o trecho antes de `/manifest/` é longo, com dois pontos
  separando três blocos — é um JWT.
- **Não assinado:** continua sendo o identificador curto de sempre.

Se ainda vier curto, a função não achou a chave. Os registros dela dizem
isso em voz alta: `chave de assinatura ausente; devolvendo uid sem
assinar`.

---

## O que acontece se algo der errado

A função foi escrita para **nunca tirar o app do ar por causa disto**:

- **Sem chave configurada** — ela devolve o identificador sem assinar,
  registra o aviso, e o vídeo toca como antes. Nada quebra enquanto você
  não terminar a configuração.
- **Chave errada ou falha ao assinar** — responde `503`, e o player
  mostra "Não conseguimos carregar este vídeo agora", com um botão de
  tentar de novo.
- **Token vencido com a aula aberta** — o player percebe, pede outro
  endereço sozinho e volta ao mesmo minuto. A aluna não vê nada.
- **Acesso da aluna mudou no meio** (prazo vencido, conta suspensa) — o
  banco não devolve a referência, a função não assina, e o vídeo para. É
  o comportamento certo.

---

## Por que o prazo é de duas horas

`STREAM_MINUTOS` vale 120 por padrão. As aulas têm entre 15 e 25
minutos, então sobra folga para quem pausa, atende o telefone e volta.

Diminuir encurta a vida de um link vazado; aumentar evita que uma aula
deixada aberta precise renovar. Como o player renova sozinho ao falhar,
encurtar é seguro. Abaixo de 30 minutos não vale a pena: o ganho é
pequeno e a chance de atrapalhar quem está assistindo cresce.
