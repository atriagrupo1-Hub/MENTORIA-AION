-- =====================================================================
-- O mesmo furo, do outro lado: a instrutora escrevia sem enxergar
--
-- A 0014 devolveu à administradora o direito de responder. Só que
-- `comentarios_da_aula()` continuava exigindo `pode_ver_aula()`, que
-- pede uma linha em `acessos` para quem pergunta — e ela não tem.
--
-- O resultado seria uma tela cruel de tão boba: a seção de comentários
-- vazia para ela, em toda aula, com a caixa de escrever embaixo. Ela
-- responderia no escuro, ou concluiria que ninguém comentou nada.
--
-- Isto não apareceu no teste da escrita porque escrita e leitura são
-- duas funções diferentes, e eu só tinha consertado uma. Apareceu ao
-- conferir a leitura logo depois, com a resposta já gravada no banco e
-- a consulta devolvendo zero linhas.
--
-- O `or eh_admin()` não afrouxa nada: pela moderação ela já lê todos os
-- comentários de todas as aulas, com autoria e tudo. O que faltava era
-- ler a conversa no lugar onde ela acontece.
--
-- A linha que importa continua onde estava: rodando como dona, a função
-- não passa pela RLS da tabela, então sem esta conferência ela
-- entregaria os comentários de qualquer aula a qualquer aluna. Para a
-- aluna, a regra é exatamente a de antes.
-- =====================================================================

create or replace function comentarios_da_aula(p_aula uuid)
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
  left join profiles p      on p.id = c.autora_id
  left join comentarios pai on pai.id = c.resposta_a
  where c.aula_id = p_aula
    and c.status = 'publicado'
    -- Resposta cuja raiz saiu do ar some junto: deixar a resposta
    -- pendurada seria metade da conversa, sem o que ela respondia.
    and (c.resposta_a is null or pai.status = 'publicado')
    and (pode_ver_aula(p_aula) or eh_admin())
  -- Conversa mais recente em cima; dentro dela, a pergunta primeiro e as
  -- respostas na ordem em que foram escritas, que é a ordem de quem lê.
  order by coalesce(pai.criado_em, c.criado_em) desc,
           c.resposta_a nulls first,
           c.criado_em asc;
$$;

revoke execute on function comentarios_da_aula(uuid) from public, anon;
grant execute on function comentarios_da_aula(uuid) to authenticated;
