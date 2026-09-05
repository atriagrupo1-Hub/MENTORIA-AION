# Modelo de dados — Caminho do Desbloqueio para Bênçãos Ilimitadas

Documento para revisão. Nada foi implementado; os três arquivos do aplicativo seguem intactos.

Base da análise: `Area de Membros.dc.html`, `Area de Membros - Primeiro Acesso.dc.html`, `Painel Administrativo.dc.html`.

---

## A) Modelo proposto — visão geral

Três domínios, com fronteiras claras:

**Pessoas** — contas, papéis, estado da conta
**Catálogo** — módulos, aulas, categorias, presentes, mídia
**Atividade da aluna** — liberações, progresso, comentários, curtidas

O catálogo é editado pela administradora e lido por todas. A atividade é privada de cada aluna. As liberações ligam os dois e são a única informação que decide acesso — sempre verificada no banco.

Princípio adotado, conforme sua correção: quando uma área migra, o Supabase passa a ser a única autoridade. Não havendo resposta do banco, o aplicativo mostra estado de carregamento ou erro e **não concede acesso**. O navegador guarda apenas o token de sessão e a posição recente do vídeo, que é cache descartável.

---

## B) Tabelas e responsabilidade

### Pessoas

**`profiles`** — uma linha por conta, espelhando `auth.users`
`id` (= id do Auth), `nome`, `login` (nome de acesso, único), `codigo` (os 4 números, legíveis para você no painel), `codigo_definido_em`, `tentativas_erradas`, `travada_ate`, `role` (`aluna` | `admin`), `status` (`ativa` | `bloqueada`), `primeiro_acesso_em` (nulo até o primeiro login), `criada_em`

Sem e-mail, por decisão sua: a aluna entra com **nome + código de 4 números**, definido por você. O código fica visível no painel a qualquer momento, para você consultar e informar à aluna quando ela esquecer. A regra de leitura garante que somente a administradora veja esse campo — nenhuma aluna alcança o código de ninguém, inclusive o próprio.

Substitui `cdb-admin-v1.students[]`. O campo `blocked` de hoje vira `status`; `name` e `login` são preservados. O papel de administradora sai do código (`ADMIN_KEY = "mentoria"`) e passa a ser uma linha com `role = 'admin'`.

Não crio tabela separada de administradores: são poucas contas e o papel já distingue. Alternativa seria uma tabela `admins`; desnecessária nesta escala.

### Catálogo

**`modulos`**
`id`, `numero` (0 a 10, o rótulo exibido), `titulo`, `intro`, `capa_path`, `cor_destaque`, `ordem`, `publicado`, `bloqueado_geral`

Hoje o título e as aulas vêm de `cdb-content-v1.modules`, a `intro` está fixa no código do app e a cor em `PALETTE`. Tudo isso passa a ser dado. `numero` é rótulo, nunca identidade — é o que permite renumerar sem quebrar nada.

**`aulas`**
`id`, `modulo_id`, `numero` (reinicia em cada módulo), `titulo`, `ordem`, `duracao_segundos`, `capa_path`, `video_provider`, `video_ref`, `publicado`, `bloqueado_geral`

Cobre `content.modules[].lessons[]` mais `meta["mi-li"] = {video, cover, material}`.

**Duração:** por decisão sua, ninguém preenche à mão. Na primeira reprodução, o player informa a duração real do vídeo e o aplicativo grava esse valor em `duracao_segundos`, de uma vez. Enquanto o campo estiver vazio, a aula mostra a duração como "—" em vez de um número inventado. A administradora pode corrigir manualmente se algum vídeo for substituído.

**`aula_materiais`**
`id`, `aula_id`, `tipo` (`pdf` | `audio`), `titulo`, `arquivo_path`, `ordem`

Tabela separada porque o aplicativo já exibe uma lista ("Atividade da aula") e o escopo prevê mais de um arquivo por aula. Hoje `meta.material` guarda um caminho só.

**`aulas_ao_vivo`**
`id`, `modulo_id`, `titulo`, `descricao`, `quando_texto`, `data_hora`, `duracao_prevista`, `video_provider`, `video_ref`, `liberada`

