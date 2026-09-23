-- ---------------------------------------------------------------------
-- 0035 — Fechar o que o visitante não precisa, e devolver o código
-- ---------------------------------------------------------------------
-- 1. O VISITANTE FALA DEMAIS
--
-- O linter do Supabase apontou dez funções `security definer`
-- alcançáveis pelo papel `anon`. Testei as dez como `anon` de verdade:
-- nenhuma causa estrago — `eh_admin()` e `eh_dono()` devolvem falso sem
-- `auth.uid()`, e as escritas recusam. Mas quatro delas RESPONDEM:
--
--   eh_aluna(uuid)     diz a um estranho se um id é de aluna
--   eh_dono()          diz falso, mas confirma que a função existe
--   eh_equipe()        idem
--   equipe_do_painel() devolve lista vazia, e poderia não devolver
--
-- Nenhuma é buraco hoje. Todas são superfície que não serve para nada
-- antes do login: a área da aluna só as chama depois de entrar. Fechar
-- custa quatro linhas, e tira a pergunta de cima da mesa.
--
-- As outras seis já recusavam e continuam recusando; o `revoke` aqui é
-- o cinto além do suspensório.
-- ---------------------------------------------------------------------

-- `revoke ... from anon` sozinho NÃO resolve: o EXECUTE dessas funções
-- vem de PUBLIC, e o papel `anon` herda dele. Tirar de PUBLIC e devolver
-- explicitamente a quem precisa — medido: com o `from anon` sozinho, o
-- visitante continuava chamando `eh_aluna` e `eh_dono`.

revoke execute on function eh_aluna(uuid) from public, anon;
grant execute on function eh_aluna(uuid) to authenticated, service_role;

revoke execute on function eh_dono() from public, anon;
grant execute on function eh_dono() to authenticated, service_role;

revoke execute on function eh_equipe() from public, anon;
grant execute on function eh_equipe() to authenticated, service_role;

revoke execute on function equipe_do_painel() from public, anon;
grant execute on function equipe_do_painel() to authenticated, service_role;

revoke execute on function bloquear_colaborador(uuid, status_conta) from public, anon;
grant execute on function bloquear_colaborador(uuid, status_conta) to authenticated;

revoke execute on function definir_status_aluna(uuid, status_conta) from public, anon;
grant execute on function definir_status_aluna(uuid, status_conta) to authenticated;

revoke execute on function gerar_cronograma_de_aulas(uuid, uuid[], integer, timestamptz) from public, anon;
grant execute on function gerar_cronograma_de_aulas(uuid, uuid[], integer, timestamptz) to authenticated;

revoke execute on function remover_aluna(uuid) from public, anon;
grant execute on function remover_aluna(uuid) to authenticated;

revoke execute on function remover_colaborador(uuid) from public, anon;
grant execute on function remover_colaborador(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 2. TROCAR O PRÓPRIO CÓDIGO
--
-- `mudar_codigo` exigia `eh_dono()`. Quem está logado não tinha como
-- trocar o próprio código — nem a aluna que desconfia que alguém viu o
-- dela, nem a colaboradora.
--
-- Agora quem está logado troca o SEU, e o dono continua trocando o de
-- qualquer um. Trocar o próprio já exige saber o antigo: sem ele não se
-- entra, e sem entrar não há `auth.uid()`.
--
-- Isso NÃO resolve o dono que esqueceu o código e está do lado de fora
-- — nada dentro do aplicativo resolve, e um caminho que resolvesse
-- seria um caminho para invadir. Esse caso se resolve no SQL do
-- Supabase, e está escrito em `Recuperar o acesso do dono.md`.
-- ---------------------------------------------------------------------

create or replace function mudar_codigo(p_id uuid, p_codigo text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  -- O dono muda o de qualquer um; os demais, só o próprio.
  if not (eh_dono() or p_id = auth.uid()) then
    return false;
  end if;

  if p_codigo !~ '^[0-9]{4,6}$' then
    return false;
  end if;

  update credenciais
     set codigo = p_codigo,
         tentativas_erradas = 0,
         travada_ate = null
   where aluna_id = p_id;

  return found;
end;
$$;

revoke execute on function mudar_codigo(uuid, text) from public, anon;
grant execute on function mudar_codigo(uuid, text) to authenticated;
