-- =====================================================================
-- Ritmo de liberação — configuração geral, relógio individual
--
-- A mentoria não entrega as 50 aulas de uma vez: o conteúdo abre no
-- passo em que a aluna consegue percorrer. Mas cada uma entra numa data
-- diferente, então uma data fixa no calendário não serve — o relógio de
-- cada aluna começa no cadastro dela.
--
-- Daí o desenho: a REGRA é uma só, guardada aqui e valendo para todas;
-- a CONTAGEM é individual, a partir de `profiles.criada_em`. Você
-- configura uma vez, e quem entrar amanhã percorre o mesmo caminho,
-- deslocado no tempo.
--
-- Quatro ritmos:
--
--   imediato          tudo o que está liberado abre na hora. É o
--                     comportamento de hoje, e continua sendo o padrão.
--   por_dias          um módulo a cada N dias. O módulo 0 abre no
--                     cadastro, o 1 em N dias, o 2 em 2N, e assim por
--                     diante.
--   por_conclusao     o módulo seguinte abre quando ela conclui a
--                     última aula do módulo anterior. Quem corre, corre;
--                     quem para, para.
--   aulas_por_semana  X aulas por semana, na ordem do curso, sem
--                     respeitar fronteira de módulo.
--
-- O ritmo SOMA-SE à liberação manual, não a substitui. A aluna precisa
-- das duas coisas: ter o módulo liberado no painel E ter chegado a hora.
-- Isso foi escolhido de propósito — assim o ritmo nunca abre nada que
-- você não tenha vendido, e voltar para `imediato` devolve exatamente o
-- comportamento anterior, sem migração de dados nem surpresa.
--
-- Os presentes ficam de fora: o acervo é avulso, não tem sequência.
-- =====================================================================

create type ritmo_liberacao as enum
  ('imediato', 'por_dias', 'por_conclusao', 'aulas_por_semana');

-- Linha única: a chave é um booleano que só aceita `true`, então o
-- banco recusa uma segunda linha. Mais simples que um gatilho, e não
-- existe o caso "qual das duas configurações vale?".
create table configuracoes (
  id                boolean primary key default true check (id),
  ritmo             ritmo_liberacao not null default 'imediato',
  ritmo_dias        smallint not null default 15 check (ritmo_dias between 1 and 365),
  aulas_por_semana  smallint not null default 2  check (aulas_por_semana between 1 and 50),
  atualizada_em     timestamptz not null default now()
);

insert into configuracoes (id) values (true);

alter table configuracoes enable row level security;

-- A aluna lê: a regra não é segredo, e a tela precisa dela para dizer
-- quando a próxima etapa abre. Escrever, só a administradora.
create policy config_leitura on configuracoes
  for select using (true);

create policy config_admin on configuracoes
  for all using (eh_admin()) with check (eh_admin());

-- Privilégio de tabela, explícito.
--
-- A plataforma concede sozinha nas tabelas criadas junto com o schema,
-- mas esta nasce numa migração posterior. Sem esta linha a própria
-- administradora leva "permission denied" — e a RLS acima, que é quem
-- de fato decide, nunca chega a ser consultada. Escrever aqui não
-- afrouxa nada: `config_admin` continua barrando quem não é admin.
grant select, insert, update, delete on configuracoes to authenticated;

