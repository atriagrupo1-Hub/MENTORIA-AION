-- =====================================================================
-- Caminho do Desbloqueio para Bênçãos Ilimitadas
-- Script de criação do banco (Supabase / PostgreSQL)
--
-- Baseado em "Modelo de Dados.md". Aplicar em um projeto novo,
-- pelo SQL Editor do Supabase ou como migration versionada.
-- Não altera o aplicativo: cria apenas a estrutura.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. TIPOS
-- ---------------------------------------------------------------------

create type papel_usuario as enum ('aluna', 'admin');
create type status_conta  as enum ('ativa', 'bloqueada');
create type escopo_acesso as enum ('curso', 'modulo', 'aula', 'acervo', 'categoria', 'presente');
create type status_comentario as enum ('publicado', 'oculto', 'removido');
create type tipo_material as enum ('pdf', 'audio');

-- ---------------------------------------------------------------------
-- 2. PESSOAS
-- ---------------------------------------------------------------------

create table profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  nome                text not null check (length(trim(nome)) between 2 and 80),
  login               text not null unique check (login = lower(login) and length(login) between 2 and 40),
  codigo              text not null check (codigo ~ '^[0-9]{4,6}$'),
  codigo_definido_em  timestamptz not null default now(),
  papel               papel_usuario not null default 'aluna',
  status              status_conta  not null default 'ativa',
  tentativas_erradas  smallint not null default 0,
  travada_ate         timestamptz,
  primeiro_acesso_em  timestamptz,
  ultimo_acesso_em    timestamptz,
  criada_em           timestamptz not null default now()
);

comment on column profiles.codigo is
  'Código de acesso em texto legível, por decisão do produto: a administradora consulta e informa à aluna. Nunca exposto a contas com papel aluna (ver policies).';

create index on profiles (papel);
create index on profiles (status);

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
  capa_path        text,
  cor_destaque     text,                            -- ex. '157,117,54' (rgb amostrado da capa)
  ordem            integer not null,
  publicado        boolean not null default true,
  bloqueado_geral  boolean not null default false,
  criado_em        timestamptz not null default now()
);
create unique index on modulos (numero);
create index on modulos (ordem);

create table aulas (
  id               uuid primary key default gen_random_uuid(),
  modulo_id        uuid not null references modulos(id) on delete cascade,
  numero           smallint not null,              -- reinicia em cada módulo
  titulo           text not null,
  ordem            integer not null,
  duracao_segundos integer check (duracao_segundos is null or duracao_segundos > 0),
  capa_path        text,
  video_provider   text,                            -- 'youtube' | 'stream' | 'vimeo' | ...
  video_ref        text,                            -- identificador dentro do provedor
  comentarios_ativos boolean not null default true,
  publicado        boolean not null default true,
  bloqueado_geral  boolean not null default false,
  criada_em        timestamptz not null default now(),
  unique (modulo_id, numero)
);
create index on aulas (modulo_id, ordem);

comment on column aulas.duracao_segundos is
  'Preenchido automaticamente na primeira reprodução, a partir da duração informada pelo player.';

create table aula_materiais (
  id            uuid primary key default gen_random_uuid(),
  aula_id       uuid not null references aulas(id) on delete cascade,
  tipo          tipo_material not null default 'pdf',
  titulo        text not null,
  arquivo_path  text not null,
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
  video_provider    text,
  video_ref         text,
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
  video_provider   text,
  video_ref        text,
  ordem            integer not null,
  publicado        boolean not null default true,
  bloqueado_geral  boolean not null default false,
  criado_em        timestamptz not null default now()
);
create index on presentes (categoria_id, ordem);

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

create table curtidas (
  aluna_id   uuid not null references profiles(id) on delete cascade,
  aula_id    uuid not null references aulas(id) on delete cascade,
  criada_em  timestamptz not null default now(),
  primary key (aluna_id, aula_id)
);

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
create index on comentarios (aula_id, criado_em desc);
create index on comentarios (autora_id);

