# Varredura de permissões — 24/09/2026

O alerta do Supabase diz que **54 funções `SECURITY DEFINER` podem ser
chamadas pelo papel `authenticated`**. Aluna logada é `authenticated`,
então o alerta é sério o bastante para ser medido, e não lido.

Método: um bloco `do $$ ... raise exception 'RESULTADO %'` — tudo volta
atrás ao final —, com `set local role authenticated` e o
`request.jwt.claims` de uma aluna real, chamando cada função e medindo
um resumo (`md5`) das tabelas antes e depois.

## Escrita — a aluna tentou as 27 funções que gravam

Recusaram com `sem_permissao`: `bloquear_colaborador`,
`definir_abertura`, `definir_acesso`, `definir_status_aluna`,
`descartar_rascunho`, `editar_aluna`, `estender_acesso`,
`gerar_cronograma`, `gerar_cronograma_de_aulas`, `gerar_cronograma_lote`,
`liberar_aula_para_todas`, `moderar_comentario`, `ordenar_aulas`,
`ordenar_lista`, `remover_aluna`, `remover_aula_da_aluna`,
`remover_colaborador`, `renovar_acesso`.

`conteudo_herda_o_produto` é gatilho: "trigger functions can only be
called as triggers".

`mudar_codigo` **não** levanta erro — devolve `false`. Isso não é falha:
o código do dono e o da outra aluna continuaram os mesmos. É a diferença
entre "deu erro" e "mudou o dado", e é por isso que a medição é do dado.

As da própria aluna (`editar_meu_comentario`, `remover_meu_comentario`,
`registrar_duracao`, `marcar_concluida`, `salvar_posicao`,
`alternar_curtida`) executam, como devem — e, apontadas para conteúdo
que não é dela, não mudaram nada.

**Resumo das dez tabelas — `profiles`, `credenciais`, `acessos`,
`aulas`, `modulos`, `produtos`, `conteudos`, `comentarios`, `progresso`,
`curtidas` — igual antes e depois.**

## Leitura — zero linha do que não é dela

`ficha_da_aluna`, `cronograma_da_aluna`, `comentarios_da_autora`,
`comentarios_para_moderacao` e `equipe_do_painel` devolveram 0 linhas
apontadas para outra pessoa. `eh_admin`, `eh_dono` e `eh_equipe`:
`false`.

Controle positivo — sem ele o teste não valeria nada, porque zero em
tudo também é o que se vê quando a identidade não pegou:

| | ANNIE | a outra aluna |
|---|---|---|
| `pode_ver_aula` da aula liberada para a ANNIE | `true` | `false` |
| `video_da_aula` da mesma aula | 1 linha | 0 linhas |
| `minhas_aulas` | 1 | 0 |

`meu_perfil()` devolveu a linha dela; `conta_ativa()`, `true`.

## Escrita direta nas tabelas, sem passar por função

Como aluna logada: `update profiles set papel='dono'` → **0 linhas**.
O mesmo para `credenciais`, `aulas`, `modulos`, `produtos`, e para
`delete from comentarios` e `delete from acessos`. `update comentarios
set status` nem chega à RLS: `permission denied`. Inserir em `acessos`,
`profiles` ou `curtidas` de outra pessoa: `new row violates row-level
security policy`.

## Como anon

Todas as funções: `permission denied for function`. Todas as tabelas:
recusa. `tentativas_ip`: `permission denied for table`, e a tabela já
traz em comentário por que não tem política — só a chave de serviço, nas
Edge Functions, escreve nela.

## Conclusão

Nenhuma migração foi necessária. As 54 funções são executáveis por
`authenticated` de propósito: a porta não está no `GRANT`, está dentro
de cada função (`eh_admin`, `eh_dono`, `eh_equipe`, `auth.uid()`) ou no
`pode_ver_*` que ela consulta. O alerta do Supabase é genérico e não
enxerga isso.

Para repetir a medição, o bloco está em
`supabase/testes/varredura_de_permissoes.sql`.
