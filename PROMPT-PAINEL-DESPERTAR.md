# Aplicar as correções do painel AIÓN no painel do Despertar para Milagres

> Cole este texto inteiro numa sessão nova, dentro do repositório do
> Despertar para Milagres.

---

## O que é este pedido

Outro produto nosso (a mentoria AIÓN) passou por um pente-fino no painel
administrativo. Este documento traz **as correções que valeram a pena**,
para serem aplicadas no painel **que já existe aqui**.

**Isto não é um pedido para reescrever o painel.** A estrutura daqui
está certa e em vários pontos é melhor que a de lá. O que vem de lá é
comportamento de tela e três funcionalidades novas — nada de arquitetura.

---

## Antes de tocar em qualquer coisa

1. **Explore o projeto de verdade.** Este documento descreve defeitos
   observados em OUTRO repositório. Não assuma que os nomes de arquivo,
   de componente ou de coluna sejam os mesmos. Encontre os equivalentes
   aqui, e onde o defeito não existir, diga que não existe em vez de
   inventar uma correção.
2. **Rode o build antes de começar** e anote que está verde. Se já
   estiver quebrado, conserte isso primeiro e me avise.
3. **Me devolva uma lista** do que encontrou: quais dos 15 itens abaixo
   se aplicam aqui, quais já estão resolvidos, e quais não existem.
   Só depois comece a mexer.
4. Trabalhe **um bloco por vez**, com commit por bloco, para eu poder
   parar em qualquer ponto.

---

## O que NÃO pode mudar — regressões proibidas

Estas coisas aqui são **melhores** que no outro produto. Se alguma
correção abaixo parecer pedir o contrário, a correção está errada.

1. **O código do aluno é guardado com hash e nunca é exibido.** Mantenha
   exatamente assim. No outro produto o código está em texto puro no
   banco, e isso é um defeito de lá, não um padrão a seguir.
2. **O login do painel continua por e-mail e senha**, com a conferência
   da lista de administradores e o encerramento da sessão de quem não
   está nela. Não unifique com o login do aluno.
3. **O catálogo continua em três níveis:** Categoria › Curso › Aula.
4. **Rascunho / publicado / arquivado** continuam como estão.
5. **A ordenação** de categoria, curso e aula continua.
6. **Compras, anotações do aluno e tempo assistido** continuam.
7. **As duas travas da equipe** continuam: ninguém se remove sozinho, e
   o último administrador não sai.
8. **A regra de acesso mora no banco.** Nenhuma correção abaixo pode
   mover decisão de permissão para a tela. Esconder botão não é
   permissão: a tela esconde para não oferecer o que vai ser recusado, e
   o banco recusa de qualquer jeito.
9. **Toda ação do painel reconfere quem você é antes de gravar.** Isso
   não se afrouxa em nenhum dos itens abaixo.

---

# PARTE 1 — As 15 correções

Cada item traz **o defeito**, **a correção** e **como provar**. Se um
defeito não existir aqui, pule e diga.

## 1.1 · Confirmação com dois tons

**Defeito:** um único modal de confirmação, vermelho, que exige digitar
uma palavra, usado tanto para apagar quanto para liberar. Quando a trava
mais severa é usada dez vezes por dia para ações inofensivas, ela deixa
de ser trava: ensina a digitar a palavra por reflexo.

**Correção:** o componente de confirmação ganha um tom.

- `destrutivo` (padrão): vermelho, exige digitar `REMOVER`. Só para o
  que **apaga dado**: remover aluno, remover curso, remover aula,
  remover categoria, remover colaborador.
- `normal`: botão comum, sem digitação. Para o que **não apaga**:
  liberar produto, tirar produto, bloquear, desativar, arquivar,
  publicar, gerar cronograma.

Nenhuma trava destrutiva é afrouxada — só deixa de ser usada onde não
cabia.

**Como provar:** liste toda chamada ao modal e o tom de cada uma. Nenhuma
ação que apaga pode estar em `normal`, e nenhuma ação aditiva em
`destrutivo`.

## 1.2 · Toda ação destrutiva confirma

**Defeito:** ações que mudam o que o aluno vê disparam no primeiro
clique, sem pergunta.

**Correção:** confirmação (tom `normal`, salvo quando apaga) em:
bloquear aluno, desativar aluno, tirar produto, remover colaborador,
arquivar curso, ocultar categoria, tirar aula do cronograma.

Cada mensagem diz **quantos alunos são afetados**. "Isto tira o curso de
14 alunos" e "isto tira o curso de 1 aluna" não são a mesma decisão.

