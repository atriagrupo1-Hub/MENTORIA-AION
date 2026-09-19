-- ---------------------------------------------------------------------
-- 0026 — O produto passa a existir
-- ---------------------------------------------------------------------
-- Até aqui o aplicativo não tinha a entidade "produto". O curso era um
-- punhado de módulos soltos, sem categoria nenhuma, e o acervo era
-- `categoria -> presente`. Quer dizer: a CATEGORIA fazia o papel de tipo
-- de produto — "Ebooks" era onde só cabia e-book, "Frequências" onde só
-- cabia frequência. Criar um produto que misturasse vídeo, áudio e PDF
-- não era difícil: era impossível.
--
-- Esta migration separa as duas coisas que estavam grudadas:
--
--   categoria  = ONDE o produto aparece, e em que ordem
--   produto    = O QUE o produto tem dentro
--
-- `produtos` é o container universal. `conteudos` é a folha universal:
-- um mesmo desenho serve para o vídeo de uma aula, o áudio de uma
-- frequência, o PDF de um e-book e o texto de apresentação de um
-- documentário. Nada de uma tabela por tipo de mídia.
--
-- NADA é removido. `aula_midia`, `presente_midia`, `aula_materiais` e
-- `aulas.exercicio` continuam exatamente como estão — são o que o
-- player e a Edge Function `video-assinado` já leem, e quebrar isso
-- seria quebrar a aula. `conteudos` acrescenta; não substitui.
-- ---------------------------------------------------------------------

-- Seis tipos, não trinta. "E-book" é um PDF, "material complementar" é
-- um PDF ou um link, "capa" é uma imagem. Inventar um tipo para cada
-- palavra do catálogo só daria mais caminhos para o mesmo lugar.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_conteudo') then
    create type tipo_conteudo as enum ('video', 'audio', 'texto', 'pdf', 'link', 'imagem');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 1. PRODUTOS
-- ---------------------------------------------------------------------
create table if not exists produtos (
  id              uuid primary key default gen_random_uuid(),
  -- Onde aparece. Só isso. `on delete restrict` de propósito: apagar uma
  -- categoria não pode levar produtos junto sem alguém ver o que perdeu.
  categoria_id    uuid not null references categorias(id) on delete restrict,
  titulo          text not null,
  descricao       text,
  capa_path       text,
  ordem           integer not null default 0,
  publicado       boolean not null default true,
  bloqueado_geral boolean not null default false,
  criado_em       timestamptz not null default now()
);

create index if not exists produtos_por_categoria on produtos (categoria_id, ordem);

-- ---------------------------------------------------------------------
-- 2. CONTEÚDOS
-- ---------------------------------------------------------------------
-- Um conteúdo pertence a UM dono, e o dono decide a hierarquia:
--
--   aula_id      -> produto > módulo > aula > conteúdo   (o curso)
--   modulo_id    -> produto > seção > conteúdo           (sem aula)
--   presente_id  -> produto > item > conteúdo            (acervo)
--   nenhum       -> produto > conteúdo                   (e-book, documentário)
--
-- `produto_id` é sempre preenchido, inclusive nos três primeiros casos:
-- é o que permite listar tudo de um produto numa consulta só. O gatilho
-- abaixo o deriva do pai, para não existir a chance de ele divergir.
create table if not exists conteudos (
  id             uuid primary key default gen_random_uuid(),
  produto_id     uuid not null references produtos(id)  on delete cascade,
  modulo_id      uuid references modulos(id)            on delete cascade,
  aula_id        uuid references aulas(id)              on delete cascade,
  presente_id    uuid references presentes(id)          on delete cascade,
  tipo           tipo_conteudo not null,
  titulo         text,
  texto          text,
  arquivo_path   text,
  url            text,
  video_provider text,
  video_ref      text,
  ordem          integer not null default 0,
  publicado      boolean not null default true,
  criado_em      timestamptz not null default now(),
  constraint conteudo_tem_um_dono check (
    (case when modulo_id   is not null then 1 else 0 end)
  + (case when aula_id     is not null then 1 else 0 end)
  + (case when presente_id is not null then 1 else 0 end) <= 1
  )
);

create index if not exists conteudos_por_produto  on conteudos (produto_id, ordem);
create index if not exists conteudos_por_aula     on conteudos (aula_id, ordem)     where aula_id     is not null;
create index if not exists conteudos_por_modulo   on conteudos (modulo_id, ordem)   where modulo_id   is not null;
create index if not exists conteudos_por_presente on conteudos (presente_id, ordem) where presente_id is not null;

