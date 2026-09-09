-- =====================================================================
-- Cronograma por aluna — uma data de abertura para cada aula
--
-- Substitui o ritmo geral da 0009. A regra passa a ser uma só, e cabe
-- numa frase: CADA AULA TEM UMA DATA EM QUE ABRE PARA AQUELA ALUNA.
--
-- Por que assim. Cada aluna entra num dia diferente e não pode receber
-- as 50 aulas de uma vez. A tentação é criar tipos de gatilho — por
-- dias, por conclusão, por data, por módulo — e combiná-los. Isso são
-- centenas de estados possíveis, impossíveis de conferir olhando.
--
-- Uma data resolve todos:
--
--   liberar agora              data = agora
--   uma aula a cada 5 dias     50 datas calculadas do cadastro dela
--   escolher aula por aula     você escreve a data daquela aula
--   turma da mesma data        as mesmas datas em várias alunas
--   ocultar módulo             a aula não está na lista dela
--
-- O banco não sabe o que é ritmo nem turma. Ele compara uma data com
-- agora. A inteligência mora nos botões do painel, que PREENCHEM as
-- datas — e data preenchida é data que você vê na tela e corrige à mão.
-- Não há regra escondida: o cronograma da aluna é literalmente o que
-- está gravado.
--
-- O módulo deixa de ser liberado. Ele é o retrato das aulas dela:
--
--   nenhuma aula atribuída        o módulo fica oculto
--   aulas atribuídas, nenhuma aberta   "libera em breve"
--   ao menos uma aula aberta      o módulo aparece
--
-- Isso cai sozinho da regra da data — não precisa ser programado.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. A coluna que muda tudo
-- ---------------------------------------------------------------------
alter table acessos
  add column if not exists abre_em timestamptz;

comment on column acessos.abre_em is
  'Instante em que esta aula abre para esta aluna. Nulo = já aberta.';

-- Uma aula aparece no máximo uma vez por aluna. Sem isto, duas linhas
-- com datas diferentes deixariam a resposta dependendo da ordem de
-- leitura.
create unique index if not exists acessos_aula_unica
  on acessos (aluna_id, aula_id) where escopo = 'aula';

create index if not exists acessos_abertura_idx
  on acessos (aluna_id, abre_em) where escopo = 'aula';

-- ---------------------------------------------------------------------
-- 2. O ritmo geral da 0009 sai de cena
--
-- Ele foi feito para o requisito anterior. Manter os dois seria duas
-- regras de liberação no mesmo produto, e a pergunta "qual delas venceu"
-- sem resposta óbvia. Fica só o intervalo padrão, que o painel usa para
-- preencher o formulário.
-- ---------------------------------------------------------------------
drop function if exists ritmo_abre_em(uuid);
drop function if exists ritmo_libera_aula(uuid);
drop function if exists ritmo_libera_modulo(uuid);

alter table configuracoes drop column if exists ritmo;
alter table configuracoes drop column if exists aulas_por_semana;
drop type if exists ritmo_liberacao;

alter table configuracoes rename column ritmo_dias to intervalo_dias;
alter table configuracoes alter column intervalo_dias set default 5;
alter table configuracoes drop constraint if exists configuracoes_ritmo_dias_check;
alter table configuracoes add constraint intervalo_minimo
  check (intervalo_dias between 1 and 365);
update configuracoes set intervalo_dias = 5;

comment on column configuracoes.intervalo_dias is
  'Intervalo padrão entre aulas, em dias, sugerido ao gerar um cronograma. Não decide acesso.';