Existe hoje como `LIVE = {}` no código: uma por módulo, bloqueada até receber data. Fica em tabela própria porque não tem numeração de aula nem entra no cálculo de progresso.

**`categorias`**
`id`, `titulo`, `ordem`, `destacada` (a flag "Deixar sozinha"), `bloqueada_geral`

**`presentes`**
`id`, `categoria_id`, `titulo`, `descricao`, `duracao_texto`, `capa_path`, `video_provider`, `video_ref`, `ordem`, `publicado`, `bloqueado_geral`

Cobre `content.cats[].items[]` e `meta["g{ci}-{ii}"] = {video, cover, about, duration}`.

### Liberações

**`acessos`**
`id`, `aluna_id`, `escopo` (`curso` | `modulo` | `aula` | `categoria` | `presente`), `modulo_id`, `aula_id`, `categoria_id`, `presente_id`, `concedido_em`, `concedido_por`

Uma linha por concessão. Detalhes em (G).

### Atividade

**`progresso`**
`aluna_id`, `aula_id`, `posicao_segundos`, `duracao_segundos`, `concluida_em`, `iniciada_em`, `atualizada_em` — chave primária composta (`aluna_id`, `aula_id`)

Unifica `completed`, `watched` e o "continuar de onde parei". Detalhes em (H).

**`comentarios`**
`id`, `aula_id`, `autora_id`, `texto`, `posicao_segundos`, `criado_em`, `status` (`publicado` | `oculto` | `removido`), `moderado_por`, `moderado_em`

**`curtidas`**
`aluna_id`, `aula_id`, `criada_em` — chave primária composta

**`comentarios_config`** (ou uma coluna `comentarios_ativos` em `aulas`)
O escopo pede "desativar comentários em uma aula específica". Recomendo a **coluna em `aulas`** — é um único sinalizador, não merece tabela.

### O que eu não crio

- Tabela de "bloqueios": bloqueio geral é uma coluna na própria entidade; bloqueio de aluna é `status` no perfil.
- Tabela de configurações: nada hoje justifica.
- Tabela de sessões: o Auth cuida.

---

## C) Relacionamentos

```
profiles ──1:N── acessos ──N:1── modulos / aulas / categorias / presentes
profiles ──1:N── progresso ──N:1── aulas
profiles ──1:N── comentarios ──N:1── aulas
profiles ──1:N── curtidas ──N:1── aulas
modulos  ──1:N── aulas ──1:N── aula_materiais
modulos  ──1:1── aulas_ao_vivo
categorias ──1:N── presentes
```

Remoção de um módulo apaga em cascata suas aulas, materiais, progresso, comentários, curtidas e liberações — motivo pelo qual a confirmação por escrito no painel deve continuar existindo.

---

## D) IDs permanentes

Todas as entidades do catálogo recebem `uuid` gerado pelo banco. O número visível (`numero`) e a posição (`ordem`) viram atributos comuns.

**Como trocar as referências posicionais com segurança:**

1. Na migração, cada módulo e cada aula recebe seu uuid, e guardo temporariamente a posição de origem (`legacy_ref`, ex. `"3-2"`).
2. As chaves antigas são convertidas por essa correspondência: `access["3-2"] = true` vira uma linha em `acessos` com o `aula_id` correto; `blocked["m3"]` vira `modulos.bloqueado_geral = true`; `blocked["gc0"]` e `blocked["g0-1"]` viram as colunas equivalentes em `categorias` e `presentes`.
3. Confirmada a correspondência, `legacy_ref` é descartado.

A partir daí, reordenar altera apenas `ordem` e `numero`. Progresso, liberações e comentários continuam apontando para o mesmo registro — e todo o remapeamento que o painel faz hoje ao mover uma aula deixa de ser necessário.

---

## E) Autenticação — nome + código de 4 dígitos

Decisão sua: **sem e-mail e sem senha**. Você define, por aluna, um código de 4 números — funciona como a senha dela.

### Um ajuste necessário: o código sozinho não pode identificar a aluna

