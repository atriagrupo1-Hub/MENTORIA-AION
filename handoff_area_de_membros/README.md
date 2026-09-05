# Entrega para desenvolvimento — Área de membros "Caminho do Desbloqueio para Bênçãos Ilimitadas"

Documento em português, para uso com Claude Code. Escrito para quem **não participou** da construção: tudo o que é preciso saber está aqui.

---

## 1. O que é este projeto

Área de membros de uma mentoria cristã de transformação pessoal, com 11 módulos (numerados de 0 a 10) e 50 aulas. Público principal: mulheres cristãs acima de 50 anos — o que dita legibilidade, botões grandes, navegação evidente e nenhuma linguagem técnica na interface.

O produto tem três frentes já construídas e aprovadas: a área da aluna, uma cópia dela em estado de primeiro acesso, e um painel administrativo.

## 2. Sobre os arquivos em `app/`

**Estes arquivos são referência de design, não código de produção.** São protótipos em HTML que mostram exatamente a aparência e o comportamento pretendidos, construídos numa ferramenta de design (Design Components — cada `.dc.html` é um documento autossuficiente, com um template e uma classe de lógica em JavaScript; `support.js` é o runtime dessa ferramenta e não deve ser portado).

A tarefa **não é** publicar esses HTML como estão. É **recriar essas telas no ambiente do projeto de produção**, seguindo os padrões da stack escolhida. Não havendo stack ainda, a recomendação registrada com o cliente é React + TypeScript + Tailwind, front estático hospedado na Cloudflare Pages.

**Fidelidade: alta.** Cores, tipografia, espaçamentos, estados e textos estão finalizados e aprovados pelo cliente. Recriar fielmente. Toda a estilização nos arquivos é inline, por exigência da ferramenta de origem — na reconstrução, use o sistema de estilos da stack.

Arquivos incluídos:

| Arquivo | O que é |
|---|---|
| `Area de Membros.dc.html` | Área da aluna, jornada em andamento |
| `Area de Membros - Primeiro Acesso.dc.html` | A mesma área com progresso zerado (ver §9) |
| `Painel Administrativo.dc.html` | Painel da administradora |
| `Modelo de Dados.md` | Modelo de dados aprovado, com todas as decisões e o mapeamento do estado atual |
| `Banco de Dados.sql` | Script de criação do banco no Supabase: tabelas, RLS e funções |
| `support.js` | Runtime da ferramenta de design. Referência apenas; não portar |

---

## 3. Identidade visual

### Cores

| Uso | Valor |
|---|---|
| Fundo do aplicativo | `#000000`, com degradê no topo puxando a cor do módulo atual |
| Fundo de cartões e painéis | `linear-gradient(165deg, rgba(16,24,42,.85), rgba(6,9,18,.88))` |
| Texto principal | `#f6efe3` (marfim) |
| Texto secundário | `rgba(243,236,225,.55)` a `.72` |
| Texto terciário | `#8d8477` |
| Dourado principal | `#d4b170` |
| Dourado claro / destaque | `#f0dca8`, `#e2c485`, `#e8cf9a` |
| Dourado escuro | `#b8934f` |
| Gradiente de botão dourado | `linear-gradient(135deg, #f0dca8, #d4b170 55%, #b8934f)`, texto `#1a1408` |
| Botão branco (play) | `#ffffff`, texto e triângulo `#000000` |
| Botão de vidro | `rgba(255,255,255,.1)` + `backdrop-filter: blur(12px)` + borda `rgba(255,255,255,.4)` |
| Concluído | `#9dc08b`, e `#5cc98a` no selo circular |
| Alerta / remoção | `#e6a89a`, preenchimento `#b4453c` |
| Selo de verificado | `#1d9bf0` |
| Divisórias | `rgba(255,255,255,.07)` a `.1` |

**Cor por módulo.** Cada módulo tem uma cor amostrada da própria capa, usada no degradê do topo, na borda do cartão, no selo de estado, na barra de progresso e no percentual. Valores em RGB, como estão no código (`PALETTE`):