## 1.3 · Bloquear deixa de ser gêmeo de Editar

**Defeito:** o botão que tira conteúdo do ar usa o **mesmo objeto de
estilo**, byte a byte, do Editar que fica 8px ao lado.

**Correção:** o botão de bloquear/ocultar ganha cor e borda próprias. O
que remove usa o estilo de perigo já existente — nunca um vermelho
remontado à mão no local.

## 1.4 · Foco de teclado visível

**Defeito:** nenhum `:focus-visible` no projeto, e `outline: none` em
campos sem nada no lugar. Quem navega por teclado não enxerga onde está.

**Correção:** uma regra global, no CSS do painel:

```css
:where(a, button, input, textarea, select, summary, [tabindex]):focus-visible {
  outline: 2px solid #ffffff;
  outline-offset: 2px;
  border-radius: 4px;
  box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.9);
}
/* sobre superfície clara, inverte */
.bg-white:focus-visible,
[data-claro="sim"]:focus-visible {
  outline-color: #000000;
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.9);
}
```

`:focus-visible` e não `:focus`: só acende quando o foco veio do teclado,
então nada muda para quem usa mouse ou dedo. `outline` e não `border`:
não empurra layout.

Remova todo `outline: none` que não tenha substituto visível.

## 1.5 · Contraste, medido e não opinado

**Regra:** 4,5:1 para texto normal, 3:1 para texto grande (≥24px, ou
≥18,66px em negrito) e para **borda de controle**.

Sobre fundo preto, branco com transparência precisa de **alfa .46** para
texto e **alfa .35** para borda. Qualquer valor abaixo disso reprova.

**Onde olhar primeiro** (foi onde estava errado no outro produto):

| O quê | Costuma estar |
|---|---|
| borda de todo campo e todo botão de contorno | .14 → sobe para .36 |
| rótulos secundários | .36 → sobe para .46 |
| borda do botão de remover | muito fraca → sobe para .75 do vermelho |
| texto "sem conteúdo anexado" e afins | .42 → sobe para .55 |

São valores de alfa: **não mudam a identidade visual**, mudam a
visibilidade. Não troque cor nenhuma da marca.

**Atenção:** medir texto não encontra borda. Meça as duas coisas.

## 1.6 · Alvos de toque

**Regra:** nada clicável abaixo de **36px** no painel. Rodapé de
formulário e modal: **44px**.

**Onde costuma faltar:** caixas de marcar (uma caixa de 20px vira uma
área de toque de 44px com o desenho de 20px por dentro), setas de
reordenar, botões redondos só-ícone, dias de calendário, e os botões
pequenos que carregam Remover e Bloquear dentro de uma linha de lista.

## 1.7 · Dois tamanhos de botão, não sete

**Defeito:** o mesmo botão secundário em sete alturas diferentes
(32/34/36/40/42/44/46) e "Cancelar" em cinco medidas, cada tela
escolhendo números na hora.

**Correção:** dois, e só dois.

- **linha** — `36px`, fonte `13px`, padding `0 13px`: o que vive dentro
  de uma linha de lista.
- **grande** — `44px`, fonte `14px`, padding `0 18px`: rodapé de
  formulário e modal, e **todo "Cancelar", sem exceção**.

Botão redondo só-ícone é outra família: mantém a forma, mas nunca abaixo
de 36px.

## 1.8 · Cancelar em tudo que abre para editar

**Defeito:** abre uma gaveta ou formulário, desiste, e não há como
fechar sem gravar.

**Correção:** todo painel que abre para editar tem Cancelar, na medida
única do item 1.7. Modal fecha com **Esc**, e o foco entra na caixa ao
abrir (senão o teclado continua tabulando a página atrás do
escurecimento). `role="dialog"` e `aria-modal="true"`.

## 1.9 · Estado de carregamento

**Defeito:** enquanto o banco responde, a lista mostra "nenhum aluno
cadastrado" — a frase mais alarmante possível para quem administra uma
turma, e ela aparece a cada carregamento.

**Correção:** o componente lê o estado de carregamento antes de decidir
entre "carregando" e "vazio". São três estados, não dois.

## 1.10 · Avisos que dizem o que mudou

**Defeito:** "Estado do curso atualizado." — sem dizer se **bloqueou ou
desbloqueou**, sendo que é a única coisa daquela linha que muda o que o
aluno vê.

**Correção:** cada aviso nomeia o resultado: "Curso bloqueado para todos
os alunos." / "Curso liberado.". Vale para curso, aula, categoria e
aluno.

## 1.11 · Falha parcial não some