-- Visão que as alunas leem: sem autoria, apenas comentários publicados
create view comentarios_publicos
with (security_invoker = true) as
  select id, aula_id, texto, posicao_segundos, criado_em
  from comentarios
  where status = 'publicado';

-- ---------------------------------------------------------------------
-- 6. REGRAS DE ACESSO (RLS)
-- ---------------------------------------------------------------------

alter table profiles       enable row level security;
alter table modulos        enable row level security;
alter table aulas          enable row level security;
alter table aula_materiais enable row level security;
alter table aulas_ao_vivo  enable row level security;
alter table categorias     enable row level security;
alter table presentes      enable row level security;
alter table acessos        enable row level security;
alter table progresso      enable row level security;
alter table curtidas       enable row level security;
alter table comentarios    enable row level security;

-- PERFIS -------------------------------------------------------------
-- A aluna lê o próprio perfil. O campo "codigo" é removido da resposta
-- pela função abaixo, que é o único caminho oferecido ao aplicativo.
create policy perfil_proprio_leitura on profiles
  for select using (id = auth.uid() or eh_admin());

create policy perfil_admin_escrita on profiles
  for all using (eh_admin()) with check (eh_admin());

-- O aplicativo da aluna usa esta função, nunca a tabela direta:
create or replace function meu_perfil()
returns table (id uuid, nome text, login text, papel papel_usuario,
               status status_conta, primeiro_acesso_em timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.nome, p.login, p.papel, p.status, p.primeiro_acesso_em
  from profiles p where p.id = auth.uid();
$$;

revoke all on function meu_perfil() from public;
grant execute on function meu_perfil() to authenticated;

-- CATÁLOGO -----------------------------------------------------------
-- Aluna ativa lê o catálogo publicado; ler não dá acesso ao vídeo
-- (o endereço do vídeo é entregue por função separada, ver item 7).
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
          with check (aluna_id = auth.uid());

-- CURTIDAS ------------------------------------------------------------
create policy curtidas_leitura on curtidas
  for select using (aluna_id = auth.uid() or eh_admin());
create policy curtidas_insere on curtidas
  for insert with check (aluna_id = auth.uid() and pode_ver_aula(aula_id));
create policy curtidas_remove on curtidas
  for delete using (aluna_id = auth.uid());

-- COMENTÁRIOS ---------------------------------------------------------
-- Leitura direta da tabela: apenas administradora (vê a autoria).
-- As alunas leem pela view comentarios_publicos, que não traz autora_id.
create policy comentarios_leitura on comentarios
  for select using (
    eh_admin()
    or autora_id = auth.uid()
    or (status = 'publicado' and pode_ver_aula(aula_id))
  );
create policy comentarios_insere on comentarios
  for insert with check (
    autora_id = auth.uid()
    and pode_ver_aula(aula_id)
    and exists (select 1 from aulas a where a.id = aula_id and a.comentarios_ativos)
  );
create policy comentarios_edita_proprio on comentarios
  for update using (autora_id = auth.uid() or eh_admin())
          with check (autora_id = auth.uid() or eh_admin());
create policy comentarios_remove on comentarios
  for delete using (autora_id = auth.uid() or eh_admin());

-- ---------------------------------------------------------------------
-- 7. FUNÇÕES DE APOIO AO APLICATIVO
-- ---------------------------------------------------------------------

-- Conferência do acesso: chamada pela Edge Function de login.
-- Nunca é exposta ao navegador (execute apenas para service_role).
create or replace function verificar_codigo(p_login text, p_codigo text)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare
  v profiles%rowtype;
begin
  select * into v from profiles where login = lower(trim(p_login));

  if not found then
    return null;                                   -- nome inexistente
  end if;

  if v.travada_ate is not null and v.travada_ate > now() then
    raise exception 'conta_travada';               -- 5 erros: 15 minutos
  end if;

  if v.status = 'bloqueada' then
    raise exception 'conta_bloqueada';
  end if;

  if v.codigo <> p_codigo then
    update profiles
       set tentativas_erradas = tentativas_erradas + 1,
           travada_ate = case when tentativas_erradas + 1 >= 5
                              then now() + interval '15 minutes' end
     where id = v.id;
    return null;
  end if;

  update profiles
     set tentativas_erradas = 0,
         travada_ate = null,
         ultimo_acesso_em = now(),
         primeiro_acesso_em = coalesce(primeiro_acesso_em, now())
   where id = v.id;

  return v.id;
end;
$$;

revoke all on function verificar_codigo(text, text) from public, anon, authenticated;

-- Duração descoberta pelo player na primeira reprodução
create or replace function registrar_duracao(p_aula uuid, p_segundos integer)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if p_segundos is null or p_segundos <= 0 then return; end if;
  if not pode_ver_aula(p_aula) then return; end if;
  update aulas set duracao_segundos = p_segundos
   where id = p_aula and duracao_segundos is null;
end;
$$;

grant execute on function registrar_duracao(uuid, integer) to authenticated;

-- Posição do vídeo: gravada a cada ~15s, ao pausar e ao sair
create or replace function salvar_posicao(p_aula uuid, p_segundos integer)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if not pode_ver_aula(p_aula) then return; end if;
  insert into progresso (aluna_id, aula_id, posicao_segundos, atualizada_em)
  values (auth.uid(), p_aula, greatest(p_segundos, 0), now())
  on conflict (aluna_id, aula_id) do update
    set posicao_segundos = excluded.posicao_segundos,
        atualizada_em = now();
end;
$$;

grant execute on function salvar_posicao(uuid, integer) to authenticated;

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

grant execute on function marcar_concluida(uuid, boolean) to authenticated;

-- O que a aluna pode ver, em uma consulta só (alimenta a home e os módulos)
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
  where pode_ver_aula(a.id)
  order by m.ordem, a.ordem;
$$;

grant execute on function minhas_aulas() to authenticated;

-- Endereço do vídeo: só sai do servidor depois de conferida a liberação.
-- Hoje devolve provedor + referência; ao migrar para Cloudflare Stream,
-- esta função passa a devolver o link assinado, sem mudar o aplicativo.
create or replace function video_da_aula(p_aula uuid)
returns table (provider text, ref text)
language sql stable security definer set search_path = public as $$
  select a.video_provider, a.video_ref
  from aulas a
  where a.id = p_aula and pode_ver_aula(a.id);
$$;

grant execute on function video_da_aula(uuid) to authenticated;

create or replace function video_do_presente(p_presente uuid)
returns table (provider text, ref text)
language sql stable security definer set search_path = public as $$
  select p.video_provider, p.video_ref
  from presentes p
  where p.id = p_presente and pode_ver_presente(p.id);
$$;

grant execute on function video_do_presente(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 8. PRIMEIRA CONTA DE ADMINISTRADORA
-- ---------------------------------------------------------------------
-- Criar a conta no Auth (painel do Supabase ou API administrativa),
-- copiar o uuid gerado e rodar:
--
-- insert into profiles (id, nome, login, codigo, papel)
-- values ('<uuid-do-auth>', 'Administradora', 'admin', '482913', 'admin');
--
-- O código da administradora tem 6 dígitos, por ser a conta que pode tudo.
-- ---------------------------------------------------------------------

-- =====================================================================
-- FORA DESTE SCRIPT (não é SQL):
--
-- 1. Edge Function "entrar": recebe login + código, chama
--    verificar_codigo() com a chave de serviço e, havendo retorno,
--    emite a sessão pela API administrativa do Auth. É o único ponto
--    que conhece a chave de serviço — nunca o navegador.
--
-- 2. Storage: bucket "capas" público; buckets "materiais" e "audios"
--    restritos, servidos por link assinado de curta duração.
--
-- 3. Migração dos dados atuais do navegador: script à parte, conforme
--    o item (K) de "Modelo de Dados.md".
-- =====================================================================
