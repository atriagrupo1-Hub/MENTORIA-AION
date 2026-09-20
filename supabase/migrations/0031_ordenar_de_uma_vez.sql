-- ---------------------------------------------------------------------
-- 0031 — Renumerar a lista inteira, numa transação só
-- ---------------------------------------------------------------------
-- Arrastar não é trocar dois: soltar um conteúdo no meio da lista muda
-- a posição de todos os que vêm depois. Renumerar de fora, pelo
-- navegador, seria um UPDATE por linha — e cada um é uma transação
-- própria, com um estado intermediário onde dois conteúdos do mesmo
-- módulo têm o mesmo `numero`.
--
-- `aulas_numero_unico (modulo_id, numero)` é DEFERRABLE INITIALLY
-- DEFERRED: dentro de UMA transação os passos intermediários passam, e
-- a conferência acontece no fim. Por isso a renumeração mora aqui, e
-- não no painel.
--
-- `modulos.ordem` não tem essa trava e é renumerado direto pelo painel.
-- E `numero` do módulo não entra: ele é o nome ("Módulo 3") e escolhe
-- a arte da capa. Mover muda a ORDEM, não a identidade.
-- ---------------------------------------------------------------------

create or replace function ordenar_aulas(p_modulo uuid, p_ids uuid[])
returns void language plpgsql volatile security definer set search_path = public as $$
declare
  i integer;
begin
  if not eh_admin() then raise exception 'sem_permissao'; end if;

  -- Só as aulas do módulo informado. Assim uma lista montada errada
  -- não consegue arrastar uma aula para dentro de outro módulo.
  if exists (
    select 1 from unnest(p_ids) as x(id)
    where not exists (select 1 from aulas a where a.id = x.id and a.modulo_id = p_modulo)
  ) then
    raise exception 'aula_de_outro_modulo';
  end if;

  for i in 1 .. coalesce(array_length(p_ids, 1), 0) loop
    update aulas set ordem = i - 1, numero = i where id = p_ids[i];
  end loop;
end;
$$;

revoke execute on function ordenar_aulas(uuid, uuid[]) from public, anon;
grant execute on function ordenar_aulas(uuid, uuid[]) to authenticated;
