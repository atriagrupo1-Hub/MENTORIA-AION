-- ---------------------------------------------------------------------
-- 0032 — Renumerar numa ida só
-- ---------------------------------------------------------------------
-- A renumeração era um `UPDATE` por linha, disparado do navegador: dez
-- idas ao banco para reordenar dez categorias, uma esperando a outra.
-- Com o arrasto isso virou o tempo entre soltar e ver — e o que se
-- sente não é o banco ser lento, é a viagem ser longa.
--
-- Um `UPDATE ... FROM unnest(ids) WITH ORDINALITY` faz a lista inteira
-- de uma vez.
--
-- O nome da tabela vem do navegador, então NÃO entra em SQL sem passar
-- por uma lista fechada. `format('%I')` escaparia o identificador, mas
-- escapar não impede reordenar uma tabela que não é para ser
-- reordenada — a lista é que impede.
-- ---------------------------------------------------------------------

create or replace function ordenar_lista(p_tabela text, p_ids uuid[])
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if not eh_admin() then raise exception 'sem_permissao'; end if;

  if p_tabela not in ('categorias', 'produtos', 'modulos', 'conteudos') then
    raise exception 'tabela_invalida';
  end if;

  execute format(
    'update %I t set ordem = x.i - 1 from unnest($1) with ordinality as x(id, i) where t.id = x.id',
    p_tabela
  ) using p_ids;
end;
$$;

revoke execute on function ordenar_lista(text, uuid[]) from public, anon;
grant execute on function ordenar_lista(text, uuid[]) to authenticated;
