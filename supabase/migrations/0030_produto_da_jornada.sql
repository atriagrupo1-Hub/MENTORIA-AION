-- ---------------------------------------------------------------------
-- 0030 — Qual produto é "Minha jornada"
-- ---------------------------------------------------------------------
-- Com produtos de verdade, `modulos` deixou de ser só o curso: um
-- e-book também é um módulo. E "Minha jornada" — Início, Módulos,
-- Perfil, o percentual, o "de onde parei" — é sobre UM produto, o
-- curso. Sem dizer qual, o e-book apareceria no meio da mentoria e o
-- percentual passaria a contar as páginas dele.
--
-- Uma coluna, e é de COLOCAÇÃO, não de tipo: diz onde o produto
-- aparece, que é exatamente a separação que o resto desta
-- reestruturação mantém. O produto continua sem nenhum "tipo", e
-- qualquer produto pode ser o da jornada.
--
-- Mora em `configuracoes`, a tabela de ajuste de linha única que a
-- 0009 criou, e não em `produtos`: assim "qual é a jornada" é uma
-- resposta só, e não uma coluna que onze linhas podem contradizer.
-- ---------------------------------------------------------------------

alter table configuracoes
  add column if not exists produto_jornada uuid references produtos(id) on delete set null;

-- Aponta para o produto que já é a jornada: o curso real, o único que
-- tem módulos hoje. Sem inventar nada.
update configuracoes
set produto_jornada = (
  select m.produto_id
  from modulos m
  where m.produto_id is not null
  group by m.produto_id
  order by count(*) desc
  limit 1
)
where produto_jornada is null;
