-- =====================================================================
-- Caminho do Desbloqueio para Bênçãos Ilimitadas
-- Estrutura inicial: tabelas, regras de acesso e funções.
--
-- Baseado em "Modelo de Dados.md" e no script entregue no handoff, com
-- as correções apontadas na revisão. As mudanças em relação ao script
-- original estão marcadas com [CORRIGIDO].
--
-- IMPORTANTE: aplicar como dono `postgres`. As funções `security
-- definer` deste script leem tabelas protegidas por RLS de dentro das
-- próprias políticas dessas tabelas; isso só não entra em recursão
-- infinita porque o dono tem BYPASSRLS.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. TIPOS
-- ---------------------------------------------------------------------

create type papel_usuario     as enum ('aluna', 'admin');
create type status_conta      as enum ('ativa', 'bloqueada');
create type escopo_acesso     as enum ('curso', 'modulo', 'aula', 'acervo', 'categoria', 'presente');
create type status_comentario as enum ('publicado', 'oculto', 'removido');
create type tipo_material     as enum ('pdf', 'audio');

-- ---------------------------------------------------------------------
-- 2. PESSOAS
-- ---------------------------------------------------------------------

create table profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  nome                text not null check (length(trim(nome)) between 2 and 80),
  login               text not null unique check (login = lower(login) and length(login) between 2 and 40),
  papel               papel_usuario not null default 'aluna',
  status              status_conta  not null default 'ativa',
  primeiro_acesso_em  timestamptz,
  ultimo_acesso_em    timestamptz,
  criada_em           timestamptz not null default now()
);

create index on profiles (papel);
create index on profiles (status);

-- [CORRIGIDO] O código de acesso saiu de `profiles`.
--
-- No script original ele era uma coluna de `profiles`, e a política de
-- leitura liberava a linha inteira para a própria aluna — RLS é por
-- linha, não por coluna, então qualquer aluna logada conseguia ler o
-- próprio código, e o contador de tentativas, com uma consulta direta.
-- Numa tabela à parte, legível apenas pela administradora, a promessa
-- do item (F) do modelo passa a ser verdadeira.
create table credenciais (
  aluna_id            uuid primary key references profiles(id) on delete cascade,
  codigo              text not null check (codigo ~ '^[0-9]{4,6}$'),
  codigo_definido_em  timestamptz not null default now(),
  tentativas_erradas  smallint not null default 0,
  travada_ate         timestamptz
);

comment on table credenciais is
  'Código de acesso em texto legível, por decisão do produto: a administradora consulta e informa à aluna. Nunca legível por contas com papel aluna.';

-- Quem sou eu / o que posso
create or replace function eh_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and papel = 'admin' and status = 'ativa'
  );
$$;

create or replace function conta_ativa()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and status = 'ativa'
  );
$$;

-- ---------------------------------------------------------------------
-- 3. CATÁLOGO
-- ---------------------------------------------------------------------

create table modulos (
  id               uuid primary key default gen_random_uuid(),
  numero           smallint not null,              -- rótulo exibido (0..10), nunca identidade
  titulo           text not null,
  intro            text,
  capa_path        text,                            -- capa é pública; não vaza nada
  cor_destaque     text,                            -- ex. '157,117,54' (rgb amostrado da capa)
  ordem            integer not null,
  publicado        boolean not null default true,
  bloqueado_geral  boolean not null default false,
  criado_em        timestamptz not null default now(),
  -- [CORRIGIDO] adiável: o painel troca duas aulas ou dois módulos de
  -- lugar com dois UPDATEs, e um índice único comum quebra no primeiro.
  constraint modulos_numero_unico unique (numero) deferrable initially deferred
);
create index on modulos (ordem);

