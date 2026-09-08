-- =====================================================================
-- Primeira conta de administradora
--
-- NÃO é uma migration, e NÃO deve ser versionada com o código real.
-- É o procedimento; troque os dois valores marcados e rode uma vez no
-- SQL Editor do Supabase.
--
-- O código de acesso é uma credencial: não entra no Git, não entra em
-- migration, não entra em mensagem. Fica no banco, legível apenas por
-- quem tem papel de administradora, que é o desenho do item (E) do
-- modelo de dados.
--
-- O Auth exige um identificador para a conta existir. As alunas entram
-- por nome + código de 4 números e não têm e-mail; a conta de
-- administradora precisa de um, só para existir no Auth. A senha
-- gravada é aleatória e nunca usada — o acesso é sempre pelo código,
-- conferido no servidor por `verificar_codigo()`.
-- =====================================================================

do $$
declare
  v_id     uuid := gen_random_uuid();
  v_email  text := 'TROQUE@exemplo.com';   -- <- e-mail da administradora
  v_codigo text := '000000';               -- <- 6 dígitos, escolhidos por você
begin
  -- As colunas de token vão como string vazia, NUNCA nulas.
  --
  -- Custou uma depuração: o Auth lê `confirmation_token`,
  -- `recovery_token`, `email_change`, `reauthentication_token` e as
  -- outras como texto simples, e quebra ao encontrar nulo. O sintoma é
  -- "Database error loading user" na primeira vez que alguém tenta
  -- entrar — a conta parece existir e o login falha com 503.
  --
  -- Só acontece porque a linha é inserida à mão, o que é o caminho aqui:
  -- as alunas não têm e-mail nem senha, então a API administrativa do
  -- Auth não serve. `phone` fica nulo mesmo — ele é opcional de verdade.
  insert into auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token,
    email_change, email_change_token_new, email_change_token_current,
    phone_change, phone_change_token, reauthentication_token,
    created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    v_email,
    -- senha aleatória e descartável: o acesso é pelo código
    crypt(gen_random_uuid()::text || gen_random_uuid()::text, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"nome":"Administradora"}'::jsonb,
    '', '', '', '', '', '', '', '',
    now(), now()
  );

  insert into public.profiles (id, nome, login, papel, status)
  values (v_id, 'Administradora', 'admin', 'admin', 'ativa');

  insert into public.credenciais (aluna_id, codigo)
  values (v_id, v_codigo);
end $$;

-- Conferência: deve devolver a conta, sem mostrar o código.
select p.nome, p.login, p.papel, p.status, u.email,
       length(c.codigo) as digitos_do_codigo
from public.profiles p
join auth.users u        on u.id = p.id
join public.credenciais c on c.aluna_id = p.id
where p.papel = 'admin';

-- E o login por nome + código deve funcionar:
-- select verificar_codigo('admin', '<o codigo>') is not null;
