-- =====================================================================
-- Anonimato dos comentários por privilégio de coluna
--
-- A 0001 garantia o anonimato tirando a linha do alcance da aluna: ela
-- só lia o próprio comentário na tabela-base, e os das outras pela view
-- `comentarios_publicos`, que rodava como dona (`security_invoker =
-- false`) e filtrava por conta própria.
--
-- Funcionava, mas o linter do Supabase acusa view com SECURITY DEFINER
-- como ERRO, e com razão no geral: uma view assim ignora a RLS de quem
-- consulta, então qualquer descuido futuro no filtro dela vira
-- vazamento silencioso.
--
-- Aqui a garantia desce um nível e passa a ser privilégio de coluna:
-- `autora_id` e `moderado_por` simplesmente não são concedidos ao papel
-- `authenticated`. A aluna volta a ler a linha do comentário publicado
-- de qualquer colega — mas não existe caminho pelo qual ela alcance a
-- coluna da autoria, nem afrouxando a política depois. A view volta a
-- ser `security_invoker = true`.
--
-- A administradora também é `authenticated`, então ela lê a autoria
-- pela função `comentarios_para_moderacao()`, no mesmo padrão já usado
-- para mídia e credenciais.
-- =====================================================================

-- A aluna volta a alcançar a linha publicada; a coluna é que fica fora.
drop policy comentarios_leitura on comentarios;
create policy comentarios_leitura on comentarios
  for select using (
    eh_admin()
    or autora_id = auth.uid()
    or (status = 'publicado' and pode_ver_aula(aula_id))
  );

-- Privilégio de coluna: nada de `autora_id` nem `moderado_por`.
revoke select, insert, update on comentarios from authenticated;

grant select (id, aula_id, texto, posicao_segundos, status, criado_em, moderado_em)
  on comentarios to authenticated;

-- `autora_id` é gravável na inserção (precisa valer auth.uid(), o que a
-- política exige), mas não é atualizável depois.
grant insert (aula_id, autora_id, texto, posicao_segundos)
  on comentarios to authenticated;

grant update (texto) on comentarios to authenticated;

-- A view volta a rodar com a permissão de quem consulta.
drop view comentarios_publicos;
create view comentarios_publicos
with (security_invoker = true) as
  select id, aula_id, texto, posicao_segundos, criado_em
  from comentarios
  where status = 'publicado';

revoke all on comentarios_publicos from public, anon;
grant select on comentarios_publicos to authenticated;

-- Moderação: a administradora lê autoria, aula e módulo de uma vez.
create or replace function comentarios_para_moderacao(p_aula uuid default null)
returns table (
  id uuid, aula_id uuid, modulo_numero smallint, aula_numero smallint,
  autora_id uuid, autora_nome text, texto text, posicao_segundos integer,
  status status_comentario, criado_em timestamptz
) language sql stable security definer set search_path = public as $$
  select c.id, c.aula_id, m.numero, a.numero,
         c.autora_id, p.nome, c.texto, c.posicao_segundos,
         c.status, c.criado_em
  from comentarios c
  join aulas a   on a.id = c.aula_id
  join modulos m on m.id = a.modulo_id
  join profiles p on p.id = c.autora_id
  where eh_admin()
    and (p_aula is null or c.aula_id = p_aula)
  order by c.criado_em desc;
$$;

revoke execute on function comentarios_para_moderacao(uuid) from public, anon;
grant execute on function comentarios_para_moderacao(uuid) to authenticated;

-- Moderar: ocultar ou remover, preservando a linha e quem agiu.
create or replace function moderar_comentario(p_comentario uuid, p_status status_comentario)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if not eh_admin() then return; end if;
  update comentarios
     set status = p_status,
         moderado_por = auth.uid(),
         moderado_em = now()
   where id = p_comentario;
end;
$$;

revoke execute on function moderar_comentario(uuid, status_comentario) from public, anon;
grant execute on function moderar_comentario(uuid, status_comentario) to authenticated;

-- Sem acesso à coluna `autora_id`, a aluna não consegue mais escrever
-- `where autora_id = auth.uid()` — nem para achar os próprios
-- comentários, nem para editá-los. Ela passa a trabalhar por `id`:
-- esta função diz quais são os dela, e a política continua conferindo a
-- autoria em qualquer escrita.
create or replace function meus_comentarios(p_aula uuid default null)
returns table (
  id uuid, aula_id uuid, texto text, posicao_segundos integer,
  status status_comentario, criado_em timestamptz
) language sql stable security definer set search_path = public as $$
  select c.id, c.aula_id, c.texto, c.posicao_segundos, c.status, c.criado_em
  from comentarios c
  where c.autora_id = auth.uid()
    and (p_aula is null or c.aula_id = p_aula)
  order by c.criado_em desc;
$$;

revoke execute on function meus_comentarios(uuid) from public, anon;
grant execute on function meus_comentarios(uuid) to authenticated;

-- Editar o próprio comentário, sem tocar em autoria nem em status.
create or replace function editar_meu_comentario(p_comentario uuid, p_texto text)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if length(trim(coalesce(p_texto, ''))) not between 1 and 600 then return; end if;
  update comentarios
     set texto = p_texto
   where id = p_comentario
     and autora_id = auth.uid()
     and status = 'publicado';
end;
$$;

revoke execute on function editar_meu_comentario(uuid, text) from public, anon;
grant execute on function editar_meu_comentario(uuid, text) to authenticated;