Com 4 dígitos existem apenas 10.000 combinações. Se o código fosse o único campo, dois problemas apareceriam já nas primeiras dezenas de alunas: códigos repetidos entre alunas diferentes (o sistema não saberia quem está entrando) e qualquer pessoa acertando um código válido por tentativa, entrando na conta de outra.

Solução, sem complicar para a aluna: **dois campos — o nome e o código**. O nome diz quem é; o código confirma. É o mesmo raciocínio do cartão do banco, que a aluna já conhece: o cartão identifica, a senha de 4 dígitos confirma. E é exatamente o que a tela de login já faz hoje, com dois campos.

Com isso, o código de 4 dígitos passa a ser seguro o bastante, desde que acompanhado do bloqueio por tentativas descrito abaixo.

**Como a aluna é criada:** no painel você cadastra o nome e digita o código de 4 números que quiser para ela. O código fica visível na linha dela, para consulta a qualquer momento.

**Como recebe acesso:** você passa o nome de acesso e os 4 números pelo canal que já usa.

**Como entra:** dois campos, "Seu nome" e "Seu código". Sessão longa, com "manter conectada" por padrão, para que ela digite raramente.

**Como recupera:** você abre o painel, lê o código dela e informa. Se preferir trocar, **"Definir novo código"** substitui na hora.

**Como é bloqueada:** `status = 'bloqueada'`. O código deixa de funcionar e a sessão ativa cai na consulta seguinte.

**Proteção contra tentativa e erro (obrigatória com 4 dígitos):** após 5 códigos errados para o mesmo nome, a conta trava por 15 minutos, e o painel mostra o aviso. Sem isso, 10.000 combinações são testáveis em minutos. Cada acesso e cada erro ficam registrados.

**Como a administradora é identificada:** conta com `role = 'admin'` e código próprio, este com mais dígitos — recomendo 6, já que é a conta que pode tudo. Substitui a palavra `mentoria` escrita hoje no código do painel.

**Impedir que uma aluna faça ação de administradora:** as tabelas de catálogo e de liberações não aceitam escrita de quem não tem o papel. Mesmo chamando o banco por fora do aplicativo, a operação é recusada.

### O que aceitar nesse desenho

1. **Códigos repetidos entre alunas são permitidos** — como o nome identifica, duas alunas podem ter 1234 sem conflito.
2. **Código compartilhado é acesso compartilhado.** O painel mostra quantos dispositivos usaram aquela conta; havendo abuso, você define outro código.
3. **Recuperação é manual**: você consulta o código no painel e informa à aluna.

Nota técnica: o Supabase Auth não tem login por código pronto. Uma função no servidor recebe nome e código, confere no banco, aplica o limite de tentativas e só então emite a sessão. A conferência nunca acontece no navegador, e o código só é devolvido a quem tem papel de administradora.

**Nota sobre a tela atual:** ela já tem dois campos e continua com dois — "nome" e "código de 4 números" no lugar de "nome ou usuário" e "senha". O teclado do celular abre em modo numérico no segundo campo. Nenhuma outra alteração de interface.

## F) Regras de acesso, em linguagem simples

**Perfis** — cada aluna lê e edita apenas o próprio, **sem o campo do código**; administradora lê e edita todos, com o código visível. É o mesmo mecanismo que garante o anonimato dos comentários: o campo restrito nunca chega ao navegador de uma aluna.

**Catálogo** — qualquer aluna ativa lê módulos e aulas publicados. Somente administradora escreve. Ler o catálogo não dá acesso ao vídeo (ver mídia, item J).

**Liberações** — a aluna lê as próprias, e **não pode criar, alterar ou apagar nenhuma**. Somente administradora escreve. É o que impede alguém de liberar conteúdo para si.

**Progresso** — a aluna lê e escreve só as próprias linhas, e a linha precisa ser de uma aula liberada para ela. Administradora lê tudo, para acompanhar.

