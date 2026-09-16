-- =====================================================================
-- Renovação: a marca que fica, e a contagem que não zera
--
-- Renovar não é começar de novo. A aluna que entrou em março e renovou
-- em setembro é aluna desde março — e é isso que conta quando alguém
-- pergunta há quanto tempo ela está na mentoria.
--
-- Por isso `criada_em` NUNCA é tocada aqui. A renovação ganha uma data
-- própria, e as duas convivem na ficha:
--
--   Entrou em      10 de março
--   Última renovação  16 de setembro  ·  2ª renovação
--
-- Um sistema que zerasse a entrada perderia para sempre a informação
-- mais simples que existe sobre uma aluna: desde quando ela é aluna.
--
-- ---------------------------------------------------------------------
-- Por que uma função, e não "estender + marcar"
--
-- `estender_acesso` já sabe somar prazo. Renovar é estender E carimbar,
-- e as duas coisas têm de acontecer juntas: estendendo sem carimbar, a
-- aluna ganha prazo e não aparece na coluna Renovadas; carimbando sem
-- estender, ela aparece como renovada sem ter ganhado um dia sequer.
--
-- Numa função só, ou acontecem as duas ou não acontece nenhuma.
--
-- `estender_acesso` continua existindo, e agora quer dizer outra coisa:
-- um ajuste de prazo que não é uma renovação — corrigir um erro de
-- digitação, compensar uma semana que o sistema ficou fora do ar.
-- ---------------------------------------------------------------------

alter table profiles add column if not exists renovada_em timestamptz;
alter table profiles add column if not exists renovacoes integer not null default 0;

comment on column profiles.renovada_em is
  'Quando o acesso foi renovado pela última vez. Nulo = nunca renovou. Não tem relação com `criada_em`, que é quando ela entrou e não muda nunca.';
comment on column profiles.renovacoes is
  'Quantas vezes já renovou. Só cresce.';

-- Colunas novas nascem sem privilégio nenhum nesta base. Leitura basta:
-- quem escreve é a função abaixo, que roda como dona.
grant select (renovada_em), select (renovacoes) on profiles to authenticated;

create or replace function renovar_acesso(
  p_aluna uuid,
  p_dias integer default 0,
  p_meses integer default 0,
  p_anos integer default 0
) returns timestamptz language plpgsql security definer set search_path = public as $$
declare
  v_nova timestamptz;
begin
  if not eh_admin() then
    raise exception 'sem_permissao';
  end if;
  if p_dias < 0 or p_meses < 0 or p_anos < 0 then
    raise exception 'prazo_negativo';
  end if;
  if p_dias = 0 and p_meses = 0 and p_anos = 0 then
    raise exception 'prazo_vazio';
  end if;

  update profiles
     set acesso_ate = greatest(coalesce(acesso_ate, now()), now())
                    + make_interval(years => p_anos, months => p_meses, days => p_dias),
         renovada_em = now(),
         renovacoes = renovacoes + 1
   where id = p_aluna and papel = 'aluna'
   returning acesso_ate into v_nova;

  if not found then
    raise exception 'aluna_inexistente';
  end if;
  return v_nova;
end;
$$;

comment on function renovar_acesso(uuid, integer, integer, integer) is
  'Renova o acesso: soma o prazo a partir de hoje (ou do fim do prazo atual, o que for maior) e carimba a renovação. `criada_em` não é tocada — renovar não é entrar de novo.';

revoke execute on function renovar_acesso(uuid, integer, integer, integer) from public, anon;
grant execute on function renovar_acesso(uuid, integer, integer, integer) to authenticated;