**Defeito:** uma tela grava três coisas (vídeo, capa, exercício)
encadeadas de um jeito que, se a primeira falhar, as outras **não
gravam** — e a mensagem fala só da primeira.

**Correção:** cada gravação é independente, e a mensagem cobre as
combinações: tudo certo, só uma falhou, todas falharam. Nunca uma
mensagem que descreve menos do que aconteceu.

## 1.12 · Mensagem de erro não pode contradizer a própria regra

**Defeito real encontrado:** a validação aceitava de 4 a 6 dígitos e a
mensagem dizia "O código tem 4 números". Quem tinha código de 6 lia isso
e o encurtava — o que não podia dar certo nunca. Nos registros do
servidor havia três erros seguidos antes da pessoa desistir.

**Correção:** percorra **toda** mensagem de erro do painel e do login e
confira se ela descreve a regra que a linha acima dela aplica. Onde
divergir, a mensagem muda — nunca a regra.

## 1.13 · Aba de comentários com moderação

**Correção:** listar comentários pendentes, ocultar, remover, e
**responder pelo painel assinando com o nome real de quem respondeu**.

Ocultar um comentário derruba as respostas em cascata: **diga isso antes,
na confirmação**, com a contagem — não depois, no aviso.

## 1.14 · Ficha do aluno: hierarquia

**Defeito:** o dado que a pessoa foi buscar vem menor que a decoração em
volta.

**Correção:** em cada bloco, o valor pesa mais que o rótulo. Nenhum
cartão de número fica menor que os irmãos ao lado. Se um bloco não tem
número, ele não vira rodapé dos que têm.

**Como provar:** meça `fontSize` computado de cada texto da tela e
mostre antes/depois. Não mude tamanho por gosto — só onde a medição
mostrar inversão.

## 1.15 · Aviso quando o campo de nome recebe um e-mail

**Defeito:** quem digita o e-mail no campo do nome recebe "não
encontramos este acesso" — verdade, e inútil.

**Correção:** enquanto o que estiver digitado contiver `@`, aparece sob o
campo um aviso dizendo que ali vai o nome de acesso, não o e-mail.
**É aviso, não trava:** o botão continua ativo.

---

# PARTE 2 — Terceiro papel: Suporte

Hoje existem dois papéis: Administrador e Dono. Entra um terceiro.

| Papel | O que alcança |
|---|---|
| **Dono** | Tudo. Único que mexe na equipe: adicionar, remover, trocar senha, bloquear. |
| **Administrador** | Tudo dentro do painel, menos o que é restrito ao Dono. |
| **Suporte** | Só Alunos e Comentários. Cadastra, libera produto, bloqueia, responde comentário. **Não alcança o catálogo.** |

**Como fazer sem quebrar o que existe:**

1. Três perguntas, escritas **no banco**, não na tela:
   `eh_dono()`, `eh_admin()` (dono **ou** administrador) e `eh_equipe()`
   (os três).
2. **Redefina `eh_admin()` para incluir o dono.** Assim toda função e
   toda regra que já pergunta "é admin?" continua funcionando sem ser
   tocada — é o que evita uma migração de 30 arquivos.
3. As mesmas três perguntas existem na tela **apenas** para não oferecer
   um botão que o banco vai recusar. Elas não decidem nada.
4. Ponham num arquivo só. Um `=== "admin"` esquecido num canto tranca o
   dono para fora do próprio painel.

**Armadilha de banco, se for PostgreSQL:** não dá para usar um valor novo
de `enum` na mesma transação que o adiciona. São duas migrações
separadas.

**Armadilha de RLS:** a subconsulta de uma política roda com o
privilégio de quem chamou. Se a política lê uma coluna que aquele papel
não pode ler, o erro que aparece é "permission denied" — enganoso.
Resolva com uma função `SECURITY DEFINER`.

**Prove com o banco, não com a tela.** Consulte como cada papel de
verdade e mostre: um suporte vê os alunos mas **nenhuma** senha de
colaborador, não vira dono, não bloqueia o dono, não edita o catálogo;
um administrador vê a equipe mas **nenhuma** senha, não promove
ninguém, não toca no dono.

---

# PARTE 3 — Prazo de acesso, com validade e renovação

Novo. Não existe hoje.

**O que é:** um acesso pode ter data de fim. Passou da data, o login
recusa — sem apagar nada, sem perder progresso.

**Decisão que você precisa me confirmar antes de construir:**
o prazo vale **por produto** (o aluno comprou o curso X com 1 ano) ou
**pela conta inteira**? Aqui se vende por produto, então **por produto**
é o que corresponde ao negócio — mas confirme comigo antes de escrever a
migração, porque desfazer depois é caro.

