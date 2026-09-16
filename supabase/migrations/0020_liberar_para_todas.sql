-- =====================================================================
-- Liberar uma aula, ou um presente, para a turma inteira
--
-- Criar uma aula não a dá a ninguém. Isso é de propósito — liberação é
-- por aluna, e é o que permite cronograma diferente para cada uma —
-- mas cobrava caro no caso mais comum: a aula nova que TODAS devem ter.
-- Eram trinta idas à ficha de cada aluna, uma por uma.
--
-- ---------------------------------------------------------------------
-- A regra que não pode ser quebrada: não sobrescrever
--
-- `gerar_cronograma` apaga tudo e reescreve — é o martelo, e serve para
-- montar do zero. Aqui é o oposto: quem já tem a aula fica exatamente
-- como está, com a data que já tinha.
--
-- É o `on conflict do nothing` que garante isso, e não a intenção de
-- quem clica. Sem ele, liberar uma aula para a turma jogaria todas as
-- datas ajustadas à mão para a mesma data, de uma vez, sem aviso — e
-- não haveria como desfazer.
--
-- As duas funções devolvem o que fizeram: quantas receberam agora e
-- quantas já tinham. A tela mostra os dois números, porque "liberado
-- para 28, outras 2 já tinham" é uma frase que dá para conferir.
-- =====================================================================

create or replace function liberar_aula_para_todas(
  p_aula uuid,
  p_abre_em timestamptz default null
) returns table (liberadas integer, ja_tinham integer)
language plpgsql security definer set search_path = public as $$
declare
  v_novas integer;
  v_total integer;
begin
  if not eh_admin() then
    raise exception 'sem_permissao';
  end if;
  if not exists (select 1 from aulas where id = p_aula) then
    raise exception 'aula_inexistente';
  end if;

  -- Todas as alunas, inclusive as bloqueadas. Bloqueio é uma porta
  -- fechada, não um buraco no cronograma: no dia em que a conta voltar,
  -- ela tem o curso inteiro, e não um pedaço do que a turma recebeu
  -- enquanto esteve fora.
  select count(*) into v_total from profiles where papel = 'aluna';

  insert into acessos (aluna_id, escopo, aula_id, abre_em, concedido_por)
  select p.id, 'aula', p_aula, p_abre_em, auth.uid()
  from profiles p
  where p.papel = 'aluna'
  on conflict (aluna_id, aula_id) where escopo = 'aula'
  do nothing;

  get diagnostics v_novas = row_count;
  return query select v_novas, v_total - v_novas;
end;
$$;

comment on function liberar_aula_para_todas(uuid, timestamptz) is
  'Dá esta aula a todas as alunas que ainda não a têm. Quem já tem fica com a data que já tinha — nunca sobrescreve. Devolve quantas receberam e quantas já tinham.';

revoke execute on function liberar_aula_para_todas(uuid, timestamptz) from public, anon;
grant execute on function liberar_aula_para_todas(uuid, timestamptz) to authenticated;

-- ---------------------------------------------------------------------
-- O presente
--
-- Aqui "já tem" é mais largo que uma linha igual. A aluna alcança um
-- presente por três caminhos: o acervo inteiro, a categoria dele, ou
-- ele mesmo. Quem já o alcança por um dos dois primeiros não precisa da
-- terceira linha — e criá-la encheria a tabela de permissões que não
-- mudam nada, tornando mais difícil entender, depois, por que uma aluna
-- vê o que vê.
-- ---------------------------------------------------------------------

create or replace function liberar_presente_para_todas(p_presente uuid)
returns table (liberados integer, ja_tinham integer)
language plpgsql security definer set search_path = public as $$
declare
  v_novas integer;
  v_total integer;
  v_categoria uuid;
begin
  if not eh_admin() then
    raise exception 'sem_permissao';
  end if;

  select categoria_id into v_categoria from presentes where id = p_presente;
  if v_categoria is null then
    raise exception 'presente_inexistente';
  end if;

  select count(*) into v_total from profiles where papel = 'aluna';

  insert into acessos (aluna_id, escopo, presente_id, concedido_por)
  select p.id, 'presente', p_presente, auth.uid()
  from profiles p
  where p.papel = 'aluna'
    and not exists (
      select 1 from acessos ac
      where ac.aluna_id = p.id
        and (ac.escopo = 'acervo'
          or (ac.escopo = 'categoria' and ac.categoria_id = v_categoria)
          or (ac.escopo = 'presente'  and ac.presente_id  = p_presente))
    )
  on conflict (aluna_id, presente_id) where escopo = 'presente'
  do nothing;

  get diagnostics v_novas = row_count;
  return query select v_novas, v_total - v_novas;
end;
$$;

comment on function liberar_presente_para_todas(uuid) is
  'Dá este presente a todas as alunas que ainda não o alcançam — por acervo, por categoria ou por ele mesmo. Nunca duplica acesso que já existe.';

revoke execute on function liberar_presente_para_todas(uuid) from public, anon;
grant execute on function liberar_presente_para_todas(uuid) to authenticated;
