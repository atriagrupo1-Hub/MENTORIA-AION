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
select count(*) as comentarios_com_autoria_visiveis from comentarios where autora_id <> auth.uid();

\echo '-- 4. Lê os comentários publicados pela view (sem autoria)?'
select count(*) as comentarios_publicos from comentarios_publicos;

\echo '-- 5. minhas_aulas() devolve só o que está liberado?'
select modulo_numero, aula_numero, titulo from minhas_aulas();

\echo '-- 6. video_da_aula() na aula liberada:'
select provider, ref from video_da_aula('a0a00000-0000-0000-0000-000000000001');

\echo '-- 7. video_da_aula() na aula NÃO liberada (Módulo 1):'
select coalesce((select ref from video_da_aula('b0b00000-0000-0000-0000-000000000001')), '(nada — correto)') as resultado;

\echo '-- 8. Consegue liberar conteúdo para si mesma?'
insert into acessos (aluna_id, escopo) values ('22222222-2222-2222-2222-222222222222', 'curso');

\echo '-- 9. Consegue se promover a admin?'
update profiles set papel = 'admin' where id = auth.uid();

\echo '-- 10. Consegue mover o próprio comentário para uma aula bloqueada?'
update comentarios set aula_id = 'b0b00000-0000-0000-0000-000000000001' where autora_id = auth.uid();

\echo '-- 11. Consegue apagar a linha do próprio comentário?'
delete from comentarios where autora_id = auth.uid();

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
\echo '-- 15. Vê a autoria dos comentários?'
select p.nome as autora, c.texto from comentarios c join profiles p on p.id = c.autora_id;
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

\echo '-- 3. Maria consegue descobrir quem escreveu comentário de outra?'
select count(*) as comentarios_de_outras_visiveis from comentarios where autora_id <> auth.uid();
\echo '   (o próprio comentário dela ela vê, com autoria — é dela)'
select count(*) as proprios from comentarios where autora_id = auth.uid();

\echo '-- 9. Consegue se promover a admin?'
update profiles set papel = 'admin' where id = auth.uid();

\echo '-- 10. Consegue mover o próprio comentário para uma aula bloqueada?'
update comentarios set aula_id = 'b0b00000-0000-0000-0000-000000000001' where autora_id = auth.uid();

\echo '-- 10b. Consegue editar o texto do próprio comentário (deve funcionar)?'
update comentarios set texto = 'Texto editado pela Maria' where autora_id = auth.uid();
select texto from comentarios where autora_id = auth.uid();

\echo '-- 11. Consegue apagar a linha do próprio comentário?'
delete from comentarios where autora_id = auth.uid();

\echo '-- 11b. remover_meu_comentario() muda o status e preserva a linha:'
select remover_meu_comentario((select id from comentarios where autora_id = auth.uid() limit 1));
reset role; reset request.jwt.claim.sub;
select status, texto from comentarios;

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
begin;
  update aulas set numero = 2 where id = 'a0a00000-0000-0000-0000-000000000001';
  update aulas set numero = 1 where id = 'a0a00000-0000-0000-0000-000000000002';
commit;
select numero, titulo from aulas where modulo_id = 'aaaaaaaa-0000-0000-0000-000000000000' order by numero;

\echo ''
\echo '=== 21. Trocar dois módulos de número na mesma transação ==='
begin;
  update modulos set numero = 1 where id = 'aaaaaaaa-0000-0000-0000-000000000000';
  update modulos set numero = 0 where id = 'bbbbbbbb-0000-0000-0000-000000000000';
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
values ('a0a00000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Comentario da Maria', 272);

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