**Comentários** — a aluna cria comentário em aula liberada para ela, edita ou apaga apenas os próprios, e lê os comentários publicados das aulas a que tem acesso — **sem o campo de autoria**, que fica restrito à administradora. O anonimato passa a ser garantido pelo banco, não pela tela.

**Curtidas** — mesma regra do progresso.

**Bloqueio** — aluna com `status = 'bloqueada'` não lê catálogo, liberações nem atividade.

Nenhuma dessas regras depende de esconder botão ou endereço.

---

## G) Os quatro níveis de liberação

O comportamento atual é preservado com uma linha por concessão em `acessos`, sem qualquer referência a posição:

| Nível no painel | O que grava |
|---|---|
| Curso inteiro | uma linha `escopo = 'curso'` |
| Módulo inteiro | uma linha `escopo = 'modulo'` + `modulo_id` |
| Selecionar módulos | uma linha por módulo escolhido |
| Selecionar aulas | uma linha por aula escolhida |

**Como o acesso é decidido**, na ordem:

1. A conta está ativa? Se não, nada é liberado.
2. A aula ou o módulo está bloqueado para todas? Se sim, nada é liberado.
3. Existe liberação de curso, do módulo da aula, ou da própria aula? Se sim, liberado.

Uma consulta única do banco entrega a lista de aulas liberadas — o aplicativo não recalcula nada.

Ganho em relação a hoje: liberar "módulo inteiro" passa a valer também para aulas criadas depois, o que a marcação aula por aula atual não faz.

Presentes seguem a mesma lógica, com `escopo = 'categoria'` ou `'presente'`. Por decisão sua, o painel passa a **liberar presentes por aluna já nesta arquitetura**: no editor de acessos, ao lado dos módulos e aulas, entram as categorias e seus presentes, com os mesmos níveis — acervo inteiro, categoria inteira, selecionar categorias, selecionar presentes. Presente não liberado aparece para a aluna como "Em breve", como já acontece hoje.

---

## H) Progresso

Uma linha por aluna e aula:

- **Aula iniciada** — a linha existe, com `iniciada_em`
- **Posição assistida** — `posicao_segundos` (hoje é percentual; passa a ser segundos, que é o que o player entrega)
- **Conclusão** — `concluida_em` com data, não apenas verdadeiro/falso
- **Progresso do módulo** — aulas concluídas ÷ aulas liberadas do módulo, calculado na leitura
- **Progresso geral** — o mesmo, no total
- **Continuar de onde parei** — a linha mais recente por `atualizada_em`, hoje deduzida da primeira aula não concluída

**Sem gravar a cada segundo:** a posição é guardada no navegador continuamente, mas enviada ao banco a cada 15 segundos de reprodução, ao pausar, ao sair da aula e ao fechar a página. Perde-se, no pior caso, alguns segundos de posição — nunca uma conclusão, que é gravada na hora. Os percentuais dos módulos ficam em uma consulta pronta, para não somar tudo a cada abertura.

---

## I) Comentários e curtidas

**Autoria real** fica em `comentarios.autora_id`, sempre gravada.

**Anonimato** é garantido pela regra de leitura: alunas leem uma versão sem o campo de autoria; a administradora lê a tabela completa. Não existe caminho técnico pelo qual uma aluna descubra quem escreveu.

**Relação com a aula e minuto do vídeo:** `aula_id` e `posicao_segundos` — o "04:32" clicável passa a ser calculado do segundo exato, e não do percentual como hoje.

**Moderação:** `status` em três valores (publicado, oculto, removido) em vez de apagar a linha, preservando histórico; `moderado_por` e `moderado_em` registram quem agiu. O painel ganha a visão de autor real, aula, módulo, minuto e as ações de ocultar e remover — previstas no escopo e ainda não construídas. Desativar comentários de uma aula é a coluna citada em (B).

**Curtidas:** uma linha por aluna e aula, sem contador público — o aplicativo hoje mostra apenas o estado da própria aluna.

**Segurança do texto:** limite de caracteres no banco e texto tratado como texto puro, nunca interpretado como código.

---

## J) Conteúdo e mídia

Fronteira clara:

**No Postgres** — títulos, descrições, números, ordem, durações, estados de publicação e bloqueio, e **referências** de arquivo.

**No storage / serviço de vídeo** — os arquivos.

Cada referência de mídia é um par:

- `video_provider` (`youtube` | `stream` | `vimeo` | …) + `video_ref` (o identificador dentro daquele serviço)
- `capa_path` e `arquivo_path` — caminhos relativos no storage, nunca endereços completos

Assim, trocar YouTube por Cloudflare Stream é atualizar duas colunas das aulas migradas. Módulos, aulas, progresso e liberações não são afetados — nem o modelo, nem o código de acesso.

O aplicativo nunca recebe o endereço do vídeo diretamente: pede ao servidor, que confere a liberação e devolve um link assinado de curta duração. É o que impede o vídeo pago de circular.

Capas continuam públicas (não têm valor isolado); PDFs e áudios ficam restritos, com o mesmo tipo de link assinado.

---

## K) Mapeamento do armazenamento atual

### `cdb-content-v1` — estrutura do conteúdo

| Hoje | Vai para | Tratamento |
|---|---|---|
| `modules[].title` | `modulos.titulo` | migrar |
| `modules[].lessons[]` | `aulas.titulo` + `numero` + `ordem` | migrar, gerando uuid |
| `meta["mi-li"].video` | `aulas.video_provider` + `video_ref` | transformar (extrair o id do link) |
| `meta["mi-li"].cover` | `aulas.capa_path` | migrar |
| `meta["mi-li"].material` | `aula_materiais` | transformar em linha |
| `meta["g{ci}-{ii}"]` | `presentes` | transformar |
| `cats[].title` / `.solo` | `categorias.titulo` / `.destacada` | migrar |
| `cats[].items[]` | `presentes.titulo` | migrar |
| `blocked["m{mi}"]` | `modulos.bloqueado_geral` | transformar |
| `blocked["{mi}-{li}"]` | `aulas.bloqueado_geral` | transformar |
| `blocked["gc{ci}"]` / `["g{ci}-{ii}"]` | `categorias` / `presentes.bloqueado_geral` | transformar |

Também migram, hoje presos ao código do aplicativo: `MODULES[].intro` → `modulos.intro`; `PALETTE` → `modulos.cor_destaque`; `VIDEOS` (ids do módulo 1) → migrar como aulas reais, conforme sua decisão; `LIVE` → `aulas_ao_vivo`.

### `cdb-admin-v1` — alunas e liberações

| Hoje | Vai para | Tratamento |
|---|---|---|
| `students[].name` | `profiles.nome` | migrar |
| `students[].login` | `profiles.login` | migrar (continua sendo o nome de acesso) |
| `students[].blocked` | `profiles.status` | transformar |
| `students[].access["mi-li"]` | `acessos` | transformar pela correspondência de ids |
| `students[].id` | — | descartar (era um carimbo de tempo) |
| `authed` | — | descartar (sessão) |
| `ADMIN_KEY` no código | conta com `role = 'admin'` | substituir |

### `cdb-demo-v2` e `cdb-demo-primeiro-acesso-v1` — atividade

Ambos são de **demonstração** e não têm aluna real associada. Recomendo descartar os dois. Se quiser preservar algo para conferência, a correspondência é:

`completed` → `progresso.concluida_em` · `watched` (percentual) → `posicao_segundos`, multiplicando pela duração real · `comments` → `comentarios`, com autoria a definir e `at`/`pct` convertidos em segundos · `likes` → `curtidas` · `user` / `studentLogin` → sessão, descartar

### Resumo

- **Reais, migrar:** todo o `cdb-content-v1`; as alunas e liberações de `cdb-admin-v1`
- **Demonstração, descartar:** as duas chaves de atividade; `authed`; ids por carimbo de tempo; durações calculadas por fórmula
- **Transformar:** links de vídeo, percentuais em segundos, chaves posicionais em ids, mapas de bloqueio em colunas

---

## L) Primeiro acesso

Passa a ser estado da conta, não um aplicativo à parte:

