-- A equipe.
--
-- Quem aparece aqui não é aluna: é gente que trabalha no painel. São
-- duas funções, e a diferença entre elas é o que a porta `eh_equipe()`
-- deixa passar (ver a 0022):
--
--   administrador — o painel inteiro, menos esta aba.
--   suporte       — comentários (responder), cadastrar/remover/bloquear
--                   aluna, e a ficha dela. Mais nada.
--
-- Criar colaborador não está aqui porque exige escrever em `auth.users`,
-- e isso só a chave de serviço pode: fica na Edge Function
-- `cadastrar-colaborador`, que confere `papel = 'dono'` no banco antes
-- de qualquer coisa.
--
-- Todas as funções abaixo devolvem em silêncio quando quem chamou não
-- é o dono. Silêncio e não erro: um erro diria "existe algo aqui que
-- você quase pôde fazer", e não há nada a contar.

-- ---- a lista ----
--
-- O administrador vê a aba, porque ele "faz tudo no painel". O que ele
-- não vê é o código de ninguém — nem o do dono, nem o dos colegas. Com
-- o código na mão, um administrador entraria como o dono, e a regra de
-- que só o dono mexe na equipe viraria enfeite.

create or replace function equipe_do_painel()
returns table (
  id uuid, nome text, login text, papel papel_usuario,
  status status_conta, codigo text,
  criada_em timestamptz, ultimo_acesso_em timestamptz,
  sou_eu boolean
)
language sql stable security definer set search_path = public as $$
  select p.id, p.nome, p.login, p.papel, p.status,
         case when eh_dono() then c.codigo end,
         p.criada_em, p.ultimo_acesso_em,
         p.id = auth.uid()
  from profiles p
  left join credenciais c on c.aluna_id = p.id
  where eh_admin()
    and p.papel in ('dono', 'admin', 'suporte')
  order by case p.papel
             when 'dono' then 0 when 'admin' then 1 else 2
           end,
           p.nome;
$$;

-- ---- remover ----
--
-- O perfil sai, e a cascata leva a credencial junto. A linha de
-- `auth.users` fica: apagá-la exige a chave de serviço, e conta sem
-- perfil não entra em lugar nenhum — `verificar_codigo()` procura o
-- perfil primeiro e desiste quando não acha.
--
-- Duas recusas de propósito: ninguém remove a si mesmo (o painel ficaria
-- sem dono no meio de um clique) e ninguém remove o dono.

create or replace function remover_colaborador(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not eh_dono() then return; end if;
  if p_id = auth.uid() then return; end if;

  delete from profiles
   where id = p_id and papel in ('admin', 'suporte');
end;
$$;

-- ---- bloquear ----
--
-- Bloquear é o freio de mão: a conta continua existindo, com tudo que
-- ela fez, e simplesmente não entra mais. `verificar_codigo()` recusa
-- antes de conferir o código.

create or replace function bloquear_colaborador(p_id uuid, p_status status_conta)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not eh_dono() then return; end if;
  if p_id = auth.uid() then return; end if;

  update profiles
     set status = p_status
   where id = p_id and papel in ('admin', 'suporte');
end;
$$;

-- ---- trocar o código ----
--
-- Serve para a equipe e para as alunas: é o "esqueci o código" e o
-- "essa pessoa saiu, troca isso hoje". Zera a contagem de tentativas e
-- solta a tranca de quinze minutos — senão trocar o código de alguém
-- que errou cinco vezes não adiantaria nada até o relógio virar.

create or replace function mudar_codigo(p_id uuid, p_codigo text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not eh_dono() then return false; end if;
  if p_codigo !~ '^[0-9]{4,6}$' then return false; end if;

  update credenciais
     set codigo = p_codigo,
         tentativas_erradas = 0,
         travada_ate = null
   where aluna_id = p_id;

  return found;
end;
$$;

-- ---- alunas, pelo suporte ----
--
-- Bloquear e remover aluna o suporte pode. Pela RLS ele não poderia:
-- escrever em `profiles` continua sendo do administrador, e tem de
-- continuar, porque a mesma permissão que deixa mexer numa aluna
-- deixaria mexer no papel de quem quisesse. Então passa por aqui, onde
-- a porta é `eh_equipe()` e o alvo é conferido: `eh_aluna()` garante
-- que uma chamada montada à mão com o id do dono não faça nada.

create or replace function definir_status_aluna(p_aluna uuid, p_status status_conta)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not eh_equipe() then return; end if;
  if not eh_aluna(p_aluna) then return; end if;

  update profiles set status = p_status where id = p_aluna;
end;
$$;

create or replace function remover_aluna(p_aluna uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not eh_equipe() then return; end if;
  if not eh_aluna(p_aluna) then return; end if;

  delete from profiles where id = p_aluna;
end;
$$;

revoke execute on function equipe_do_painel()                       from anon;
revoke execute on function remover_colaborador(uuid)                from anon;
revoke execute on function bloquear_colaborador(uuid, status_conta) from anon;
revoke execute on function mudar_codigo(uuid, text)                 from anon;
revoke execute on function definir_status_aluna(uuid, status_conta) from anon;
revoke execute on function remover_aluna(uuid)                      from anon;
