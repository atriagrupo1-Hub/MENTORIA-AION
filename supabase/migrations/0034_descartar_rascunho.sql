-- ---------------------------------------------------------------------
-- 0034 — Cancelar um curso que está nascendo
-- ---------------------------------------------------------------------
-- A tela de criar curso ganhou uma saída de "não grava nada": o curso
-- já existe no banco desde o primeiro clique, então desistir precisa
-- apagá-lo junto com o que foi montado dentro dele.
--
-- Não é um `delete` no produto. `modulos.produto_id` é ON DELETE
-- RESTRICT de propósito: apagar um produto nunca pode levar junto, em
-- silêncio, o progresso e os comentários das alunas. Esta função limpa
-- na ordem, dentro de UMA transação, e antes disso confere que é mesmo
-- um rascunho:
--
--   * publicado?         recusa. Curso no ar não se descarta.
--   * alguém já tem?     recusa. Liberação, progresso ou comentário
--                        significam que o curso saiu do papel.
--
-- Passando as duas, `acessos`, `progresso`, `comentarios` e `curtidas`
-- estão vazios — e caem por cascata das aulas de qualquer forma.
-- ---------------------------------------------------------------------

create or replace function descartar_rascunho(p_produto uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not eh_admin() then
    raise exception 'sem_permissao';
  end if;

  if coalesce((select publicado from produtos where id = p_produto), false) then
    raise exception 'produto_publicado';
  end if;

  if exists (
    select 1 from acessos a
    where a.produto_id = p_produto
       or a.modulo_id in (select id from modulos where produto_id = p_produto)
       or a.aula_id in (
            select au.id from aulas au
            join modulos m on m.id = au.modulo_id
            where m.produto_id = p_produto
          )
  ) or exists (
    select 1 from progresso p
    join aulas au on au.id = p.aula_id
    join modulos m on m.id = au.modulo_id
    where m.produto_id = p_produto
  ) or exists (
    select 1 from comentarios c
    join aulas au on au.id = c.aula_id
    join modulos m on m.id = au.modulo_id
    where m.produto_id = p_produto
  ) then
    raise exception 'produto_em_uso';
  end if;

  delete from conteudos where produto_id = p_produto;
  delete from aulas
    where modulo_id in (select id from modulos where produto_id = p_produto);
  delete from modulos where produto_id = p_produto;
  delete from presentes where produto_id = p_produto;
  delete from produtos where id = p_produto;
end;
$$;

revoke execute on function descartar_rascunho(uuid) from public, anon;
grant execute on function descartar_rascunho(uuid) to authenticated;