| Módulo | RGB | Destaque |
|---|---|---|
| 0 | `157,117,54` | `#d9b273` |
| 1 | `115,27,27` | `#d4635c` |
| 2 | `28,68,108` | `#6fa4dc` |
| 3 | `87,49,109` | `#ab88d4` |
| 4 | `51,91,136` | `#8fbde8` |
| 5 | `121,128,58` | `#c3cd84` |
| 6 | `152,93,32` | `#e8ab61` |
| 7 | `29,78,129` | `#7fb6ee` |
| 8 | `112,46,68` | `#e793b4` |
| 9 | `144,98,55` | `#f0b96e` |
| 10 | sem arte final | `#c9b795` (neutro) |

Degradê do topo, com a cor do módulo em que a aluna está:
`linear-gradient(180deg, rgba(C,.95) 0px, rgba(C,.5) 190px, rgba(0,0,0,.55) 340px, #000 520px) no-repeat, #000`

### Tipografia

- **Títulos:** Cormorant Garamond (Google Fonts), pesos 400–700
- **Textos e interface:** Lato (Google Fonts), pesos 300/400/700
- Números sempre com algarismos alinhados: `font-variant-numeric: lining-nums`

Escala usada, em `clamp(mínimo, fluido, máximo)` — o mínimo é o valor no celular:

| Elemento | Tamanho |
|---|---|
| Nome da mentoria no login | `clamp(21px, 5.4cqw, 28px)`, Cormorant, `letter-spacing: .1em` |
| Título de tela | `clamp(21px, 4.8cqw, 30px)`, Cormorant |
| Título de módulo | `clamp(17px, 3.8cqw, 26px)`, Cormorant |
| Título da aula (tela da aula) | `clamp(14px, 3.2cqw, 20px)`, peso 700, uma linha com reticências |
| Título de aula em lista | 15px, peso 700 |
| Texto corrido | 15px, `line-height: 1.6` |
| Rótulo em maiúsculas | 10–12px, `letter-spacing: .1em` a `.3em` |
| Meta e duração | 12–14px |

**Nota importante:** os arquivos usam `cqw` (unidade de contêiner) e `@container` em vez de `vw` e `@media`, porque o protótipo simula a largura de celular dentro de uma coluna de 402px. Na reconstrução, use `vw` e `@media` normalmente. Os pontos de quebra são 640px e 560px.

### Formas e movimento

- Raios: 6px (miniatura), 10–12px (campo, botão retangular), 16–18px (cartão), 99px (pílula)
- Pílulas de ação: altura 32–44px; botões principais 50–56px; alvos de toque nunca abaixo de 40px
- Transições lentas e discretas: 0,3s a 0,5s, `ease` ou `cubic-bezier(.22,.61,.36,1)`
- Entrada de tela: `riseIn` — de `opacity: 0` e `translateY(12px)` para o естado normal, 0,7–0,9s
- Cartão no hover: `translateY(-6px)` e sombra dourada
- `@media (prefers-reduced-motion: reduce)` desliga todas as animações — manter

---

## 4. Telas — área da aluna

### 4.1 Login

Centralizado, largura máxima 460px.

**Topo:** foto circular de 132px com anel dourado de 2px e brilho (`0 0 44px -12px rgba(212,177,112,.6)`); dentro dela, quando não há imagem, silhueta em CSS e a legenda monoespaçada "foto da mentora". Selo azul de verificado, 32px, em `top: 10px; right: 10px`, com borda de 2px na cor do fundo. Abaixo: "MENTORIA" (11px, `letter-spacing: .3em`), depois "CAMINHO DO DESBLOQUEIO" e "PARA BÊNÇÃOS ILIMITADAS" em Cormorant dourado.

