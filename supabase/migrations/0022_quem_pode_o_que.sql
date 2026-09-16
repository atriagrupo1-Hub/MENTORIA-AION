-- Quem pode o quê.
--
-- Três portas, e não uma:
--
--   eh_dono()    — só o dono. Mexer na equipe passa por aqui.
--   eh_admin()   — dono e administrador. É a porta antiga, e continua
--                  guardando as 17 funções e as 27 políticas que já a
--                  chamavam. Nenhuma delas precisou ser reescrita.
--   eh_equipe()  — dono, administrador e suporte. Só o que o suporte
--                  faz: ler e responder comentário, cuidar de aluna, ver
--                  a ficha.
--
-- Redefinir `eh_admin()` em vez de sair trocando chamada por chamada é
-- o que torna esta migração pequena. Quem era admin continua podendo
-- tudo que podia; o dono entra junto; o suporte não entra em nada
-- automaticamente — só onde esta migração abre, uma por uma.

-- ---- as três portas ----

create or replace function eh_dono()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and papel = 'dono' and status = 'ativa'
  );
$$;

create or replace function eh_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and papel in ('dono', 'admin') and status = 'ativa'
  );
$$;

create or replace function eh_equipe()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and papel in ('dono', 'admin', 'suporte')
      and status = 'ativa'
  );
$$;

/*
 * `eh_aluna()` existe por causa da RLS, não por gosto.
 *
 * Várias políticas abaixo precisam perguntar "esta linha é de uma
 * aluna?". Escrita como subconsulta dentro da política, essa pergunta
 * roda com os privilégios de quem chamou — e quem chamou pode não ter
 * leitura na coluna `papel`, o que derruba tudo com um "permission
 * denied" que não explica nada. Já aconteceu aqui antes, na 0014.
 */
create or replace function eh_aluna(p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = p_id and papel = 'aluna');
$$;

revoke execute on function eh_dono()      from anon;
revoke execute on function eh_equipe()    from anon;
revoke execute on function eh_aluna(uuid) from anon;

-- ---- a conta que já existe vira o dono ----
--
-- Há exatamente uma conta de administração hoje, a da mentora. Ela é o
-- dono. Sem isto ninguém poderia criar o primeiro colaborador.
update profiles set papel = 'dono' where papel = 'admin';

