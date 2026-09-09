-- Cronograma por aluna (migration 0010).
--
-- A pergunta: a aula fica fechada até a data dela e abre sozinha quando
-- o dia chega — e o módulo acompanha, oculto ou "libera em breve"?

\set QUIET on
\pset border 2
\set ON_ERROR_STOP off

\echo ''
\echo '=========================================================='
\echo 'CRONOGRAMA POR ALUNA'
\echo '=========================================================='

reset role;
update profiles set criada_em = now(), acesso_ate = null
 where id = '22222222-2222-2222-2222-222222222222';
delete from acessos  where aluna_id = '22222222-2222-2222-2222-222222222222';
delete from progresso where aluna_id = '22222222-2222-2222-2222-222222222222';

-- A administradora gera o cronograma: Módulos 0 e 1, uma aula a cada 5
-- dias, começando hoje. São 6 aulas (2 + 4).
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

\echo '-- 48. Administradora gera o cronograma (Modulos 0 e 1, 5 dias):'
\echo '       (esperado: 6 aulas)'
select gerar_cronograma(
  '22222222-2222-2222-2222-222222222222'::uuid,
  array(select id from modulos where numero in (0, 1)),
  5
) as aulas_no_cronograma;

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

\echo '-- 49. No primeiro dia, quantas aulas a Maria enxerga?'
\echo '       (esperado: 1 — so a primeira; as outras tem data futura)'
select count(*) as aulas_abertas from minhas_aulas();

\echo '-- 50. O video da segunda aula sai antes da data?'
\echo '       (esperado: 0)'
select count(*) as video_entregue from video_da_aula(
  (select a.id from aulas a join modulos m on m.id = a.modulo_id
   where m.numero = 0 and a.ordem = 1));

\echo '-- 51. Os modulos dela: quais aparecem, e quantas abertas em cada?'
\echo '       (esperado: Modulo 0 com 1 aberta, Modulo 1 com 0 e uma data)'
select modulo_numero, atribuidas, abertas,
       proxima_abertura is not null as tem_proxima
from meus_modulos();

\echo '-- 52. O Modulo 2, que ela nao recebeu, aparece na lista?'
\echo '       (esperado: 0 linhas — modulo sem aula atribuida fica oculto)'
select count(*) as modulo_2_visivel from meus_modulos() where modulo_numero = 2;

-- Passam 6 dias.
reset role;
update acessos set abre_em = abre_em - interval '6 days'
 where aluna_id = '22222222-2222-2222-2222-222222222222' and abre_em is not null;
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

\echo '-- 53. Passados 6 dias, quantas abriram?'
\echo '       (esperado: 2 — uma a cada 5 dias)'
select count(*) as aulas_abertas from minhas_aulas();

-- Passam mais 20 dias (26 no total): 6 aulas em 25 dias.
reset role;
update acessos set abre_em = abre_em - interval '20 days'
 where aluna_id = '22222222-2222-2222-2222-222222222222' and abre_em is not null;
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

\echo '-- 54. Passados 26 dias, o curso dela abriu inteiro?'
\echo '       (esperado: 6)'
select count(*) as aulas_abertas from minhas_aulas();

\echo '-- 55a. A aula ao vivo do Modulo 1, ainda sem data marcada:'
\echo '        (esperado: f — o catalogo cria com liberada = false)'
select pode_ver_ao_vivo(
  (select v.id from aulas_ao_vivo v join modulos m on m.id = v.modulo_id
   where m.numero = 1)) as ao_vivo_liberada;

-- A administradora marca a aula ao vivo. Agora ela deve seguir o módulo.
reset role;
update aulas_ao_vivo set liberada = true
 where modulo_id = (select id from modulos where numero = 1);
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

\echo '-- 55b. Marcada, e com o Modulo 1 aberto para ela:'
\echo '        (esperado: t — a ao vivo segue o modulo)'
select pode_ver_ao_vivo(
  (select v.id from aulas_ao_vivo v join modulos m on m.id = v.modulo_id
   where m.numero = 1)) as ao_vivo_liberada;

\echo '-- 55c. E a do Modulo 5, que ela nao tem?'
\echo '        (esperado: f)'
select pode_ver_ao_vivo(
  (select v.id from aulas_ao_vivo v join modulos m on m.id = v.modulo_id
   where m.numero = 5)) as ao_vivo_do_modulo_5;

-- ---------------------------------------------------------------
-- Ajuste manual de uma aula
-- ---------------------------------------------------------------
reset role;
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