**Cartão:** "Bem-vinda de volta" (peso 700, centralizado) e "Entre para continuar sua jornada". Dois campos com ícone desenhado em CSS à esquerda (silhueta de pessoa e cadeado), 54px de altura, foco com borda dourada e halo. O segundo campo tem botão de olho para mostrar/ocultar.

**Botão:** pílula dourada de largura total, "Entrar na mentoria", com seta em círculo à direita.

**Rodapé do cartão:** divisória com "ambiente exclusivo" e a frase "Acesso reservado às alunas da mentoria." Abaixo do cartão, três selos: Acesso protegido, Dados privados, Turma verificada.

**Comportamento atual (protótipo):** aceita qualquer nome e qualquer código, desde que ambos preenchidos, e valida contra a lista do painel quando existe.

**Comportamento de produção:** dois campos — "Seu nome" e "Seu código" (4 números, teclado numérico no celular). Conferência no servidor, travamento após 5 erros por 15 minutos. Detalhes no item (E) de `Modelo de Dados.md`.

### 4.2 Cabeçalho

Fixo no topo, fundo transparente sobre o degradê do módulo, borda inferior `rgba(255,255,255,.08)`. Nome da mentoria à esquerda (centralizado e em linha própria no celular). Quatro pílulas de vidro: **Início · Módulos · Presentes · Perfil** — uma linha só, deslizável na horizontal no celular, 44px de altura. No canto direito, um ícone quase invisível (`▢`, opacidade 22%) que alterna a visualização entre celular e computador — é ferramenta de demonstração e **não deve ir para produção**.

O cabeçalho desaparece por completo na tela da aula.

### 4.3 Início

**Bloco em destaque:** capa da aula em andamento ocupando a largura, proporção 2:3, com escurecimento gradual e, sobre ela na parte de baixo: "CONTINUE ASSISTINDO", nome do módulo, título da aula em Cormorant, duração e estado, e dois botões em pílula de largura total — branco com triângulo de play ("Continuar de onde parei" / "Começar a primeira aula") e translúcido com sinal de mais ("Ver módulo").

Não havendo nenhuma aula liberada, o bloco é substituído por um espaço com cadeado e a mensagem "Seu conteúdo será liberado em breve. / Assim que a primeira aula estiver disponível, ela aparecerá aqui." — sem botão.

**Módulos:** carrossel horizontal no desktop (cartões de 252px, setas circulares de 56px); coluna de cartões em largura total no celular, sem setas. Cada cartão: capa 2:3, selo de estado no topo esquerdo na cor do módulo, pílula branca centralizada ("Assistir agora" / "Assistir de novo" / "Libera em breve", esta translúcida e sem play), e abaixo da capa a contagem de aulas e a barra de progresso. Módulo bloqueado: capa a 42% de opacidade, cadeado desenhado em CSS no centro, sem selo no topo.

### 4.4 Módulos (lista)

Linhas horizontais que não quebram: capa vertical de 74px à esquerda, no meio o rótulo ("Módulo 1 · Módulo em andamento"), título, barra de progresso e contagem, e à direita a pílula de ação. No celular a pílula vira botão circular de 38px, com play ou cadeado, devolvendo largura ao título.

### 4.5 Perfil

Saudação "Bem-vinda, [nome]." em Cormorant, as duas frases de orientação, e quatro cartões tingidos com a cor do módulo atual: Progresso geral (percentual), Aulas concluídas, Módulo atual, Módulos liberados. No fim, "Reiniciar demonstração" e "Sair da área de membros".

### 4.6 Página do módulo

Botão de voltar discreto, e ao lado dele navegação entre módulos (anterior e próximo). Capa 2:3 centralizada, rótulo na cor do módulo, título, texto de apresentação, contagem, barra de progresso com percentual e botão dourado ("Iniciar módulo" / "Continuar módulo" / "Rever módulo").

**Lista de aulas em formato de episódios:** miniatura 16:9 de 132px com play em círculo branco, título "1. Nome da aula", duração e estado, separadas por divisórias finas. A linha inteira é clicável. A última linha é a **Aula ao vivo** do módulo, no mesmo formato, com cadeado e "Libera em breve" enquanto não houver data.

