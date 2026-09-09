-- Ritmo de liberação (migration 0009).
--
-- A pergunta: com a regra ligada, o módulo seguinte fica fechado até a
-- hora — e abre sozinho quando a hora chega, sem ninguém liberar nada?

\set QUIET on
\pset border 2
\set ON_ERROR_STOP off

\echo ''
\echo '=========================================================='
\echo 'RITMO DE LIBERACAO'
\echo '=========================================================='

-- Estado limpo: Maria cadastrada agora, com os Módulos 0 e 1 liberados
-- no painel e nenhum progresso.
reset role;
update profiles set criada_em = now(), acesso_ate = null
 where id = '22222222-2222-2222-2222-222222222222';
delete from acessos where aluna_id = '22222222-2222-2222-2222-222222222222';
insert into acessos (aluna_id, escopo, modulo_id)
select '22222222-2222-2222-2222-222222222222', 'modulo', id
from modulos where numero in (0, 1);
delete from progresso where aluna_id = '22222222-2222-2222-2222-222222222222';

set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

\echo '-- 48. RITMO IMEDIATO (padrao): ve as aulas dos dois modulos?'
\echo '       (esperado: 6 = 2 do Modulo 0 + 4 do Modulo 1)'
select count(*) as aulas_visiveis from minhas_aulas();

-- ---------------------------------------------------------------
reset role;
update configuracoes set ritmo = 'por_dias', ritmo_dias = 15;
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

\echo ''
\echo '-- 49. UM MODULO A CADA 15 DIAS, cadastrada hoje:'
\echo '       (esperado: 2 — so o Modulo 0)'
select count(*) as aulas_visiveis from minhas_aulas();

\echo '-- 50. O video de uma aula do Modulo 1 sai?'
\echo '       (esperado: 0 — a liberacao existe, mas a hora nao chegou)'
select count(*) as video_entregue from video_da_aula(
  (select a.id from aulas a join modulos m on m.id = a.modulo_id
   where m.numero = 1 and a.ordem = 0));

\echo '-- 51. A tela consegue dizer quando o Modulo 1 abre?'
\echo '       (esperado: t — 15 dias a frente)'
select ritmo_abre_em((select a.id from aulas a join modulos m on m.id=a.modulo_id
                      where m.numero=1 and a.ordem=0))::date
       = (now() + interval '15 days')::date as abre_em_15_dias;

-- Passaram 20 dias desde o cadastro.
reset role;
update profiles set criada_em = now() - interval '20 days'
 where id = '22222222-2222-2222-2222-222222222222';
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

\echo '-- 52. Passados 20 dias, o Modulo 1 abriu sozinho?'
\echo '       (esperado: 6)'
select count(*) as aulas_visiveis from minhas_aulas();

\echo '-- 53. E o Modulo 2, que ela nao comprou, vazou junto?'
\echo '       (esperado: 0 — ritmo nao abre o que nao foi liberado)'
select count(*) as aulas_do_modulo_2 from minhas_aulas() where modulo_numero = 2;

-- ---------------------------------------------------------------
reset role;
update profiles set criada_em = now()
 where id = '22222222-2222-2222-2222-222222222222';
update configuracoes set ritmo = 'por_conclusao';
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

\echo ''
\echo '-- 54. POR CONCLUSAO, sem nada concluido:'
\echo '       (esperado: 2 — so o Modulo 0)'
select count(*) as aulas_visiveis from minhas_aulas();

-- Conclui a PRIMEIRA aula do Módulo 0 — não é a última, não basta.
reset role;
insert into progresso (aluna_id, aula_id, concluida_em)
select '22222222-2222-2222-2222-222222222222', a.id, now()
from aulas a join modulos m on m.id = a.modulo_id
where m.numero = 0 and a.ordem = 0;
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

\echo '-- 55. Concluiu a PRIMEIRA aula do Modulo 0; o Modulo 1 abriu?'
\echo '       (esperado: 2 — nao, so a ULTIMA aula libera o proximo)'
select count(*) as aulas_visiveis from minhas_aulas();

-- Agora a última.
reset role;
insert into progresso (aluna_id, aula_id, concluida_em)
select '22222222-2222-2222-2222-222222222222', a.id, now()
from aulas a join modulos m on m.id = a.modulo_id
where m.numero = 0 and a.ordem = 1;
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

\echo '-- 56. Concluiu a ULTIMA aula do Modulo 0; abriu o Modulo 1?'
\echo '       (esperado: 6)'
select count(*) as aulas_visiveis from minhas_aulas();

\echo '-- 57. Agora o video do Modulo 1 sai?'
\echo '       (esperado: 1)'
select count(*) as video_entregue from video_da_aula(
  (select a.id from aulas a join modulos m on m.id = a.modulo_id
   where m.numero = 1 and a.ordem = 0));

-- ---------------------------------------------------------------
\echo ''
\echo '-- 58. A aluna consegue mudar o ritmo para si mesma?'
\echo '       (esperado: 0 linhas afetadas — politica so deixa a admin)'
update configuracoes set ritmo = 'imediato';

\echo '-- 59. O ritmo continua o que a administradora definiu?'
\echo '       (esperado: por_conclusao)'
select ritmo from configuracoes;

\echo '-- 60. Ela consegue apagar a configuracao?'
\echo '       (esperado: 0 linhas)'
delete from configuracoes;

-- ---------------------------------------------------------------
reset role;
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
\echo ''
\echo '-- 61. A administradora volta para imediato:'
update configuracoes set ritmo = 'imediato';
select ritmo, ritmo_dias from configuracoes;

-- Apaga o progresso: com ele, 6 apareceria em qualquer ritmo, e o
-- teste nao provaria que voltar para `imediato` mudou algo.
reset role;
delete from progresso where aluna_id = '22222222-2222-2222-2222-222222222222';
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
\echo '-- 62. Sem nenhum progresso e em `imediato`, ve tudo de novo?'
\echo '       (esperado: 6 — e a prova de que voltar desfaz a regra)'
select count(*) as aulas_visiveis from minhas_aulas();

-- ---------------------------------------------------------------
reset role;
update configuracoes set ritmo = 'aulas_por_semana', aulas_por_semana = 2;
update profiles set criada_em = now()
 where id = '22222222-2222-2222-2222-222222222222';
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

\echo ''
\echo '-- 63. DUAS AULAS POR SEMANA, cadastrada hoje:'
\echo '       (esperado: 2 — as duas primeiras do curso)'
select count(*) as aulas_visiveis from minhas_aulas();

reset role;
update profiles set criada_em = now() - interval '8 days'
 where id = '22222222-2222-2222-2222-222222222222';
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

\echo '-- 64. Passada uma semana, quantas?'
\echo '       (esperado: 4 — a contagem atravessa a fronteira do modulo)'
select count(*) as aulas_visiveis from minhas_aulas();

-- Devolve o banco ao padrão, para quem rodar depois.
reset role;
update configuracoes set ritmo = 'imediato', ritmo_dias = 15, aulas_por_semana = 2;