create table aulas (
  id                 uuid primary key default gen_random_uuid(),
  modulo_id          uuid not null references modulos(id) on delete cascade,
  numero             smallint not null,            -- reinicia em cada módulo
  titulo             text not null,
  ordem              integer not null,
  duracao_segundos   integer check (duracao_segundos is null or duracao_segundos > 0),
  capa_path          text,
  comentarios_ativos boolean not null default true,
  publicado          boolean not null default true,
  bloqueado_geral    boolean not null default false,
  criada_em          timestamptz not null default now(),
  -- [CORRIGIDO] adiável, mesmo motivo do módulo
  constraint aulas_numero_unico unique (modulo_id, numero) deferrable initially deferred
);
create index on aulas (modulo_id, ordem);

comment on column aulas.duracao_segundos is
  'Preenchido automaticamente na primeira reprodução, a partir da duração informada pelo player.';

create table aula_materiais (
  id            uuid primary key default gen_random_uuid(),
  aula_id       uuid not null references aulas(id) on delete cascade,
  tipo          tipo_material not null default 'pdf',
  titulo        text not null,
  arquivo_path  text not null,                     -- caminho no Storage, nunca URL completa
  ordem         integer not null default 1
);
create index on aula_materiais (aula_id, ordem);

create table aulas_ao_vivo (
  id                uuid primary key default gen_random_uuid(),
  modulo_id         uuid not null unique references modulos(id) on delete cascade,
  titulo            text not null,
  descricao         text,
  quando_texto      text,                           -- 'Quinta, 12 de setembro, 20h'
  data_hora         timestamptz,
  duracao_prevista  integer,
  liberada          boolean not null default false
);

create table categorias (
  id               uuid primary key default gen_random_uuid(),
  titulo           text not null,
  ordem            integer not null,
  destacada        boolean not null default false, -- "Deixar sozinha"
  bloqueada_geral  boolean not null default false,
  criada_em        timestamptz not null default now()
);
create index on categorias (ordem);

create table presentes (
  id               uuid primary key default gen_random_uuid(),
  categoria_id     uuid not null references categorias(id) on delete cascade,
  titulo           text not null,
  descricao        text,
  duracao_texto    text,
  capa_path        text,
  ordem            integer not null,
  publicado        boolean not null default true,
  bloqueado_geral  boolean not null default false,
  criado_em        timestamptz not null default now()
);
create index on presentes (categoria_id, ordem);

-- ---------------------------------------------------------------------
-- 3.1 MÍDIA — separada do catálogo
-- ---------------------------------------------------------------------
-- [CORRIGIDO] `video_provider` e `video_ref` saíram das tabelas do
-- catálogo.
--
-- No script original eles eram colunas de `aulas`, `presentes` e
-- `aulas_ao_vivo`, cuja política de leitura é "aluna ativa lê o
-- publicado". Como RLS é por linha, qualquer aluna logada podia ler o
-- endereço de todos os vídeos com uma consulta direta, inclusive dos
-- módulos que não tem liberados — e as funções `video_da_aula` e
-- `video_do_presente` não protegiam nada. Em tabelas próprias, legíveis
-- só pela administradora, o endereço passa mesmo a sair apenas por
-- função, depois de conferida a liberação, como manda o item 8 do
-- README e o item (J) do modelo.
--
-- `provider` nasce 'stream' (Cloudflare Stream). Trocar de serviço é
-- atualizar duas colunas destas tabelas — aulas, progresso, liberações
-- e comentários não são afetados.

create table aula_midia (
  aula_id        uuid primary key references aulas(id) on delete cascade,
  video_provider text not null default 'stream' check (video_provider in ('stream', 'youtube', 'vimeo')),
  video_ref      text not null,
  atualizada_em  timestamptz not null default now()
);

create table presente_midia (
  presente_id    uuid primary key references presentes(id) on delete cascade,
  video_provider text not null default 'stream' check (video_provider in ('stream', 'youtube', 'vimeo')),
  video_ref      text not null,
  atualizada_em  timestamptz not null default now()
);

