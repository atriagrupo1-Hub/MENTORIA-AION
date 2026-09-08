-- =====================================================================
-- Reordenação de aulas
--
-- Trocar duas aulas de lugar significa trocar `numero` e `ordem` entre
-- elas. As constraints de `numero` são adiáveis (`deferrable initially
-- deferred`) justamente para isso: dentro de uma transação os dois
-- UPDATEs acontecem e a checagem só corre no commit.
--
-- O painel roda no navegador, e o PostgREST não abre transação entre
-- duas chamadas. Por isso a troca vira uma função: uma chamada, uma
-- transação.
-- =====================================================================

create or replace function trocar_ordem_aulas(p_aula_a uuid, p_aula_b uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
declare
  a aulas%rowtype;
  b aulas%rowtype;
begin
  if not eh_admin() then return; end if;

  select * into a from aulas where id = p_aula_a;
  select * into b from aulas where id = p_aula_b;

  if a.id is null or b.id is null then return; end if;
  if a.modulo_id <> b.modulo_id then return; end if;

  update aulas set numero = b.numero, ordem = b.ordem where id = a.id;
  update aulas set numero = a.numero, ordem = a.ordem where id = b.id;
end;
$$;

revoke execute on function trocar_ordem_aulas(uuid, uuid) from public, anon;
grant execute on function trocar_ordem_aulas(uuid, uuid) to authenticated;

-- Mesma coisa para presentes, que também são reordenáveis no painel.
-- Aqui só `ordem` muda, e ela não tem constraint única — mas manter a
-- troca numa função única evita estado intermediário visível.
create or replace function trocar_ordem_presentes(p_presente_a uuid, p_presente_b uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
declare
  a presentes%rowtype;
  b presentes%rowtype;
begin
  if not eh_admin() then return; end if;

  select * into a from presentes where id = p_presente_a;
  select * into b from presentes where id = p_presente_b;

  if a.id is null or b.id is null then return; end if;
  if a.categoria_id <> b.categoria_id then return; end if;

  update presentes set ordem = b.ordem where id = a.id;
  update presentes set ordem = a.ordem where id = b.id;
end;
$$;

revoke execute on function trocar_ordem_presentes(uuid, uuid) from public, anon;
grant execute on function trocar_ordem_presentes(uuid, uuid) to authenticated;
