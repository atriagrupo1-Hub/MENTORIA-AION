-- =====================================================================
-- Respostas nos comentários, e o selo de Instrutor
--
-- Até aqui a seção era um mural: cada aluna deixava o seu recado e
-- ninguém falava com ninguém. Com resposta, vira conversa — e é isso
-- que faz uma turma se reconhecer.
--
-- ---------------------------------------------------------------------
-- Um nível, e o banco é quem garante
--
-- Comentário e respostas embaixo dele. Sem resposta de resposta.
--
-- Não é preguiça: no celular, cada nível de recuo come largura, e a
-- partir do terceiro o texto vira uma coluna estreita encostada na
-- borda. Instagram e YouTube achataram em um nível pela mesma razão.
--
-- A regra podia morar só na tela, mas tela se contorna: bastaria
-- alterar o pedido no navegador. Aqui ela é condição de escrita — a
-- linha nem entra se o alvo já for uma resposta.
--
-- ---------------------------------------------------------------------
-- O conserto que este arquivo também traz
--
-- A administradora NÃO CONSEGUIA COMENTAR. A política exigia
-- `pode_ver_aula()`, que pede uma linha em `acessos` para quem está
-- pedindo — e ela não tem: enxerga todas as aulas por ser admin, o que
-- é outra coisa. Na prática, o selo de Instrutor nunca apareceria,
-- porque ela não conseguiria escrever a resposta.
--
-- Isso já era verdade antes das respostas, para comentário comum. Só
-- não tinha aparecido porque ninguém tentou.
--
-- ---------------------------------------------------------------------
-- Duas coisas aqui estavam erradas, e as duas seguintes consertam
--
-- 0014 — a conferência de um nível lia `pai.resposta_a` com o
--        privilégio de quem escreve, e essa coluna não é concedida
--        para leitura. Nenhuma resposta entrava.
-- 0015 — `comentarios_da_aula()` continuava exigindo `pode_ver_aula()`,
--        então a instrutora respondia sem enxergar a conversa.
--
-- Este arquivo fica como está: aplicado nesta ordem, o resultado é o
-- certo. Reescrevê-lo apagaria de onde veio o conserto.
-- =====================================================================

alter table comentarios
  add column if not exists resposta_a uuid references comentarios(id) on delete cascade;

comment on column comentarios.resposta_a is
  'O comentário que esta linha responde. Nulo = comentário de primeiro nível. Só aponta para um comentário que não seja, ele mesmo, uma resposta: a conversa tem um nível só.';

-- Buscar as respostas de um comentário é a consulta mais frequente da
-- seção; sem índice ela varre a tabela inteira a cada aula aberta.
create index if not exists comentarios_resposta_a_idx
  on comentarios (resposta_a) where resposta_a is not null;

grant insert (resposta_a) on comentarios to authenticated;

-- ---------------------------------------------------------------------
-- Quem pode escrever, e o quê
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

    -- Um nível. A resposta tem de apontar para um comentário publicado,
    -- da MESMA aula, que não seja ele próprio uma resposta.
    and (
      resposta_a is null
      or exists (
        select 1 from comentarios pai
        where pai.id = comentarios.resposta_a
          and pai.aula_id = comentarios.aula_id
          and pai.resposta_a is null
          and pai.status = 'publicado'
      )
    )
  );

-- ---------------------------------------------------------------------
-- A leitura: a conversa montada, e quem é o instrutor
--
-- `eh_instrutor` sai do papel de quem escreveu, conferido aqui dentro.
-- A tela não decide isso — ela não tem como saber, porque o papel das
-- outras alunas não é legível pelo navegador.
--
-- Resposta cuja raiz foi ocultada some junto. Moderar o comentário de
-- cima e deixar as respostas órfãs penduradas seria deixar metade da
-- conversa no ar, sem o que ela respondia.
-- ---------------------------------------------------------------------

drop function if exists comentarios_da_aula(uuid);

create function comentarios_da_aula(p_aula uuid)
returns table (
  id uuid,
  aula_id uuid,
  texto text,
  posicao_segundos integer,
  criado_em timestamptz,
  autora_nome text,
  minha boolean,
  resposta_a uuid,
  eh_instrutor boolean
) language sql stable security definer set search_path = public as $$
  select c.id,
         c.aula_id,
         c.texto,
         c.posicao_segundos,
         c.criado_em,
         case when c.nome_visivel then p.nome end,
         c.autora_id = auth.uid(),
         c.resposta_a,
         coalesce(p.papel = 'admin', false)
  from comentarios c
  left join profiles p   on p.id = c.autora_id
  left join comentarios pai on pai.id = c.resposta_a
  where c.aula_id = p_aula
    and c.status = 'publicado'
    and (c.resposta_a is null or pai.status = 'publicado')
    and pode_ver_aula(p_aula)
  -- Conversa mais recente em cima; dentro dela, a pergunta primeiro e as
  -- respostas na ordem em que foram escritas, que é a ordem de quem lê.
  order by coalesce(pai.criado_em, c.criado_em) desc,
           c.resposta_a nulls first,
           c.criado_em asc;
$$;

revoke execute on function comentarios_da_aula(uuid) from public, anon;
grant execute on function comentarios_da_aula(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Moderação: a tela precisa distinguir resposta de comentário
-- ---------------------------------------------------------------------

drop function if exists comentarios_para_moderacao(uuid);

create function comentarios_para_moderacao(p_aula uuid default null)
returns table (
  id uuid, aula_id uuid, modulo_numero smallint, aula_numero smallint,
  autora_id uuid, autora_nome text, texto text, posicao_segundos integer,
  status status_comentario, criado_em timestamptz,
  resposta_a uuid, eh_instrutor boolean
) language sql stable security definer set search_path = public as $$
  select c.id, c.aula_id, m.numero, a.numero,
         c.autora_id, p.nome, c.texto, c.posicao_segundos,
         c.status, c.criado_em,
         c.resposta_a, coalesce(p.papel = 'admin', false)
  from comentarios c
  join aulas a    on a.id = c.aula_id
  join modulos m  on m.id = a.modulo_id
  join profiles p on p.id = c.autora_id
  where eh_admin()
    and (p_aula is null or c.aula_id = p_aula)
  order by c.criado_em desc;
$$;

revoke execute on function comentarios_para_moderacao(uuid) from public, anon;
grant execute on function comentarios_para_moderacao(uuid) to authenticated;