-- ---------------------------------------------------------------------
-- 3. As portas passam a olhar a data
--
-- Para AULAS, só o escopo 'aula' vale a partir daqui: é ele que carrega
-- a data. Escopos 'curso' e 'modulo' continuam existindo para o acervo
-- de presentes, mas não abrem aula nenhuma — senão seriam um caminho de
-- volta que ignora o cronograma.
-- ---------------------------------------------------------------------
create or replace function pode_ver_aula(p_aula uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from aulas a
    join modulos m on m.id = a.modulo_id
    join acessos ac on ac.aula_id = a.id
                   and ac.aluna_id = auth.uid()
                   and ac.escopo = 'aula'
    where a.id = p_aula
      and a.publicado and m.publicado
      and not a.bloqueado_geral and not m.bloqueado_geral
      and conta_ativa()
      and (ac.abre_em is null or ac.abre_em <= now())
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
  join acessos ac on ac.aula_id = a.id
                 and ac.aluna_id = auth.uid()
                 and ac.escopo = 'aula'
  left join progresso p on p.aula_id = a.id and p.aluna_id = auth.uid()
  where a.publicado and m.publicado
    and not a.bloqueado_geral and not m.bloqueado_geral
    and conta_ativa()
    and (ac.abre_em is null or ac.abre_em <= now())
  order by m.ordem, a.ordem, a.numero;
$$;

-- A aula ao vivo pertence ao módulo, e o módulo é o retrato das aulas:
-- ela abre quando o módulo abriu, isto é, quando ao menos uma aula dele
-- já está aberta para a aluna.
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
        select 1
        from aulas a
        join acessos ac on ac.aula_id = a.id
                       and ac.aluna_id = auth.uid()
                       and ac.escopo = 'aula'
        where a.modulo_id = m.id
          and a.publicado and not a.bloqueado_geral
          and (ac.abre_em is null or ac.abre_em <= now())
      )
  );
$$;

-- ---------------------------------------------------------------------
-- 4. O que a tela da aluna precisa saber sobre os módulos
--
-- Devolve só os módulos que ela tem. Módulo ausente da lista é módulo
-- oculto — a tela não desenha. Com aulas atribuídas e nenhuma aberta,
-- vem `abertas = 0` e a data da primeira, que é o "libera em breve".
-- ---------------------------------------------------------------------
create or replace function meus_modulos()
returns table (
  modulo_id uuid, modulo_numero smallint,
  atribuidas integer, abertas integer, proxima_abertura timestamptz
) language sql stable security definer set search_path = public as $$
  select m.id, m.numero,
         count(*)::integer,
         count(*) filter (where ac.abre_em is null or ac.abre_em <= now())::integer,
         min(ac.abre_em) filter (where ac.abre_em > now())
  from modulos m
  join aulas a on a.modulo_id = m.id
  join acessos ac on ac.aula_id = a.id
                 and ac.aluna_id = auth.uid()
                 and ac.escopo = 'aula'
  where m.publicado and a.publicado
    and not m.bloqueado_geral and not a.bloqueado_geral
    and conta_ativa()
  group by m.id, m.numero, m.ordem
  order by m.ordem;
$$;

-- ---------------------------------------------------------------------
-- 5. Preencher o cronograma — o trabalho da administradora
--
-- Estas funções não decidem acesso: elas escrevem datas. Quem decide
-- continua sendo a comparação lá em cima. Ficam no banco, e não no
-- navegador, porque gerar 50 linhas em sequência precisa ser uma
-- operação só: pela metade, a aluna ficaria com meio curso.
-- ---------------------------------------------------------------------

/**
 * Gera o cronograma de uma aluna.
 *
 * Apaga o que ela tinha e escreve de novo: uma linha por aula dos
 * módulos escolhidos, na ordem do curso, uma a cada `p_intervalo` dias
 * a partir de `p_inicio`. A primeira abre no próprio `p_inicio`.
 *
 * Módulo fora de `p_modulos` não recebe linha nenhuma — é assim que ele
 * fica oculto para ela.
 */
create or replace function gerar_cronograma(
  p_aluna     uuid,
  p_modulos   uuid[],
  p_intervalo int default 5,
  p_inicio    timestamptz default now()
) returns integer
language plpgsql volatile security definer set search_path = public as $$
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
    where m.id = any(p_modulos) and a.publicado
  ) as ordenadas;

  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