-- ---- perfis: o admin cuida das alunas, o dono cuida da equipe ----
--
-- A política antiga era uma só, `ALL` com `eh_admin()`, e isso queria
-- dizer que um administrador podia escrever em QUALQUER linha de
-- `profiles` — inclusive na dele, trocando o próprio papel para dono, e
-- inclusive na do dono. A regra que o painel promete ("só o dono mexe na
-- equipe") não pode viver só na tela.

drop policy if exists perfil_admin_escrita   on profiles;
drop policy if exists perfil_proprio_leitura on profiles;

create policy perfil_leitura on profiles
  for select using (id = auth.uid() or eh_equipe());

-- O administrador escreve em aluna, e só em aluna. O `with check`
-- impede o outro lado do truque: transformar uma aluna em admin.
create policy perfil_alunas_escrita on profiles
  for all
  using (eh_admin() and papel = 'aluna')
  with check (eh_admin() and papel = 'aluna');

create policy perfil_equipe_escrita on profiles
  for all using (eh_dono()) with check (eh_dono());

-- ---- códigos ----
--
-- O código é a senha. Deixar o suporte — ou mesmo um administrador —
-- ler o código do dono seria entregar a chave da casa: basta sair e
-- entrar de novo com ele. Código de equipe só o dono vê.

drop policy if exists credenciais_admin on credenciais;

create policy credenciais_leitura on credenciais
  for select using (eh_dono() or (eh_equipe() and eh_aluna(aluna_id)));

create policy credenciais_alunas_escrita on credenciais
  for all
  using (eh_admin() and eh_aluna(aluna_id))
  with check (eh_admin() and eh_aluna(aluna_id));

create policy credenciais_equipe_escrita on credenciais
  for all using (eh_dono()) with check (eh_dono());

-- ---- o que o suporte enxerga ----
--
-- Tudo leitura. A ficha da aluna é feita destas quatro tabelas.

drop policy if exists acessos_leitura   on acessos;
drop policy if exists progresso_leitura on progresso;
drop policy if exists curtidas_leitura  on curtidas;

create policy acessos_leitura on acessos
  for select using (aluna_id = auth.uid() or eh_equipe());

create policy progresso_leitura on progresso
  for select using (aluna_id = auth.uid() or eh_equipe());

create policy curtidas_leitura on curtidas
  for select using (aluna_id = auth.uid() or eh_equipe());

-- O catálogo, para a aba de comentários conseguir dizer de que aula o
-- comentário é — e para a resposta passar pela conferência de
-- `comentarios_ativos`, que lê a aula.
drop policy if exists catalogo_aulas_leitura   on aulas;
drop policy if exists catalogo_modulos_leitura on modulos;

create policy catalogo_aulas_leitura on aulas
  for select using ((publicado and conta_ativa()) or eh_equipe());

create policy catalogo_modulos_leitura on modulos
  for select using ((publicado and conta_ativa()) or eh_equipe());

-- ---- comentários: ler e responder ----
--
-- Responder o suporte pode. Esconder e apagar, não: continuam com
-- `eh_admin()`, como estavam.

drop policy if exists comentarios_leitura       on comentarios;
drop policy if exists comentarios_insere        on comentarios;
drop policy if exists comentarios_edita_proprio on comentarios;

create policy comentarios_leitura on comentarios
  for select using (
    eh_equipe()
    or autora_id = auth.uid()
    or (status = 'publicado' and pode_ver_aula(aula_id))
  );

create policy comentarios_insere on comentarios
  for insert with check (
    autora_id = auth.uid()
    and (pode_ver_aula(aula_id) or eh_equipe())
    and exists (
      select 1 from aulas a
      where a.id = comentarios.aula_id and a.comentarios_ativos
    )
    and (resposta_a is null or pode_responder(resposta_a, aula_id))
  );

create policy comentarios_edita_proprio on comentarios
  for update
  using (autora_id = auth.uid() or eh_admin())
  with check (
    (autora_id = auth.uid() and (pode_ver_aula(aula_id) or eh_equipe()))
    or eh_admin()
  );

-- ---- as funções que o suporte usa ----

create or replace function comentarios_para_moderacao(p_aula uuid default null)
returns table (
  id uuid, aula_id uuid, modulo_numero smallint, aula_numero smallint,
  autora_id uuid, autora_nome text, texto text, posicao_segundos integer,
  status status_comentario, criado_em timestamptz,
  resposta_a uuid, eh_instrutor boolean
)
language sql stable security definer set search_path = public as $$
  select c.id, c.aula_id, m.numero, a.numero,
         c.autora_id, p.nome, c.texto, c.posicao_segundos,
         c.status, c.criado_em,
         c.resposta_a, coalesce(p.papel in ('dono','admin','suporte'), false)
  from comentarios c
  join aulas a    on a.id = c.aula_id
  join modulos m  on m.id = a.modulo_id
  join profiles p on p.id = c.autora_id
  where eh_equipe()
    and (p_aula is null or c.aula_id = p_aula)
  order by c.criado_em desc;
$$;

-- O selo de Instrutor nos comentários vale para os três papéis da
-- equipe. A aluna não precisa saber quem na equipe respondeu — precisa
-- saber que veio de dentro, e o nome real de quem escreveu já aparece
-- ao lado.
create or replace function comentarios_da_aula(p_aula uuid)
returns table (
  id uuid, aula_id uuid, texto text, posicao_segundos integer,
  criado_em timestamptz, autora_nome text, minha boolean,
  resposta_a uuid, eh_instrutor boolean
)
language sql stable security definer set search_path = public as $$
  select c.id,
         c.aula_id,
         c.texto,
         c.posicao_segundos,
         c.criado_em,
         case when c.nome_visivel then p.nome end,
         c.autora_id = auth.uid(),
         c.resposta_a,
         coalesce(p.papel in ('dono','admin','suporte'), false)
  from comentarios c
  left join profiles p      on p.id = c.autora_id
  left join comentarios pai on pai.id = c.resposta_a
  where c.aula_id = p_aula
    and c.status = 'publicado'
    and (c.resposta_a is null or pai.status = 'publicado')
    and (pode_ver_aula(p_aula) or eh_equipe())
  order by coalesce(pai.criado_em, c.criado_em) desc,
           c.resposta_a nulls first,
           c.criado_em asc;
$$;

create or replace function ficha_da_aluna(p_aluna uuid)
returns table (
  aulas_atribuidas integer, aulas_abertas integer, aulas_concluidas integer,
  comentarios integer, curtidas integer,
  ultima_atividade_em timestamptz, ultima_modulo smallint,
  ultima_aula smallint, ultima_titulo text
)
language sql stable security definer set search_path = public as $$
  select
    (select count(*)::integer from acessos ac
      where ac.aluna_id = p_aluna and ac.escopo = 'aula'),
    (select count(*)::integer from acessos ac
      where ac.aluna_id = p_aluna and ac.escopo = 'aula'
        and (ac.abre_em is null or ac.abre_em <= now())),
    (select count(*)::integer from progresso pr
      where pr.aluna_id = p_aluna and pr.concluida_em is not null),
    (select count(*)::integer from comentarios c
      where c.autora_id = p_aluna and c.status <> 'removido'),
    (select count(*)::integer from curtidas cu where cu.aluna_id = p_aluna),
    u.atualizada_em, u.modulo, u.aula, u.titulo
  from (select 1) sempre
  left join lateral (
    select pr.atualizada_em, m.numero as modulo, a.numero as aula, a.titulo
    from progresso pr
    join aulas a   on a.id = pr.aula_id
    join modulos m on m.id = a.modulo_id
    where pr.aluna_id = p_aluna
    order by pr.atualizada_em desc
    limit 1
  ) u on true
  where eh_equipe();
$$;

create or replace function comentarios_da_autora(p_aluna uuid)
returns table (
  id uuid, modulo_numero smallint, aula_numero smallint,
  texto text, status status_comentario, criado_em timestamptz, resposta_a uuid
)
language sql stable security definer set search_path = public as $$
  select c.id, m.numero, a.numero, c.texto, c.status, c.criado_em, c.resposta_a
  from comentarios c
  join aulas a   on a.id = c.aula_id
  join modulos m on m.id = a.modulo_id
  where c.autora_id = p_aluna and eh_equipe()
  order by c.criado_em desc;
$$;

-- O cronograma da aluna é a parte de "curso" da ficha. O suporte vê;
-- mexer nele continua sendo do administrador, por `definir_abertura` e
-- companhia, que seguem em `eh_admin()`.
create or replace function cronograma_da_aluna(p_aluna uuid)
returns table (
  aula_id uuid, modulo_id uuid, modulo_numero smallint, modulo_titulo text,
  aula_numero smallint, aula_titulo text, atribuida boolean,
  abre_em timestamptz, aberta boolean
)
language sql stable security definer set search_path = public as $$
  select a.id, m.id, m.numero, m.titulo, a.numero, a.titulo,
         ac.aluna_id is not null,
         ac.abre_em,
         ac.aluna_id is not null and (ac.abre_em is null or ac.abre_em <= now())
  from aulas a
  join modulos m on m.id = a.modulo_id
  left join acessos ac on ac.aula_id = a.id
                      and ac.aluna_id = p_aluna
                      and ac.escopo = 'aula'
  where eh_equipe()
  order by m.ordem, a.ordem, a.numero;
$$;

revoke execute on function comentarios_para_moderacao(uuid) from anon;
revoke execute on function ficha_da_aluna(uuid)             from anon;
revoke execute on function comentarios_da_autora(uuid)      from anon;
revoke execute on function cronograma_da_aluna(uuid)        from anon;