\echo ''
\echo '-- 56. Administradora empurra uma aula para daqui a 1 ano:'
select definir_abertura(
  '22222222-2222-2222-2222-222222222222'::uuid,
  (select a.id from aulas a join modulos m on m.id = a.modulo_id
   where m.numero = 1 and a.ordem = 3),
  now() + interval '1 year');

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
\echo '-- 57. A aula empurrada fechou, e so ela?'
\echo '       (esperado: 5)'
select count(*) as aulas_abertas from minhas_aulas();

reset role;
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
\echo '-- 58. Administradora manda abrir agora (data nula):'
select definir_abertura(
  '22222222-2222-2222-2222-222222222222'::uuid,
  (select a.id from aulas a join modulos m on m.id = a.modulo_id
   where m.numero = 1 and a.ordem = 3),
  null);

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
\echo '-- 59. Voltou a abrir?'
\echo '       (esperado: 6)'
select count(*) as aulas_abertas from minhas_aulas();

-- ---------------------------------------------------------------
-- Remover uma aula
-- ---------------------------------------------------------------
reset role;
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
\echo ''
\echo '-- 60. Administradora tira uma aula da aluna:'
select remover_aula_da_aluna(
  '22222222-2222-2222-2222-222222222222'::uuid,
  (select a.id from aulas a join modulos m on m.id = a.modulo_id
   where m.numero = 1 and a.ordem = 3));

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
\echo '-- 61. Sumiu da lista dela?'
\echo '       (esperado: 5)'
select count(*) as aulas_abertas from minhas_aulas();

-- ---------------------------------------------------------------
-- O que a aluna NAO pode fazer
-- ---------------------------------------------------------------
\echo ''
\echo '-- 62. A aluna consegue adiantar a propria data?'
\echo '       (esperado: 0 linhas afetadas)'
update acessos set abre_em = null where aluna_id = auth.uid();

\echo '-- 63. Consegue gerar cronograma para si mesma?'
\echo '       (esperado: erro sem_permissao)'
select gerar_cronograma('22222222-2222-2222-2222-222222222222'::uuid,
                        array(select id from modulos), 0);

\echo '-- 64. Consegue se dar uma aula que nao tem?'
\echo '       (esperado: erro sem_permissao)'
select definir_abertura('22222222-2222-2222-2222-222222222222'::uuid,
  (select a.id from aulas a join modulos m on m.id=a.modulo_id
   where m.numero = 5 and a.ordem = 0), null);

\echo '-- 65. Consegue ler o cronograma de outra pessoa?'
\echo '       (esperado: 0 linhas — a funcao exige eh_admin)'
select count(*) as linhas from cronograma_da_aluna(
  '33333333-3333-3333-3333-333333333333'::uuid);

-- ---------------------------------------------------------------
-- Duas alunas ao mesmo tempo: a turma
-- ---------------------------------------------------------------
reset role;
update profiles set criada_em = now() where id = '33333333-3333-3333-3333-333333333333';
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

\echo ''
\echo '-- 66. Mesmo cronograma em Maria e Ana de uma vez:'
\echo '       (esperado: 12 = 6 aulas x 2 alunas)'
select gerar_cronograma_lote(
  array['22222222-2222-2222-2222-222222222222'::uuid,
        '33333333-3333-3333-3333-333333333333'::uuid],
  array(select id from modulos where numero in (0, 1)),
  5) as linhas_criadas;

set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
\echo '-- 67. A Ana, que nao tinha nada, agora ve a primeira aula?'
\echo '       (esperado: 1)'
select count(*) as aulas_abertas from minhas_aulas();

-- Uma aluna corrigida sozinha não afeta a outra.
reset role;
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
\echo '-- 68. Abrir tudo so para a Ana:'
select gerar_cronograma('33333333-3333-3333-3333-333333333333'::uuid,
                        array(select id from modulos where numero in (0,1)), 0) as aulas;

set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
\echo '-- 69. Ana ve as 6:'
select count(*) as ana from minhas_aulas();

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
\echo '-- 70. E a Maria continua com o cronograma dela intacto?'
\echo '       (esperado: 1 — a turma nao mistura as alunas)'
select count(*) as maria from minhas_aulas();

-- ---------------------------------------------------------------
-- O prazo de acesso continua mandando por cima de tudo
-- ---------------------------------------------------------------
reset role;
update profiles set criada_em = now() - interval '400 days'
 where id = '33333333-3333-3333-3333-333333333333';
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select definir_acesso('33333333-3333-3333-3333-333333333333'::uuid, 30, 0, 0);

set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
\echo ''
\echo '-- 71. Ana com o cronograma aberto, mas o prazo vencido:'
\echo '       (esperado: 0 — a validade fecha por cima do cronograma)'
select count(*) as ana from minhas_aulas();

\echo '-- 72. E os modulos, tambem somem?'
\echo '       (esperado: 0 linhas)'
select count(*) as modulos from meus_modulos();