### 4.7 Tela da aula

**Player:** 16:9 de borda a borda, fixo no topo ao rolar (`position: sticky`), fundo preto. Antes de reproduzir, a capa da aula; play em círculo branco de 88px no centro; `✕` no canto superior direito, que fecha com desaparecimento suave de 0,28s e volta para onde a aluna veio. Barra de progresso dourada de 3px na base, com marcador circular. A camada de play não intercepta cliques fora do círculo — foi um defeito corrigido, que reaparece facilmente.

**Abaixo:** título "1. Nome da aula" com botão de três pontos ao lado (menu com Velocidade e Resolução), e a linha "Módulo 0 • Aula 1 • 11 min • Disponível".

**Identificação do módulo:** miniatura circular de 46px com a capa, "Módulo 0", nome do módulo e a pílula pequena "Marcar concluída", com borda dourada.

**Ações:** fileira com ícone acima e rótulo abaixo, deslizável no celular — Anterior, Próxima, Curtir (coração, dourado quando ativo), Material, Exercício. Material e Exercício abrem painel abaixo, não outra tela.

**Comentários:** cabeçalho "Comentários" com a contagem e botão de recolher; campo em pílula "Adicionar comentário neste momento..."; abaixo, "Seu nome não será exibido" e o botão "Comentar em 04:32", que só aparece com texto digitado. Cada comentário: "Anônimo", o minuto do vídeo em selo dourado clicável (volta ao ponto), data discreta e o texto. Mais recentes primeiro.

**Aulas do módulo:** miniaturas 16:9 de 112px com play (disponível), ✓ verde (concluída), cadeado com escurecimento (bloqueada), barra dourada de progresso assistido e a duração no canto. A aula em exibição tem título em branco pleno e faixa na cor do módulo na base da miniatura; as outras ficam esmaecidas.

### 4.8 Presentes

Categorias em faixas, cada uma com título dourado em maiúsculas e uma fileira deslizável mostrando **duas capas por tela**, proporção 2:3, com pílula centralizada ("Assistir" ou "Em breve" com cadeado). Categorias marcadas como destacadas vêm primeiro; categoria vazia mostra "Em breve, presentes nesta categoria."

Página do presente: player 16:9, "Sobre este presente", e a lista "Outros presentes". Sem vídeo cadastrado, o player é substituído por um espaço com cadeado e a frase "Este presente será disponibilizado aqui."

---

## 5. Telas — painel administrativo

Entrada com senha de administradora (hoje a palavra `mentoria`, fixa no código; em produção, conta com papel de admin).

**Cabeçalho** com título e resumo que acompanham a aba ativa.

**Duas abas:** Alunas e Conteúdo.

### Aba Alunas

Formulário de cadastro (nome + usuário) e a lista. Cada aluna: inicial em círculo dourado, nome, usuário e resumo do que tem liberado, selo Ativa/Bloqueada, e as ações Definir acessos, Bloquear e Remover.

Abrindo "Definir acessos":
- **Progresso e comentários** da aluna — percentual, barra, contagem, e os comentários dela com módulo, aula, minuto, data e texto
- **Conteúdo liberado** — "Liberar curso inteiro" e "Remover tudo"; por módulo, uma caixa que fica meio-marcada quando só parte das aulas está liberada; "Selecionar aulas" abre a lista com uma caixa por aula
- **Cancelar** e **Salvar alterações** ao fim — as marcações ficam em rascunho até salvar, e ambos os botões fecham o quadro. O botão de salvar só fica dourado com mudança pendente

### Aba Conteúdo — subaba Mentoria

