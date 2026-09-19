-- ---------------------------------------------------------------------
-- 0028 — Os portões do produto e do conteúdo
-- ---------------------------------------------------------------------
-- A regra que esta migration existe para não quebrar:
--
--   ONDE O PRODUTO APARECE  !=  QUEM PODE ABRI-LO
--
-- Mover um produto de categoria muda a vitrine. Não toca em `acessos`,
-- não concede nada, não tira nada. O acesso à mentoria continua sendo
-- aula a aula (escopo `aula`, com o cronograma) e o do acervo continua
-- sendo por presente ou por categoria. Nada disso muda aqui.
--
-- O que é novo é o portão de um produto cujo conteúdo é DIRETO — um
-- e-book, um documentário — porque esse conteúdo não pendura em aula
-- nem em presente, e sem portão próprio ficaria aberto. `pode_ver_
-- produto` é escrito espelhando `pode_ver_presente`, com os mesmos
-- quatro testes.
-- ---------------------------------------------------------------------

alter table acessos add column if not exists produto_id uuid references produtos(id) on delete cascade;
create index if not exists acessos_por_produto on acessos (produto_id) where produto_id is not null;

-- ---------------------------------------------------------------------
-- 1. PODE VER O PRODUTO
-- ---------------------------------------------------------------------
-- Publicado, não bloqueado (nem ele nem a categoria), conta ativa, e
-- uma linha em `acessos`. Idêntico em forma a `pode_ver_presente` —
-- de propósito: duas regras de liberação escritas de jeitos diferentes
-- é como uma delas fica para trás.
create or replace function pode_ver_produto(p_produto uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from produtos p
    join categorias c on c.id = p.categoria_id
    where p.id = p_produto
      and p.publicado
      and not p.bloqueado_geral and not c.bloqueada_geral
      and conta_ativa()
      and exists (
        select 1 from acessos ac
        where ac.aluna_id = auth.uid()
          and (ac.escopo = 'acervo'
            or (ac.escopo = 'categoria' and ac.categoria_id = p.categoria_id)
            or (ac.escopo = 'produto'   and ac.produto_id   = p.id))
          and (ac.abre_em is null or ac.abre_em <= now())
      )
  );
$$;

-- ---------------------------------------------------------------------
-- 2. PODE VER A SEÇÃO
-- ---------------------------------------------------------------------
-- Conteúdo pendurado num módulo, sem aula, é material da seção. Abre
-- quando a seção abriu — e "a seção abriu" já tem uma definição em uso
-- neste banco, a de `pode_ver_ao_vivo`: ao menos uma aula do módulo já
-- está aberta para ela. Reaproveitada aqui em vez de inventar a
-- segunda definição da mesma coisa.
create or replace function pode_ver_modulo(p_modulo uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from modulos m
    where m.id = p_modulo
      and m.publicado and not m.bloqueado_geral
      and conta_ativa()
      and (
        exists (
          select 1 from aulas a
          join acessos ac on ac.aula_id = a.id
                         and ac.aluna_id = auth.uid()
                         and ac.escopo = 'aula'
          where a.modulo_id = m.id
            and a.publicado and not a.bloqueado_geral
            and (ac.abre_em is null or ac.abre_em <= now())
        )
        or (m.produto_id is not null and pode_ver_produto(m.produto_id))
      )
  );
$$;

-- ---------------------------------------------------------------------
-- 3. PODE VER O CONTEÚDO
-- ---------------------------------------------------------------------
-- O conteúdo não tem regra própria: herda a do dono. É o que garante
-- que acrescentar um áudio a uma aula não abre a aula para ninguém.
create or replace function pode_ver_conteudo(p_conteudo uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from conteudos k
    where k.id = p_conteudo
      and k.publicado
      and case
            when k.aula_id     is not null then pode_ver_aula(k.aula_id)
            when k.presente_id is not null then pode_ver_presente(k.presente_id)
            when k.modulo_id   is not null then pode_ver_modulo(k.modulo_id)
            else pode_ver_produto(k.produto_id)
          end
  );
$$;

-- Endereço do vídeo de um conteúdo, no mesmo desenho de
-- `video_da_aula`: sai do servidor só depois da conferência.
create or replace function video_do_conteudo(p_conteudo uuid)
returns table (provider text, ref text)
language sql stable security definer set search_path = public as $$
  select k.video_provider, k.video_ref
  from conteudos k
  where k.id = p_conteudo
    and k.tipo = 'video'
    and k.video_ref is not null
    and pode_ver_conteudo(p_conteudo);
$$;

-- ---------------------------------------------------------------------
-- 4. LEITURA DE `conteudos`
-- ---------------------------------------------------------------------
-- Escrita direto sobre as colunas da própria linha, sem passar por
-- `pode_ver_conteudo`: a função leria `conteudos` de novo, e política
-- que relê a tabela que ela protege é o caminho mais curto para uma
-- recursão.
drop policy if exists catalogo_conteudos_leitura on conteudos;
create policy catalogo_conteudos_leitura on conteudos
  for select using (
    eh_equipe()
    or (
      publicado
      and case
            when aula_id     is not null then pode_ver_aula(aula_id)
            when presente_id is not null then pode_ver_presente(presente_id)
            when modulo_id   is not null then pode_ver_modulo(modulo_id)
            else pode_ver_produto(produto_id)
          end
    )
  );

-- ---------------------------------------------------------------------
-- 5. PERMISSÕES DE EXECUÇÃO
-- ---------------------------------------------------------------------
-- A armadilha que isto evita: a chamada de função dentro de uma
-- política roda com o privilégio de QUEM CONSULTA. Faltando EXECUTE, a
-- política não nega — ela estoura com `permission denied for function`,
-- e a tela mostra erro no lugar de uma lista vazia.
grant execute on function pode_ver_produto(uuid)  to authenticated;
grant execute on function pode_ver_modulo(uuid)   to authenticated;
grant execute on function pode_ver_conteudo(uuid) to authenticated;
grant execute on function video_do_conteudo(uuid) to authenticated;

revoke execute on function pode_ver_produto(uuid)  from public, anon;
revoke execute on function pode_ver_modulo(uuid)   from public, anon;
revoke execute on function pode_ver_conteudo(uuid) from public, anon;
revoke execute on function video_do_conteudo(uuid) from public, anon;
