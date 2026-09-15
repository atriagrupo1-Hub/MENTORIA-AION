-- =====================================================================
-- Conserto: a resposta não era aceita, e o erro não era o que parecia
--
-- A migração 0013 pôs a regra de um nível dentro da política de
-- escrita — a linha só entra se o alvo for um comentário publicado, da
-- mesma aula, que não seja ele mesmo uma resposta:
--
--   exists (select 1 from comentarios pai
--           where pai.id = comentarios.resposta_a
--             and pai.resposta_a is null ...)
--
-- Toda tentativa de responder voltava com:
--
--   42501: permission denied for table comentarios
--
-- Parece falta de permissão para ESCREVER. Não é. É falta de permissão
-- para LER, dentro da própria conferência.
--
-- Nesta base as permissões são por coluna (migração 0003): coluna nova
-- nasce sem nenhum privilégio, e o que a 0013 concedeu em `resposta_a`
-- foi só INSERT. Só que a subconsulta de uma política roda com o
-- privilégio de quem está escrevendo — e ali ela precisa LER
-- `pai.resposta_a` para saber se o alvo já é uma resposta. A aluna não
-- tem esse SELECT. A escrita morre antes de a regra ser avaliada.
--
-- ---------------------------------------------------------------------
-- Por que não basta conceder o SELECT
--
-- Conceder `select (resposta_a)` a `authenticated` resolveria a
-- mensagem e abriria a coluna para qualquer consulta vinda do
-- navegador, não só para esta conferência. Seria trocar uma regra de
-- banco por uma permissão larga para calar um erro — exatamente o que
-- esta base evita em todo o resto.
--
-- A conferência vira uma função que roda como dona. Ela não pergunta
-- nada ao navegador e não devolve nada: responde sim ou não sobre um
-- comentário cujo identificador quem pergunta já tinha em mãos. As
-- colunas continuam fechadas, e a regra continua sendo condição de
-- escrita — não conselho de tela.
-- =====================================================================

create or replace function pode_responder(p_pai uuid, p_aula uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from comentarios pai
    where pai.id = p_pai
      and pai.aula_id = p_aula
      and pai.resposta_a is null
      and pai.status = 'publicado'
  );
$$;

comment on function pode_responder(uuid, uuid) is
  'O comentário alvo aceita resposta? Publicado, da mesma aula, e não sendo ele próprio uma resposta — é isto que mantém a conversa em um nível só. Roda como dona porque as colunas de comentarios são fechadas ao navegador.';

revoke execute on function pode_responder(uuid, uuid) from public, anon;
grant execute on function pode_responder(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- A mesma política, com a conferência do lado de dentro da função
-- ---------------------------------------------------------------------

drop policy if exists comentarios_insere on comentarios;

create policy comentarios_insere on comentarios
  for insert with check (
    autora_id = auth.uid()

    -- A aluna precisa da aula liberada. A administradora não tem
    -- liberação — ela é admin, que é como o resto do banco já a
    -- reconhece. Sem este `or`, ela não responde ninguém.
    and (pode_ver_aula(aula_id) or eh_admin())

    and exists (
      select 1 from aulas a
      where a.id = comentarios.aula_id and a.comentarios_ativos
    )

    and (resposta_a is null or pode_responder(resposta_a, aula_id))
  );
