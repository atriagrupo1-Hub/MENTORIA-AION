# O endereço do aplicativo

Hoje o aplicativo atende em dois caminhos, e em mais nenhum:

| Endereço | O que é |
|---|---|
| `souaion.com/appmentoria` | a área da aluna |
| `souaion.com/admappmentoria` | o painel da equipe |
| `souaion.com` | nada — 404 |

O código não sabe o nome do domínio. Ele monta os endereços a partir de
onde a tela está aberta, e os dois caminhos estão em **um arquivo só**,
`src/enderecos.ts`. Trocar o caminho amanhã é mudar duas linhas; trocar
o domínio não encosta em linha nenhuma.

O que o código **não** pode fazer sozinho são os três passos abaixo.
Eles moram em painéis de outras empresas, e cada um quebra uma coisa
diferente — **em silêncio**, que é o que torna esta lista necessária.

---

## 1 · Cloudflare Pages — ligar o domínio ao projeto

**Onde:** Cloudflare → Workers & Pages → `mentoria-aion` → **Custom domains**
→ *Set up a custom domain* → `souaion.com`.

### O Pages vai parar em "Verifying" — e isso é normal

Mesmo com o domínio na sua própria conta, o Pages costuma parar em
**Verifying**, com um *Complete DNS setup* pedindo um CNAME. Ele não
cria o registro sozinho quando **já existe alguma coisa na raiz** — e
existe: todo domínio novo na Cloudflare nasce com um registro-marcador
ali. O Pages procura um registro apontando para ele, encontra o outro, e
fica esperando.

O aviso de "até 48 horas" na faixa azul é texto padrão. Dentro da mesma
conta, isto fecha em minutos.

### O registro

**Cloudflare → souaion.com → DNS → Records**

**Primeiro, apague o que já está na raiz.** Procure a linha cujo *Name* é
`souaion.com` (ou `@`) — vai ser um `A` ou um `AAAA`. Apague. A
Cloudflare não deixa um CNAME conviver com A/AAAA no mesmo nome, e é
essa disputa que segura a verificação.

**Depois, *Add record*:**

| Campo | Valor |
|---|---|
| Type | `CNAME` |
| Name | `@` |
| Target | `mentoria-aion.pages.dev` |
| Proxy status | **Proxied** (nuvem laranja) |

> **Por que `@`.** A tela do Pages mostra o campo *Name* vazio, e é o
> que mais confunde nesta etapa: para o domínio-raiz o que se digita é
> `@`. E sim, CNAME na raiz é proibido no DNS comum — a Cloudflare
> resolve isso achatando o registro (*CNAME flattening*), então ali é
> válido.

### O `www` — redireciona, não serve

Não é obrigatório. O aplicativo funciona inteiro sem ele. Mas quem
digitar `www.souaion.com` por hábito e não encontrar nada recebe a tela
de erro do navegador, e conclui que a mentoria saiu do ar.

O jeito de resolver **não** é acrescentar o `www` em *Custom domains*.
Isso o faria **servir o aplicativo**, e aí existiriam dois endereços
vivos para a mesma coisa — o que não é cosmético: o convite da aluna é
montado a partir de onde a tela está aberta. Abrindo o painel pelo
`www`, o convite sai com `https://www.souaion.com/appmentoria`, e passam
a circular dois endereços para a mesma mentoria, cada aluna com um.

O certo é o `www` **redirecionar**, em dois passos:

**DNS → Records → Add record:** `CNAME`, *Name* `www`, *Target*
`souaion.com`, **Proxied**.

**Rules → Redirect Rules → Create rule:** há um modelo pronto,
**"Redirect from WWW to Root"**. À mão:

| | |
|---|---|
| *If* | **Hostname** *equals* `www.souaion.com` |
| *Then* | **Static redirect** para `https://souaion.com` |
| | **Preserve path and query string** ligado |
| | Status **301** |

> O *preserve path* é o que importa: sem ele,
> `www.souaion.com/appmentoria` cairia na raiz — que é 404.

E **não** acrescente o `www` em *Custom domains*.

Por fim, volte ao Pages e clique em **Check DNS records**. O certificado
sai junto.

> **O que isso significa:** o projeto da mentoria passa a atender o
> domínio inteiro. `souaion.com` puro devolve 404 de propósito — quem
> não conhece o caminho não descobre por tentativa. No dia em que você
> quiser um site de vendas ali, ele entra neste mesmo projeto, na raiz,
> e os dois caminhos continuam funcionando sem mudar nada.

**Se pular:** nada acontece. O endereço novo simplesmente não existe.

**Como saber que fechou:** a linha do domínio em *Custom domains* passa
de *Verifying* para **Active**, com *SSL enabled*. É esse o sinal.

> **Não compare endereços de IP.** Com o CNAME proxiado, a Cloudflare
> serve o domínio a partir das faixas dela (`104.21.x`, `172.67.x`), que
> **não** são as mesmas do `mentoria-aion.pages.dev` (`172.66.x`) — e
> não têm de ser. Ver faixas diferentes é o comportamento normal de um
> registro certo, não sinal de problema.

---

## 2 · Supabase — dizer que o endereço novo é de confiança

**Onde:** Supabase → projeto **APP MENTORIA** → *Edge Functions* →
**Secrets**.

Encontre `ORIGENS_PERMITIDAS` e ponha o endereço novo junto do antigo,
separados por vírgula, **sem espaço e sem barra no fim**:

```
https://souaion.com,https://mentoria-aion.pages.dev
```

