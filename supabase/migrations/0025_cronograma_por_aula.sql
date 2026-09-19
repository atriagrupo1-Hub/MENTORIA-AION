-- Cronograma escolhido aula a aula.
--
-- `gerar_cronograma` recebe MÓDULOS e libera todas as aulas publicadas
-- de cada um. Serve para "dê o módulo 3 inteiro a ela", que é o caso
-- comum — e não serve para nada além disso.
--
-- No cadastro a escolha passou a ser por aula: abre-se o módulo e
-- marca-se o que ela recebe. Uma aluna que compra só três aulas de um
-- módulo de dez não tinha como ser cadastrada; liberava-se o módulo
-- inteiro e tirava-se aula por aula depois, na ficha.
--
-- Esta função recebe as aulas já escolhidas. A ordem e o espaçamento
-- seguem a mesma regra da outra: ordem do módulo, depois ordem da aula
-- — nunca a ordem em que a pessoa clicou, que é acidental.
--
-- `gerar_cronograma` continua existindo e não muda: a ficha da aluna
-- escolhe por módulo, e trocar as duas telas de uma vez seria mexer no
-- que não foi pedido.
create or replace function public.gerar_cronograma_de_aulas(
  p_aluna uuid,
  p_aulas uuid[],
  p_intervalo integer default 5,
  p_inicio timestamp with time zone default now()
)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_total integer;
begin
  if not eh_admin() then
    raise exception 'sem_permissao';
  end if;
  if p_intervalo < 0 or p_intervalo > 365 then
    raise exception 'intervalo_invalido';
  end if;
  if not exists (select 1 from profiles where id = p_aluna) then
    raise exception 'aluna_inexistente';
  end if;

  delete from acessos where aluna_id = p_aluna and escopo = 'aula';

  insert into acessos (aluna_id, escopo, aula_id, abre_em, concedido_por)
  select p_aluna, 'aula', ordenadas.id,
         case when p_intervalo = 0 then null
              else p_inicio + make_interval(days => (ordenadas.posicao * p_intervalo)::int)
         end,
         auth.uid()
  from (
    select a.id,
           (row_number() over (order by m.ordem, a.ordem, a.numero) - 1) as posicao
    from aulas a
    join modulos m on m.id = a.modulo_id
    where a.id = any(p_aulas) and a.publicado
  ) as ordenadas;

  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

revoke execute on function public.gerar_cronograma_de_aulas(uuid, uuid[], integer, timestamp with time zone) from anon;
