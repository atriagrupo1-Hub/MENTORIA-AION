-- =====================================================================
-- Limite de tentativas por IP
--
-- A trava de `verificar_codigo()` é por conta: 5 erros e 15 minutos.
-- Ela protege uma aluna específica, mas não impede varrer muitas contas
-- em paralelo — com 4 dígitos são 10.000 combinações, e a lista de
-- nomes de acesso é curta e adivinhável.
--
-- Este limite é por origem, e vive no banco porque Edge Function não
-- guarda estado entre invocações: cada chamada roda num processo que
-- pode ser novo.
--
-- Só a chave de serviço chama. Nunca o navegador.
-- =====================================================================

create table tentativas_ip (
  ip             text primary key,
  contagem       integer not null default 0,
  janela_inicio  timestamptz not null default now()
);

alter table tentativas_ip enable row level security;
-- Sem política: nem aluna nem administradora leem. Só a chave de
-- serviço, que ignora RLS.

comment on table tentativas_ip is
  'Contagem de tentativas de login por origem, usada pela Edge Function `entrar`.';

-- Registra uma tentativa e diz se ela pode prosseguir.
-- A janela reinicia sozinha quando expira.
create or replace function registrar_tentativa_ip(
  p_ip     text,
  p_limite integer  default 20,
  p_janela interval default interval '15 minutes'
)
returns boolean language plpgsql volatile security definer set search_path = public as $$
declare
  v_contagem integer;
begin
  if p_ip is null or length(trim(p_ip)) = 0 then
    return true;  -- sem origem identificável, a trava por conta segue valendo
  end if;

  insert into tentativas_ip (ip, contagem, janela_inicio)
  values (p_ip, 1, now())
  on conflict (ip) do update
    set contagem = case
          when tentativas_ip.janela_inicio < now() - p_janela then 1
          else tentativas_ip.contagem + 1
        end,
        janela_inicio = case
          when tentativas_ip.janela_inicio < now() - p_janela then now()
          else tentativas_ip.janela_inicio
        end
  returning contagem into v_contagem;

  return v_contagem <= p_limite;
end;
$$;

revoke execute on function registrar_tentativa_ip(text, integer, interval)
  from public, anon, authenticated;

-- Zera a contagem de uma origem depois de um acesso bem-sucedido.
create or replace function limpar_tentativas_ip(p_ip text)
returns void language sql volatile security definer set search_path = public as $$
  delete from tentativas_ip where ip = p_ip;
$$;

revoke execute on function limpar_tentativas_ip(text)
  from public, anon, authenticated;

-- Faxina das janelas velhas, para a tabela não crescer sem limite.
create or replace function faxina_tentativas_ip()
returns integer language sql volatile security definer set search_path = public as $$
  with apagadas as (
    delete from tentativas_ip
    where janela_inicio < now() - interval '1 day'
    returning 1
  )
  select count(*)::integer from apagadas;
$$;

revoke execute on function faxina_tentativas_ip() from public, anon, authenticated;
