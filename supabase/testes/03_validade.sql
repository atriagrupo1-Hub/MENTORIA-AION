-- Validade do acesso (migration 0008).
--
-- A pergunta que estes testes respondem é uma só: vencido o prazo, a
-- aula fecha sozinha, sem ninguém bloquear nada na mão?

\set QUIET on
\pset border 2
\set ON_ERROR_STOP off

\echo ''
\echo '=========================================================='
\echo 'VALIDADE DO ACESSO'
\echo '=========================================================='

-- A Maria tem o Módulo 0 liberado desde o começo dos testes.
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

\echo '-- 32. Sem prazo definido, quantas aulas a Maria enxerga?'
\echo '       (esperado: 2, as duas do Modulo 0)'
select count(*) as aulas_visiveis from minhas_aulas();

-- Administradora dá 30 dias contados do cadastro.
reset role;
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

\echo '-- 33. Administradora define 30 dias a partir do cadastro:'
select definir_acesso('22222222-2222-2222-2222-222222222222'::uuid, 30, 0, 0) is not null as prazo_definido;

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
\echo '-- 34. Dentro do prazo, a Maria continua enxergando?'
\echo '       (esperado: 2)'
select count(*) as aulas_visiveis from minhas_aulas();

\echo '-- 35. E o endereco do video, continua saindo?'
\echo '       (esperado: 1 linha)'
select count(*) as video_entregue from video_da_aula(
  (select a.id from aulas a join modulos m on m.id = a.modulo_id
   where m.numero = 0 and a.ordem = 0));

-- O prazo vence: empurra o cadastro para 400 dias atrás, então
-- criada_em + 30 dias já passou.
reset role;
update profiles set criada_em = now() - interval '400 days'
 where id = '22222222-2222-2222-2222-222222222222';
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select definir_acesso('22222222-2222-2222-2222-222222222222'::uuid, 30, 0, 0);

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
\echo '-- 36. VENCIDO: quantas aulas a Maria enxerga agora?'
\echo '       (esperado: 0 — sem ninguem ter bloqueado nada)'
select count(*) as aulas_visiveis from minhas_aulas();

\echo '-- 37. VENCIDO: o endereco do video ainda sai?'
\echo '       (esperado: 0 linhas)'
select count(*) as video_entregue from video_da_aula(
  (select a.id from aulas a join modulos m on m.id = a.modulo_id
   where m.numero = 0 and a.ordem = 0));

\echo '-- 38. VENCIDO: o acesso continua no banco, so inativo?'
\echo '       (esperado: 1 — a liberacao nao foi apagada)'
select count(*) as liberacoes_no_banco from acessos where aluna_id = auth.uid();

\echo '-- 39. VENCIDO: a Maria consegue esticar o proprio prazo?'
\echo '       (esperado: erro sem_permissao)'
select estender_acesso('22222222-2222-2222-2222-222222222222'::uuid, 365, 0, 0);

\echo '-- 40. VENCIDO: e escrevendo direto na coluna?'
\echo '       (esperado: 0 linhas afetadas, a politica so deixa a admin)'
update profiles set acesso_ate = now() + interval '10 years' where id = auth.uid();

\echo '-- 41. Continua vencida depois das duas tentativas?'
\echo '       (esperado: 0)'
select count(*) as aulas_visiveis from minhas_aulas();

-- Administradora renova.
reset role;
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

\echo '-- 42. Administradora estica 1 ano; conta de agora, nao do vencido?'
\echo '       (esperado: t — a nova data esta no futuro)'
select estender_acesso('22222222-2222-2222-2222-222222222222'::uuid, 0, 0, 1) > now() as data_no_futuro;

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
\echo '-- 43. Renovada: tudo voltou como estava, com o progresso intacto?'
\echo '       (esperado: 2 aulas)'
select count(*) as aulas_visiveis from minhas_aulas();

\echo '-- 44. Renovada: os comentarios dela continuam la?'
\echo '       (esperado: 2)'
select count(*) as comentarios from meus_comentarios();

-- Zero em tudo remove o prazo.
reset role;
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
\echo '-- 45. definir_acesso com tudo zero remove o prazo?'
\echo '       (esperado: prazo nulo)'
select definir_acesso('22222222-2222-2222-2222-222222222222'::uuid, 0, 0, 0) is null as sem_prazo;

\echo '-- 46. Prazo negativo e recusado?'
\echo '       (esperado: erro prazo_negativo)'
select definir_acesso('22222222-2222-2222-2222-222222222222'::uuid, -5, 0, 0);

\echo '-- 47. A administradora nunca se tranca fora?'
\echo '       (esperado: t)'
select eh_admin() as admin_continua_entrando;