create table ao_vivo_midia (
  ao_vivo_id     uuid primary key references aulas_ao_vivo(id) on delete cascade,
  video_provider text not null default 'stream' check (video_provider in ('stream', 'youtube', 'vimeo')),
  video_ref      text not null,
  atualizada_em  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. LIBERAÇÕES
-- ---------------------------------------------------------------------

create table acessos (
  id            uuid primary key default gen_random_uuid(),
  aluna_id      uuid not null references profiles(id) on delete cascade,
  escopo        escopo_acesso not null,
  modulo_id     uuid references modulos(id)    on delete cascade,
  aula_id       uuid references aulas(id)      on delete cascade,
  categoria_id  uuid references categorias(id) on delete cascade,
  presente_id   uuid references presentes(id)  on delete cascade,
  concedido_em  timestamptz not null default now(),
  concedido_por uuid references profiles(id),
  -- cada escopo aponta exatamente para o alvo que lhe corresponde
  constraint alvo_coerente check (
    (escopo = 'curso'     and modulo_id is null and aula_id is null and categoria_id is null and presente_id is null) or
    (escopo = 'modulo'    and modulo_id is not null and aula_id is null and categoria_id is null and presente_id is null) or
    (escopo = 'aula'      and aula_id is not null and modulo_id is null and categoria_id is null and presente_id is null) or
    (escopo = 'acervo'    and modulo_id is null and aula_id is null and categoria_id is null and presente_id is null) or
    (escopo = 'categoria' and categoria_id is not null and modulo_id is null and aula_id is null and presente_id is null) or
    (escopo = 'presente'  and presente_id is not null and modulo_id is null and aula_id is null and categoria_id is null)
  )
);
create index on acessos (aluna_id);
create unique index acessos_curso_unico     on acessos (aluna_id) where escopo = 'curso';
create unique index acessos_acervo_unico    on acessos (aluna_id) where escopo = 'acervo';
create unique index acessos_modulo_unico    on acessos (aluna_id, modulo_id)    where escopo = 'modulo';
create unique index acessos_aula_unico      on acessos (aluna_id, aula_id)      where escopo = 'aula';
create unique index acessos_categoria_unico on acessos (aluna_id, categoria_id) where escopo = 'categoria';
create unique index acessos_presente_unico  on acessos (aluna_id, presente_id)  where escopo = 'presente';

-- [CORRIGIDO] Índices das chaves estrangeiras. Os únicos parciais acima
-- começam por `aluna_id`, então apagar um módulo — a operação
-- destrutiva que o painel oferece — fazia varredura completa em
-- `acessos`.
create index on acessos (modulo_id)    where modulo_id    is not null;
create index on acessos (aula_id)      where aula_id      is not null;
create index on acessos (categoria_id) where categoria_id is not null;
create index on acessos (presente_id)  where presente_id  is not null;

-- Uma aula está liberada se: conta ativa, nada bloqueado para todas,
-- e existe liberação de curso, do módulo dela, ou dela mesma.
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
  );
$$;

create or replace function pode_ver_presente(p_presente uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from presentes p
    join categorias c on c.id = p.categoria_id
    where p.id = p_presente
      and p.publicado
      and not p.bloqueado_geral and not c.bloqueada_geral
      and conta_ativa()
      and exists (
        select 1 from acessos ac
        where ac.aluna_id = auth.uid()
          and (ac.escopo = 'acervo'
            or (ac.escopo = 'categoria' and ac.categoria_id = p.categoria_id)
            or (ac.escopo = 'presente'  and ac.presente_id  = p.id))
      )
  );
$$;

-- A aula ao vivo segue a liberação do módulo dela.
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
  );
$$;

-- ---------------------------------------------------------------------
-- 5. ATIVIDADE DA ALUNA
-- ---------------------------------------------------------------------

create table progresso (
  aluna_id          uuid not null references profiles(id) on delete cascade,
  aula_id           uuid not null references aulas(id) on delete cascade,
  posicao_segundos  integer not null default 0 check (posicao_segundos >= 0),
  iniciada_em       timestamptz not null default now(),
  concluida_em      timestamptz,
  atualizada_em     timestamptz not null default now(),
  primary key (aluna_id, aula_id)
);
create index on progresso (aluna_id, atualizada_em desc);  -- "continuar de onde parei"
create index on progresso (aula_id);                       -- [CORRIGIDO] cascata ao apagar aula