**Salvar já republica as quatro funções.** Um segredo novo só vale para
a próxima publicação, e o painel do Supabase faz essa publicação sozinho
ao gravar — medido: as quatro subiram uma versão, com o código idêntico.

**Como conferir:** em *Edge Functions*, o número em *Version* de cada uma
sobe em um. Se algum não subir, aí sim republique aquela função.

São estas quatro, e é a lista que vale para quem publicar pela CLI:

| Função | Por que ela lê o segredo |
|---|---|
| `entrar` | a aluna digitando o código |
| `cadastrar-aluna` | o botão "Cadastrar e liberar" |
| `cadastrar-colaborador` | a aba Equipe |
| `video-assinado` | o endereço assinado do vídeo |

> `video-assinado` é a mais fácil de esquecer, e some sozinha: o login
> funciona, o cadastro funciona, e o **vídeo não toca** — nem com o
> Cloudflare Stream configurado certo. Ela não aparece nas telas, então
> ninguém pensa nela.

Republicar à mão tem um risco que a CLI e o assistente precisam
respeitar: `entrar` é a única com `verify_jwt` **desligado** — tem de
ser, porque quem está entrando ainda não tem sessão. Publicá-la com o
`verify_jwt` ligado derruba o login de todo mundo de uma vez.

**Se pular:** este é o pior dos três, porque ninguém entende o que
aconteceu. A tela de entrada abre perfeitamente, a pessoa digita o
código, clica, e **nada acontece**. Nenhum erro, nenhuma mensagem. O
navegador recusou a resposta antes de o aplicativo vê-la. Você vai
procurar defeito no código e o defeito está nesta linha.

---

## 3 · Cloudflare Stream — liberar o vídeo no endereço novo

**Onde:** Cloudflare → Stream → cada vídeo → *Settings* → **Allowed
Origins**.

Ponha `souaion.com` — só o nome do domínio: **sem** `https://`, **sem**
barra, **sem** caminho. Para manter o endereço antigo funcionando
enquanto testa, ponha os dois: `souaion.com` e `mentoria-aion.pages.dev`.

> **Não encoste ainda no botão *Require Signed URLs***, que fica nessa
> mesma tela. Ele é o item B6, e é uma armadilha: ligado antes de os
> segredos `STREAM_CHAVE_ID` e `STREAM_CHAVE_JWK` existirem, o vídeo
> simplesmente para de tocar. Um assunto de cada vez.

> ⚠️ **Faça isto ANTES de subir os 49 vídeos que faltam.** O *Allowed
> Origins* é configurado **por vídeo**. Com 1 vídeo no ar é um campo;
> com 50, são cinquenta campos preenchidos à mão.

**Se pular:** a aula abre, a capa aparece, o botão de play responde — e
o vídeo não roda. Sem erro que explique.

---

## Como conferir, em cinco minutos

O teste é **cadastrar uma aluna**. Não é só a falta de uma conta pronta
para entrar — é que o cadastro exercita, numa tacada, as três coisas que
foram mexidas: a Edge Function que depende do segredo, o endereço que o
convite monta, e o vídeo.

1. **`souaion.com`** → tem de devolver **404**. Página preta, "Não
   encontrado". Se abrir o aplicativo, o `_redirects` não subiu.

2. **`souaion.com/admappmentoria`** → o painel. Confira o número da
   versão no canto superior direito: tem de ser o do último envio. Se
   for mais antigo, o Cloudflare ainda está publicando — espere e
   recarregue antes de seguir.

3. **Aba Alunas → Cadastrar aluna.** Preencha com um nome qualquer e
   clique em **Cadastrar e liberar**.
   - Deu erro ou não aconteceu nada? **É o passo 2** — o
     `ORIGENS_PERMITIDAS`. Esta tela chama a `cadastrar-aluna`, que só
     responde a origens conhecidas.

4. **No cartão que aparece**, leia a linha *Entre por aqui*. Tem de
   dizer `https://souaion.com/appmentoria`.
   - Disse outra coisa? Você está numa versão antiga em cache, ou abriu
     o painel pelo endereço velho — o convite sai sempre com o endereço
     de onde **você** está.

5. **Saia do painel e entre como essa aluna**, em
   `souaion.com/appmentoria`, com o nome de acesso e o código que você
   acabou de criar.
   - Travou no código, sem mensagem nenhuma? **É o passo 2** de novo —
     desta vez a função `entrar`.

6. **Abra a Aula 1 do Módulo 0** — é a única com vídeo hoje.
   - Capa aparece, play responde, vídeo não roda? **É o passo 3** — o
     *Allowed Origins* do Stream.

7. **Volte ao painel e remova a aluna de teste** pela ficha dela.

> Não há conta de aluna ativa na base — a `teste` está bloqueada, e o
> banco recusa o login dela antes de conferir o código. É por isso que o
> teste começa cadastrando, e não entrando.

---

## O endereço antigo

`mentoria-aion.pages.dev` continua funcionando, de graça, e é a sua
rede de segurança: se algo der errado com o domínio novo, você ainda
entra no painel por lá. Ninguém precisa saber que ele existe.

Só não o use para convidar alunas — o convite que o painel gera sempre
aponta para o endereço de onde **você** estava quando clicou. Se abrir o
painel pelo `pages.dev`, o convite vai levar a aluna para o `pages.dev`.

---

## As alunas que já receberam o endereço antigo

Nenhuma, hoje. Se um dia forem, o caminho é reenviar o convite pelo
painel — **Ficha da aluna → Enviar o acesso** — estando em
`souaion.com/admappmentoria`. A mensagem sai com o endereço novo, o nome
de acesso e o código dela.