**Dados:**
- `acesso_ate` — data e hora, nulo = sem prazo.
- `renovado_em` — quando foi renovado pela última vez.
- `renovacoes` — quantas vezes.

**Na tela, três ações e nada mais:**
- **Definir a partir da compra** — conta o período a partir da data de
  entrada.
- **Acrescentar ao prazo atual** — soma ao fim que já existe. É o que se
  usa quando alguém renova.
- **Deixar sem prazo** — tira a data.

Períodos prontos (1 mês, 3, 6, 1 ano, vitalício), porque digitar data no
celular é onde se erra.

**Onde a regra mora:** no banco, na mesma função que hoje decide se o
login passa. Não na tela, e não numa checagem do lado do navegador.

**A lista de alunos ganha um filtro:** quem vence nos próximos 30 dias.
É a única razão de existir desta funcionalidade — ver quem está prestes a
sair antes de sair.

---

# PARTE 4 — Liberação por data dentro de um curso

Novo. Hoje a liberação é por produto: comprou, abriu tudo.

**O que é:** dentro de um curso liberado, cada aula pode ter uma data de
abertura. Antes dela, a aula aparece na lista **marcada como bloqueada,
com a data** — não escondida. O aluno precisa ver que existe.

**Dados:** uma linha por aluno e por aula, com `abre_em` (data e hora,
nulo = aberta desde já). É o cronograma daquele aluno.

**Na tela do aluno, no painel:**
- Escolher quais cursos entram no cronograma.
- Uma data de início e um intervalo em dias.
- **Ver o cronograma gerado antes de gravar** — a lista de aulas com a
  data de cada uma. Gerar às cegas e descobrir depois é o erro que essa
  prévia existe para impedir.
- Aula por aula: **abrir agora** e **tirar do cronograma**.
- Tirar uma aula apaga o progresso ligado a ela: **diga isso na
  confirmação**, antes.

**Regras que não se quebram:**
1. Cronograma **não substitui** a liberação por produto. São duas
   perguntas em série: o aluno tem o produto? a aula já abriu? As duas
   precisam ser sim, e **as duas são respondidas pelo banco**.
2. Aluno sem cronograma continua com tudo aberto. A funcionalidade nova
   não pode mudar o comportamento de quem já está lá dentro.
3. Nada de contar `50` ou qualquer total escrito à mão. Conte do
   catálogo — se o curso ganhar uma aula, um número fixo passa a mentir.

---

# Como verificar — vale para tudo acima

Não aceito "parece que funciona". Cada bloco entrega **número medido**.

1. **Rode o app de verdade** — o build, não um componente isolado — e
   dirija por navegador automatizado. Intercepte o banco com respostas
   de mentira para chegar em cada tela sem depender de dado real.
2. **A 390px e a 1180px.** Celular primeiro: é onde o público está.
3. **Alvo de toque:** meça o retângulo de **todo** elemento clicável de
   cada tela e reprove abaixo do mínimo. Não confie em ler o CSS.
4. **Contraste:** leia a cor computada e o fundo **opaco real** de cada
   texto (suba a árvore até achar um fundo que não seja transparente) e
   calcule a razão no navegador. Meça borda também.
5. **Sem corte:** reprove se `scrollWidth > clientWidth` em qualquer
   tela.
6. **Foco:** percorra por Tab e reprove se algum elemento focado não
   tiver contorno visível.
7. **Antes/depois** de cada tela que mudar de hierarquia, nas duas
   larguras.
8. **Permissão:** consulte o banco **como cada papel**, não como
   administrador. Tela não é prova.
9. **Build verde** ao fim de cada bloco. Se o build roda `tsc`, saiba
   que `tsc --noEmit` sozinho não pega tudo — o build é a prova.
10. **Apague o arranjo de teste no fim.** Ele não vai para o
    repositório.

---

# Como entregar

- **Um commit por bloco.** Mensagem que diz **o defeito, o número antes
  e o número depois**. "Melhorias de UX" não é mensagem de commit.
- **Antes de cada bloco novo, rode de novo as verificações dos blocos
  anteriores.** Regressão silenciosa é o risco real de uma passagem
  dessas.
- **Diga o que não fez e por quê.** Se algum item não se aplica aqui, ou
  se o custo não compensa, diga — não invente correção para item que não
  tem defeito.
- **Não mude regra de negócio, não crie página nova, não remova
  funcionalidade que funciona, e não mexa no banco sem necessidade.**