create table curtidas (
  aluna_id   uuid not null references profiles(id) on delete cascade,
  aula_id    uuid not null references aulas(id) on delete cascade,
  criada_em  timestamptz not null default now(),
  primary key (aluna_id, aula_id)
);
create index on curtidas (aula_id);                        -- [CORRIGIDO] cascata ao apagar aula

create table comentarios (
  id                uuid primary key default gen_random_uuid(),
  aula_id           uuid not null references aulas(id) on delete cascade,
  autora_id         uuid not null references profiles(id) on delete cascade,
  texto             text not null check (length(trim(texto)) between 1 and 600),
  posicao_segundos  integer not null default 0 check (posicao_segundos >= 0),
  status            status_comentario not null default 'publicado',
  criado_em         timestamptz not null default now(),
  moderado_por      uuid references profiles(id),
  moderado_em       timestamptz
);
create index on comentarios (aula_id, criado_em desc) where status = 'publicado';
create index on comentarios (autora_id);

-- ---------------------------------------------------------------------
-- 6. REGRAS DE ACESSO (RLS)
-- ---------------------------------------------------------------------

alter table profiles       enable row level security;
alter table credenciais    enable row level security;
alter table modulos        enable row level security;
alter table aulas          enable row level security;
alter table aula_materiais enable row level security;
alter table aulas_ao_vivo  enable row level security;
alter table categorias     enable row level security;
alter table presentes      enable row level security;
alter table aula_midia     enable row level security;
alter table presente_midia enable row level security;
alter table ao_vivo_midia  enable row level security;
alter table acessos        enable row level security;
alter table progresso      enable row level security;
alter table curtidas       enable row level security;
alter table comentarios    enable row level security;

-- PERFIS -------------------------------------------------------------
create policy perfil_proprio_leitura on profiles
  for select using (id = auth.uid() or eh_admin());

create policy perfil_admin_escrita on profiles
  for all using (eh_admin()) with check (eh_admin());

-- CREDENCIAIS --------------------------------------------------------
-- Somente a administradora. A aluna nunca lê o próprio código, nem o de
-- ninguém; a conferência acontece no servidor, pela Edge Function.
create policy credenciais_admin on credenciais
  for all using (eh_admin()) with check (eh_admin());

-- CATÁLOGO -----------------------------------------------------------
create policy catalogo_modulos_leitura on modulos
  for select using ((publicado and conta_ativa()) or eh_admin());
create policy catalogo_modulos_escrita on modulos
  for all using (eh_admin()) with check (eh_admin());

create policy catalogo_aulas_leitura on aulas
  for select using ((publicado and conta_ativa()) or eh_admin());
create policy catalogo_aulas_escrita on aulas
  for all using (eh_admin()) with check (eh_admin());

create policy catalogo_materiais_leitura on aula_materiais
  for select using (pode_ver_aula(aula_id) or eh_admin());
create policy catalogo_materiais_escrita on aula_materiais
  for all using (eh_admin()) with check (eh_admin());

create policy catalogo_ao_vivo_leitura on aulas_ao_vivo
  for select using (conta_ativa() or eh_admin());
create policy catalogo_ao_vivo_escrita on aulas_ao_vivo
  for all using (eh_admin()) with check (eh_admin());

create policy catalogo_categorias_leitura on categorias
  for select using (conta_ativa() or eh_admin());
create policy catalogo_categorias_escrita on categorias
  for all using (eh_admin()) with check (eh_admin());

create policy catalogo_presentes_leitura on presentes
  for select using ((publicado and conta_ativa()) or eh_admin());
create policy catalogo_presentes_escrita on presentes
  for all using (eh_admin()) with check (eh_admin());

-- MÍDIA --------------------------------------------------------------
-- Só a administradora lê a tabela. A aluna recebe o endereço apenas
-- pelas funções do item 7, depois de conferida a liberação.
create policy midia_aula_admin on aula_midia
  for all using (eh_admin()) with check (eh_admin());
create policy midia_presente_admin on presente_midia
  for all using (eh_admin()) with check (eh_admin());
