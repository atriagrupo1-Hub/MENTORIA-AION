-- =====================================================================
-- A aluna passa a saber QUANDO a aula abre
--
-- Hoje o aplicativo diz, para toda aula fechada:
--
--   "Esta aula será liberada no momento certo da sua jornada."
--
-- É bonito e não informa nada. O cronograma desta turma tem 41 das 50
-- aulas abrindo no futuro, a última em maio de 2027 — são oito meses
-- em que a aluna vai ler essa frase sem saber se falta um dia ou meio
-- ano. Ela não consegue se organizar, e vai perguntar. Toda vez.
--
-- O banco sempre soube a data: está em `acessos.abre_em`, e é o painel
-- que a define. O que faltava era um caminho para ela chegar à tela.
--
-- ---------------------------------------------------------------------
-- Por que uma função, e não a coluna
--
-- `acessos` não é concedida ao navegador, e não vai passar a ser: a
-- tabela diz quem tem acesso a quê, de todas as alunas. Uma função que
-- roda como dona devolve exatamente um par — aula e data — e só da
-- própria aluna, porque filtra por `auth.uid()` aqui dentro.
--
-- As mesmas conferências de `pode_ver_aula` valem, menos a data: aula
-- publicada, módulo publicado, nenhum dos dois bloqueado, e conta
-- ativa. Conta suspensa não recebe data nenhuma — quem não tem acesso
-- não tem o que esperar, e prometer uma data seria pior que o silêncio.
-- =====================================================================

create or replace function minhas_aberturas()
returns table (aula_id uuid, abre_em timestamptz)
language sql stable security definer set search_path = public as $$
  select ac.aula_id, ac.abre_em
  from acessos ac
  join aulas a   on a.id = ac.aula_id
  join modulos m on m.id = a.modulo_id
  where ac.aluna_id = auth.uid()
    and ac.escopo = 'aula'
    and ac.abre_em is not null
    and ac.abre_em > now()
    and a.publicado and m.publicado
    and not a.bloqueado_geral and not m.bloqueado_geral
    and conta_ativa();
$$;

comment on function minhas_aberturas() is
  'Quando cada aula ainda fechada abre, para a aluna que está logada. Só as dela, só as que já têm data marcada, só as que ainda não chegaram. Existe para a tela poder dizer "abre em 3 de outubro" em vez de "no momento certo da sua jornada".';

revoke execute on function minhas_aberturas() from public, anon;
grant execute on function minhas_aberturas() to authenticated;
