\set QUIET on
\pset border 2
\set ON_ERROR_STOP off

\echo '=========================================================='
\echo 'MARIA (aluna, só o Módulo 0 liberado)'
\echo '=========================================================='
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

\echo '-- 1. Consegue ler o endereço de algum vídeo direto da tabela?'
select count(*) as linhas_de_midia_visiveis from aula_midia;

\echo '-- 2. Consegue ler o próprio código de acesso?'
select count(*) as credenciais_visiveis from credenciais;

\echo '-- 3. Consegue descobrir quem escreveu um comentário?'
\echo '      (esperado: recusa, a coluna autora_id nao e concedida)'
select count(*) as comentarios_com_autoria_visiveis from comentarios where autora_id <> auth.uid();

\echo '-- 4. Lê os comentários publicados pela view (sem autoria)?'
select count(*) as comentarios_publicos from comentarios_publicos;

\echo '-- 5. minhas_aulas() devolve só o que está liberado?'
select modulo_numero, aula_numero, titulo from minhas_aulas();

\echo '-- 6. video_da_aula() na aula liberada:'
select provider, ref from video_da_aula((select a.id from aulas a join modulos m on m.id=a.modulo_id where m.numero=0 and a.numero=1));

\echo '-- 7. video_da_aula() na aula NÃO liberada (Módulo 1):'
select coalesce((select ref from video_da_aula((select a.id from aulas a join modulos m on m.id=a.modulo_id where m.numero=1 and a.numero=1))), '(nada — correto)') as resultado;

\echo '-- 8. Consegue liberar conteúdo para si mesma?'
insert into acessos (aluna_id, escopo) values ('22222222-2222-2222-2222-222222222222', 'curso');

\echo '-- 9. Consegue se promover a admin?'
update profiles set papel = 'admin' where id = auth.uid();

\echo '-- 10. Consegue mover o próprio comentário para uma aula bloqueada?'
\echo '      (recusado antes mesmo da RLS: o UPDATE so e concedido na'
\echo '       coluna texto, nunca em aula_id)'
update comentarios
   set aula_id = (select a.id from aulas a join modulos m on m.id=a.modulo_id
                   where m.numero=1 and a.numero=1)
 where id = (select id from meus_comentarios() limit 1);

\echo '-- 11. Consegue apagar a linha do próprio comentário?'
delete from comentarios where id = (select id from meus_comentarios() limit 1);

reset role;
reset request.jwt.claim.sub;

\echo ''
\echo '=========================================================='
\echo 'ANA (aluna, nada liberado)'
\echo '=========================================================='
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
\echo '-- 12. minhas_aulas():'
select count(*) as aulas_visiveis from minhas_aulas();
\echo '-- 13. comentarios_publicos:'
select count(*) as comentarios_visiveis from comentarios_publicos;
reset role;
reset request.jwt.claim.sub;

\echo ''
\echo '=========================================================='
\echo 'ADMINISTRADORA'
\echo '=========================================================='
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
\echo '-- 14. Vê os códigos de todas?'
select p.nome, c.codigo from credenciais c join profiles p on p.id = c.aluna_id order by p.nome;
\echo '-- 15. Vê a autoria dos comentários? (pela funcao de moderacao —'
\echo '       a coluna nao e concedida nem para ela, desde a 0003)'
select autora_nome, texto from comentarios_para_moderacao();
\echo '-- 16. Vê a mídia?'
select count(*) as midias_visiveis from aula_midia;
reset role;
reset request.jwt.claim.sub;

\echo ''
\echo '=========================================================='
\echo 'ANÔNIMO (sem sessão)'
\echo '=========================================================='
set role anon;
\echo '-- 17. Consegue chamar verificar_codigo?'
select verificar_codigo('maria', '1234');
reset role;
\pset border 2
\set ON_ERROR_STOP off
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

\echo '-- 3b. Depois da 0003, a coluna autora_id nao e alcancavel de forma'
\echo '      nenhuma: qualquer consulta que a mencione e recusada, inclusive'
\echo '      para achar os proprios comentarios. O caminho passa a ser'
\echo '      meus_comentarios(), testado em 25 a 27.'
select count(*) from comentarios where autora_id = auth.uid();

\echo '-- 9. Consegue se promover a admin?'
update profiles set papel = 'admin' where id = auth.uid();

\echo '-- 10. Consegue mover o proprio comentario para uma aula bloqueada?'
\echo '      (recusado no privilegio de coluna, antes da RLS)'
update comentarios
   set aula_id = (select a.id from aulas a join modulos m on m.id=a.modulo_id
                   where m.numero=1 and a.numero=1)
 where id = (select id from meus_comentarios() limit 1);

\echo '-- 11. Consegue apagar a linha do proprio comentario?'
delete from comentarios where id = (select id from meus_comentarios() limit 1);

\echo '-- 11b. remover_meu_comentario() muda o status e preserva a linha:'
select remover_meu_comentario((select id from meus_comentarios() limit 1));
select status, texto from meus_comentarios();
reset role; reset request.jwt.claim.sub;
\echo '   e a linha continua la, para a moderacao:'
select count(*) as linhas_preservadas from comentarios;

\echo '-- 11c. Volta ao estado publicado para o resto do arquivo:'
update comentarios set status = 'publicado';