create policy midia_ao_vivo_admin on ao_vivo_midia
  for all using (eh_admin()) with check (eh_admin());

-- LIBERAÇÕES ----------------------------------------------------------
-- A aluna lê as próprias e não escreve nenhuma. É o que impede
-- alguém de liberar conteúdo para si mesma.
create policy acessos_leitura on acessos
  for select using (aluna_id = auth.uid() or eh_admin());
create policy acessos_escrita_admin on acessos
  for all using (eh_admin()) with check (eh_admin());

-- PROGRESSO -----------------------------------------------------------
create policy progresso_leitura on progresso
  for select using (aluna_id = auth.uid() or eh_admin());
create policy progresso_insere on progresso
  for insert with check (aluna_id = auth.uid() and pode_ver_aula(aula_id));
create policy progresso_atualiza on progresso
  for update using (aluna_id = auth.uid() and pode_ver_aula(aula_id))
          with check (aluna_id = auth.uid() and pode_ver_aula(aula_id));

-- CURTIDAS ------------------------------------------------------------
create policy curtidas_leitura on curtidas
  for select using (aluna_id = auth.uid() or eh_admin());
create policy curtidas_insere on curtidas
  for insert with check (aluna_id = auth.uid() and pode_ver_aula(aula_id));
create policy curtidas_remove on curtidas
  for delete using (aluna_id = auth.uid());

-- COMENTÁRIOS ---------------------------------------------------------
-- [CORRIGIDO] A leitura da tabela-base não alcança mais o comentário
-- das outras.
--
-- No script original a política liberava a linha inteira quando o
-- comentário estava publicado e a aula liberada — e a linha traz
-- `autora_id`. Como a view `comentarios_publicos` era
-- `security_invoker = true`, ela rodava com a permissão de quem chama e
-- não restringia nada além da política; bastava consultar a tabela
-- direto para descobrir quem escreveu. O anonimato prometido no item
-- (I) do modelo não existia. Agora a aluna lê os comentários das outras
-- somente pela view, que não traz autoria.
create policy comentarios_leitura on comentarios
  for select using (eh_admin() or autora_id = auth.uid());

create policy comentarios_insere on comentarios
  for insert with check (
    autora_id = auth.uid()
    and pode_ver_aula(aula_id)
    and exists (select 1 from aulas a where a.id = aula_id and a.comentarios_ativos)
  );

-- [CORRIGIDO] O WITH CHECK ganhou `pode_ver_aula`. Sem ele, a aluna
-- editava o próprio comentário trocando `aula_id` por uma aula que não
-- tem liberada, escrevendo onde não deveria alcançar.
create policy comentarios_edita_proprio on comentarios
  for update using (autora_id = auth.uid() or eh_admin())
          with check ((autora_id = auth.uid() and pode_ver_aula(aula_id)) or eh_admin());

-- [CORRIGIDO] Apagar a linha é só da administradora. O item (I) do
-- modelo pede histórico preservado: a aluna "remove" mudando o status,
-- pela função `remover_meu_comentario`.
create policy comentarios_remove on comentarios
  for delete using (eh_admin());

-- Visão que as alunas leem: sem autoria, apenas publicados, apenas das
-- aulas liberadas para elas.
-- [CORRIGIDO] `security_invoker = false`: a view roda como dona e faz o
-- filtro por conta própria, em vez de depender da política da tabela.
create view comentarios_publicos
with (security_invoker = false) as
  select id, aula_id, texto, posicao_segundos, criado_em
  from comentarios
  where status = 'publicado' and pode_ver_aula(aula_id);

revoke all on comentarios_publicos from public, anon;
grant select on comentarios_publicos to authenticated;

-- ---------------------------------------------------------------------
-- 7. FUNÇÕES DE APOIO AO APLICATIVO
-- ---------------------------------------------------------------------

-- Conferência do acesso: chamada pela Edge Function de login.
-- Nunca é exposta ao navegador (executa apenas para service_role).
create or replace function verificar_codigo(p_login text, p_codigo text)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare
  v_perfil profiles%rowtype;
  v_cred   credenciais%rowtype;
