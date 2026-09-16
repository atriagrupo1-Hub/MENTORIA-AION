# Trocar o endereço do aplicativo

Hoje o aplicativo responde em `mentoria-aion.pages.dev`. Trocar por um
domínio próprio são três passos, e **nenhum deles é no código** — o
aplicativo não tem o endereço escrito em lugar nenhum, usa sempre
caminhos relativos.

Dois desses passos derrubam o aplicativo em silêncio se ficarem para
trás, e é por isso que este arquivo existe.

---

## 1 · Apontar o domínio para a Cloudflare Pages

No painel da Cloudflare: **Workers & Pages → o projeto → Custom
domains → Set up a domain**.

Se o domínio já estiver na mesma conta Cloudflare, ela cria o registro
sozinha. Se estiver em outro lugar — Registro.br, GoDaddy —, ela mostra
o CNAME para você copiar para lá.

O certificado leva de alguns minutos a algumas horas. Até ele ficar
pronto, o endereço novo pode mostrar aviso de segurança. **Não é
problema no aplicativo**; é só esperar.

O endereço antigo continua funcionando. Os dois convivem.

---

## 2 · Avisar o Supabase — este é o que quebra o login

As três funções do servidor — `entrar`, `cadastrar-aluna` e
`video-assinado` — só respondem a endereços que estão numa lista.
Endereço fora da lista recebe a resposta, e o navegador joga fora antes
de a página ver: **a aluna digita o código, clica em entrar, e não
acontece nada.** Sem mensagem de erro, sem pista.

No painel do Supabase: **Edge Functions → Secrets → `ORIGENS_PERMITIDAS`**

Ponha os dois endereços, separados por vírgula e sem espaço:

```
https://SEU-DOMINIO.com.br,https://mentoria-aion.pages.dev
```

Os dois, e não só o novo. Enquanto o domínio novo não estiver no ar
para valer, você vai querer continuar entrando pelo antigo — e no dia
em que quiser fechar o antigo, é só tirar da lista.

> Se este segredo ainda não existe, as funções aceitam qualquer
> endereço. Funciona, mas é uma porta a menos: crie-o.

---

## 3 · Avisar o Cloudflare Stream — este derruba os vídeos

Se você tiver configurado **Allowed Origins** nos vídeos, o domínio
novo precisa entrar lá também. Senão a aula abre, o player aparece, e o
vídeo não começa.

No painel da Cloudflare: **Stream → o vídeo → Settings → Allowed
Origins**. É por vídeo, e é por isso que vale decidir o domínio **antes**
de subir os 49 vídeos que faltam.

---

## Depois de trocar

Entre pelo endereço novo e confira, nesta ordem:

1. **A tela de login abre** — passo 1 certo.
2. **O login funciona** — passo 2 certo.
3. **Um vídeo toca** — passo 3 certo.

Falhando o 2, é a lista de origens. Falhando o 3, é o Stream.

## Sobre quem já instalou o aplicativo

Quem instalou pelo endereço antigo continua no antigo — para o celular,
são dois aplicativos diferentes. Precisa desinstalar e instalar de novo
pelo endereço novo.

Hoje isso não afeta ninguém: nenhuma aluna está cadastrada. **É mais um
motivo para trocar o domínio antes de mandar o acesso para a turma.**
