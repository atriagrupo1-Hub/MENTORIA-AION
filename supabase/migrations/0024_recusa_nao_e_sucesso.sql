-- Recusar não é ter dado certo.
--
-- Cinco funções do painel eram `returns void` e, quando a pessoa não
-- tinha permissão, faziam um `return;` seco. Do lado de fora isso é
-- indistinguível de sucesso: o PostgREST devolve 200, o painel não vê
-- erro nenhum e mostra "ANNIE foi bloqueada." — sem que uma única linha
-- tenha mudado no banco. Foi exatamente o que aconteceu em produção:
-- a aluna continuou `ativa` enquanto a tela dizia que estava bloqueada.
--
-- O que torna isso grave é o que vem antes. O navegador guarda a sessão
-- e, quando o token vence e a renovação falha, os pedidos seguintes
-- saem como `anon` — sem que o app perceba. Aí:
--
--   - `eh_equipe()` e `eh_admin()` respondem "não" (com razão),
--   - a função sai em silêncio,
--   - e o painel informa que gravou.
--
-- Uma recusa tem que ser audível. A partir daqui elas levantam
-- `sem_permissao`, que o painel já sabe tratar — ele relê a sessão e
-- manda a pessoa entrar de novo, em vez de deixá-la clicando contra uma
-- parede achando que está trabalhando.

create or replace function public.definir_status_aluna(p_aluna uuid, p_status status_conta)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not eh_equipe() then raise exception 'sem_permissao'; end if;
  if not eh_aluna(p_aluna) then raise exception 'alvo_nao_e_aluna'; end if;

  update profiles set status = p_status where id = p_aluna;
  if not found then raise exception 'aluna_nao_encontrada'; end if;
end;
$$;

create or replace function public.remover_aluna(p_aluna uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not eh_equipe() then raise exception 'sem_permissao'; end if;
  if not eh_aluna(p_aluna) then raise exception 'alvo_nao_e_aluna'; end if;

  delete from profiles where id = p_aluna;
  if not found then raise exception 'aluna_nao_encontrada'; end if;
end;
$$;

create or replace function public.moderar_comentario(p_comentario uuid, p_status status_comentario)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not eh_admin() then raise exception 'sem_permissao'; end if;

  update comentarios
     set status = p_status, moderado_por = auth.uid(), moderado_em = now()
   where id = p_comentario;
  if not found then raise exception 'comentario_nao_encontrado'; end if;
end;
$$;

-- As duas travas da equipe continuam iguais; o que muda é que agora
-- elas DIZEM que travaram. "Ninguém se remove sozinho" precisa aparecer
-- na tela — antes o botão simplesmente não fazia nada.
create or replace function public.remover_colaborador(p_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not eh_dono() then raise exception 'sem_permissao'; end if;
  if p_id = auth.uid() then raise exception 'nao_remove_a_si_mesmo'; end if;

  delete from profiles where id = p_id and papel in ('admin', 'suporte');
  if not found then raise exception 'colaborador_nao_encontrado'; end if;
end;
$$;

create or replace function public.bloquear_colaborador(p_id uuid, p_status status_conta)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not eh_dono() then raise exception 'sem_permissao'; end if;
  if p_id = auth.uid() then raise exception 'nao_bloqueia_a_si_mesmo'; end if;

  update profiles set status = p_status
   where id = p_id and papel in ('admin', 'suporte');
  if not found then raise exception 'colaborador_nao_encontrado'; end if;
end;
$$;


-- Visitante não administra.
--
-- Seis funções do painel estavam concedidas a `anon` — o papel de quem
-- não tem sessão nenhuma. Elas se defendem sozinhas por dentro
-- (`eh_dono()`, `eh_equipe()`), então não havia porta aberta; o dano era
-- outro: com o `return;` silencioso acima, uma chamada sem token era
-- aceita, recusada por dentro e relatada como sucesso.
--
-- Nenhuma delas tem razão para ser chamada sem sessão. Tirando a
-- concessão, uma chamada sem token passa a falhar no portão do banco,
-- alto e claro, antes de chegar na função.
revoke execute on function public.definir_status_aluna(uuid, status_conta) from anon;
revoke execute on function public.remover_aluna(uuid) from anon;
revoke execute on function public.remover_colaborador(uuid) from anon;
revoke execute on function public.bloquear_colaborador(uuid, status_conta) from anon;
revoke execute on function public.mudar_codigo(uuid, text) from anon;
revoke execute on function public.equipe_do_painel() from anon;

-- `eh_dono`, `eh_equipe` e `eh_aluna` também estavam abertas a `anon`.
-- São perguntas, não ações, e respondem "não" sem sessão — mas não há
-- motivo para um visitante poder interrogar o banco sobre papéis.
revoke execute on function public.eh_dono() from anon;
revoke execute on function public.eh_equipe() from anon;
revoke execute on function public.eh_aluna(uuid) from anon;