-- ---------------------------------------------------------------------
-- 3. QUEM É O DONO DE CADA MÓDULO E DE CADA PRESENTE
-- ---------------------------------------------------------------------
alter table modulos   add column if not exists produto_id uuid references produtos(id) on delete restrict;
alter table presentes add column if not exists produto_id uuid references produtos(id) on delete cascade;

create index if not exists modulos_por_produto   on modulos   (produto_id, ordem) where produto_id is not null;
create index if not exists presentes_por_produto on presentes (produto_id, ordem) where produto_id is not null;

-- ---------------------------------------------------------------------
-- 4. O PRODUTO QUE JÁ EXISTIA SEM NOME
-- ---------------------------------------------------------------------
-- Os 11 módulos e as 50 aulas em produção SÃO um produto: a mentoria.
-- Ele nunca teve registro próprio porque a estrutura antiga não previa
-- um. Aqui ele ganha o registro — e a categoria onde mora. Não é dado
-- inventado: é o curso real deixando de ser um caso especial do código.
do $$
declare
  v_categoria uuid;
  v_produto   uuid;
begin
  if exists (select 1 from modulos where produto_id is null) then

    select id into v_categoria from categorias where titulo = 'Mentoria';

    if v_categoria is null then
      -- Entra na frente: é o produto principal. As outras descem uma
      -- casa. A ordem é editável no painel a partir de agora, então
      -- isto é só o ponto de partida.
      update categorias set ordem = ordem + 1;
      insert into categorias (titulo, ordem) values ('Mentoria', 0)
        returning id into v_categoria;
    end if;

    insert into produtos (categoria_id, titulo, descricao, ordem)
    values (
      v_categoria,
      'Caminho do Desbloqueio para Bênçãos Ilimitadas',
      'A mentoria completa, em módulos e aulas.',
      0
    )
    returning id into v_produto;

    update modulos set produto_id = v_produto where produto_id is null;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 5. O GATILHO QUE IMPEDE O CONTEÚDO DE MENTIR SOBRE O DONO
-- ---------------------------------------------------------------------
-- Guardar `produto_id` junto de `aula_id` é redundante de propósito —
-- é o que faz "tudo deste produto" ser uma consulta e não três. O preço
-- da redundância é a chance de divergir. O gatilho paga esse preço:
-- quando há pai, `produto_id` é DERIVADO dele, e o que o painel mandou
-- é ignorado. Não dá para errar.
create or replace function conteudo_herda_o_produto()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_produto uuid;
begin
  if new.aula_id is not null then
    select m.produto_id into v_produto
    from aulas a join modulos m on m.id = a.modulo_id
    where a.id = new.aula_id;
    if v_produto is null then raise exception 'aula_sem_produto'; end if;

  elsif new.modulo_id is not null then
    select m.produto_id into v_produto from modulos m where m.id = new.modulo_id;
    if v_produto is null then raise exception 'modulo_sem_produto'; end if;

  elsif new.presente_id is not null then
    select p.produto_id into v_produto from presentes p where p.id = new.presente_id;
    if v_produto is null then raise exception 'presente_sem_produto'; end if;

  else
    v_produto := new.produto_id;
  end if;

  new.produto_id := v_produto;
  return new;
end $$;

drop trigger if exists conteudo_coerente on conteudos;
create trigger conteudo_coerente
  before insert or update on conteudos
  for each row execute function conteudo_herda_o_produto();

-- ---------------------------------------------------------------------
-- 6. RLS
-- ---------------------------------------------------------------------
-- `produtos` segue a regra das irmãs (`catalogo_modulos_*`): a aluna lê
-- o que está publicado com a conta ativa; a equipe lê tudo; só admin
-- escreve. A leitura NÃO é liberação — ver que o produto existe é o que
-- já acontece hoje com módulos e presentes. Quem pode ABRIR continua
-- decidido por `acessos`, na migration 0028.
alter table produtos enable row level security;

drop policy if exists catalogo_produtos_leitura on produtos;
create policy catalogo_produtos_leitura on produtos
  for select using ((publicado and conta_ativa()) or eh_equipe());

drop policy if exists catalogo_produtos_escrita on produtos;
create policy catalogo_produtos_escrita on produtos
  for all using (eh_admin()) with check (eh_admin());

-- `conteudos` ganha a leitura na 0028, junto com `pode_ver_produto`.
-- Até lá, só admin — que é o estado seguro para uma tabela vazia.
alter table conteudos enable row level security;

drop policy if exists catalogo_conteudos_escrita on conteudos;
create policy catalogo_conteudos_escrita on conteudos
  for all using (eh_admin()) with check (eh_admin());

revoke execute on function conteudo_herda_o_produto() from public, anon;