begin
  select * into v_perfil from profiles where login = lower(trim(p_login));

  if not found then
    return null;                                   -- nome inexistente
  end if;

  select * into v_cred from credenciais where aluna_id = v_perfil.id;

  if not found then
    return null;                                   -- conta sem código definido
  end if;

  if v_cred.travada_ate is not null and v_cred.travada_ate > now() then
    raise exception 'conta_travada';               -- 5 erros: 15 minutos
  end if;

  -- [CORRIGIDO] Passada a trava, o contador zera.
  --
  -- No script original ele nunca era zerado numa falha: depois do 5º
  -- erro, o 6º já voltava a travar, e a aluna ficava com uma tentativa a
  -- cada 15 minutos para sempre. Para o público do produto isso vira
  -- atendimento manual toda semana.
  if v_cred.travada_ate is not null and v_cred.travada_ate <= now() then
    update credenciais
       set tentativas_erradas = 0, travada_ate = null
     where aluna_id = v_perfil.id;
    v_cred.tentativas_erradas := 0;
  end if;

  if v_perfil.status = 'bloqueada' then
    raise exception 'conta_bloqueada';
  end if;

  if v_cred.codigo <> p_codigo then
    update credenciais
       set tentativas_erradas = tentativas_erradas + 1,
           travada_ate = case when tentativas_erradas + 1 >= 5
                              then now() + interval '15 minutes' end
     where aluna_id = v_perfil.id;
    return null;
  end if;

  update credenciais
     set tentativas_erradas = 0, travada_ate = null
   where aluna_id = v_perfil.id;

  update profiles
     set ultimo_acesso_em = now(),
         primeiro_acesso_em = coalesce(primeiro_acesso_em, now())
   where id = v_perfil.id;

  return v_perfil.id;
end;
$$;

