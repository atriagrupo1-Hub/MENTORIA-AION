-- ---------------------------------------------------------------------
-- 0033 — O número do módulo é de cada produto
-- ---------------------------------------------------------------------
-- `modulos_numero_unico` era UNIQUE (numero), do tempo em que existia um
-- curso só. Quando os módulos passaram a ser de cada produto (0026), a
-- numeração passou a ser por produto e a trava não: o módulo 0 de um
-- produto novo batia com o módulo 0 da mentoria, e NENHUM produto novo
-- conseguia ter o primeiro módulo.
--
--   criar módulo: duplicate key value violates unique constraint
--   "modulos_numero_unico"
--
-- A trava certa é a mesma das aulas — `aulas_numero_unico (modulo_id,
-- numero)`: o número é único DENTRO do dono.
--
-- `deferrable initially deferred` pelo mesmo motivo das aulas: renumerar
-- uma lista inteira passa por estados intermediários repetidos dentro da
-- transação, e só o fim dela precisa estar certo.
-- ---------------------------------------------------------------------

alter table modulos drop constraint if exists modulos_numero_unico;

alter table modulos
  add constraint modulos_numero_unico
  unique (produto_id, numero) deferrable initially deferred;
