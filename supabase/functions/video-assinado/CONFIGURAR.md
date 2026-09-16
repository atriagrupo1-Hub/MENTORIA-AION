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

## Passo 1 — criar a chave

**Não procure no painel: não existe botão para isto.** A chave de
assinatura do Stream só nasce pela API — é assim para todo mundo, não é
falta de permissão na sua conta.

Você vai precisar de duas coisas antes:

**O ID da conta.** Abra o painel do Cloudflare e olhe o endereço na
barra do navegador: `dash.cloudflare.com/<ID-DA-CONTA>/...`. É aquela
sequência longa de letras e números. Ela também aparece na coluna da
direita, na página inicial da conta, como *Account ID*.

**Um token da API.** No painel: seu ícone no canto superior direito →
**My Profile** → **API Tokens** → **Create Token** → **Create Custom
Token**. Em *Permissions* escolha **Account** · **Cloudflare Stream** ·
**Edit**. Em *Account Resources* escolha a sua conta. Criar, e copiar o
token — ele também aparece uma vez só.

Com os dois em mãos, rode no terminal, dentro da pasta do projeto:

```
bash supabase/functions/video-assinado/criar-chave.sh
```

Ele pergunta os dois valores (o token não aparece enquanto você digita,
como uma senha) e imprime o que você precisa colar no passo 2.

Preferindo fazer à mão, é uma chamada só:

```
curl -X POST \
  "https://api.cloudflare.com/client/v4/accounts/<ID-DA-CONTA>/stream/keys" \
  -H "Authorization: Bearer <TOKEN>"
```

A resposta traz `result.id` e `result.jwk`. São os dois valores do
passo seguinte.

> A chave privada não é mostrada de novo. Perdendo, crie outra e troque
> o segredo no Supabase; a antiga pode ser apagada depois.

## Passo 2 — guardar a chave no Supabase

No painel do Supabase, em **Edge Functions → Secrets**, crie:

| Nome | Valor |
|---|---|
| `STREAM_CHAVE_ID` | o ID da chave |
| `STREAM_CHAVE_JWK` | a chave privada em JWK base64 |
| `STREAM_MINUTOS` | `120` (opcional — é o padrão) |
| `ORIGENS_PERMITIDAS` | `https://mentoria-aion.pages.dev` — e o domínio próprio quando houver; ver `TROCAR-DOMINIO.md` |

Cole a chave privada **direto no campo do Supabase**. Não passe por
nenhum outro lugar no caminho.

`ORIGENS_PERMITIDAS` não é a proteção — é uma cerca a mais. Quem decide
continua sendo o banco.

## Passo 3 — exigir assinatura, no Cloudflare

Enquanto os vídeos aceitarem endereço sem assinatura, assinar não muda
nada: o identificador antigo continua tocando. Em cada vídeo, ligue
**Require Signed URLs**.

Isto o painel faz: abra o vídeo em **Stream → Videos**, e nas opções
dele ligue *Require Signed URLs*. Nos vídeos que você ainda vai subir,
dá para já subir com a exigência ligada — é uma opção do envio.

Para não repetir cinquenta vezes, há um roteiro:

```
bash supabase/functions/video-assinado/exigir-assinatura.sh
```

Sem argumento ele **só lista** os vídeos e diz quais estão abertos.
Passando um identificador, fecha aquele. Com `--todos`, fecha o que
ainda estiver aberto.

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
