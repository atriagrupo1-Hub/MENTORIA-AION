-- =====================================================================
-- Validade do acesso, individual por aluna
--
-- A mentoria é vendida com prazo, e cada aluna entra numa data
-- diferente. Até aqui o banco não sabia disso: uma vez liberada, a
-- aluna via o conteúdo para sempre, e só um bloqueio manual no painel
-- encerrava o acesso. Com dezenas de matrículas por mês isso vira
-- trabalho impossível de lembrar, e acesso vitalício vendido como anual.
--
-- `acesso_ate` guarda o instante em que o acesso termina. Nulo quer
-- dizer sem prazo — é o caso da administradora, e das contas de teste
-- que você quiser deixar abertas.
--
-- A conferência entra em `conta_ativa()`, e não em cada função de
-- permissão. `conta_ativa()` já é chamada nos onze pontos que decidem o
-- que uma aluna enxerga: aulas, presentes, aulas ao vivo, progresso,
-- comentários e curtidas. Uma linha aqui fecha todas as portas de uma
-- vez, sem chance de esquecer alguma — que é como uma regra de acesso
-- deve ser escrita.
--
-- Vencido o prazo, o acesso não some do banco: a aluna continua
-- existindo, com progresso e comentários preservados. Basta empurrar a
-- data para tudo voltar exatamente como estava.
-- =====================================================================

alter table profiles
  add column if not exists acesso_ate timestamptz;

comment on column profiles.acesso_ate is
  'Instante em que o acesso da aluna termina. Nulo = sem prazo. Conferido por conta_ativa().';

-- Só as linhas com prazo interessam à varredura de vencimentos.
create index if not exists profiles_acesso_ate_idx
  on profiles (acesso_ate) where acesso_ate is not null;

-- ---------------------------------------------------------------------
-- A porta única
-- ---------------------------------------------------------------------
create or replace function conta_ativa()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and status = 'ativa'
      and (acesso_ate is null or acesso_ate > now())
  );
$$;

-- ---------------------------------------------------------------------
-- O perfil passa a dizer até quando
--
-- A aluna precisa saber que o prazo dela existe e quando termina; é
-- informação dela, não segredo. Trocar o tipo de retorno exige recriar.
-- ---------------------------------------------------------------------
drop function if exists meu_perfil();

create or replace function meu_perfil()
returns table (id uuid, nome text, login text, papel papel_usuario,
               status status_conta, primeiro_acesso_em timestamptz,
               criada_em timestamptz, acesso_ate timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.nome, p.login, p.papel, p.status, p.primeiro_acesso_em,
         p.criada_em, p.acesso_ate
  from profiles p where p.id = auth.uid();
$$;

revoke all on function meu_perfil() from public;
grant execute on function meu_perfil() to authenticated;

-- ---------------------------------------------------------------------
-- Definir e esticar o prazo
--
-- Duas funções em vez de um UPDATE solto no painel, por dois motivos.
--
-- Primeiro, esticar exige ler a data atual e somar; feito no navegador
-- isso é ler-modificar-gravar, e dois cliques rápidos perdem um dos
-- acréscimos. Aqui a soma acontece dentro do banco, numa instrução só.
--
-- Segundo, a data-base de cada operação é uma regra do produto, não uma
-- escolha de tela: definir conta a partir do cadastro, esticar conta a
-- partir do fim vigente. Escrito aqui, vale para qualquer tela que
-- venha depois.
-- ---------------------------------------------------------------------

/**
 * Define o prazo contando a partir da data de cadastro da aluna.
 * Zero em tudo remove o prazo (acesso sem fim).
 */
create or replace function definir_acesso(
  p_aluna uuid, p_dias int default 0, p_meses int default 0, p_anos int default 0
) returns timestamptz
language plpgsql volatile security definer set search_path = public as $$
declare
  v_nova timestamptz;
begin
  if not eh_admin() then
    raise exception 'sem_permissao';
  end if;
  if p_dias < 0 or p_meses < 0 or p_anos < 0 then
    raise exception 'prazo_negativo';
  end if;

  if p_dias = 0 and p_meses = 0 and p_anos = 0 then
    update profiles set acesso_ate = null where id = p_aluna returning acesso_ate into v_nova;
  else
    update profiles
       set acesso_ate = criada_em
                      + make_interval(years => p_anos, months => p_meses, days => p_dias)
     where id = p_aluna
     returning acesso_ate into v_nova;
  end if;

  if not found then
    raise exception 'aluna_inexistente';
  end if;
  return v_nova;
end;
$$;

/**
 * Acrescenta tempo ao prazo vigente.
 *
 * Se o prazo já venceu, conta a partir de agora — senão, renovar uma
 * aluna parada há três meses daria um acesso que já nasce vencido.
 * Sem prazo definido, também conta de agora: é o primeiro prazo dela.
 */
create or replace function estender_acesso(
  p_aluna uuid, p_dias int default 0, p_meses int default 0, p_anos int default 0
) returns timestamptz
language plpgsql volatile security definer set search_path = public as $$
declare
  v_nova timestamptz;
begin
  if not eh_admin() then
    raise exception 'sem_permissao';
  end if;
  if p_dias < 0 or p_meses < 0 or p_anos < 0 then
    raise exception 'prazo_negativo';
  end if;
  if p_dias = 0 and p_meses = 0 and p_anos = 0 then
    raise exception 'prazo_vazio';
  end if;

  update profiles
     set acesso_ate = greatest(coalesce(acesso_ate, now()), now())
                    + make_interval(years => p_anos, months => p_meses, days => p_dias)
   where id = p_aluna
   returning acesso_ate into v_nova;

  if not found then
    raise exception 'aluna_inexistente';
  end if;
  return v_nova;
end;
$$;

revoke all on function definir_acesso(uuid, int, int, int) from public;
revoke all on function estender_acesso(uuid, int, int, int) from public;
grant execute on function definir_acesso(uuid, int, int, int) to authenticated;
grant execute on function estender_acesso(uuid, int, int, int) to authenticated;