Um cartão "Caminho do Desbloqueio" com resumo ("11 módulos · 50 aulas") e botão Recolher/Expandir. Dentro: campo de novo módulo e a lista. Cada módulo: nome, contagem, selo de estado, e os botões Editar nome, Adicionar aula, Bloquear para todas, Remover módulo. Cada aula: nome com resumo do conteúdo anexado, setas ↑ ↓ para reordenar, **Conteúdo** (link do vídeo, capa 16:9, PDF de material), Editar, Bloquear, Remover.

### Aba Conteúdo — subaba Presentes

Cartão "Acervo de presentes" com resumo e Recolher/Expandir. Cada categoria é um cartão com Editar nome, Adicionar presente, Deixar sozinha (vira subaba própria), Bloquear para todas, Remover categoria. Cada presente: setas de ordem, **Conteúdo** (vídeo, capa 2:3, duração, descrição), Editar, Mover (chips com as outras categorias), Bloquear, Remover. "Adicionar categoria" no fim.

### Confirmação de ações destrutivas

Remover aluna, módulo, aula, categoria ou presente, e "Remover tudo", abrem um modal que **exige digitar REMOVER**. O modal explica o que será perdido; o botão vermelho só habilita com a palavra correta.

---

## 6. Textos da interface

Português do Brasil, verbatim. Não reescrever.

"Bem-vinda, [nome]." · "Continue avançando no seu Caminho do Desbloqueio." · "Cada aula representa um passo consciente na construção da sua nova vida." · "Sua jornada começa agora. Comece pelo Módulo 0." · "Continuar de onde parei" · "Começar a primeira aula" · "Ver módulo" · "Assistir agora" · "Assistir de novo" · "Libera em breve" · "Assistir aula" · "Continuar aula" · "Marcar como concluída" · "Marcar concluída" · "Aula concluída" · "Aula anterior" · "Próxima aula" · "Todas as aulas" · "Material complementar" · "Atividade da aula:" · "Exercício da aula" · "Seu progresso" · "Módulo em andamento" · "Módulo concluído" · "Disponível" · "Bloqueada" · "Este módulo será liberado no momento certo da sua jornada." · "Esta aula será liberada no momento certo da sua jornada." · "Este presente será disponibilizado no momento certo da sua jornada." · "Adicionar comentário neste momento..." · "Seu nome não será exibido" · "Seja a primeira a comentar nesta aula." · "Em breve, presentes nesta categoria." · "Seu conteúdo será liberado em breve." · "Ambiente exclusivo para alunas da mentoria."

Avisos aparecem como faixa centralizada na base da tela, por 3,6 a 4,2 segundos.

---

## 7. Estado e persistência hoje

Tudo vive no armazenamento do navegador, em quatro chaves:

| Chave | Conteúdo |
|---|---|
| `cdb-demo-v2` | aluna logada, aulas concluídas, minutos assistidos, curtidas, comentários |
| `cdb-demo-primeiro-acesso-v1` | o mesmo, da segunda cópia |
| `cdb-admin-v1` | alunas, bloqueios, liberações por aula, sessão do admin |
| `cdb-content-v1` | módulos, aulas, categorias, presentes, bloqueios gerais, links de vídeo, capas, PDFs |

**Chaves posicionais** — hoje liberações e bloqueios usam a posição (`"3-2"`, `"m3"`, `"gc0"`, `"g0-1"`). O modelo aprovado substitui isso por identificadores permanentes. `Modelo de Dados.md`, itens (D) e (K), traz o mapeamento completo, campo por campo, e diz o que migrar, transformar e descartar.

Também estão presos ao código do protótipo, e devem virar dados: os textos de apresentação dos módulos (`MODULES[].intro`), as cores por módulo (`PALETTE`), os ids de vídeo do módulo 1 (`VIDEOS`) e as aulas ao vivo (`LIVE`).

**A duração das aulas hoje é uma fórmula** — `11 + ((mi*5 + li*7) % 15)` minutos. É valor de demonstração. Em produção, a plataforma grava a duração real informada pelo player na primeira reprodução.

---

## 8. Arquitetura de produção

Decidida e documentada em `Modelo de Dados.md`; o SQL correspondente está em `Banco de Dados.sql`.