\echo ''
\echo '-- 18. Trava por tentativas: 5 erros seguidos e depois o código certo'
select coalesce(verificar_codigo('maria','0000')::text, 'errado 1') as t1;
select coalesce(verificar_codigo('maria','0000')::text, 'errado 2') as t2;
select coalesce(verificar_codigo('maria','0000')::text, 'errado 3') as t3;
select coalesce(verificar_codigo('maria','0000')::text, 'errado 4') as t4;
select coalesce(verificar_codigo('maria','0000')::text, 'errado 5') as t5;
select tentativas_erradas, travada_ate > now() as travada from credenciais where aluna_id = '22222222-2222-2222-2222-222222222222';
\echo '   agora com o código certo, ainda travada:'
select verificar_codigo('maria','1234');
\pset border 2
\set ON_ERROR_STOP off

\echo '=== 19. Trava expirada: o contador zera? (era o defeito nº 9) ==='
update credenciais set travada_ate = now() - interval '1 minute'
 where aluna_id = '22222222-2222-2222-2222-222222222222';
\echo '   estado antes:'
select tentativas_erradas, travada_ate < now() as trava_expirada from credenciais
 where aluna_id = '22222222-2222-2222-2222-222222222222';
\echo '   um erro depois da trava expirar — NAO deve travar de novo:'
select coalesce(verificar_codigo('maria','0000')::text, 'errado') as tentativa;
select tentativas_erradas, travada_ate is null as destravada from credenciais
 where aluna_id = '22222222-2222-2222-2222-222222222222';
\echo '   e o código certo entra:'
select verificar_codigo('maria','1234') is not null as entrou;
select tentativas_erradas from credenciais where aluna_id = '22222222-2222-2222-2222-222222222222';

\echo ''
\echo '=== 20. Reordenar duas aulas numa transação (era o defeito nº 5) ==='
-- Guarda os ids antes: os UPDATEs mudam justamente a coluna do filtro.
select a.id as aula_um from aulas a join modulos m on m.id=a.modulo_id
 where m.numero=0 and a.numero=1 \gset
select a.id as aula_dois from aulas a join modulos m on m.id=a.modulo_id
 where m.numero=0 and a.numero=2 \gset
begin;
  update aulas set numero = 2 where id = :'aula_um';
  update aulas set numero = 1 where id = :'aula_dois';
commit;
select numero, titulo from aulas where modulo_id = (select id from modulos where numero=0) order by numero;

\echo ''
\echo '=== 21. Trocar dois módulos de número na mesma transação ==='
select id as mod_zero from modulos where numero=0 \gset
select id as mod_um   from modulos where numero=1 \gset
begin;
  update modulos set numero = 1 where id = :'mod_zero';
  update modulos set numero = 0 where id = :'mod_um';
commit;
-- devolve ao normal, para o resto do arquivo continuar valendo
begin;
  update modulos set numero = 1 where id = :'mod_um';
  update modulos set numero = 0 where id = :'mod_zero';
commit;
select numero, titulo from modulos order by numero;

\echo ''
\echo '=== 22. Duplicata de verdade continua barrada ==='
insert into modulos (numero, titulo, ordem) values (0, 'DUPLICADO', 9);

\echo ''
\echo '=========================================================='
\echo 'ANONIMATO POR PRIVILEGIO DE COLUNA (migration 0003)'
\echo '=========================================================='
\pset border 2
\set ON_ERROR_STOP off
insert into comentarios (aula_id, autora_id, texto, posicao_segundos)
values ((select a.id from aulas a join modulos m on m.id=a.modulo_id where m.numero=0 and a.numero=1), '22222222-2222-2222-2222-222222222222', 'Comentario da Maria', 272);

set role authenticated;
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
\echo '-- 23. ANA tenta ler a coluna da autoria (deve ser negado):'
select autora_id from comentarios;
\echo '-- 24. ANA tenta select * (inclui a coluna proibida):'
select * from comentarios;
reset role; reset request.jwt.claim.sub;

set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
\echo '-- 25. MARIA acha os proprios comentarios pela funcao:'
select texto, status from meus_comentarios();
\echo '-- 26. MARIA edita pelo id:'
select editar_meu_comentario((select id from meus_comentarios() limit 1), 'texto editado pela Maria');
select texto from meus_comentarios();
\echo '-- 27. A colega ve o texto novo, sem autoria:'
select texto from comentarios_publicos;
reset role; reset request.jwt.claim.sub;

set role authenticated;
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
\echo '-- 28. ANA tenta editar o comentario da MARIA pelo id real (nao deve mudar nada):'
select editar_meu_comentario((select id from comentarios limit 1), 'INVASAO');
reset role; reset request.jwt.claim.sub;
select texto from comentarios;

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
\echo '-- 29. ADMINISTRADORA le autoria pela funcao de moderacao:'
select autora_nome, modulo_numero, aula_numero, texto, status from comentarios_para_moderacao();
\echo '-- 30. ADMINISTRADORA oculta o comentario:'
select moderar_comentario((select id from comentarios_para_moderacao() limit 1), 'oculto');
select autora_nome, status from comentarios_para_moderacao();
reset role; reset request.jwt.claim.sub;

set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
\echo '-- 31. Depois de oculto, some da view publica:'
select count(*) as visiveis from comentarios_publicos;
reset role;