-- O aplicativo da aluna lê o próprio perfil por aqui.
create or replace function meu_perfil()
returns table (id uuid, nome text, login text, papel papel_usuario,
               status status_conta, primeiro_acesso_em timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.nome, p.login, p.papel, p.status, p.primeiro_acesso_em
  from profiles p where p.id = auth.uid();
$$;

-- Duração descoberta pelo player na primeira reprodução.
-- [CORRIGIDO] Limites de sanidade: o valor vem do navegador e é gravado
-- de forma permanente (só preenche quando está nulo). Sem limite, um
-- número errado corrompia o percentual de todas as alunas.
create or replace function registrar_duracao(p_aula uuid, p_segundos integer)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if p_segundos is null or p_segundos < 30 or p_segundos > 36000 then return; end if;
  if not pode_ver_aula(p_aula) then return; end if;
  update aulas set duracao_segundos = p_segundos
   where id = p_aula and duracao_segundos is null;
end;
$$;

-- Posição do vídeo: gravada a cada ~15s, ao pausar e ao sair
create or replace function salvar_posicao(p_aula uuid, p_segundos integer)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if not pode_ver_aula(p_aula) then return; end if;
  insert into progresso (aluna_id, aula_id, posicao_segundos, atualizada_em)
  values (auth.uid(), p_aula, greatest(coalesce(p_segundos, 0), 0), now())
  on conflict (aluna_id, aula_id) do update
    set posicao_segundos = excluded.posicao_segundos,
        atualizada_em = now();
end;
$$;

create or replace function marcar_concluida(p_aula uuid, p_concluida boolean)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if not pode_ver_aula(p_aula) then return; end if;
  insert into progresso (aluna_id, aula_id, concluida_em, atualizada_em)
  values (auth.uid(), p_aula, case when p_concluida then now() end, now())
  on conflict (aluna_id, aula_id) do update
    set concluida_em = case when p_concluida then coalesce(progresso.concluida_em, now()) end,
        atualizada_em = now();
end;
$$;

create or replace function alternar_curtida(p_aula uuid)
returns boolean language plpgsql volatile security definer set search_path = public as $$
declare v_existe boolean;
begin
  if not pode_ver_aula(p_aula) then return false; end if;
  select exists (select 1 from curtidas where aluna_id = auth.uid() and aula_id = p_aula)
    into v_existe;
  if v_existe then
    delete from curtidas where aluna_id = auth.uid() and aula_id = p_aula;
    return false;
  end if;
  insert into curtidas (aluna_id, aula_id) values (auth.uid(), p_aula);
  return true;
end;
$$;

-- A aluna "remove" o próprio comentário mudando o status; a linha fica,
-- para a moderação continuar tendo histórico.
create or replace function remover_meu_comentario(p_comentario uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  update comentarios
     set status = 'removido', moderado_em = now()
   where id = p_comentario and autora_id = auth.uid();
end;
$$;

-- O que a aluna pode ver, em uma consulta só (alimenta a home e os módulos).
-- [CORRIGIDO] Antes chamava `pode_ver_aula()` uma vez por aula — 50
-- subconsultas independentes por carregamento de tela, sem chance de
-- inline. Agora a checagem entra na própria consulta e o planejador
-- resolve como semi-junção.
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
  -- [CORRIGIDO] `ordem` não é única; sem desempate a lista variava.
  order by m.ordem, a.ordem, a.numero;
$$;

-- Endereço do vídeo: só sai do servidor depois de conferida a liberação.
-- Com Cloudflare Stream, `ref` é o uid do vídeo; a Edge Function troca
-- esse uid por um token assinado de curta duração.
create or replace function video_da_aula(p_aula uuid)
returns table (provider text, ref text)
language sql stable security definer set search_path = public as $$
  select v.video_provider, v.video_ref
  from aula_midia v
  where v.aula_id = p_aula and pode_ver_aula(p_aula);
$$;

create or replace function video_do_presente(p_presente uuid)
returns table (provider text, ref text)
language sql stable security definer set search_path = public as $$
  select v.video_provider, v.video_ref
  from presente_midia v
  where v.presente_id = p_presente and pode_ver_presente(p_presente);
$$;

create or replace function video_da_ao_vivo(p_ao_vivo uuid)
returns table (provider text, ref text)
language sql stable security definer set search_path = public as $$
  select v.video_provider, v.video_ref
  from ao_vivo_midia v
  where v.ao_vivo_id = p_ao_vivo and pode_ver_ao_vivo(p_ao_vivo);
$$;

-- ---------------------------------------------------------------------
-- 8. PERMISSÕES DE EXECUÇÃO
-- ---------------------------------------------------------------------
-- [CORRIGIDO] O Postgres concede EXECUTE a `public` por padrão. O
-- script original só revogava em duas funções; as demais ficavam
-- chamáveis por `anon`. Não vazava nada, porque `auth.uid()` é nulo ali,
-- mas o padrão correto é fechar e abrir só o necessário.

revoke execute on all functions in schema public from public, anon;

grant execute on function meu_perfil()                          to authenticated;
grant execute on function minhas_aulas()                        to authenticated;
grant execute on function registrar_duracao(uuid, integer)      to authenticated;
grant execute on function salvar_posicao(uuid, integer)         to authenticated;
grant execute on function marcar_concluida(uuid, boolean)       to authenticated;
grant execute on function alternar_curtida(uuid)                to authenticated;
grant execute on function remover_meu_comentario(uuid)          to authenticated;
grant execute on function video_da_aula(uuid)                   to authenticated;
grant execute on function video_do_presente(uuid)               to authenticated;
grant execute on function video_da_ao_vivo(uuid)                to authenticated;
grant execute on function pode_ver_aula(uuid)                   to authenticated;
grant execute on function pode_ver_presente(uuid)               to authenticated;
grant execute on function pode_ver_ao_vivo(uuid)                to authenticated;
grant execute on function eh_admin()                            to authenticated;
grant execute on function conta_ativa()                         to authenticated;

-- `verificar_codigo` fica só para a Edge Function, com a chave de
-- serviço. Nunca para o navegador.
revoke execute on function verificar_codigo(text, text) from public, anon, authenticated;