/**
 * O mesmo cronograma em várias alunas de uma vez — a "turma".
 *
 * Turma não existe como tabela: é este laço. Cada aluna continua com o
 * cronograma dela, gravado nela, e pode ser corrigida sozinha depois
 * sem afetar as outras.
 */
create or replace function gerar_cronograma_lote(
  p_alunas    uuid[],
  p_modulos   uuid[],
  p_intervalo int default 5,
  p_inicio    timestamptz default now()
) returns integer
language plpgsql volatile security definer set search_path = public as $$
declare
  v_aluna uuid;
  v_total integer := 0;
begin
  if not eh_admin() then
    raise exception 'sem_permissao';
  end if;
  foreach v_aluna in array p_alunas loop
    v_total := v_total + gerar_cronograma(v_aluna, p_modulos, p_intervalo, p_inicio);
  end loop;
  return v_total;
end;
$$;

/** Ajusta uma aula: data nova, ou nulo para abrir agora. */
create or replace function definir_abertura(
  p_aluna uuid, p_aula uuid, p_abre_em timestamptz
) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if not eh_admin() then
    raise exception 'sem_permissao';
  end if;

  insert into acessos (aluna_id, escopo, aula_id, abre_em, concedido_por)
  values (p_aluna, 'aula', p_aula, p_abre_em, auth.uid())
  on conflict (aluna_id, aula_id) where escopo = 'aula'
  do update set abre_em = excluded.abre_em;
end;
$$;

/** Tira a aula da aluna. Some da tela dela. */
create or replace function remover_aula_da_aluna(p_aluna uuid, p_aula uuid)
returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if not eh_admin() then
    raise exception 'sem_permissao';
  end if;
  delete from acessos
   where aluna_id = p_aluna and aula_id = p_aula and escopo = 'aula';
end;
$$;

/**
 * O cronograma inteiro de uma aluna, para a administradora conferir.
 *
 * Devolve TODAS as aulas do curso, tenha ela ou não — assim a tela
 * mostra numa lista só o que ela recebe, quando, e o que está fora.
 */
create or replace function cronograma_da_aluna(p_aluna uuid)
returns table (
  aula_id uuid, modulo_id uuid, modulo_numero smallint, modulo_titulo text,
  aula_numero smallint, aula_titulo text,
  atribuida boolean, abre_em timestamptz, aberta boolean
) language sql stable security definer set search_path = public as $$
  select a.id, m.id, m.numero, m.titulo, a.numero, a.titulo,
         ac.aluna_id is not null,
         ac.abre_em,
         ac.aluna_id is not null and (ac.abre_em is null or ac.abre_em <= now())
  from aulas a
  join modulos m on m.id = a.modulo_id
  left join acessos ac on ac.aula_id = a.id
                      and ac.aluna_id = p_aluna
                      and ac.escopo = 'aula'
  where eh_admin()
  order by m.ordem, a.ordem, a.numero;
$$;

revoke all on function gerar_cronograma(uuid, uuid[], int, timestamptz)       from public;
revoke all on function gerar_cronograma_lote(uuid[], uuid[], int, timestamptz) from public;
revoke all on function definir_abertura(uuid, uuid, timestamptz)               from public;
revoke all on function remover_aula_da_aluna(uuid, uuid)                       from public;
revoke all on function cronograma_da_aluna(uuid)                               from public;
revoke all on function meus_modulos()                                          from public;

grant execute on function gerar_cronograma(uuid, uuid[], int, timestamptz)       to authenticated;
grant execute on function gerar_cronograma_lote(uuid[], uuid[], int, timestamptz) to authenticated;
grant execute on function definir_abertura(uuid, uuid, timestamptz)               to authenticated;
grant execute on function remover_aula_da_aluna(uuid, uuid)                       to authenticated;
grant execute on function cronograma_da_aluna(uuid)                               to authenticated;
grant execute on function meus_modulos()                                          to authenticated;
