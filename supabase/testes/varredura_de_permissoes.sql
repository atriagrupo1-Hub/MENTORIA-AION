/*
  Varredura de permissões — o que uma aluna logada alcança.

  O alerta do Supabase avisa que 54 funções `SECURITY DEFINER` podem ser
  chamadas pelo papel `authenticated`, e aluna logada é `authenticated`.
  A porta dessas funções não está no GRANT: está dentro de cada uma
  (`eh_admin`, `eh_dono`, `eh_equipe`, `auth.uid()`) ou no `pode_ver_*`
  que ela consulta. Ler o código não prova nada — já aconteceu neste
  projeto de um `perform` engolir um `false` e de um `revoke ... from
  anon` não revogar coisa alguma, porque o EXECUTE vinha de PUBLIC.

  Então mede-se o DADO: um resumo (`md5`) das dez tabelas antes e
  depois. O bloco termina em `raise exception`, e por isso a transação
  inteira volta atrás — nada do que ele tenta fica gravado. O resultado
  vem na mensagem do erro; o erro é a saída esperada.

  Antes de rodar, troque os ids do bloco `declare` pelos do banco:
  duas alunas, o dono, uma aula que a primeira vê e outra que não.
  O resultado está registrado em `docs/Varredura de permissoes.md`.
*/
do $$
declare
  ALUNA   constant uuid := '00000000-0000-0000-0000-000000000001';
  OUTRA   constant uuid := '00000000-0000-0000-0000-000000000002';
  DONO    constant uuid := '00000000-0000-0000-0000-000000000003';
  AULA_OK   constant uuid := '00000000-0000-0000-0000-000000000004';
  AULA_NAO  constant uuid := '00000000-0000-0000-0000-000000000005';
  MODULO    constant uuid := '00000000-0000-0000-0000-000000000006';
  PRODUTO   constant uuid := '00000000-0000-0000-0000-000000000007';
  CONTEUDO  constant uuid := '00000000-0000-0000-0000-000000000008';
  COMENT    constant uuid := '00000000-0000-0000-0000-000000000009';
  AOVIVO    constant uuid := '00000000-0000-0000-0000-00000000000a';
  RETRATO constant text := $q$
    select jsonb_build_object(
      'profiles',    (select md5(coalesce(string_agg(id::text||papel||nome||status, '|' order by id),'')) from profiles),
      'credenciais', (select md5(coalesce(string_agg(aluna_id::text||codigo, '|' order by aluna_id),'')) from credenciais),
      'acessos',     (select md5(coalesce(string_agg(id::text, '|' order by id),'')) from acessos),
      'aulas',       (select md5(coalesce(string_agg(id::text||titulo||coalesce(duracao_segundos,-1)::text||ordem::text, '|' order by id),'')) from aulas),
      'modulos',     (select md5(coalesce(string_agg(id::text||titulo||numero::text||ordem::text, '|' order by id),'')) from modulos),
      'produtos',    (select md5(coalesce(string_agg(id::text||titulo, '|' order by id),'')) from produtos),
      'conteudos',   (select md5(coalesce(string_agg(id::text||titulo, '|' order by id),'')) from conteudos),
      'comentarios', (select md5(coalesce(string_agg(id::text||texto||status::text, '|' order by id),'')) from comentarios),
      'progresso',   (select md5(coalesce(string_agg(aluna_id::text||aula_id::text||coalesce(posicao_segundos,-1)::text||coalesce(concluida_em::text,'-'), '|' order by aluna_id, aula_id),'')) from progresso),
      'curtidas',    (select md5(coalesce(string_agg(aluna_id::text||aula_id::text, '|' order by aluna_id, aula_id),'')) from curtidas)
    ) $q$;
  antes jsonb; depois jsonb; k text; cmd text; res text; n int; minha uuid;
  r text := '';
