# Banco — Supabase / PostgreSQL

Fonte única de verdade sobre autenticação, liberações, bloqueios e
progresso. O aplicativo não concede acesso sem resposta do banco; no
navegador ficam apenas a sessão e a posição recente do vídeo, como cache
descartável.

## Migrations

| Arquivo | O que faz |
|---|---|
| `migrations/0001_estrutura_inicial.sql` | Tabelas, RLS e funções |
| `migrations/0002_storage.sql` | Depósitos `capas`, `materiais` e `audios`, com suas regras |
| `migrations/0003_comentarios_por_coluna.sql` | Anonimato dos comentários por privilégio de coluna, e a moderação |

## Projeto

| | |
|---|---|
| Nome | MENTORIA-AION |
| Organização | painel-mestre-atria (Pro) |
| Região | São Paulo (`sa-east-1`) |
| Reference | `crcclhmamknqkamvavyp` |

As três migrations estão aplicadas.

Aplicar em ordem, como dono `postgres`. As funções `security definer`
leem tabelas protegidas por RLS de dentro das políticas dessas mesmas
tabelas — isso só não entra em recursão infinita porque o dono tem
`BYPASSRLS`. Aplicar com outro dono trava o banco inteiro.

## Testar antes de aplicar

```bash
./supabase/testes/rodar.sh
```

Sobe um PostgreSQL 16 descartável, aplica as migrations sobre um
arremedo do ambiente Supabase (schemas `auth` e `storage`, papéis `anon`,
`authenticated` e `service_role`) e roda 31 provas das regras de acesso:
o que a aluna alcança, o que a administradora vê, e o que ninguém deve
conseguir.

## Diferenças em relação ao script do handoff

O `handoff_area_de_membros/app/Banco de Dados.sql` continua no
repositório, intacto, como referência. As migrations corrigem o que a
revisão apontou; cada mudança está marcada com `[CORRIGIDO]` no lugar
onde acontece.

| # | O que era | O que virou |
|---|---|---|
| 1 | `video_provider`/`video_ref` como colunas do catálogo, legíveis por qualquer aluna ativa | Tabelas `aula_midia`, `presente_midia` e `ao_vivo_midia`, só da administradora; o endereço sai por função, depois de conferida a liberação |
| 2 | View de comentários `security_invoker = true`, e a política da tabela-base liberava a linha com `autora_id` | Política base restrita a admin e à própria autora; a view roda como dona, filtra por conta própria e não traz autoria |
| 3 | `codigo`, `tentativas_erradas` e `travada_ate` em `profiles`, legíveis pela própria aluna | Tabela `credenciais`, só da administradora |
| 4 | `UPDATE` de comentário sem `pode_ver_aula` no `WITH CHECK` | Não dá mais para mover o comentário para uma aula bloqueada |
| 5 | Autora apagava a linha do comentário | `remover_meu_comentario()` muda o status e preserva o histórico |
| 6 | Índices únicos comuns em `modulos(numero)` e `aulas(modulo_id, numero)` | Constraints `deferrable initially deferred` — reordenar deixa de quebrar |
| 7 | Sem índice nas chaves estrangeiras de cascata | `progresso(aula_id)`, `curtidas(aula_id)` e os quatro alvos de `acessos` |
| 8 | `minhas_aulas()` chamava `pode_ver_aula()` por linha | Uma consulta só, com desempate na ordenação |
| 9 | Contador de erros nunca zerava: uma tentativa a cada 15 min, para sempre | Zera quando a trava expira |
| 10 | `registrar_duracao()` aceitava qualquer inteiro do navegador | Limites de 30 s a 10 h |
| 11 | Funções com `execute` para `public` por padrão | `revoke` geral e `grant` só no necessário |

Duas coisas do modelo mudaram junto:

- `video_provider` nasce `'stream'` (Cloudflare Stream), não `youtube`.
- Existe `aulas_ao_vivo` com mídia própria e função de acesso
  (`video_da_ao_vivo`), que o script original não tinha — a aula ao vivo
  segue a liberação do módulo dela.

## Ainda fora do SQL

- **Edge Function `entrar`** — recebe nome e código, chama
  `verificar_codigo()` com a chave de serviço, aplica limite por IP e
  emite a sessão. É o único ponto que conhece a chave de serviço.
- **Edge Function do vídeo** — troca o `video_ref` do Cloudflare Stream
  por um token assinado de curta duração.
- **Primeira conta de administradora** — criar no Auth, depois inserir a
  linha em `profiles` (papel `admin`) e a de `credenciais` com um código
  de 6 dígitos.

## Sobre os avisos do linter do Supabase

`get_advisors` de segurança devolve 19 avisos, todos do mesmo tipo:
*Signed-In Users Can Execute SECURITY DEFINER Function*. Nenhum é
defeito, e nenhum deve ser "corrigido" revogando o `EXECUTE`.

**As funções de predicado precisam do `EXECUTE`.** `pode_ver_aula`,
`pode_ver_presente`, `pode_ver_ao_vivo`, `eh_admin` e `conta_ativa` são
chamadas de dentro das políticas de RLS, e o Postgres avalia a política
com os privilégios de quem consulta. Revogar o `EXECUTE` não fecha nada
— quebra tudo. Verificado: sem ele, `select` em `aula_materiais` devolve
`permission denied for function pode_ver_aula`.

**As demais são o desenho.** `video_da_aula`, `video_do_presente` e
`video_da_ao_vivo` só têm razão de existir sendo `security definer`: é
assim que leem as tabelas de mídia, fechadas à aluna, depois de conferir
a liberação. `minhas_aulas`, `meu_perfil`, `meus_comentarios`,
`salvar_posicao`, `marcar_concluida`, `alternar_curtida`,
`registrar_duracao`, `editar_meu_comentario`, `remover_meu_comentario`,
`comentarios_para_moderacao` e `moderar_comentario` conferem
`auth.uid()` ou `eh_admin()` por dentro, antes de qualquer leitura ou
escrita.

`verificar_codigo` é a única sem `EXECUTE` para `authenticated`: ela fica
só para a Edge Function, com a chave de serviço.

O linter acusava também um **ERRO** — `security_definer_view` em
`comentarios_publicos`. Esse era legítimo e foi eliminado pela migration
0003: o anonimato deixou de depender do filtro dentro de uma view
privilegiada e passou a ser privilégio de coluna, que nenhuma mudança
futura de política reabre.