- `profiles.primeiro_acesso_em` nulo → a aluna nunca entrou
- Nenhuma linha em `progresso` → não começou nenhuma aula

Com isso, a única área da aluna decide o que mostrar: sem progresso, exibe "Primeiro acesso", "Sua jornada começa agora" e o botão "Começar a primeira aula" — exatamente o que a segunda cópia faz hoje. O arquivo `Area de Membros - Primeiro Acesso.dc.html` pode então ser removido, mas **não agora**: ele continua útil para demonstração até a unificação acontecer.

Uma diferença de comportamento a decidir junto: nessa cópia todos os módulos estão liberados, o que em produção passa a ser consequência das liberações da conta, não um modo do aplicativo.

---

## M) Riscos identificados

1. **Correspondência de ids na migração** — se uma aula for associada ao id errado, alunas ganham ou perdem acesso silenciosamente. Mitigação: migrar em uma cópia, conferir a lista de liberadas de cada aluna antes e depois, e só então publicar.
2. **Duração das aulas** — enquanto uma aula não for reproduzida uma vez, a plataforma não conhece sua duração; nesse intervalo o percentual daquela aula fica indisponível. Só afeta aulas nunca abertas.
3. **Código de 4 dígitos, legível no painel** — espaço pequeno de combinações, e o código guardado em texto claro. É aceitável aqui porque a conta dá acesso a aulas, não a dados sensíveis nem a dinheiro, e porque simplifica seu atendimento. Depende de duas proteções do item (E): os dois campos e o travamento após 5 erros. Quem tiver acesso ao painel vê os códigos de todas — motivo para o código de administradora ser mais longo.
4. **Vídeos hoje no YouTube** — os endereços já cadastrados continuam acessíveis a quem os tenha copiado. Trocar de serviço não revoga o que circulou.
5. **Dois arquivos em paralelo** — enquanto durar, toda correção precisa ser feita duas vezes, com risco de divergirem.
6. **Comentários já existentes** sem autoria identificável — se algum for preservado, entra como autoria vazia; a moderação não terá a quem atribuir.
7. **Projeto Supabase gratuito pausa por inatividade** — em produção, plano pago.
8. **Remoção em cascata** — apagar um módulo apaga progresso e comentários das alunas. A confirmação por escrito precisa continuar, e vale considerar despublicar em vez de remover.

---

## N) Ordem de implementação

1. Criar as tabelas, as regras de acesso e as funções administrativas
2. Migrar o catálogo (módulos, aulas, categorias, presentes, mídia) e conferir contra o conteúdo atual
3. Autenticação real e perfis, com a tela de login pedindo nome e código de 4 números
4. Migrar liberações e bloqueios, e ligar o controle de acesso da aluna ao banco
5. Ligar progresso, conclusão, curtidas e comentários
6. Painel administrativo escrevendo no banco, com moderação de comentários
7. Mover a mídia para o serviço definitivo, com link assinado
8. Unificar as duas áreas da aluna em uma
9. Publicar, com um grupo pequeno antes de abrir

O catálogo vem antes da autenticação por um motivo: é o que permite conferir se a migração de ids está correta, sem nenhuma aluna afetada.

---

## O) Próxima etapa, após sua aprovação

**Escrever o script de criação do banco** — as tabelas deste documento, com seus tipos, chaves, índices e as regras de acesso completas, prontas para serem aplicadas no Supabase por quem cuidar da parte técnica.

Uma única etapa, sem tocar no aplicativo. Aguardo sua aprovação do modelo antes de começar.

---

### Decisões registradas

1. **Sem e-mail** — acesso por nome + código de 4 números, definido por você no painel e legível lá a qualquer momento. Dois campos, porque 4 dígitos sozinhos não identificam a aluna com segurança.
2. **Duração das aulas** — detectada automaticamente na primeira reprodução, ninguém preenche.
3. **Vídeos de demonstração do módulo 1** — mantidos como aulas reais na migração.
4. **Presentes** — liberação por aluna no painel desde já, nos mesmos quatro níveis.

Uma pergunta em aberto, para mais adiante: quer limitar o número de dispositivos por conta?