- **Front:** Cloudflare Pages
- **Dados e autenticação:** Supabase (PostgreSQL + Auth + RLS)
- **Arquivos:** Supabase Storage — capas públicas, materiais e áudios restritos por link assinado
- **Vídeo:** serviço dedicado a definir (Cloudflare Stream é a recomendação). O banco guarda `video_provider` + `video_ref`, para trocar de serviço sem tocar em aulas, progresso ou liberações
- **Login:** nome + código de 4 números, sem e-mail e sem senha. Código legível apenas pela administradora, conferido por Edge Function no servidor, com travamento após 5 erros
- **Fonte de verdade:** o Supabase, sempre. Não sendo possível validar uma autorização, o aplicativo **não concede acesso** — nunca decide por dado local antigo. No navegador, apenas a sessão e a posição recente do vídeo, como cache descartável

**Regras de segurança que precisam ser preservadas:** a aluna não escreve na tabela de liberações; comentários são lidos pelas alunas por uma visão sem o campo de autoria, e completos apenas pela administradora; o endereço do vídeo é entregue por função, depois de conferida a liberação; esconder botão ou endereço não conta como segurança.

**Ordem de implementação recomendada** — item (N) de `Modelo de Dados.md`: banco e RLS → catálogo → autenticação → liberações → progresso e atividade → painel escrevendo no banco → mídia definitiva → unificação das duas áreas → publicação.

Fora do SQL, ficam pendentes: a Edge Function de login, os buckets de arquivos e a criação da primeira conta de administradora (instruções comentadas no fim do `.sql`).

---

## 9. As duas cópias da área da aluna

`Area de Membros.dc.html` e `Area de Membros - Primeiro Acesso.dc.html` são praticamente idênticas. A segunda tem progresso zerado, todos os módulos liberados e textos de primeiro acesso.

Em produção deve existir **uma só**. "Primeiro acesso" passa a ser estado da conta: `primeiro_acesso_em` nulo e nenhuma linha de progresso. A liberação de todos os módulos deixa de ser um modo do aplicativo e passa a ser consequência das liberações da conta.

Enquanto a unificação não acontecer, toda correção precisa ser feita nos dois arquivos — foi fonte recorrente de divergência.

---

## 10. Imagens

As capas oficiais já produzidas ficam em `assets/capas/` no projeto de origem (56 arquivos) e **não estão neste pacote** por volume. Convenção de nomes:

- `modulo-N.png` — capa do módulo, vertical 2:3
- `modulo-N-aula-X.png` — capa da aula, horizontal 16:9, 1280×720 (aula começa em 1)
- `ao-vivo-modulo-N.png` — capa da aula ao vivo
- `presente-N.png` — capa do presente, vertical 2:3

Estado atual: módulos 0 a 9 com arte final (10 pendente); aulas dos módulos 0 a 9 em boa parte prontas. Capas de presentes ainda não produzidas.

**Regras de exibição:** proporção mantida sempre, `object-fit: cover`, e fundo de reserva em degradê caso a imagem não carregue — nunca espaço vazio. Módulos cuja arte já traz o título não recebem título sobreposto (lista `ART` no código); os demais recebem.

Peça as capas ao cliente ou exporte-as do projeto de origem antes de começar a reconstrução das telas.

---

## 11. O que não fazer

- Não redesenhar. A identidade e a UX estão aprovadas
- Não reescrever os textos da interface
- Não renomear módulos ou aulas, nem mudar a ordem
- Não usar numeração contínua entre módulos: a numeração de aulas reinicia em cada um
- Não levar para produção o ícone de alternar celular/computador, nem o "Reiniciar demonstração"
- Não usar localStorage como autoridade de acesso, progresso ou permissão
- Não deixar o banco acoplado ao YouTube
- Não remover a confirmação por escrito das ações destrutivas
- Não gerar imagens novas: as capas são produzidas pelo cliente
