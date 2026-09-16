-- =====================================================================
-- A ficha da aluna: celular, números e comentários num lugar só
--
-- Hoje o painel mostra nome, acesso, código e quantas aulas foram
-- liberadas. Para saber se alguém está de fato assistindo, era preciso
-- abrir o Supabase e escrever SQL — ou seja, na prática ninguém sabia.
--
-- Quem administra isto não é necessariamente quem construiu. Uma
-- colaboradora precisa abrir a aluna e ver, sem perguntar a ninguém:
-- está andando? parou onde? entrou quando? falou alguma coisa?
--
-- ---------------------------------------------------------------------
-- 1. O celular
--
-- Guardado só em dígitos, sem parênteses nem traço. Formatar é trabalho
-- da tela, e guardar formatado significa que "(11) 98765-4321" e
-- "11987654321" viram dois números diferentes na hora de procurar.
--
-- A coluna nasce SEM PERMISSÃO NENHUMA — é assim toda coluna nova nesta
-- base, e é justamente o que já me custou duas migrações antes. Ela
-- precisa de SELECT e UPDATE concedidos explicitamente, e a RLS de
-- `profiles` é quem limita as linhas: a aluna alcança a própria, a
-- administradora alcança todas.
-- ---------------------------------------------------------------------

alter table profiles add column if not exists celular text;

comment on column profiles.celular is
  'Celular da aluna, só dígitos, com DDD — e com o código do país quando for de fora. Nulo quer dizer que ninguém preencheu. Formatar e montar o link do WhatsApp é trabalho da tela.';

grant select (celular), update (celular) on profiles to authenticated;

-- ---------------------------------------------------------------------
-- 2. A ficha
--
-- Uma viagem ao banco por aluna aberta, e não cinco. Roda como dona
-- porque cruza `progresso`, `acessos` e `comentarios` — tabelas que o
-- navegador não alcança, e não deve alcançar.
--
-- `eh_admin()` na primeira linha, e não na última: sem ela, esta função
-- entregaria o progresso de qualquer aluna a qualquer aluna.
--
-- Sobre o que NÃO está aqui: tempo assistido. O banco guarda o ponto
-- mais distante de cada aula, não quanto tempo foi visto. Somar as
-- posições daria um número que parece tempo e não é — rever não soma,
-- pular para o fim conta a aula inteira. Preferi não mostrar a mostrar
-- errado.
-- ---------------------------------------------------------------------

create or replace function ficha_da_aluna(p_aluna uuid)
returns table (
  aulas_atribuidas integer,
  aulas_abertas integer,
  aulas_concluidas integer,
  comentarios integer,
  curtidas integer,
  ultima_atividade_em timestamptz,
  ultima_modulo smallint,
  ultima_aula smallint,
  ultima_titulo text
) language sql stable security definer set search_path = public as $$
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
  -- A linha fixa à esquerda e a última aula à direita, nesta ordem: a
  -- ficha tem de voltar preenchida mesmo para quem nunca abriu uma
  -- aula. Ao contrário, aluna sem progresso devolveria zero linhas e a
  -- tela mostraria "carregando" para sempre.
  from (select 1) sempre
  left join lateral (
    -- A última aula em que ela mexeu, assistindo ou concluindo. É a
    -- pergunta que a colaboradora faz primeiro: parou onde?
    select pr.atualizada_em, m.numero as modulo, a.numero as aula, a.titulo
    from progresso pr
    join aulas a   on a.id = pr.aula_id
    join modulos m on m.id = a.modulo_id
    where pr.aluna_id = p_aluna
    order by pr.atualizada_em desc
    limit 1
  ) u on true
  where eh_admin();
$$;

comment on function ficha_da_aluna(uuid) is
  'Os números de uma aluna para o painel: liberadas, abertas, concluídas, comentários, curtidas e onde ela parou. Só para admin, conferido aqui dentro.';

revoke execute on function ficha_da_aluna(uuid) from public, anon;
grant execute on function ficha_da_aluna(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 3. O que ela escreveu
--
-- `comentarios_para_moderacao` já devolve tudo de todas, e filtrar no
-- navegador funcionaria — hoje. Com trezentas alunas e mil comentários,
-- seria puxar mil linhas para mostrar sete. O filtro mora no banco.
-- ---------------------------------------------------------------------

create or replace function comentarios_da_autora(p_aluna uuid)
returns table (
  id uuid, modulo_numero smallint, aula_numero smallint,
  texto text, status status_comentario, criado_em timestamptz,
  resposta_a uuid
) language sql stable security definer set search_path = public as $$
  select c.id, m.numero, a.numero, c.texto, c.status, c.criado_em, c.resposta_a
  from comentarios c
  join aulas a   on a.id = c.aula_id
  join modulos m on m.id = a.modulo_id
  where c.autora_id = p_aluna and eh_admin()
  order by c.criado_em desc;
$$;

revoke execute on function comentarios_da_autora(uuid) from public, anon;
grant execute on function comentarios_da_autora(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 4. Editar nome, acesso e celular
--
-- O nome importa mais do que parece: é ele que as outras alunas veem
-- nos comentários. Cadastrado errado, ficava errado para sempre — não
-- havia por onde corrigir sem abrir o Supabase.
--
-- O nome de acesso é o que ela digita para entrar. Trocar exige checar
-- que não colide com outro, e é por isso que isto é uma função e não um
-- `update` solto: a conferência e a escrita têm de ser a mesma coisa.
-- ---------------------------------------------------------------------

create or replace function editar_aluna(
  p_aluna uuid,
  p_nome text,
  p_login text,
  p_celular text
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_nome text := btrim(p_nome);
  v_login text := lower(btrim(p_login));
  v_celular text := nullif(regexp_replace(coalesce(p_celular, ''), '\D', '', 'g'), '');
begin
  if not eh_admin() then
    raise exception 'sem_permissao';
  end if;
  if v_nome = '' then
    raise exception 'nome_vazio';
  end if;
  if v_login = '' then
    raise exception 'login_vazio';
  end if;
  if exists (select 1 from profiles p where p.login = v_login and p.id <> p_aluna) then
    raise exception 'login_em_uso';
  end if;

  update profiles
     set nome = v_nome, login = v_login, celular = v_celular
   where id = p_aluna and papel = 'aluna';

  if not found then
    raise exception 'aluna_nao_encontrada';
  end if;
end;
$$;

revoke execute on function editar_aluna(uuid, text, text, text) from public, anon;
grant execute on function editar_aluna(uuid, text, text, text) to authenticated;