-- ---------------------------------------------------------------------
-- A regra, aplicada a um módulo
--
-- `security definer` porque precisa ler `configuracoes` e o progresso
-- da própria aluna sem depender de política de leitura em cada tabela.
-- ---------------------------------------------------------------------
create or replace function ritmo_libera_modulo(p_modulo uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  v_ritmo    ritmo_liberacao;
  v_dias     smallint;
  v_por_sem  smallint;
  v_inicio   timestamptz;
  v_ordem    int;
  v_anterior uuid;
begin
  select ritmo, ritmo_dias, aulas_por_semana
    into v_ritmo, v_dias, v_por_sem
    from configuracoes limit 1;

  if v_ritmo is null or v_ritmo = 'imediato' then
    return true;
  end if;

  select criada_em into v_inicio from profiles where id = auth.uid();
  if v_inicio is null then
    return false;                                  -- sem conta, sem nada
  end if;

  select ordem into v_ordem from modulos where id = p_modulo;
  if v_ordem is null then
    return false;
  end if;

  -- O primeiro módulo abre sempre: é a porta de entrada.
  if v_ordem = 0 then
    return true;
  end if;

  if v_ritmo = 'por_dias' then
    return now() >= v_inicio + make_interval(days => v_ordem * v_dias);
  end if;

  if v_ritmo = 'por_conclusao' then
    -- A última aula do módulo anterior, na ordem do curso.
    select a.id into v_anterior
      from aulas a
      join modulos m on m.id = a.modulo_id
     where m.ordem = v_ordem - 1 and a.publicado
     order by a.ordem desc, a.numero desc
     limit 1;

    if v_anterior is null then
      return true;                                 -- módulo anterior vazio
    end if;

    return exists (
      select 1 from progresso p
      where p.aluna_id = auth.uid()
        and p.aula_id = v_anterior
        and p.concluida_em is not null
    );
  end if;

  if v_ritmo = 'aulas_por_semana' then
    -- O módulo abre junto com a primeira aula dele.
    return exists (
      select 1 from aulas a
      where a.modulo_id = p_modulo and a.publicado
        and ritmo_libera_aula(a.id)
      limit 1
    );
  end if;

  return true;
end;
$$;

-- ---------------------------------------------------------------------
-- A regra, aplicada a uma aula
-- ---------------------------------------------------------------------
create or replace function ritmo_libera_aula(p_aula uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  v_ritmo   ritmo_liberacao;
  v_por_sem smallint;
  v_inicio  timestamptz;
  v_modulo  uuid;
  v_mord    int;
  v_aord    int;
  v_pos     int;
begin
  select ritmo, aulas_por_semana into v_ritmo, v_por_sem from configuracoes limit 1;

  if v_ritmo is null or v_ritmo = 'imediato' then
    return true;
  end if;

  select a.modulo_id, m.ordem, a.ordem
    into v_modulo, v_mord, v_aord
    from aulas a join modulos m on m.id = a.modulo_id
   where a.id = p_aula;

  if v_modulo is null then
    return false;
  end if;

  -- Nos ritmos por módulo, a aula segue o módulo dela.
  if v_ritmo in ('por_dias', 'por_conclusao') then
    return ritmo_libera_modulo(v_modulo);
  end if;

  -- aulas_por_semana: posição da aula na sequência do curso inteiro.
  select criada_em into v_inicio from profiles where id = auth.uid();
  if v_inicio is null then
    return false;
  end if;

  select count(*) into v_pos
    from aulas a2 join modulos m2 on m2.id = a2.modulo_id
   where a2.publicado
     and (m2.ordem, a2.ordem, a2.numero) <
         (v_mord, v_aord, (select numero from aulas where id = p_aula));

  return now() >= v_inicio + make_interval(days => (v_pos / v_por_sem) * 7);
end;
$$;

-- ---------------------------------------------------------------------
-- Quando a próxima etapa abre — só para a tela poder avisar
--
-- Devolve nulo quando não há data a prometer: ritmo imediato, aula já
-- aberta, ou ritmo por conclusão (que não depende de relógio).
-- ---------------------------------------------------------------------
create or replace function ritmo_abre_em(p_aula uuid)
returns timestamptz language plpgsql stable security definer set search_path = public as $$
declare
  v_ritmo   ritmo_liberacao;
  v_dias    smallint;
  v_por_sem smallint;
  v_inicio  timestamptz;
  v_mord    int;
  v_aord    int;
  v_pos     int;
begin
  select ritmo, ritmo_dias, aulas_por_semana
    into v_ritmo, v_dias, v_por_sem from configuracoes limit 1;

  if v_ritmo is null or v_ritmo in ('imediato', 'por_conclusao') then
    return null;
  end if;
  if ritmo_libera_aula(p_aula) then
    return null;
  end if;

  select criada_em into v_inicio from profiles where id = auth.uid();
  select m.ordem, a.ordem into v_mord, v_aord
    from aulas a join modulos m on m.id = a.modulo_id where a.id = p_aula;
  if v_inicio is null or v_mord is null then
    return null;
  end if;

  if v_ritmo = 'por_dias' then
    return v_inicio + make_interval(days => v_mord * v_dias);
  end if;

  select count(*) into v_pos
    from aulas a2 join modulos m2 on m2.id = a2.modulo_id
   where a2.publicado
     and (m2.ordem, a2.ordem, a2.numero) <
         (v_mord, v_aord, (select numero from aulas where id = p_aula));

  return v_inicio + make_interval(days => (v_pos / v_por_sem) * 7);
end;
$$;

-- ---------------------------------------------------------------------
-- As portas existentes passam a conferir o ritmo
--
-- Uma linha em cada. O resto da regra fica intocado: publicação,
-- bloqueio geral, conta ativa e liberação continuam valendo como antes,
-- e o ritmo só pode fechar — nunca abrir o que não foi liberado.
-- ---------------------------------------------------------------------
create or replace function pode_ver_aula(p_aula uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from aulas a
    join modulos m on m.id = a.modulo_id
    where a.id = p_aula
      and a.publicado and m.publicado
      and not a.bloqueado_geral and not m.bloqueado_geral
      and conta_ativa()
      and exists (
        select 1 from acessos ac
        where ac.aluna_id = auth.uid()
          and (ac.escopo = 'curso'
            or (ac.escopo = 'modulo' and ac.modulo_id = a.modulo_id)
            or (ac.escopo = 'aula'   and ac.aula_id   = a.id))
      )
      and ritmo_libera_aula(a.id)
  );
$$;

create or replace function pode_ver_ao_vivo(p_ao_vivo uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from aulas_ao_vivo v
    join modulos m on m.id = v.modulo_id
    where v.id = p_ao_vivo
      and v.liberada
      and m.publicado and not m.bloqueado_geral
      and conta_ativa()
      and exists (
        select 1 from acessos ac
        where ac.aluna_id = auth.uid()
          and (ac.escopo = 'curso'
            or (ac.escopo = 'modulo' and ac.modulo_id = m.id))
      )
      and ritmo_libera_modulo(m.id)
  );
$$;

create or replace function minhas_aulas()
returns table (
  aula_id uuid, modulo_id uuid, modulo_numero smallint, aula_numero smallint,
  titulo text, duracao_segundos integer, capa_path text,
  posicao_segundos integer, concluida boolean, atualizada_em timestamptz
) language sql stable security definer set search_path = public as $$
  select a.id, m.id, m.numero, a.numero, a.titulo, a.duracao_segundos, a.capa_path,
         coalesce(p.posicao_segundos, 0),
         p.concluida_em is not null,
         p.atualizada_em
  from aulas a
  join modulos m on m.id = a.modulo_id
  left join progresso p on p.aula_id = a.id and p.aluna_id = auth.uid()
  where a.publicado and m.publicado
    and not a.bloqueado_geral and not m.bloqueado_geral
    and conta_ativa()
    and exists (
      select 1 from acessos ac
      where ac.aluna_id = auth.uid()
        and (ac.escopo = 'curso'
          or (ac.escopo = 'modulo' and ac.modulo_id = a.modulo_id)
          or (ac.escopo = 'aula'   and ac.aula_id   = a.id))
    )
    and ritmo_libera_aula(a.id)
  order by m.ordem, a.ordem, a.numero;
$$;

revoke all on function ritmo_libera_aula(uuid)   from public;
revoke all on function ritmo_libera_modulo(uuid) from public;
revoke all on function ritmo_abre_em(uuid)       from public;
grant execute on function ritmo_libera_aula(uuid)   to authenticated;
grant execute on function ritmo_libera_modulo(uuid) to authenticated;
grant execute on function ritmo_abre_em(uuid)       to authenticated;