begin
  execute RETRATO into antes;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claims',
    json_build_object('sub', ALUNA::text, 'role','authenticated')::text, true);

  r := r || E'=== ESCRITA POR FUNCAO ===\n';
  for cmd in select unnest(array[
    format('select bloquear_colaborador(%L,%L)', DONO, 'bloqueada'),
    format('select definir_abertura(%L,%L,now())', OUTRA, AULA_OK),
    format('select definir_acesso(%L,999,0,0)', OUTRA),
    format('select definir_status_aluna(%L,%L)', OUTRA, 'bloqueada'),
    format('select descartar_rascunho(%L)', PRODUTO),
    format('select editar_aluna(%L,%L,%L,%L)', OUTRA, 'INVADIDO', 'invadido', '11999999999'),
    format('select estender_acesso(%L,999,0,0)', OUTRA),
    format('select gerar_cronograma(%L, array[%L]::uuid[], 1, now())', OUTRA, MODULO),
    format('select gerar_cronograma_de_aulas(%L, array[%L]::uuid[], 1, now())', OUTRA, AULA_OK),
    format('select gerar_cronograma_lote(array[%L]::uuid[], array[%L]::uuid[], 1, now())', OUTRA, MODULO),
    format('select liberar_aula_para_todas(%L, now())', AULA_NAO),
    format('select moderar_comentario(%L,%L)', COMENT, 'removido'),
    format('select mudar_codigo(%L,%L)', DONO, '999999'),
    format('select mudar_codigo(%L,%L)', OUTRA, '999999'),
    format('select ordenar_aulas(%L, array[%L]::uuid[])', MODULO, AULA_OK),
    format('select ordenar_lista(%L, array[%L]::uuid[])', 'modulos', MODULO),
    format('select remover_aluna(%L)', OUTRA),
    format('select remover_aula_da_aluna(%L,%L)', OUTRA, AULA_OK),
    format('select remover_colaborador(%L)', DONO),
    format('select renovar_acesso(%L,999,0,0)', OUTRA),
    format('select editar_meu_comentario(%L,%L)', COMENT, 'TEXTO TROCADO'),
    format('select remover_meu_comentario(%L)', COMENT),
    format('select registrar_duracao(%L, 600)', AULA_NAO),
    format('select marcar_concluida(%L, true)', AULA_NAO),
    format('select salvar_posicao(%L, 500)', AULA_NAO),
    format('select alternar_curtida(%L)', AULA_NAO),
    'select conteudo_herda_o_produto()'
  ]) loop
    begin
      execute cmd; res := 'EXECUTOU SEM ERRO';
    exception when others then res := 'recusou: ' || replace(sqlerrm, E'\n', ' ');
    end;
    r := r || '  ' || rpad(split_part(split_part(cmd,'select ',2),'(',1), 28) || ' -> ' || res || E'\n';
  end loop;

  r := r || E'\n=== ESCRITA DIRETA NA TABELA (linhas afetadas) ===\n';
  for cmd in select unnest(array[
    format('update profiles set papel=''dono'' where id=%L', ALUNA),
    'update credenciais set codigo=''111111''',
    'update aulas set publicado=true, bloqueado_geral=false',
    'update modulos set publicado=true',
    'update produtos set publicado=true',
    'update comentarios set status=''publicado''',
    'delete from comentarios',
    'delete from acessos',
    format('insert into acessos (aluna_id, escopo, aula_id) values (%L,''aula'',null)', ALUNA),
    'insert into profiles (id, nome, login, papel) values (gen_random_uuid(),''x'',''x'',''dono'')',
    'insert into tentativas_ip (ip) values (''1.2.3.4'')'
  ]) loop
    begin
      execute cmd; get diagnostics n = row_count; res := n::text || ' linha(s)';
    exception when others then res := replace(sqlerrm, E'\n', ' ');
    end;
    r := r || '  ' || rpad(left(cmd,52),53) || ' -> ' || res || E'\n';
  end loop;

  r := r || E'\n=== LEITURA (quantas linhas ela recebeu) ===\n';
  for cmd in select unnest(array[
    format('select count(*) from ficha_da_aluna(%L)', OUTRA),
    format('select count(*) from cronograma_da_aluna(%L)', OUTRA),
    format('select count(*) from comentarios_da_autora(%L)', OUTRA),
    format('select count(*) from comentarios_para_moderacao(%L)', AULA_OK),
    'select count(*) from equipe_do_painel()',
    format('select count(*) from video_da_aula(%L)', AULA_NAO),
    'select eh_admin()::text', 'select eh_dono()::text', 'select eh_equipe()::text',
    'select conta_ativa()::text',
    format('select pode_ver_aula(%L)::text', AULA_NAO),
    format('select (select count(*) from meu_perfil() p where p.id = %L)::text', ALUNA)
  ]) loop
    begin
      execute cmd into k; res := coalesce(k,'(nulo)');
    exception when others then res := 'recusou: ' || replace(sqlerrm, E'\n', ' ');
    end;
    r := r || '  ' || rpad(left(cmd, 62), 63) || ' -> ' || res || E'\n';
  end loop;

  /*
    Controle positivo. Sem ele o teste não vale nada: zero em tudo é
    também o que se vê quando a identidade não pegou.
  */
  select a.aula_id into minha from minhas_aulas() a limit 1;
  select count(*) into n from video_da_aula(minha);
  r := r || E'\n=== CONTROLE POSITIVO ===\n';
  r := r || '  aula que ela ve: ' || coalesce(minha::text,'(nenhuma)')
         || '  pode_ver_aula=' || pode_ver_aula(minha)::text
         || '  video_da_aula=' || n || E' linha(s)\n';

  execute 'reset role';
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims',
    json_build_object('sub', OUTRA::text, 'role','authenticated')::text, true);
  select count(*) into n from video_da_aula(minha);
  r := r || '  a MESMA aula, pela outra aluna: pode_ver_aula='
         || pode_ver_aula(minha)::text || '  video_da_aula=' || n || E' linha(s)\n';

  execute 'reset role';
  execute 'set local role anon';
  perform set_config('request.jwt.claims', json_build_object('role','anon')::text, true);
  r := r || E'\n=== ANON ===\n';
  for k in select unnest(array['eh_admin()','eh_dono()','eh_equipe()','equipe_do_painel()',
      'ficha_da_aluna(null)','remover_aluna(null)','mudar_codigo(null,null)',
      'ordenar_lista(null,null)','video_da_aula(null)','minhas_aulas()']) loop
    begin
      execute 'select ' || k; res := 'PASSOU';
    exception when others then res := replace(sqlerrm, E'\n',' ');
    end;
    r := r || '  ' || rpad(k, 24) || ' -> ' || res || E'\n';
  end loop;
  for k in select unnest(array['profiles','credenciais','aulas','modulos','produtos',
      'conteudos','acessos','comentarios','tentativas_ip','curtidas','progresso','categorias']) loop
    begin
      execute format('select count(*) from %I', k) into n; res := n::text || ' linha(s)';
    exception when others then res := replace(sqlerrm, E'\n',' ');
    end;
    r := r || '  ' || rpad(k, 24) || ' -> ' || res || E'\n';
  end loop;

  execute 'reset role';
  execute RETRATO into depois;

  r := r || E'\n=== O DADO MUDOU? ===\n';
  for k in select jsonb_object_keys(antes) loop
    r := r || '  ' || rpad(k, 14)
           || case when antes->>k = depois->>k then 'igual' else '*** MUDOU ***' end || E'\n';
  end loop;

  raise exception E'RESULTADO\n%', r;
end $$;
